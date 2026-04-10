import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Modal,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Send, Bot, User, Sparkles, Volume2, VolumeX, Settings, Play, Pause, MessageCircle, Zap, Brain, Mic, MicOff, History, Trash2, MessageSquarePlus } from 'lucide-react-native';
import { Stack, router } from 'expo-router';
import { useTheme } from '@/hooks/theme-context';
import { useUserProfile } from '@/hooks/user-profile-context';
import Colors from '@/constants/colors';
import { useChatSessions } from '@/hooks/chat-sessions-context';
import { useIAP } from '@/hooks/iap-context';
import PaywallModal from '@/components/PaywallModal';
import { useAdMob } from '@/hooks/admob-context';
import { useAuth } from '@/hooks/auth-context';
import { generateTextToSpeech, sendChatMessage, transcribeAudio as transcribeAudioApi } from '@/lib/api-client';

import { Audio, AVPlaybackStatus } from 'expo-av';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  audioUrl?: string;
  isPlaying?: boolean;
}

const suggestedPrompts = [
  {
    text: "How can I stay motivated when facing challenges?",
    icon: Zap,
    color: '#10B981',
  },
  {
    text: "What are some daily habits for success?",
    icon: Brain,
    color: '#3B82F6',
  },
  {
    text: "Help me overcome self-doubt",
    icon: Sparkles,
    color: '#8B5CF6',
  },
  {
    text: "How to build mental toughness?",
    icon: MessageCircle,
    color: '#EF4444',
  },
];

