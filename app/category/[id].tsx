import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Image,
  Modal,
  TextInput,
  Alert,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { ArrowLeft, Edit3, X, Quote, Upload, Camera } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { SpeechCard } from '@/components/SpeechCard';
import { categories, churchCategory, athleteCategory, classifyVideoToCategory } from '@/mocks/speeches';
import { useSpeechContext } from '@/hooks/speech-context';
import type { Speech } from '@/types/speech';
import { getVideosByCategory, getTrendingVideos, convertVideoToSpeech } from '@/services/youtubeService';
import { YouTubeContentManager } from '@/services/YouTubeContentManager';
import type { CachedVideo } from '@/services/YouTubeContentManager';
import { useTheme } from '@/hooks/theme-context';
import { useAdMob } from '@/hooks/admob-context';
import { useAdmin } from '@/hooks/admin-context';
import { useUserProfile } from '@/hooks/user-profile-context';
import { CategoryBanner } from '@/mocks/categoryBanners';

const motivationHeroImage = require('@/assets/images/run club.jpeg');

// Freshness window for skipping the live refresh on category entry — mirrors
// the ContentManager's 24h discovery policy.
const CATEGORY_CACHE_FRESH_MS = 1000 * 60 * 60 * 24;

const CHRISTIAN_KEYWORDS = [
  'christian', 'church', 'jesus', 'christ', 'god', 'lord', 'faith',
  'bible', 'scripture', 'gospel', 'prayer', 'worship', 'sermon',
  'pastor', 'holy spirit', 'christian motivation', 'biblical',
  'ministry', 'preaching',
];

const isChristianContent = (title: string, description?: string): boolean => {
  const haystack = `${title} ${description ?? ''}`.toLowerCase();
  return CHRISTIAN_KEYWORDS.some(k => haystack.includes(k));
};

/** Convert a persisted CachedVideo into the Speech shape used by the UI. */
const cachedVideoToSpeech = (video: CachedVideo): Speech => ({
  id: video.id,
  title: video.title,
  speaker: video.channelTitle,
  duration: video.duration,
  category: video.category,
  imageUrl: video.thumbnail,
  audioUrl: `https://www.youtube.com/watch?v=${video.id}`,
  youtubeId: video.id,
  description: video.description,
  playCount: Math.floor(video.viewCount / 1000),
  tags: [],
});

