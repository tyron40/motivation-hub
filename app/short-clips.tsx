import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  Animated,
  Platform,
  ViewToken,
  Linking,
} from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowLeft,
  Heart,
  Bookmark,
  Share2,
  Play,
  Plus,
  Trash2,
  X,
  Youtube,
  Music2,
  Eye,
  ExternalLink,
} from 'lucide-react-native';
import YoutubePlayer from 'react-native-youtube-iframe';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { searchVideos, getTrendingVideos } from '@/services/youtubeService';
import { useAdmin } from '@/hooks/admin-context';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const LIKED_CLIPS_KEY = 'liked_clips_v1';
const SAVED_CLIPS_KEY = 'saved_clips_v1';

interface ClipItem {
  id: string;
  youtubeId: string;
  title: string;
  channelTitle: string;
  thumbnail: string;
  viewCount?: number;
  viewCountFormatted?: string;
  duration?: number;
  durationFormatted?: string;
  isAdmin?: boolean;
}

export default function ShortClipsScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const initialVideoId = params.initialVideoId ? String(params.initialVideoId) : null;
  const { isAdmin, customVideos, addVideo, removeVideo } = useAdmin();

  const [clips, setClips] = useState<ClipItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const [likedClips, setLikedClips] = useState<Set<string>>(new Set());
  const [savedClips, setSavedClips] = useState<Set<string>>(new Set());
  const [showAddModal, setShowAddModal] = useState(false);
  const [newVideoTitle, setNewVideoTitle] = useState('');
  const [newVideoId, setNewVideoId] = useState('');
  const [hasScrolledToInitial, setHasScrolledToInitial] = useState(false);

  const flatListRef = useRef<FlatList>(null);
  const likeAnimations = useRef<Record<string, Animated.Value>>({}).current;
  const saveAnimations = useRef<Record<string, Animated.Value>>({}).current;

  const getOrCreateAnim = useCallback((map: Record<string, Animated.Value>, key: string) => {
    if (!map[key]) {
      map[key] = new Animated.Value(1);
    }
    return map[key];
  }, []);

  useEffect(() => {
    const loadPrefs = async () => {
      try {
        const [likedRaw, savedRaw] = await Promise.all([
          AsyncStorage.getItem(LIKED_CLIPS_KEY),
          AsyncStorage.getItem(SAVED_CLIPS_KEY),
        ]);
        if (likedRaw) setLikedClips(new Set(JSON.parse(likedRaw)));
        if (savedRaw) setSavedClips(new Set(JSON.parse(savedRaw)));
      } catch (e) {
        console.error('Error loading clip prefs:', e);
      }
    };
    void loadPrefs();
  }, []);

  useEffect(() => {
    const fetchClips = async () => {
      try {
        console.log('Fetching motivational short clips...');
        setIsLoading(true);

        const [searchResults, trending] = await Promise.all([
          searchVideos('motivational short clips inspiration', 30),
          getTrendingVideos(30),
        ]);

        const seenIds = new Set<string>();
        const merged: ClipItem[] = [];

        for (const v of customVideos) {
          if (!seenIds.has(v.youtubeId)) {
            seenIds.add(v.youtubeId);
            merged.push({
              id: v.id,
              youtubeId: v.youtubeId,
              title: v.title,
              channelTitle: v.channelTitle,
              thumbnail: v.thumbnail,
              isAdmin: true,
            });
          }
        }

        for (const v of [...searchResults, ...trending]) {
          if (!seenIds.has(v.id) && v.duration <= 600) {
            seenIds.add(v.id);
            merged.push({
              id: v.id,
              youtubeId: v.id,
              title: v.title,
              channelTitle: v.channelTitle,
              thumbnail: v.thumbnail,
              viewCount: v.viewCount,
              viewCountFormatted: v.viewCountFormatted,
              duration: v.duration,
              durationFormatted: v.durationFormatted,
            });
          }
        }

        console.log(`Loaded ${merged.length} short clips for TikTok view`);

        if (initialVideoId && !hasScrolledToInitial) {
          const targetIndex = merged.findIndex(
            (c) => c.youtubeId === initialVideoId || c.id === initialVideoId
          );
          if (targetIndex > 0) {
            const [target] = merged.splice(targetIndex, 1);
            merged.unshift(target);
            console.log(`Moved initial clip "${target.title}" to top`);
          }
        }

        setClips(merged);
      } catch (error) {
        console.error('Error fetching short clips:', error);
      } finally {
        setIsLoading(false);
      }
    };

    void fetchClips();
  }, [customVideos, initialVideoId, hasScrolledToInitial]);

  useEffect(() => {
    if (clips.length > 0 && initialVideoId && !hasScrolledToInitial) {
      setHasScrolledToInitial(true);
      setActiveIndex(0);
    }
  }, [clips, initialVideoId, hasScrolledToInitial]);

  const toggleLike = useCallback(async (clipId: string) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const anim = getOrCreateAnim(likeAnimations, clipId);
    Animated.sequence([
      Animated.timing(anim, { toValue: 1.4, duration: 120, useNativeDriver: true }),
      Animated.spring(anim, { toValue: 1, friction: 3, useNativeDriver: true }),
    ]).start();

    setLikedClips(prev => {
      const next = new Set(prev);
      if (next.has(clipId)) {
        next.delete(clipId);
      } else {
        next.add(clipId);
      }
      void AsyncStorage.setItem(LIKED_CLIPS_KEY, JSON.stringify(Array.from(next)));
      return next;
    });
  }, [getOrCreateAnim, likeAnimations]);

  const toggleSave = useCallback(async (clipId: string) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const anim = getOrCreateAnim(saveAnimations, clipId);
    Animated.sequence([
      Animated.timing(anim, { toValue: 1.3, duration: 100, useNativeDriver: true }),
      Animated.spring(anim, { toValue: 1, friction: 3, useNativeDriver: true }),
    ]).start();

    setSavedClips(prev => {
      const next = new Set(prev);
      if (next.has(clipId)) {
        next.delete(clipId);
      } else {
        next.add(clipId);
      }
      void AsyncStorage.setItem(SAVED_CLIPS_KEY, JSON.stringify(Array.from(next)));
      return next;
    });
  }, [getOrCreateAnim, saveAnimations]);

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

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (viewableItems.length > 0 && viewableItems[0].index != null) {
      setActiveIndex(viewableItems[0].index);
    }
  }).current;

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 60 }).current;

  const itemHeight = SCREEN_HEIGHT;

  const renderClipPage = useCallback(({ item, index }: { item: ClipItem; index: number }) => {
    return (
      <ClipPage
        clip={item}
        isActive={index === activeIndex}
        isLiked={likedClips.has(item.id)}
        isSaved={savedClips.has(item.id)}
        onToggleLike={() => toggleLike(item.id)}
        onToggleSave={() => toggleSave(item.id)}
        likeScale={getOrCreateAnim(likeAnimations, item.id)}
        saveScale={getOrCreateAnim(saveAnimations, item.id)}
        isAdmin={isAdmin}
        isAdminClip={item.isAdmin ?? false}
        onDelete={() => handleDeleteVideo(item.id)}
        insets={insets}
        height={itemHeight}
      />
    );
  }, [activeIndex, likedClips, savedClips, toggleLike, toggleSave, isAdmin, insets, itemHeight, getOrCreateAnim, likeAnimations, saveAnimations, handleDeleteVideo]);

  const getItemLayout = useCallback((_: any, index: number) => ({
    length: itemHeight,
    offset: itemHeight * index,
    index,
  }), [itemHeight]);

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: '#000' }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator size="large" color="#fff" />
        <Text style={styles.loadingText}>Loading clips...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      <FlatList
        ref={flatListRef}
        data={clips}
        renderItem={renderClipPage}
        keyExtractor={(item) => item.id}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        snapToAlignment="start"
        decelerationRate="fast"
        getItemLayout={getItemLayout}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        initialNumToRender={2}
        maxToRenderPerBatch={3}
        windowSize={3}
        removeClippedSubviews={Platform.OS !== 'web'}
        ListEmptyComponent={
          <View style={[styles.emptyContainer, { height: itemHeight }]}>
            <Play size={48} color="#555" />
            <Text style={styles.emptyText}>No clips available</Text>
            <Text style={styles.emptySubtext}>Check your connection and try again</Text>
          </View>
        }
      />

      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]} pointerEvents="box-none">
        <TouchableOpacity onPress={() => router.back()} style={styles.topBtn} activeOpacity={0.7}>
          <ArrowLeft size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.topTitle}>Short Clips</Text>
        {isAdmin ? (
          <TouchableOpacity onPress={() => setShowAddModal(true)} style={styles.topBtn} activeOpacity={0.7}>
            <Plus size={22} color="#fff" />
          </TouchableOpacity>
        ) : (
          <View style={styles.topBtn} />
        )}
      </View>

      <Modal visible={showAddModal} transparent animationType="slide" onRequestClose={() => setShowAddModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Video Clip</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <X size={22} color="#999" />
              </TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              <Text style={styles.inputLabel}>Title</Text>
              <TextInput
                style={styles.input}
                value={newVideoTitle}
                onChangeText={setNewVideoTitle}
                placeholder="Video title..."
                placeholderTextColor="#666"
              />
              <Text style={styles.inputLabel}>YouTube Video ID or URL</Text>
              <TextInput
                style={styles.input}
                value={newVideoId}
                onChangeText={setNewVideoId}
                placeholder="e.g. dQw4w9WgXcQ or full URL"
                placeholderTextColor="#666"
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
              <TouchableOpacity style={styles.addButton} onPress={handleAddVideo} activeOpacity={0.8}>
                <Youtube size={18} color="#fff" />
                <Text style={styles.addButtonText}>Add Video</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

interface ClipPageProps {
  clip: ClipItem;
  isActive: boolean;
  isLiked: boolean;
  isSaved: boolean;
  onToggleLike: () => void;
  onToggleSave: () => void;
  likeScale: Animated.Value;
  saveScale: Animated.Value;
  isAdmin: boolean;
  isAdminClip: boolean;
  onDelete: () => void;
  insets: { top: number; bottom: number; left: number; right: number };
  height: number;
}

const ClipPage = React.memo(function ClipPage({
  clip,
  isActive,
  isLiked,
  isSaved,
  onToggleLike,
  onToggleSave,
  likeScale,
  saveScale,
  isAdmin,
  isAdminClip,
  onDelete,
  insets,
  height,
}: ClipPageProps) {
  const [showPlayer, setShowPlayer] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playerReady, setPlayerReady] = useState(false);
  const playerRef = useRef<any>(null);

  useEffect(() => {
    if (isActive) {
      console.log('🎬 Clip became active, starting autoplay:', clip.youtubeId);
      setShowPlayer(true);
      setIsPlaying(true);
    } else {
      setIsPlaying(false);
      setShowPlayer(false);
      setPlayerReady(false);
    }
  }, [isActive, clip.youtubeId]);

  const onStateChange = useCallback((state: string) => {
    console.log('Clip player state:', state, clip.youtubeId);
    if (state === 'ended') {
      setIsPlaying(true);
    } else if (state === 'paused') {
      setIsPlaying(false);
    } else if (state === 'playing') {
      setIsPlaying(true);
    }
  }, [clip.youtubeId]);

  const onPlayerReady = useCallback(() => {
    console.log('Clip player ready, forcing play:', clip.youtubeId);
    setPlayerReady(true);
    setTimeout(() => setIsPlaying(true), 100);
  }, [clip.youtubeId]);

  const onPlayerError = useCallback((error: string) => {
    console.error('Clip player error:', error, clip.youtubeId);
  }, [clip.youtubeId]);

  const handleTapToPlay = useCallback(() => {
    if (playerReady) {
      setIsPlaying(prev => !prev);
    }
  }, [playerReady]);

  const openInYouTube = useCallback(() => {
    const url = `https://www.youtube.com/watch?v=${clip.youtubeId}`;
    Linking.openURL(url).catch(err => console.error('Error opening YouTube:', err));
  }, [clip.youtubeId]);

  const formatViews = (count?: number) => {
    if (!count) return '';
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(0)}K`;
    return `${count}`;
  };

  const playerHeight = Math.round(SCREEN_WIDTH * (9 / 16));

  return (
    <View style={[styles.clipPage, { height }]}>
      <Image
        source={{ uri: clip.thumbnail }}
        style={StyleSheet.absoluteFillObject}
        blurRadius={20}
      />
      <View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0,0,0,0.5)' }]} />

      <View style={styles.playerWrapper}>
        {showPlayer && isActive ? (
          <View style={styles.ytPlayerContainer}>
            <YoutubePlayer
              ref={playerRef}
              videoId={clip.youtubeId}
              height={playerHeight}
              width={SCREEN_WIDTH}
              play={isPlaying}
              onReady={onPlayerReady}
              onError={onPlayerError}
              onChangeState={onStateChange}
              initialPlayerParams={{
                controls: false,
                modestbranding: true,
                rel: false,
                playsinline: true,
                preventFullScreen: true,
                loop: true,
              }}
              webViewStyle={styles.ytWebView}
            />
            {!playerReady && (
              <View style={styles.playerLoading}>
                <Image source={{ uri: clip.thumbnail }} style={StyleSheet.absoluteFillObject} />
                <View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0,0,0,0.4)' }]} />
                <ActivityIndicator size="large" color="#fff" />
              </View>
            )}
          </View>
        ) : (
          <TouchableOpacity
            style={styles.thumbnailContainer}
            activeOpacity={1}
            onPress={handleTapToPlay}
          >
            <Image source={{ uri: clip.thumbnail }} style={styles.thumbnailFull} resizeMode="cover" />
            <View style={styles.playOverlay}>
              <View style={styles.bigPlayBtn}>
                <Play size={40} color="#fff" fill="#fff" />
              </View>
            </View>
          </TouchableOpacity>
        )}
      </View>

      <TouchableOpacity
        onPress={openInYouTube}
        style={[styles.youtubeLink, { top: insets.top + 56 }]}
        activeOpacity={0.7}
      >
        <ExternalLink size={14} color="#fff" />
        <Text style={styles.youtubeLinkText}>YouTube</Text>
      </TouchableOpacity>

      <LinearGradient
        colors={['transparent', 'transparent', 'rgba(0,0,0,0.85)']}
        locations={[0, 0.5, 1]}
        style={styles.bottomGradient}
        pointerEvents="box-none"
      />

      <View style={[styles.sideActions, { bottom: insets.bottom + 100 }]} pointerEvents="box-none">
        <TouchableOpacity onPress={onToggleLike} activeOpacity={0.7} style={styles.sideBtn}>
          <Animated.View style={{ transform: [{ scale: likeScale }] }}>
            <Heart
              size={30}
              color={isLiked ? '#FF2D55' : '#fff'}
              fill={isLiked ? '#FF2D55' : 'transparent'}
            />
          </Animated.View>
          <Text style={styles.sideBtnLabel}>{isLiked ? 'Liked' : 'Like'}</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={onToggleSave} activeOpacity={0.7} style={styles.sideBtn}>
          <Animated.View style={{ transform: [{ scale: saveScale }] }}>
            <Bookmark
              size={28}
              color={isSaved ? '#FFD60A' : '#fff'}
              fill={isSaved ? '#FFD60A' : 'transparent'}
            />
          </Animated.View>
          <Text style={styles.sideBtnLabel}>{isSaved ? 'Saved' : 'Save'}</Text>
        </TouchableOpacity>

        <TouchableOpacity activeOpacity={0.7} style={styles.sideBtn}>
          <Share2 size={26} color="#fff" />
          <Text style={styles.sideBtnLabel}>Share</Text>
        </TouchableOpacity>

        {isAdmin && isAdminClip && (
          <TouchableOpacity onPress={onDelete} activeOpacity={0.7} style={styles.sideBtn}>
            <Trash2 size={24} color="#EF4444" />
            <Text style={[styles.sideBtnLabel, { color: '#EF4444' }]}>Delete</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={[styles.bottomInfo, { paddingBottom: insets.bottom + 16 }]} pointerEvents="none">
        <View style={styles.channelRow}>
          <View style={styles.channelIcon}>
            <Music2 size={14} color="#fff" />
          </View>
          <Text style={styles.channelName} numberOfLines={1}>{clip.channelTitle}</Text>
          {clip.isAdmin && (
            <View style={styles.adminTag}>
              <Text style={styles.adminTagText}>ADMIN</Text>
            </View>
          )}
        </View>
        <Text style={styles.clipTitle} numberOfLines={2}>{clip.title}</Text>
        {(clip.viewCountFormatted || clip.durationFormatted) && (
          <View style={styles.metaRow}>
            {clip.viewCount != null && clip.viewCount > 0 && (
              <View style={styles.metaItem}>
                <Eye size={12} color="rgba(255,255,255,0.7)" />
                <Text style={styles.metaText}>{formatViews(clip.viewCount)} views</Text>
              </View>
            )}
            {clip.durationFormatted && (
              <Text style={styles.metaText}>{clip.durationFormatted}</Text>
            )}
          </View>
        )}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    gap: 12,
  },
  loadingText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '500' as const,
    marginTop: 8,
  },
  emptyContainer: {
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    gap: 12,
    backgroundColor: '#000',
  },
  emptyText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600' as const,
  },
  emptySubtext: {
    color: '#888',
    fontSize: 14,
  },
  topBar: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    paddingHorizontal: 12,
    paddingBottom: 8,
    zIndex: 100,
  },
  topBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  topTitle: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700' as const,
    letterSpacing: -0.3,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  clipPage: {
    width: SCREEN_WIDTH,
    backgroundColor: '#000',
    position: 'relative' as const,
  },
  playerWrapper: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  ytPlayerContainer: {
    width: SCREEN_WIDTH,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    position: 'relative' as const,
  },
  ytWebView: {
    backgroundColor: '#000',
  },
  playerLoading: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    zIndex: 5,
  },
  pauseOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  thumbnailContainer: {
    flex: 1,
    width: '100%' as const,
  },
  thumbnailFull: {
    width: '100%' as const,
    height: '100%' as const,
  },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  bigPlayBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    paddingLeft: 4,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  youtubeLink: {
    position: 'absolute' as const,
    right: 12,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 4,
    backgroundColor: 'rgba(255,0,0,0.7)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    zIndex: 80,
  },
  youtubeLinkText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700' as const,
  },
  bottomGradient: {
    position: 'absolute' as const,
    bottom: 0,
    left: 0,
    right: 0,
    height: 300,
  },
  sideActions: {
    position: 'absolute' as const,
    right: 12,
    alignItems: 'center' as const,
    gap: 20,
    zIndex: 50,
  },
  sideBtn: {
    alignItems: 'center' as const,
    gap: 4,
  },
  sideBtnLabel: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600' as const,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  bottomInfo: {
    position: 'absolute' as const,
    bottom: 0,
    left: 0,
    right: 70,
    paddingHorizontal: 16,
    zIndex: 50,
  },
  channelRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
    marginBottom: 8,
  },
  channelIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  channelName: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700' as const,
    flex: 1,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  adminTag: {
    backgroundColor: '#FF2D55',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  adminTagText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '800' as const,
    letterSpacing: 0.5,
  },
  clipTitle: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '500' as const,
    lineHeight: 21,
    marginBottom: 6,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  metaRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 10,
  },
  metaItem: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 4,
  },
  metaText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    fontWeight: '500' as const,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end' as const,
  },
  modalContent: {
    backgroundColor: '#1C1C1E',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  modalTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700' as const,
  },
  modalBody: {
    padding: 20,
  },
  inputLabel: {
    color: '#999',
    fontSize: 13,
    fontWeight: '600' as const,
    marginBottom: 6,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.8,
  },
  input: {
    backgroundColor: '#2C2C2E',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#fff',
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
    backgroundColor: '#FF2D55',
    marginTop: 4,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700' as const,
  },
});
