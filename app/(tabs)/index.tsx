import React from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  ScrollView, 
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack, router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Play, Sparkles, Church } from 'lucide-react-native';
import { SpeechCard } from '@/components/SpeechCard';
import { CategoryCard } from '@/components/CategoryCard';
import { EarnCreditsCard } from '@/components/EarnCreditsCard';
import { featuredSpeech, categories, popularSpeeches } from '@/mocks/speeches';
import { getTrendingVideos, convertVideoToSpeech } from '@/services/youtubeService';
import { useSpeechContext } from '@/hooks/speech-context';
import { useTheme } from '@/hooks/theme-context';
import { useUserProfile } from '@/hooks/user-profile-context';
import { motivationalFlyers } from '@/mocks/motivationalFlyers';

export default function HomeScreen() {
  const speechContext = useSpeechContext();
  const { colors } = useTheme();
  const { profile } = useUserProfile();
  const insets = useSafeAreaInsets();
  const [youtubeSpeeches, setYoutubeSpeeches] = React.useState<any[]>([]);
  
  const styles = getStyles(colors);

  React.useEffect(() => {
    const loadYouTubeSpeeches = async () => {
      try {
        console.log('🔄 Loading YouTube speeches from Vercel backend...');
        const videos = await getTrendingVideos(50);
        console.log(`✅ Loaded ${videos.length} YouTube videos`);
        
        const speeches = videos.map(video => convertVideoToSpeech(video));
        
        setYoutubeSpeeches(speeches);
      } catch (error) {
        console.error('❌ Failed to load YouTube speeches:', error);
      }
    };
    
    loadYouTubeSpeeches();
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

  const handleSpeechPress = (speech: any) => {
    try {
      if (!speech || typeof speech !== 'object' || !speech.id) {
        console.warn('Invalid speech object:', speech);
        return;
      }
      
      console.log('🎵 Setting current speech:', speech.title);
      setCurrentSpeech(speech);
      router.push('/player');
    } catch (error) {
      console.error('Error handling speech press:', error);
    }
  };

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

  // Use YouTube API speeches if available, otherwise fallback to mock data
  const displaySpeeches = youtubeSpeeches.length > 0 ? youtubeSpeeches : popularSpeeches;
  const displayFeatured = youtubeSpeeches.length > 0 ? youtubeSpeeches[0] : featuredSpeech;
  
  // Safety check to ensure we have valid data
  const safeDisplaySpeeches = displaySpeeches.filter(speech => 
    speech && typeof speech === 'object' && speech.id && speech.title
  );
  const safeCategories = categories.filter(category => 
    category && typeof category === 'object' && category.id && category.name
  );

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

          <EarnCreditsCard />

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
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Motivation Flyers</Text>
              <Sparkles size={16} color={colors.primary} />
            </View>
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={motivationalFlyers}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.flyersList}
              renderItem={({ item }) => (
                <View style={styles.flyerCard} testID={`flyer-card-${item.id}`}>
                  <View style={styles.flyerImageWrap}>
                    <View style={[styles.flyerAccent, { backgroundColor: item.accent }]} />
                    <SpeechCard
                      speech={{
                        id: item.id,
                        title: item.title,
                        speaker: 'Motivation Hub',
                        duration: 60,
                        category: 'Flyers',
                        imageUrl: item.imageUrl,
                        description: item.quote,
                      }}
                      onPress={() => {}}
                      onFavorite={() => {}}
                    />
                  </View>
                  <Text style={styles.flyerQuote}>{item.quote}</Text>
                </View>
              )}
            />
          </View>

          {profile.includeChurchMotivation && (
            <View style={styles.section}>
              <TouchableOpacity
                testID="church-motivation-cta"
                style={styles.churchCta}
                onPress={() => router.push('/church-motivation')}
              >
                <View style={styles.churchCtaLeft}>
                  <Church size={20} color={colors.categories.success} />
                  <View>
                    <Text style={styles.churchCtaTitle}>Church Motivation</Text>
                    <Text style={styles.churchCtaText}>Open faith-based encouragement from YouTube</Text>
                  </View>
                </View>
                <Play size={16} color={colors.text} />
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Categories</Text>
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={safeCategories}
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
    gap: 12,
  },
  flyerCard: {
    width: 300,
    backgroundColor: colors.cardBackground,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    paddingBottom: 12,
    overflow: 'hidden' as const,
  },
  flyerImageWrap: {
    position: 'relative' as const,
  },
  flyerAccent: {
    position: 'absolute' as const,
    top: 14,
    right: 14,
    width: 10,
    height: 10,
    borderRadius: 999,
    zIndex: 2,
  },
  flyerQuote: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    paddingHorizontal: 12,
    marginTop: 4,
  },
  churchCta: {
    marginHorizontal: 20,
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 14,
    paddingVertical: 14,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
  },
  churchCtaLeft: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 10,
  },
  churchCtaTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700' as const,
  },
  churchCtaText: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 19,
    fontWeight: '600' as const,
    marginBottom: 12,
    paddingHorizontal: 20,
    letterSpacing: -0.3,
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