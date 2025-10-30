import React, { useEffect, useState } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { SpeechCard } from '@/components/SpeechCard';
import { categories } from '@/mocks/speeches';
import { useSpeechContext } from '@/hooks/speech-context';
import type { Speech } from '@/types/speech';
import { getVideosByCategory, convertVideoToSpeech } from '@/services/youtubeService';
import { useTheme } from '@/hooks/theme-context';

export default function CategoryScreen() {
  const { colors } = useTheme();
  const { id } = useLocalSearchParams();
  const { toggleFavorite, setCurrentSpeech, getSpeechesByCategory } = useSpeechContext();
  const [hasLoadedOnline, setHasLoadedOnline] = useState(false);
  const [youtubeSpeeches, setYoutubeSpeeches] = useState<Speech[]>([]);
  const styles = getStyles(colors);
  
  const category = categories.find(c => c.id === id);
  const contextSpeeches = category ? getSpeechesByCategory(category.name) : [];
  const categorySpeeches = youtubeSpeeches.length > 0 ? youtubeSpeeches : contextSpeeches;

  useEffect(() => {
    const handleLoadOnlineSpeeches = async () => {
      if (!category || hasLoadedOnline) return;
      
      try {
        console.log(`🔄 Loading YouTube speeches for ${category.name} from API...`);
        
        const videos = await getVideosByCategory(category.name, 50);
        console.log(`✅ Loaded ${videos.length} YouTube videos for ${category.name}`);
        
        const speeches: Speech[] = videos.map(video => convertVideoToSpeech(video));
        
        setYoutubeSpeeches(speeches);
        setHasLoadedOnline(true);
      } catch (error) {
        console.error(`❌ Failed to load YouTube speeches for ${category.name}:`, error);
      }
    };

    console.log(`📂 Category page loaded: ${category?.name}`);
    handleLoadOnlineSpeeches();
  }, [category, hasLoadedOnline]);

  const handleSpeechPress = (speech: Speech) => {
    console.log('🎵 Selected speech:', speech.title);
    console.log('🎵 Speech type:', speech.youtubeId ? 'YouTube' : 'Audio');
    setCurrentSpeech(speech);
    router.push('/player');
  };

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
          <View style={[styles.header, { backgroundColor: category.color + '20' }]}>
            <View style={[styles.iconContainer, { backgroundColor: category.color }]}>
              <Text style={styles.iconPlaceholder}>🎯</Text>
            </View>
            <Text style={styles.title}>{category.name}</Text>
            <Text style={styles.speechCount}>{String(categorySpeeches.length)} YouTube speeches available</Text>
          </View>

          <View style={styles.speechList}>
            {categorySpeeches
              .filter(speech => speech && typeof speech === 'object' && speech.id && speech.title)
              .map((speech, index) => (
                <SpeechCard
                  key={`category-speech-${speech.id}-${index}`}
                  speech={speech}
                  onPress={() => handleSpeechPress(speech)}
                  onFavorite={() => toggleFavorite(speech.id)}
                />
              ))
            }
          </View>
        </ScrollView>
      </SafeAreaView>
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
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 32,
    marginBottom: 24,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconPlaceholder: {
    fontSize: 36,
  },
  title: {
    color: colors.text,
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  speechCount: {
    color: colors.textSecondary,
    fontSize: 16,
  },
  speechList: {
    paddingTop: 8,
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
});
