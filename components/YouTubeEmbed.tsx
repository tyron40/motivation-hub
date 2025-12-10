import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import YoutubePlayer from 'react-native-youtube-iframe';
import { Play, AlertCircle } from 'lucide-react-native';

interface YouTubeEmbedProps {
  url: string;
  title?: string;
  autoplay?: boolean;
  width?: number | string;
  height?: number | string;
  onReady?: () => void;
  onError?: (error: string) => void;
}

// Extract video ID from various YouTube URL formats
function extractVideoId(url: string): string | null {
  if (!url || typeof url !== 'string') return null;
  
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /youtube\.com\/shorts\/([^&\n?#]+)/,
    /youtube\.com\/v\/([^&\n?#]+)/,
    /youtube\.com\/.*[?&]v=([^&\n?#]+)/
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  
  return null;
}

export default function YouTubeEmbed({
  url,
  title = 'YouTube Video',
  autoplay = false,
  width = '100%',
  height = 220,
  onReady,
  onError
}: YouTubeEmbedProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPlayer, setShowPlayer] = useState(autoplay);
  const [playing, setPlaying] = useState(autoplay);
  
  const videoId = extractVideoId(url);
  
  const onStateChange = useCallback(
    (state: string) => {
      console.log(`🎬 YouTube state: ${state}`);
      if (state === 'ended') {
        console.log('✅ YouTube video playback ended');
        setPlaying(false);
      }
    },
    []
  );

  const onPlayerReady = useCallback(() => {
    console.log(`✅ YouTube video ${videoId} ready`);
    setIsLoading(false);
    setError(null);
    onReady?.();
  }, [videoId, onReady]);

  const onPlayerError = useCallback(
    (playerError: string) => {
      console.error(`❌ YouTube player error: ${playerError}`);
      setError(`Unable to play video: ${playerError}`);
      setIsLoading(false);
      onError?.(playerError);
    },
    [onError]
  );
  
  const handlePlayPress = useCallback(() => {
    setShowPlayer(true);
    setPlaying(true);
  }, []);
  
  const retryLoad = useCallback(() => {
    setError(null);
    setIsLoading(true);
    setShowPlayer(true);
    setPlaying(true);
  }, []);
  
  if (!videoId) {
    return (
      <View style={[styles.container, { width, height }]}>
        <View style={styles.errorContainer}>
          <AlertCircle color="#ff6b6b" size={24} />
          <Text style={styles.errorText}>Invalid YouTube URL</Text>
          <Text style={styles.errorSubtext}>{url}</Text>
        </View>
      </View>
    );
  }
  
  if (error) {
    return (
      <View style={[styles.container, { width, height }]}>
        <View style={styles.errorContainer}>
          <AlertCircle color="#ff6b6b" size={24} />
          <Text style={styles.errorText}>Unable to load video</Text>
          <Text style={styles.errorSubtext}>{title}</Text>
          <TouchableOpacity onPress={retryLoad} style={styles.retryButton}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }
  
  if (!showPlayer && !autoplay) {
    return (
      <View style={[styles.container, { width, height }]}>
        <View style={styles.thumbnailContainer}>
          <TouchableOpacity onPress={handlePlayPress} style={styles.playOverlay}>
            <View style={styles.playButton}>
              <Play color="white" size={32} fill="white" />
            </View>
            <Text style={styles.playText}>Tap to play</Text>
            <Text style={styles.titleText} numberOfLines={2}>{title}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }
  
  return (
    <View style={[styles.container, { width, height }]}>
      <YoutubePlayer
        height={typeof height === 'number' ? height : 220}
        videoId={videoId}
        play={playing}
        onChangeState={onStateChange}
        onReady={onPlayerReady}
        onError={onPlayerError}
        webViewProps={{
          androidLayerType: 'hardware',
        }}
        initialPlayerParams={{
          modestbranding: true,
          showClosedCaptions: false,
          rel: false,
          controls: true,
        }}
      />
      
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <Text style={styles.loadingText}>Loading video...</Text>
          <Text style={styles.loadingSubtext}>{title}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#000',
    position: 'relative',
  },

  thumbnailContainer: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playOverlay: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  playButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  playText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  titleText: {
    color: '#ccc',
    fontSize: 14,
    textAlign: 'center',
    maxWidth: 200,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#1a1a1a',
  },
  errorText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  errorSubtext: {
    color: '#999',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#ff6b6b',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  loadingSubtext: {
    color: '#999',
    fontSize: 14,
    textAlign: 'center',
  },
});