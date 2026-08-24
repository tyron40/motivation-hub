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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router } from 'expo-router';
import { Mic, MicOff, User, Settings, Check, Sparkles } from 'lucide-react-native';
import { Audio, AVPlaybackStatus } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/hooks/theme-context';
import { useUserProfile } from '@/hooks/user-profile-context';
import { useIAP } from '@/hooks/iap-context';
import { useAuth } from '@/hooks/auth-context';
import { generateTextToSpeech as generateTTS, sendChatMessage, transcribeAudioViaBackend } from '@/lib/api-client';
import { API_ENDPOINTS } from '@/lib/config';

type Role = 'user' | 'assistant';
type Message = { role: Role; content: string };
type Phase = 'idle' | 'greeting' | 'recording' | 'processing' | 'speaking';

const voiceOptions = [
  {
    id: 'alloy',
    voiceName: 'Alloy',
    description: 'Balanced and natural.',
  },
  {
    id: 'echo',
    voiceName: 'Echo',
    description: 'Warm and conversational.',
  },
  {
    id: 'fable',
    voiceName: 'Fable',
    description: 'Expressive and energetic.',
  },
  {
    id: 'onyx',
    voiceName: 'Onyx',
    description: 'Deep and focused.',
  },
  {
    id: 'nova',
    voiceName: 'Nova',
    description: 'Bright and friendly.',
  },
  {
    id: 'shimmer',
    voiceName: 'Shimmer',
    description: 'Soft and clear.',
  },
] as const;