export default function CategoryScreen() {
  const { colors } = useTheme();
  const { id } = useLocalSearchParams();
  const { toggleFavorite, setCurrentSpeech, setCurrentPlaylist } = useSpeechContext();

  const rawId = Array.isArray(id) ? id[0] : id;
  const categoryId = String(rawId ?? '');

  const allCategories = [...categories, churchCategory, athleteCategory];
  const category = allCategories.find(c => c.id === categoryId);
  const TARGET_CATEGORY_COUNT = 40;

  const isChristianCategory =
    category?.id === 'church' ||
    ['christian motivation', 'christian', 'church']
      .includes((category?.name || '').trim().toLowerCase());

  const requireChristianContent = isChristianCategory;

  // CACHE-FIRST SEED (synchronous, memory-only): when the manager's memory
  // layer is warm (prewarm or any earlier open populated it), the cached pool
  // for this exact category becomes the INITIAL component state — videos are
  // on screen at first paint with zero spinner and zero network. When the
  // memory layer is cold, initial state is empty/loading and the load effect's
  // fast async cache read (one AsyncStorage read) fills it before any network.
  const cachedSeed = category
    ? YouTubeContentManager.getCachedVideosSync(category.name)
    : null;
  const usableSeed = (cachedSeed ?? [])
    .filter(v =>
      v && v.id && v.duration > 60 &&
      (!requireChristianContent || isChristianContent(v.title, v.description))
    )
    .slice(0, TARGET_CATEGORY_COUNT);

  const [hasLoadedOnline, setHasLoadedOnline] = useState(false);
  const [youtubeSpeeches, setYoutubeSpeeches] = useState<Speech[]>(() =>
    usableSeed.map(cachedVideoToSpeech)
  );
  const [categoryLoading, setCategoryLoading] = useState<boolean>(
    usableSeed.length === 0
  );
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const { tryShowInterstitialOnTransition } = useAdMob();
  const { isAdmin, getBannerForCategory, updateBanner } = useAdmin();
  const { profile } = useUserProfile();
  const styles = getStyles(colors);

  const [showEditBanner, setShowEditBanner] = useState(false);
  const [editQuote, setEditQuote] = useState('');
  const [editAuthor, setEditAuthor] = useState('');
  const [editImageUrl, setEditImageUrl] = useState('');
  const [isPickingImage, setIsPickingImage] = useState(false);
  const [bannerImageUri, setBannerImageUri] = useState<string>('');
  const [useLocalMotivationHero, setUseLocalMotivationHero] = useState(false);

  const pickBannerImage = useCallback(async () => {
    try {
      setIsPickingImage(true);
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please allow access to your photo library.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
      });
      if (!result.canceled && result.assets[0]) {
        console.log('Banner image picked:', result.assets[0].uri);
        setEditImageUrl(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking banner image:', error);
      Alert.alert('Error', 'Failed to pick image');
    } finally {
      setIsPickingImage(false);
    }
  }, []);

  const takeBannerPhoto = useCallback(async () => {
    try {
      setIsPickingImage(true);
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please allow camera access.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
      });
      if (!result.canceled && result.assets[0]) {
        console.log('Banner photo taken:', result.assets[0].uri);
        setEditImageUrl(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error taking banner photo:', error);
      Alert.alert('Error', 'Failed to take photo');
    } finally {
      setIsPickingImage(false);
    }
  }, []);

  const CATEGORY_SEARCH_PROFILES: Record<string, string[]> = {
    Motivation: [
      'David Goggins motivational speech',
      'Eric Thomas motivational speech',
      'Les Brown motivational speech',
      'Tony Robbins motivational speech',
      'best powerful motivational speech',
    ],
    Success: [
      'Jim Rohn success motivational speech',
      'Tony Robbins success speech',
      'Les Brown success motivation',
      'Brian Tracy success motivational speech',
      'success achievement motivational speech',
    ],
    Mindset: [
      'David Goggins mental toughness mindset',
      'Jocko Willink discipline mindset',
      'Les Brown mindset motivational speech',
      'growth mindset motivational speech',
      'mental toughness motivational speech',
    ],
    Fitness: [
      'David Goggins workout motivation',
      'CT Fletcher gym motivational speech',
      'Jocko Willink workout discipline',
      'fitness workout motivational speech',
      'bodybuilding gym motivation',
    ],
    Study: [
      'study motivation speech students',
      'exam motivation students',
      'student discipline motivational speech',
      'study hard motivational speech',
      'academic success motivation',
    ],
    'Christian Motivation': [
      'powerful Christian motivational sermon preacher',
      'Christian sermon faith motivation Jesus',
      'TD Jakes motivational sermon',
      'Priscilla Shirer motivational sermon',
      'Steven Furtick motivational sermon',
    ],
    'Athlete Pump Up': [
      'Eric Thomas athlete motivational speech',
      'Eric Thomas sports motivation',
      'Ray Lewis motivational speech sports',
      'Coach Pain athlete motivation',
      'athlete locker room pump up motivational speech',
    ],
  };
  const isChristianContentForSpeech = (speech: Speech) =>
    isChristianContent(speech.title, speech.description);

  const categorySpeeches = useMemo(() => {
    const unique: Speech[] = [];
    const seen = new Set<string>();

    for (const s of youtubeSpeeches) {
      if (!s || !s.id || seen.has(s.id) || s.duration <= 60) continue;
      if (requireChristianContent && !isChristianContentForSpeech(s)) continue;

      seen.add(s.id);
      unique.push(s);
      if (unique.length >= TARGET_CATEGORY_COUNT) break;
    }
    return unique;
  }, [youtubeSpeeches, requireChristianContent]);

  const banner: CategoryBanner | null = category ? getBannerForCategory(categoryId, category.name) : null;

  const isMotivationCategory = (category?.name || '').toLowerCase() === 'motivation';

  useEffect(() => {
    console.log('[Category] route id:', categoryId);
    console.log('[Category] resolved category:', category?.name);
if (isMotivationCategory) {
      setUseLocalMotivationHero(true);
      setBannerImageUri('');
      return;
    }
    const fallback = 'https://images.unsplash.com/photo-1499209974431-9dddcece7f88?auto=format&fit=crop&w=1400&q=80';
    const next = banner?.imageUrl?.trim() ? banner.imageUrl.trim() : fallback;
    setUseLocalMotivationHero(false);
    setBannerImageUri(next);
  }, [banner?.imageUrl, isMotivationCategory, isChristianCategory, category, categoryId]);

  // Reset online-sourced data whenever the category (route id) changes.
  // The FIRST mount is skipped: initial state was already seeded synchronously
  // from the manager's memory cache, and clearing here would wipe that instant
  // cache-first render. On an actual category switch the old category's pool
  // is cleared so pools never contaminate each other; the new category's own
  // cached pool is then restored by the load effect's cache-first read.
  const prevCategoryIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (prevCategoryIdRef.current === categoryId) return;
    const isFirstMount = prevCategoryIdRef.current === null;
    prevCategoryIdRef.current = categoryId;
    if (isFirstMount) return;

    setHasLoadedOnline(false);
    setYoutubeSpeeches([]);
    setCategoryError(null);
    setCategoryLoading(true);
  }, [categoryId]);

  // Retry re-runs the cache-first load. Currently visible videos are KEPT:
  // the reload seeds from cache and merges, never blanking the screen.
  const handleRetry = useCallback(() => {
    setHasLoadedOnline(false);
    setCategoryError(null);
    if (categorySpeeches.length === 0) {
      setCategoryLoading(true);
    }
  }, [categorySpeeches.length]);

  useEffect(() => {
    let cancelled = false;

    const handleLoadOnlineSpeeches = async () => {
      if (!category || hasLoadedOnline) return;

      setCategoryError(null);

      const searchQueries =
        CATEGORY_SEARCH_PROFILES[category.name] ?? [
          `${category.name} motivational speech`,
        ];

      console.log(
        '[Category] live profile:',
        category.name,
        searchQueries
      );

      const categoryNameLower = category.name.toLowerCase();
      const categoryWords = categoryNameLower
        .split(/[^a-z0-9]+/i)
        .map(w => w.trim())
        .filter(Boolean);

      const scoreSpeechRelevance = (speech: Speech) => {
        const haystack =
          `${speech.title} ${speech.description ?? ''}`.toLowerCase();

        let score = 0;

        if (haystack.includes(categoryNameLower)) {
          score += 4;
        }

        for (const word of categoryWords) {
          if (word.length > 2 && haystack.includes(word)) {
            score += 1;
          }
        }

        const assigned = classifyVideoToCategory(
          speech.title,
          speech.description
        );

        if (assigned === category.name) {
          score += 3;
        }

        return score;
      };

      const convertAndRank = (videos: any[]): Speech[] =>
        videos
          .map(video => convertVideoToSpeech(video))
          .map(speech => ({
            speech,
            score: scoreSpeechRelevance(speech),
          }))
          .sort((a, b) => b.score - a.score)
          .map(item => item.speech);

      const keepCategoryContent = (
        speeches: Speech[]
      ): Speech[] => {
        if (requireChristianContent) {
          return speeches.filter(isChristianContentForSpeech);
        }

        return speeches;
      };

      const mergeUnique = (
        current: Speech[],
        incoming: Speech[]
      ): Speech[] => {
        const seenIds = new Set(
          current.map(speech => speech.id)
        );

        const merged = [...current];

        const preferred = incoming.filter(
          speech => speech.duration > 60
        );

        const remaining = incoming.filter(
          speech => speech.duration <= 60
        );

        for (const speech of [...preferred, ...remaining]) {
          if (
            !speech ||
            !speech.id ||
            seenIds.has(speech.id)
          ) {
            continue;
          }

          seenIds.add(speech.id);
          merged.push(speech);

          if (
            merged.length >= TARGET_CATEGORY_COUNT
          ) {
            break;
          }
        }

        return merged.slice(
          0,
          TARGET_CATEGORY_COUNT
        );
      };

      /*
       * CACHE-FIRST: render the persisted pool for this exact category
       * BEFORE any network work. Memory hit = effectively instant;
       * otherwise one AsyncStorage read. This path never fetches, never
       * refreshes, never ranks live results and never checks quota.
       * Cached videos go on screen immediately; the live refresh below
       * then runs in the background and MERGES without clearing.
       */
      let accumulated: Speech[] = [];

      try {
        const cachedPool = await YouTubeContentManager.getCachedVideosForCategory(
          category.name
        );

        if (cancelled) return;

        accumulated = cachedPool
          .filter(v => v && v.id && v.duration > 60)
          .map(cachedVideoToSpeech);

        if (requireChristianContent) {
          accumulated = accumulated.filter(isChristianContentForSpeech);
        }

        accumulated = accumulated.slice(0, TARGET_CATEGORY_COUNT);

        if (accumulated.length > 0) {
          console.log(
            '[Category] cache-first render:',
            accumulated.length,
            'cached videos for',
            category.name
          );

          setYoutubeSpeeches(accumulated);
          setCategoryError(null);
          setCategoryLoading(false);
        }
      } catch (cacheError) {
        console.log('[Category] cache-first read failed:', cacheError);
      }

      if (accumulated.length === 0) {
        // Genuinely nothing usable to show yet — only now is a loading
        // state correct while the first live fetch runs.
        setCategoryLoading(true);
      }

      /*
       * REFRESH ONLY IF NEEDED: a full pool refreshed within the freshness
       * window needs NO network request on this open at all. Undersized or
       * stale pools fall through to the background live refresh below while
       * their cached videos stay visible.
       */
      if (accumulated.length >= TARGET_CATEGORY_COUNT) {
        let cacheIsFresh = false;
        try {
          const ageMs = await YouTubeContentManager.getLastRefreshAgeMs(
            category.name
          );
          cacheIsFresh = ageMs != null && ageMs < CATEGORY_CACHE_FRESH_MS;
        } catch {}

        if (cacheIsFresh) {
          console.log(
            '[Category] full fresh cache — skipping live refresh for',
            category.name
          );
          setHasLoadedOnline(true);
          if (!cancelled) setCategoryLoading(false);
          return;
        }
      }

      try {
        /*
         * FIRST PAINT:
         * Request only the strongest category-specific
         * search first.
         */
        try {
          const firstRaw = await getVideosByCategory(
            category.name,
            TARGET_CATEGORY_COUNT
          );

          if (cancelled) return;

          const firstSpeeches = keepCategoryContent(
            convertAndRank(
              Array.isArray(firstRaw)
                ? firstRaw
                : []
            )
          );

          accumulated = mergeUnique(
            accumulated,
            firstSpeeches
          );

          if (accumulated.length > 0) {
            console.log(
              '[Category] immediate first batch:',
              accumulated.length
            );

            setYoutubeSpeeches([
              ...accumulated,
            ]);

            setCategoryError(null);

            /*
             * Useful live results are visible now.
             * Secondary requests can continue without
             * holding the full-screen loading state.
             */
            setCategoryLoading(false);
          }
        } catch (firstError) {
          console.log(
            '[Category] primary search failed:',
            firstError
          );
        }

        /*
         * CATEGORY-SPECIFIC FILL:
         * Run the remaining speaker/topic searches
         * concurrently.
         */
        if (
          accumulated.length <
          TARGET_CATEGORY_COUNT
        ) {
          const secondaryResults =
            await Promise.allSettled(
              searchQueries
                .slice(1)
                .map(searchQuery =>
                  getVideosByCategory(
                    searchQuery,
                    TARGET_CATEGORY_COUNT
                  )
                )
            );

          if (cancelled) return;

          for (const result of secondaryResults) {
            if (
              result.status !== 'fulfilled'
            ) {
              continue;
            }

            const speeches = keepCategoryContent(
              convertAndRank(
                Array.isArray(result.value)
                  ? result.value
                  : []
              )
            );

            accumulated = mergeUnique(
              accumulated,
              speeches
            );

            if (accumulated.length > 0) {
              setYoutubeSpeeches([
                ...accumulated,
              ]);

              setCategoryError(null);
              setCategoryLoading(false);
            }

            if (
              accumulated.length >=
              TARGET_CATEGORY_COUNT
            ) {
              break;
            }
          }
        }

        /*
         * TRENDING FILL:
         * Only use trending videos that actually score
         * as relevant to the selected category.
         */
        if (
          accumulated.length <
          TARGET_CATEGORY_COUNT
        ) {
          try {
            const trendingRaw =
              await getTrendingVideos(
                TARGET_CATEGORY_COUNT
              );

            if (cancelled) return;

            const relevantTrending =
              keepCategoryContent(
                convertAndRank(
                  Array.isArray(trendingRaw)
                    ? trendingRaw
                    : []
                ).filter(
                  speech =>
                    scoreSpeechRelevance(speech) >= 3
                )
              );

            accumulated = mergeUnique(
              accumulated,
              relevantTrending
            );

            if (accumulated.length > 0) {
              setYoutubeSpeeches([
                ...accumulated,
              ]);

              setCategoryError(null);
            }
          } catch (trendingError) {
            console.log(
              '[Category] trending fill failed:',
              trendingError
            );
          }
        }

        if (cancelled) return;

        console.log(
          '[Category] final live count:',
          accumulated.length,
          'target:',
          TARGET_CATEGORY_COUNT
        );

        if (accumulated.length > 0) {
          setYoutubeSpeeches(
            accumulated.slice(
              0,
              TARGET_CATEGORY_COUNT
            )
          );

          setCategoryError(null);
        } else {
          // Keep whatever is on screen; only report the empty result.
          setCategoryError(
            'No content found for this category. Please try again.'
          );
        }

        setHasLoadedOnline(true);
      } catch (error) {
        if (cancelled) return;

        console.error(
          '[Category] load error:',
          error
        );

        // A failed refresh must never replace cached videos with an error
        // state — only surface an error when there is nothing to show.
        if (accumulated.length === 0) {
          setCategoryError(
            'Failed to load content for this category.'
          );
        }
      } finally {
        if (!cancelled) {
          setCategoryLoading(false);
        }
      }
    };

    console.log(
      '[Category] page loaded, category:',
      category?.name
    );

    void handleLoadOnlineSpeeches();

    return () => {
      cancelled = true;
    };
  }, [
    category,
    categoryId,
    hasLoadedOnline,
    isChristianCategory,
    requireChristianContent,
  ]);
  const handleSpeechPress = async (speech: Speech) => {
    console.log('Selected speech:', speech.title);
    try {
      await tryShowInterstitialOnTransition();
    } catch {}
    const validSpeeches = categorySpeeches.filter(s => s && typeof s === 'object' && s.id && s.title);
    setCurrentPlaylist(validSpeeches);
    setCurrentSpeech(speech);
    router.push('/player');
  };

  const handleOpenEditBanner = useCallback(() => {
    if (!banner) return;
    setEditQuote(banner.quote);
    setEditAuthor(banner.author);
    setEditImageUrl(banner.imageUrl);
    setShowEditBanner(true);
  }, [banner]);

  const handleSaveBanner = useCallback(async () => {
    if (!category || !banner) return;
    if (!editAuthor.trim()) {
      Alert.alert('Missing Fields', 'Please fill in the author field.');
      return;
    }
    await updateBanner({
      ...banner,
      quote: editQuote.trim(),
      author: editAuthor.trim(),
      imageUrl: editImageUrl.trim() || banner.imageUrl,
    });
    setShowEditBanner(false);
    if (Platform.OS !== 'web') {
      Alert.alert('Saved', 'Banner updated successfully.');
    }
  }, [category, banner, editQuote, editAuthor, editImageUrl, updateBanner]);

  if (!category) {
    return (
      <LinearGradient colors={[colors.background, colors.card]} style={styles.container}>
        <View style={styles.safeArea}>
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>Category not found</Text>
          </View>
        </View>
      </LinearGradient>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />
      <LinearGradient
        colors={[colors.background, colors.card]}
        style={styles.container}
      >
        <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
          <View style={styles.headerBar}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <ArrowLeft size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{category.name}</Text>
            <View style={styles.backButton} />
          </View>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {banner && (
            <View style={styles.bannerContainer}>
              <Image
                source={useLocalMotivationHero ? motivationHeroImage : { uri: bannerImageUri }}
                style={styles.bannerImage}
                onError={() => {
                  if (useLocalMotivationHero) {
                    setUseLocalMotivationHero(false);
                    setBannerImageUri('https://images.unsplash.com/photo-1499209974431-9dddcece7f88?auto=format&fit=crop&w=1400&q=80');
                    return;
                  }
                  setBannerImageUri('https://images.unsplash.com/photo-1499209974431-9dddcece7f88?auto=format&fit=crop&w=1400&q=80');
                }}
              />
              <LinearGradient
                colors={['rgba(0,0,0,0.08)', 'rgba(0,0,0,0.25)', 'rgba(0,0,0,0.45)']}
                style={styles.bannerGradient}
              >
                {isAdmin && (
                  <TouchableOpacity
                    style={styles.editBannerBtn}
                    onPress={handleOpenEditBanner}
                    activeOpacity={0.7}
                  >
                    <Edit3 size={14} color="#fff" />
                    <Text style={styles.editBannerText}>Edit</Text>
                  </TouchableOpacity>
                )}
              </LinearGradient>
            </View>
          )}

          {banner && (
            <View style={styles.bannerQuoteCard}>
              <View style={styles.bannerContent}>
                <View style={styles.bannerQuoteIcon}>
                  <Quote size={18} color={category.color} fill={category.color} />
                </View>
                <Text style={styles.bannerQuote} numberOfLines={3}>
                  {'"'}{banner.quote}{'"'}
                </Text>
                <View style={[styles.bannerAccentLine, { backgroundColor: category.color }]} />
                <Text style={styles.bannerAuthor}>- {banner.author}</Text>
              </View>
            </View>
          )}

          <View style={[styles.header, { backgroundColor: category.color + '20' }]}>
            <Text style={styles.title}>{category.name}</Text>
          </View>

          <View style={styles.speechList}>
            {categoryLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={category.color} />
                <Text style={styles.loadingText}>Loading {category.name} content...</Text>
              </View>
            ) : categorySpeeches.length === 0 ? (
              <View style={styles.loadingContainer}>
                <Text style={styles.emptyText}>
                  {categoryError || 'No content found for this category.'}
                </Text>
                <TouchableOpacity style={styles.retryButton} onPress={handleRetry} activeOpacity={0.8}>
                  <Text style={styles.retryButtonText}>Retry</Text>
                </TouchableOpacity>
              </View>
            ) : (
              categorySpeeches
                .filter(speech => speech && typeof speech === 'object' && speech.id && speech.title)
                .map((speech, index) => (
                  <SpeechCard
                    key={`category-speech-${speech.id}-${index}`}
                    speech={speech}
                    onPress={() => handleSpeechPress(speech)}
                    onFavorite={() => toggleFavorite(speech.id)}
                  />
                ))
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>

    <Modal
      visible={showEditBanner}
      transparent
      animationType="slide"
      onRequestClose={() => setShowEditBanner(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Edit Banner</Text>
            <TouchableOpacity onPress={() => setShowEditBanner(false)}>
              <X size={22} color="#999" />
            </TouchableOpacity>
          </View>
          <View style={styles.modalBody}>
            <Text style={styles.inputLabel}>Quote</Text>
            <TextInput
              style={[styles.input, styles.inputMultiline]}
              value={editQuote}
              onChangeText={setEditQuote}
              placeholder="Motivational quote..."
              placeholderTextColor="#666"
              multiline
              numberOfLines={3}
            />
            <Text style={styles.inputLabel}>Author</Text>
            <TextInput
              style={styles.input}
              value={editAuthor}
              onChangeText={setEditAuthor}
              placeholder="Quote author..."
              placeholderTextColor="#666"
            />
            <Text style={styles.inputLabel}>Banner Image</Text>
            <View style={styles.imagePickerRow}>
              <TouchableOpacity
                style={styles.imagePickerBtn}
                onPress={pickBannerImage}
                activeOpacity={0.7}
                disabled={isPickingImage}
              >
                {isPickingImage ? (
                  <ActivityIndicator size="small" color="#3B82F6" />
                ) : (
                  <Upload size={18} color="#3B82F6" />
                )}
                <Text style={styles.imagePickerBtnText}>Gallery</Text>
              </TouchableOpacity>
              {Platform.OS !== 'web' && (
                <TouchableOpacity
                  style={styles.imagePickerBtn}
                  onPress={takeBannerPhoto}
                  activeOpacity={0.7}
                  disabled={isPickingImage}
                >
                  <Camera size={18} color="#10B981" />
                  <Text style={[styles.imagePickerBtnText, { color: '#10B981' }]}>Camera</Text>
                </TouchableOpacity>
              )}
            </View>
            <Text style={styles.orText}>or paste URL</Text>
            <TextInput
              style={styles.input}
              value={editImageUrl}
              onChangeText={setEditImageUrl}
              placeholder="https://images.unsplash.com/..."
              placeholderTextColor="#666"
              autoCapitalize="none"
            />
            {editImageUrl.trim().length > 10 && (
              <View style={styles.previewContainer}>
                <Image
                  source={{ uri: editImageUrl.trim() }}
                  style={styles.previewImage}
                />
              </View>
            )}
            <TouchableOpacity style={styles.saveButton} onPress={handleSaveBanner} activeOpacity={0.8}>
              <Text style={styles.saveButtonText}>Save Banner</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
    </>
  );
}

const getStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  bannerContainer: {
    width: '100%',
    height: 240,
    position: 'relative',
    overflow: 'hidden',
  },
  bannerImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  bannerGradient: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: 20,
    position: 'relative',
  },
  bannerQuoteCard: {
    backgroundColor: 'rgba(0,0,0,0.55)',
    marginHorizontal: 16,
    marginTop: 10,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  bannerContent: {
    gap: 6,
  },
  bannerQuoteIcon: {
    marginBottom: 4,
  },
  bannerQuote: {
    color: 'rgba(255,255,255,0.95)',
    fontSize: 18,
    fontWeight: '600',
    lineHeight: 26,
    fontStyle: 'italic',
  },
  bannerAccentLine: {
    width: 40,
    height: 3,
    borderRadius: 2,
    marginTop: 6,
    marginBottom: 4,
  },
  bannerAuthor: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    fontWeight: '500',
  },
  editBannerBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  editBannerText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  header: {
    alignItems: 'center',
    paddingVertical: 14,
    marginBottom: 8,
  },
  title: {
    color: colors.text,
    fontSize: 20,
    fontWeight: 'bold',
  },
  speechCount: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  speechList: {
    paddingTop: 8,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  loadingText: {
    color: colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: colors.primary || '#3B82F6',
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 10,
    marginTop: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700' as const,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: colors.text,
    fontSize: 18,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.card,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1C1C1E',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  modalTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  modalBody: {
    padding: 20,
  },
  inputLabel: {
    color: '#999',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
    textTransform: 'uppercase',
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
  inputMultiline: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  previewContainer: {
    height: 120,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  imagePickerRow: {
    flexDirection: 'row' as const,
    gap: 12,
    marginBottom: 12,
  },
  imagePickerBtn: {
    flex: 1,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  imagePickerBtnText: {
    color: '#3B82F6',
    fontSize: 14,
    fontWeight: '600' as const,
  },
  orText: {
    color: '#666',
    fontSize: 12,
    fontWeight: '500' as const,
    textAlign: 'center' as const,
    marginBottom: 8,
  },
  saveButton: {
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: colors.primary || '#3B82F6',
    marginTop: 4,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700' as const,
  },
});
