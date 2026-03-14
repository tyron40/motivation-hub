import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Dimensions,
  TextInput,
  Alert,
  Modal,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, Play, Clock, Eye, Plus, Trash2, X, Youtube } from 'lucide-react-native';
import { useTheme } from '@/hooks/theme-context';
import { searchVideos, getTrendingVideos, YouTubeVideoData } from '@/services/youtubeService';
import { useAdmin, AdminVideo } from '@/hooks/admin-context';

const { width: _SCREEN_WIDTH } = Dimensions.get('window');

export default function ShortClipsScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { isAdmin, customVideos, addVideo, removeVideo } = useAdmin();
  const [clips, setClips] = useState<YouTubeVideoData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newVideoTitle, setNewVideoTitle] = useState('');
  const [newVideoId, setNewVideoId] = useState('');

  useEffect(() => {
    const fetchClips = async () => {
      try {
        console.log('Fetching motivational short clips...');
        setIsLoading(true);

        const [searchResults, trending] = await Promise.all([
          searchVideos('motivational short clips inspiration', 25),
          getTrendingVideos(25),
        ]);

        const seenIds = new Set<string>();
        const merged: YouTubeVideoData[] = [];
        for (const v of [...searchResults, ...trending]) {
          if (!seenIds.has(v.id) && v.duration <= 600) {
            seenIds.add(v.id);
            merged.push(v);
          }
        }

        const shortFirst = merged.sort((a, b) => a.duration - b.duration);
        console.log(`Loaded ${shortFirst.length} short clips`);
        setClips(shortFirst);
      } catch (error) {
        console.error('Error fetching short clips:', error);
      } finally {
        setIsLoading(false);
      }
    };

    void fetchClips();
  }, []);

  const handleVideoPress = useCallback((video: YouTubeVideoData | AdminVideo) => {
    const videoId = 'youtubeId' in video ? video.youtubeId : video.id;
    router.push({
      pathname: '/video-player',
      params: {
        videoId,
        title: video.title,
        thumbnail: video.thumbnail,
        channelTitle: 'channelTitle' in video ? video.channelTitle : 'Motivation Fuel',
        autoplay: 'true',
      },
    });
  }, []);

  const handleAddVideo = useCallback(async () => {
    if (!newVideoTitle.trim() || !newVideoId.trim()) {
      Alert.alert('Missing Fields', 'Please fill in title and YouTube video ID');
      return;
    }

    const cleanId = newVideoId.trim().replace(/.*(?:youtu\.be\/|v=)/, '').replace(/[&?].*/, '');

    await addVideo({
      id: `custom-vid-${Date.now()}`,
      title: newVideoTitle.trim(),
      youtubeId: cleanId,
      thumbnail: `https://i.ytimg.com/vi/${cleanId}/hqdefault.jpg`,
      channelTitle: 'Admin Added',
      description: '',
      addedAt: Date.now(),
    });

    setNewVideoTitle('');
    setNewVideoId('');
    setShowAddModal(false);
  }, [newVideoTitle, newVideoId, addVideo]);

  const handleDeleteVideo = useCallback((id: string) => {
    Alert.alert('Delete Video', 'Remove this video?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => removeVideo(id) },
    ]);
  }, [removeVideo]);

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const styles = getStyles(colors);

  const renderAdminVideo = ({ item }: { item: AdminVideo }) => (
    <TouchableOpacity
      style={styles.clipCard}
      activeOpacity={0.85}
      onPress={() => handleVideoPress(item)}
    >
      <View style={styles.thumbnailContainer}>
        <Image source={{ uri: item.thumbnail }} style={styles.thumbnail} />
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.7)']}
          style={styles.thumbnailOverlay}
        >
          <View style={styles.playCircle}>
            <Play size={18} color="#fff" fill="#fff" />
          </View>
        </LinearGradient>
        <View style={styles.adminBadge}>
          <Text style={styles.adminBadgeText}>ADDED</Text>
        </View>
      </View>
      <View style={styles.clipInfo}>
        <Text style={styles.clipTitle} numberOfLines={2}>{item.title}</Text>
        <Text style={styles.clipChannel}>{item.channelTitle}</Text>
      </View>
      {isAdmin && (
        <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDeleteVideo(item.id)}>
          <Trash2 size={16} color="#EF4444" />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );

  const renderClip = ({ item }: { item: YouTubeVideoData }) => (
    <TouchableOpacity
      style={styles.clipCard}
      activeOpacity={0.85}
      onPress={() => handleVideoPress(item)}
    >
      <View style={styles.thumbnailContainer}>
        <Image source={{ uri: item.thumbnail }} style={styles.thumbnail} />
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.7)']}
          style={styles.thumbnailOverlay}
        >
          <View style={styles.playCircle}>
            <Play size={18} color="#fff" fill="#fff" />
          </View>
        </LinearGradient>
        <View style={styles.durationBadge}>
          <Clock size={10} color="#fff" />
          <Text style={styles.durationText}>{item.durationFormatted || formatDuration(item.duration)}</Text>
        </View>
      </View>
      <View style={styles.clipInfo}>
        <Text style={styles.clipTitle} numberOfLines={2}>{item.title}</Text>
        <View style={styles.clipMeta}>
          <Text style={styles.clipChannel}>{item.channelTitle}</Text>
          {item.viewCountFormatted && (
            <View style={styles.viewsRow}>
              <Eye size={11} color={colors.textSecondary} />
              <Text style={styles.viewsText}>{item.viewCountFormatted}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  const ListHeader = () => (
    <>
      {customVideos.length > 0 && (
        <View style={styles.sectionBlock}>
          <Text style={styles.sectionLabel}>Admin Picks</Text>
          {customVideos.map((v) => (
            <React.Fragment key={v.id}>
              {renderAdminVideo({ item: v })}
            </React.Fragment>
          ))}
          <View style={styles.sectionDivider} />
        </View>
      )}
      <Text style={styles.sectionLabel}>Trending Short Clips</Text>
    </>
  );

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
            <ArrowLeft size={22} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Short Clips</Text>
          {isAdmin ? (
            <TouchableOpacity onPress={() => setShowAddModal(true)} style={styles.addBtn} activeOpacity={0.7}>
              <Plus size={22} color={colors.text} />
            </TouchableOpacity>
          ) : (
            <View style={styles.backBtn} />
          )}
        </View>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading short clips...</Text>
          </View>
        ) : (
          <FlatList
            data={clips}
            renderItem={renderClip}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            ListHeaderComponent={ListHeader}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={[styles.emptyText, { color: colors.text }]}>No clips found</Text>
                <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>Check your connection and try again</Text>
              </View>
            }
          />
        )}

        <Modal visible={showAddModal} transparent animationType="slide" onRequestClose={() => setShowAddModal(false)}>
          <View style={styles.addModalOverlay}>
            <View style={[styles.addModalContent, { backgroundColor: colors.card }]}>
              <View style={styles.addModalHeader}>
                <Text style={[styles.addModalTitle, { color: colors.text }]}>Add Video Clip</Text>
                <TouchableOpacity onPress={() => setShowAddModal(false)}>
                  <X size={22} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <View style={styles.addModalBody}>
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Title</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.textSecondary + '30' }]}
                  value={newVideoTitle}
                  onChangeText={setNewVideoTitle}
                  placeholder="Video title..."
                  placeholderTextColor={colors.textSecondary + '60'}
                />

                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>YouTube Video ID or URL</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.textSecondary + '30' }]}
                  value={newVideoId}
                  onChangeText={setNewVideoId}
                  placeholder="e.g. dQw4w9WgXcQ or full URL"
                  placeholderTextColor={colors.textSecondary + '60'}
                  autoCapitalize="none"
                />

                {newVideoId.trim().length > 5 && (
                  <View style={styles.previewContainer}>
                    <Image
                      source={{ uri: `https://i.ytimg.com/vi/${newVideoId.trim().replace(/.*(?:youtu\.be\/|v=)/, '').replace(/[&?].*/, '')}/hqdefault.jpg` }}
                      style={styles.previewImage}
                    />
                  </View>
                )}

                <TouchableOpacity style={[styles.addButton, { backgroundColor: colors.primary }]} onPress={handleAddVideo} activeOpacity={0.8}>
                  <Youtube size={18} color="#fff" />
                  <Text style={styles.addButtonText}>Add Video</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </>
  );
}

const getStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    backgroundColor: colors.primary + '25',
  },
  headerTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700' as const,
    letterSpacing: -0.3,
  },
  list: {
    padding: 16,
    paddingBottom: 100,
  },
  sectionBlock: {
    marginBottom: 8,
  },
  sectionLabel: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '700' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: 1,
    marginBottom: 12,
  },
  sectionDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    marginVertical: 16,
  },
  clipCard: {
    flexDirection: 'row' as const,
    marginBottom: 14,
    backgroundColor: colors.card,
    borderRadius: 14,
    overflow: 'hidden' as const,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  thumbnailContainer: {
    width: 140,
    height: 90,
    position: 'relative' as const,
  },
  thumbnail: {
    width: '100%' as const,
    height: '100%' as const,
  },
  thumbnailOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  playCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    paddingLeft: 2,
  },
  durationBadge: {
    position: 'absolute' as const,
    bottom: 6,
    right: 6,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 3,
    backgroundColor: 'rgba(0,0,0,0.75)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  durationText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600' as const,
  },
  adminBadge: {
    position: 'absolute' as const,
    top: 6,
    left: 6,
    backgroundColor: colors.primary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  adminBadgeText: {
    color: '#fff',
    fontSize: 8,
    fontWeight: '800' as const,
    letterSpacing: 0.5,
  },
  clipInfo: {
    flex: 1,
    padding: 10,
    justifyContent: 'center' as const,
  },
  clipTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600' as const,
    lineHeight: 19,
    marginBottom: 6,
  },
  clipMeta: {
    gap: 4,
  },
  clipChannel: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '500' as const,
  },
  viewsRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 4,
  },
  viewsText: {
    color: colors.textSecondary,
    fontSize: 11,
  },
  deleteBtn: {
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 12,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    gap: 12,
  },
  loadingText: {
    fontSize: 15,
  },
  emptyContainer: {
    alignItems: 'center' as const,
    paddingTop: 60,
    gap: 8,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600' as const,
  },
  emptySubtext: {
    fontSize: 14,
  },
  addModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end' as const,
  },
  addModalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 40,
  },
  addModalHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  addModalTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
  },
  addModalBody: {
    padding: 20,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600' as const,
    marginBottom: 6,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    marginBottom: 16,
  },
  previewContainer: {
    height: 120,
    borderRadius: 12,
    overflow: 'hidden' as const,
    marginBottom: 16,
  },
  previewImage: {
    width: '100%' as const,
    height: '100%' as const,
  },
  addButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 4,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700' as const,
  },
});
