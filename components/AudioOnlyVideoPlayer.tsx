import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Animated,
  Dimensions,
  Linking,
  Platform,
} from 'react-native';
import Slider from '@react-native-community/slider';
import { Audio, AVPlaybackStatus } from 'expo-av';
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  RotateCcw,
  RotateCw,
  ExternalLink,
  Volume2,
} from 'lucide-react-native';

// Props
interface AudioOnlyVideoPlayerProps {
  videoId: string;
  title: string;
  thumbnail?: string;
  channelTitle?: string;
  autoplay?: boolean;
  onEnd?: () => void;
  onError?: (error: string) => void;
  onNext?: () => void;
  onPrevious?: () => void;
}

interface VideoMetadata {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  channelTitle: string;
  duration: number;
  viewCount: number;
  publishedAt: string;
}

// =========================
//     COMPONENT START
// =========================

export default function AudioOnlyVideoPlayer({
  videoId,
  title,
  thumbnail,
  channelTitle,
  autoplay = false,
  onError,
  onNext,
  onPrevious
}: AudioOnlyVideoPlayerProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [metadata, setMetadata] = useState<VideoMetadata | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isSeeking, setIsSeeking] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [canPlayDirectly, setCanPlayDirectly] = useState(false);
  
  const sound = useRef<Audio.Sound | null>(null);
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const setupAudio = async () => {
      try {
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: true,
          shouldDuckAndroid: true,
        });
      } catch (err) {
        console.error('Error setting audio mode:', err);
      }
    };
    setupAudio();
  }, []);

  useEffect(() => {
    return () => {
      if (sound.current) {
        console.log('🧹 Cleaning up audio');
        sound.current.unloadAsync();
      }
    };
  }, []);

  useEffect(() => {
    const fetchVideoMetadata = async () => {
      console.log(`🎵 Fetching metadata for audio: ${videoId}`);
      setIsLoading(true);
      setError(null);

      try {
        const apiKey = process.env.EXPO_PUBLIC_YOUTUBE_API_KEY;
        if (!apiKey) {
          throw new Error('YouTube API key not configured');
        }

        const detailsUrl = new URL('https://www.googleapis.com/youtube/v3/videos');
        detailsUrl.searchParams.set('part', 'snippet,contentDetails,statistics');
        detailsUrl.searchParams.set('id', videoId);
        detailsUrl.searchParams.set('key', apiKey);

        const response = await fetch(detailsUrl.toString());
        
        if (!response.ok) {
          throw new Error(`YouTube API error: ${response.status}`);
        }

        const data = await response.json();
        
        if (!data.items || data.items.length === 0) {
          throw new Error('Audio not found');
        }

        const video = data.items[0];
        
        const parseDuration = (duration: string): number => {
          const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
          if (!match) return 0;
          const hours = parseInt(match[1] || '0');
          const minutes = parseInt(match[2] || '0');
          const seconds = parseInt(match[3] || '0');
          return hours * 3600 + minutes * 60 + seconds;
        };

        const videoDuration = parseDuration(video.contentDetails.duration);
        setDuration(videoDuration);

        setMetadata({
          id: video.id,
          title: video.snippet.title,
          description: video.snippet.description || '',
          thumbnail: video.snippet.thumbnails.high?.url || video.snippet.thumbnails.default.url,
          channelTitle: video.snippet.channelTitle,
          duration: videoDuration,
          viewCount: parseInt(video.statistics.viewCount || '0'),
          publishedAt: video.snippet.publishedAt,
        });

        console.log(`✅ Audio metadata fetched:`, video.snippet.title);
        
        await loadAudio(videoId);
        
        setIsLoading(false);
      } catch (err: any) {
        console.error('❌ Error fetching audio metadata:', err);
        setError(err.message || 'Failed to fetch audio data');
        setIsLoading(false);
        onError?.(err.message || 'Failed to fetch audio data');
      }
    };

    if (videoId) {
      fetchVideoMetadata();
    }
  }, [videoId, onError]);

  const loadAudio = async (videoId: string) => {
    try {
      console.log('🎵 Attempting to load audio for video:', videoId);
      
      if (sound.current) {
        await sound.current.unloadAsync();
      }

      const backendUrl = process.env.EXPO_PUBLIC_RORK_API_BASE_URL;
      if (backendUrl) {
        try {
          const audioResponse = await fetch(`${backendUrl}/youtube/audio/${videoId}`);
          if (audioResponse.ok) {
            const audioData = await audioResponse.json();
            if (audioData.audioUrl) {
              console.log('✅ Got audio URL from backend:', audioData.audioUrl);
              setAudioUrl(audioData.audioUrl);
              
              const { sound: newSound } = await Audio.Sound.createAsync(
                { uri: audioData.audioUrl },
                { shouldPlay: autoplay, progressUpdateIntervalMillis: 500 },
                onPlaybackStatusUpdate
              );
              sound.current = newSound;
              setCanPlayDirectly(true);
              
              if (autoplay) {
                setIsPlaying(true);
              }
              return;
            }
          }
        } catch (backendError) {
          console.log('⚠️ Backend audio extraction not available:', backendError);
        }
      }
      
      console.log('⚠️ Direct audio playback not available for this video');
      setCanPlayDirectly(false);
    } catch (err) {
      console.error('❌ Error loading audio:', err);
      setCanPlayDirectly(false);
    }
  };

  const onPlaybackStatusUpdate = (status: AVPlaybackStatus) => {
    if (!status.isLoaded) {
      if (status.error) {
        console.error('Playback error:', status.error);
        setError(`Playback error: ${status.error}`);
      }
      return;
    }

    setIsPlaying(status.isPlaying);
    setCurrentTime(status.positionMillis / 1000);
    
    if (status.durationMillis) {
      setDuration(status.durationMillis / 1000);
    }

    if (status.didJustFinish) {
      console.log('🏁 Audio finished');
      setCurrentTime(0);
      setIsPlaying(false);
    }
  };

  useEffect(() => {
    if (isPlaying) {
      Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 10000,
          useNativeDriver: true,
        })
      ).start();
    } else {
      rotateAnim.stopAnimation();
    }
  }, [isPlaying, rotateAnim]);



  const formatDuration = (seconds: number): string => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) {
      return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handlePlayPause = async () => {
    if (!canPlayDirectly) {
      console.log('⚠️ Direct playback not available, opening YouTube');
      openInYouTube();
      return;
    }

    try {
      if (!sound.current) {
        console.log('⚠️ No audio loaded');
        return;
      }

      if (isPlaying) {
        console.log('⏸️ Pausing audio');
        await sound.current.pauseAsync();
      } else {
        console.log('▶️ Playing audio');
        await sound.current.playAsync();
      }
    } catch (err) {
      console.error('Error toggling playback:', err);
    }
  };

  const handleSkipForward = async () => {
    if (!canPlayDirectly || !sound.current) return;
    
    try {
      const newPosition = Math.min(currentTime + 15, duration);
      await sound.current.setPositionAsync(newPosition * 1000);
    } catch (err) {
      console.error('Error skipping forward:', err);
    }
  };

  const handleSkipBackward = async () => {
    if (!canPlayDirectly || !sound.current) return;
    
    try {
      const newPosition = Math.max(currentTime - 15, 0);
      await sound.current.setPositionAsync(newPosition * 1000);
    } catch (err) {
      console.error('Error skipping backward:', err);
    }
  };

  const handleSliderChange = async (value: number) => {
    if (!canPlayDirectly || !sound.current) return;
    
    try {
      await sound.current.setPositionAsync(value * 1000);
      setCurrentTime(value);
    } catch (err) {
      console.error('Error seeking:', err);
    }
  };

  const openInYouTube = () => {
    const url = `https://www.youtube.com/watch?v=${videoId}`;
    console.log('🔗 Opening in YouTube:', url);
    Linking.openURL(url);
  };

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.artworkContainer}>
          <ActivityIndicator size="large" color="#667eea" />
        </View>
        <Text style={styles.loadingText}>Loading audio...</Text>
      </View>
    );
  }

  if (error || !metadata) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Cannot load audio</Text>
          <Text style={styles.errorSub}>{error || 'Audio not found'}</Text>
          <TouchableOpacity style={styles.linkButton} onPress={openInYouTube}>
            <ExternalLink size={18} color="#667eea" />
            <Text style={styles.linkButtonText}>Open in YouTube</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.artworkContainer, { transform: [{ rotate: isPlaying ? spin : '0deg' }] }]}>
        <Image 
          source={{ uri: metadata.thumbnail || thumbnail }} 
          style={styles.artwork} 
        />
      </Animated.View>

      <View style={styles.infoSection}>
        <Text style={styles.title} numberOfLines={2}>{metadata.title}</Text>
        <Text style={styles.subtitle}>{metadata.channelTitle}</Text>
      </View>

      {!canPlayDirectly && (
        <View style={styles.warningBanner}>
          <Volume2 size={16} color="#f59e0b" />
          <Text style={styles.warningText}>Audio extraction not available. Tap play to open in YouTube.</Text>
        </View>
      )}

      <View style={styles.progressSection}>
        <Slider
          style={styles.slider}
          minimumValue={0}
          maximumValue={duration}
          value={currentTime}
          onValueChange={handleSliderChange}
          onSlidingStart={() => setIsSeeking(true)}
          onSlidingComplete={(value) => {
            setIsSeeking(false);
          }}
          minimumTrackTintColor="#667eea"
          maximumTrackTintColor="rgba(255,255,255,0.2)"
          thumbTintColor="#FFFFFF"
          disabled={!canPlayDirectly}
        />
        <View style={styles.timeRow}>
          <Text style={styles.timeText}>{formatDuration(currentTime)}</Text>
          <Text style={styles.timeText}>{formatDuration(duration)}</Text>
        </View>
      </View>

      <View style={styles.controls}>
        <TouchableOpacity onPress={onPrevious} style={styles.smallButton}>
          <SkipBack size={28} color="#FFFFFF" fill="#FFFFFF" />
        </TouchableOpacity>

        <TouchableOpacity onPress={handleSkipBackward} style={styles.smallButton}>
          <RotateCcw size={24} color="#FFFFFF" />
          <Text style={styles.skipText}>15</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={handlePlayPause} style={styles.playButton}>
          {isPlaying ? (
            <Pause size={36} color="#000000" fill="#000000" />
          ) : (
            <Play size={36} color="#000000" fill="#000000" />
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={handleSkipForward} style={styles.smallButton}>
          <RotateCw size={24} color="#FFFFFF" />
          <Text style={styles.skipText}>15</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={onNext} style={styles.smallButton}>
          <SkipForward size={28} color="#FFFFFF" fill="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.youtubeLink} onPress={openInYouTube}>
        <ExternalLink size={16} color="rgba(255,255,255,0.6)" />
        <Text style={styles.youtubeLinkText}>Listen on YouTube</Text>
      </TouchableOpacity>
    </View>
  );
}

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: 20,
  },

  artworkContainer: {
    width: width * 0.75,
    height: width * 0.75,
    maxWidth: 320,
    maxHeight: 320,
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 40,
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    backgroundColor: '#1C1C1E',
  },

  artwork: {
    width: '100%',
    height: '100%',
  },

  infoSection: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 32,
    paddingHorizontal: 10,
  },

  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 28,
  },

  subtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '500',
    textAlign: 'center',
  },

  progressSection: {
    width: '100%',
    marginBottom: 32,
  },

  slider: {
    width: '100%',
    height: 40,
  },

  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    marginTop: -8,
  },

  timeText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '500',
  },

  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    marginBottom: 24,
  },

  smallButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },

  playButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },

  skipText: {
    position: 'absolute',
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: '700',
    bottom: 12,
  },

  youtubeLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
  },

  youtubeLinkText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '500',
  },

  loadingText: {
    textAlign: 'center',
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    marginTop: 16,
  },

  errorContainer: {
    alignItems: 'center',
    padding: 20,
  },

  errorText: {
    fontSize: 18,
    color: '#ff6b6b',
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },

  errorSub: {
    textAlign: 'center',
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    marginBottom: 20,
  },

  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: 'rgba(102,126,234,0.4)',
    backgroundColor: 'rgba(102,126,234,0.1)',
  },

  linkButtonText: {
    color: '#667eea',
    fontWeight: '600',
    fontSize: 14,
  },

  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 24,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },

  warningText: {
    flex: 1,
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
    lineHeight: 18,
  },
});
