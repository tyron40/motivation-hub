import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Image,
} from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { ChevronLeft, Share2, MoreVertical } from 'lucide-react-native';
import VideoPlayer from '@/components/VideoPlayer';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function VideoPlayerScreen() {
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  
  const videoId = String(params.videoId || '');
  const title = String(params.title || 'Video');
  const thumbnail = String(params.thumbnail || '');
  const channelTitle = String(params.channelTitle || '');
  const autoplay = String(params.autoplay || 'true') === 'true';
  
  console.log('🎬 Full-screen video player opened:', {
    videoId,
    title,
    thumbnail,
    channelTitle,
    autoplay
  });
  
  useEffect(() => {
    // Hide status bar for immersive experience
    StatusBar.setHidden(true);
    
    return () => {
      // Show status bar when leaving
      StatusBar.setHidden(false);
    };
  }, []);
  
  const handleBack = () => {
    console.log('🔙 Closing video player');
    router.back();
  };
  
  const handleShare = () => {
    console.log('📤 Share video:', title);
    // TODO: Implement sharing functionality
  };
  
  const handleMore = () => {
    console.log('⚙️ More options for video:', title);
    // TODO: Implement more options
  };
  
  if (!videoId) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Invalid video ID</Text>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }
  
  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: false,
          orientation: 'default',
          statusBarStyle: 'light',
          statusBarHidden: true,
        }}
      />
      
      {/* Video Player */}
      <View style={styles.videoContainer}>
        <VideoPlayer
          videoId={videoId}
          title={title}
          autoplay={autoplay}
          onReady={() => {
            console.log('✅ Full-screen video ready and playing');
          }}
          onError={(error: string) => {
            console.error('❌ Full-screen video error:', error);
          }}
        />
        
        {/* Overlay Controls */}
        <View style={[styles.overlayControls, { paddingTop: insets.top + 16 }]}>
          <TouchableOpacity onPress={handleBack} style={styles.controlButton}>
            <ChevronLeft size={24} color="white" />
          </TouchableOpacity>
          
          <View style={styles.rightControls}>
            <TouchableOpacity onPress={handleShare} style={styles.controlButton}>
              <Share2 size={20} color="white" />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleMore} style={styles.controlButton}>
              <MoreVertical size={20} color="white" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
      
      {/* Video Info */}
      <View style={styles.infoContainer}>
        <View style={styles.thumbnailContainer}>
          {videoId ? (
            <Image 
              source={{ uri: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` }} 
              style={styles.thumbnailImage} 
              resizeMode="cover"
            />
          ) : (
            <View style={styles.placeholderThumbnail} />
          )}
        </View>
        
        <View style={styles.textInfo}>
          <Text style={styles.videoTitle} numberOfLines={2}>
            {title}
          </Text>
          {channelTitle && (
            <Text style={styles.channelTitle} numberOfLines={1}>
              {channelTitle}
            </Text>
          )}
          <Text style={styles.videoId}>Video ID: {videoId}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  videoContainer: {
    flex: 1,
    position: 'relative',
  },
  overlayControls: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingBottom: 16,
    zIndex: 10,
  },
  rightControls: {
    flexDirection: 'row',
    gap: 12,
  },
  controlButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#1a1a1a',
    gap: 12,
  },
  thumbnailContainer: {
    width: 60,
    height: 60,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#333',
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  placeholderThumbnail: {
    width: '100%',
    height: '100%',
    backgroundColor: '#333',
  },
  textInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  videoTitle: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
    lineHeight: 20,
  },
  channelTitle: {
    color: '#ccc',
    fontSize: 14,
    marginBottom: 4,
  },
  videoId: {
    color: '#888',
    fontSize: 12,
    fontFamily: 'monospace',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
    padding: 20,
  },
  errorText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 20,
  },
  backButton: {
    backgroundColor: '#667eea',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});