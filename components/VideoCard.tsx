import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, ActivityIndicator, Linking, Alert } from 'react-native';
import { Play, Clock, Eye, ImageIcon, ExternalLink } from 'lucide-react-native';

interface VideoCardProps {
  id: string;
  title: string;
  thumbnail: string;
  channelTitle: string;
  duration: string;
  viewCount: string;
  onPress: () => void;
  onPlayAudio?: () => void;
}

export default function VideoCard({
  id,
  title,
  thumbnail,
  channelTitle,
  duration,
  viewCount,
  onPress,
  onPlayAudio
}: VideoCardProps) {
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  
  // Validate props
  if (!id || !title) {
    console.warn('VideoCard: Missing required props', { id, title });
    return null;
  }
  
  // Ensure we have a valid thumbnail URL with fallbacks
  const getThumbnailUrl = (videoId: string, originalThumbnail?: string) => {
    if (originalThumbnail && originalThumbnail.startsWith('http')) {
      return originalThumbnail;
    }
    // Try different YouTube thumbnail qualities
    return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
  };
  
  const thumbnailUrl = getThumbnailUrl(id, thumbnail);
  
  const handleImageLoad = () => {
    setImageLoading(false);
    setImageError(false);
  };
  
  const handleImageError = () => {
    console.warn(`Failed to load thumbnail for video ${id}:`, thumbnailUrl);
    setImageLoading(false);
    setImageError(true);
  };
  
  const openInYouTube = async (e: any) => {
    e.stopPropagation();
    const youtubeAppUrl = `vnd.youtube://${id}`;
    const youtubeWebUrl = `https://www.youtube.com/watch?v=${id}`;
    
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
  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.thumbnailContainer}>
        {!imageError ? (
          <>
            <Image 
              source={{ uri: thumbnailUrl }} 
              style={styles.thumbnail} 
              resizeMode="cover"
              onLoad={handleImageLoad}
              onError={handleImageError}
            />
            {imageLoading && (
              <View style={styles.imageLoadingOverlay}>
                <ActivityIndicator size="small" color="white" />
              </View>
            )}
          </>
        ) : (
          <View style={styles.imagePlaceholder}>
            <ImageIcon size={32} color="#666" />
            <Text style={styles.imagePlaceholderText}>No Image</Text>
          </View>
        )}
        
        <View style={styles.durationBadge}>
          <Clock size={12} color="white" />
          <Text style={styles.durationText}>{String(duration || '0:00')}</Text>
        </View>
        
        <View style={styles.thumbnailActions}>
          {onPlayAudio && (
            <TouchableOpacity 
              style={styles.playButton} 
              onPress={(e) => {
                e.stopPropagation();
                onPlayAudio();
              }}
              activeOpacity={0.8}
            >
              <Play size={20} color="white" fill="white" />
            </TouchableOpacity>
          )}
          
          <TouchableOpacity 
            style={styles.youtubeButton} 
            onPress={openInYouTube}
            activeOpacity={0.8}
          >
            <ExternalLink size={16} color="white" />
          </TouchableOpacity>
        </View>
      </View>
      
      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={2}>
          {String(title || 'Untitled')}
        </Text>
        
        <Text style={styles.channel} numberOfLines={1}>
          {String(channelTitle || 'Unknown Channel')}
        </Text>
        
        <View style={styles.stats}>
          <Eye size={12} color="#666" />
          <Text style={styles.viewCount}>{String(viewCount || '0')} views</Text>
        </View>
        
        <Text style={styles.youtubeAttribution}>Source: YouTube</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    maxWidth: '48%',
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  thumbnailContainer: {
    position: 'relative',
    width: '100%',
    height: 120,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    overflow: 'hidden',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  durationBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  durationText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '600',
  },
  thumbnailActions: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  playButton: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -20 }, { translateY: -20 }],
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  youtubeButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FF0000',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  content: {
    padding: 12,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    lineHeight: 18,
    marginBottom: 4,
  },
  channel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 6,
  },
  stats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewCount: {
    fontSize: 11,
    color: '#666',
  },
  youtubeAttribution: {
    fontSize: 10,
    color: '#999',
    marginTop: 6,
    fontStyle: 'italic' as const,
  },
  imageLoadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePlaceholderText: {
    fontSize: 10,
    color: '#666',
    marginTop: 4,
  },
});