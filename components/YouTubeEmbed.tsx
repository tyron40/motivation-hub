import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Linking, Alert } from 'react-native';
import { WebView } from 'react-native-webview';
import { Play, AlertCircle, ExternalLink } from 'lucide-react-native';

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
  const webViewRef = useRef<WebView>(null);
  
  const videoId = extractVideoId(url);
  
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
  
  // Privacy-friendly embed URL with all necessary parameters
  const embedUrl = `https://www.youtube-nocookie.com/embed/${videoId}?${
    new URLSearchParams({
      autoplay: autoplay ? '1' : '0',
      controls: '1',
      modestbranding: '1',
      rel: '0',
      showinfo: '0',
      playsinline: '1',
      enablejsapi: '1',
      fs: '1',
      cc_load_policy: '0',
      iv_load_policy: '3',
      disablekb: '0',
      ...(Platform.OS === 'web' && {
        origin: typeof window !== 'undefined' ? window.location.origin : 'https://localhost'
      })
    }).toString()
  }`;
  
  const handleWebViewLoad = () => {
    console.log(`✅ YouTube video ${videoId} loaded successfully`);
    setIsLoading(false);
    setError(null);
    onReady?.();
  };
  
  const handleWebViewError = (syntheticEvent: any) => {
    const { nativeEvent } = syntheticEvent;
    const errorMsg = `Failed to load YouTube video: ${nativeEvent.description || 'Network error'}`;
    console.error('YouTubeEmbed error:', errorMsg);
    setError(errorMsg);
    setIsLoading(false);
    onError?.(errorMsg);
  };
  
  const handlePlayPress = () => {
    setShowPlayer(true);
  };
  
  const openInYouTube = async () => {
    const youtubeAppUrl = `vnd.youtube://${videoId}`;
    const youtubeWebUrl = `https://www.youtube.com/watch?v=${videoId}`;
    
    try {
      const canOpen = await Linking.canOpenURL(youtubeAppUrl);
      if (canOpen) {
        await Linking.openURL(youtubeAppUrl);
      } else {
        await Linking.openURL(youtubeWebUrl);
      }
    } catch (error) {
      console.error('Error opening YouTube:', error);
      Alert.alert('Error', 'Unable to open YouTube');
    }
  };
  
  const retryLoad = () => {
    setError(null);
    setIsLoading(true);
    setShowPlayer(true);
    webViewRef.current?.reload();
  };
  
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
          
          <TouchableOpacity 
            onPress={openInYouTube} 
            style={styles.openYouTubeButton}
            activeOpacity={0.8}
          >
            <ExternalLink size={16} color="white" />
            <Text style={styles.openYouTubeText}>Open in YouTube</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }
  
  return (
    <View style={[styles.container, { width, height }]}>
      <WebView
        ref={webViewRef}
        source={{ uri: embedUrl }}
        style={styles.webView}
        onLoad={handleWebViewLoad}
        onError={handleWebViewError}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        allowsInlineMediaPlayback={true}
        mediaPlaybackRequiresUserAction={false}
        allowsFullscreenVideo={true}
        startInLoadingState={false}
        cacheEnabled={true}
        incognito={false}
        mixedContentMode="always"
        bounces={false}
        scrollEnabled={false}
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
        userAgent={Platform.OS === 'web' ? undefined : 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15'}
      />
      
      <TouchableOpacity 
        onPress={openInYouTube} 
        style={styles.floatingYouTubeButton}
        activeOpacity={0.8}
      >
        <ExternalLink size={18} color="white" />
      </TouchableOpacity>
      
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
  webView: {
    flex: 1,
    backgroundColor: '#000',
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
  openYouTubeButton: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    right: 12,
    backgroundColor: '#FF0000',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  openYouTubeText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  floatingYouTubeButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 0, 0, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
});