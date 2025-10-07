import React, { useState, useEffect, useRef, useCallback } from 'react';
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
import { Stack } from 'expo-router';
import { Mic, MicOff, User, Settings, Check } from 'lucide-react-native';
import { Audio } from 'expo-av';
import Colors from '@/constants/colors';
import { useUserProfile } from '@/hooks/user-profile-context';
import { trpc } from '@/lib/trpc';

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

export default function VoiceCoachScreen() {
  const { profile, updateProfile } = useUserProfile();
  const [, setMessages] = useState<Message[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [currentStatus, setCurrentStatus] = useState<string>('Initializing voice coach...');
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const hasGreetedRef = useRef(false);
  const isInitializedRef = useRef(false);
  
  // Animation values
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const avatarAnim = useRef(new Animated.Value(0)).current;
  
  // tRPC mutations
  const ttsMutation = trpc.tts.useMutation();
  const chatMutation = trpc.chat.useMutation();

  const speakMessage = useCallback(async (text: string) => {
    try {
      console.log('🔊 Speaking message:', text.substring(0, 50) + '...');
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
      
      console.log('📤 Calling TTS via tRPC backend...');
      
      try {
        const result = await ttsMutation.mutateAsync({
          text,
          voice: preferredVoice as any,
        });
        
        console.log('✅ TTS audio received from backend');
        
        const audioUri = `data:${result.audio.mimeType};base64,${result.audio.base64Data}`;
        
        const { sound: newSound } = await Audio.Sound.createAsync(
          { uri: audioUri },
          { shouldPlay: true },
          (status) => {
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
        
        if (ttsError?.message?.includes('API key')) {
          Alert.alert(
            'Voice Not Available',
            'Text-to-speech is currently unavailable. The OpenAI API key needs to be configured on the server. You can continue using the voice coach in text mode.',
            [{ text: 'OK' }]
          );
        }
        
        setIsPlaying(false);
        setCurrentStatus('Ready to listen (text mode)');
      }
    } catch (error) {
      console.error('❌ Error speaking message:', error);
      console.error('❌ Error type:', error?.constructor?.name);
      console.error('❌ Error details:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
      
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('API key') || errorMessage.includes('401')) {
        Alert.alert(
          'Voice Not Available',
          'Text-to-speech is currently unavailable. Please check the server configuration.',
          [{ text: 'OK' }]
        );
      }
      
      setIsPlaying(false);
      setCurrentStatus('Ready to listen (text mode)');
      console.log('Speech synthesis failed, continuing in text mode');
    }
  }, [profile.preferredVoice, sound, ttsMutation]);

  const handleInitialGreeting = useCallback(async () => {
    if (hasGreetedRef.current) {
      console.log('⚠️ Already greeted, skipping');
      return;
    }
    
    hasGreetedRef.current = true;
    
    const userName = profile.name || 'friend';
    const timeOfDay = new Date().getHours();
    let greeting = 'Hello';
    if (timeOfDay < 12) greeting = 'Good morning';
    else if (timeOfDay < 17) greeting = 'Good afternoon';
    else greeting = 'Good evening';
    
    const greetingMessage: Message = {
      role: 'assistant',
      content: `${greeting}, ${userName}! I'm Coach Alex, your personal motivation coach. I'm here to help you overcome challenges, build confidence, and achieve your goals. What's on your mind today?`,
      timestamp: Date.now(),
    };
    
    console.log('👋 Setting initial greeting message for:', userName);
    setMessages([greetingMessage]);
    setCurrentStatus('Coach is greeting you...');
    
    console.log('🔊 Speaking initial greeting...');
    console.log('🔊 Voice enabled:', profile.voiceEnabled !== false);
    console.log('🔊 Selected voice:', profile.preferredVoice || 'alloy');
    
    await new Promise(resolve => setTimeout(resolve, 500));
    
    try {
      console.log('🎯 About to speak greeting message...');
      await speakMessage(greetingMessage.content);
      console.log('✅ Initial greeting spoken successfully');
    } catch (error) {
      console.error('❌ Failed to speak greeting:', error);
      setCurrentStatus('Ready to listen');
    }
  }, [profile.name, profile.voiceEnabled, profile.preferredVoice, speakMessage]);

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
        
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
          shouldDuckAndroid: true,
        });
        console.log('✅ Audio mode initialized');
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        if (isMounted && !hasGreetedRef.current) {
          console.log('🎯 Triggering initial greeting, profile name:', profile.name);
          await handleInitialGreeting();
        } else {
          setCurrentStatus('Ready to listen');
        }
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
          if (recording) {
            const status = await recording.getStatusAsync();
            if (status.canRecord || status.isRecording) {
              await recording.stopAndUnloadAsync();
            }
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
  }, [handleInitialGreeting, profile.name, recording, sound]);

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
      
      // Stop any playing audio FIRST before starting to record
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
        // Add delay after stopping audio
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      
      // Prevent multiple recordings
      if (isRecording || isProcessing) {
        console.log('⚠️ Cannot start recording - already busy');
        return;
      }
      
      // Ensure any existing recording is completely cleaned up first
      if (recording) {
        try {
          console.log('🧹 Cleaning up existing recording...');
          const status = await recording.getStatusAsync();
          if (status.canRecord || status.isRecording) {
            await recording.stopAndUnloadAsync();
          }
          console.log('✅ Existing recording cleaned up');
        } catch (e) {
          console.log('⚠️ Error cleaning up existing recording:', e);
        }
        setRecording(null);
        
        // Wait longer to ensure cleanup is complete
        await new Promise(resolve => setTimeout(resolve, 300));
      }
      
      // Request permissions
      console.log('🔐 Requesting microphone permissions...');
      const { status, canAskAgain, granted } = await Audio.requestPermissionsAsync();
      console.log('🔐 Permission status:', { status, canAskAgain, granted });
      
      if (status !== 'granted') {
        console.error('❌ Microphone permission denied');
        Alert.alert(
          'Microphone Permission Required', 
          'Please grant microphone permission in your device settings to use voice chat.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => {
              if (Platform.OS === 'ios') {
                // iOS settings
                console.log('Opening iOS settings...');
              } else if (Platform.OS === 'android') {
                // Android settings
                console.log('Opening Android settings...');
              }
            }}
          ]
        );
        return;
      }
      
      console.log('✅ Microphone permission granted');

      // Reset audio mode first, then set for recording
      console.log('🔧 Setting up audio mode...');
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
      });
      
      // Small delay before enabling recording
      await new Promise(resolve => setTimeout(resolve, 100));
      
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      // Create new recording instance
      console.log('🆕 Creating new recording instance...');
      const recordingInstance = new Audio.Recording();
      
      console.log('🔧 Preparing recording...');
      
      // Recording configuration optimized for speech-to-text
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
      await recordingInstance.startAsync();
      
      // Verify recording is actually running
      const recordingStatus = await recordingInstance.getStatusAsync();
      console.log('📊 Recording status after start:', recordingStatus);
      
      if (!recordingStatus.isRecording) {
        console.error('❌ Recording failed to start properly');
        throw new Error('Recording did not start. Please check microphone permissions.');
      }
      
      setRecording(recordingInstance);
      setIsRecording(true);
      setCurrentStatus('Listening... Speak now!');
      
      console.log('✅ Recording started successfully and verified');
    } catch (error) {
      console.error('❌ Error starting recording:', error);
      
      // Clean up on error
      setRecording(null);
      setIsRecording(false);
      
      // Reset audio mode on error
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
      
      Alert.alert('Recording Error', `Failed to start recording: ${(error as Error).message}`);
    }
  };

  const stopRecording = async () => {
    try {
      console.log('🛑 Stopping recording...');
      
      if (!recording) {
        console.log('⚠️ No recording instance found');
        setIsRecording(false);
        return;
      }
      
      setIsRecording(false);
      setCurrentStatus('Processing...');
      
      let uri: string | null = null;
      let status: any = null;
      let recordingToProcess = recording;
      
      try {
        // Wait a bit for the recording to finalize
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Get recording status first
        status = await recordingToProcess.getStatusAsync();
        console.log('📊 Recording status:', JSON.stringify(status, null, 2));
        console.log('📊 Duration:', status.durationMillis, 'ms');
        console.log('📊 Is recording:', status.isRecording);
        console.log('📊 Can record:', status.canRecord);
        
        // Get URI before stopping (more reliable)
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
        // Try to get URI even if stop failed
        try {
          uri = recordingToProcess.getURI();
          console.log('📁 Got URI despite stop error:', uri);
        } catch (uriError) {
          console.error('❌ Could not get URI:', uriError);
        }
      } finally {
        setRecording(null);
      }
      
      // Reset audio mode
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
      
      // Check if we have a valid recording
      if (uri) {
        console.log('🎵 Processing recording with URI:', uri);
        // Check recording duration
        if (status && status.durationMillis !== undefined) {
          console.log(`⏱️ Recording duration: ${status.durationMillis}ms (${(status.durationMillis / 1000).toFixed(2)}s)`);
          if (status.durationMillis < 300) {
            console.log('⚠️ Recording too short, likely no speech');
            Alert.alert(
              'Recording Too Short', 
              `Recording was only ${(status.durationMillis / 1000).toFixed(2)} seconds. Please hold the button longer while speaking clearly.`
            );
            setCurrentStatus('Ready to listen');
            return;
          }
        } else {
          console.log('⚠️ No duration information available, proceeding anyway');
        }
        // Process the recording
        await processAudioTranscription(uri);
      } else {
        console.log('❌ No recording URI available');
        Alert.alert('Recording Error', 'No audio was recorded. Please hold the button while speaking.');
        setCurrentStatus('Ready to listen');
      }
    } catch (error) {
      console.error('❌ Error stopping recording:', error);
      setRecording(null);
      setIsRecording(false);
      Alert.alert('Recording Error', `Failed to process recording: ${(error as Error).message}`);
    }
  };

  const processAudioTranscription = async (audioUri: string) => {
    try {
      setIsProcessing(true);
      console.log('🔄 Processing audio transcription...');
      console.log('📁 Audio URI:', audioUri);
      
      // Create FormData for speech-to-text
      const formData = new FormData();
      const uriParts = audioUri.split('.');
      const fileType = uriParts[uriParts.length - 1];
      
      console.log('📄 File type detected:', fileType);
      
      // Properly format the audio file for FormData
      const mimeType = fileType === 'wav' ? 'audio/wav' : 
                       fileType === 'm4a' ? 'audio/mp4' : 
                       fileType === 'webm' ? 'audio/webm' : 
                       `audio/${fileType}`;
      
      const audioFile = {
        uri: audioUri,
        name: `recording.${fileType}`,
        type: mimeType,
      } as any;
      
      console.log('📦 Audio file object:', audioFile);
      formData.append('audio', audioFile);
      
      console.log('🚀 Sending transcription request...');
      
      // Transcribe audio with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
      
      console.log('📤 Sending FormData with audio file:', {
        uri: audioUri,
        name: audioFile.name,
        type: audioFile.type,
      });
      
      console.log('🌐 Calling STT API: https://toolkit.rork.com/stt/transcribe/');
      
      const transcriptionResponse = await fetch('https://toolkit.rork.com/stt/transcribe/', {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      console.log('📡 Transcription response status:', transcriptionResponse.status);
      console.log('📡 Response headers:', JSON.stringify(Object.fromEntries(transcriptionResponse.headers.entries())));
      
      if (!transcriptionResponse.ok) {
        const errorText = await transcriptionResponse.text();
        console.error('❌ Transcription error response:', errorText);
        throw new Error(`Transcription failed: ${transcriptionResponse.status} - ${errorText}`);
      }
      
      // Get response as text first to debug
      const responseText = await transcriptionResponse.text();
      console.log('📥 Raw response text (first 200 chars):', responseText.substring(0, 200));
      console.log('📥 Response content-type:', transcriptionResponse.headers.get('content-type'));
      
      let transcriptionData;
      try {
        transcriptionData = JSON.parse(responseText);
      } catch (parseError) {
        console.error('❌ Failed to parse JSON response:', parseError);
        console.error('❌ Response was (first 500 chars):', responseText.substring(0, 500));
        
        // Check if response looks like an error message
        if (responseText.toLowerCase().includes('error') || 
            responseText.toLowerCase().includes('invalid') ||
            responseText.toLowerCase().includes('failed')) {
          throw new Error(`Transcription service error: ${responseText.substring(0, 200)}`);
        }
        
        // If it's not JSON and not an obvious error, it might be the transcription itself
        // Some APIs return plain text instead of JSON
        if (responseText.trim().length > 0 && !responseText.startsWith('{') && !responseText.startsWith('[')) {
          console.log('⚠️ Response appears to be plain text, treating as transcription');
          transcriptionData = { text: responseText.trim() };
        } else {
          throw new Error(`Invalid JSON response from transcription service. Response: ${responseText.substring(0, 100)}`);
        }
      }
      
      console.log('📥 Transcription response data:', transcriptionData);
      
      // Handle different response formats
      const text = transcriptionData.text || transcriptionData.transcription || transcriptionData.result;
      console.log('🎯 Extracted text:', JSON.stringify(text));
      
      if (text && typeof text === 'string' && text.trim().length > 0) {
        console.log('✅ Valid transcribed text:', text);
        console.log('📏 Text length:', text.trim().length);
        
        // Filter out common transcription errors and noise
        const cleanedText = text.trim();
        // Very lenient noise filtering - only filter empty or single character responses
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
        
        // Update messages state and get the updated conversation
        setMessages(prev => {
          const updatedMessages = [...prev, userMessage];
          console.log('📝 Updated messages count:', updatedMessages.length);
          // Call AI response with the updated messages
          getAIResponse(updatedMessages);
          return updatedMessages;
        });
      } else {
        console.log('⚠️ Empty or invalid transcription received:', { 
          text, 
          typeOfText: typeof text,
          trimmed: text?.trim ? text.trim() : 'N/A', 
          length: text?.trim ? text.trim().length : 0,
          fullResponse: transcriptionData 
        });
        Alert.alert(
          'No Speech Detected', 
          'I couldn\'t detect any speech. Please:\n\n1. Hold the microphone button while speaking\n2. Speak clearly into your device\n3. Check microphone permissions\n4. Ensure your microphone is not blocked',
          [{ text: 'Try Again' }]
        );
      }
    } catch (error) {
      console.error('❌ Error processing transcription:', error);
      if ((error as Error).name === 'AbortError') {
        Alert.alert('Timeout Error', 'Speech processing took too long. Please try again.');
      } else {
        Alert.alert('Processing Error', `Failed to process your voice: ${(error as Error).message}`);
      }
    } finally {
      setIsProcessing(false);
      if (!isPlaying) {
        setCurrentStatus('Ready to listen');
      }
    }
  };

  const getAIResponse = async (conversationMessages: Message[]) => {
    try {
      console.log('🤖 Getting AI response...');
      console.log('📝 Conversation messages:', conversationMessages.length);
      
      const userName = profile.name || 'friend';
      const systemPrompt = `You are an AI motivation coach named "Coach Alex". You provide personalized, inspiring advice to help people overcome challenges and achieve their goals.

Key traits:
- Warm, encouraging, and empathetic
- Use the user's name when provided (${userName})
- Provide actionable, practical advice
- Keep responses conversational and under 200 words
- Focus on building confidence, resilience, and positive mindset
- Ask follow-up questions to better understand their situation
- Share brief motivational insights or techniques

Always end with encouragement and offer to continue the conversation.`;

      console.log('📤 Calling chat via tRPC backend...');
      
      const messages: { role: 'user' | 'assistant' | 'system'; content: string }[] = [
        { role: 'system' as const, content: systemPrompt },
        ...conversationMessages.slice(-10).map(msg => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
        }))
      ];

      const result = await chatMutation.mutateAsync({ messages });
      const completion = result.message;

      if (!completion || typeof completion !== 'string') {
        throw new Error('Invalid response format from chat API');
      }
      
      const assistantMessage: Message = {
        role: 'assistant',
        content: completion,
        timestamp: Date.now(),
      };
      
      console.log('✅ Adding assistant message:', assistantMessage.content);
      setMessages(prev => [...prev, assistantMessage]);
      
      // Always try to speak the response (voice is enabled by default)
      if (profile.voiceEnabled !== false) {
        console.log('🔊 Speaking AI response...');
        setCurrentStatus('Coach is speaking...');
        try {
          await speakMessage(completion);
          console.log('✅ AI response spoken successfully');
        } catch (error) {
          console.error('❌ Failed to speak AI response:', error);
          setCurrentStatus('Ready to listen');
        }
      } else {
        console.log('🔇 Voice disabled, skipping speech');
        setCurrentStatus('Ready to listen');
      }
    } catch (error) {
      console.error('❌ Error getting AI response:', error);
      console.error('❌ Error type:', error?.constructor?.name);
      console.error('❌ Error details:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
      
      // Provide a fallback response
      const fallbackMessage: Message = {
        role: 'assistant',
        content: 'I\'m having trouble connecting right now, but I\'m still here to help! Could you try saying that again?',
        timestamp: Date.now(),
      };
      
      setMessages(prev => [...prev, fallbackMessage]);
      setCurrentStatus('Ready to listen');
      
      // Try to speak the fallback
      if (profile.voiceEnabled !== false) {
        try {
          await speakMessage(fallbackMessage.content);
        } catch {
          console.log('Could not speak fallback message');
        }
      }
    }
  };

  const stopSpeaking = async () => {
    if (isPlaying) {
      try {
        if (Platform.OS !== 'web') {
          // Stop native speech
          const Speech = await import('expo-speech');
          await Speech.stop();
        } else {
          // Stop Web Speech API if available
          if (typeof window !== 'undefined' && 'speechSynthesis' in window && window.speechSynthesis) {
            console.log('🔇 Canceling Web Speech synthesis...');
            window.speechSynthesis.cancel();
          }
        }
        
        // Stop Expo Audio if sound exists
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



  const avatarScale = avatarAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.1],
  });

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen 
        options={{ 
          title: 'Voice Coach',
          headerStyle: { backgroundColor: Colors.background },
          headerTintColor: Colors.text,
          headerRight: () => (
            <TouchableOpacity
              onPress={() => setShowVoiceModal(true)}
              style={styles.headerButton}
            >
              <Settings size={24} color={Colors.text} />
            </TouchableOpacity>
          ),
        }} 
      />
      
      <View style={styles.content}>
        {/* Avatar Section */}
        <View style={styles.avatarSection}>
          <Animated.View 
            style={[
              styles.avatar,
              { transform: [{ scale: avatarScale }] }
            ]}
          >
            <User size={80} color={Colors.primary} />
          </Animated.View>
          
          <Text style={styles.coachName}>Coach Alex</Text>
          <Text style={styles.coachTitle}>Your Personal Motivation Coach</Text>
          <Text style={styles.voiceIndicator}>
            Speaking as: {voiceCharacters.find(v => v.id === profile.preferredVoice)?.name || 'Alloy'}
          </Text>
        </View>

        {/* Status Display Only - No conversation text */}
        <View style={styles.messageSection}>
          <Text style={styles.statusMainText}>
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

        {/* Controls */}
        <View style={styles.controlsSection}>
          {/* Main Record Button */}
          <Animated.View style={[styles.recordButtonContainer, { transform: [{ scale: pulseAnim }] }]}>
            <TouchableOpacity
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

          {/* Status Indicator */}
          <View style={styles.statusIndicator}>
            {isRecording && (
              <View style={styles.recordingIndicator}>
                <View style={styles.recordingDot} />
                <Text style={styles.recordingText}>Listening...</Text>
              </View>
            )}
            {isProcessing && (
              <Text style={styles.statusText}>Processing...</Text>
            )}
            {isPlaying && (
              <Text style={styles.statusText}>Speaking...</Text>
            )}
          </View>
        </View>

        {/* Instructions */}
        <View style={styles.instructionsSection}>
          <Text style={styles.instructionsText}>
            Hold the microphone button to speak with your coach
          </Text>
          <TouchableOpacity 
            style={styles.voiceSettingsButton}
            onPress={() => setShowVoiceModal(true)}
          >
            <Text style={styles.voiceSettingsText}>
              Voice: {voiceCharacters.find(v => v.id === profile.preferredVoice)?.name || 'Alloy'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Voice Selection Modal */}
      <Modal
        visible={showVoiceModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowVoiceModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Choose Voice Character</Text>
            <ScrollView style={styles.voiceList}>
              {voiceCharacters.map((voice) => (
                <TouchableOpacity
                  key={voice.id}
                  style={[
                    styles.voiceOption,
                    profile.preferredVoice === voice.id && styles.voiceOptionSelected,
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
                      profile.preferredVoice === voice.id && styles.voiceNameSelected,
                    ]}>
                      {voice.name}
                    </Text>
                    <Text style={styles.voiceDescription}>{voice.description}</Text>
                  </View>
                  {profile.preferredVoice === voice.id && (
                    <Check size={24} color={Colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={styles.modalCloseButton}
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
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
    backgroundColor: 'rgba(139, 69, 19, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 3,
    borderColor: Colors.primary,
  },
  coachName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 4,
  },
  coachTitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  voiceIndicator: {
    fontSize: 12,
    color: Colors.primary,
    textAlign: 'center',
    marginTop: 4,
    fontStyle: 'italic',
  },
  messageSection: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  statusMainText: {
    fontSize: 20,
    color: Colors.primary,
    textAlign: 'center',
    lineHeight: 28,
    fontWeight: '600',
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
    fontWeight: '600',
  },
  controlsSection: {
    alignItems: 'center',
    paddingVertical: 40,
  },

  recordButton: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: Colors.primary,
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
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
    fontWeight: '600',
  },
  statusText: {
    color: Colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  instructionsSection: {
    paddingBottom: 20,
  },
  instructionsText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  warningText: {
    fontSize: 12,
    color: '#F59E0B',
    textAlign: 'center',
    marginTop: 4,
  },
  voiceSettingsButton: {
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(139, 69, 19, 0.1)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.primary + '40',
    alignSelf: 'center',
  },
  voiceSettingsText: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '500',
  },
  lastMessageContainer: {
    padding: 16,
    backgroundColor: Colors.cardBackground,
    borderRadius: 16,
    marginBottom: 20,
  },
  lastMessageText: {
    fontSize: 16,
    color: Colors.text,
    lineHeight: 24,
  },
  lastMessageTime: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 8,
  },
  messagesScroll: {
    flex: 1,
    maxHeight: 300,
  },
  messageBubble: {
    padding: 12,
    borderRadius: 16,
    marginBottom: 12,
    maxWidth: '85%',
  },
  assistantBubble: {
    backgroundColor: Colors.cardBackground,
    alignSelf: 'flex-start',
    marginRight: 40,
  },
  userBubble: {
    backgroundColor: Colors.primary + '20',
    alignSelf: 'flex-end',
    marginLeft: 40,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
  },
  assistantText: {
    color: Colors.text,
  },
  userText: {
    color: Colors.text,
  },
  messageTime: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  recordButtonContainer: {
    // Container for animated record button
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 24,
    paddingBottom: 40,
    maxHeight: '70%',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  voiceList: {
    paddingHorizontal: 20,
  },
  voiceOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: Colors.background,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  voiceOptionSelected: {
    borderColor: Colors.primary,
    backgroundColor: 'rgba(139, 69, 19, 0.1)',
  },
  voiceInfo: {
    flex: 1,
  },
  voiceName: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  voiceNameSelected: {
    color: Colors.primary,
  },
  voiceDescription: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  modalCloseButton: {
    marginTop: 24,
    marginHorizontal: 20,
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalCloseText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  headerButton: {
    marginRight: 16,
  },
});