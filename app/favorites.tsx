import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Heart, ArrowLeft } from 'lucide-react-native';
import { Stack, router } from 'expo-router';
import { useSpeechContext } from '@/hooks/speech-context';
import { SpeechCard } from '@/components/SpeechCard';
import { Speech } from '@/types/speech';
import { useTheme } from '@/hooks/theme-context';

export default function FavoritesScreen() {
  const { colors } = useTheme();
  const { favorites, toggleFavorite, setCurrentSpeech } = useSpeechContext();
  const styles = getStyles(colors);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <LinearGradient
        colors={[colors.background, colors.card]}
        style={styles.container}
      >
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <ArrowLeft color={colors.text} size={24} />
            </TouchableOpacity>
            <View style={styles.headerCenter}>
              <LinearGradient
                colors={[colors.categories.relationships, colors.secondary]}
                style={styles.headerIcon}
              >
                <Heart color="white" size={20} />
              </LinearGradient>
              <Text style={styles.title}>My Favorites</Text>
            </View>
            <View style={styles.headerRight} />
          </View>

          <ScrollView
            style={styles.content}
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
          >
            {favorites.length === 0 ? (
              <View style={styles.emptyState}>
                <LinearGradient
                  colors={['rgba(236, 72, 153, 0.2)', 'rgba(236, 72, 153, 0.1)']}
                  style={styles.emptyIcon}
                >
                  <Heart color={colors.categories.relationships} size={48} />
                </LinearGradient>
                <Text style={styles.emptyTitle}>No Favorites Yet</Text>
                <Text style={styles.emptySubtitle}>
                  Tap the heart icon on speeches you love to save them here
                </Text>
                <TouchableOpacity
                  style={styles.emptyButton}
                  onPress={() => router.push('/(tabs)')}
                >
                  <Text style={styles.emptyButtonText}>Browse Speeches</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <Text style={styles.countText}>
                  {favorites.length} {favorites.length === 1 ? 'speech' : 'speeches'}
                </Text>
                {favorites.map((speech: Speech) => (
                  <View key={speech.id} style={styles.speechCardWrapper}>
                    <SpeechCard
                      speech={speech}
                      onPress={() => {
                        setCurrentSpeech(speech);
                        router.push('/player');
                      }}
                      onFavorite={() => toggleFavorite(speech.id)}
                    />
                  </View>
                ))}
              </>
            )}
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.cardBackground,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerRight: {
    width: 40,
  },
  title: {
    color: colors.text,
    fontSize: 24,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  countText: {
    color: colors.textSecondary,
    fontSize: 14,
    marginBottom: 16,
    fontWeight: '500',
  },
  speechCardWrapper: {
    marginBottom: 16,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
    gap: 20,
  },
  emptyIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 22,
    fontWeight: 'bold',
  },
  emptySubtitle: {
    color: colors.textSecondary,
    fontSize: 16,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  emptyButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    marginTop: 8,
  },
  emptyButtonText: {
    color: colors.background,
    fontSize: 16,
    fontWeight: '600',
  },
});
