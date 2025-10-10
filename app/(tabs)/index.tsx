import React from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  ScrollView, 
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Play } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { SpeechCard } from '@/components/SpeechCard';
import { CategoryCard } from '@/components/CategoryCard';
import { featuredSpeech, categories, popularSpeeches } from '@/mocks/speeches';
import { useSpeechContext } from '@/hooks/speech-context';
import { ActivityIndicator } from 'react-native';
import { router } from 'expo-router';

export default function HomeScreen() {
  const speechContext = useSpeechContext();
  const insets = useSafeAreaInsets();
  
  if (!speechContext) {
    console.error('Speech context not available');
    return (
      <LinearGradient colors={[Colors.background, '#1A1A2E']} style={styles.container}>
        <View style={[styles.loadingContainer, { paddingTop: insets.top }]}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading Motivation Hub...</Text>
        </View>
      </LinearGradient>
    );
  }
  
  const { toggleFavorite, setCurrentSpeech, isLoading } = speechContext;

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

  // Use curated YouTube speeches
  const displaySpeeches = popularSpeeches;
  const displayFeatured = featuredSpeech;
  
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
        colors={[Colors.background, '#1A1A2E']}
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
                <Play size={16} color={Colors.text} fill={Colors.text} />
                <Text style={styles.playAllText}>Play All</Text>
              </TouchableOpacity>
            </View>
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

const styles = StyleSheet.create({
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
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '500',
  },
  title: {
    color: Colors.text,
    fontSize: 26,
    fontWeight: 'bold',
    marginTop: 2,
    letterSpacing: -0.5,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  playAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
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
    color: Colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  section: {
    marginTop: 20,
  },
  sectionTitle: {
    color: Colors.text,
    fontSize: 19,
    fontWeight: '600',
    marginBottom: 12,
    paddingHorizontal: 20,
    letterSpacing: -0.3,
  },
  categoriesList: {
    paddingHorizontal: 20,
  },
  errorText: {
    color: Colors.text,
    fontSize: 16,
    textAlign: 'center',
    marginTop: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
});