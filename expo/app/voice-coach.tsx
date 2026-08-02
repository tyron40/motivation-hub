import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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
import { useFocusEffect } from '@react-navigation/native';
import { Mic, MicOff, User, Settings, Check, Sparkles } from 'lucide-react-native';
import { Audio, AVPlaybackStatus } from 'expo-av';
import { useTheme } from '@/hooks/theme-context';
import { useUserProfile } from '@/hooks/user-profile-context';
import { useIAP } from '@/hooks/iap-context';
import { useAuth } from '@/hooks/auth-context';
import { generateTextToSpeech as generateTTS, sendChatMessage, transcribeAudioViaBackend } from '@/lib/api-client';
import { API_ENDPOINTS } from '@/lib/config';


interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

const voiceCharacters = [
  { id: 'alloy', name: 'Alloy', description: 'Neutral and balanced voice' },
  { id: 'echo', name: 'Echo', description: 'Warm and engaging male voice' },
  { id: 'fable', name: 'Fable', description: 'Expressive British accent' },
  { id: 'onyx', name: 'Onyx', description: 'Deep and authoritative male voice' },
  { id: 'nova', name: 'Nova', description: 'Energetic female voice' },
  { id: 'shimmer', name: 'Shimmer', description: 'Soft and gentle female voice' },
] as const;

