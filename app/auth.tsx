import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Animated,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/hooks/auth-context';
import { router } from 'expo-router';
import { Eye, EyeOff, Mail, Lock, User, Sparkles, Mic, BookOpen, MessageCircle, ArrowRight } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

type Screen = 'landing' | 'signin' | 'signup';

export default function AuthScreen() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('landing');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  
  const { signIn, signUp } = useAuth();

  React.useEffect(() => {
    fadeAnim.setValue(0);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
  }, [currentScreen, fadeAnim]);

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePassword = (password: string) => {
    return password.length >= 6;
  };

  const handleAuth = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (!validateEmail(email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    if (!validatePassword(password)) {
      Alert.alert('Error', 'Password must be at least 6 characters long');
      return;
    }

    if (currentScreen === 'signup' && !name.trim()) {
      Alert.alert('Error', 'Please enter your name');
      return;
    }

    setIsLoading(true);

    try {
      let result;
      if (currentScreen === 'signup') {
        result = await signUp(email, password, { name });
      } else {
        result = await signIn(email, password);
      }

      if (result.error) {
        Alert.alert(
          'Authentication Error',
          result.error.message || 'An error occurred during authentication'
        );
      } else {
        if (currentScreen === 'signup') {
          Alert.alert(
            'Success',
            'Account created successfully! Please check your email to verify your account.',
            [{ text: 'OK', onPress: () => setCurrentScreen('signin') }]
          );
        } else {
          router.replace('/(tabs)');
        }
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred');
      console.error('Auth error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setName('');
    setShowPassword(false);
  };

  const navigateToScreen = (screen: Screen) => {
    resetForm();
    setCurrentScreen(screen);
  };

  if (currentScreen === 'landing') {
    return (
      <View style={styles.landingContainer}>
        <LinearGradient
          colors={['#0F0F23', '#1A1A2E', '#16213E']}
          style={styles.gradient}
        >
          <SafeAreaView style={styles.safeArea}>
            <ScrollView 
              contentContainerStyle={styles.landingScrollContent}
              showsVerticalScrollIndicator={false}
              bounces={false}
            >
              <Animated.View style={[styles.landingContent, { opacity: fadeAnim }]}>
                <View style={styles.heroSection}>
                  <View style={styles.appIconContainer}>
                    <Image 
                      source={require('@/assets/images/icon.png')}
                      style={styles.appIconImage}
                      resizeMode="cover"
                    />
                  </View>
                  <Text style={styles.heroTitle}>Motivation Hub</Text>
                  <Text style={styles.heroSubtitle}>
                    Transform your life with powerful motivational speeches, AI coaching, and scripture wisdom
                  </Text>
                </View>

                <View style={styles.featuresContainer}>
                  <View style={styles.featureCard}>
                    <View style={[styles.featureIconCircle, { backgroundColor: 'rgba(108, 92, 231, 0.15)' }]}>
                      <Mic color="#6C5CE7" size={28} />
                    </View>
                    <Text style={styles.featureTitle}>Inspiring Speeches</Text>
                    <Text style={styles.featureText}>Access thousands of motivational talks</Text>
                  </View>

                  <View style={styles.featureCard}>
                    <View style={[styles.featureIconCircle, { backgroundColor: 'rgba(0, 217, 255, 0.15)' }]}>
                      <MessageCircle color="#00D9FF" size={28} />
                    </View>
                    <Text style={styles.featureTitle}>AI Voice Coach</Text>
                    <Text style={styles.featureText}>Get personalized guidance anytime</Text>
                  </View>

                  <View style={styles.featureCard}>
                    <View style={[styles.featureIconCircle, { backgroundColor: 'rgba(255, 107, 107, 0.15)' }]}>
                      <BookOpen color="#FF6B6B" size={28} />
                    </View>
                    <Text style={styles.featureTitle}>Scripture Wisdom</Text>
                    <Text style={styles.featureText}>Daily inspiration from sacred texts</Text>
                  </View>
                </View>

                <View style={styles.ctaContainer}>
                  <TouchableOpacity
                    style={styles.primaryButton}
                    onPress={() => navigateToScreen('signup')}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.primaryButtonText}>Get Started</Text>
                    <ArrowRight color="#FFFFFF" size={20} />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.secondaryButton}
                    onPress={() => navigateToScreen('signin')}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.secondaryButtonText}>Sign In</Text>
                  </TouchableOpacity>
                </View>
              </Animated.View>
            </ScrollView>
          </SafeAreaView>
        </LinearGradient>
      </View>
    );
  }

  return (
    <View style={styles.authContainer}>
      <LinearGradient
        colors={['#0F0F23', '#1A1A2E']}
        style={styles.gradient}
      >
        <SafeAreaView style={styles.safeArea}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.keyboardView}
          >
            <ScrollView 
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
            >
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => navigateToScreen('landing')}
              >
                <Text style={styles.backButtonText}>← Back</Text>
              </TouchableOpacity>

              <Animated.View style={[styles.authContent, { opacity: fadeAnim }]}>
                <View style={styles.authHeader}>
                  <View style={styles.authIconContainer}>
                    <Sparkles color="#FFD700" size={32} />
                  </View>
                  <Text style={styles.authTitle}>
                    {currentScreen === 'signup' ? 'Create Account' : 'Welcome Back'}
                  </Text>
                  <Text style={styles.authSubtitle}>
                    {currentScreen === 'signup'
                      ? 'Start your journey to greatness'
                      : 'Continue your path to excellence'}
                  </Text>
                </View>

                <View style={styles.form}>
                  {currentScreen === 'signup' && (
                    <View style={styles.inputContainer}>
                      <User color="#999" size={20} style={styles.inputIcon} />
                      <TextInput
                        style={styles.input}
                        placeholder="Full Name"
                        placeholderTextColor="#666"
                        value={name}
                        onChangeText={setName}
                        autoCapitalize="words"
                        autoComplete="name"
                      />
                    </View>
                  )}

                  <View style={styles.inputContainer}>
                    <Mail color="#999" size={20} style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="Email"
                      placeholderTextColor="#666"
                      value={email}
                      onChangeText={setEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoComplete="email"
                    />
                  </View>

                  <View style={styles.inputContainer}>
                    <Lock color="#999" size={20} style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="Password"
                      placeholderTextColor="#666"
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry={!showPassword}
                      autoComplete="password"
                    />
                    <TouchableOpacity
                      onPress={() => setShowPassword(!showPassword)}
                      style={styles.eyeIcon}
                    >
                      {showPassword ? (
                        <EyeOff color="#999" size={20} />
                      ) : (
                        <Eye color="#999" size={20} />
                      )}
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity
                    style={[styles.authButton, isLoading && styles.authButtonDisabled]}
                    onPress={handleAuth}
                    disabled={isLoading}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.authButtonText}>
                      {isLoading ? 'Please wait...' : currentScreen === 'signup' ? 'Create Account' : 'Sign In'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => navigateToScreen(currentScreen === 'signup' ? 'signin' : 'signup')}
                    style={styles.toggleButton}
                  >
                    <Text style={styles.toggleText}>
                      {currentScreen === 'signup'
                        ? 'Already have an account? '
                        : "Don't have an account? "}
                      <Text style={styles.toggleTextBold}>
                        {currentScreen === 'signup' ? 'Sign In' : 'Sign Up'}
                      </Text>
                    </Text>
                  </TouchableOpacity>
                </View>
              </Animated.View>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  landingContainer: {
    flex: 1,
  },
  authContainer: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  landingScrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 30,
  },
  landingContent: {
    flex: 1,
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  appIconContainer: {
    marginBottom: 16,
    width: 120,
    height: 120,
    borderRadius: 60,
    overflow: 'hidden',
    borderWidth: 4,
    borderColor: '#FFD700',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 12,
  },
  appIconImage: {
    width: '100%',
    height: '100%',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: '800' as const,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 10,
    letterSpacing: -0.5,
  },
  heroSubtitle: {
    fontSize: 15,
    color: '#B0B0B0',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 10,
  },
  featuresContainer: {
    marginBottom: 32,
  },
  featureCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
  },
  featureIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  featureTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  featureText: {
    fontSize: 14,
    color: '#B0B0B0',
    lineHeight: 20,
    textAlign: 'center',
  },
  ctaContainer: {
    marginTop: 16,
  },
  primaryButton: {
    backgroundColor: '#6C5CE7',
    borderRadius: 16,
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#6C5CE7',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700' as const,
    marginRight: 8,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderRadius: 16,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  secondaryButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600' as const,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 40,
  },
  backButton: {
    marginBottom: 20,
  },
  backButtonText: {
    color: '#6C5CE7',
    fontSize: 16,
    fontWeight: '600' as const,
  },
  authContent: {
    flex: 1,
  },
  authHeader: {
    alignItems: 'center',
    marginBottom: 40,
  },
  authIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  authTitle: {
    fontSize: 28,
    fontWeight: '800' as const,
    color: '#FFFFFF',
    marginBottom: 8,
  },
  authSubtitle: {
    fontSize: 15,
    color: '#999',
    textAlign: 'center',
  },
  form: {
    width: '100%',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 14,
    marginBottom: 16,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    height: 54,
    color: '#FFFFFF',
    fontSize: 16,
  },
  eyeIcon: {
    padding: 8,
  },
  authButton: {
    backgroundColor: '#6C5CE7',
    borderRadius: 14,
    height: 54,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 20,
    shadowColor: '#6C5CE7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  authButtonDisabled: {
    backgroundColor: '#4A4A6A',
    shadowOpacity: 0,
    elevation: 0,
  },
  authButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700' as const,
  },
  toggleButton: {
    alignItems: 'center',
    padding: 12,
  },
  toggleText: {
    color: '#999',
    fontSize: 15,
  },
  toggleTextBold: {
    color: '#6C5CE7',
    fontWeight: '700' as const,
  },
});