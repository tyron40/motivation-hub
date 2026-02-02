import React, { useState, useEffect, useRef, useCallback } from 'react';
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
} from 'react-native';
import Slider from '@react-native-community/slider';
import YoutubePlayer from 'react-native-youtube-iframe';
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  RotateCcw,
  RotateCw,
} from 'lucide-react-native';

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
  const [playerReady, setPlayerReady] = useState(false);
  const [playerError, setPlayerError] = useState(false);
  
  const playerRef = useRef<any>(null);
  const progressInterval = useRef<any>(null);
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    return () => {
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
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

  const startProgressTracking = useCallback(() => {
    if (progressInterval.current) {
      clearInterval(progressInterval.current);
    }
    
    progressInterval.current = setInterval(async () => {
      if (playerRef.current && !isSeeking && playerReady) {
        try {
          const time = await playerRef.current.getCurrentTime();
          setCurrentTime(time);
        } catch (err) {
          console.error('Error getting current time:', err);
        }
      }
    }, 500);
  }, [isSeeking, playerReady]);

  const stopProgressTracking = useCallback(() => {
    if (progressInterval.current) {
      clearInterval(progressInterval.current);
      progressInterval.current = null;
    }
  }, []);

  const onPlayerReady = useCallback(() => {
    console.log('✅ YouTube player ready');
    setPlayerReady(true);
    setPlayerError(false);
    setError(null);
    
    if (playerRef.current) {
      playerRef.current.getDuration().then((dur: number) => {
        console.log('📊 Video duration:', dur);
        if (dur > 0) {
          setDuration(dur);
        }
      }).catch((err: any) => {
        console.error('Error getting duration:', err);
      });
    }
  }, []);

  const onPlayerError = useCallback((errorMsg: string) => {
    console.error('❌ YouTube player error:', errorMsg);
    setPlayerError(true);
    setPlayerReady(false);
  }, []);

  const onStateChange = useCallback((state: string) => {
    console.log('🎬 Player state:', state);
    
    if (state === 'playing') {
      setIsPlaying(true);
      startProgressTracking();
    } else if (state === 'paused') {
      setIsPlaying(false);
      stopProgressTracking();
    } else if (state === 'ended') {
      setIsPlaying(false);
      stopProgressTracking();
      setCurrentTime(0);
      console.log('🏁 Video ended');
    }
  }, [startProgressTracking, stopProgressTracking]);

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

  const openInYouTube = useCallback(() => {
    const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`;
    console.log('🔗 Opening in YouTube app:', youtubeUrl);
    Linking.openURL(youtubeUrl).catch((err) => {
      console.error('Error opening YouTube:', err);
    });
  }, [videoId]);

  const handlePlayPause = async () => {
    if (playerError) {
      console.log('⚠️ Player error, opening in YouTube app');
      openInYouTube();
      return;
    }

    if (!playerReady || !playerRef.current) {
      console.log('⚠️ Player not ready yet');
      return;
    }

    try {
      if (isPlaying) {
        console.log('⏸️ Pausing video');
        await playerRef.current.pauseVideo();
      } else {
        console.log('▶️ Playing video');
        await playerRef.current.playVideo();
      }
    } catch (err) {
      console.error('Error toggling playback:', err);
    }
  };

  const handleSkipForward = async () => {
    if (!playerReady || !playerRef.current) return;
    
    try {
      const newPosition = Math.min(currentTime + 15, duration);
      await playerRef.current.seekTo(newPosition, true);
      setCurrentTime(newPosition);
    } catch (err) {
      console.error('Error skipping forward:', err);
    }
  };

  const handleSkipBackward = async () => {
    if (!playerReady || !playerRef.current) return;
    
    try {
      const newPosition = Math.max(currentTime - 15, 0);
      await playerRef.current.seekTo(newPosition, true);
      setCurrentTime(newPosition);
    } catch (err) {
      console.error('Error skipping backward:', err);
    }
  };

  const handleSliderChange = async (value: number) => {
    if (!playerReady || !playerRef.current) return;
    setCurrentTime(value);
  };

  const handleSliderComplete = async (value: number) => {
    if (!playerReady || !playerRef.current) return;
    
    try {
      await playerRef.current.seekTo(value, true);
      setIsSeeking(false);
    } catch (err) {
      console.error('Error seeking:', err);
      setIsSeeking(false);
    }
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
          <TouchableOpacity onPress={openInYouTube} style={styles.openButton}>
            <Text style={styles.openButtonText}>Open in YouTube</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.artworkContainer}>
        <View style={styles.ytWrapper}>
          <YoutubePlayer
            ref={playerRef}
            videoId={videoId}
            height={width * 0.75}
            width={width * 0.75}
            play={false}
            onReady={onPlayerReady}
            onError={onPlayerError}
            onChangeState={onStateChange}
            webViewStyle={{ opacity: 0.01 }}
            initialPlayerParams={{
              controls: false,
              modestbranding: true,
              rel: false,
              playsinline: true,
              preventFullScreen: true,
            }}
          />
        </View>

        <Animated.View style={[styles.thumbnailOverlay, { transform: [{ rotate: isPlaying ? spin : '0deg' }] }]}>
          <Image 
            source={{ uri: metadata.thumbnail || thumbnail }} 
            style={styles.artwork} 
          />
        </Animated.View>

        {!isPlaying && (
          <View style={styles.playOverlayIcon}>
            <Play size={60} color="#FFFFFF" fill="rgba(0,0,0,0.6)" />
          </View>
        )}
      </View>

      <View style={styles.infoSection}>
        <Text style={styles.title} numberOfLines={2}>{metadata.title}</Text>
        <Text style={styles.subtitle}>{metadata.channelTitle}</Text>
      </View>

      <View style={styles.progressSection}>
        <Slider
          style={styles.slider}
          minimumValue={0}
          maximumValue={duration}
          value={currentTime}
          onValueChange={handleSliderChange}
          onSlidingStart={() => setIsSeeking(true)}
          onSlidingComplete={handleSliderComplete}
          minimumTrackTintColor="#667eea"
          maximumTrackTintColor="rgba(255,255,255,0.2)"
          thumbTintColor="#FFFFFF"
          disabled={!playerReady}
        />
        <View style={styles.timeRow}>
          <Text style={styles.timeText}>{formatDuration(currentTime)}</Text>
          <Text style={styles.timeText}>{formatDuration(duration)}</Text>
        </View>
      </View>

      <View style={styles.controls}>
        <TouchableOpacity onPress={onPrevious} style={styles.smallButton} disabled={!onPrevious}>
          <SkipBack size={28} color="#FFFFFF" fill="#FFFFFF" />
        </TouchableOpacity>

        <TouchableOpacity onPress={handleSkipBackward} style={styles.smallButton} disabled={!playerReady}>
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

        <TouchableOpacity onPress={handleSkipForward} style={styles.smallButton} disabled={!playerReady}>
          <RotateCw size={24} color="#FFFFFF" />
          <Text style={styles.skipText}>15</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={onNext} style={styles.smallButton} disabled={!onNext}>
          <SkipForward size={28} color="#FFFFFF" fill="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {playerError && (
        <TouchableOpacity onPress={openInYouTube} style={styles.fallbackButton}>
          <Text style={styles.fallbackText}>Player error - Tap to open in YouTube</Text>
        </TouchableOpacity>
      )}
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
    position: 'relative',
  },

  ytWrapper: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.01,
  },

  thumbnailOverlay: {
    ...StyleSheet.absoluteFillObject,
  },

  playOverlayIcon: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
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
    fontWeight: '700' as const,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 28,
  },

  subtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '500' as const,
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
    fontWeight: '500' as const,
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
    fontWeight: '700' as const,
    bottom: 12,
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
    fontWeight: '700' as const,
    textAlign: 'center',
    marginBottom: 8,
  },

  errorSub: {
    textAlign: 'center',
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    marginBottom: 16,
  },

  openButton: {
    backgroundColor: '#FF0000',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },

  openButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600' as const,
  },

  fallbackButton: {
    marginTop: 16,
    padding: 12,
    backgroundColor: 'rgba(255, 107, 107, 0.2)',
    borderRadius: 8,
  },

  fallbackText: {
    color: '#ff6b6b',
    fontSize: 13,
    textAlign: 'center',
  },
});
