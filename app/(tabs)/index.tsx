import React from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  ScrollView, 
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack, router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Play, Quote, Sun, ChevronRight, Film, ImageIcon } from 'lucide-react-native';
import { SpeechCard } from '@/components/SpeechCard';
import { CategoryCard } from '@/components/CategoryCard';
import { featuredSpeech, categories, popularSpeeches, churchCategory, classifyVideoToCategory } from '@/mocks/speeches';
import { getTrendingVideos, convertVideoToSpeech } from '@/services/youtubeService';
import { useSpeechContext } from '@/hooks/speech-context';
import { useTheme } from '@/hooks/theme-context';
import { useUserProfile } from '@/hooks/user-profile-context';
import { motivationalFlyers } from '@/mocks/motivationalFlyers';
import { useAdMob } from '@/hooks/admob-context';


export default function HomeScreen() {
  const speechContext = useSpeechContext();
  const { colors } = useTheme();
  const { profile } = useUserProfile();
  const insets = useSafeAreaInsets();
  const { showInterstitialAd } = useAdMob();
  const [youtubeSpeeches, setYoutubeSpeeches] = React.useState<any[]>([]);
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
  const speechPlayCount = React.useRef(0);
  
  const styles = getStyles(colors);

  const allCategories = React.useMemo(() => {
    const base = categories.filter(category => 
      category && typeof category === 'object' && category.id && category.name
    );
    if (profile.includeChurchMotivation) {
      const [first, ...rest] = base;
      return [first, churchCategory, ...rest];
    }
    return base;
  }, [profile.includeChurchMotivation]);

  React.useEffect(() => {
    const loadYouTubeSpeeches = async () => {
      try {
        console.log('🔄 Loading YouTube speeches from Motivation Fuel channel...');
        const videos = await getTrendingVideos(50);
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
    
    void loadYouTubeSpeeches();
  }, []);
  
  if (!speechContext) {
    console.error('Speech context not available');
    return (
      <LinearGradient colors={[colors.background, colors.card]} style={styles.container}>
        <View style={[styles.loadingContainer, { paddingTop: insets.top }]}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading Motivation Hub...</Text>
        </View>
      </LinearGradient>
    );
  }
  
  const { toggleFavorite, setCurrentSpeech } = speechContext;

  const handleSpeechPress = React.useCallback((speech: any) => {
    try {
      if (!speech || typeof speech !== 'object' || !speech.id) {
        console.warn('Invalid speech object:', speech);
        return;
      }

      console.log('🎵 Setting current speech:', speech.title);
      speechPlayCount.current += 1;
      
      if (speechPlayCount.current % 3 === 0) {
        console.log('📺 Showing interstitial ad before playing speech');
        void showInterstitialAd().then(() => {
          setCurrentSpeech(speech);
          router.push('/player');
        });
      } else {
        setCurrentSpeech(speech);
        router.push('/player');
      }
    } catch (error) {
      console.error('Error handling speech press:', error);
    }
  }, [showInterstitialAd, setCurrentSpeech]);

  const handleCategoryPress = (categoryId: string) => {
    try {
      if (!categoryId || typeof categoryId !== 'string') {
        console.warn('Invalid category ID:', categoryId);
        return;
      }
      
      console.log('📂 Opening category:', categoryId);
      router.push(`/category/${categoryId}`);
    } catch (error) {
      console.error('Error handling category press:', error);
    }
  };

  const displaySpeeches = youtubeSpeeches.length > 0 ? youtubeSpeeches : popularSpeeches;
  const displayFeatured = youtubeSpeeches.length > 0 ? youtubeSpeeches[0] : featuredSpeech;
  
  const safeDisplaySpeeches = displaySpeeches.filter(speech => 
    speech && typeof speech === 'object' && speech.id && speech.title
  ).slice(0, 6);

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
                <Text style={styles.title}>Motivation Hub</Text>
              </View>
              <TouchableOpacity 
                style={styles.playAllButton}
                onPress={() => {
                  if (displaySpeeches.length > 0) {
                    handleSpeechPress(displaySpeeches[0]);
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
                "{dailyQuote.text}"
              </Text>
              <Text style={styles.dailyQuoteAuthor}>— {dailyQuote.author}</Text>
            </LinearGradient>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Today&apos;s Featured</Text>
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
              data={motivationalFlyers}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.flyersList}
              renderItem={({ item }) => (
                <TouchableOpacity
                  activeOpacity={0.9}
                  style={styles.flyerPoster}
                  onPress={() => router.push('/flyers')}
                  testID={`flyer-card-${item.id}`}
                >
                  <Image
                    source={{ uri: item.imageUrl }}
                    style={styles.flyerPosterImage}
                  />
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
              data={displaySpeeches.filter(s => s.youtubeId).slice(0, 8)}
              keyExtractor={(item) => `clip-${item.id}`}
              contentContainerStyle={styles.flyersList}
              renderItem={({ item }) => (
                <TouchableOpacity
                  activeOpacity={0.88}
                  style={styles.clipPoster}
                  onPress={() => router.push({ pathname: '/video-player', params: { videoId: item.youtubeId || item.id, title: item.title, thumbnail: item.imageUrl, channelTitle: item.speaker, autoplay: 'true' } })}
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
            <Text style={styles.sectionTitle}>Categories</Text>
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
            <Text style={styles.sectionTitle}>Popular Speeches</Text>
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
    gap: 14,
  },
  flyerPoster: {
    width: 220,
    height: 300,
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
  },
  flyerPosterGradient: {
    flex: 1,
    justifyContent: 'flex-end' as const,
    padding: 16,
  },
  flyerQuoteRow: {
    marginBottom: 6,
  },
  flyerPosterQuote: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600' as const,
    lineHeight: 21,
    fontStyle: 'italic' as const,
    marginBottom: 10,
  },
  flyerPosterAccentLine: {
    width: 32,
    height: 3,
    borderRadius: 2,
    marginBottom: 8,
  },
  flyerPosterTitle: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 11,
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
    width: 200,
    height: 130,
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
    padding: 12,
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
    fontSize: 13,
    fontWeight: '600' as const,
    lineHeight: 17,
  },
  clipPosterChannel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 10,
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
});