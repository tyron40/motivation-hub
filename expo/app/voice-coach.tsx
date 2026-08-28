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
import { Mic, MicOff, Check, Sparkles } from 'lucide-react-native';
import { Audio, AVPlaybackStatus } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/hooks/theme-context';
import { useUserProfile } from '@/hooks/user-profile-context';
import { useIAP } from '@/hooks/iap-context';
import { useAuth } from '@/hooks/auth-context';
import { generateTextToSpeech as generateTTS, sendChatMessage, transcribeAudioViaBackend } from '@/lib/api-client';
import { API_ENDPOINTS } from '@/lib/config';
import { RECORDING_AUDIO_MODE, restorePlaybackAudioSession } from '@/lib/audio-session';

type Role = 'user' | 'assistant';
type Message = { role: Role; content: string };
// ONE authoritative phase machine. All booleans shown in the UI derive
// from this single enum; parallel isPlaying/greeting/recording flags that
// could disagree are gone.
type Phase = 'idle' | 'recording' | 'processing' | 'speaking';

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

// Absolute floors for a usable recording. Anything below is never uploaded.
const MIN_RECORDING_DURATION_MS = 500;
const MIN_RECORDING_SIZE_BYTES = 1000;

function VoiceCoachContent() {
  const { colors } = useTheme();
  const { profile, updateProfile, isLoading: isProfileLoading } = useUserProfile();

  const selectedVoice =
    voiceOptions.find((voice) => voice.id === (profile.preferredVoice || 'alloy')) ||
    voiceOptions[0];
  const { isAuthenticated, user } = useAuth();
  const iapContext = useIAP();
  const { usageStats } = iapContext;

  const [phase, setPhase] = useState<Phase>('idle');
  const [currentStatus, setCurrentStatus] = useState('Initializing voice coach...');
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  // REAL state (not a ref) so the greeting effect re-runs deterministically
  // once initialization has completed. A ref mutation can never trigger it.
  const [initializationReady, setInitializationReady] = useState(false);

  const isRecording = phase === 'recording';
  const isProcessing = phase === 'processing';

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const styles = useMemo(() => createStyles(colors), [colors]);

  const recordingRef = useRef<Audio.Recording | null>(null);

  // Native recording lifecycle must not depend on React render timing.
  // A user can release the hold button while prepare/start is still awaiting.
  const recordingStartingRef = useRef(false);
  const recordingStopRequestedRef = useRef(false);
  const recordingStoppingRef = useRef(false);
  const recordingStartedAtRef = useRef(0);
  const soundRef = useRef<Audio.Sound | null>(null);
  // Generation counter for TTS playback: callbacks and error paths from
  // an OLD sound must never modify, unload, or reset UI for a NEWER sound.
  const soundEpochRef = useRef(0);
  const temporaryTtsFileRef = useRef<string | null>(null);
  // Guards UI updates from audio callbacks that fire after unmount.
  const mountedRef = useRef(true);

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
  const conversationRef = useRef<Message[]>([]);
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


  const returnToIdle = useCallback((statusText: string = 'Ready to listen') => {
    console.log('[VoiceCoach] idle');
    setPhase('idle');
    setCurrentStatus(statusText);
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

  // Shared playback-mode restore lives in lib/audio-session and is used by
  // the speech player as well, so Voice Coach can never leave the global
  // session in recording mode.

  // Single TTS pipeline for greeting AND AI replies: generateTTS ->
  // temp file -> Sound.createAsync -> playAsync. `source` only labels logs.
  const speakText = useCallback(
    async (spokenText: string, source: string = 'reply', releaseAt: number = 0) => {
      if (!spokenText?.trim()) return;

      // Every spoken response takes a new generation. Late callbacks and
      // error paths from older sounds must never touch a newer response.
      const epoch = ++soundEpochRef.current;

      setPhase('speaking');
      setCurrentStatus('Speaking...');

      try {
        await stopAndUnloadSound();

        // Recording mode must be fully disabled before speaker playback.
        // The session was restored right after recorder unload (or at init);
        // the TTS network roundtrip below gives it ample settle time — no
        // artificial sleeps before network work.
        await restorePlaybackAudioSession();

        const ttsStart = performance.now();
        console.log('[VoiceCoach Timing] TTS request started');

        const preferredVoice = profile.preferredVoice || 'alloy';
        console.log('[VoiceCoach] TTS requested', {
          source,
          voice: preferredVoice,
          textLength: spokenText.length,
        });

        const tts = await generateTTS({
          text: spokenText,
          voice: preferredVoice as any,
        });

        // A newer turn superseded this one — abandon silently.
        if (epoch !== soundEpochRef.current) return;

        console.log(`[VoiceCoach Timing] TTS: ${Math.round(performance.now() - ttsStart)}ms`);

        const base64Data = tts?.audio?.base64Data;
        const mimeType = tts?.audio?.mimeType || 'audio/mpeg';

        if (!base64Data) {
          throw new Error('Voice service returned no audio data');
        }

        console.log(`[VoiceCoach] TTS received bytes=${base64Data.length}`);

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
          console.log('[VoiceCoach] TTS temp file written');
          playbackUri = temporaryUri;
        }

        let createdSound: Audio.Sound | null = null;

        const result = await Audio.Sound.createAsync(
          { uri: playbackUri },
          {
            shouldPlay: false,
            volume: 1.0,
            progressUpdateIntervalMillis: 150,
          },
          (status: AVPlaybackStatus) => {
            // Late callbacks from an OLD sound must never unload or reset a
            // NEWER response, and nothing may update an unmounted screen.
            if (epoch !== soundEpochRef.current || !mountedRef.current) return;

            if (!status.isLoaded) {
              // A load/playback error on the CURRENT sound must never
              // leave the coach stuck in "speaking". (A normal unload
              // fails the identity check below and is ignored.)
              if (createdSound && soundRef.current === createdSound) {
                console.warn('[VoiceCoach] TTS playback error', { source });
                soundRef.current = null;
                void createdSound.unloadAsync().catch(() => {});
                void cleanupTemporaryTtsFile();
                returnToIdle();
              }
              return;
            }

            if (status.didJustFinish) {
              const finishedSound = createdSound;

              // A completion event from an older sound must never clear,
              // unload, or change UI state for a newer coach response.
              if (!finishedSound || soundRef.current !== finishedSound) {
                if (finishedSound) {
                  void finishedSound.unloadAsync().catch(() => {});
                }
                return;
              }

              console.log('[VoiceCoach] TTS finished', { source });

              soundRef.current = null;

              void finishedSound.unloadAsync().catch(() => {});
              void cleanupTemporaryTtsFile();

              returnToIdle();
            }
          }
        );

        createdSound = result.sound;

        if (epoch !== soundEpochRef.current) {
          // Superseded while loading — discard this sound immediately so
          // it can never clobber or overlay a newer coach response.
          await result.sound.unloadAsync().catch(() => {});
          // Delete this turn's temp file ONLY if it is still ours.
          if (temporaryTtsFileRef.current === playbackUri) {
            await cleanupTemporaryTtsFile().catch(() => {});
          }
          return;
        }

        soundRef.current = result.sound;
        console.log('[VoiceCoach] TTS sound loaded', { source });

        // Proven lifecycle: creation and playback are separate operations.
        // Never rely on shouldPlay during sound creation on native iOS.
        let playbackStatus = await result.sound.getStatusAsync();

        if (epoch !== soundEpochRef.current) return;

        if (playbackStatus.isLoaded) {
          await result.sound.playAsync();
          console.log('[VoiceCoach] TTS playAsync started', { source });
          if (releaseAt > 0) {
            console.log(
              `[VoiceCoach Timing] total release-to-audio: ${Math.round(performance.now() - releaseAt)}ms`
            );
          }
        } else {
          console.log(
            '[VoiceCoach] TTS audio not loaded immediately; retrying once'
          );

          await new Promise(resolve => setTimeout(resolve, 400));

          // Make sure this sound was not superseded while waiting.
          if (soundRef.current !== result.sound) {
            await result.sound.unloadAsync().catch(() => {});
            return;
          }

          playbackStatus = await result.sound.getStatusAsync();

          if (!playbackStatus.isLoaded) {
            throw new Error(
              'Voice audio failed to load after retry'
            );
          }

          await result.sound.playAsync();
          console.log('[VoiceCoach] TTS playAsync started (after retry)', { source });
          if (releaseAt > 0) {
            console.log(
              `[VoiceCoach Timing] total release-to-audio: ${Math.round(performance.now() - releaseAt)}ms`
            );
          }
        }
      } catch (err: any) {
        console.error('[VoiceCoach] TTS playback error:', { source, message: err?.message });

        // A superseded turn must never unload a NEWER sound or reset its
        // UI — only the current generation performs cleanup.
        if (epoch !== soundEpochRef.current || !mountedRef.current) return;

        await stopAndUnloadSound().catch(() => {});
        await cleanupTemporaryTtsFile().catch(() => {});

        returnToIdle();

        Alert.alert(
          'Voice Error',
          err?.message || 'Unable to play coach voice right now.'
        );
      }
    },
    [
      profile.preferredVoice,
      stopAndUnloadSound,
      cleanupTemporaryTtsFile,
      returnToIdle,
    ]
  );

  const getCoachReply = useCallback(
    async (userText: string, releaseAt: number = 0) => {
      if (!userText.trim()) {
        returnToIdle();
        return;
      }

      if (usageStats.credits <= 0) {
        Alert.alert('No Credits', 'You need credits to talk with the AI coach.');
        returnToIdle();
        return;
      }

      console.log('[VoiceCoach] transcript:', userText);

      setPhase('processing');
      setCurrentStatus('Thinking...');

      try {
        const userName =
          profile.name?.trim() ||
          user?.user_metadata?.name?.trim() ||
          user?.email?.split('@')[0]?.trim() ||
          'friend';
        const voiceDescription = selectedVoice.description;

        const systemPrompt = `You are a motivational voice coach having a spoken conversation with ${userName}. ${voiceDescription}
Respond naturally and directly. Keep most responses concise enough to speak in roughly 10-25 seconds unless the user explicitly asks for more detail. Avoid long lists and essays. Sound encouraging, energetic, and conversational. Call the user by name when natural.`;

        const nextConversation = trimConversation([
          ...conversationRef.current,
          { role: 'user', content: userText },
        ]);

        const messages = [
          { role: 'system' as const, content: systemPrompt },
          ...nextConversation.map((m) => ({ role: m.role, content: m.content })),
        ];

        console.log('[VoiceCoach] chat requested');
        const chatStart = performance.now();

        const result = await sendChatMessage({ messages });

        console.log(`[VoiceCoach Timing] Chat: ${Math.round(performance.now() - chatStart)}ms`);
        console.log('[VoiceCoach] chat result received');
        const reply = result?.message?.trim();

        if (!reply) throw new Error('Empty response from coach');

        await iapContext.useCredit().catch(() => {});

        conversationRef.current = trimConversation([
          ...nextConversation,
          { role: 'assistant', content: reply },
        ]);

        await speakText(reply, 'response', releaseAt);
      } catch (err: any) {
        console.error('[VoiceCoach] chat failed:', err?.message);
        returnToIdle();
        Alert.alert('Coach Response Failed', 'Coach response failed. Please try again.');
      }
    },
    [usageStats.credits, profile.name, profile.preferredVoice, user?.user_metadata?.name, user?.email, trimConversation, iapContext, speakText, returnToIdle]
  );

  const stopRecording = useCallback(async () => {
    // onPressOut may fire before native/web recorder startup has finished.
    // Record the user's release immediately and let startup complete.
    recordingStopRequestedRef.current = true;
    console.log('[VoiceCoach] recording stop requested');

    if (recordingStoppingRef.current) {
      return;
    }

    // No recorder yet: startup is still awaiting — the flag set above makes
    // startup stop itself the moment the recorder becomes real.
    if (!recordingRef.current && !webRecorderRef.current) {
      return;
    }

    recordingStoppingRef.current = true;

    const releaseAt = performance.now();
    console.log('[VoiceCoach Timing] recording stopped');

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
        if (!userText) {
          throw new Error('No speech detected. Hold the microphone and speak clearly.');
        }

        await getCoachReply(userText, releaseAt);
        return;
      }

      const recording = recordingRef.current;

      // Consume the active recorder before awaiting stop so no second
      // release/event can attempt to unload the same Audio.Recording.
      recordingRef.current = null;

      if (!recording) {
        // Startup/cleanup already consumed it. This is not a user-facing
        // processing failure.
        returnToIdle();
        return;
      }

      // Authoritative duration comes from the recorder itself, read
      // BEFORE stopping (afterwards the file is unloaded).
      let nativeDurationMs = 0;
      try {
        const preStopStatus = await recording.getStatusAsync();
        nativeDurationMs = preStopStatus?.durationMillis ?? 0;
        console.log('[VoiceCoach] pre-stop recorder status', {
          isRecording: preStopStatus?.isRecording,
          canRecord: preStopStatus?.canRecord,
          durationMillis: nativeDurationMs,
        });
      } catch (statusErr) {
        console.warn('[VoiceCoach] pre-stop status check failed', statusErr);
      }

      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();

      // Immediately return the global session to playback mode — the
      // recorder's category must never leak into STT/TTS or the rest of
      // the app. STT network work starts RIGHT AWAY: no artificial settle
      // sleeps; the audio session settles during the network roundtrips.
      await restorePlaybackAudioSession();

      if (!uri) throw new Error('No audio captured');

      // The REAL extension of the file the recorder actually wrote. The
      // multipart filename/MIME must agree with this — never a guess.
      const extension = uri.substring(uri.lastIndexOf('.')).toLowerCase();

      let sizeBytes = 0;
      try {
        const fileInfo = await FileSystem.getInfoAsync(uri);
        sizeBytes = fileInfo.exists ? ((fileInfo as any).size ?? 0) : 0;
      } catch (infoErr) {
        console.warn('[VoiceCoach] recording file info failed', infoErr);
      }

      const durationMs =
        nativeDurationMs > 0
          ? nativeDurationMs
          : recordingStartedAtRef.current > 0
            ? Date.now() - recordingStartedAtRef.current
            : 0;

      console.log('[VoiceCoach] recording captured', {
        durationMs,
        extension,
        sizeBytes,
      });

      // Never upload an effectively empty recording to STT.
      if (durationMs < MIN_RECORDING_DURATION_MS || sizeBytes < MIN_RECORDING_SIZE_BYTES) {
        console.warn('[VoiceCoach] recording too short or empty — skipping STT upload');
        returnToIdle();
        Alert.alert(
          'Hold and Speak',
          'That hold was too short to capture speech. Hold the button, speak for a couple of seconds, then release.'
        );
        return;
      }

      console.log('[VoiceCoach] STT requested');

      const sttStart = performance.now();
      const userText = (await transcribeAudioViaBackend(uri)).trim();
      console.log(`[VoiceCoach Timing] STT: ${Math.round(performance.now() - sttStart)}ms`);

      console.log(
        '[VoiceCoach] STT result:',
        userText ? `ok (${userText.length} chars)` : 'empty'
      );

      if (!userText || userText === '.' || userText === '...') {
        throw new Error('No speech detected. Hold the microphone and speak clearly.');
      }

      await getCoachReply(userText);
    } catch (err: any) {
      console.error('[VoiceCoach] stopRecording error:', err?.message);
      returnToIdle();
      Alert.alert('Processing Error', err?.message || 'Failed to process speech');
    } finally {
      recordingStartingRef.current = false;
      recordingStopRequestedRef.current = false;
      recordingStoppingRef.current = false;
      recordingStartedAtRef.current = 0;
    }
  }, [getCoachReply, returnToIdle]);

  const startRecording = useCallback(async () => {
    console.log('[VoiceCoach] recording start requested');

    // Recording may interrupt a greeting or spoken response, but never an
    // in-flight processing turn and never a second recorder.
    if (phase === 'recording' || phase === 'processing') return;
    if (recordingStartingRef.current || recordingRef.current || webRecorderRef.current) return;

    recordingStartingRef.current = true;
    recordingStopRequestedRef.current = false;
    recordingStoppingRef.current = false;

    try {
      // Pressing the mic while the coach speaks (or greets) must stop that
      // audio immediately and never let it resume or play later.
      soundEpochRef.current++;
      await stopAndUnloadSound();
      setCurrentStatus('Listening...');

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
        setHasPermission(true);
        setPhase('recording');
        console.log('[VoiceCoach] recording started');

        // If the user already released while startup was awaiting,
        // stop immediately now that a real recorder exists.
        if (recordingStopRequestedRef.current) {
          setTimeout(() => {
            void stopRecording();
          }, 0);
        }

        return;
      }

      let perm = await Audio.getPermissionsAsync();
      if (perm.status !== 'granted') perm = await Audio.requestPermissionsAsync();
      if (perm.status !== 'granted') {
        setHasPermission(false);
        Alert.alert('Permission Needed', 'Please allow microphone access.');
        returnToIdle();
        return;
      }

      setHasPermission(true);

      await Audio.setAudioModeAsync(RECORDING_AUDIO_MODE);

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
      setPhase('recording');
      console.log('[VoiceCoach] recording started');

      // onPressOut can occur before startAsync() resolves.
      // Honor that release after the recorder is genuinely active.
      if (recordingStopRequestedRef.current) {
        setTimeout(() => {
          void stopRecording();
        }, 0);
      }
    } catch (err: any) {
      console.error('[VoiceCoach] startRecording error:', err?.message);
      returnToIdle();
      Alert.alert('Recording Error', err?.message || 'Failed to start recording');
    } finally {
      recordingStartingRef.current = false;
    }
  }, [phase, stopAndUnloadSound, stopRecording, returnToIdle]);

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

  const doGreeting = useCallback(async () => {
    // autoGreetDoneRef is ONLY a duplicate-call guard; the deterministic
    // trigger is the initializationReady state below.
    if (autoGreetDoneRef.current) return;
    autoGreetDoneRef.current = true;

    if (!mountedRef.current) {
      console.warn('[VoiceCoach] greeting skipped — screen unmounted');
      return;
    }

    const savedName =
      profile.name?.trim() ||
      user?.user_metadata?.name?.trim() ||
      user?.email?.split('@')[0]?.trim() ||
      '';
    const hour = new Date().getHours();
    const timeGreeting =
      hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
    const greetingText = savedName
      ? `${timeGreeting}, ${savedName}! I'm your AI Voice Coach. What's on your mind today?`
      : `Hey there! I'm your AI Voice Coach. What's on your mind today?`;

    conversationRef.current = trimConversation([
      ...conversationRef.current,
      { role: 'assistant', content: greetingText },
    ]);

    console.log('[VoiceCoach] greeting requested');
    await speakText(greetingText, 'greeting');
  }, [profile.name, user?.user_metadata?.name, user?.email, trimConversation, speakText]);

  // Mount-only initialization. Dependencies are intentionally stable
  // (setPlaybackMode and stopAndUnloadSound never change identity) so this
  // cleanup only runs on a REAL unmount — never because the greeting or a
  // profile change re-rendered the screen.
  useEffect(() => {
    const init = async () => {
      try {
        const perm = await Audio.requestPermissionsAsync();
        setHasPermission(perm.status === 'granted');
      } catch {
        setHasPermission(false);
      }

      try {
        await restorePlaybackAudioSession();
      } catch {}

      console.log('[VoiceCoach] initialized');
      setCurrentStatus('Ready to listen');
      // Deterministic greeting trigger: flip REAL state after permission +
      // playback-mode configuration so the greeting effect re-runs and
      // schedules the greeting. Never rely on a ref mutation for this.
      setInitializationReady(true);
    };

    init();

    return () => {
      mountedRef.current = false;
      stopAndUnloadSound();
      const rec = recordingRef.current;
      if (rec) {
        rec.stopAndUnloadAsync().catch(() => {});
        recordingRef.current = null;
      }

      // Leaving the screen must return the app-wide session to playback
      // mode — a leaked recording category silences speech everywhere.
      void restorePlaybackAudioSession();

      recordingStartingRef.current = false;
      recordingStopRequestedRef.current = false;
      recordingStoppingRef.current = false;
      recordingStartedAtRef.current = 0;
      const stream = webStreamRef.current;
      stream?.getTracks?.().forEach((t: any) => t.stop());
      webStreamRef.current = null;
      webRecorderRef.current = null;
    };
  }, [stopAndUnloadSound]);

  // Automatic greeting, exactly once per screen entry. Gated on the
  // initializationReady STATE (not a ref), so the effect is guaranteed to
  // re-run after initialization completes. A short timer lets the audio
  // session settle before the first TTS request.
  useEffect(() => {
    if (!initializationReady || isProfileLoading) return;
    if (autoGreetDoneRef.current) return;

    console.log('[VoiceCoach] greeting scheduled');
    const timer = setTimeout(() => {
      void doGreeting();
    }, 300);

    return () => clearTimeout(timer);
  }, [initializationReady, isProfileLoading, doGreeting]);


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

          <TouchableOpacity
            testID="voice-settings-button"
            style={styles.changeCoachButton}
            onPress={() => setShowVoiceModal(true)}
          >
            <Sparkles size={14} color={colors.primary} />
            <Text style={[styles.changeCoachText, { color: colors.primary }]}>Change Voice</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.controlsSection}>
          <Animated.View style={[styles.recordButtonContainer, { transform: [{ scale: pulseAnim }] }]}>
            <TouchableOpacity
              testID="record-button"
              style={[
                styles.recordButton,
                isRecording && styles.recordButtonActive,
                isProcessing && styles.recordButtonDisabled,
              ]}
              onPressIn={startRecording}
              onPressOut={stopRecording}
              disabled={isProcessing}
              activeOpacity={0.8}
            >
              {isRecording ? <MicOff size={40} color="white" /> : <Mic size={40} color="white" />}
            </TouchableOpacity>
          </Animated.View>

          <Text style={[styles.statusText, { color: colors.textSecondary }]}>{currentStatus}</Text>
          {!hasPermission && <Text style={styles.permissionText}>Microphone access needed</Text>}
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
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
    },
    avatarSection: {
      alignItems: 'center',
    },
    voiceSphere: {
      width: 210,
      height: 210,
      borderRadius: 105,
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
      borderRadius: 105,
    },
    voiceSphereSoftLayer: {
      position: 'absolute',
      borderRadius: 100,
    },
    voiceSphereUpperGlow: {
      width: 169,
      height: 133,
      top: 9,
      backgroundColor: 'rgba(255,255,255,0.72)',
    },
    voiceSphereBlueLayer: {
      width: 187,
      height: 123,
      bottom: -23,
      backgroundColor: 'rgba(0,149,255,0.33)',
    },
    voiceSphereHighlight: {
      position: 'absolute',
      width: 118,
      height: 85,
      top: 23,
      left: 35,
      borderRadius: 59,
      backgroundColor: 'rgba(255,255,255,0.62)',
    },
    changeCoachButton: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 6,
      marginTop: 36,
      paddingHorizontal: 16,
      paddingVertical: 8,
      backgroundColor: colors.primary + '10',
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.primary + '40',
    },
    changeCoachText: {
      fontSize: 13,
      fontWeight: '600' as const,
    },
    controlsSection: {
      alignItems: 'center' as const,
      marginTop: 56,
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
    statusText: {
      fontSize: 13,
      fontWeight: '500' as const,
      marginTop: 20,
      minHeight: 18,
      textAlign: 'center' as const,
    },
    permissionText: {
      fontSize: 12,
      color: '#e74c3c',
      marginTop: 6,
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