function ChatScreenContent() {
  const { colors } = useTheme();
  const { profile, updateProfile } = useUserProfile();
  const { useCredit: deductCredit, usageStats } = useIAP();
  const { isAuthenticated } = useAuth();
  const insets = useSafeAreaInsets();
  const { tryShowInterstitialOnTransition } = useAdMob();
  const styles = React.useMemo(() => getStyles(colors), [colors]);
  const { 
    sessions, 
    currentSessionId, 
    createSession, 
    deleteSession,
    addMessageToSession,
    getCurrentSession,
    setCurrentSessionId 
  } = useChatSessions();
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [hasStartedChat, setHasStartedChat] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);

  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const typingAnim = useRef(new Animated.Value(0)).current;
  const micAnim = useRef(new Animated.Value(1)).current;

  const playAudio = useCallback(async (messageId: string, audioUrl: string) => {
    try {
      if (sound) {
        await sound.unloadAsync();
      }

      setMessages(prev => prev.map(msg => 
        msg.id === messageId ? { ...msg, isPlaying: true } : { ...msg, isPlaying: false }
      ));

      // Set audio mode for playback
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        staysActiveInBackground: false,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: audioUrl },
        { shouldPlay: true, volume: 1.0 }
      );
      
      setSound(newSound);
      
      newSound.setOnPlaybackStatusUpdate((status: AVPlaybackStatus) => {
        if (status.isLoaded && status.didJustFinish) {
          setMessages(prev => prev.map(msg => ({ ...msg, isPlaying: false })));
        }
      });
    } catch (error) {
      console.error('Audio playback error:', error);
      setMessages(prev => prev.map(msg => ({ ...msg, isPlaying: false })));
    }
  }, [sound]);

  const generateVoice = useCallback(async (messageId: string, text: string) => {
    try {
      console.log('🎤 Generating voice for message:', messageId);
      console.log('🎤 Using Vercel backend /api/tts endpoint');
      
      const result = await generateTextToSpeech({
        text: text.substring(0, 500),
        voice: (profile.preferredVoice || 'alloy') as any,
      });
      
      console.log('✅ TTS response received');
      
      const audioUrl = `data:${result.audio.mimeType};base64,${result.audio.base64Data}`;
      console.log('✅ Audio URL created');
      
      setMessages(prev => prev.map(msg => 
        msg.id === messageId ? { ...msg, audioUrl } : msg
      ));
      
      console.log('✅ Voice generated successfully for message:', messageId);
      
      setTimeout(() => {
        void playAudio(messageId, audioUrl);
      }, 500);
    } catch (error: any) {
      console.error('❌ Voice generation error:', error);
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error('❌ Error details:', errorMsg);
    }
  }, [profile.preferredVoice, playAudio]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  useEffect(() => {
    if (isTyping) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(typingAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(typingAnim, {
            toValue: 0,
            duration: 600,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      typingAnim.setValue(0);
    }
  }, [isTyping, typingAnim]);

  useEffect(() => {
    const loadCurrentSession = () => {
      const currentSession = getCurrentSession();
      if (currentSession && currentSession.messages.length > 0) {
        const convertedMessages: Message[] = currentSession.messages.map((msg, idx) => ({
          id: `${currentSession.id}-${idx}`,
          text: msg.content,
          isUser: msg.role === 'user',
          timestamp: new Date(msg.timestamp),
        }));
        setMessages(convertedMessages);
        if (currentSession.messages.length > 1) {
          setHasStartedChat(true);
        }
        return;
      }
    };

    if (currentSessionId) {
      loadCurrentSession();
    } else if (messages.length === 0) {
      const greeting = profile.name 
        ? `Hello ${profile.name}! Ready to unlock your potential? Let's chat about your goals and challenges.`
        : "Ready to unlock your potential? Let's chat about your goals and challenges. What can I help you today?";
      
      const greetingMessage = {
        id: '1',
        text: greeting,
        isUser: false,
        timestamp: new Date(),
      };
      
      setMessages([greetingMessage]);
      
      if (profile.voiceEnabled) {
        const timeoutId = setTimeout(() => {
          void generateVoice(greetingMessage.id, greeting);
        }, 1000);
        
        return () => clearTimeout(timeoutId);
      }
    }
  }, [profile.name, profile.voiceEnabled, messages.length, generateVoice, currentSessionId, getCurrentSession]);

  useEffect(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  const sendMessage = useCallback(async (text: string, isSuggestion: boolean = false) => {
    if (!text.trim() || isLoading) return;

    void tryShowInterstitialOnTransition();

    if (!isSuggestion && usageStats.credits <= 0) {
      console.log('❌ No credits available');
      if (Platform.OS !== 'web') {
        Alert.alert(
          'No Credits',
          'You need credits to use the AI chat feature. Purchase credits to continue.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Get Credits', onPress: () => setShowPaywall(true) },
          ]
        );
      } else {
        console.error('You need credits to use the AI chat feature.');
      }
      return;
    }

    try {
      const nameMatch = text.match(/(?:my name is|i'm|i am|call me)\s+([a-zA-Z]+)/i);
      if (nameMatch && !profile.name) {
        const name = nameMatch[1];
        await updateProfile({ name });
      }

      const userMessage: Message = {
        id: Date.now().toString(),
        text: text.trim(),
        isUser: true,
        timestamp: new Date(),
      };

      if (!isSuggestion) {
        const creditUsed = await deductCredit();
        if (!creditUsed) {
          console.log('❌ Failed to deduct credit');
          if (Platform.OS !== 'web') {
            Alert.alert(
              'No Credits',
              'You need credits to use the AI chat feature. Purchase credits to continue.',
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Get Credits', onPress: () => setShowPaywall(true) },
              ]
            );
          } else {
            console.error('You need credits to use the AI chat feature.');
          }
          return;
        }
        console.log('✅ Credit deducted. Remaining credits:', usageStats.credits - 1);
      } else {
        console.log('✅ Suggested question - no credit needed');
      }

      setMessages(prev => [...prev, userMessage]);
      setInputText('');
      setIsLoading(true);
      setIsTyping(true);
      setHasStartedChat(true);

      let sessionId = currentSessionId;
      if (!sessionId) {
        const newSession = await createSession(
          text.trim().substring(0, 50) + (text.trim().length > 50 ? '...' : ''),
          [{ role: 'user', content: text.trim(), timestamp: Date.now() }]
        );
        sessionId = newSession.id;
      } else {
        await addMessageToSession(sessionId, {
          role: 'user',
          content: text.trim(),
          timestamp: Date.now(),
        });
      }

      const systemPrompt = `You are Coach Alex, an AI motivation coach. You provide personalized, inspiring advice to help people overcome challenges and achieve their goals. ${profile.name ? `The user's name is ${profile.name}. ` : ''}Keep responses encouraging, actionable, and under 200 words. Focus on motivation, personal development, and positive mindset.`;

      const chatHistory: { role: 'user' | 'assistant'; content: string }[] = messages
        .filter(msg => msg.id !== '1' || msg.isUser)
        .map(msg => ({
          role: (msg.isUser ? 'user' : 'assistant') as 'user' | 'assistant',
          content: msg.text,
        }));

      chatHistory.push({ role: 'user', content: text.trim() });

      const allMessages: { role: 'user' | 'assistant'; content: string }[] = [
        { role: 'user', content: `[System Instructions - do not repeat these]: ${systemPrompt}` },
        { role: 'assistant', content: 'Understood. I am Coach Alex, your AI motivation coach. How can I help you today?' },
        ...chatHistory,
      ];

      try {
        console.log('🤖 Sending chat message...');
        console.log('📤 Messages count:', allMessages.length);

        console.log('🤖 Using Vercel backend /api/chat...');
        const chatResult = await sendChatMessage({
          messages: allMessages.map(m => ({
            role: m.role === 'user' ? 'user' as const : 'assistant' as const,
            content: m.content,
          })),
        });

        const rawResult: any = chatResult as any;
        const completionCandidate =
          rawResult?.message ??
          rawResult?.text ??
          rawResult?.response ??
          rawResult?.data?.message ??
          '';
        const completion = typeof completionCandidate === 'string' ? completionCandidate.trim() : '';

        console.log('✅ Vercel backend responded, length:', completion?.length);

        if (!completion) {
          console.error('❌ Empty AI completion payload:', JSON.stringify(rawResult).substring(0, 300));
          throw new Error('Empty response from AI backend');
        }

        const aiMessage: Message = {
          id: (Date.now() + 1).toString(),
          text: completion,
          isUser: false,
          timestamp: new Date(),
        };

        setMessages(prev => [...prev, aiMessage]);

        if (sessionId) {
          await addMessageToSession(sessionId, {
            role: 'assistant',
            content: completion,
            timestamp: Date.now(),
          });
        }

        if (profile.voiceEnabled && completion) {
          if (usageStats.credits > 0) {
            const voiceCreditUsed = await deductCredit();
            if (voiceCreditUsed) {
              console.log('✅ Voice credit deducted. Remaining credits:', usageStats.credits - 1);
              void generateVoice(aiMessage.id, completion);
            } else {
              console.log('⚠️ Not enough credits for voice generation');
            }
          } else {
            console.log('⚠️ Not enough credits for voice generation');
          }
        }
      } catch (fetchError) {
        console.error('🤖 AI generation error:', fetchError);
        throw fetchError;
      }
    } catch (error) {
      console.error('Chat error:', error);

      const errorMessage: Message = {
        id: (Date.now() + 2).toString(),
        text: "I'm sorry, I'm having trouble connecting right now. Please try again in a moment. Remember, you have the strength to overcome any challenge!",
        isUser: false,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, errorMessage]);

      if (Platform.OS !== 'web') {
        Alert.alert('Connection Error', 'Failed to get response. Please check your internet connection and try again.');
      } else {
        console.error('Failed to get response. Please check your internet connection and try again.');
      }
    } finally {
      setIsLoading(false);
      setIsTyping(false);
    }
  }, [isLoading, usageStats, deductCredit, profile, updateProfile, messages, currentSessionId, createSession, addMessageToSession, generateVoice, tryShowInterstitialOnTransition]);





  const stopAudio = async () => {
    if (sound) {
      await sound.stopAsync();

      setMessages(prev => prev.map(msg => ({ ...msg, isPlaying: false })));
    }
  };

  const startRecording = async () => {
    try {
      console.log('🎤 Requesting microphone permissions...');
      const permission = await Audio.requestPermissionsAsync();
      
      if (!permission.granted) {
        if (Platform.OS !== 'web') {
          Alert.alert('Permission Required', 'Please enable microphone access to use voice input.');
        } else {
          console.error('Microphone permission denied');
        }
        return;
      }

      console.log('✅ Microphone permission granted');

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
      });

      console.log('🎤 Starting recording...');
      const { recording: newRecording } = await Audio.Recording.createAsync({
        android: {
          extension: '.m4a',
          outputFormat: Audio.AndroidOutputFormat.MPEG_4,
          audioEncoder: Audio.AndroidAudioEncoder.AAC,
          sampleRate: 44100,
          numberOfChannels: 2,
          bitRate: 128000,
        },
        ios: {
          extension: '.wav',
          outputFormat: Audio.IOSOutputFormat.LINEARPCM,
          audioQuality: Audio.IOSAudioQuality.HIGH,
          sampleRate: 44100,
          numberOfChannels: 2,
          bitRate: 128000,
          linearPCMBitDepth: 16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
        },
        web: {
          mimeType: 'audio/webm',
          bitsPerSecond: 128000,
        },
      });

      setRecording(newRecording);
      setIsRecording(true);
      console.log('✅ Recording started');

      Animated.loop(
        Animated.sequence([
          Animated.timing(micAnim, {
            toValue: 1.3,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(micAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } catch (error) {
      console.error('❌ Failed to start recording:', error);
      if (Platform.OS !== 'web') {
        Alert.alert('Recording Error', 'Failed to start recording. Please try again.');
      }
    }
  };

  const stopRecording = async () => {
    if (!recording) {
      console.warn('⚠️ No recording to stop');
      return;
    }

    try {
      console.log('🛑 Stopping recording...');
      setIsRecording(false);
      micAnim.stopAnimation();
      micAnim.setValue(1);

      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      console.log('✅ Recording stopped, URI:', uri);

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
      });

      setRecording(null);

      if (uri) {
        await transcribeAudio(uri);
      } else {
        console.error('❌ No recording URI available');
        if (Platform.OS !== 'web') {
          Alert.alert('Error', 'Failed to save recording');
        }
      }
    } catch (error) {
      console.error('❌ Failed to stop recording:', error);
      setIsRecording(false);
      setRecording(null);
      if (Platform.OS !== 'web') {
        Alert.alert('Error', 'Failed to process recording');
      }
    }
  };

  const transcribeAudio = async (uri: string) => {
    try {
      console.log('🎯 Starting transcription for URI:', uri);
      setIsTranscribing(true);

      const uriParts = uri.split('.');
      const fileType = uriParts[uriParts.length - 1];

      const formData = new FormData();
      
      if (Platform.OS === 'web') {
        const response = await fetch(uri);
        const blob = await response.blob();
        formData.append('audio', blob, `recording.${fileType}`);
      } else {
        const audioFile = {
          uri,
          name: `recording.${fileType}`,
          type: `audio/${fileType}`,
        } as any;
        formData.append('audio', audioFile);
      }

      console.log('📤 Sending audio to Vercel transcription service...');
      const data = await transcribeAudioApi({ audio: formData });
      console.log('✅ Transcription response:', data);

      if (data.text && data.text.trim()) {
        setInputText(data.text.trim());
        console.log('✅ Transcription successful:', data.text);
      } else {
        console.warn('⚠️ Empty transcription result');
        if (Platform.OS !== 'web') {
          Alert.alert('No Speech Detected', 'Please try speaking again.');
        }
      }
    } catch (error) {
      console.error('❌ Transcription error:', error);
      if (Platform.OS !== 'web') {
        Alert.alert('Transcription Error', 'Failed to transcribe audio. Please try again.');
      }
    } finally {
      setIsTranscribing(false);
    }
  };

  useEffect(() => {
    return () => {
      if (recording) {
        console.log('🧹 Cleaning up recording on unmount');
        recording.stopAndUnloadAsync().catch((err: unknown) => 
          console.error('Error cleaning up recording:', err)
        );
      }
      if (sound) {
        console.log('🧹 Cleaning up sound on unmount');
        sound.unloadAsync().catch((err: unknown) => 
          console.error('Error cleaning up sound:', err)
        );
      }
    };
  }, [recording, sound]);

  const MessageBubble = ({ message, index }: { message: Message; index: number }) => {
    const bubbleAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(0.8)).current;

    useEffect(() => {
      Animated.sequence([
        Animated.delay(index * 150),
        Animated.parallel([
          Animated.timing(bubbleAnim, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.spring(scaleAnim, {
            toValue: 1,
            tension: 100,
            friction: 8,
            useNativeDriver: true,
          }),
        ]),
      ]).start();
    }, [index, bubbleAnim, scaleAnim]);

    return (
      <Animated.View 
        style={[
          styles.messageBubbleContainer,
          message.isUser ? styles.userMessageContainer : styles.aiMessageContainer,
          {
            opacity: bubbleAnim,
            transform: [{ scale: scaleAnim }],
          }
        ]}
      >
        <LinearGradient
          colors={message.isUser 
            ? [Colors.primary, Colors.secondary]
            : ['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)']
          }
          style={[
            styles.messageBubble,
            message.isUser ? styles.userMessage : styles.aiMessage
          ]}
        >
          <View style={styles.messageHeader}>
            <View style={styles.avatarContainer}>
              {message.isUser ? (
                <LinearGradient
                  colors={[Colors.accent, Colors.primary]}
                  style={styles.avatar}
                >
                  <User color={Colors.background} size={14} />
                </LinearGradient>
              ) : (
                <LinearGradient
                  colors={[Colors.secondary, Colors.primary]}
                  style={styles.avatar}
                >
                  <Bot color={Colors.background} size={14} />
                </LinearGradient>
              )}
            </View>
            <Text style={[
              styles.messageRole,
              { color: message.isUser ? Colors.background : Colors.text }
            ]}>
              {message.isUser ? (profile.name || 'You') : 'Coach Alex'}
            </Text>
            {!message.isUser && message.audioUrl && (
              <TouchableOpacity
                style={styles.voiceButton}
                onPress={() => {
                  if (message.isPlaying) {
                    void stopAudio();
                  } else {
                    void playAudio(message.id, message.audioUrl!);
                  }
                }}
              >
                {message.isPlaying ? (
                  <Pause color={Colors.text} size={14} />
                ) : (
                  <Play color={Colors.text} size={14} />
                )}
              </TouchableOpacity>
            )}
          </View>
          <Text style={[
            styles.messageText,
            { color: message.isUser ? Colors.background : Colors.text }
          ]}>
            {message.text}
          </Text>
        </LinearGradient>
      </Animated.View>
    );
  };

  if (!isAuthenticated) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <LinearGradient
          colors={[colors.background, colors.card, colors.background]}
          style={styles.container}
        >
          <View style={styles.accountRequiredContainer}>
            <View style={styles.accountRequiredIcon}>
              <MessageCircle color={Colors.primary} size={48} />
            </View>
            <Text style={styles.accountRequiredTitle}>Account Required</Text>
            <Text style={styles.accountRequiredText}>
              Create an account to use the AI Coach chat feature. An account is needed to track your AI credits and purchases.
            </Text>
            <TouchableOpacity
              style={styles.accountRequiredButton}
              onPress={() => router.push('/auth')}
            >
              <Text style={styles.accountRequiredButtonText}>Sign Up / Sign In</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <LinearGradient
        colors={[colors.background, colors.card, colors.background]}
        style={styles.container}
      >
        <View style={styles.content}>
        <Animated.View 
          style={[
            styles.header, 
            { 
              paddingTop: insets.top + 4,
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            }
          ]}
        >
          <View style={styles.headerContent}>
            <View style={styles.headerLeft}>
              <LinearGradient
                colors={[Colors.primary, Colors.secondary]}
                style={styles.coachAvatar}
              >
                <Sparkles color={Colors.background} size={18} />
              </LinearGradient>
              <View>
                <Text style={styles.title}>Coach Alex</Text>
                <View style={styles.statusIndicator}>
                  <View style={styles.onlineIndicator} />
                  <Text style={styles.statusText}>Online</Text>
                </View>
              </View>
            </View>
            <View style={styles.headerButtons}>
              <TouchableOpacity
                style={[styles.iconButton, profile.voiceEnabled && styles.iconButtonActive]}
                onPress={async () => {
                  await updateProfile({ voiceEnabled: !profile.voiceEnabled });
                }}
              >
                {profile.voiceEnabled ? (
                  <Volume2 color={Colors.primary} size={20} />
                ) : (
                  <VolumeX color={Colors.textSecondary} size={20} />
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.iconButton}
                onPress={() => setShowHistory(true)}
              >
                <History color={Colors.textSecondary} size={20} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.iconButton}
                onPress={() => setShowSettings(true)}
              >
                <Settings color={Colors.textSecondary} size={20} />
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>

        <KeyboardAvoidingView 
          style={styles.chatContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView 
            ref={scrollViewRef}
            style={styles.messagesContainer}
            contentContainerStyle={styles.messagesContent}
            showsVerticalScrollIndicator={false}
          >
            {messages.map((message, index) => (
              <MessageBubble key={message.id} message={message} index={index} />
            ))}
            
            {isTyping && (
              <Animated.View 
                style={[
                  styles.messageBubbleContainer,
                  styles.aiMessageContainer,
                  { opacity: typingAnim }
                ]}
              >
                <LinearGradient
                  colors={['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)']}
                  style={[styles.messageBubble, styles.aiMessage]}
                >
                  <View style={styles.messageHeader}>
                    <View style={styles.avatarContainer}>
                      <LinearGradient
                        colors={[Colors.secondary, Colors.primary]}
                        style={styles.avatar}
                      >
                        <Bot color={Colors.background} size={14} />
                      </LinearGradient>
                    </View>
                    <Text style={[styles.messageRole, { color: Colors.text }]}>Coach Alex</Text>
                  </View>
                  <View style={styles.typingIndicator}>
                    <View style={styles.typingDot} />
                    <View style={styles.typingDot} />
                    <View style={styles.typingDot} />
                  </View>
                </LinearGradient>
              </Animated.View>
            )}

            {!hasStartedChat && messages.length <= 1 && (
              <Animated.View 
                style={[
                  styles.suggestionsContainer,
                  {
                    opacity: fadeAnim,
                    transform: [{ translateY: slideAnim }],
                  }
                ]}
              >
                <Text style={styles.suggestionsTitle}>Get started with these questions:</Text>
                {suggestedPrompts.map((prompt) => {
                  const Icon = prompt.icon;
                  return (
                    <TouchableOpacity
                      key={prompt.text}
                      style={[
                        styles.suggestionButton,
                        { borderLeftColor: prompt.color }
                      ]}
                      onPress={() => sendMessage(prompt.text, true)}
                    >
                      <View style={[styles.suggestionIcon, { backgroundColor: prompt.color + '20' }]}>
                        <Icon color={prompt.color} size={18} />
                      </View>
                      <Text style={styles.suggestionText}>{prompt.text}</Text>
                    </TouchableOpacity>
                  );
                })}
              </Animated.View>
            )}
          </ScrollView>

          <SettingsModal 
            visible={showSettings}
            onClose={() => setShowSettings(false)}
            profile={profile}
            updateProfile={updateProfile}
            styles={styles}
          />

          <ChatHistoryModal
            visible={showHistory}
            onClose={() => setShowHistory(false)}
            sessions={sessions}
            currentSessionId={currentSessionId}
            onSelectSession={(sessionId) => {
              setCurrentSessionId(sessionId);
              const session = sessions.find(s => s.id === sessionId);
              if (session) {
                const convertedMessages: Message[] = session.messages.map((msg, idx) => ({
                  id: `${session.id}-${idx}`,
                  text: msg.content,
                  isUser: msg.role === 'user',
                  timestamp: new Date(msg.timestamp),
                }));
                setMessages(convertedMessages);
              }
              setShowHistory(false);
            }}
            onDeleteSession={async (sessionId) => {
              await deleteSession(sessionId);
              if (sessionId === currentSessionId) {
                setCurrentSessionId(null);
                setHasStartedChat(false);
                const greeting = profile.name 
                  ? `Hello ${profile.name}! Ready to unlock your potential? Let's chat about your goals and challenges.`
                  : "Ready to unlock your potential? Let's chat about your goals and challenges. What can I help you today?";
                setMessages([{
                  id: '1',
                  text: greeting,
                  isUser: false,
                  timestamp: new Date(),
                }]);
              }
            }}
            onNewSession={async () => {
              setCurrentSessionId(null);
              setHasStartedChat(false);
              const greeting = profile.name 
                ? `Hello ${profile.name}! Ready to unlock your potential? Let's chat about your goals and challenges.`
                : "Ready to unlock your potential? Let's chat about your goals and challenges. What can I help you today?";
              setMessages([{
                id: '1',
                text: greeting,
                isUser: false,
                timestamp: new Date(),
              }]);
              setShowHistory(false);
            }}
            styles={styles}
          />


          <View style={styles.inputContainer}>
            <View style={styles.inputWrapper}>
              {!isRecording && (
                <>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Ask for motivation, advice, or inspiration..."
                    placeholderTextColor={Colors.textSecondary}
                    value={inputText}
                    onChangeText={setInputText}
                    multiline
                    maxLength={500}
                    editable={!isTranscribing}
                  />
                  <TouchableOpacity
                    style={styles.micButton}
                    onPress={startRecording}
                    disabled={isLoading || isTranscribing}
                  >
                    {isTranscribing ? (
                      <ActivityIndicator size="small" color={Colors.primary} />
                    ) : (
                      <Mic color={Colors.primary} size={20} />
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.sendButton,
                      (!inputText.trim() || isLoading || isTranscribing) && styles.sendButtonDisabled
                    ]}
                    onPress={() => sendMessage(inputText)}
                    disabled={!inputText.trim() || isLoading || isTranscribing}
                  >
                    <Send 
                      color={(!inputText.trim() || isLoading || isTranscribing) ? Colors.textSecondary : Colors.background} 
                      size={20} 
                    />
                  </TouchableOpacity>
                </>
              )}
              {isRecording && (
                <View style={styles.recordingContainer}>
                  <Animated.View style={{ transform: [{ scale: micAnim }] }}>
                    <View style={styles.recordingIndicator}>
                      <Mic color={Colors.background} size={24} />
                    </View>
                  </Animated.View>
                  <View style={styles.recordingTextContainer}>
                    <Text style={styles.recordingText}>Recording...</Text>
                    <Text style={styles.recordingSubtext}>Tap to stop</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.stopRecordingButton}
                    onPress={stopRecording}
                  >
                    <MicOff color={Colors.background} size={20} />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </LinearGradient>

    <PaywallModal
      visible={showPaywall}
      onClose={() => setShowPaywall(false)}
    />
    </>
  );
}

export default function ChatScreen() {
  return <ChatScreenContent />;
}

interface SettingsModalProps {
  visible: boolean;
  onClose: () => void;
  profile: any;
  updateProfile: (updates: any) => void;
  styles: any;
}

const SettingsModal = ({ visible, onClose, profile, updateProfile, styles }: SettingsModalProps) => {
  const [tempName, setTempName] = useState(profile.name);
  const [tempVoice, setTempVoice] = useState(profile.preferredVoice);
  const [tempVoiceEnabled, setTempVoiceEnabled] = useState(profile.voiceEnabled);

  const voices = [
    { id: 'alloy', name: 'Alloy (Neutral)' },
    { id: 'echo', name: 'Echo (Male)' },
    { id: 'fable', name: 'Fable (British Male)' },
    { id: 'onyx', name: 'Onyx (Deep Male)' },
    { id: 'nova', name: 'Nova (Female)' },
    { id: 'shimmer', name: 'Shimmer (Soft Female)' },
  ];

  const saveSettings = () => {
    updateProfile({
      name: tempName,
      preferredVoice: tempVoice,
      voiceEnabled: tempVoiceEnabled,
    });
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <LinearGradient colors={[Colors.background, '#1A1A2E']} style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Chat Settings</Text>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.closeButton}>Done</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalContent}>
          <View style={styles.settingSection}>
            <Text style={styles.settingLabel}>Your Name</Text>
            <TextInput
              style={styles.settingInput}
              value={tempName}
              onChangeText={setTempName}
              placeholder="Enter your name"
              placeholderTextColor={Colors.textSecondary}
            />
          </View>

          <View style={styles.settingSection}>
            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>Voice Responses</Text>
              <TouchableOpacity
                style={[styles.toggle, tempVoiceEnabled && styles.toggleActive]}
                onPress={() => setTempVoiceEnabled(!tempVoiceEnabled)}
              >
                {tempVoiceEnabled ? (
                  <Volume2 color={Colors.background} size={16} />
                ) : (
                  <VolumeX color={Colors.textSecondary} size={16} />
                )}
              </TouchableOpacity>
            </View>
          </View>

          {tempVoiceEnabled && (
            <View style={styles.settingSection}>
              <Text style={styles.settingLabel}>Preferred Voice</Text>
              {voices.map((voice) => (
                <TouchableOpacity
                  key={voice.id}
                  style={[
                    styles.voiceOption,
                    tempVoice === voice.id && styles.voiceOptionSelected
                  ]}
                  onPress={() => setTempVoice(voice.id as any)}
                >
                  <Text style={[
                    styles.voiceOptionText,
                    tempVoice === voice.id && styles.voiceOptionTextSelected
                  ]}>
                    {voice.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <TouchableOpacity style={styles.saveButton} onPress={saveSettings}>
            <Text style={styles.saveButtonText}>Save Settings</Text>
          </TouchableOpacity>
        </ScrollView>
      </LinearGradient>
    </Modal>
  );
};

interface ChatHistoryModalProps {
  visible: boolean;
  onClose: () => void;
  sessions: any[];
  currentSessionId: string | null;
  onSelectSession: (sessionId: string) => void;
  onDeleteSession: (sessionId: string) => void;
  onNewSession: () => void;
  styles: any;
}

const ChatHistoryModal = ({ visible, onClose, sessions, currentSessionId, onSelectSession, onDeleteSession, onNewSession, styles }: ChatHistoryModalProps) => {
  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <LinearGradient colors={[Colors.background, '#1A1A2E']} style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Chat History</Text>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.closeButton}>Done</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalContent}>
          <TouchableOpacity style={styles.newChatButton} onPress={onNewSession}>
            <MessageSquarePlus color={Colors.background} size={20} />
            <Text style={styles.newChatButtonText}>Start New Chat</Text>
          </TouchableOpacity>

          {sessions.length === 0 ? (
            <View style={styles.emptyHistoryContainer}>
              <History color={Colors.textSecondary} size={48} />
              <Text style={styles.emptyHistoryText}>
                No chat history yet.{"\n"}Start a conversation to save it here.
              </Text>
            </View>
          ) : (
            sessions
              .sort((a, b) => b.updatedAt - a.updatedAt)
              .map((session) => (
                <TouchableOpacity
                  key={session.id}
                  style={[
                    styles.historyItem,
                    currentSessionId === session.id && styles.historyItemActive
                  ]}
                  onPress={() => onSelectSession(session.id)}
                >
                  <View style={styles.historyItemContent}>
                    <Text style={styles.historyItemTitle} numberOfLines={1}>
                      {session.title}
                    </Text>
                    <Text style={styles.historyItemDate}>
                      {formatDate(session.updatedAt)} • {session.messages.length} messages
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.historyItemDelete}
                    onPress={(e) => {
                      e.stopPropagation();
                      if (Platform.OS !== 'web') {
                        Alert.alert(
                          'Delete Chat',
                          'Are you sure you want to delete this chat?',
                          [
                            { text: 'Cancel', style: 'cancel' },
                            { 
                              text: 'Delete', 
                              style: 'destructive',
                              onPress: () => onDeleteSession(session.id)
                            }
                          ]
                        );
                      } else {
                        if (window.confirm('Are you sure you want to delete this chat?')) {
                          onDeleteSession(session.id);
                        }
                      }
                    }}
                  >
                    <Trash2 color="#EF4444" size={18} />
                  </TouchableOpacity>
                </TouchableOpacity>
              ))
          )}
        </ScrollView>
      </LinearGradient>
    </Modal>
  );
};

const getStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  coachAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  title: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: -0.3,
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  onlineIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  statusText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '500' as const,
  },
  subtitle: {
    color: Colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  chatContainer: {
    flex: 1,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 16,
  },
  messageBubbleContainer: {
    maxWidth: '85%',
  },
  userMessageContainer: {
    alignSelf: 'flex-end',
  },
  aiMessageContainer: {
    alignSelf: 'flex-start',
  },
  messageBubble: {
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  userMessage: {
    borderTopRightRadius: 8,
  },
  aiMessage: {
    borderTopLeftRadius: 8,
  },
  messageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  avatarContainer: {
    width: 24,
    height: 24,
  },
  avatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messageRole: {
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  typingIndicator: {
    flexDirection: 'row',
    gap: 4,
    paddingVertical: 4,
  },
  typingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.textSecondary,
  },
  suggestionsContainer: {
    marginTop: 24,
    gap: 12,
  },
  suggestionsTitle: {
    color: Colors.text,
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  suggestionButton: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderLeftWidth: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  suggestionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  suggestionText: {
    color: Colors.text,
    fontSize: 15,
    flex: 1,
    lineHeight: 20,
  },
  inputContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  textInput: {
    flex: 1,
    color: Colors.text,
    fontSize: 16,
    maxHeight: 100,
    minHeight: 20,
  },
  sendButton: {
    backgroundColor: Colors.primary,
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  micButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  recordingContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  recordingIndicator: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  recordingTextContainer: {
    flex: 1,
  },
  recordingText: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  recordingSubtext: {
    color: Colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  stopRecordingButton: {
    backgroundColor: '#EF4444',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingsButton: {
    padding: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  voiceButton: {
    marginLeft: 8,
    padding: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  modalTitle: {
    color: Colors.text,
    fontSize: 24,
    fontWeight: 'bold',
  },
  closeButton: {
    color: Colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  settingSection: {
    marginVertical: 20,
  },
  settingLabel: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  settingInput: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    padding: 16,
    color: Colors.text,
    fontSize: 16,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  toggle: {
    width: 50,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  toggleActive: {
    backgroundColor: Colors.primary,
  },
  voiceOption: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  voiceOptionSelected: {
    backgroundColor: Colors.primary + '20',
    borderColor: Colors.primary,
  },
  voiceOptionText: {
    color: Colors.text,
    fontSize: 16,
  },
  voiceOptionTextSelected: {
    color: Colors.primary,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginVertical: 20,
  },
  saveButtonText: {
    color: Colors.background,
    fontSize: 16,
    fontWeight: '600',
  },
  headerButtons: {
    flexDirection: 'row' as const,
    gap: 8,
  },
  iconButton: {
    padding: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  iconButtonActive: {
    backgroundColor: Colors.primary + '20',
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  historyItem: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
  },
  historyItemActive: {
    backgroundColor: Colors.primary + '20',
    borderColor: Colors.primary,
  },
  historyItemContent: {
    flex: 1,
    marginRight: 12,
  },
  historyItemTitle: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '600' as const,
    marginBottom: 4,
  },
  historyItemDate: {
    color: Colors.textSecondary,
    fontSize: 12,
  },
  historyItemDelete: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
  },
  newChatButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center' as const,
    marginVertical: 20,
    flexDirection: 'row' as const,
    justifyContent: 'center' as const,
    gap: 8,
  },
  newChatButtonText: {
    color: Colors.background,
    fontSize: 16,
    fontWeight: '600' as const,
  },
  emptyHistoryContainer: {
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyHistoryText: {
    color: Colors.textSecondary,
    fontSize: 16,
    textAlign: 'center' as const,
    marginTop: 16,
    lineHeight: 22,
  },
  accountRequiredContainer: {
    flex: 1,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 40,
  },
  accountRequiredIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primary + '15',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    marginBottom: 24,
  },
  accountRequiredTitle: {
    color: Colors.text,
    fontSize: 22,
    fontWeight: '700' as const,
    marginBottom: 12,
    textAlign: 'center' as const,
  },
  accountRequiredText: {
    color: Colors.textSecondary,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center' as const,
    marginBottom: 28,
  },
  accountRequiredButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 25,
  },
  accountRequiredButtonText: {
    color: Colors.background,
    fontSize: 16,
    fontWeight: '600' as const,
  },
});