function VoiceCoachContent() {
  const { colors } = useTheme();
  const { profile, updateProfile } = useUserProfile();
  const { isAuthenticated } = useAuth();
  const iapContext = useIAP();
  const { usageStats } = iapContext;
  const [, setMessages] = useState<Message[]>([]);
  const messagesRef = useRef<Message[]>([]);
  const updateMessages = useCallback((next: Message[] | ((prev: Message[]) => Message[])) => {
    setMessages(prev => {
      const resolved = typeof next === 'function' ? next(prev) : next;
      messagesRef.current = resolved;
      return resolved;
    });
  }, []);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const webRecorderRef = useRef<any | null>(null);
  const webStreamRef = useRef<any | null>(null);
  const webChunksRef = useRef<Blob[]>([]);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [currentStatus, setCurrentStatus] = useState<string>('Initializing voice coach...');

  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [hasGreeted, setHasGreeted] = useState(false);
  const isInitializedRef = useRef(false);
  const recordingStartTimeRef = useRef<number | null>(null);
  const isStartingRef = useRef<boolean>(false);
  const isStoppingRef = useRef<boolean>(false);
  const [hasPermission, setHasPermission] = useState<boolean>(false);
  
  // Animation values
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const avatarAnim = useRef(new Animated.Value(0)).current;
  
  const styles = useMemo(() => createStyles(colors), [colors]);


  const speakMessage = useCallback(async (text: string) => {
    try {
      console.log('🔊 Speaking message:', text.substring(0, 50) + '...');
      
      // Check credits before TTS
      if (usageStats.credits <= 0) {
        Alert.alert(
          'No Credits',
          'You need credits to use voice features. The coach response is shown as text only.',
          [{ text: 'OK' }]
        );
        setCurrentStatus('Ready to listen (text mode)');
        return;
      }
      
      setIsPlaying(true);
      setCurrentStatus('Coach is speaking...');
      
      if (sound) {
        try {
          await sound.stopAsync();
          await sound.unloadAsync();
          setSound(null);
        } catch (e) {
          console.log('⚠️ Error stopping previous sound:', e);
        }
      }
      
      const preferredVoice = profile.preferredVoice || 'alloy';
      console.log('🎵 Selected voice:', preferredVoice);
      
      console.log('📤 Calling TTS via Rork backend (optimized for speed)...');
      const ttsStartTime = Date.now();
      
      try {
        const result = await generateTTS({
          text,
          voice: preferredVoice as any,
        });
        
        const ttsElapsed = Date.now() - ttsStartTime;
        console.log(`✅ TTS audio received in ${ttsElapsed}ms`);
        
        // Deduct 1 credit for TTS
        const creditUsed = await iapContext.useCredit();
        if (creditUsed) {
          console.log('💳 1 credit used for TTS (Voice Generation). Remaining:', iapContext.usageStats.credits - 1);
        } else {
          console.warn('⚠️ Failed to deduct credit for TTS');
        }
        
        const audioUri = `data:${result.audio.mimeType};base64,${result.audio.base64Data}`;
        
        const { sound: newSound } = await Audio.Sound.createAsync(
          { uri: audioUri },
          { shouldPlay: true },
          (status: AVPlaybackStatus) => {
            if (status.isLoaded && status.didJustFinish) {
              console.log('✅ TTS playback finished');
              setIsPlaying(false);
              setCurrentStatus('Ready to listen');
            }
          }
        );
        
        setSound(newSound);
        console.log('🔊 TTS playback started');
      } catch (ttsError: any) {
        console.error('❌ TTS generation failed:', ttsError);
        
        let errorTitle = 'Voice Not Available';
        let errorMessage = 'Text-to-speech is currently unavailable. You can continue using the voice coach in text mode.';
        
        if (ttsError?.message?.includes('API key')) {
          errorMessage = 'The OpenAI API key needs to be configured on the server. You can continue using the voice coach in text mode.';
        } else if (ttsError?.message?.includes('Cannot reach') || 
                   ttsError?.message?.includes('Cannot connect') ||
                   ttsError?.message?.includes('Network')) {
          errorTitle = 'Connection Error';
          errorMessage = ttsError.message;
        }
        
        Alert.alert(errorTitle, errorMessage, [{ text: 'OK' }]);
        
        setIsPlaying(false);
        setCurrentStatus('Ready to listen (text mode)');
      }
    } catch (error) {
      console.error('❌ Error speaking message:', error);
      console.error('❌ Error type:', error?.constructor?.name);
      console.error('❌ Error details:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
      
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      let errorTitle = 'Voice Not Available';
      let displayMessage = 'Text-to-speech is currently unavailable. You can continue using the voice coach in text mode.';
      
      if (errorMessage.includes('API key') || errorMessage.includes('401')) {
        displayMessage = 'Please check the server configuration.';
      } else if (errorMessage.includes('Cannot reach') || 
                 errorMessage.includes('Cannot connect') ||
                 errorMessage.includes('Network')) {
        errorTitle = 'Connection Error';
        displayMessage = errorMessage;
      }
      
      Alert.alert(errorTitle, displayMessage, [{ text: 'OK' }]);
      
      setIsPlaying(false);
      setCurrentStatus('Ready to listen (text mode)');
      console.log('Speech synthesis failed, continuing in text mode');
    }
  }, [profile.preferredVoice, sound, usageStats.credits, iapContext]);

  const handleInitialGreeting = useCallback(async () => {
    if (hasGreeted) {
      console.log('⚠️ Already greeted, skipping');
      return;
    }
    
    setHasGreeted(true);
    
    const userName = profile.name || 'friend';
    const coachName = profile.coachCharacter?.name || 'Coach Alex';
    const timeOfDay = new Date().getHours();
    let greeting = 'Hello';
    if (timeOfDay < 12) greeting = 'Good morning';
    else if (timeOfDay < 17) greeting = 'Good afternoon';
    else greeting = 'Good evening';
    
    const greetingMessage: Message = {
      role: 'assistant',
      content: `${greeting}, ${userName}! I'm ${coachName}, your personal motivation coach. I'm fired up and ready to help you push past limits, build unstoppable confidence, and turn today's goals into wins. What's on your mind right now?`,
      timestamp: Date.now(),
    };
    
    console.log('👋 Setting initial greeting message for:', userName);
    updateMessages([greetingMessage]);
    setCurrentStatus('Coach is greeting you...');
    
    console.log('🔊 Speaking initial greeting...');
    console.log('🔊 Voice enabled:', profile.voiceEnabled !== false);
    console.log('🔊 Selected voice:', profile.preferredVoice || 'alloy');
    
    await new Promise(resolve => setTimeout(resolve, 200));
    
    try {
      console.log('🎯 About to speak greeting message...');
      await speakMessage(greetingMessage.content);
      console.log('✅ Initial greeting spoken successfully');
    } catch (error) {
      console.error('❌ Failed to speak greeting:', error);
      setCurrentStatus('Ready to listen');
    }
  }, [profile.name, profile.voiceEnabled, profile.preferredVoice, profile.coachCharacter, speakMessage, hasGreeted]);

  useEffect(() => {
    let isMounted = true;
    
    const initializeVoiceCoach = async () => {
      if (isInitializedRef.current) {
        console.log('⚠️ Already initialized, skipping');
        return;
      }
      
      isInitializedRef.current = true;
      
      try {
        console.log('🔍 Checking backend health...');
        console.log('✅ Using direct API calls, no backend health check needed');
        
        console.log('🔐 Requesting microphone permissions on startup...');
        const permissionResponse = await Audio.requestPermissionsAsync();
        console.log('🔐 Permission response:', JSON.stringify(permissionResponse));
        
        if (permissionResponse.status === 'granted') {
          console.log('✅ Microphone permission granted');
          setHasPermission(true);
        } else {
          console.log('⚠️ Microphone permission not granted');
          setHasPermission(false);
        }
        
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
          shouldDuckAndroid: true,
        });
        console.log('✅ Audio mode initialized');
        
        await new Promise(resolve => setTimeout(resolve, 300));
        setCurrentStatus('Ready to listen');
      } catch (error) {
        console.error('Error initializing voice coach:', error);
        setCurrentStatus('Ready to listen');
      }
    };
    
    initializeVoiceCoach();
    
    return () => {
      isMounted = false;
      
      const cleanup = async () => {
        console.log('🧹 Cleaning up audio resources...');
        
        try {
          if (sound) {
            await sound.stopAsync();
            await sound.unloadAsync();
            console.log('✅ Sound cleaned up');
          }
        } catch (e) {
          console.log('⚠️ Sound cleanup error:', e);
        }
        
        try {
          if (recordingRef.current) {
            const status = await recordingRef.current.getStatusAsync();
            if (status.canRecord || status.isRecording) {
              await recordingRef.current.stopAndUnloadAsync();
            }
            recordingRef.current = null;
            console.log('✅ Recording cleaned up');
          }
        } catch (e) {
          console.log('⚠️ Recording cleanup error:', e);
        }
        
        try {
          await Audio.setAudioModeAsync({
            allowsRecordingIOS: false,
            playsInSilentModeIOS: true,
            staysActiveInBackground: false,
            shouldDuckAndroid: true,
          });
          console.log('✅ Audio mode reset on cleanup');
        } catch (e) {
          console.log('⚠️ Audio mode reset error:', e);
        }
      };
      
      cleanup();
    };
  }, [sound]);

  // Greeting effect: trigger once the user's profile name is loaded (or fallback after timeout)
  useEffect(() => {
    if (hasGreeted) return;

    if (profile.name) {
      const timer = setTimeout(() => {
        handleInitialGreeting();
      }, 300);
      return () => clearTimeout(timer);
    }

    // Wait briefly for profile name to load; otherwise greet with fallback
    const timer = setTimeout(() => {
      if (!hasGreeted) {
        handleInitialGreeting();
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, [profile.name, hasGreeted, handleInitialGreeting]);

  // Pulse animation for recording
  useEffect(() => {
    if (isRecording) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isRecording, pulseAnim]);

  // Avatar animation when speaking
  useEffect(() => {
    if (isPlaying) {
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
    } else {
      avatarAnim.setValue(0);
    }
  }, [isPlaying, avatarAnim]);

  const startRecording = async () => {
    try {
      console.log('🎤 Starting recording...');
      
      if (isRecording || isProcessing || isStartingRef.current || isStoppingRef.current) {
        console.log('⚠️ Cannot start recording - already busy');
        return;
      }
      
      isStartingRef.current = true;
      
      if (sound || isPlaying) {
        console.log('🔇 Stopping any existing playback...');
        try {
          if (sound) {
            await sound.stopAsync();
            await sound.unloadAsync();
            setSound(null);
          }
          setIsPlaying(false);
        } catch (e) {
          console.log('⚠️ Error stopping playback:', e);
        }
        await new Promise(resolve => setTimeout(resolve, 300));
      }
      
      if (recordingRef.current) {
        try {
          console.log('🧹 Cleaning up existing recording...');
          const status = await recordingRef.current.getStatusAsync();
          if (status.canRecord || status.isRecording) {
            await recordingRef.current.stopAndUnloadAsync();
          }
          console.log('✅ Existing recording cleaned up');
        } catch (e) {
          console.log('⚠️ Error cleaning up existing recording:', e);
        }
        recordingRef.current = null;
        await new Promise(resolve => setTimeout(resolve, 300));
      }
      
      if (Platform.OS === 'web') {
        try {
          console.log('🌐 Starting web recording via MediaRecorder');
          
          if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            throw new Error('Your browser does not support audio recording. Please use a modern browser like Chrome, Firefox, or Safari.');
          }
          
          console.log('🔐 Requesting microphone access from browser...');
          const stream = await navigator.mediaDevices.getUserMedia({ 
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
            } 
          });
          console.log('✅ Microphone access granted');
          console.log('🎤 Audio tracks:', stream.getAudioTracks().length);
          
          webStreamRef.current = stream;

          const MrCtor = (window as any).MediaRecorder;
          if (!MrCtor) {
            throw new Error('MediaRecorder is not supported in your browser.');
          }
          
          const mimeType = 'audio/webm;codecs=opus';
          console.log('🎵 Creating MediaRecorder with mimeType:', mimeType);
          const mr = new MrCtor(stream, { mimeType });
          webChunksRef.current = [];

          mr.onstart = () => {
            console.log('✅ Web MediaRecorder started');
            console.log('🎤 Recording state:', mr.state);
          };
          mr.ondataavailable = (e: any) => {
            console.log('📦 Data available, size:', e.data?.size || 0);
            if (e.data && e.data.size > 0) {
              webChunksRef.current.push(e.data);
            }
          };
          mr.onerror = (e: any) => {
            console.error('❌ MediaRecorder error:', e);
            Alert.alert('Recording Error', 'An error occurred while recording. Please try again.');
          };

          webRecorderRef.current = mr;
          mr.start();
          console.log('▶️ MediaRecorder.start() called');

          setIsRecording(true);
          setCurrentStatus('Listening... Speak now!');
          setHasPermission(true);
          isStartingRef.current = false;
          return;
        } catch (webErr: any) {
          console.error('❌ Web recording error:', webErr);
          console.error('❌ Error name:', webErr?.name);
          console.error('❌ Error message:', webErr?.message);
          isStartingRef.current = false;
          
          let errorMessage = 'Unable to access your microphone.';
          
          if (webErr.name === 'NotAllowedError' || webErr.name === 'PermissionDeniedError') {
            errorMessage = 'Microphone permission was denied. Please allow microphone access in your browser settings and try again.';
          } else if (webErr.name === 'NotFoundError' || webErr.name === 'DevicesNotFoundError') {
            errorMessage = 'No microphone found. Please connect a microphone and try again.';
          } else if (webErr.name === 'NotReadableError' || webErr.name === 'TrackStartError') {
            errorMessage = 'Your microphone is already in use by another application. Please close other apps using the microphone and try again.';
          } else if (webErr.message) {
            errorMessage = webErr.message;
          }
          
          Alert.alert('Microphone Error', errorMessage);
          setHasPermission(false);
          return;
        }
      }

      console.log('🔐 Checking microphone permissions...');
      let permissionResponse = await Audio.getPermissionsAsync();
      console.log('🔐 Current permission status:', JSON.stringify(permissionResponse));
      
      if (permissionResponse.status !== 'granted') {
        console.log('🔐 Permission not granted, requesting...');
        permissionResponse = await Audio.requestPermissionsAsync();
        console.log('🔐 Permission request result:', JSON.stringify(permissionResponse));
        
        if (permissionResponse.status !== 'granted') {
          console.error('❌ Microphone permission denied');
          isStartingRef.current = false;
          recordingStartTimeRef.current = null;
          setHasPermission(false);
          
          const message = permissionResponse.canAskAgain 
            ? 'Microphone access is required to use voice chat. Please grant permission when prompted.'
            : 'Microphone permission was denied. Please enable it in your device Settings > Privacy > Microphone, then restart the app.';
          
          Alert.alert(
            'Microphone Permission Required', 
            message,
            [{ text: 'OK' }]
          );
          return;
        }
        
        setHasPermission(true);
      }
      
      console.log('✅ Microphone permission granted');
      
      await new Promise(resolve => setTimeout(resolve, 300));

      console.log('🔧 Setting up audio mode for recording...');
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });
      
      console.log('✅ Audio mode configured for recording');
      await new Promise(resolve => setTimeout(resolve, 150));

      console.log('🆕 Creating new recording instance...');
      const recordingInstance = new Audio.Recording();
      
      console.log('🔧 Preparing recording...');
      
      const recordingOptions = {
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
      };
      
      await recordingInstance.prepareToRecordAsync(recordingOptions);
      console.log('✅ Recording prepared successfully');

      console.log('▶️ Starting recording...');
      
      recordingStartTimeRef.current = Date.now();
      console.log('⏱️ Recording start time set:', recordingStartTimeRef.current);
      
      await recordingInstance.startAsync();
      console.log('✅ Recording.startAsync() completed');
      
      await new Promise(resolve => setTimeout(resolve, 150));
      const recordingStatus = await recordingInstance.getStatusAsync();
      console.log('📊 Recording status after start:', JSON.stringify(recordingStatus));
      console.log('📊 Is recording:', recordingStatus.isRecording);
      console.log('📊 Duration so far:', recordingStatus.durationMillis, 'ms');
      
      if (!recordingStatus.isRecording) {
        console.error('❌ Recording failed to start properly');
        recordingStartTimeRef.current = null;
        await recordingInstance.stopAndUnloadAsync();
        throw new Error('Recording did not start. Please check microphone permissions and try again.');
      }
      
      recordingRef.current = recordingInstance;
      setIsRecording(true);
      setCurrentStatus('Listening... Speak now!');
      isStartingRef.current = false;
      
      console.log('✅ Recording started successfully and verified');
    } catch (error) {
      console.error('❌ Error starting recording:', error);
      
      recordingRef.current = null;
      setIsRecording(false);
      recordingStartTimeRef.current = null;
      isStartingRef.current = false;
      
      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
          shouldDuckAndroid: true,
        });
      } catch (resetError) {
        console.error('Error resetting audio mode:', resetError);
      }
      
      const errorMessage = (error as Error).message;
      const userMessage = errorMessage.includes('permission') 
        ? 'Microphone permission is required. Please enable it in your device settings.'
        : `Failed to start recording: ${errorMessage}`;
      
      Alert.alert('Recording Error', userMessage);
    }
  };

  const stopRecording = async () => {
    try {
      console.log('🛑 Stopping recording...');
      
      if (isStoppingRef.current) {
        console.log('⚠️ Already stopping recording');
        return;
      }
      
      isStoppingRef.current = true;
      
      if (isStartingRef.current) {
        console.log('⏳ Waiting for recording to initialize before stopping...');
        let waited = 0;
        while (isStartingRef.current && waited < 800) {
          await new Promise(resolve => setTimeout(resolve, 50));
          waited += 50;
        }
      }
      isStartingRef.current = false;

      if (Platform.OS === 'web') {
        try {
          setIsRecording(false);
          setCurrentStatus('Processing...');
          const mr: any = webRecorderRef.current;
          const stream: any = webStreamRef.current;
          if (!mr) {
            console.log('⚠️ No web MediaRecorder instance');
            setCurrentStatus('Ready to listen');
            isStoppingRef.current = false;
            return;
          }
          const getBlob = new Promise<Blob>((resolve) => {
            mr.onstop = () => {
              const blob = new Blob(webChunksRef.current, { type: 'audio/webm' });
              console.log('📦 Web recording blob size:', blob.size);
              resolve(blob);
            };
          });
          mr.stop();
          const blob = await getBlob;
          if (stream) {
            stream.getTracks().forEach((t: any) => t.stop());
            webStreamRef.current = null;
          }
          webRecorderRef.current = null;
          await processWebTranscription(blob);
          return;
        } catch (e) {
          console.error('❌ Error stopping web recording:', e);
          Alert.alert('Recording Error', 'Failed to capture audio from the browser.');
          setCurrentStatus('Ready to listen');
          isStoppingRef.current = false;
          return;
        }
      }

      if (!recordingRef.current) {
        console.log('⚠️ No recording instance found');
        setIsRecording(false);
        isStoppingRef.current = false;
        return;
      }
      
      setIsRecording(false);
      setCurrentStatus('Processing...');
      
      const startedAt = recordingStartTimeRef.current ?? null;
      recordingStartTimeRef.current = null;
      
      let uri: string | null = null;
      let status: any = null;
      let recordingToProcess = recordingRef.current;
      
      try {
        await new Promise(resolve => setTimeout(resolve, 100));
        
        status = await recordingToProcess.getStatusAsync();
        console.log('📊 Recording status:', JSON.stringify(status, null, 2));
        console.log('📊 Duration:', status.durationMillis, 'ms');
        console.log('📊 Is recording:', status.isRecording);
        console.log('📊 Can record:', status.canRecord);
        
        if (status.canRecord || status.isRecording) {
          uri = recordingToProcess.getURI();
          console.log('📁 Recording URI:', uri);
          
          await recordingToProcess.stopAndUnloadAsync();
          console.log('✅ Recording stopped and unloaded');
        } else {
          console.log('⚠️ Recording was not active, trying to get URI anyway');
          try {
            uri = recordingToProcess.getURI();
            await recordingToProcess.stopAndUnloadAsync();
          } catch (e) {
            console.log('⚠️ Could not get URI from inactive recording:', e);
          }
        }
      } catch (error) {
        console.error('❌ Error stopping recording:', error);
        try {
          uri = recordingToProcess.getURI();
          console.log('📁 Got URI despite stop error:', uri);
        } catch (uriError) {
          console.error('❌ Could not get URI:', uriError);
        }
      } finally {
        recordingRef.current = null;
      }
      
      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
          shouldDuckAndroid: true,
        });
        console.log('✅ Audio mode reset');
      } catch (error) {
        console.error('❌ Error resetting audio mode:', error);
      }
      
      if (uri) {
        console.log('🎵 Processing recording with URI:', uri);
        
        const elapsedMs = startedAt ? Date.now() - startedAt : null;
        const MIN_DURATION_MS = 300;
        
        const nativeDurationMs = status?.durationMillis ?? null;
        
        console.log(`⏱️ Elapsed time (our timer): ${elapsedMs}ms`);
        console.log(`⏱️ Native duration: ${nativeDurationMs}ms`);
        
        const actualDuration = Math.max(elapsedMs ?? 0, nativeDurationMs ?? 0);
        console.log(`⏱️ Actual duration used: ${actualDuration}ms (${(actualDuration / 1000).toFixed(2)}s)`);
        
        if (actualDuration < MIN_DURATION_MS) {
          console.log(`⚠️ Recording too short: ${actualDuration}ms (minimum: ${MIN_DURATION_MS}ms)`);
          Alert.alert(
            'Recording Too Short',
            `Recording was only ${(actualDuration / 1000).toFixed(2)} seconds. Please hold the button longer while speaking clearly.`,
            [{ text: 'Try Again' }]
          );
          setCurrentStatus('Ready to listen');
          isStoppingRef.current = false;
          return;
        }
        
        await processAudioTranscription(uri);
      } else {
        console.log('❌ No recording URI available');
        Alert.alert('Recording Error', 'No audio was recorded. Please hold the button while speaking.');
        setCurrentStatus('Ready to listen');
      }
    } catch (error) {
      console.error('❌ Error stopping recording:', error);
      recordingRef.current = null;
      setIsRecording(false);
      recordingStartTimeRef.current = null;
      Alert.alert('Recording Error', `Failed to process recording: ${(error as Error).message}`);
    } finally {
      isStoppingRef.current = false;
    }
  };

  const processAudioTranscription = async (audioUri: string) => {
    try {
      setIsProcessing(true);
      console.log('🔄 Processing audio transcription...');
      console.log('📁 Audio URI:', audioUri);
      
      if (!audioUri || audioUri.trim().length === 0) {
        throw new Error('Invalid audio URI - recording may have failed');
      }
      
      console.log('🚀 Sending transcription request to backend STT...');

      const transcribedText = await transcribeAudioViaBackend(audioUri);
      const text = transcribedText;
      console.log('🎯 Transcribed text:', JSON.stringify(text), '| length:', text.length);
      
      if (text && typeof text === 'string' && text.trim().length > 0) {
        const cleanedText = text.trim();
        console.log('✅ Valid transcribed text:', cleanedText);
        console.log('📏 Cleaned text length:', cleanedText.length);
        
        const noisePatterns = ['.', '...', '', ' '];
        
        if (noisePatterns.includes(cleanedText) || cleanedText.length < 1) {
          console.log('⚠️ Likely transcription error or noise:', cleanedText);
          Alert.alert('Speech Not Clear', 'I couldn\'t understand that. Please speak more clearly and hold the button while talking.');
          setCurrentStatus('Ready to listen');
          return;
        }
        
        const userMessage: Message = {
          role: 'user',
          content: cleanedText,
          timestamp: Date.now(),
        };
        
        console.log('💬 Adding user message:', userMessage);
        
        const updatedMessages = [...messagesRef.current, userMessage];
        updateMessages(updatedMessages);
        console.log('📝 Updated messages count:', updatedMessages.length);
        void getAIResponse(updatedMessages);
      } else {
        console.log('⚠️ Empty or invalid transcription received:', {
          text,
          typeOfText: typeof text,
          trimmed: text?.trim ? text.trim() : 'N/A',
          length: text?.trim ? text.trim().length : 0,
        });
        Alert.alert(
          'No Speech Detected', 
          'I couldn\'t detect any speech. Please:\n\n1. Hold the microphone button while speaking\n2. Speak clearly into your device\n3. Check microphone permissions\n4. Ensure your microphone is not blocked',
          [{ text: 'Try Again' }]
        );
      }
    } catch (error) {
      console.error('❌ Error processing transcription:', error);
      console.error('❌ Error type:', error?.constructor?.name);
      console.error('❌ Error message:', (error as Error)?.message);
      console.error('❌ Error stack:', (error as Error)?.stack);
      
      if ((error as Error).name === 'AbortError') {
        console.error('❌ Request timed out after 30 seconds');
        Alert.alert(
          'Timeout Error', 
          'Speech processing took too long. This could mean:\n\n1. Poor internet connection\n2. Audio file too large\n3. Service temporarily unavailable\n\nPlease try again with a shorter message.',
          [{ text: 'OK' }]
        );
      } else if ((error as Error).message?.includes('Network request failed') || 
                 (error as Error).message?.includes('Failed to fetch')) {
        console.error('❌ Network error - cannot reach STT service');
        Alert.alert(
          'Connection Error', 
          'Cannot reach the speech-to-text service. Please check your internet connection and try again.',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert(
          'Processing Error', 
          `Failed to process your voice: ${(error as Error).message}\n\nPlease try:\n1. Speaking more clearly\n2. Holding the button longer\n3. Checking your internet connection`,
          [{ text: 'OK' }]
        );
      }
    } finally {
      setIsProcessing(false);
      isStartingRef.current = false;
      if (!isPlaying) {
        setCurrentStatus('Ready to listen');
      }
    }
  };

  const processWebTranscription = async (blob: Blob) => {
    try {
      setIsProcessing(true);
      console.log('🔄 Processing web audio transcription...');
      console.log('📦 Blob size:', blob.size);

      const formData = new FormData();
      formData.append('audio', blob as any, 'recording.webm');

      console.log('🌐 Calling backend STT endpoint (web):', API_ENDPOINTS.stt);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      const transcriptionResponse = await fetch(API_ENDPOINTS.stt, {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      console.log('📡 Transcription response status:', transcriptionResponse.status);

      if (!transcriptionResponse.ok) {
        const errorText = await transcriptionResponse.text();
        console.error('❌ Transcription error response:', errorText.substring(0, 200));

        if (errorText.includes('<!DOCTYPE html>') || errorText.includes('<html>')) {
          throw new Error('Speech-to-text service is currently unavailable. The backend server may be down or restarting. Please try again in a moment.');
        }

        throw new Error(`Transcription failed: ${transcriptionResponse.status} - ${errorText.substring(0, 100)}`);
      }

      const data = await transcriptionResponse.json();
      const text: string | undefined = data?.text;
      console.log('🎯 Extracted text:', text);

      if (!text || text.trim().length === 0) {
        Alert.alert('No Speech Detected', 'Please try again and speak clearly.');
        setCurrentStatus('Ready to listen');
        return;
      }

      const userMessage: Message = { role: 'user', content: text.trim(), timestamp: Date.now() };
      const updated = [...messagesRef.current, userMessage];
      updateMessages(updated);
      void getAIResponse(updated);
    } catch (error) {
      console.error('❌ Web transcription error:', error);
      Alert.alert('Processing Error', (error as Error).message);
    } finally {
      setIsProcessing(false);
      if (!isPlaying) setCurrentStatus('Ready to listen');
    }
  };

  const getAIResponse = async (conversationMessages: Message[]) => {
    try {
      console.log('🤖 Getting AI response...');
      console.log('📝 Conversation messages:', conversationMessages.length);
      
      // Check credits before making AI request
      if (usageStats.credits <= 0) {
        Alert.alert(
          'No Credits',
          'You need credits to chat with the AI coach. You can purchase more credits in Settings.',
          [{ text: 'OK' }]
        );
        const noCreditsMessage: Message = {
          role: 'assistant',
          content: 'I\'m sorry, but you\'ve run out of credits. Please purchase more credits to continue our conversation.',
          timestamp: Date.now(),
        };
        updateMessages(prev => [...prev, noCreditsMessage]);
        setCurrentStatus('Ready to listen');
        return;
      }
      
      setCurrentStatus('Coach is thinking...');
      
      const userName = profile.name || 'friend';
      const coachName = profile.coachCharacter?.name || 'Coach Alex';
      const coachDescription = profile.coachCharacter?.description || 'Energetic and motivating, perfect for daily inspiration';
      const systemPrompt = `You are an AI motivation coach named "${coachName}". ${coachDescription}. You provide personalized, inspiring advice to help people overcome challenges and achieve their goals.

Key traits:
- Warm, encouraging, and empathetic
- Use the user's name when provided (${userName})
- Provide actionable, practical advice
- Keep responses conversational and natural (2-3 sentences max for faster responses)
- Focus on building confidence, resilience, and positive mindset
- Ask follow-up questions to better understand their situation
- Share motivational insights or techniques

IMPORTANT: Keep responses concise (2-3 sentences) for natural conversation flow. Always end with encouragement.`;

      console.log('📤 Calling chat via Rork backend...');
      
      const messages: { role: 'user' | 'assistant' | 'system'; content: string }[] = [
        { role: 'system' as const, content: systemPrompt },
        ...conversationMessages.slice(-10).map(msg => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
        }))
      ];

      const result = await sendChatMessage({ messages });
      const completion = result.message;

      if (!completion || typeof completion !== 'string') {
        throw new Error('Invalid response format from chat API');
      }
      
      // Deduct 1 credit for chat message
      const creditUsed = await iapContext.useCredit();
      if (creditUsed) {
        console.log('💳 1 credit used for AI Chat Message. Remaining:', iapContext.usageStats.credits - 1);
      } else {
        console.warn('⚠️ Failed to deduct credit for chat');
      }
      
      const assistantMessage: Message = {
        role: 'assistant',
        content: completion,
        timestamp: Date.now(),
      };
      
      console.log('✅ AI response received, starting TTS immediately...');
      updateMessages(prev => [...prev, assistantMessage]);
      
      if (profile.voiceEnabled !== false) {
        console.log('🔊 Starting TTS generation immediately (parallel)...');
        setCurrentStatus('Coach is speaking...');
        
        speakMessage(completion).catch(error => {
          console.error('❌ Failed to speak AI response:', error);
          setCurrentStatus('Ready to listen');
        });
      } else {
        console.log('🔇 Voice disabled, skipping speech');
        setCurrentStatus('Ready to listen');
      }
    } catch (error) {
      console.error('❌ Error getting AI response:', error);
      console.error('❌ Error type:', error?.constructor?.name);
      console.error('❌ Error details:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
      
      const fallbackMessage: Message = {
        role: 'assistant',
        content: 'I\'m having trouble connecting right now, but I\'m still here to help! Could you try saying that again?',
        timestamp: Date.now(),
      };
      
      updateMessages(prev => [...prev, fallbackMessage]);
      setCurrentStatus('Ready to listen');
      
      if (profile.voiceEnabled !== false) {
        speakMessage(fallbackMessage.content).catch(() => {
          console.log('Could not speak fallback message');
        });
      }
    }
  };

  const stopSpeaking = async () => {
    if (isPlaying) {
      try {
        if (Platform.OS !== 'web') {
          const Speech = await import('expo-speech') as any;
          await Speech.stop();
        } else {
          if (typeof window !== 'undefined' && 'speechSynthesis' in window && window.speechSynthesis) {
            console.log('🔇 Canceling Web Speech synthesis...');
            window.speechSynthesis.cancel();
          }
        }
        
        if (sound) {
          await sound.stopAsync();
          await sound.unloadAsync();
          setSound(null);
        }
        
        setIsPlaying(false);
        setCurrentStatus('Ready to listen');
      } catch (e) {
        console.log('⚠️ Error stopping speech:', e);
        setIsPlaying(false);
        setCurrentStatus('Ready to listen');
      }
    }
  };

  // Stop all TTS playback and recording immediately when navigating away from voice coach
  useFocusEffect(
    React.useCallback(() => {
      return () => {
        console.log('🧹 Voice coach lost focus — stopping TTS, recording, and resetting state');
        // Stop TTS playback
        if (sound) {
          sound.stopAsync().catch(() => {});
          sound.unloadAsync().catch(() => {});
          setSound(null);
        }
        setIsPlaying(false);
        setIsProcessing(false);
        setCurrentStatus('Ready to listen');

        // Stop any active recording
        if (recordingRef.current) {
          try {
            const rec = recordingRef.current;
            rec.getStatusAsync().then((status: any) => {
              if (status.canRecord || status.isRecording) {
                rec.stopAndUnloadAsync().catch(() => {});
              }
            }).catch(() => {});
          } catch {}
          recordingRef.current = null;
        }
        setIsRecording(false);
        isStartingRef.current = false;
        isStoppingRef.current = false;

        // Stop web recording
        if (Platform.OS === 'web') {
          if (webRecorderRef.current) {
            try { webRecorderRef.current.stop(); } catch {}
            webRecorderRef.current = null;
          }
          if (webStreamRef.current) {
            try {
              webStreamRef.current.getTracks().forEach((t: any) => t.stop());
            } catch {}
            webStreamRef.current = null;
          }
        }

        // Stop expo-speech if running
        if (Platform.OS !== 'web') {
          import('expo-speech').then((Speech: any) => {
            Speech.stop().catch(() => {});
          }).catch(() => {});
        } else if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
          window.speechSynthesis.cancel();
        }

        // Reset audio mode
        if (Platform.OS !== 'web') {
          Audio.setAudioModeAsync({
            allowsRecordingIOS: false,
            playsInSilentModeIOS: true,
            staysActiveInBackground: false,
            shouldDuckAndroid: true,
          }).catch(() => {});
        }
      };
    }, [sound])
  );

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
            <TouchableOpacity
              onPress={() => setShowVoiceModal(true)}
              style={styles.headerButton}
            >
              <Settings size={24} color={colors.text} />
            </TouchableOpacity>
          ),
        }} 
      />
      
      <View style={styles.content}>
        <View style={styles.avatarSection}>
          <Animated.View 
            style={[
              styles.avatar,
              { transform: [{ scale: avatarScale }] }
            ]}
          >
            {profile.coachCharacter?.imageUrl ? (
              <Image 
                source={{ uri: profile.coachCharacter.imageUrl }} 
                style={styles.avatarImage}
              />
            ) : (
              <User size={80} color={colors.primary} />
            )}
          </Animated.View>
          
          <View style={styles.coachInfo}>
            <Text style={[styles.coachName, { color: colors.text }]}>{profile.coachCharacter?.name || 'Coach Alex'}</Text>
            <TouchableOpacity 
              style={styles.changeCoachButton}
              onPress={() => router.push('/coach-character')}
            >
              <Sparkles size={14} color={colors.primary} />
              <Text style={[styles.changeCoachText, { color: colors.primary }]}>Change Coach</Text>
            </TouchableOpacity>
          </View>
          
          <Text style={[styles.coachTitle, { color: colors.textSecondary }]}>{profile.coachCharacter?.description || 'Your Personal Motivation Coach'}</Text>
          <Text style={[styles.voiceIndicator, { color: colors.primary }]}>
            Speaking as: {voiceCharacters.find(v => v.id === profile.preferredVoice)?.name || 'Alloy'}
          </Text>
        </View>

        <View style={styles.messageSection}>
          <Text style={[styles.statusMainText, { color: colors.primary }]}>
            {currentStatus}
          </Text>
          {isPlaying && (
            <TouchableOpacity 
              style={styles.stopButton}
              onPress={stopSpeaking}
            >
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
                (isProcessing || isPlaying) && styles.recordButtonDisabled,
              ]}
              onPressIn={startRecording}
              onPressOut={stopRecording}
              disabled={isProcessing || isPlaying}
              activeOpacity={0.8}
            >
              {isRecording ? (
                <MicOff size={40} color="white" />
              ) : (
                <Mic size={40} color="white" />
              )}
            </TouchableOpacity>
          </Animated.View>

          <View style={styles.statusIndicator}>
            {isRecording && (
              <View style={styles.recordingIndicator}>
                <View style={styles.recordingDot} />
                <Text style={styles.recordingText}>Listening...</Text>
              </View>
            )}
            {isProcessing && (
              <Text style={[styles.statusText, { color: colors.primary }]}>Processing...</Text>
            )}
            {isPlaying && (
              <Text style={[styles.statusText, { color: colors.primary }]}>Speaking...</Text>
            )}
          </View>
        </View>

        <View style={styles.instructionsSection}>
          <Text style={[styles.instructionsText, { color: colors.textSecondary }]}>
            {hasPermission 
              ? 'Hold the microphone button to speak with your coach'
              : 'Microphone permission required - tap the button to enable'}
          </Text>
          {!hasPermission && (
            <Text style={styles.warningText}>
              Grant microphone access to use voice features
            </Text>
          )}
          <TouchableOpacity 
            testID="voice-settings-button"
            style={styles.voiceSettingsButton}
            onPress={() => setShowVoiceModal(true)}
          >
            <Text style={[styles.voiceSettingsText, { color: colors.primary }]}>
              Voice: {voiceCharacters.find(v => v.id === profile.preferredVoice)?.name || 'Alloy'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <Modal
        visible={showVoiceModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowVoiceModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Choose Voice Character</Text>
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
                    console.log('🎤 Selecting voice:', voice.id);
                    await updateProfile({ preferredVoice: voice.id as any });
                    console.log('✅ Voice updated to:', voice.id);
                    Alert.alert('Voice Updated', `Voice changed to ${voice.name}`);
                    setShowVoiceModal(false);
                  }}
                >
                  <View style={styles.voiceInfo}>
                    <Text style={[
                      styles.voiceName,
                      { color: profile.preferredVoice === voice.id ? colors.primary : colors.text },
                    ]}>
                      {voice.name}
                    </Text>
                    <Text style={[styles.voiceDescription, { color: colors.textSecondary }]}>{voice.description}</Text>
                  </View>
                  {profile.preferredVoice === voice.id && (
                    <Check size={24} color={colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={[styles.modalCloseButton, { backgroundColor: colors.primary }]}
              onPress={() => setShowVoiceModal(false)}
            >
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

const createStyles = (colors: any) => StyleSheet.create({
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
    fontWeight: '600' as const,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600' as const,
  },
  instructionsSection: {
    paddingBottom: 20,
  },
  instructionsText: {
    fontSize: 14,
    textAlign: 'center' as const,
    lineHeight: 20,
  },
  warningText: {
    fontSize: 12,
    color: '#F59E0B',
    textAlign: 'center' as const,
    marginTop: 4,
  },
  voiceSettingsButton: {
    marginTop: 12,
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
  recordButtonContainer: {
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
