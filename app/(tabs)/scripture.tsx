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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Search, Heart, Share2, BookOpen, Star, Filter, Bookmark, Sparkles, Quote, ChevronDown } from 'lucide-react-native';
import { Stack } from 'expo-router';
import Colors from '@/constants/colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { allScriptures, Scripture } from '@/mocks/allScriptures';
import { generateText } from '@rork/toolkit-sdk';

const categories = ['All', 'Strength', 'Hope', 'Courage', 'Faith', 'Love', 'Peace', 'Wisdom'];
const ITEMS_PER_PAGE = 8;

export default function ScriptureScreen() {
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [favorites, setFavorites] = useState<string[]>([]);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [displayedCount, setDisplayedCount] = useState<{[key: string]: number}>({});
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [generatedScriptures, setGeneratedScriptures] = useState<Scripture[]>([]);
  
  const [isGenerating, setIsGenerating] = useState(false);
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
      const matchesFavorites = !showFavoritesOnly || favorites.includes(scripture.id);
      return matchesSearch && matchesCategory && matchesFavorites;
    });
  }, [searchQuery, selectedCategory, showFavoritesOnly, favorites, generatedScriptures]);

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
      
      const response = await generateText({ messages: [{ role: 'user', content: prompt }] });
      
      try {
        const jsonMatch = response.match(/\[.*\]/s);
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
      // Fallback to showing more existing scriptures if available
      setDisplayedCount(prev => ({
        ...prev,
        [selectedCategory]: Math.min((prev[selectedCategory] || ITEMS_PER_PAGE) + ITEMS_PER_PAGE, filteredScriptures.length)
      }));
    } finally {
      setIsLoadingMore(false);
    }
  };

  // Initialize displayed count for new categories
  React.useEffect(() => {
    if (!displayedCount[selectedCategory]) {
      setDisplayedCount(prev => ({
        ...prev,
        [selectedCategory]: ITEMS_PER_PAGE
      }));
    }
  }, [selectedCategory, displayedCount]);
  
  // Reset displayed count when search or favorites filter changes
  React.useEffect(() => {
    setDisplayedCount(prev => ({
      ...prev,
      [selectedCategory]: ITEMS_PER_PAGE
    }));
  }, [searchQuery, showFavoritesOnly, selectedCategory]);

  const toggleFavorite = (scriptureId: string) => {
    setFavorites(prev => 
      prev.includes(scriptureId) 
        ? prev.filter(id => id !== scriptureId)
        : [...prev, scriptureId]
    );
  };

  const getCategoryColor = (category: string) => {
    if (!category?.trim()) return Colors.primary;
    
    const colors: { [key: string]: string } = {
      'Strength': '#10B981',
      'Hope': '#3B82F6', 
      'Courage': '#F59E0B',
      'Faith': '#8B5CF6',
      'Love': '#EC4899',
      'Peace': '#06B6D4',
    };
    return colors[category] || Colors.primary;
  };

  const getCategoryGradient = (category: string): [string, string] => {
    if (!category?.trim()) return [Colors.primary, Colors.primary];
    
    const gradients: { [key: string]: [string, string] } = {
      'Strength': ['#10B981', '#059669'],
      'Hope': ['#3B82F6', '#2563EB'], 
      'Courage': ['#F59E0B', '#D97706'],
      'Faith': ['#8B5CF6', '#7C3AED'],
      'Love': ['#EC4899', '#DB2777'],
      'Peace': ['#06B6D4', '#0891B2'],
    };
    return gradients[category] || [Colors.primary, Colors.primary];
  };

  const ScriptureCard = ({ scripture, index }: { scripture: Scripture; index: number }) => {
    const cardAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(0.95)).current;
    const isFavorite = favorites.includes(scripture.id);
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
      toggleFavorite(scripture.id);
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
                style={[styles.actionButton, isFavorite && styles.favoriteButton]}
              >
                {isFavorite ? (
                  <Star color={Colors.accent} size={18} fill={Colors.accent} />
                ) : (
                  <Heart color={Colors.textSecondary} size={18} />
                )}
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionButton}>
                <Share2 color={Colors.textSecondary} size={18} />
              </TouchableOpacity>
            </View>
          </View>
          
          <View style={styles.verseContainer}>
            <Sparkles color={categoryColor} size={14} style={styles.sparkleIcon} />
            <Text style={styles.verse}>“{scripture.verse}”</Text>
          </View>
          
          <View style={styles.cardFooter}>
            <LinearGradient
              colors={getCategoryGradient(scripture.category)}
              style={styles.categoryTag}
            >
              <Text style={styles.categoryText}>{scripture.category}</Text>
            </LinearGradient>
            <TouchableOpacity style={styles.bookmarkButton}>
              <Bookmark color={Colors.textSecondary} size={16} />
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </Animated.View>
    );
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <LinearGradient
        colors={[Colors.background, '#1A1A2E', '#0F0F1E']}
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
              <Filter color={showFavoritesOnly ? Colors.background : Colors.textSecondary} size={16} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.searchContainer}>
          <LinearGradient
            colors={['rgba(255,255,255,0.15)', 'rgba(255,255,255,0.08)']}
            style={styles.searchBar}
          >
            <View style={styles.searchIconContainer}>
              <Search color={Colors.primary} size={20} />
            </View>
            <TextInput
              style={styles.searchInput}
              placeholder="Search verses, references..."
              placeholderTextColor={Colors.textSecondary}
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
                    <ActivityIndicator size="small" color={Colors.primary} />
                  ) : (
                    <>
                      <LinearGradient
                        colors={[Colors.primary, Colors.accent]}
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
                <BookOpen color={Colors.primary} size={48} />
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

const styles = StyleSheet.create({
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  titleContainer: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  titleIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    color: Colors.text,
    fontSize: 18,
    fontWeight: 'bold',
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
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },

  searchContainer: {
    paddingHorizontal: 20,
    marginBottom: 8,
    marginTop: 0,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
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
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  clearButtonText: {
    color: Colors.textSecondary,
    fontSize: 16,
    fontWeight: 'bold',
  },
  searchInput: {
    flex: 1,
    color: Colors.text,
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
    color: Colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  categoryButtonTextActive: {
    color: 'white',
    fontWeight: 'bold',
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 16,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  referenceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 8,
  },
  categoryDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  reference: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 10,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  favoriteButton: {
    backgroundColor: Colors.accent + '20',
  },
  verseContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
    gap: 8,
  },
  sparkleIcon: {
    marginTop: 2,
    opacity: 0.7,
  },
  verse: {
    color: Colors.text,
    fontSize: 18,
    lineHeight: 28,
    fontStyle: 'italic',
    letterSpacing: 0.3,
    flex: 1,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryTag: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  categoryText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: 'white',
  },
  bookmarkButton: {
    padding: 10,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    gap: 20,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyTitle: {
    color: Colors.text,
    fontSize: 22,
    fontWeight: 'bold',
  },
  emptySubtitle: {
    color: Colors.textSecondary,
    fontSize: 16,
    textAlign: 'center',
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadMoreText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 8,
  },
  loadMoreSubtext: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    marginTop: 4,
  },
});