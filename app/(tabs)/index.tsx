import React from 'react';
import type { ImageSourcePropType } from 'react-native';
import { 
  StyleSheet, 
  Text, 
  View, 
  ScrollView, 
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Modal,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack, router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Play, Quote, Sun, ChevronRight, Film, ImageIcon } from 'lucide-react-native';
import { SpeechCard } from '@/components/SpeechCard';
import { CategoryCard } from '@/components/CategoryCard';
import { featuredSpeech, categories, popularSpeeches, churchCategory, athleteCategory, classifyVideoToCategory } from '@/mocks/speeches';
import { getTrendingVideos, convertVideoToSpeech, searchVideos } from '@/services/youtubeService';
import { useSpeechContext } from '@/hooks/speech-context';
import { useTheme } from '@/hooks/theme-context';
import { useUserProfile } from '@/hooks/user-profile-context';
import { motivationalFlyers, MotivationalFlyer } from '@/mocks/motivationalFlyers';
import { fallbackShortClips } from '@/mocks/shortClips';
import { useAdMob } from '@/hooks/admob-context';
import { useAdmin } from '@/hooks/admin-context';


const LOCAL_FLYER_IMAGES: Record<string, ImageSourcePropType> = {
  'assets/images/haskle.jpeg': require('@/assets/images/haskle.jpeg'),
  'assets/images/run club.jpeg': require('@/assets/images/run club.jpeg'),
};

const getFlyerImageSource = (imageUrl: string): ImageSourcePropType => {
  const local = LOCAL_FLYER_IMAGES[imageUrl];
  if (local) return local;
  return { uri: imageUrl };
};

