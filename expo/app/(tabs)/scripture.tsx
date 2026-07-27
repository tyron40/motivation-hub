import React, { useState, useRef, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Animated,
  Platform,
  ActivityIndicator,
  Share,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { sendChatMessage } from '@/lib/api-client';
import { Search, Heart, Share2, BookOpen, Star, Filter, Bookmark, Sparkles, Quote, ChevronDown, Wand2 } from 'lucide-react-native';
import { Stack } from 'expo-router';
import { useTheme } from '@/hooks/theme-context';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { allScriptures, Scripture } from '@/mocks/allScriptures';
import { useScriptureFavorites } from '@/hooks/scripture-favorites-context';



const categories = ['All', 'Strength', 'Hope', 'Courage', 'Faith', 'Love', 'Peace', 'Wisdom'];
const ITEMS_PER_PAGE = 8;

export default function ScriptureScreen() {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const insets = useSafeAreaInsets();
  const { favorites, addFavorite, removeFavorite, isFavorite } = useScriptureFavorites();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [displayedCount, setDisplayedCount] = useState<{[key: string]: number}>({});
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [generatedScriptures, setGeneratedScriptures] = useState<Scripture[]>([]);
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [insights, setInsights] = useState<Record<string, { text: string; loading: boolean; error?: string }>>({});
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scrollViewRef = useRef<ScrollView>(null);

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  const filteredScriptures = useMemo(() => {
    const allScripturesData = [...allScriptures, ...generatedScriptures];
    return allScripturesData.filter(scripture => {
      const matchesSearch = scripture.verse.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           scripture.reference.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'All' || scripture.category === selectedCategory;
      const matchesFavorites = !showFavoritesOnly || isFavorite(scripture.reference);
      return matchesSearch && matchesCategory && matchesFavorites;
    });
  }, [searchQuery, selectedCategory, showFavoritesOnly, generatedScriptures, isFavorite]);

  const currentDisplayedCount = displayedCount[selectedCategory] || ITEMS_PER_PAGE;
  
  const displayedScriptures = useMemo(() => {
    return filteredScriptures.slice(0, currentDisplayedCount);
  }, [filteredScriptures, currentDisplayedCount]);

  const hasMore = selectedCategory !== 'All' && (currentDisplayedCount < filteredScriptures.length || !isGenerating);

  const loadMore = async () => {
    if (isLoadingMore || selectedCategory === 'All') return;
    
    setIsLoadingMore(true);
    
    try {
      console.log(`🙏 Loading more scriptures for category: ${selectedCategory}`);
      
      setIsGenerating(true);
      const prompt = `Generate 5 inspiring Bible verses about ${selectedCategory}. Return them in JSON format as an array with this structure: [{"id": "unique-id", "verse": "the verse text", "reference": "Book Chapter:Verse", "category": "${selectedCategory}"}]`;
      
      const chatResult = await sendChatMessage({
        messages: [{ role: 'user', content: prompt }],
      });
      const completion = chatResult.message;
      
      try {
        const jsonMatch = completion.match(/\[.*\]/s);
        if (jsonMatch) {
          const scriptures = JSON.parse(jsonMatch[0]);
          console.log(`✅ Generated ${scriptures.length} new scriptures`);
          setGeneratedScriptures(prev => [...prev, ...scriptures]);
          
          setDisplayedCount(prev => ({
            ...prev,
            [selectedCategory]: (prev[selectedCategory] || ITEMS_PER_PAGE) + scriptures.length
          }));
        } else {
          throw new Error('No JSON found in response');
        }
      } catch (parseError) {
        console.error('❌ Failed to parse generated scriptures:', parseError);
        setDisplayedCount(prev => ({
          ...prev,
          [selectedCategory]: Math.min((prev[selectedCategory] || ITEMS_PER_PAGE) + ITEMS_PER_PAGE, filteredScriptures.length)
        }));
      } finally {
        setIsGenerating(false);
      }
    } catch (error) {
      console.error('❌ Error loading more scriptures:', error);
      setDisplayedCount(prev => ({
        ...prev,
        [selectedCategory]: Math.min((prev[selectedCategory] || ITEMS_PER_PAGE) + ITEMS_PER_PAGE, filteredScriptures.length)
      }));
    } finally {
      setIsLoadingMore(false);
    }
  };

  React.useEffect(() => {
    if (!displayedCount[selectedCategory]) {
      setDisplayedCount(prev => ({
        ...prev,
        [selectedCategory]: ITEMS_PER_PAGE
      }));
    }
  }, [selectedCategory, displayedCount]);
  
  React.useEffect(() => {
    setDisplayedCount(prev => ({
      ...prev,
      [selectedCategory]: ITEMS_PER_PAGE
    }));
  }, [searchQuery, showFavoritesOnly, selectedCategory]);

  const toggleFavorite = async (scripture: Scripture) => {
    try {
      if (isFavorite(scripture.reference)) {
        const favoriteToRemove = favorites.find(f => f.reference === scripture.reference);
        if (favoriteToRemove) {
          await removeFavorite(favoriteToRemove.id);
          console.log('✅ Removed from favorites:', scripture.reference);
        }
      } else {
        await addFavorite(scripture.verse, scripture.reference, scripture.category);
        console.log('✅ Added to favorites:', scripture.reference);
      }
    } catch (error) {
      console.error('❌ Error toggling favorite:', error);
      if (Platform.OS !== 'web') {
        Alert.alert('Error', 'Failed to update favorites');
      }
    }
  };

  const handleShare = async (scripture: Scripture) => {
    try {
      const shareMessage = `"${scripture.verse}"

${scripture.reference}

Shared from Motivation Fuel`;
      
      if (Platform.OS === 'web') {
        try {
          if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(shareMessage);
            console.log('📋 Copied to clipboard');
            Alert.alert('Copied!', 'Scripture copied to clipboard');
          } else {
            const textArea = document.createElement('textarea');
            textArea.value = shareMessage;
            textArea.style.position = 'fixed';
            textArea.style.opacity = '0';
            document.body.appendChild(textArea);
            textArea.select();
            try {
              document.execCommand('copy');
              console.log('📋 Copied to clipboard (fallback)');
              Alert.alert('Copied!', 'Scripture copied to clipboard');
            } catch (e) {
              console.error('❌ Fallback copy failed:', e);
              Alert.alert('Error', 'Failed to copy to clipboard');
            }
            document.body.removeChild(textArea);
          }
        } catch (e) {
          console.error('❌ Error copying to clipboard:', e);
          Alert.alert('Error', 'Failed to copy to clipboard');
        }
      } else {
        await Share.share({
          message: shareMessage,
          title: scripture.reference,
        });
        console.log('✅ Scripture shared successfully');
      }
    } catch (error: any) {
      if (error?.message !== 'Share canceled' && error?.name !== 'AbortError') {
        console.error('❌ Error sharing scripture:', error);
        if (Platform.OS !== 'web') {
          Alert.alert('Error', 'Failed to share scripture');
        }
      }
    }
  };

  const getCategoryColor = (category: string) => {
    if (!category?.trim()) return colors.primary;
    
    const categoryColors: { [key: string]: string } = {
      'Strength': '#10B981',
      'Hope': '#3B82F6', 
      'Courage': '#F59E0B',
      'Faith': '#8B5CF6',
      'Love': '#EC4899',
      'Peace': '#06B6D4',
    };
    return categoryColors[category] || colors.primary;
  };

  const getCategoryGradient = (category: string): [string, string] => {
    if (!category?.trim()) return [colors.primary, colors.primary];
    
    const gradients: { [key: string]: [string, string] } = {
      'Strength': ['#10B981', '#059669'],
      'Hope': ['#3B82F6', '#2563EB'], 
      'Courage': ['#F59E0B', '#D97706'],
      'Faith': ['#8B5CF6', '#7C3AED'],
      'Love': ['#EC4899', '#DB2777'],
      'Peace': ['#06B6D4', '#0891B2'],
    };
    return gradients[category] || [colors.primary, colors.primary];
  };

  const ScriptureCard = ({ scripture, index }: { scripture: Scripture; index: number }) => {
    const cardAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(0.95)).current;
    const isScriptureFavorite = isFavorite(scripture.reference);
    const categoryColor = getCategoryColor(scripture.category);

    React.useEffect(() => {
      Animated.sequence([
        Animated.delay(index * 100),
        Animated.parallel([
          Animated.timing(cardAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.spring(scaleAnim, {
            toValue: 1,
            tension: 100,
            friction: 8,
            useNativeDriver: true,
          }),
        ]),
      ]).start();
    }, [index, cardAnim, scaleAnim]);

    const handleFavoritePress = () => {
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 0.95,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start();
      void toggleFavorite(scripture);
    };

    const handleSharePress = () => {
      void handleShare(scripture);
    };

    const handleInspire = async () => {
      const id = scripture.id;
      if (!id) return;
      const current = insights[id];
      if (current?.loading) return;
      setInsights(prev => ({ ...prev, [id]: { text: current?.text ?? '', loading: true, error: undefined } }));
      try {
        const prompt = `Using the following Bible verse, write a concise, uplifting motivational application (3-5 sentences) that helps someone apply it today. Avoid quoting the verse again. Keep it warm, practical, and non-denominational. Verse: "${scripture.verse}" (${scripture.reference}).`;
        const chatRes = await sendChatMessage({
          messages: [{ role: 'user', content: prompt }],
        });
        const text: string = chatRes?.message ?? '';
        const cleaned = String(text ?? '').trim();
        setInsights(prev => ({ ...prev, [id]: { text: cleaned || 'No insight generated. Try again.', loading: false } }));
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Unknown error';
        setInsights(prev => ({ ...prev, [id]: { text: prev[id]?.text ?? '', loading: false, error: msg } }));
      }
    };

    return (
      <Animated.View 
        style={[
          styles.scriptureCard,
          {
            opacity: cardAnim,
            transform: [{ scale: scaleAnim }],
          }
        ]}
      >
        <LinearGradient
          colors={['rgba(255,255,255,0.12)', 'rgba(255,255,255,0.04)']}
          style={styles.cardGradient}
        >
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderLeft}>
              <LinearGradient
                colors={getCategoryGradient(scripture.category)}
                style={styles.iconContainer}
              >
                <Quote color="white" size={16} />
              </LinearGradient>
              <View style={styles.referenceContainer}>
                <Text style={styles.reference}>{scripture.reference}</Text>
                <View style={[styles.categoryDot, { backgroundColor: categoryColor }]} />
              </View>
            </View>
            <View style={styles.cardActions}>
              <TouchableOpacity 
                onPress={handleFavoritePress}
                style={[styles.actionButton, isScriptureFavorite && styles.favoriteButton]}
              >
                {isScriptureFavorite ? (
                  <Star color={colors.accent} size={18} fill={colors.accent} />
                ) : (
                  <Heart color={colors.textSecondary} size={18} />
                )}
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionButton} onPress={handleSharePress}>
                <Share2 color={colors.textSecondary} size={18} />
              </TouchableOpacity>
            </View>
          </View>
          
          <View style={styles.verseContainer}>
            <Sparkles color={categoryColor} size={14} style={styles.sparkleIcon} />
            <Text style={styles.verse}>"{scripture.verse}"</Text>
          </View>
          
          <View style={styles.cardFooter}>
            <LinearGradient
              colors={getCategoryGradient(scripture.category)}
              style={styles.categoryPill}
            >
              <Text style={styles.categoryPillText}>{scripture.category}</Text>
            </LinearGradient>
            <View style={styles.footerActions}>
              <TouchableOpacity
                testID={`inspire-${scripture.id}`}
                style={styles.inspireButton}
                onPress={handleInspire}
                disabled={Boolean(insights[scripture.id]?.loading)}
              >
                {insights[scripture.id]?.loading ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <>
                    <Wand2 size={16} color={colors.primary} />
                    <Text style={styles.inspireText}>Inspire</Text>
                  </>
                )}
              </TouchableOpacity>
              <TouchableOpacity style={styles.bookmarkBtn}>
                <Bookmark color={colors.textSecondary} size={16} />
              </TouchableOpacity>
            </View>
          </View>

          {insights[scripture.id]?.text ? (
            <View style={styles.insightContainer}>
              <Text style={styles.insightTitle}>Motivational Insight</Text>
              <Text style={styles.insightText}>{insights[scripture.id]?.text}</Text>
            </View>
          ) : null}

          {insights[scripture.id]?.error ? (
            <Text style={styles.errorText}>Failed to generate insight: {insights[scripture.id]?.error}</Text>
          ) : null}
        </LinearGradient>
      </Animated.View>
    );
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <LinearGradient
        colors={[colors.background, colors.card, colors.background]}
        style={styles.container}
      >
        <Animated.View 
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          }
        ]}
      >
        <View style={[styles.header, { paddingTop: insets.top }]}>
          <View style={styles.headerTop}>
            <View style={styles.titleContainer}>
              <View style={styles.titleRow}>
                <LinearGradient
                  colors={['#8B5CF6', '#EC4899']}
                  style={styles.titleIcon}
                >
                  <BookOpen color="white" size={18} />
                </LinearGradient>
                <Text style={styles.title}>Sacred Words</Text>
              </View>
            </View>
            <TouchableOpacity 
              style={[styles.filterButton, showFavoritesOnly && styles.filterButtonActive]}
              onPress={() => setShowFavoritesOnly(!showFavoritesOnly)}
            >
              <Filter color={showFavoritesOnly ? colors.background : colors.textSecondary} size={16} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.searchContainer}>
          <LinearGradient
            colors={['rgba(255,255,255,0.15)', 'rgba(255,255,255,0.08)']}
            style={styles.searchBar}
          >
            <View style={styles.searchIconContainer}>
              <Search color={colors.primary} size={20} />
            </View>
            <TextInput
              style={styles.searchInput}
              placeholder="Search verses, references..."
              placeholderTextColor={colors.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
                <Text style={styles.clearButtonText}>×</Text>
              </TouchableOpacity>
            )}
          </LinearGradient>
        </View>

        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.categoriesContainer}
          contentContainerStyle={styles.categoriesContent}
        >
          {categories.map((category) => {
            const isActive = selectedCategory === category;

            return (
              <TouchableOpacity
                key={category}
                onPress={() => {
                  if (category?.trim() && category.length <= 50) {
                    setSelectedCategory(category.trim());
                  }
                }}
              >
                {isActive ? (
                  <LinearGradient
                    colors={getCategoryGradient(category)}
                    style={[styles.categoryButton, styles.categoryButtonActive]}
                  >
                    <Text style={[styles.categoryButtonText, styles.categoryButtonTextActive]}>
                      {category}
                    </Text>
                  </LinearGradient>
                ) : (
                  <View style={styles.categoryButton}>
                    <Text style={styles.categoryButtonText}>
                      {category}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <ScrollView 
          ref={scrollViewRef}
          style={styles.scripturesContainer}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scripturesContent}
        >
          {displayedScriptures.length > 0 ? (
            <>
              {displayedScriptures.map((scripture, index) => (
                <ScriptureCard key={scripture.id} scripture={scripture} index={index} />
              ))}
              
              {hasMore && selectedCategory !== 'All' && (
                <TouchableOpacity 
                  style={styles.loadMoreButton}
                  onPress={loadMore}
                  disabled={isLoadingMore}
                >
                  {isLoadingMore ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : (
                    <>
                      <LinearGradient
                        colors={[colors.primary, colors.accent]}
                        style={styles.loadMoreGradient}
                      >
                        <ChevronDown color="white" size={20} />
                        <Text style={styles.loadMoreText}>Generate More Scriptures</Text>
                        <Text style={styles.loadMoreSubtext}>
                          Powered by AI • {selectedCategory} category
                        </Text>
                      </LinearGradient>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </>
          ) : (
            <View style={styles.emptyState}>
              <LinearGradient
                colors={['rgba(139, 92, 246, 0.2)', 'rgba(236, 72, 153, 0.2)']}
                style={styles.emptyIconContainer}
              >
                <BookOpen color={colors.primary} size={48} />
              </LinearGradient>
              <Text style={styles.emptyTitle}>No verses found</Text>
              <Text style={styles.emptySubtitle}>
                {showFavoritesOnly 
                  ? "You have not favorited any verses yet" 
                  : 'Try adjusting your search or category filter'
                }
              </Text>
            </View>
          )}
        </ScrollView>
      </Animated.View>
    </LinearGradient>
    </>
  );
}

const getStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 0,
  },
  headerTop: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    marginBottom: 8,
  },
  titleContainer: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 12,
  },
  titleIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  title: {
    color: colors.text,
    fontSize: 18,
    fontWeight: 'bold' as const,
    letterSpacing: -0.5,
  },

  filterButton: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 8,
    padding: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  filterButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },

  searchContainer: {
    paddingHorizontal: 20,
    marginBottom: 8,
    marginTop: 0,
  },
  searchBar: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  searchIconContainer: {
    marginRight: 12,
  },
  clearButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    marginLeft: 8,
  },
  clearButtonText: {
    color: colors.textSecondary,
    fontSize: 16,
    fontWeight: 'bold' as const,
  },
  searchInput: {
    flex: 1,
    color: colors.text,
    fontSize: 15,
  },
  categoriesContainer: {
    marginBottom: 8,
    maxHeight: 36,
  },
  categoriesContent: {
    paddingHorizontal: 20,
    gap: 12,
  },
  categoryButton: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  categoryButtonActive: {
    borderColor: 'transparent',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  categoryButtonText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '600' as const,
  },
  categoryButtonTextActive: {
    color: 'white',
    fontWeight: 'bold' as const,
  },
  scripturesContainer: {
    flex: 1,
  },
  scripturesContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 100,
    gap: 16,
  },
  scriptureCard: {
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 16,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  cardGradient: {
    padding: 24,
  },
  cardHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    marginBottom: 16,
  },
  cardHeaderLeft: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    flex: 1,
    gap: 16,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  referenceContainer: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    flex: 1,
    gap: 8,
  },
  categoryDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  reference: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700' as const,
    flex: 1,
  },
  cardActions: {
    flexDirection: 'row' as const,
    gap: 8,
  },
  actionButton: {
    padding: 10,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  favoriteButton: {
    backgroundColor: colors.accent + '20',
  },
  verseContainer: {
    flexDirection: 'row' as const,
    alignItems: 'flex-start' as const,
    marginBottom: 20,
    gap: 8,
  },
  sparkleIcon: {
    marginTop: 2,
    opacity: 0.7,
  },
  verse: {
    color: colors.text,
    fontSize: 18,
    lineHeight: 28,
    fontStyle: 'italic' as const,
    letterSpacing: 0.3,
    flex: 1,
  },
  cardFooter: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
  },
  footerActions: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
  },
  categoryPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  categoryPillText: {
    fontSize: 13,
    fontWeight: 'bold' as const,
    color: 'white',
  },
  bookmarkBtn: {
    padding: 10,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  inspireButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: colors.primary + '40',
  },
  inspireText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600' as const,
  },
  insightContainer: {
    marginTop: 16,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  insightTitle: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700' as const,
    marginBottom: 6,
  },
  insightText: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 22,
  },
  errorText: {
    color: '#EF4444',
    marginTop: 8,
    fontSize: 12,
  },
  emptyState: {
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingVertical: 80,
    gap: 20,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 22,
    fontWeight: 'bold' as const,
  },
  emptySubtitle: {
    color: colors.textSecondary,
    fontSize: 16,
    textAlign: 'center' as const,
    lineHeight: 22,
    paddingHorizontal: 40,
  },
  loadMoreButton: {
    marginTop: 20,
    marginBottom: 20,
    borderRadius: 20,
    overflow: 'hidden',
  },
  loadMoreGradient: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  loadMoreText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600' as const,
    marginTop: 8,
  },
  loadMoreSubtext: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    marginTop: 4,
  },
});
