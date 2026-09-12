import React from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, router } from 'expo-router';
import { Church, Sparkles } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/theme-context';
import { useSpeechContext } from '@/hooks/speech-context';
import { useUserProfile } from '@/hooks/user-profile-context';
import { SpeechCard } from '@/components/SpeechCard';
import { YouTubeContentManager } from '@/services/YouTubeContentManager';
import type { CachedVideo } from '@/services/YouTubeContentManager';
import type { Speech } from '@/types/speech';
const cachedVideoToSpeech = (video: CachedVideo): Speech => ({
  id: video.id,
  title: video.title,
  speaker: video.channelTitle,
  duration: video.duration,
  category: video.category || 'Church Motivation',
  imageUrl: video.thumbnail,
  audioUrl: `https://www.youtube.com/watch?v=${video.id}`,
  youtubeId: video.id,
  description: video.description,
  playCount: Math.floor(video.viewCount / 1000),
  tags: [],
});

export default function ChurchMotivationScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { profile, updateProfile } = useUserProfile();
  const speechContext = useSpeechContext();
  const [isLoading, setIsLoading] = React.useState<boolean>(true);
  const [churchSpeeches, setChurchSpeeches] = React.useState<Speech[]>([]);

  const styles = getStyles(colors);

  React.useEffect(() => {
    let cancelled = false;

    const loadChurchContent = async () => {
      if (!profile.includeChurchMotivation) {
        if (!cancelled) {
          setChurchSpeeches([]);
          setIsLoading(false);
        }
        return;
      }

      try {
        /*
         * Church Motivation uses the same cache-first pipeline as normal
         * categories. Startup already hydrates and prewarms this exact pool.
         *
         * 1. Synchronous memory cache = immediate first paint.
         * 2. Persisted cache = fast fallback after a cold app launch.
         * 3. getVideosForCategory = background refresh/fill while cached
         *    content remains visible.
         */
        const memoryCached =
          YouTubeContentManager.getCachedVideosSync('Church Motivation');

        if (memoryCached && memoryCached.length > 0) {
          if (!cancelled) {
            setChurchSpeeches(
              memoryCached.slice(0, 40).map(cachedVideoToSpeech)
            );
            setIsLoading(false);
          }
        }

        const persistedCached =
          await YouTubeContentManager.getCachedVideosForCategory(
            'Church Motivation'
          );

        if (persistedCached.length > 0 && !cancelled) {
          setChurchSpeeches(
            persistedCached.slice(0, 40).map(cachedVideoToSpeech)
          );
          setIsLoading(false);
        }

        if (!cancelled && persistedCached.length === 0) {
          setIsLoading(true);
        }

        const refreshed = await YouTubeContentManager.getVideosForCategory(
          'Church Motivation',
          40
        );

        if (!cancelled && refreshed.length > 0) {
          setChurchSpeeches(
            refreshed.slice(0, 40).map(cachedVideoToSpeech)
          );
          setIsLoading(false);
        }
      } catch (error) {
        console.error('[Church Motivation] Failed to load content:', error);

        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void loadChurchContent();

    return () => {
      cancelled = true;
    };
  }, [profile.includeChurchMotivation]);

  if (!speechContext) {
    return null;
  }

  const { setCurrentSpeech, toggleFavorite } = speechContext;

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <LinearGradient colors={[colors.background, colors.card]} style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
            <View style={styles.headerRow}>
              <View>
                <Text style={styles.overline}>Faith & Focus</Text>
                <Text style={styles.title}>Church Motivation</Text>
              </View>
              <View style={styles.badge}>
                <Church size={16} color={colors.text} />
                <Text style={styles.badgeText}>Curated</Text>
              </View>
            </View>
            <Text style={styles.subtitle}>Encouraging, faith-based YouTube motivation for your day.</Text>
          </View>

          {!profile.includeChurchMotivation ? (
            <View style={styles.lockedCard}>
              <Sparkles size={22} color={colors.primary} />
              <Text style={styles.lockedTitle}>Church Motivation is off</Text>
              <Text style={styles.lockedText}>Turn it on to unlock faith-focused motivation content.</Text>
              <TouchableOpacity
                testID="enable-church-motivation-button"
                style={styles.enableButton}
                onPress={async () => {
                  await updateProfile({ includeChurchMotivation: true });
                }}
              >
                <Text style={styles.enableButtonText}>Enable Church Motivation</Text>
              </TouchableOpacity>
            </View>
          ) : isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.loadingText}>Loading church motivation...</Text>
            </View>
          ) : (
            <View style={styles.listSection}>
              {churchSpeeches.map((speech) => (
                <SpeechCard
                  key={speech.id}
                  speech={speech}
                  onPress={() => {
                    setCurrentSpeech(speech);
                    router.push('/player');
                  }}
                  onFavorite={() => toggleFavorite(speech.id)}
                />
              ))}
            </View>
          )}
        </ScrollView>
      </LinearGradient>
    </>
  );
}

const getStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    scrollContent: {
      paddingBottom: 120,
    },
    header: {
      paddingHorizontal: 20,
      marginBottom: 16,
    },
    headerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    overline: {
      color: colors.textSecondary,
      fontSize: 12,
      fontWeight: '600' as const,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
    },
    title: {
      color: colors.text,
      fontSize: 28,
      fontWeight: '800' as const,
      marginTop: 2,
    },
    subtitle: {
      color: colors.textSecondary,
      fontSize: 14,
      marginTop: 10,
      lineHeight: 20,
    },
    badge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: colors.cardBackground,
      borderRadius: 999,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.1)',
    },
    badgeText: {
      color: colors.text,
      fontSize: 12,
      fontWeight: '700' as const,
    },
    loadingContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingTop: 40,
      gap: 10,
    },
    loadingText: {
      color: colors.text,
      fontSize: 14,
      fontWeight: '600' as const,
    },
    listSection: {
      gap: 2,
    },
    lockedCard: {
      marginHorizontal: 20,
      marginTop: 12,
      backgroundColor: colors.cardBackground,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.1)',
      padding: 18,
      gap: 10,
    },
    lockedTitle: {
      color: colors.text,
      fontSize: 18,
      fontWeight: '700' as const,
    },
    lockedText: {
      color: colors.textSecondary,
      fontSize: 14,
      lineHeight: 20,
    },
    enableButton: {
      marginTop: 6,
      backgroundColor: colors.primary,
      borderRadius: 12,
      paddingVertical: 12,
      alignItems: 'center',
    },
    enableButtonText: {
      color: colors.background,
      fontSize: 14,
      fontWeight: '700' as const,
    },
  });
