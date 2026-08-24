import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Animated,
  Easing,
  Modal,
  ScrollView,
  Platform,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router } from 'expo-router';
import { Mic, MicOff, User, Settings, Check, Sparkles } from 'lucide-react-native';
import { Audio, AVPlaybackStatus } from 'expo-av';
import { useTheme } from '@/hooks/theme-context';
import { useUserProfile } from '@/hooks/user-profile-context';
import { useIAP } from '@/hooks/iap-context';
import { useAuth } from '@/hooks/auth-context';
import { generateTextToSpeech as generateTTS, sendChatMessage, transcribeAudioViaBackend } from '@/lib/api-client';
import { API_ENDPOINTS } from '@/lib/config';

type Role = 'user' | 'assistant';
type Message = { role: Role; content: string };
type Phase = 'idle' | 'greeting' | 'recording' | 'processing' | 'speaking';

const voiceCharacters = [
  {
    id: 'alloy',
    name: 'Jordan',
    voiceName: 'Alloy',
    gender: 'male',
    description: 'Calm, balanced, and encouraging.',
    imageUrl: 'https://randomuser.me/api/portraits/men/32.jpg',
  },
  {
    id: 'echo',
    name: 'Daniel',
    voiceName: 'Echo',
    gender: 'male',
    description: 'Warm, confident, and conversational.',
    imageUrl: 'https://randomuser.me/api/portraits/men/46.jpg',
  },
  {
    id: 'fable',
    name: 'Oliver',
    voiceName: 'Fable',
    gender: 'male',
    description: 'Expressive, thoughtful, and energetic.',
    imageUrl: 'https://randomuser.me/api/portraits/men/75.jpg',
  },
  {
    id: 'onyx',
    name: 'Marcus',
    voiceName: 'Onyx',
    gender: 'male',
    description: 'Deep, focused, powerful, and motivational.',
    imageUrl: 'https://randomuser.me/api/portraits/men/22.jpg',
  },
  {
    id: 'nova',
    name: 'Maya',
    voiceName: 'Nova',
    gender: 'female',
    description: 'Energetic, upbeat, and supportive.',
    imageUrl: 'https://randomuser.me/api/portraits/women/44.jpg',
  },
  {
    id: 'shimmer',
    name: 'Sofia',
    voiceName: 'Shimmer',
    gender: 'female',
    description: 'Gentle, patient, and reassuring.',
    imageUrl: 'https://randomuser.me/api/portraits/women/68.jpg',
  },
] as const;

