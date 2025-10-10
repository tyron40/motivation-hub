import React, { useState, useRef, useCallback, useEffect } from 'react';
import { View, StyleSheet, PanResponder } from 'react-native';

interface CustomSliderProps {
  style?: any;
  minimumValue: number;
  maximumValue: number;
  value: number;
  onValueChange?: (value: number) => void;
  onSlidingComplete?: (value: number) => void;
  minimumTrackTintColor?: string;
  maximumTrackTintColor?: string;
  thumbTintColor?: string;
  disabled?: boolean;
}

export default function CustomSlider({
  style,
  minimumValue,
  maximumValue,
  value,
  onValueChange,
  onSlidingComplete,
  minimumTrackTintColor = '#ff6b6b',
  maximumTrackTintColor = '#ddd',
  thumbTintColor = '#ff6b6b',
  disabled = false,
}: CustomSliderProps) {
  const [localValue, setLocalValue] = useState(value);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<View>(null);
  const containerWidth = useRef(0);
  const containerX = useRef(0);

  const updateContainerMeasurements = useCallback(() => {
    if (containerRef.current) {
      (containerRef.current as any).measure(
        (_x: number, _y: number, width: number, _height: number, pageX: number) => {
          containerWidth.current = width;
          containerX.current = pageX;
        }
      );
    }
  }, []);

  const calculateValue = useCallback(
    (pageX: number) => {
      const thumbSize = 20;
      const adjustedWidth = containerWidth.current - thumbSize;
      const adjustedX = containerX.current + thumbSize / 2;
      
      if (pageX < adjustedX) {
        return minimumValue;
      } else if (pageX > adjustedX + adjustedWidth) {
        return maximumValue;
      } else {
        const x = pageX - adjustedX;
        const percentage = x / adjustedWidth;
        const newValue = minimumValue + percentage * (maximumValue - minimumValue);
        return Math.max(minimumValue, Math.min(maximumValue, newValue));
      }
    },
    [minimumValue, maximumValue]
  );

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !disabled,
      onMoveShouldSetPanResponder: () => !disabled,
      onPanResponderGrant: (evt) => {
        setIsDragging(true);
        updateContainerMeasurements();
        const newValue = calculateValue(evt.nativeEvent.pageX);
        setLocalValue(newValue);
        onValueChange?.(newValue);
      },
      onPanResponderMove: (evt) => {
        const newValue = calculateValue(evt.nativeEvent.pageX);
        setLocalValue(newValue);
        onValueChange?.(newValue);
      },
      onPanResponderRelease: () => {
        setIsDragging(false);
        onSlidingComplete?.(localValue);
      },
      onPanResponderTerminate: () => {
        setIsDragging(false);
        onSlidingComplete?.(localValue);
      },
    })
  ).current;

  useEffect(() => {
    if (!isDragging) {
      setLocalValue(value);
    }
  }, [value, isDragging]);



  const percentage = ((localValue - minimumValue) / (maximumValue - minimumValue)) * 100;

  return (
    <View
      ref={containerRef}
      style={[styles.container, style]}
      onLayout={updateContainerMeasurements}
      {...panResponder.panHandlers}
    >
      <View style={styles.track}>
        <View
          style={[
            styles.minimumTrack,
            {
              width: `${percentage}%`,
              backgroundColor: minimumTrackTintColor,
            },
          ]}
        />
        <View
          style={[
            styles.maximumTrack,
            {
              width: `${100 - percentage}%`,
              backgroundColor: maximumTrackTintColor,
            },
          ]}
        />
      </View>
      <View
        style={[
          styles.thumb,
          {
            left: `${percentage}%`,
            backgroundColor: thumbTintColor,
            opacity: disabled ? 0.5 : 1,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 40,
    justifyContent: 'center',
    position: 'relative',
  },
  track: {
    height: 4,
    borderRadius: 2,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  minimumTrack: {
    height: '100%',
  },
  maximumTrack: {
    height: '100%',
  },
  thumb: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderRadius: 10,
    marginLeft: -10,
    marginTop: -8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
});
