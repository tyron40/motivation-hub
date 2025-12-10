// ====================
//  AUDIO ONLY PLAYER - API FETCH ONLY (NO EMBEDDING)
// ====================

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Linking
} from 'react-native';

import {
  Play,
  SkipForward,
  SkipBack,
  Volume2,
  ExternalLink
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

  // ===============================
  //  Fetch YouTube Video Metadata via API
  // ===============================
  useEffect(() => {
    const fetchVideoMetadata = async () => {
      console.log(`📺 Fetching metadata for video: ${videoId}`);
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
          throw new Error('Video not found');
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

        setMetadata({
          id: video.id,
          title: video.snippet.title,
          description: video.snippet.description || '',
          thumbnail: video.snippet.thumbnails.high?.url || video.snippet.thumbnails.default.url,
          channelTitle: video.snippet.channelTitle,
          duration: parseDuration(video.contentDetails.duration),
          viewCount: parseInt(video.statistics.viewCount || '0'),
          publishedAt: video.snippet.publishedAt,
        });

        console.log(`✅ Video metadata fetched:`, video.snippet.title);
        setIsLoading(false);
      } catch (err: any) {
        console.error('❌ Error fetching video metadata:', err);
        setError(err.message || 'Failed to fetch video data');
        setIsLoading(false);
        onError?.(err.message || 'Failed to fetch video data');
      }
    };

    if (videoId) {
      fetchVideoMetadata();
    }
  }, [videoId, onError]);

  // ====================================
  //  Format helpers
  // ====================================
  const formatDuration = (seconds: number): string => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) {
      return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const formatViewCount = (count: number): string => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M views`;
    } else if (count >= 1000) {
      return `${(count / 1000).toFixed(0)}K views`;
    }
    return `${count} views`;
  };

  // ====================================
  //  Open in YouTube
  // ====================================
  const openInYouTube = () => {
    const url = `https://www.youtube.com/watch?v=${videoId}`;
    console.log('🔗 Opening in YouTube:', url);
    Linking.openURL(url);
  };

  // ================================
  //           UI RENDER
  // ================================

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.artworkContainer}>
          <ActivityIndicator size="large" color="#ff6b6b" />
        </View>
        <Text style={styles.loadingText}>Loading video data...</Text>
      </View>
    );
  }

  if (error || !metadata) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Volume2 size={50} color="#ff6b6b" />
          <Text style={styles.errorText}>Cannot Load Video</Text>
          <Text style={styles.errorSub}>{error || 'Video not found'}</Text>
          <TouchableOpacity style={styles.button} onPress={openInYouTube}>
            <ExternalLink size={18} color="#fff" />
            <Text style={styles.buttonText}>Open in YouTube</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Thumbnail */}
      <View style={styles.artworkContainer}>
        <Image 
          source={{ uri: metadata.thumbnail || thumbnail }} 
          style={styles.artwork} 
        />
        <View style={styles.playOverlay}>
          <Play size={60} color="#fff" fill="#fff" />
        </View>
      </View>

      {/* Video Info */}
      <View style={styles.infoSection}>
        <Text style={styles.title} numberOfLines={2}>{metadata.title}</Text>
        <Text style={styles.subtitle}>{metadata.channelTitle}</Text>
        
        <View style={styles.metaRow}>
          <Text style={styles.metaText}>{formatViewCount(metadata.viewCount)}</Text>
          <Text style={styles.metaDot}>•</Text>
          <Text style={styles.metaText}>Duration: {formatDuration(metadata.duration)}</Text>
        </View>

        <Text style={styles.description} numberOfLines={3}>
          {metadata.description}
        </Text>
      </View>

      {/* Action Button */}
      <TouchableOpacity style={styles.watchButton} onPress={openInYouTube}>
        <ExternalLink size={20} color="#fff" />
        <Text style={styles.watchButtonText}>Watch on YouTube</Text>
      </TouchableOpacity>

      {/* Navigation Controls */}
      <View style={styles.controls}>
        <TouchableOpacity onPress={onPrevious} style={styles.navButton}>
          <SkipBack size={28} color="#333" />
          <Text style={styles.navLabel}>Previous</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={onNext} style={styles.navButton}>
          <SkipForward size={28} color="#333" />
          <Text style={styles.navLabel}>Next</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ====================================================
//                 STYLES
// ====================================================

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 16,
    minHeight: 400,
  },

  artworkContainer: {
    width: '100%',
    aspectRatio: 16 / 9,
    maxHeight: 260,
    alignSelf: 'center',
    marginBottom: 20,
    backgroundColor: '#000',
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },

  artwork: {
    width: '100%',
    height: '100%',
  },

  playOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  infoSection: {
    marginBottom: 20,
  },

  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
    marginBottom: 8,
    lineHeight: 24,
  },

  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    fontWeight: '500',
  },

  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },

  metaText: {
    fontSize: 13,
    color: '#888',
  },

  metaDot: {
    fontSize: 13,
    color: '#888',
  },

  description: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },

  watchButton: {
    backgroundColor: '#ff0000',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    gap: 8,
  },

  watchButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },

  controls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },

  navButton: {
    alignItems: 'center',
    padding: 12,
  },

  navLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },

  loadingText: {
    textAlign: 'center',
    color: '#666',
    fontSize: 14,
    marginTop: 16,
  },

  errorContainer: {
    alignItems: 'center',
    padding: 20,
  },

  errorText: {
    fontSize: 18,
    color: '#ff4444',
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 8,
  },

  errorSub: {
    textAlign: 'center',
    color: '#666',
    fontSize: 14,
    marginBottom: 20,
  },

  button: {
    backgroundColor: '#ff0000',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    gap: 8,
  },

  buttonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
});
