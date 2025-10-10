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
import { Send, Bot, User, Sparkles, Volume2, VolumeX, Settings, Play, Pause, MessageCircle, Zap, Brain, Mic, MicOff } from 'lucide-react-native';
import { Stack } from 'expo-router';
import Colors from '@/constants/colors';
import { useUserProfile } from '@/hooks/user-profile-context';
import { Audio } from 'expo-av';
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

export default function ChatScreen() {
  const { profile, updateProfile } = useUserProfile();
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);

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
      
      newSound.setOnPlaybackStatusUpdate((status) => {
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
      
      const { generateTextToSpeech } = await import('@/lib/openai');
      const audioUrl = await generateTextToSpeech({
        text: text.substring(0, 500),
        voice: profile.preferredVoice || 'alloy',
      });
      
      setMessages(prev => prev.map(msg => 
        msg.id === messageId ? { ...msg, audioUrl } : msg
      ));
      
      console.log('✅ Voice generated successfully for message:', messageId);
      
      setTimeout(() => {
        playAudio(messageId, audioUrl);
      }, 500);
    } catch (error) {
      console.error('❌ Voice generation error:', error);
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

  // Initialize with personalized greeting
  useEffect(() => {
    if (messages.length === 0) {
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
      
      // Generate voice for greeting if enabled
      if (profile.voiceEnabled) {
        const timeoutId = setTimeout(() => {
          generateVoice(greetingMessage.id, greeting);
        }, 1000); // Small delay to let the UI settle
        
        return () => clearTimeout(timeoutId);
      }
    }
  }, [profile.name, profile.voiceEnabled, messages.length, generateVoice]);

  useEffect(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    try {
      // Check if user is setting their name
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

      setMessages(prev => [...prev, userMessage]);
      setInputText('');
      setIsLoading(true);
      setIsTyping(true);

      // Prepare chat messages
      const chatMessages = messages.map(msg => ({
        role: msg.isUser ? 'user' as const : 'assistant' as const,
        content: msg.text,
      }));
      
      chatMessages.push({
        role: 'user',
        content: text.trim(),
      });

      // Add timeout to prevent hanging
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

      try {
        // Use the external API with timeout
        const response = await fetch('https://toolkit.rork.com/text/llm/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messages: [
              {
                role: 'system',
                content: `You are Coach Alex, an AI motivation coach. You provide personalized, inspiring advice to help people overcome challenges and achieve their goals. ${profile.name ? `The user's name is ${profile.name}. ` : ''}Keep responses encouraging, actionable, and under 200 words. Focus on motivation, personal development, and positive mindset.`,
              },
              ...chatMessages,
            ],
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        const completion = data.completion;
        
        if (!completion || typeof completion !== 'string') {
          throw new Error('Invalid response format');
        }
        
        const aiMessage: Message = {
          id: (Date.now() + 1).toString(),
          text: completion,
          isUser: false,
          timestamp: new Date(),
        };

        setMessages(prev => [...prev, aiMessage]);

        // Generate voice if enabled
        if (profile.voiceEnabled && completion) {
          generateVoice(aiMessage.id, completion);
        }
      } catch (fetchError) {
        clearTimeout(timeoutId);
        
        if (fetchError instanceof Error && fetchError.name === 'AbortError') {
          throw new Error('Request timeout - please try again');
        }
        throw fetchError;
      }
    } catch (error) {
      console.error('Chat error:', error);
      
      // Add fallback response
      const errorMessage: Message = {
        id: (Date.now() + 2).toString(),
        text: "I'm sorry, I'm having trouble connecting right now. Please try again in a moment. Remember, you have the strength to overcome any challenge!",
        isUser: false,
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, errorMessage]);
      
      // Use console.error instead of Alert for web compatibility
      if (Platform.OS !== 'web') {
        Alert.alert('Connection Error', 'Failed to get response. Please check your internet connection and try again.');
      } else {
        console.error('Failed to get response. Please check your internet connection and try again.');
      }
    } finally {
      setIsLoading(false);
      setIsTyping(false);
    }
  };





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

      console.log('📤 Sending audio to transcription service...');
      const response = await fetch('https://toolkit.rork.com/stt/transcribe/', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
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
        recording.stopAndUnloadAsync().catch(err => 
          console.error('Error cleaning up recording:', err)
        );
      }
      if (sound) {
        console.log('🧹 Cleaning up sound on unmount');
        sound.unloadAsync().catch(err => 
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
                    stopAudio();
                  } else {
                    playAudio(message.id, message.audioUrl!);
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

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <LinearGradient
        colors={[Colors.background, '#1A1A2E', '#0F0F1E']}
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
            <TouchableOpacity
              style={styles.settingsButton}
              onPress={() => setShowSettings(true)}
            >
              <Settings color={Colors.textSecondary} size={20} />
            </TouchableOpacity>
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
                    <View style={[styles.typingDot, { animationDelay: '0.2s' }]} />
                    <View style={[styles.typingDot, { animationDelay: '0.4s' }]} />
                  </View>
                </LinearGradient>
              </Animated.View>
            )}

            {messages.length === 1 && (
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
                {suggestedPrompts.map((prompt, index) => {
                  const Icon = prompt.icon;
                  return (
                    <TouchableOpacity
                      key={prompt.text}
                      style={[
                        styles.suggestionButton,
                        { borderLeftColor: prompt.color }
                      ]}
                      onPress={() => sendMessage(prompt.text)}
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
    </>
  );
}

interface SettingsModalProps {
  visible: boolean;
  onClose: () => void;
  profile: any;
  updateProfile: (updates: any) => void;
}

const SettingsModal = ({ visible, onClose, profile, updateProfile }: SettingsModalProps) => {
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
          <Text style={styles.modalTitle}>Settings</Text>
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

const styles = StyleSheet.create({
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
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '500',
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
});