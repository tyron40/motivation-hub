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
import { convertVideoToSpeech, searchVideos } from '@/services/youtubeService';
import type { Speech } from '@/types/speech';

export default function ChurchMotivationScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { profile, updateProfile } = useUserProfile();
  const speechContext = useSpeechContext();
  const [isLoading, setIsLoading] = React.useState<boolean>(true);
  const [churchSpeeches, setChurchSpeeches] = React.useState<Speech[]>([]);

  const styles = getStyles(colors);

  React.useEffect(() => {
    const loadChurchContent = async () => {
      try {
        setIsLoading(true);
        console.log('⛪ Loading all church motivation videos...');

        // Fetch from multiple search queries in parallel to get comprehensive coverage
        const searchQueries = [
          'church motivation encouragement sermon',
          'christian motivational speech inspiration',
          'faith motivation preaching powerful',
          'bible motivation encouragement word',
          'gospel motivation uplift spiritual',
          'christian testimony motivation overcome',
          'sermon inspiration faith hope',
          'church speech purpose destiny calling',
        ];

        const results = await Promise.all(
          searchQueries.map((query) => searchVideos(query, 50))
        );

        // Deduplicate by video ID
        const seenIds = new Set<string>();
        const allVideos: typeof results[0] = [];
        for (const videos of results) {
          for (const video of videos) {
            if (!seenIds.has(video.id)) {
              seenIds.add(video.id);
              allVideos.push(video);
            }
          }
        }

        const converted = allVideos.map((video) => convertVideoToSpeech(video));
        setChurchSpeeches(converted);
        console.log(`✅ Loaded ${converted.length} church motivation speeches from ${searchQueries.length} searches`);
      } catch (error) {
        console.error('❌ Failed to load church motivation videos:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (profile.includeChurchMotivation) {
      loadChurchContent();
    } else {
      setIsLoading(false);
    }
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
