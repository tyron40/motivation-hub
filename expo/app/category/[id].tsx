import React, { useEffect, useState, useCallback, useMemo } from 'react';
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
import { getVideosByCategory, convertVideoToSpeech } from '@/services/youtubeService';
import { useTheme } from '@/hooks/theme-context';
import { useAdMob } from '@/hooks/admob-context';
import { useAdmin } from '@/hooks/admin-context';
import { useUserProfile } from '@/hooks/user-profile-context';
import { CategoryBanner } from '@/mocks/categoryBanners';
  const CATEGORY_SEARCH_QUERIES: Record<string, string[]> = {
    motivation: [
      'motivational speech inspiration discipline perseverance',
      'powerful motivation speech never give up',
    ],
    success: [
      'success motivational speech entrepreneurship achievement goals',
      'business success leadership ambition motivational speech',
    ],
    mindset: [
      'mindset motivational speech mental toughness focus habits',
      'growth mindset discipline confidence motivational speech',
    ],
    fitness: [
      'fitness motivation gym workout training strength speech',
      'workout motivation bodybuilding fitness discipline speech',
    ],
    study: [
      'study motivation productivity focus student education speech',
      'exam study motivation concentration discipline students',
    ],
    church: [
      'Christian motivational sermon faith Jesus God Bible',
      'Christian motivation church sermon inspirational message',
      'faith motivation Jesus scripture sermon',
    ],
    athlete: [
      'athlete motivation sports pregame pump up speech',
      'sports motivational speech championship training athlete',
    ],
  };

  const CATEGORY_KEYWORDS: Record<string, string[]> = {
    motivation: [
      'motivation', 'motivational', 'inspiration', 'inspirational',
      'discipline', 'perseverance', 'never give up',
    ],
    success: [
      'success', 'successful', 'achievement', 'goals', 'entrepreneur',
      'business', 'leadership', 'wealth', 'ambition',
    ],
    mindset: [
      'mindset', 'mental toughness', 'growth mindset', 'focus',
      'confidence', 'habits', 'psychology', 'self belief',
    ],
    fitness: [
      'fitness', 'gym', 'workout', 'training', 'bodybuilding',
      'strength', 'exercise', 'muscle',
    ],
    study: [
      'study', 'student', 'school', 'exam', 'education',
      'productivity', 'concentration', 'learning',
    ],
    church: [
      'christian', 'church', 'jesus', 'christ', 'god', 'lord',
      'faith', 'bible', 'scripture', 'gospel', 'prayer',
      'worship', 'sermon', 'pastor', 'holy spirit',
    ],
    athlete: [
      'athlete', 'athletic', 'sports', 'pregame', 'game day',
      'championship', 'football', 'basketball', 'soccer',
      'training', 'competition',
    ],
  };

  const getCategorySearchKey = (id: string, name: string) => {
    const normalizedId = id.trim().toLowerCase();
    const normalizedName = name.trim().toLowerCase();

    if (normalizedId === 'church' || normalizedName.includes('christian')) return 'church';
    if (normalizedId === 'athlete' || normalizedName.includes('athlete')) return 'athlete';
    if (normalizedName.includes('success')) return 'success';
    if (normalizedName.includes('mindset')) return 'mindset';
    if (normalizedName.includes('fitness')) return 'fitness';
    if (normalizedName.includes('study')) return 'study';

    return 'motivation';
  };
const motivationHeroImage = require('@/assets/images/run club.jpeg');

