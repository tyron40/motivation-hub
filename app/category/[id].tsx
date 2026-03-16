import React, { useEffect, useState, useCallback } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { ArrowLeft, Edit3, X, Quote } from 'lucide-react-native';
import { SpeechCard } from '@/components/SpeechCard';
import { categories, churchCategory, classifyVideoToCategory } from '@/mocks/speeches';
import { useSpeechContext } from '@/hooks/speech-context';
import type { Speech } from '@/types/speech';
import { getVideosByCategory, getTrendingVideos, convertVideoToSpeech } from '@/services/youtubeService';
import { useTheme } from '@/hooks/theme-context';
import { useAdMob } from '@/hooks/admob-context';
import { useAdmin } from '@/hooks/admin-context';
import { CategoryBanner } from '@/mocks/categoryBanners';

export default function CategoryScreen() {
  const { colors } = useTheme();
  const { id } = useLocalSearchParams();
  const { toggleFavorite, setCurrentSpeech, getSpeechesByCategory } = useSpeechContext();
  const [hasLoadedOnline, setHasLoadedOnline] = useState(false);
  const [youtubeSpeeches, setYoutubeSpeeches] = useState<Speech[]>([]);
  const { showInterstitialAd } = useAdMob();
  const { isAdmin, getBannerForCategory, updateBanner } = useAdmin();
  const speechPlayCount = React.useRef(0);
  const styles = getStyles(colors);

  const [showEditBanner, setShowEditBanner] = useState(false);
  const [editQuote, setEditQuote] = useState('');
  const [editAuthor, setEditAuthor] = useState('');
  const [editImageUrl, setEditImageUrl] = useState('');
  
  const allCategories = [...categories, churchCategory];
  const category = allCategories.find(c => c.id === id);
  const contextSpeeches = category ? getSpeechesByCategory(category.name) : [];
  const categorySpeeches = youtubeSpeeches.length > 0 ? youtubeSpeeches : contextSpeeches;

  const banner: CategoryBanner | null = category ? getBannerForCategory(String(id), category.name) : null;

  useEffect(() => {
    const handleLoadOnlineSpeeches = async () => {
      if (!category || hasLoadedOnline) return;
      
      try {
        console.log(`Loading content for ${category.name}...`);
        
        const [categoryVideos, channelVideos] = await Promise.all([
          getVideosByCategory(category.name, 30),
          getTrendingVideos(50),
        ]);
        
        const channelSpeeches = channelVideos
          .map(video => {
            const speech = convertVideoToSpeech(video);
            const assigned = classifyVideoToCategory(speech.title, speech.description);
            return { ...speech, category: assigned };
          })
          .filter(s => s.category === category.name);
        
        const catSpeeches: Speech[] = categoryVideos.map(video => convertVideoToSpeech(video));
        
        const seenIds = new Set<string>();
        const merged: Speech[] = [];
        for (const s of [...channelSpeeches, ...catSpeeches]) {
          if (!seenIds.has(s.id)) {
            seenIds.add(s.id);
            merged.push(s);
          }
        }
        
        console.log(`Loaded ${merged.length} videos for ${category.name}`);
        setYoutubeSpeeches(merged);
        setHasLoadedOnline(true);
      } catch (error) {
        console.error(`Failed to load speeches for ${category?.name}:`, error);
      }
    };

    console.log(`Category page loaded: ${category?.name}`);
    void handleLoadOnlineSpeeches();
  }, [category, hasLoadedOnline]);

  const handleSpeechPress = (speech: Speech) => {
    console.log('Selected speech:', speech.title);
    speechPlayCount.current += 1;
    
    if (speechPlayCount.current % 3 === 0) {
      void showInterstitialAd().then(() => {
        setCurrentSpeech(speech);
        router.push('/player');
      });
    } else {
      setCurrentSpeech(speech);
      router.push('/player');
    }
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
    if (!editQuote.trim() || !editAuthor.trim()) {
      Alert.alert('Missing Fields', 'Please fill in the quote and author.');
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
                source={{ uri: banner.imageUrl }}
                style={styles.bannerImage}
              />
              <LinearGradient
                colors={['rgba(0,0,0,0.1)', 'rgba(0,0,0,0.65)', 'rgba(0,0,0,0.9)']}
                style={styles.bannerGradient}
              >
                <View style={styles.bannerContent}>
                  <View style={styles.bannerQuoteIcon}>
                    <Quote size={18} color={category.color} fill={category.color} />
                  </View>
                  <Text style={styles.bannerQuote} numberOfLines={3}>
                    "{banner.quote}"
                  </Text>
                  <View style={[styles.bannerAccentLine, { backgroundColor: category.color }]} />
                  <Text style={styles.bannerAuthor}>— {banner.author}</Text>
                </View>
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
            <Text style={styles.inputLabel}>Image URL (optional)</Text>
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
  bannerContent: {
    gap: 6,
  },
  bannerQuoteIcon: {
    marginBottom: 4,
  },
  bannerQuote: {
    color: '#FFFFFF',
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
    paddingVertical: 24,
    marginBottom: 16,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconPlaceholder: {
    fontSize: 28,
  },
  title: {
    color: colors.text,
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  speechCount: {
    color: colors.textSecondary,
    fontSize: 14,
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
  saveButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: colors.primary || '#3B82F6',
    marginTop: 4,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