function VoiceCoachContent() {
  const { colors } = useTheme();
  const { profile, updateProfile } = useUserProfile();

  const selectedCoach =
    voiceCharacters.find((voice) => voice.id === (profile.preferredVoice || 'alloy')) ||
    voiceCharacters[0];
  const { isAuthenticated } = useAuth();
  const iapContext = useIAP();
  const { usageStats } = iapContext;

  const [phase, setPhase] = useState<Phase>('idle');
  const [currentStatus, setCurrentStatus] = useState('Initializing voice coach...');
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const [hasGreeted, setHasGreeted] = useState(false);

  const isRecording = phase === 'recording';
  const isProcessing = phase === 'processing';
  const isPlaying = phase === 'speaking';

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const avatarAnim = useRef(new Animated.Value(0)).current;
  const styles = useMemo(() => createStyles(colors), [colors]);

  const recordingRef = useRef<Audio.Recording | null>(null);
  const recordingStartedAtRef = useRef(0);
  const soundRef = useRef<Audio.Sound | null>(null);
  const webRecorderRef = useRef<any | null>(null);
  const webStreamRef = useRef<any | null>(null);
  const webChunksRef = useRef<Blob[]>([]);
  const actionLockRef = useRef(false);
  const conversationRef = useRef<Message[]>([]);
  const initDoneRef = useRef(false);
  const autoGreetDoneRef = useRef(false);

  const trimConversation = useCallback((messages: Message[]) => messages.slice(-10), []);

  const lock = useCallback(() => {
    if (actionLockRef.current) return false;
    actionLockRef.current = true;
    return true;
  }, []);

  const unlock = useCallback(() => {
    actionLockRef.current = false;
  }, []);

  const stopAndUnloadSound = useCallback(async () => {
    const s = soundRef.current;
    soundRef.current = null;
    if (!s) return;
    try {
      await s.stopAsync();
    } catch {}
    try {
      await s.unloadAsync();
    } catch {}
  }, []);

  const setPlaybackMode = useCallback(async () => {
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
      staysActiveInBackground: true,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    });
  }, []);

  const speakText = useCallback(
    async (text: string) => {
      if (!text?.trim()) return;

      setPhase('speaking');
      setCurrentStatus('Coach is speaking...');

      try {
        await stopAndUnloadSound();
        await setPlaybackMode();

        const preferredVoice = profile.preferredVoice || 'alloy';
        const tts = await generateTTS({ text, voice: preferredVoice as any });

        const uri = `data:${tts.audio.mimeType};base64,${tts.audio.base64Data}`;
        const { sound } = await Audio.Sound.createAsync(
          { uri },
          { shouldPlay: true, volume: 1.0 },
          (status: AVPlaybackStatus) => {
            if (status.isLoaded && status.didJustFinish) {
              setPhase('idle');
              setCurrentStatus('Ready to listen');
            }
          }
        );
        soundRef.current = sound;
      } catch (err: any) {
        console.error('âŒ TTS error:', err);
        setPhase('idle');
        setCurrentStatus('Ready to listen');
        Alert.alert('Voice Error', err?.message || 'Unable to play coach voice right now.');
      }
    },
    [profile.preferredVoice, stopAndUnloadSound, setPlaybackMode, iapContext]
  );

  const getCoachReply = useCallback(
    async (userText: string) => {
      if (!userText.trim()) {
        setPhase('idle');
        setCurrentStatus('Ready to listen');
        return;
      }

      if (usageStats.credits <= 0) {
        Alert.alert('No Credits', 'You need credits to talk with the AI coach.');
        setPhase('idle');
        setCurrentStatus('Ready to listen');
        return;
      }

      setPhase('processing');
      setCurrentStatus('Coach is thinking...');

      try {
        const userName = profile.name || 'friend';
        const coachName = selectedCoach.name;
        const coachDescription =
          selectedCoach.description;

        const systemPrompt = `You are an AI motivation coach named "${coachName}". ${coachDescription}.
Keep answers practical, warm, and short (2-3 sentences). Call user "${userName}" when natural.`;

        const nextConversation = trimConversation([
          ...conversationRef.current,
          { role: 'user', content: userText },
        ]);

        const messages = [
          { role: 'system' as const, content: systemPrompt },
          ...nextConversation.map((m) => ({ role: m.role, content: m.content })),
        ];

        const result = await sendChatMessage({ messages });
        const reply = result?.message?.trim();

        if (!reply) throw new Error('Empty response from coach');

        await iapContext.useCredit().catch(() => {});

        conversationRef.current = trimConversation([
          ...nextConversation,
          { role: 'assistant', content: reply },
        ]);

        if (profile.voiceEnabled === false) {
          setPhase('idle');
          setCurrentStatus('Ready to listen');
          return;
        }

        await speakText(reply);
      } catch (err) {
        console.error('âŒ coach reply error:', err);
        const fallback = "I'm still here with you. Let's try that again.";
        conversationRef.current = trimConversation([
          ...conversationRef.current,
          { role: 'assistant', content: fallback },
        ]);
        await speakText(fallback);
      }
    },
    [usageStats.credits, profile.name, profile.preferredVoice, profile.voiceEnabled, trimConversation, iapContext, speakText]
  );

  const startRecording = useCallback(async () => {
    if (phase !== 'idle') return;
    if (!lock()) return;

    try {
      await stopAndUnloadSound();
      setCurrentStatus('Listening... Speak now!');

      if (Platform.OS === 'web') {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        webStreamRef.current = stream;
        const MR = (window as any).MediaRecorder;
        const mediaRecorder = new MR(stream, { mimeType: 'audio/webm;codecs=opus' });
        webChunksRef.current = [];

        mediaRecorder.ondataavailable = (event: any) => {
          if (event.data?.size > 0) webChunksRef.current.push(event.data);
        };

        webRecorderRef.current = mediaRecorder;
        mediaRecorder.start();
        recordingStartedAtRef.current = Date.now();

        setHasPermission(true);
        setPhase('recording');
        return;
      }

      let perm = await Audio.getPermissionsAsync();
      if (perm.status !== 'granted') perm = await Audio.requestPermissionsAsync();
      if (perm.status !== 'granted') {
        setHasPermission(false);
        Alert.alert('Permission Needed', 'Please allow microphone access.');
        setCurrentStatus('Ready to listen');
        setPhase('idle');
        return;
      }

      setHasPermission(true);

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync({
        android: {
          extension: '.m4a',
          outputFormat: Audio.AndroidOutputFormat.MPEG_4,
          audioEncoder: Audio.AndroidAudioEncoder.AAC,
          sampleRate: 44100,
          numberOfChannels: 1,
          bitRate: 128000,
        },
        ios: {
          extension: '.wav',
          outputFormat: Audio.IOSOutputFormat.LINEARPCM,
          audioQuality: Audio.IOSAudioQuality.HIGH,
          sampleRate: 44100,
          numberOfChannels: 1,
          bitRate: 128000,
          linearPCMBitDepth: 16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
        },
        web: {
          mimeType: 'audio/webm;codecs=opus',
          bitsPerSecond: 128000,
        },
      });

      await recording.startAsync();
      recordingStartedAtRef.current = Date.now();
      recordingRef.current = recording;
      setPhase('recording');
    } catch (err: any) {
      console.error('âŒ startRecording:', err);
      setPhase('idle');
      setCurrentStatus('Ready to listen');
      Alert.alert('Recording Error', err?.message || 'Failed to start recording');
    } finally {
      unlock();
    }
  }, [phase, lock, unlock, stopAndUnloadSound]);

  const stopRecording = useCallback(async () => {
    // OpenAI rejects recordings below ~100ms. More importantly, an
    // immediate press/release on iOS can produce a valid URI with 0ms
    // of audio. Give the recorder enough real capture time before stop.
    const elapsedRecordingMs =
      recordingStartedAtRef.current > 0
        ? Date.now() - recordingStartedAtRef.current
        : 0;

    const minimumRecordingMs = 650;

    if (elapsedRecordingMs < minimumRecordingMs) {
      await new Promise(resolve =>
        setTimeout(resolve, minimumRecordingMs - elapsedRecordingMs)
      );
    }


    if (phase !== 'recording') return;
    if (!lock()) return;

    try {
      setPhase('processing');
      setCurrentStatus('Processing...');

      if (Platform.OS === 'web') {
        const mr = webRecorderRef.current;
        const stream = webStreamRef.current;
        if (!mr) throw new Error('No active recorder');

        const blobPromise = new Promise<Blob>((resolve) => {
          mr.onstop = () => resolve(new Blob(webChunksRef.current, { type: 'audio/webm' }));
        });

        mr.stop();
        const blob = await blobPromise;
        stream?.getTracks?.().forEach((t: any) => t.stop());

        webRecorderRef.current = null;
        webStreamRef.current = null;

        const formData = new FormData();
        formData.append('audio', blob as any, 'recording.webm');

        const response = await fetch(API_ENDPOINTS.stt, { method: 'POST', body: formData });
        if (!response.ok) throw new Error(`STT request failed (${response.status})`);

        const data = await response.json();
        const userText = (data?.text || '').trim();
        if (!userText) throw new Error('No speech detected');

        await getCoachReply(userText);
        return;
      }

      const recording = recordingRef.current;
      if (!recording) throw new Error('No active recording');

      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      recordingRef.current = null;
      await setPlaybackMode();

      if (!uri) throw new Error('No audio captured');

      const userText = (await transcribeAudioViaBackend(uri)).trim();
      if (!userText || userText === '.' || userText === '...') {
        throw new Error('Could not detect clear speech');
      }

      await getCoachReply(userText);
    } catch (err: any) {
      console.error('âŒ stopRecording:', err);
      setPhase('idle');
      setCurrentStatus('Ready to listen');
      Alert.alert('Processing Error', err?.message || 'Failed to process speech');
    } finally {
      unlock();
    }
  }, [phase, lock, unlock, setPlaybackMode, getCoachReply]);

  const stopSpeaking = useCallback(async () => {
    await stopAndUnloadSound();
    setPhase('idle');
    setCurrentStatus('Ready to listen');
  }, [stopAndUnloadSound]);

  const doGreeting = useCallback(async () => {
    if (autoGreetDoneRef.current || hasGreeted) return;
    autoGreetDoneRef.current = true;
    setHasGreeted(true);

    const userName = profile.name || 'friend';
    const coachName = selectedCoach.name;
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
    const greetingText = `${greeting}, ${userName}! I'm ${coachName}. I'm ready to help you win today. What's on your mind?`;

    conversationRef.current = trimConversation([
      ...conversationRef.current,
      { role: 'assistant', content: greetingText },
    ]);

    setPhase('greeting');
    setCurrentStatus('Coach is greeting you...');

    if (profile.voiceEnabled === false) {
      setPhase('idle');
      setCurrentStatus('Ready to listen');
      return;
    }

    await speakText(greetingText);
  }, [profile.name, profile.preferredVoice, profile.voiceEnabled, trimConversation, hasGreeted, speakText]);

  useEffect(() => {
    const init = async () => {
      if (initDoneRef.current) return;
      initDoneRef.current = true;
      try {
        const perm = await Audio.requestPermissionsAsync();
        setHasPermission(perm.status === 'granted');
      } catch {
        setHasPermission(false);
      }

      try {
        await setPlaybackMode();
      } catch {}

      setCurrentStatus('Ready to listen');

      // Automatically greet the user after Voice Coach initializes.
      // Calling this here is reliable because changing initDoneRef
      // does not itself trigger a React render.
      setTimeout(() => {
        void doGreeting();
      }, 220);
    };

    init();

    return () => {
      stopAndUnloadSound();
      const rec = recordingRef.current;
      if (rec) {
        rec.stopAndUnloadAsync().catch(() => {});
        recordingRef.current = null;
      }
      const stream = webStreamRef.current;
      stream?.getTracks?.().forEach((t: any) => t.stop());
      webStreamRef.current = null;
      webRecorderRef.current = null;
    };
  }, [setPlaybackMode, stopAndUnloadSound, doGreeting]);


  useEffect(() => {
    if (!isRecording) {
      pulseAnim.setValue(1);
      return;
    }

    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 700,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 700,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [isRecording, pulseAnim]);

  useEffect(() => {
    if (!isPlaying) {
      avatarAnim.setValue(0);
      return;
    }

    const bounce = Animated.loop(
      Animated.sequence([
        Animated.timing(avatarAnim, {
          toValue: 1,
          duration: 600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(avatarAnim, {
          toValue: 0,
          duration: 600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    bounce.start();
    return () => bounce.stop();
  }, [isPlaying, avatarAnim]);

  const avatarScale = avatarAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.1],
  });

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen
          options={{
            title: 'Voice Coach',
            headerStyle: { backgroundColor: colors.background },
            headerTintColor: colors.text,
          }}
        />
        <View style={styles.accountRequiredContainer}>
          <View style={styles.accountRequiredIcon}>
            <Mic color={colors.primary} size={48} />
          </View>
          <Text style={[styles.accountRequiredTitle, { color: colors.text }]}>Account Required</Text>
          <Text style={[styles.accountRequiredText, { color: colors.textSecondary }]}>
            Create an account to use the AI Voice Coach. An account is needed to track your AI credits and purchases.
          </Text>
          <TouchableOpacity
            style={[styles.accountRequiredButton, { backgroundColor: colors.primary }]}
            onPress={() => router.push('/auth')}
          >
            <Text style={styles.accountRequiredButtonText}>Sign Up / Sign In</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Voice Coach',
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
          headerRight: () => (
            <TouchableOpacity onPress={() => setShowVoiceModal(true)} style={styles.headerButton}>
              <Settings size={24} color={colors.text} />
            </TouchableOpacity>
          ),
        }}
      />

      <View style={styles.content}>
        <View style={styles.avatarSection}>
          <Animated.View style={[styles.avatar, { transform: [{ scale: avatarScale }] }]}>
            <Image source={{ uri: selectedCoach.imageUrl }} style={styles.avatarImage} />
          </Animated.View>

          <View style={styles.coachInfo}>
            <Text style={[styles.coachName, { color: colors.text }]}>{selectedCoach.name}</Text>
            <TouchableOpacity style={styles.changeCoachButton} onPress={() => setShowVoiceModal(true)}>
              <Sparkles size={14} color={colors.primary} />
              <Text style={[styles.changeCoachText, { color: colors.primary }]}>Change Coach</Text>
            </TouchableOpacity>
          </View>

          <Text style={[styles.coachTitle, { color: colors.textSecondary }]}>
            {selectedCoach.description}
          </Text>
          <Text style={[styles.voiceIndicator, { color: colors.primary }]}>
            Speaking as: {selectedCoach.name} - {selectedCoach.voiceName}
          </Text>
        </View>

        <View style={styles.messageSection}>
          <Text style={[styles.statusMainText, { color: colors.primary }]}>{currentStatus}</Text>
          {isPlaying && (
            <TouchableOpacity style={styles.stopButton} onPress={stopSpeaking}>
              <Text style={styles.stopButtonText}>Stop Speaking</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.controlsSection}>
          <Animated.View style={[styles.recordButtonContainer, { transform: [{ scale: pulseAnim }] }]}>
            <TouchableOpacity
              testID="record-button"
              style={[
                styles.recordButton,
                isRecording && styles.recordButtonActive,
                (isProcessing || isPlaying || phase === 'greeting') && styles.recordButtonDisabled,
              ]}
              onPressIn={startRecording}
              onPressOut={stopRecording}
              disabled={isProcessing || isPlaying || phase === 'greeting'}
              activeOpacity={0.8}
            >
              {isRecording ? <MicOff size={40} color="white" /> : <Mic size={40} color="white" />}
            </TouchableOpacity>
          </Animated.View>

          <View style={styles.statusIndicator}>
            {isRecording && (
              <View style={styles.recordingIndicator}>
                <View style={styles.recordingDot} />
                <Text style={styles.recordingText}>Listening...</Text>
              </View>
            )}
            {isProcessing && <Text style={[styles.statusText, { color: colors.primary }]}>Processing...</Text>}
            {isPlaying && <Text style={[styles.statusText, { color: colors.primary }]}>Speaking...</Text>}
          </View>
        </View>

        <View style={styles.instructionsSection}>
          <Text style={[styles.instructionsText, { color: colors.textSecondary }]}>
            {hasPermission
              ? 'Hold the microphone button to speak with your coach'
              : 'Microphone permission required - tap the button to enable'}
          </Text>
          {!hasPermission && <Text style={styles.warningText}>Grant microphone access to use voice features</Text>}
          <TouchableOpacity testID="voice-settings-button" style={styles.voiceSettingsButton} onPress={() => setShowVoiceModal(true)}>
            <Text style={[styles.voiceSettingsText, { color: colors.primary }]}>
              Voice: {selectedCoach.name} - {selectedCoach.voiceName}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Modal visible={showVoiceModal} animationType="slide" transparent onRequestClose={() => setShowVoiceModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Choose Your Voice Coach</Text>
            <ScrollView style={styles.voiceList}>
              {voiceCharacters.map((voice) => (
                <TouchableOpacity
                  key={voice.id}
                  style={[
                    styles.voiceOption,
                    { backgroundColor: colors.background },
                    profile.preferredVoice === voice.id && { borderColor: colors.primary, backgroundColor: colors.primary + '10' },
                  ]}
                  onPress={async () => {
                    await updateProfile({ preferredVoice: voice.id as any });
                    Alert.alert('Voice Updated', `Voice changed to ${voice.name} - ${voice.voiceName}`);
                    setShowVoiceModal(false);
                  }}
                >
                  <Image
                    source={{ uri: voice.imageUrl }}
                    style={styles.voicePortrait}
                  />
                  <View style={styles.voiceInfo}>
                    <Text
                      style={[
                        styles.voiceName,
                        { color: profile.preferredVoice === voice.id ? colors.primary : colors.text },
                      ]}
                    >
                      {voice.name} - {voice.voiceName}
                    </Text>
                    <Text style={[styles.voiceDescription, { color: colors.textSecondary }]}>{voice.description}</Text>
                  </View>
                  {profile.preferredVoice === voice.id && <Check size={24} color={colors.primary} />}
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity style={[styles.modalCloseButton, { backgroundColor: colors.primary }]} onPress={() => setShowVoiceModal(false)}>
              <Text style={styles.modalCloseText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

export default function VoiceCoachScreen() {
  return <VoiceCoachContent />;
}

const createStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      flex: 1,
      padding: 20,
      justifyContent: 'space-between',
    },
    avatarSection: {
      alignItems: 'center',
      paddingTop: 40,
    },
    avatar: {
      width: 120,
      height: 120,
      borderRadius: 60,
      backgroundColor: colors.primary + '10',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 16,
      borderWidth: 3,
      borderColor: colors.primary,
      overflow: 'hidden',
    },
    avatarImage: {
      width: '100%',
      height: '100%',
    },
    coachInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 4,
    },
    changeCoachButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 8,
      paddingVertical: 4,
      backgroundColor: colors.primary + '10',
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.primary + '40',
    },
    changeCoachText: {
      fontSize: 12,
      fontWeight: '500' as const,
    },
    coachName: {
      fontSize: 24,
      fontWeight: 'bold' as const,
      marginBottom: 4,
    },
    coachTitle: {
      fontSize: 16,
      textAlign: 'center' as const,
    },
    voiceIndicator: {
      fontSize: 12,
      textAlign: 'center' as const,
      marginTop: 4,
      fontStyle: 'italic' as const,
    },
    messageSection: {
      flex: 1,
      justifyContent: 'center' as const,
      paddingHorizontal: 20,
      alignItems: 'center',
    },
    statusMainText: {
      fontSize: 20,
      textAlign: 'center' as const,
      lineHeight: 28,
      fontWeight: '600' as const,
      marginBottom: 16,
    },
    stopButton: {
      backgroundColor: 'rgba(231, 76, 60, 0.2)',
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 24,
      borderWidth: 2,
      borderColor: '#e74c3c',
    },
    stopButtonText: {
      color: '#e74c3c',
      fontSize: 16,
      fontWeight: '600' as const,
    },
    controlsSection: {
      alignItems: 'center' as const,
      paddingVertical: 40,
    },
    recordButton: {
      width: 100,
      height: 100,
      borderRadius: 50,
      backgroundColor: colors.primary,
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
      elevation: 8,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
    },
    recordButtonActive: {
      backgroundColor: '#e74c3c',
    },
    recordButtonDisabled: {
      backgroundColor: '#7f8c8d',
      opacity: 0.6,
    },
    recordButtonContainer: {},
    statusIndicator: {
      marginTop: 20,
      height: 30,
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
    },
    recordingIndicator: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
    },
    recordingDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: '#e74c3c',
      marginRight: 8,
    },
    recordingText: {
      color: '#e74c3c',
      fontSize: 16,
      fontWeight: '500' as const,
    },
    statusText: {
      fontSize: 16,
      fontWeight: '500' as const,
    },
    instructionsSection: {
      alignItems: 'center' as const,
      paddingBottom: 20,
    },
    instructionsText: {
      fontSize: 14,
      textAlign: 'center' as const,
      lineHeight: 20,
      marginBottom: 12,
    },
    warningText: {
      fontSize: 12,
      color: '#e74c3c',
      marginBottom: 8,
    },
    voiceSettingsButton: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      backgroundColor: colors.primary + '10',
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.primary + '40',
      alignSelf: 'center' as const,
    },
    voiceSettingsText: {
      fontSize: 14,
      fontWeight: '500' as const,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      justifyContent: 'flex-end' as const,
    },
    modalContent: {
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingTop: 24,
      paddingBottom: 40,
      maxHeight: '70%',
    },
    modalTitle: {
      fontSize: 24,
      fontWeight: 'bold' as const,
      textAlign: 'center' as const,
      marginBottom: 24,
      paddingHorizontal: 20,
    },
    voiceList: {
      paddingHorizontal: 20,
    },
    voiceOption: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'space-between' as const,
      paddingVertical: 16,
      paddingHorizontal: 20,
      borderRadius: 12,
      marginBottom: 12,
      borderWidth: 2,
      borderColor: 'transparent',
    },
    voicePortrait: {
      width: 56,
      height: 56,
      borderRadius: 28,
      marginRight: 12,
      backgroundColor: colors.card,
    },
    voiceInfo: {
      flex: 1,
    },
    voiceName: {
      fontSize: 18,
      fontWeight: '600' as const,
      marginBottom: 4,
    },
    voiceDescription: {
      fontSize: 14,
    },
    modalCloseButton: {
      marginTop: 24,
      marginHorizontal: 20,
      paddingVertical: 16,
      borderRadius: 12,
      alignItems: 'center' as const,
    },
    modalCloseText: {
      color: 'white',
      fontSize: 18,
      fontWeight: '600' as const,
    },
    headerButton: {
      marginRight: 16,
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
      backgroundColor: colors.primary + '15',
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
      marginBottom: 24,
    },
    accountRequiredTitle: {
      fontSize: 22,
      fontWeight: '700' as const,
      marginBottom: 12,
      textAlign: 'center' as const,
    },
    accountRequiredText: {
      fontSize: 15,
      lineHeight: 22,
      textAlign: 'center' as const,
      marginBottom: 28,
    },
    accountRequiredButton: {
      paddingHorizontal: 32,
      paddingVertical: 14,
      borderRadius: 25,
    },
    accountRequiredButtonText: {
      color: 'white',
      fontSize: 16,
      fontWeight: '600' as const,
    },
  });
