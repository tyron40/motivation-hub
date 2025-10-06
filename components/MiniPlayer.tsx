import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Youtube, X } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useCurrentSpeech } from '@/hooks/speech-context';
import { router } from 'expo-router';

export const MiniPlayer: React.FC = () => {
  const { currentSpeech, setCurrentSpeech } = useCurrentSpeech();
  const slideAnim = useRef(new Animated.Value(100)).current;
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (currentSpeech) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 65,
        friction: 11,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: 100,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [currentSpeech]);

  if (!currentSpeech) return null;

  const handlePress = () => {
    router.push('/player');
  };

  const handleClose = () => {
    setCurrentSpeech(null);
  };

  const bottomOffset = (insets?.bottom ?? 0) + 80 + 8;

  return (
    <Animated.View 
      style={[
        styles.container,
        { 
          transform: [{ translateY: slideAnim }],
          bottom: bottomOffset,
        }
      ]}
      pointerEvents="box-none"
      testID="mini-player"
    >
      <TouchableOpacity onPress={handlePress} activeOpacity={0.95} testID="mini-player-touch">
        <View style={styles.content}>
          <Image source={{ uri: currentSpeech.imageUrl }} style={styles.image} />
          <View style={styles.info}>
            <Text style={styles.title} numberOfLines={1}>{currentSpeech.title}</Text>
            <Text style={styles.speaker}>{currentSpeech.speaker}</Text>
          </View>
          <View style={styles.youtubeIcon}>
            <Youtube color={Colors.primary} size={24} />
          </View>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton} testID="mini-player-close">
            <X color={Colors.textSecondary} size={20} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 12,
    right: 12,
    backgroundColor: Colors.cardBackground,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    shadowColor: '#000000',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  image: {
    width: 48,
    height: 48,
    borderRadius: 8,
  },
  info: {
    flex: 1,
    marginLeft: 12,
  },
  title: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  speaker: {
    color: Colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  youtubeIcon: {
    padding: 8,
    marginRight: 4,
  },
  closeButton: {
    padding: 8,
  },
});