export default function HomeScreen() {
  const speechContext = useSpeechContext();
  const { colors } = useTheme();
  const { profile } = useUserProfile();
  const insets = useSafeAreaInsets();
  const { tryShowInterstitialOnTransition } = useAdMob();
  const { customFlyers } = useAdmin();
  const [youtubeSpeeches, setYoutubeSpeeches] = React.useState<any[]>([]);
  const [shortClips, setShortClips] = React.useState<any[]>(fallbackShortClips);
  const [selectedFlyer, setSelectedFlyer] = React.useState<MotivationalFlyer | null>(null);
  const scaleAnim = React.useRef(new Animated.Value(0)).current;
  const dailyQuote = React.useMemo(() => {
    const quotes = [
      { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
      { text: "Believe you can and you're halfway there.", author: "Theodore Roosevelt" },
      { text: "It does not matter how slowly you go as long as you do not stop.", author: "Confucius" },
      { text: "Success is not final, failure is not fatal: it is the courage to continue that counts.", author: "Winston Churchill" },
      { text: "The future belongs to those who believe in the beauty of their dreams.", author: "Eleanor Roosevelt" },
      { text: "Don't watch the clock; do what it does. Keep going.", author: "Sam Levenson" },
      { text: "You are never too old to set another goal or to dream a new dream.", author: "C.S. Lewis" },
      { text: "What lies behind us and what lies before us are tiny matters compared to what lies within us.", author: "Ralph Waldo Emerson" },
      { text: "Hardships often prepare ordinary people for an extraordinary destiny.", author: "C.S. Lewis" },
      { text: "The only impossible journey is the one you never begin.", author: "Tony Robbins" },
      { text: "Act as if what you do makes a difference. It does.", author: "William James" },
      { text: "Your limitation—it's only your imagination.", author: "Motivation Fuel" },
      { text: "Push yourself, because no one else is going to do it for you.", author: "Motivation Fuel" },
      { text: "Great things never come from comfort zones.", author: "Motivation Fuel" },
      { text: "Dream it. Wish it. Do it.", author: "Motivation Fuel" },
      { text: "Wake up with determination. Go to bed with satisfaction.", author: "Motivation Fuel" },
      { text: "Do something today that your future self will thank you for.", author: "Sean Patrick Flanery" },
      { text: "It's going to be hard, but hard does not mean impossible.", author: "Motivation Fuel" },
      { text: "Don't stop when you're tired. Stop when you're done.", author: "Motivation Fuel" },
      { text: "Little things make big days.", author: "Motivation Fuel" },
      { text: "The secret of getting ahead is getting started.", author: "Mark Twain" },
      { text: "Stars can't shine without darkness.", author: "Motivation Fuel" },
      { text: "Fall seven times, stand up eight.", author: "Japanese Proverb" },
      { text: "What we achieve inwardly will change outer reality.", author: "Plutarch" },
      { text: "In the middle of every difficulty lies opportunity.", author: "Albert Einstein" },
      { text: "Everything you've ever wanted is on the other side of fear.", author: "George Addair" },
      { text: "You didn't come this far to only come this far.", author: "Motivation Fuel" },
      { text: "If it doesn't challenge you, it won't change you.", author: "Fred DeVito" },
      { text: "Life begins at the end of your comfort zone.", author: "Neale Donald Walsch" },
      { text: "A winner is a dreamer who never gives up.", author: "Nelson Mandela" },
      { text: "Stay patient and trust your journey.", author: "Motivation Fuel" },
    ];
    const dayIndex = new Date().getDate() % quotes.length;
    return quotes[dayIndex];
  }, []);

  
  const styles = getStyles(colors);

  const allCategories = React.useMemo(() => {
    const base = categories.filter(category => 
      category && typeof category === 'object' && category.id && category.name
    );
    const withAthlete = [...base, athleteCategory];
    if (profile.includeChurchMotivation) {
      const [first, ...rest] = withAthlete;
      return [first, churchCategory, ...rest];
    }
    return withAthlete;
  }, [profile.includeChurchMotivation]);

  React.useEffect(() => {
    const loadYouTubeSpeeches = async () => {
      try {
        console.log('🔄 Loading YouTube speeches from Motivation Fuel channel...');
        const videos = await getTrendingVideos(35);
        console.log(`✅ Loaded ${videos.length} YouTube videos`);
        
        const speeches = videos.map(video => {
          const speech = convertVideoToSpeech(video);
          const assignedCategory = classifyVideoToCategory(speech.title, speech.description);
          return { ...speech, category: assignedCategory };
        });
        
        setYoutubeSpeeches(speeches);
      } catch (error) {
        console.error('❌ Failed to load YouTube speeches:', error);
      }
    };

    const loadShortClips = async () => {
      try {
        console.log('🎬 Loading short clips for home page...');
        const [searchResults, trending] = await Promise.all([
          searchVideos('motivational short clips inspiration', 24),
          getTrendingVideos(24),
        ]);
        const seenIds = new Set<string>();
        const clips: any[] = [];
        for (const v of [...searchResults, ...trending]) {
          if (!seenIds.has(v.id) && v.duration > 0 && v.duration <= 180) {
            seenIds.add(v.id);
            clips.push({
              id: v.id,
              youtubeId: v.id,
              title: v.title,
              speaker: v.channelTitle,
              imageUrl: v.thumbnail,
              duration: v.duration,
            });
          }
        }
        console.log(`✅ Found ${clips.length} short clips (≤3min)`);
        if (clips.length > 0) {
          setShortClips(clips);
        } else {
          console.log('⚠️ No clips from API, using fallback clips');
          setShortClips(fallbackShortClips);
        }
      } catch (error) {
        console.error('❌ Failed to load short clips:', error);
        setShortClips(fallbackShortClips);
      }
    };
    
    void loadYouTubeSpeeches();
    void loadShortClips();
  }, []);
  
  const { toggleFavorite, setCurrentSpeech, setCurrentPlaylist } = speechContext ?? {};

  const displaySpeeches = youtubeSpeeches.length > 0 ? youtubeSpeeches.filter(s => s.duration > 60) : popularSpeeches.filter(s => s.duration > 60);
  const displayFeatured = React.useMemo(() => {
    if (displaySpeeches.length === 0) return featuredSpeech;
    const today = new Date();
    const dayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24));
    const index = dayOfYear % displaySpeeches.length;
    return displaySpeeches[index];
  }, [displaySpeeches]);

  const handleSpeechPress = React.useCallback(async (speech: any, playlist?: any[]) => {
    try {
      if (!speech || typeof speech !== 'object' || !speech.id) {
        console.warn('Invalid speech object:', speech);
        return;
      }

      console.log('🎵 Setting current speech:', speech.title);
      await tryShowInterstitialOnTransition();
      if (playlist && playlist.length > 0) {
        setCurrentPlaylist(playlist);
      } else {
        setCurrentPlaylist(displaySpeeches);
      }
      setCurrentSpeech(speech);
      router.push('/player');
    } catch (error) {
      console.error('Error handling speech press:', error);
      if (playlist && playlist.length > 0) {
        setCurrentPlaylist(playlist);
      }
      setCurrentSpeech(speech);
      router.push('/player');
    }
  }, [tryShowInterstitialOnTransition, setCurrentSpeech, setCurrentPlaylist, displaySpeeches]);

  const handleCategoryPress = async (categoryId: string) => {
    try {
      if (!categoryId || typeof categoryId !== 'string') {
        console.warn('Invalid category ID:', categoryId);
        return;
      }
      
      console.log('📂 Opening category:', categoryId);
      await tryShowInterstitialOnTransition();
      router.push(`/category/${categoryId}`);
    } catch (error) {
      console.error('Error handling category press:', error);
      router.push(`/category/${categoryId}`);
    }
  };
  
  const safeDisplaySpeeches = displaySpeeches.filter(speech => 
    speech && typeof speech === 'object' && speech.id && speech.title
  ).slice(0, 6);

  const homeFeaturedFlyers = React.useMemo(() => {
    const combined = [...motivationalFlyers, ...customFlyers];
    const seen = new Set<string>();
    const unique = combined.filter((f) => {
      if (!f?.id || seen.has(f.id)) return false;
      seen.add(f.id);
      return true;
    });

    const hasNoEasyDays = unique.some((f) => f.id === 'flyer-featured-8');
    if (!hasNoEasyDays) {
      const noEasyDays = motivationalFlyers.find((f) => f.id === 'flyer-featured-8');
      if (noEasyDays) unique.unshift(noEasyDays);
    }

    return unique.slice(0, 10);
  }, [customFlyers]);

  const openFlyerPreview = React.useCallback((flyer: MotivationalFlyer) => {
    setSelectedFlyer(flyer);
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 50,
      friction: 7,
    }).start();
  }, [scaleAnim]);

  const closeFlyerPreview = React.useCallback(() => {
    Animated.timing(scaleAnim, {
      toValue: 0,
      duration: 180,
      useNativeDriver: true,
    }).start(() => setSelectedFlyer(null));
  }, [scaleAnim]);

  if (!speechContext || !toggleFavorite || !setCurrentSpeech || !setCurrentPlaylist) {
    console.error('Speech context not available');
    return (
      <LinearGradient colors={[colors.background, colors.card]} style={styles.container}>
        <View style={[styles.loadingContainer, { paddingTop: insets.top }]}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading Motivation Fuel...</Text>
        </View>
      </LinearGradient>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <LinearGradient
        colors={[colors.background, colors.card]}
        style={styles.container}
      >
        <View style={styles.safeArea}>
        <ScrollView 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
            <View style={styles.headerTop}>
              <View>
                <Text style={styles.greeting}>Welcome to</Text>
                <Text style={styles.title}>Motivation Fuel</Text>
              </View>
              <TouchableOpacity 
                style={styles.playAllButton}
                onPress={() => {
                  if (displaySpeeches.length > 0) {
                    void handleSpeechPress(displaySpeeches[0]);
                  }
                }}
              >
                <Play size={16} color={colors.text} fill={colors.text} />
                <Text style={styles.playAllText}>Play All</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.dailyQuoteSection}>
            <LinearGradient
              colors={[colors.primary + '18', colors.accent + '10', 'transparent']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.dailyQuoteCard}
            >
              <View style={styles.dailyQuoteBadge}>
                <Sun size={13} color={colors.primary} />
                <Text style={styles.dailyQuoteBadgeText}>DAILY MOTIVATION</Text>
              </View>
              <Text style={styles.dailyQuoteText} numberOfLines={3}>
                {'"'}{dailyQuote.text}{'"'}
              </Text>
              <Text style={styles.dailyQuoteAuthor}>— {dailyQuote.author}</Text>
            </LinearGradient>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitleCentered}>Today&apos;s Featured</Text>
            <SpeechCard
              speech={displayFeatured}
              variant="featured"
              onPress={() => handleSpeechPress(displayFeatured)}
              onFavorite={() => toggleFavorite(displayFeatured.id)}
            />
          </View>

          <View style={styles.section}>
            <TouchableOpacity style={styles.sectionHeaderRow} onPress={() => router.push('/flyers')} activeOpacity={0.7}>
              <View style={styles.sectionHeaderLeft}>
                <ImageIcon size={16} color={colors.primary} />
                <Text style={styles.sectionTitle}>Motivation Flyers</Text>
              </View>
              <View style={styles.seeAllRow}>
                <Text style={styles.seeAllText}>See All</Text>
                <ChevronRight size={16} color={colors.primary} />
              </View>
            </TouchableOpacity>
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={homeFeaturedFlyers}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.flyersList}
              renderItem={({ item }) => (
                <TouchableOpacity
                  activeOpacity={0.88}
                  style={styles.flyerPoster}
                  testID={`flyer-card-${item.id}`}
                  onPress={() => openFlyerPreview(item)}
                >
                  <Image
                    source={getFlyerImageSource(item.imageUrl)}
                    style={styles.flyerPosterImage}
                  />
                  {item.quote ? (
                    <LinearGradient
                      colors={['transparent', 'rgba(0,0,0,0.75)', 'rgba(0,0,0,0.92)']}
                      style={styles.flyerPosterGradient}
                    >
                      <View style={styles.flyerQuoteRow}>
                        <Quote size={14} color={item.accent} fill={item.accent} />
                      </View>
                      <Text style={styles.flyerPosterQuote}>{item.quote}</Text>
                      <View style={[styles.flyerPosterAccentLine, { backgroundColor: item.accent }]} />
                      <Text style={styles.flyerPosterTitle}>{item.title}</Text>
                    </LinearGradient>
                  ) : (
                    <LinearGradient
                      colors={['transparent', 'rgba(0,0,0,0.35)']}
                      style={styles.flyerPosterGradient}
                    >
                      <View style={[styles.flyerPosterAccentLine, { backgroundColor: item.accent }]} />
                      <Text style={styles.flyerPosterTitle}>{item.title}</Text>
                    </LinearGradient>
                  )}
                </TouchableOpacity>
              )}
            />
          </View>

          <View style={styles.section}>
            <TouchableOpacity style={styles.sectionHeaderRow} onPress={() => router.push('/short-clips')} activeOpacity={0.7}>
              <View style={styles.sectionHeaderLeft}>
                <Film size={16} color={colors.accent} />
                <Text style={styles.sectionTitle}>Short Clips</Text>
              </View>
              <View style={styles.seeAllRow}>
                <Text style={styles.seeAllText}>Watch All</Text>
                <ChevronRight size={16} color={colors.primary} />
              </View>
            </TouchableOpacity>
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={shortClips.slice(0, 8)}
              keyExtractor={(item) => `clip-${item.id}`}
              contentContainerStyle={styles.flyersList}
              renderItem={({ item }) => (
                <TouchableOpacity
                  activeOpacity={0.88}
                  style={styles.clipPoster}
                  onPress={() => {
                    console.log('🎬 Opening short clip from homepage:', item.title, item.youtubeId || item.id);
                    router.push({ pathname: '/short-clips', params: { initialVideoId: item.youtubeId || item.id } });
                  }}
                >
                  <Image
                    source={{ uri: item.imageUrl }}
                    style={styles.flyerPosterImage}
                  />
                  <LinearGradient
                    colors={['transparent', 'rgba(0,0,0,0.85)']}
                    style={styles.clipPosterGradient}
                  >
                    <View style={styles.clipPlayIcon}>
                      <Play size={20} color="#fff" fill="#fff" />
                    </View>
                    <Text style={styles.clipPosterTitle} numberOfLines={2}>{item.title}</Text>
                    <Text style={styles.clipPosterChannel}>{item.speaker}</Text>
                  </LinearGradient>
                </TouchableOpacity>
              )}
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitleCentered}>Categories</Text>
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={allCategories}
              keyExtractor={(item) => String(item?.id || Math.random())}
              contentContainerStyle={styles.categoriesList}
              renderItem={({ item }) => {
                if (!item || typeof item !== 'object' || !item.id || !item.name) {
                  return null;
                }
                return (
                  <CategoryCard
                    category={item}
                    onPress={() => handleCategoryPress(item.id)}
                  />
                );
              }}
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitleCentered}>Popular Speeches</Text>
            {safeDisplaySpeeches.map((speech, index) => (
              <SpeechCard
                key={`speech-${speech.id}-${index}`}
                speech={speech}
                onPress={() => handleSpeechPress(speech)}
                onFavorite={() => toggleFavorite(speech.id)}
              />
            ))}
          </View>


        </ScrollView>

        <Modal visible={!!selectedFlyer} transparent animationType="fade" onRequestClose={closeFlyerPreview}>
          <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={closeFlyerPreview}>
            <Animated.View
              style={[
                styles.modalContent,
                {
                  transform: [
                    {
                      scale: scaleAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.85, 1],
                      }),
                    },
                  ],
                },
              ]}
            >
              {selectedFlyer && (
                <View style={styles.modalCard}>
                  <Image source={getFlyerImageSource(selectedFlyer.imageUrl)} style={styles.modalImage} resizeMode="cover" />
                  <LinearGradient
                    colors={
                      selectedFlyer.quote
                        ? ['transparent', 'rgba(0,0,0,0.5)', 'rgba(0,0,0,0.92)']
                        : ['transparent', 'rgba(0,0,0,0.35)']
                    }
                    style={styles.modalGradient}
                  >
                    {selectedFlyer.quote ? (
                      <>
                        <Quote size={24} color={selectedFlyer.accent} fill={selectedFlyer.accent} />
                        <Text style={styles.modalQuote}>{selectedFlyer.quote}</Text>
                      </>
                    ) : null}
                    <View style={[styles.modalAccentLine, { backgroundColor: selectedFlyer.accent }]} />
                    <Text style={styles.modalTitle}>{selectedFlyer.title}</Text>
                  </LinearGradient>
                </View>
              )}
            </Animated.View>
          </TouchableOpacity>
        </Modal>
      </View>
    </LinearGradient>
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
    paddingBottom: 100,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  greeting: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '500' as const,
  },
  title: {
    color: colors.text,
    fontSize: 26,
    fontWeight: 'bold' as const,
    marginTop: 2,
    letterSpacing: -0.5,
  },
  headerTop: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'flex-start' as const,
  },
  playAllButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 25,
    gap: 8,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  playAllText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600' as const,
  },
  section: {
    marginTop: 20,
  },
  sectionHeaderRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  flyersList: {
    paddingHorizontal: 20,
    gap: 10,
  },
  flyerPoster: {
    width: 196,
    height: 290,
    borderRadius: 18,
    overflow: 'hidden' as const,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
  },
  flyerPosterImage: {
    width: '100%' as const,
    height: '100%' as const,
    position: 'absolute' as const,
    resizeMode: 'cover' as const,
  },
  flyerPosterGradient: {
    flex: 1,
    justifyContent: 'flex-end' as const,
    padding: 14,
  },
  flyerQuoteRow: {
    marginBottom: 6,
  },
  flyerPosterQuote: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600' as const,
    lineHeight: 16,
    fontStyle: 'italic' as const,
    marginBottom: 8,
  },
  flyerPosterAccentLine: {
    width: 36,
    height: 3,
    borderRadius: 2,
    marginBottom: 8,
  },
  flyerPosterTitle: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    fontWeight: '700' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: 1.2,
  },

  sectionTitle: {
    color: colors.text,
    fontSize: 19,
    fontWeight: '700' as const,
    marginBottom: 0,
    letterSpacing: -0.3,
  },
  sectionTitleCentered: {
    color: colors.text,
    fontSize: 19,
    fontWeight: '700' as const,
    marginBottom: 12,
    letterSpacing: -0.3,
    textAlign: 'left' as const,
    paddingHorizontal: 20,
  },
  sectionHeaderLeft: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
  },
  seeAllRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 2,
  },
  seeAllText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '600' as const,
  },
  clipPoster: {
    width: 210,
    height: 136,
    borderRadius: 14,
    overflow: 'hidden' as const,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  clipPosterGradient: {
    flex: 1,
    justifyContent: 'flex-end' as const,
    padding: 10,
  },
  clipPlayIcon: {
    position: 'absolute' as const,
    top: 10,
    right: 10,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    paddingLeft: 2,
  },
  clipPosterTitle: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600' as const,
    lineHeight: 16,
  },
  clipPosterChannel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 9,
    fontWeight: '500' as const,
    marginTop: 3,
  },
  dailyQuoteSection: {
    paddingHorizontal: 20,
    marginTop: 16,
  },
  dailyQuoteCard: {
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.primary + '20',
  },
  dailyQuoteBadge: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
    marginBottom: 10,
  },
  dailyQuoteBadgeText: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '800' as const,
    letterSpacing: 1.5,
  },
  dailyQuoteText: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '600' as const,
    lineHeight: 26,
    fontStyle: 'italic' as const,
    marginBottom: 8,
  },
  dailyQuoteAuthor: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '500' as const,
  },
  categoriesList: {
    paddingHorizontal: 20,
  },
  errorText: {
    color: colors.text,
    fontSize: 16,
    textAlign: 'center' as const,
    marginTop: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    gap: 16,
  },

  loadingText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600' as const,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  modalContent: {
    width: '88%' as const,
    maxWidth: 420,
  },
  modalCard: {
    width: '100%' as const,
    aspectRatio: 0.65,
    borderRadius: 24,
    overflow: 'hidden' as const,
  },
  modalImage: {
    width: '100%' as const,
    height: '100%' as const,
    position: 'absolute' as const,
  },
  modalGradient: {
    flex: 1,
    justifyContent: 'flex-end' as const,
    padding: 24,
  },
  modalQuote: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700' as const,
    lineHeight: 28,
    fontStyle: 'italic' as const,
    marginTop: 12,
    marginBottom: 14,
  },
  modalAccentLine: {
    width: 40,
    height: 3,
    borderRadius: 2,
    marginBottom: 10,
  },
  modalTitle: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 13,
    fontWeight: '700' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: 1.5,
  },

});
