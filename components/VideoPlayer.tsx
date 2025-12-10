import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import { Play, Pause, RefreshCw, AlertCircle } from 'lucide-react-native';

interface VideoPlayerProps {
  videoId: string;
  title: string;
  audioOnly?: boolean;
  autoplay?: boolean;
  onProgress?: (progress: number) => void;
  onDuration?: (duration: number) => void;
  onReady?: () => void;
  onError?: (error: string) => void;
}

export default function VideoPlayer({
  videoId,
  title,
  audioOnly = false,
  autoplay = false,
  onProgress,
  onDuration,
  onReady,
  onError
}: VideoPlayerProps) {
  const videoRef = useRef<Video>(null);
  const [isPlaying, setIsPlaying] = useState(autoplay);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  const loadVideo = React.useCallback(async () => {
    try {
      console.log(`🎬 Loading video: ${videoId}`);
      setIsLoading(true);
      setError(null);
      
      const youtubeUrl = `https://www.youtube.com/embed/${videoId}?autoplay=${autoplay ? 1 : 0}`;
      setVideoUrl(youtubeUrl);
      
      console.log(`✅ Video URL prepared: ${youtubeUrl}`);
      onReady?.();
    } catch (err) {
      console.error('❌ Error loading video:', err);
      const errorMsg = err instanceof Error ? err.message : 'Failed to load video';
      setError(errorMsg);
      onError?.(errorMsg);
    } finally {
      setIsLoading(false);
    }
  }, [videoId, autoplay, onReady, onError]);

  useEffect(() => {
    loadVideo();
  }, [loadVideo]);

  const handlePlaybackStatusUpdate = (status: AVPlaybackStatus) => {
    if (status.isLoaded) {
      if (status.durationMillis && onDuration) {
        onDuration(status.durationMillis / 1000);
      }
      if (status.positionMillis && onProgress) {
        onProgress(status.positionMillis / 1000);
      }
      setIsPlaying(status.isPlaying);
    }
  };

  const togglePlayPause = async () => {
    if (!videoRef.current) return;
    
    try {
      if (isPlaying) {
        await videoRef.current.pauseAsync();
      } else {
        await videoRef.current.playAsync();
      }
    } catch (err) {
      console.error('❌ Error toggling playback:', err);
    }
  };

  const handleRetry = () => {
    setError(null);
    loadVideo();
  };

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <AlertCircle color="#ff6b6b" size={48} />
        <Text style={styles.errorTitle}>Unable to load video</Text>
        <Text style={styles.errorText}>{title}</Text>
        <Text style={styles.errorSubtext}>{error}</Text>
        <TouchableOpacity onPress={handleRetry} style={styles.retryButton}>
          <RefreshCw color="white" size={20} />
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
        <Text style={styles.helpText}>Video ID: {videoId}</Text>
      </View>
    );
  }

  if (isLoading || !videoUrl) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#667eea" />
        <Text style={styles.loadingText}>Loading video...</Text>
        <Text style={styles.loadingSubtext}>{title}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Video
        ref={videoRef}
        style={styles.video}
        source={{ uri: videoUrl }}
        useNativeControls
        resizeMode={ResizeMode.CONTAIN}
        isLooping={false}
        shouldPlay={autoplay}
        onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
        onError={(error) => {
          console.error('❌ Video playback error:', error);
          setError('Failed to play video');
          onError?.('Failed to play video');
        }}
      />
      
      {!audioOnly && (
        <View style={styles.controls}>
          <TouchableOpacity onPress={togglePlayPause} style={styles.playButton}>
            {isPlaying ? (
              <Pause color="white" size={24} fill="white" />
            ) : (
              <Play color="white" size={24} fill="white" />
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    position: 'relative',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  controls: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  playButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(102, 126, 234, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  loadingSubtext: {
    color: '#999',
    fontSize: 14,
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    color: '#ccc',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 8,
  },
  errorSubtext: {
    color: '#999',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#667eea',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  retryText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  helpText: {
    color: '#666',
    fontSize: 12,
    marginTop: 16,
    fontFamily: 'monospace',
  },
});
