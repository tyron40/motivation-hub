import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router } from 'expo-router';
import { Search } from 'lucide-react-native';
import VideoCard from '@/components/VideoCard';

import AudioOnlyVideoPlayer from '@/components/AudioOnlyVideoPlayer';
import { 
  getVideosByCategory, 
  searchVideos as searchYouTubeVideos, 
  getTrendingVideos, 
  getAvailableCategories,
  YouTubeVideoData 
} from '@/services/youtubeService';

type Video = YouTubeVideoData;

interface Category {
  id: string;
  name: string;
  description: string;
  queryCount: number;
}

export default function VideosScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [videos, setVideos] = useState<Video[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [audioOnlyMode, setAudioOnlyMode] = useState(false);

  // Fetch available categories on mount
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        console.log('🔄 Fetching categories...');
        const availableCategories = await getAvailableCategories();
        console.log('📋 Raw categories received:', availableCategories);
        
        const categoryList = availableCategories
          .filter(cat => cat && typeof cat === 'string')
          .map(cat => ({
            id: cat,
            name: cat,
            description: `${cat} motivational videos`,
            queryCount: 0
          }));
        
        const finalCategories = [{ id: 'All', name: 'All', description: 'All categories', queryCount: 0 }, ...categoryList];
        console.log('✅ Processed categories:', finalCategories);
        setCategories(finalCategories);
      } catch (error) {
        console.error('❌ Error fetching categories:', error);
        // Set default categories on error
        setCategories([
          { id: 'All', name: 'All', description: 'All categories', queryCount: 0 },
          { id: 'Motivation', name: 'Motivation', description: 'Motivational videos', queryCount: 0 },
          { id: 'Success', name: 'Success', description: 'Success videos', queryCount: 0 }
        ]);
      }
    };
    
    fetchCategories();
  }, []);

  // Search videos
  const searchVideos = async (query: string, maxResults: number = 50, category?: string) => {
    try {
      setIsLoading(true);
      console.log(`Searching for: ${query} in category: ${category || 'All'}`);
      
      let results: Video[] = [];
      
      if (category && category !== 'All') {
        // Search within specific category
        const categoryVideos = await getVideosByCategory(category, maxResults);
        results = categoryVideos.filter(video => 
          video.title.toLowerCase().includes(query.toLowerCase()) ||
          video.description.toLowerCase().includes(query.toLowerCase())
        );
      } else {
        // General search
        results = await searchYouTubeVideos(query, maxResults);
      }
      
      setVideos(results);
      console.log(`Found ${results.length} videos`);
    } catch (error) {
      console.error('Search Error:', error);
      setVideos([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Get category videos
  const getCategoryVideos = async (category: string, limit: number = 50) => {
    try {
      setIsLoading(true);
      console.log(`Loading videos for category: ${category}`);
      
      let results: Video[] = [];
      
      if (category === 'All') {
        results = await getTrendingVideos(limit);
      } else {
        results = await getVideosByCategory(category, limit);
      }
      
      setVideos(results);
      console.log(`Loaded ${results.length} videos for ${category}`);
    } catch (error) {
      console.error('Category Error:', error);
      setVideos([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Load trending videos on mount
    getCategoryVideos('All');
  }, []);

  const handleSearch = (query?: string) => {
    const searchTerm = query || searchQuery;
    if (!searchTerm.trim()) {
      console.log('Search Error: Please enter a search term');
      return;
    }

    searchVideos(
      searchTerm,
      50,
      selectedCategory !== 'All' ? selectedCategory : undefined
    );
  };

  const handleCategorySelect = (category: string) => {
    setSelectedCategory(category);
    
    getCategoryVideos(category, 50);
  };

  const handleVideoPress = (video: Video) => {
    console.log('🎬 Opening full-screen video player immediately:', video.title);
    console.log('📺 Video ID:', video.id);
    console.log('🖼️ Thumbnail:', video.thumbnail);
    
    // Navigate to full-screen video player
    router.push({
      pathname: '/video-player',
      params: {
        videoId: video.id,
        title: video.title,
        thumbnail: video.thumbnail,
        channelTitle: video.channelTitle,
        autoplay: 'true'
      }
    });
  };

  const handlePlayAudio = (video: Video) => {
    console.log('🎵 Playing audio immediately:', video.title);
    console.log('🎵 Video ID:', video.id);
    console.log('🖼️ Thumbnail:', video.thumbnail);
    setSelectedVideo(video);
    setAudioOnlyMode(true);
  };

  const closePlayer = () => {
    setSelectedVideo(null);
    setAudioOnlyMode(false);
  };

  const renderVideoCard = ({ item }: { item: Video }) => {
    if (!item || !item.id || typeof item.id !== 'string') {
      console.warn('⚠️ Invalid video item:', item);
      return null;
    }
    
    return (
      <VideoCard
        key={String(item.id)}
        id={String(item.id)}
        title={String(item.title || 'Untitled')}
        thumbnail={String(item.thumbnail || '')}
        channelTitle={String(item.channelTitle || 'Unknown Channel')}
        duration={String(item.durationFormatted || '0:00')}
        viewCount={String(item.viewCountFormatted || '0')}
        onPress={() => handleVideoPress(item)}
        onPlayAudio={() => handlePlayAudio(item)}
      />
    );
  };

  const renderCategoryButton = (category: Category) => {
    if (!category || typeof category !== 'object' || !category.id || !category.name) {
      console.warn('Invalid category object:', category);
      return null;
    }
    
    return (
      <TouchableOpacity
        key={String(category.id)}
        style={[
          styles.categoryButton,
          selectedCategory === category.id && styles.selectedCategoryButton,
        ]}
        onPress={() => handleCategorySelect(String(category.id))}
      >
        <Text
          style={[
            styles.categoryButtonText,
            selectedCategory === category.id && styles.selectedCategoryButtonText,
          ]}
        >
          {String(category.name)}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
      <Stack.Screen
        options={{
          title: 'Motivational Videos',
          headerStyle: { backgroundColor: '#667eea' },
          headerTintColor: 'white',
          headerTitleStyle: { fontWeight: 'bold' },
          headerBackVisible: true,
        }}
      />

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Search size={20} color="#666" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search motivational videos..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={() => handleSearch()}
            returnKeyType="search"
          />
        </View>
        <TouchableOpacity
          style={styles.searchButton}
          onPress={() => handleSearch()}
          disabled={isLoading}
        >
          <Search size={20} color="white" />
        </TouchableOpacity>
      </View>

      {/* Categories */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoriesContainer}
        contentContainerStyle={styles.categoriesContent}
      >
        {categories
          .filter(category => {
            const isValid = category && 
                           typeof category === 'object' && 
                           category.id && 
                           category.name &&
                           typeof category.id === 'string' &&
                           typeof category.name === 'string';
            if (!isValid) {
              console.warn('Filtering out invalid category:', category);
            }
            return isValid;
          })
          .map((category) => {
            const buttonComponent = renderCategoryButton(category);
            return buttonComponent;
          })
          .filter(Boolean)}
      </ScrollView>

      {/* Loading */}
      {isLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#667eea" />
          <Text style={styles.loadingText}>Loading videos...</Text>
        </View>
      )}

      {/* Audio Player */}
      {selectedVideo && audioOnlyMode && (
        <View style={styles.playerContainer}>
          <View style={styles.playerHeader}>
            <Text style={styles.playerTitle} numberOfLines={1}>
              {String(selectedVideo?.title || 'Untitled')}
            </Text>
            <TouchableOpacity style={styles.closeButton} onPress={closePlayer}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>
          
          <AudioOnlyVideoPlayer
            videoId={selectedVideo.id}
            title={selectedVideo.title}
            thumbnail={selectedVideo.thumbnail}
            channelTitle={selectedVideo.channelTitle}
            autoplay={true}
            onError={(error) => {
              console.error('Audio playback error:', error);
            }}
          />
        </View>
      )}

      {/* Videos List */}
      {!isLoading && videos.length > 0 && (
        <FlatList
          data={videos.filter(video => video && video.id && typeof video.id === 'string')}
          renderItem={renderVideoCard}
          keyExtractor={(item, index) => {
            if (item && item.id && typeof item.id === 'string') {
              return item.id;
            }
            return `video-${index}-${Math.random()}`;
          }}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.videosContainer}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Empty State */}
      {!isLoading && videos.length === 0 && (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No videos found</Text>
          <Text style={styles.emptySubtext}>
            Try searching for different keywords or select a different category
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  searchContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    height: 48,
    fontSize: 16,
    color: '#333',
  },
  searchButton: {
    width: 48,
    height: 48,
    backgroundColor: '#667eea',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoriesContainer: {
    maxHeight: 50,
  },
  categoriesContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  selectedCategoryButton: {
    backgroundColor: '#667eea',
    borderColor: '#667eea',
  },
  categoryButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  selectedCategoryButtonText: {
    color: 'white',
  },
  modeToggle: {
    flexDirection: 'row',
    margin: 16,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  modeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 6,
  },
  activeModeButton: {
    backgroundColor: '#667eea',
  },
  modeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#667eea',
  },
  activeModeButtonText: {
    color: 'white',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  playerContainer: {
    backgroundColor: 'white',
    margin: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  playerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  playerTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    color: '#666',
    fontWeight: 'bold',
  },
  videosContainer: {
    padding: 16,
  },
  row: {
    justifyContent: 'space-between',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
});