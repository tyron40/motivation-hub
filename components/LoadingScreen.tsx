import React, { useEffect, useRef } from 'react';
import { Text, StyleSheet, Animated, View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Zap } from 'lucide-react-native';

interface LoadingScreenProps {
  message?: string;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ 
  message = 'Igniting your motivation...' 
}) => {
  const { width } = useWindowDimensions();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.5)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const lightningAnim1 = useRef(new Animated.Value(0)).current;
  const lightningAnim2 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Initial fade and scale
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 5,
        useNativeDriver: true,
      }),
    ]).start();

    // Pulse animation for logo
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Lightning animations
    const animateLightning = () => {
      Animated.sequence([
        Animated.timing(lightningAnim1, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(lightningAnim1, {
          toValue: 0,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start();

      setTimeout(() => {
        Animated.sequence([
          Animated.timing(lightningAnim2, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(lightningAnim2, {
            toValue: 0,
            duration: 100,
            useNativeDriver: true,
          }),
        ]).start();
      }, 300);
    };

    animateLightning();
    const interval = setInterval(animateLightning, 3000);

    return () => clearInterval(interval);
  }, [fadeAnim, scaleAnim, pulseAnim, lightningAnim1, lightningAnim2]);



  return (
    <View style={styles.container}>
      {/* Lightning effects */}
      <Animated.View 
        style={[
          styles.lightning1,
          {
            opacity: lightningAnim1,
          }
        ]}
      />
      <Animated.View 
        style={[
          styles.lightning2,
          {
            opacity: lightningAnim2,
          }
        ]}
      />
      
      <Animated.View 
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          }
        ]}
      >
        {/* Logo */}
        <Animated.View 
          style={[
            styles.logoContainer,
            {
              transform: [{ scale: pulseAnim }],
            }
          ]}
        >
          <LinearGradient
            colors={['#00A8FF', '#0078FF']}
            style={styles.logoGradient}
          >
            <Text style={styles.logoText}>M</Text>
          </LinearGradient>
          
          {/* Electric effect around logo */}
          <View style={styles.electricEffect}>
            <Zap color="#00A8FF" size={24} style={styles.zapIcon1} />
            <Zap color="#0078FF" size={20} style={styles.zapIcon2} />
            <Zap color="#00A8FF" size={18} style={styles.zapIcon3} />
          </View>
        </Animated.View>
        
        <View style={styles.textContainer}>
          <Text style={styles.title}>MOTIVATION</Text>
          <Text style={styles.subtitle}>HUB</Text>
        </View>
        
        <View style={[styles.loadingContainer, { width: width * 0.7 }]}>
          <View style={styles.loadingBar}>
            <Animated.View 
              style={[
                styles.loadingProgress,
                {
                  transform: [{ scaleX: fadeAnim }],
                }
              ]}
            />
          </View>
          <Text style={styles.message}>{message}</Text>
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0E27',
    justifyContent: 'center',
    alignItems: 'center',
  },
  lightning1: {
    position: 'absolute',
    top: 0,
    left: '20%',
    width: 3,
    height: '40%',
    backgroundColor: '#00A8FF',
    transform: [{ rotate: '15deg' }],
    shadowColor: '#00A8FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 20,
  },
  lightning2: {
    position: 'absolute',
    top: 0,
    right: '25%',
    width: 2,
    height: '35%',
    backgroundColor: '#0078FF',
    transform: [{ rotate: '-10deg' }],
    shadowColor: '#0078FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 15,
  },
  content: {
    alignItems: 'center',
    gap: 40,
  },
  logoContainer: {
    position: 'relative',
    marginBottom: 20,
  },
  logoGradient: {
    width: 120,
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#00A8FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 30,
    elevation: 10,
  },
  logoText: {
    fontSize: 72,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  electricEffect: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  zapIcon1: {
    position: 'absolute',
    top: -10,
    right: -10,
  },
  zapIcon2: {
    position: 'absolute',
    bottom: -8,
    left: -8,
  },
  zapIcon3: {
    position: 'absolute',
    top: '50%',
    right: -15,
  },
  textContainer: {
    alignItems: 'center',
    gap: 8,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 36,
    fontWeight: 'bold',
    letterSpacing: 4,
    textShadowColor: '#00A8FF',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  subtitle: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '300',
    letterSpacing: 8,
    textShadowColor: '#0078FF',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  loadingContainer: {
    alignItems: 'center',
    gap: 16,
  },
  loadingBar: {
    width: '100%',
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  loadingProgress: {
    height: '100%',
    backgroundColor: '#00A8FF',
    borderRadius: 2,
    shadowColor: '#00A8FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 10,
  },
  message: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    textAlign: 'center',
    letterSpacing: 1,
  },
});

export default LoadingScreen;