export default function CategoryScreen() {
  const { colors } = useTheme();
  const { id } = useLocalSearchParams();
  const { toggleFavorite, setCurrentSpeech, setCurrentPlaylist, getSpeechesByCategory } = useSpeechContext();

  const rawId = Array.isArray(id) ? id[0] : id;
  const categoryId = String(rawId ?? '');

  const [hasLoadedOnline, setHasLoadedOnline] = useState(false);
  const [youtubeSpeeches, setYoutubeSpeeches] = useState<Speech[]>([]);
  const [categoryLoading, setCategoryLoading] = useState(false);
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

  const allCategories = [...categories, churchCategory, athleteCategory];
  const category = allCategories.find(c => c.id === categoryId);
  const contextSpeeches = useMemo(
    () => (category ? getSpeechesByCategory(category.name).filter(s => s.duration > 60) : []),
    [category, getSpeechesByCategory]
  );
  const TARGET_CATEGORY_COUNT = 40;
  const isChristianOnlyMode = !!profile.includeChurchMotivation;

  const isChristianCategory =
    category?.id === 'church' ||
    ['christian motivation', 'christian', 'church']
      .includes((category?.name || '').trim().toLowerCase());

  const requireChristianContent = isChristianCategory || isChristianOnlyMode;

  const isChristianContent = (speech: Speech) => {
    const haystack = `${speech.title} ${speech.description ?? ''}`.toLowerCase();
    const christianKeywords = [
      'christian', 'church', 'jesus', 'christ', 'god', 'lord', 'faith',
      'bible', 'scripture', 'gospel', 'prayer', 'worship', 'sermon',
      'pastor', 'holy spirit', 'christian motivation', 'biblical',
      'ministry', 'preaching',
    ];
    return christianKeywords.some(k => haystack.includes(k));
  };

  const categorySpeeches = useMemo(() => {
    const base = youtubeSpeeches.length > 0 ? youtubeSpeeches : contextSpeeches;
    const unique: Speech[] = [];
    const seen = new Set<string>();

    for (const s of [...base, ...contextSpeeches]) {
      if (!s || !s.id || seen.has(s.id) || s.duration <= 60) continue;
      if (requireChristianContent && !isChristianContent(s)) continue;

      seen.add(s.id);
      unique.push(s);
      if (unique.length >= TARGET_CATEGORY_COUNT) break;
    }
    return unique;
  }, [youtubeSpeeches, contextSpeeches, requireChristianContent]);

  const banner: CategoryBanner | null = category ? getBannerForCategory(categoryId, category.name) : null;

  const isMotivationCategory = (category?.name || '').toLowerCase() === 'motivation';

  useEffect(() => {
    console.log('[Category] route id:', categoryId);
    console.log('[Category] resolved category:', category?.name);

    if (isChristianOnlyMode && category && !isChristianCategory && categoryId !== 'church') {
      router.replace('/category/church');
      return;
    }

    if (isMotivationCategory) {
      setUseLocalMotivationHero(true);
      setBannerImageUri('');
      return;
    }
    const fallback = 'https://images.unsplash.com/photo-1499209974431-9dddcece7f88?auto=format&fit=crop&w=1400&q=80';
    const next = banner?.imageUrl?.trim() ? banner.imageUrl.trim() : fallback;
    setUseLocalMotivationHero(false);
    setBannerImageUri(next);
  }, [banner?.imageUrl, isMotivationCategory, isChristianOnlyMode, isChristianCategory, category, categoryId]);

  // Reset online-sourced data whenever the category (route id) changes
  useEffect(() => {
    setHasLoadedOnline(false);
    setYoutubeSpeeches([]);
    setCategoryError(null);
  }, [categoryId]);

  const handleRetry = useCallback(() => {
    setHasLoadedOnline(false);
    setYoutubeSpeeches([]);
    setCategoryError(null);
  }, []);

  useEffect(() => {
    const handleLoadOnlineSpeeches = async () => {
      if (!category || hasLoadedOnline) return;

      setCategoryLoading(true);
      setCategoryError(null);

      const searchKey = getCategorySearchKey(categoryId, category.name);
      const searchQueries = CATEGORY_SEARCH_QUERIES[searchKey] ?? CATEGORY_SEARCH_QUERIES.motivation;
      const requiredKeywords = CATEGORY_KEYWORDS[searchKey] ?? CATEGORY_KEYWORDS.motivation;

      console.log('[Category] search key:', searchKey);
      console.log('[Category] queries:', searchQueries);

      try {
        const settled = await Promise.allSettled(
          searchQueries.map(query =>
            getVideosByCategory(query, TARGET_CATEGORY_COUNT)
          )
        );

        const rawVideos = settled.flatMap(result =>
          result.status === 'fulfilled' && Array.isArray(result.value)
            ? result.value
            : []
        );

        const scoreSpeechRelevance = (speech: Speech) => {
          const haystack =
            `${speech.title} ${speech.description ?? ''}`.toLowerCase();

          let score = 0;

          for (const keyword of requiredKeywords) {
            if (haystack.includes(keyword)) {
              score += keyword.includes(' ') ? 3 : 2;
            }
          }

          const assigned = classifyVideoToCategory(
            speech.title,
            speech.description
          );

          if (
            assigned &&
            assigned.toLowerCase() === category.name.toLowerCase()
          ) {
            score += 4;
          }

          return score;
        };

        const strictThreshold =
          searchKey === 'church' ? 2 :
          searchKey === 'motivation' ? 2 :
          3;

        const onlineSpeeches = rawVideos
          .map(video => convertVideoToSpeech(video))
          .filter(
            speech =>
              speech &&
              speech.id &&
              speech.duration > 60
          )
          .map(speech => ({
            speech,
            score: scoreSpeechRelevance(speech),
          }))
          .filter(item => item.score >= strictThreshold)
          .sort((a, b) => b.score - a.score)
          .map(item => item.speech);

        const unique: Speech[] = [];
        const seenIds = new Set<string>();

        for (const speech of onlineSpeeches) {
          if (seenIds.has(speech.id)) continue;

          if (searchKey === 'church' && !isChristianContent(speech)) {
            continue;
          }

          seenIds.add(speech.id);
          unique.push(speech);

          if (unique.length >= TARGET_CATEGORY_COUNT) break;
        }

        if (unique.length < TARGET_CATEGORY_COUNT) {
          for (const speech of contextSpeeches) {
            if (!speech?.id || seenIds.has(speech.id)) continue;

            const score = scoreSpeechRelevance(speech);

            if (searchKey === 'church' && !isChristianContent(speech)) {
              continue;
            }

            if (score < strictThreshold) continue;

            seenIds.add(speech.id);
            unique.push(speech);

            if (unique.length >= TARGET_CATEGORY_COUNT) break;
          }
        }

        console.log(
          '[Category] strict matched count:',
          unique.length,
          'for',
          category.name
        );

        if (unique.length > 0) {
          setYoutubeSpeeches(unique);
          setCategoryError(null);
        } else {
          setYoutubeSpeeches([]);
          setCategoryError(
            `No relevant ${category.name} content found. Please try again.`
          );
        }

        setHasLoadedOnline(true);
      } catch (error) {
        console.error('[Category] load error:', error);
        setCategoryError('Failed to load content for this category.');
      } finally {
        setCategoryLoading(false);
      }
    };

    console.log('[Category] page loaded, category:', category?.name);
    void handleLoadOnlineSpeeches();
  }, [category, categoryId, hasLoadedOnline, contextSpeeches, isChristianCategory, requireChristianContent]);

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
                <Text style={styles.bannerAuthor}>— {banner.author}</Text>
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
