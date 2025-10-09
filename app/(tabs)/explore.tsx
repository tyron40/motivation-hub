import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Search, Radio, CheckCircle, XCircle, Video } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import Colors from '@/constants/colors';
import { SpeechCard } from '@/components/SpeechCard';
import { useSpeechContext, useSpeechSearch } from '@/hooks/speech-context';
import { router } from 'expo-router';

export default function ExploreScreen() {
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSearchingOnline, setIsSearchingOnline] = useState<boolean>(false);
  const [apiStatus, setApiStatus] = useState<'testing' | 'working' | 'failed' | null>(null);
  const { toggleFavorite, setCurrentSpeech, speeches, searchOnlineSpeeches, isLoading } = useSpeechContext();
  const searchResults = useSpeechSearch(searchQuery);

  useEffect(() => {
    setApiStatus('working');
    console.log('✅ API ready (using embedded speeches)');
  }, []);

  const handleSpeechPress = (speech: any) => {
    setCurrentSpeech(speech);
    router.push('/player');
  };

  const handleOnlineSearch = async () => {
    if (!searchQuery.trim()) return;

    setIsSearchingOnline(true);
    try {
      console.log(`🔍 Searching podcasts for: "${searchQuery}"`);
      await searchOnlineSpeeches(searchQuery);
      console.log(`✅ Podcast search completed for: "${searchQuery}"`);
    } catch (error) {
      console.error('❌ Online search failed:', error);
    } finally {
      setIsSearchingOnline(false);
    }
  };

  const displaySpeeches = searchQuery ? searchResults : speeches;

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <LinearGradient
        colors={[Colors.background, '#1A1A2E']}
        style={styles.container}
        testID="explore-screen"
      >
        <View style={styles.safeArea}>
          <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
            <View style={styles.titleRow}>
              <Text style={styles.title}>Explore</Text>
              <View style={styles.apiStatusBadge}>
                {apiStatus === 'testing' && (
                  <View style={styles.statusContent}>
                    <ActivityIndicator size={12} color={Colors.primary} />
                    <Text style={styles.apiStatusText}>Testing API...</Text>
                  </View>
                )}
                {apiStatus === 'working' && (
                  <View style={styles.statusContent}>
                    <CheckCircle size={12} color="#10B981" />
                    <Text style={[styles.apiStatusText, { color: '#10B981' }]}>Podcasts Ready</Text>
                  </View>
                )}
                {apiStatus === 'failed' && (
                  <View style={styles.statusContent}>
                    <XCircle size={12} color="#EF4444" />
                    <Text style={[styles.apiStatusText, { color: '#EF4444' }]}>API Failed</Text>
                  </View>
                )}
              </View>
            </View>
            <View style={styles.searchContainer}>
              <Search color={Colors.textSecondary} size={20} />
              <TextInput
                testID="explore-search-input"
                style={styles.searchInput}
                placeholder={apiStatus === 'working' ? 'Search podcasts for speeches...' : 'Search local speeches...'}
                placeholderTextColor={Colors.textSecondary}
                value={searchQuery}
                onChangeText={setSearchQuery}
                onSubmitEditing={handleOnlineSearch}
                returnKeyType="search"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity
                  style={[
                    styles.onlineSearchButton,
                    apiStatus === 'working' && styles.onlineSearchButtonActive,
                    apiStatus === 'failed' && styles.onlineSearchButtonDisabled,
                  ]}
                  onPress={handleOnlineSearch}
                  disabled={isSearchingOnline || isLoading || apiStatus !== 'working'}
                >
                  {isSearchingOnline || isLoading ? (
                    <ActivityIndicator size="small" color={Colors.primary} />
                  ) : (
                    <Radio
                      size={16}
                      color={
                        apiStatus === 'working'
                          ? Colors.primary
                          : apiStatus === 'failed'
                          ? '#EF4444'
                          : Colors.textSecondary
                      }
                    />
                  )}
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.quickActions}>
              <TouchableOpacity style={styles.actionButton} onPress={() => router.push('/videos')}>
                <Video size={20} color={Colors.primary} />
                <Text style={styles.actionButtonText}>Browse Videos</Text>
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            {searchQuery && searchResults.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>No speeches found</Text>
                <Text style={styles.emptySubtext}>Try searching for different keywords</Text>
              </View>
            ) : (
              <View>
                <View style={styles.resultsHeader}>
                  <Text style={styles.resultsCount} testID="explore-results-count">
                    {searchQuery ? `${String(searchResults.length)} results found` : `All ${String(speeches.length)} speeches`}
                  </Text>
                  {searchQuery && apiStatus === 'working' ? (
                    <Text style={styles.searchHint}>Press antenna to search podcasts online</Text>
                  ) : null}
                </View>
                {displaySpeeches
                  .filter((speech) => speech && typeof speech === 'object' && (speech as any).id && (speech as any).title)
                  .map((speech, index) => {
                    if (!speech || typeof speech !== 'object' || !(speech as any).id || !(speech as any).title) {
                      return null;
                    }
                    return (
                      <SpeechCard
                        key={`explore-speech-${(speech as any).id}-${index}`}
                        speech={speech as any}
                        onPress={() => handleSpeechPress(speech as any)}
                        onFavorite={() => toggleFavorite((speech as any).id)}
                      />
                    );
                  })}
              </View>
            )}
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
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    color: Colors.text,
    fontSize: 28,
    fontWeight: 'bold',
    letterSpacing: -0.5,
  },
  apiStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  apiStatusText: {
    color: Colors.textSecondary,
    fontSize: 10,
    fontWeight: '600',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.cardBackground,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: Colors.text,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  resultsHeader: {
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 8,
  },
  resultsCount: {
    color: Colors.textSecondary,
    fontSize: 14,
  },
  searchHint: {
    color: Colors.primary,
    fontSize: 12,
    marginTop: 2,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
  },
  emptyText: {
    color: Colors.text,
    fontSize: 18,
    fontWeight: '600',
  },
  emptySubtext: {
    color: Colors.textSecondary,
    fontSize: 14,
    marginTop: 8,
  },
  onlineSearchButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.textSecondary,
    marginLeft: 8,
  },
  onlineSearchButtonActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '10',
  },
  onlineSearchButtonDisabled: {
    borderColor: '#EF4444',
    backgroundColor: '#EF444410',
  },
  quickActions: {
    flexDirection: 'row',
    paddingTop: 12,
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.cardBackground,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.primary + '30',
  },
  actionButtonText: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  statusContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
});