function VoiceCoachContent() {
  const { colors } = useTheme();
  const { profile, updateProfile } = useUserProfile();

  const selectedVoice =
    voiceOptions.find((voice) => voice.id === (profile.preferredVoice || 'alloy')) ||
    voiceOptions[0];
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

  // Native recording lifecycle must not depend on React render timing.
  // A user can release the hold button while prepare/start is still awaiting.
  const recordingStartingRef = useRef(false);
  const recordingActiveRef = useRef(false);
  const recordingStopRequestedRef = useRef(false);
  const recordingStoppingRef = useRef(false);
  const recordingStartedAtRef = useRef(0);
  const soundRef = useRef<Audio.Sound | null>(null);
  const temporaryTtsFileRef = useRef<string | null>(null);

  // Independent layers make the voice sphere feel fluid instead of
  // simply scaling one circle in and out.
  const sphereBreathAnim = useRef(new Animated.Value(0)).current;
  const sphereDriftXAnim = useRef(new Animated.Value(0)).current;
  const sphereDriftYAnim = useRef(new Animated.Value(0)).current;
  const sphereMorphAnim = useRef(new Animated.Value(0)).current;
  const sphereGlowAnim = useRef(new Animated.Value(0)).current;
  const webRecorderRef = useRef<any | null>(null);
  const webStreamRef = useRef<any | null>(null);
  const webChunksRef = useRef<Blob[]>([]);
  const actionLockRef = useRef(false);
  const conversationRef = useRef<Message[]>([]);
  const initDoneRef = useRef(false);
  const autoGreetDoneRef = useRef(false);

  const trimConversation = useCallback((messages: Message[]) => messages.slice(-10), []);
  useEffect(() => {
    const animations = [
      sphereBreathAnim,
      sphereDriftXAnim,
      sphereDriftYAnim,
      sphereMorphAnim,
      sphereGlowAnim,
    ];

    animations.forEach(anim => {
      anim.stopAnimation();
      anim.setValue(0);
    });

    const speaking = phase === 'speaking';
    const recording = phase === 'recording';
    const processing = phase === 'processing';

    const breathDuration = speaking ? 620 : recording ? 760 : processing ? 1250 : 2100;
    const driftXDuration = speaking ? 510 : recording ? 900 : processing ? 1450 : 2400;
    const driftYDuration = speaking ? 690 : recording ? 820 : processing ? 1600 : 2700;
    const morphDuration = speaking ? 430 : recording ? 720 : processing ? 1350 : 2300;
    const glowDuration = speaking ? 540 : recording ? 800 : processing ? 1200 : 2000;

    const makeLoop = (
      value: Animated.Value,
      duration: number
    ) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(value, {
            toValue: 1,
            duration,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(value, {
            toValue: 0,
            duration,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ])
      );

    const loops = [
      makeLoop(sphereBreathAnim, breathDuration),
      makeLoop(sphereDriftXAnim, driftXDuration),
      makeLoop(sphereDriftYAnim, driftYDuration),
      makeLoop(sphereMorphAnim, morphDuration),
      makeLoop(sphereGlowAnim, glowDuration),
    ];

    loops.forEach(loop => loop.start());

    return () => {
      loops.forEach(loop => loop.stop());
    };
  }, [
    phase,
    sphereBreathAnim,
    sphereDriftXAnim,
    sphereDriftYAnim,
    sphereMorphAnim,
    sphereGlowAnim,
  ]);


  const lock = useCallback(() => {
    if (actionLockRef.current) return false;
    actionLockRef.current = true;
    return true;
  }, []);

  const unlock = useCallback(() => {
    actionLockRef.current = false;
  }, []);

  const cleanupTemporaryTtsFile = useCallback(async () => {
    const uri = temporaryTtsFileRef.current;
    temporaryTtsFileRef.current = null;

    if (!uri || Platform.OS === 'web') {
      return;
    }

    try {
      await FileSystem.deleteAsync(uri, { idempotent: true });
    } catch (error) {
      console.warn('[VoiceCoach] Temporary TTS cleanup failed', error);
    }
  }, []);

  const stopAndUnloadSound = useCallback(async () => {
    const s = soundRef.current;
    soundRef.current = null;

    if (s) {
      try {
        await s.stopAsync();
      } catch {}

      try {
        await s.unloadAsync();
      } catch {}
    }

    await cleanupTemporaryTtsFile();
  }, [cleanupTemporaryTtsFile]);

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
    async (spokenText: string) => {
      if (!spokenText?.trim()) return;

      setPhase('speaking');
      setCurrentStatus('Coach is speaking...');

      try {
        await stopAndUnloadSound();

        // Recording mode must be fully disabled before speaker playback.
        await setPlaybackMode();

        const preferredVoice = profile.preferredVoice || 'alloy';
        const tts = await generateTTS({
          text: spokenText,
          voice: preferredVoice as any,
        });

        const base64Data = tts?.audio?.base64Data;
        const mimeType = tts?.audio?.mimeType || 'audio/mpeg';

        if (!base64Data) {
          throw new Error('Voice service returned no audio data');
        }

        let playbackUri: string;

        if (Platform.OS === 'web') {
          playbackUri = `data:${mimeType};base64,${base64Data}`;
        } else {
          const cacheDirectory = FileSystem.cacheDirectory;

          if (!cacheDirectory) {
            throw new Error('Temporary audio storage is unavailable');
          }

          const extension =
            mimeType.includes('wav') ? 'wav' :
            mimeType.includes('m4a') ? 'm4a' :
            'mp3';

          const temporaryUri =
            `${cacheDirectory}voice-coach-${Date.now()}-${Math.random()
              .toString(36)
              .slice(2)}.${extension}`;

          await FileSystem.writeAsStringAsync(
            temporaryUri,
            base64Data,
            {
              encoding: FileSystem.EncodingType.Base64,
            }
          );

          temporaryTtsFileRef.current = temporaryUri;
          playbackUri = temporaryUri;
        }

        let createdSound: Audio.Sound | null = null;

        const result = await Audio.Sound.createAsync(
          { uri: playbackUri },
          {
            shouldPlay: true,
            volume: 1.0,
            progressUpdateIntervalMillis: 150,
          },
          (status: AVPlaybackStatus) => {
            if (!status.isLoaded) {
              return;
            }

            if (status.didJustFinish) {
              const finishedSound = createdSound;

              if (soundRef.current === finishedSound) {
                soundRef.current = null;
              }

              if (finishedSound) {
                void finishedSound.unloadAsync().catch(() => {});
              }

              void cleanupTemporaryTtsFile();

              setPhase('idle');
              setCurrentStatus('Ready to listen');
            }
          }
        );

        createdSound = result.sound;
        soundRef.current = result.sound;

        // Be explicit. Some iOS audio-session transitions load successfully
        // but do not begin playback immediately from shouldPlay alone.
        const playbackStatus = await result.sound.getStatusAsync();

        if (
          playbackStatus.isLoaded &&
          !playbackStatus.isPlaying
        ) {
          await result.sound.playAsync();
        }
      } catch (err: any) {
        console.error('[VoiceCoach] TTS playback error:', err);

        await stopAndUnloadSound().catch(() => {});
        await cleanupTemporaryTtsFile().catch(() => {});

        setPhase('idle');
        setCurrentStatus('Ready to listen');

        Alert.alert(
          'Voice Error',
          err?.message || 'Unable to play coach voice right now.'
        );
      }
    },
    [
      profile.preferredVoice,
      stopAndUnloadSound,
      setPlaybackMode,
      cleanupTemporaryTtsFile,
    ]
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
        const voiceDescription = selectedVoice.description;

        const systemPrompt = `You are the user's AI motivation coach. ${voiceDescription}
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

  const stopRecordingRef = useRef<(() => Promise<void>) | null>(null);

  const startRecording = useCallback(async () => {
    if (phase !== 'idle') return;
    if (recordingStartingRef.current || recordingActiveRef.current) return;
    if (!lock()) return;

    recordingStartingRef.current = true;
    recordingStopRequestedRef.current = false;
    recordingStoppingRef.current = false;

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
        recordingStartingRef.current = false;
        recordingActiveRef.current = true;

        setHasPermission(true);
        setPhase('recording');

        // If the user already released while startup was awaiting,
        // stop immediately now that a real recorder exists.
        if (recordingStopRequestedRef.current) {
          setTimeout(() => {
            void stopRecordingRef.current?.();
          }, 0);
        }

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
      recordingStartingRef.current = false;
      recordingActiveRef.current = true;
      setPhase('recording');

      // onPressOut can occur before startAsync() resolves.
      // Honor that release after the recorder is genuinely active.
      if (recordingStopRequestedRef.current) {
        setTimeout(() => {
          void stopRecordingRef.current?.();
        }, 0);
      }
    } catch (err: any) {
      console.error('âŒ startRecording:', err);
      setPhase('idle');
      setCurrentStatus('Ready to listen');
      Alert.alert('Recording Error', err?.message || 'Failed to start recording');
    } finally {
      recordingStartingRef.current = false;
      if (!recordingRef.current && !webRecorderRef.current) {
        recordingActiveRef.current = false;
      }
      unlock();
    }
  }, [phase, lock, unlock, stopAndUnloadSound]);

  const stopRecording = useCallback(async () => {
    // onPressOut may fire before native/web recorder startup has finished.
    // Record the user's release immediately and let startup complete.
    recordingStopRequestedRef.current = true;

    if (recordingStartingRef.current && !recordingActiveRef.current) {
      return;
    }

    if (!recordingActiveRef.current) {
      return;
    }

    if (recordingStoppingRef.current) {
      return;
    }

    recordingStoppingRef.current = true;

    // OpenAI rejects extremely short recordings. Ensure the active recorder
    // captures enough real audio before it is unloaded.
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

    if (!lock()) {
      recordingStoppingRef.current = false;
      return;
    }

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
        recordingActiveRef.current = false;

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

      // Consume the active recorder before awaiting stop so no second
      // release/event can attempt to unload the same Audio.Recording.
      recordingRef.current = null;
      recordingActiveRef.current = false;

      if (!recording) {
        // Startup/cleanup already consumed it. This is not a user-facing
        // processing failure.
        setPhase('idle');
        setCurrentStatus('Ready to listen');
        return;
      }

      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
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
      recordingStartingRef.current = false;
      recordingActiveRef.current = false;
      recordingStopRequestedRef.current = false;
      recordingStoppingRef.current = false;
      recordingStartedAtRef.current = 0;
      unlock();
    }
  }, [lock, unlock, setPlaybackMode, getCoachReply]);

  stopRecordingRef.current = stopRecording;

  useEffect(() => {
    return () => {
      const activeSound = soundRef.current;
      soundRef.current = null;

      if (activeSound) {
        void activeSound.stopAsync().catch(() => {});
        void activeSound.unloadAsync().catch(() => {});
      }

      const temporaryUri = temporaryTtsFileRef.current;
      temporaryTtsFileRef.current = null;

      if (temporaryUri && Platform.OS !== 'web') {
        void FileSystem.deleteAsync(
          temporaryUri,
          { idempotent: true }
        ).catch(() => {});
      }
    };
  }, []);

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
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
    const greetingText = `${greeting}, ${userName}! I'm your AI Voice Coach. I'm ready to help you win today. What's on your mind?`;

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

      recordingStartingRef.current = false;
      recordingActiveRef.current = false;
      recordingStopRequestedRef.current = false;
      recordingStoppingRef.current = false;
      recordingStartedAtRef.current = 0;
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
          <Animated.View
            style={[
              styles.voiceSphere,
              {
                transform: [
                  {
                    scale: sphereBreathAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange:
                        phase === 'speaking'
                          ? [0.965, 1.045]
                          : phase === 'recording'
                            ? [0.98, 1.035]
                            : [0.99, 1.018],
                    }),
                  },
                ],
                opacity: sphereGlowAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.94, 1],
                }),
              },
            ]}
          >
            <LinearGradient
              colors={[
                '#FFFFFF',
                '#F7FCFF',
                '#DDF5FF',
                '#67CFFF',
                '#1595F5',
              ]}
              locations={[0, 0.32, 0.58, 0.8, 1]}
              style={styles.voiceSphereGradient}
            />

            <Animated.View
              style={[
                styles.voiceSphereSoftLayer,
                styles.voiceSphereUpperGlow,
                {
                  transform: [
                    {
                      translateX: sphereDriftXAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [-5, 6],
                      }),
                    },
                    {
                      translateY: sphereDriftYAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [2, -6],
                      }),
                    },
                    {
                      scaleX: sphereMorphAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.93, 1.08],
                      }),
                    },
                    {
                      scaleY: sphereMorphAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [1.06, 0.94],
                      }),
                    },
                  ],
                },
              ]}
            />

            <Animated.View
              style={[
                styles.voiceSphereSoftLayer,
                styles.voiceSphereBlueLayer,
                {
                  transform: [
                    {
                      translateX: sphereDriftXAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [7, -5],
                      }),
                    },
                    {
                      translateY: sphereDriftYAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [5, -2],
                      }),
                    },
                    {
                      scale: sphereBreathAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange:
                          phase === 'speaking'
                            ? [0.9, 1.1]
                            : [0.96, 1.04],
                      }),
                    },
                  ],
                },
              ]}
            />

            <Animated.View
              style={[
                styles.voiceSphereHighlight,
                {
                  opacity: sphereGlowAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.42, 0.72],
                  }),
                  transform: [
                    {
                      translateX: sphereDriftXAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [-2, 4],
                      }),
                    },
                    {
                      translateY: sphereDriftYAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [-3, 3],
                      }),
                    },
                  ],
                },
              ]}
            />
          </Animated.View>

          <View style={styles.coachInfo}>
            <Text style={[styles.coachName, { color: colors.text }]}>AI Voice Coach</Text>
            <TouchableOpacity style={styles.changeCoachButton} onPress={() => setShowVoiceModal(true)}>
              <Sparkles size={14} color={colors.primary} />
              <Text style={[styles.changeCoachText, { color: colors.primary }]}>Change Voice</Text>
            </TouchableOpacity>
          </View>

          <Text style={[styles.coachTitle, { color: colors.textSecondary }]}>
            {selectedVoice.description}
          </Text>
          <Text style={[styles.voiceIndicator, { color: colors.primary }]}>
            Voice: {selectedVoice.voiceName}
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
              Voice: {selectedVoice.voiceName}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Modal visible={showVoiceModal} animationType="slide" transparent onRequestClose={() => setShowVoiceModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Choose Voice</Text>
            <ScrollView style={styles.voiceList}>
              {voiceOptions.map((voice) => (
                <TouchableOpacity
                  key={voice.id}
                  style={[
                    styles.voiceOption,
                    { backgroundColor: colors.background },
                    profile.preferredVoice === voice.id && { borderColor: colors.primary, backgroundColor: colors.primary + '10' },
                  ]}
                  onPress={async () => {
                    await updateProfile({ preferredVoice: voice.id as any });
                    Alert.alert('Voice Updated', `Voice changed to ${voice.voiceName}`);
                    setShowVoiceModal(false);
                  }}
                >
                  <View style={styles.voiceInfo}>
                    <Text
                      style={[
                        styles.voiceName,
                        { color: profile.preferredVoice === voice.id ? colors.primary : colors.text },
                      ]}
                    >
                      {voice.voiceName}
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
      overflow: 'visible',
      shadowOpacity: 0.35,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 0 },
      elevation: 8,
    },
    voiceSphere: {
      width: 164,
      height: 164,
      borderRadius: 82,
      overflow: 'hidden',
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: '#48B8FF',
      shadowOpacity: 0.42,
      shadowRadius: 24,
      shadowOffset: { width: 0, height: 5 },
      elevation: 12,
    },
    voiceSphereGradient: {
      ...StyleSheet.absoluteFillObject,
      borderRadius: 82,
    },
    voiceSphereSoftLayer: {
      position: 'absolute',
      borderRadius: 100,
    },
    voiceSphereUpperGlow: {
      width: 132,
      height: 104,
      top: 7,
      backgroundColor: 'rgba(255,255,255,0.72)',
    },
    voiceSphereBlueLayer: {
      width: 146,
      height: 96,
      bottom: -18,
      backgroundColor: 'rgba(0,149,255,0.33)',
    },
    voiceSphereHighlight: {
      position: 'absolute',
      width: 92,
      height: 66,
      top: 18,
      left: 27,
      borderRadius: 46,
      backgroundColor: 'rgba(255,255,255,0.62)',
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
