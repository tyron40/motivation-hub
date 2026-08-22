import React, { useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, Music } from 'lucide-react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { usePlaylists } from '@/hooks/playlist-context';
import { useSpeechContext } from '@/hooks/speech-context';
import { SpeechCard } from '@/components/SpeechCard';
import { useTheme } from '@/hooks/theme-context';

export default function PlaylistDetailScreen() {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const params = useLocalSearchParams<{ id?: string }>();
  const playlistId = typeof params.id === 'string' ? params.id : '';

  const { playlists, removeFromPlaylist } = usePlaylists();
  const { speeches, setCurrentSpeech, setCurrentPlaylist, toggleFavorite } = useSpeechContext();

  const playlist = useMemo(
    () => playlists.find((p) => p.id === playlistId) ?? null,
    [playlists, playlistId]
  );

  const playlistSpeeches = useMemo(() => {
    if (!playlist) return [];
    const byId = new Map(speeches.map((s) => [s.id, s]));
    return playlist.speechIds.map((id) => byId.get(id)).filter(Boolean) as typeof speeches;
  }, [playlist, speeches]);

  const handlePlayAll = () => {
    if (!playlistSpeeches.length) return;
    setCurrentPlaylist(playlistSpeeches);
    setCurrentSpeech(playlistSpeeches[0]);
    router.push('/player');
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <LinearGradient colors={[colors.background, colors.card]} style={styles.container}>
        <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
          <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
              <ArrowLeft color={colors.text} size={24} />
            </TouchableOpacity>

            <View style={styles.headerCenter}>
              <Text style={styles.title} numberOfLines={1}>
                {playlist?.name || 'Playlist'}
              </Text>
              <Text style={styles.subtitle}>
                {playlistSpeeches.length} {playlistSpeeches.length === 1 ? 'speech' : 'speeches'}
              </Text>
            </View>

            <TouchableOpacity
              style={[
                styles.playAllButton,
                { backgroundColor: playlist?.color || colors.primary },
                !playlistSpeeches.length && styles.playAllDisabled,
              ]}
              onPress={handlePlayAll}
              disabled={!playlistSpeeches.length}
            >
              <Text style={styles.playAllText}>Play All</Text>
            </TouchableOpacity>
          </View>

          {!playlist ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>Playlist not found</Text>
            </View>
          ) : (
            <ScrollView
              style={styles.content}
              contentContainerStyle={styles.contentContainer}
              showsVerticalScrollIndicator={false}
            >
              {playlist.description ? (
                <Text style={styles.description}>{playlist.description}</Text>
              ) : null}

              {playlistSpeeches.length === 0 ? (
                <View style={styles.emptyState}>
                  <LinearGradient
                    colors={['rgba(139, 69, 19, 0.2)', 'rgba(139, 69, 19, 0.1)']}
                    style={styles.emptyIcon}
                  >
                    <Music color={colors.primary} size={44} />
                  </LinearGradient>
                  <Text style={styles.emptyTitle}>No speeches yet</Text>
                  <Text style={styles.emptySubtitle}>
                    Save speeches from the player to this playlist.
                  </Text>
                </View>
              ) : (
                playlistSpeeches.map((speech) => (
                  <View key={speech.id} style={styles.cardWrap}>
                    <SpeechCard
                      speech={speech}
                      onPress={() => {
                        setCurrentPlaylist(playlistSpeeches);
                        setCurrentSpeech(speech);
                        router.push('/player');
                      }}
                      onFavorite={() => toggleFavorite(speech.id)}
                    />
                    <TouchableOpacity
                      style={styles.removeButton}
                      onPress={() => removeFromPlaylist(playlist.id, speech.id)}
                    >
                      <Text style={styles.removeButtonText}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </ScrollView>
          )}
        </SafeAreaView>
      </LinearGradient>
    </>
  );
}

const getStyles = (colors: any) =>
  StyleSheet.create({
    container: { flex: 1 },
    safeArea: { flex: 1 },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      gap: 12,
    },
    backButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.cardBackground,
      justifyContent: 'center',
      alignItems: 'center',
    },
    headerCenter: { flex: 1 },
    title: {
      color: colors.text,
      fontSize: 20,
      fontWeight: '700',
    },
    subtitle: {
      color: colors.textSecondary,
      marginTop: 2,
      fontSize: 12,
    },
    playAllButton: {
      paddingHorizontal: 14,
      paddingVertical: 9,
      borderRadius: 18,
    },
    playAllDisabled: {
      opacity: 0.45,
    },
    playAllText: {
      color: '#fff',
      fontWeight: '700',
      fontSize: 13,
    },
    content: { flex: 1 },
    contentContainer: { paddingHorizontal: 16, paddingBottom: 20 },
    description: {
      color: colors.textSecondary,
      marginBottom: 12,
      lineHeight: 20,
    },
    cardWrap: { marginBottom: 14 },
    removeButton: {
      alignSelf: 'flex-end',
      marginTop: 8,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 10,
      backgroundColor: 'rgba(239,68,68,0.16)',
    },
    removeButtonText: {
      color: '#EF4444',
      fontSize: 12,
      fontWeight: '600',
    },
    emptyState: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: 80,
      gap: 14,
    },
    emptyIcon: {
      width: 90,
      height: 90,
      borderRadius: 45,
      justifyContent: 'center',
      alignItems: 'center',
    },
    emptyTitle: {
      color: colors.text,
      fontSize: 20,
      fontWeight: '700',
    },
    emptySubtitle: {
      color: colors.textSecondary,
      textAlign: 'center',
      paddingHorizontal: 30,
    },
  });
