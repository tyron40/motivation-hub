import React, { useEffect, useRef, useCallback, useState, useMemo } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TouchableOpacity,
  Image,
  SafeAreaView,
  Animated,
  Share,
  Platform,
  Alert,
  Modal,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronDown, Heart, Share2, Plus } from 'lucide-react-native';
import { useSpeechContext } from '@/hooks/speech-context';
import { router } from 'expo-router';
import AudioOnlyVideoPlayer from '@/components/AudioOnlyVideoPlayer';
import type { AudioOnlyVideoPlayerRef } from '@/components/AudioOnlyVideoPlayer';
import { useTheme } from '@/hooks/theme-context';
import { useAdMob } from '@/hooks/admob-context';
import { usePlaylists } from '@/hooks/playlist-context';
import * as Haptics from 'expo-haptics';


export default function PlayerScreen() {
  const { colors } = useTheme();
  const { 
    currentSpeech, 
    toggleFavorite, 
    skipToNext, 
    skipToPrevious, 
    setIsMinimized,
    currentPlaylist,
    audioPlayerRef,
    setIsPlaying,
    setCurrentTime,
    setDuration,
  } = useSpeechContext();
  const { showInterstitialAd, canShowAds, tryShowInterstitialOnTransition, isShowingAd } = useAdMob();
  const { playlists, addToPlaylist } = usePlaylists();
  const localPlayerRef = useRef<AudioOnlyVideoPlayerRef>(null);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const midpointAdShownRef = useRef(false);
  const quarterAdShownRef = useRef(false);
  const openAdShownRef = useRef(false);
  const onEndLockedRef = useRef(false);
  const wasPlayingBeforeAdRef = useRef(false);
  const pendingOpenAdResumeRef = useRef(false);
  const adJustFinishedRef = useRef(false);
  const [showPlaylistModal, setShowPlaylistModal] = useState(false);
  const styles = getStyles(colors);
  const sortedPlaylists = useMemo(
    () => [...playlists].sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0)),
    [playlists]
  );

  useEffect(() => {
    setIsMinimized(false);
    if (!openAdShownRef.current && canShowAds) {
      openAdShownRef.current = true;
      pendingOpenAdResumeRef.current = true;
      localPlayerRef.current?.pause();
      console.log('[Ad] Player opened — attempting interstitial before speech starts');
      void tryShowInterstitialOnTransition().then(() => {
        pendingOpenAdResumeRef.current = false;
        setTimeout(() => {
          localPlayerRef.current?.resumeAfterAd();
        }, 400);
      });
    }
    return () => {
      audioPlayerRef.current = null;
    };
  }, [setIsMinimized, audioPlayerRef, canShowAds, tryShowInterstitialOnTransition]);

  useEffect(() => {
    if (isShowingAd) {
      console.log('[Ad] Ad started showing, saving play state');
      wasPlayingBeforeAdRef.current = (localPlayerRef.current?.getIsPlaying() ?? false) || pendingOpenAdResumeRef.current;
      localPlayerRef.current?.pause();
    } else if (wasPlayingBeforeAdRef.current) {
      console.log('[Ad] Ad finished, resuming playback');
      adJustFinishedRef.current = true;
      const shouldResume = wasPlayingBeforeAdRef.current;
      wasPlayingBeforeAdRef.current = false;
      setTimeout(() => {
        if (shouldResume && localPlayerRef.current) {
          localPlayerRef.current.resumeAfterAd();
        }
        adJustFinishedRef.current = false;
      }, 600);
    }
  }, [isShowingAd]);

  useEffect(() => {
    if (localPlayerRef.current) {
      audioPlayerRef.current = localPlayerRef.current;
    }
    midpointAdShownRef.current = false;
    quarterAdShownRef.current = false;
  }, [audioPlayerRef, currentSpeech]);

  const handleMinimize = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsMinimized(true);
    router.back();
  };

  const handleNext = useCallback(() => {
    skipToNext();
  }, [skipToNext]);

  const handlePrevious = useCallback(() => {
    skipToPrevious();
  }, [skipToPrevious]);

  const handlePlayingChange = useCallback((playing: boolean) => {
    console.log('Player playing state changed:', playing);
    setIsPlaying(playing);
  }, [setIsPlaying]);

  const handleProgressChange = useCallback((time: number, dur: number) => {
    setCurrentTime(time);
    if (dur > 0) {
      setDuration(dur);
    }
  }, [setCurrentTime, setDuration]);

  const handleEnd = useCallback(async () => {
    try {
      if (onEndLockedRef.current) {
        console.log('onEnd already processing, skipping');
        return;
      }
      onEndLockedRef.current = true;
      console.log('Audio playback ended');
      midpointAdShownRef.current = false;
      if (canShowAds) {
        try {
          const shown = await tryShowInterstitialOnTransition();
          if (shown) {
            console.log('[Ad] Speech ended — showed interstitial');
          }
        } catch (adErr) {
          console.log('Ad error on end, continuing:', adErr);
        }
      }
      handleNext();
    } catch (err) {
      console.error('Error in handleEnd:', err);
    } finally {
      setTimeout(() => { onEndLockedRef.current = false; }, 2000);
    }
  }, [canShowAds, tryShowInterstitialOnTransition, handleNext]);

  const handleProgressWithAds = useCallback((time: number, dur: number) => {
    handleProgressChange(time, dur);
    if (adJustFinishedRef.current) return;
    if (canShowAds && dur > 0) {
      const progress = time / dur;
      if (!quarterAdShownRef.current && dur >= 120 && progress >= 0.25 && progress < 0.30) {
        quarterAdShownRef.current = true;
        console.log('[Ad] 25% reached — showing interstitial');
        wasPlayingBeforeAdRef.current = true;
        void showInterstitialAd();
      }
      if (!midpointAdShownRef.current && dur >= 60 && progress >= 0.5 && progress < 0.55) {
        midpointAdShownRef.current = true;
        console.log('[Ad] Midpoint reached — showing interstitial');
        wasPlayingBeforeAdRef.current = true;
        void showInterstitialAd();
      }
    }
  }, [handleProgressChange, canShowAds, showInterstitialAd]);

  const handleAddToPlaylist = useCallback(async () => {
    if (!currentSpeech) return;
    if (!playlists.length) {
      Alert.alert(
        'No Playlists',
        'Create a playlist first from the Playlists screen.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Go to Playlists',
            onPress: () => router.push('/playlists'),
          },
        ]
      );
      return;
    }

    setShowPlaylistModal(true);
  }, [currentSpeech, playlists.length]);

  const handleSaveToPlaylist = useCallback(async (playlistId: string) => {
    if (!currentSpeech) return;
    const playlist = playlists.find((p) => p.id === playlistId);
    if (!playlist) return;

    try {
      await addToPlaylist(playlist.id, currentSpeech.id);
      setShowPlaylistModal(false);
      Alert.alert(
        'Saved',
        `"${currentSpeech.title}" was added to "${playlist.name}".`,
        [
          { text: 'OK' },
          {
            text: 'Open Playlist',
            onPress: () => router.push(`/playlist/${playlist.id}`),
          },
          {
            text: 'Playlists',
            onPress: () => router.push('/playlists'),
          },
        ]
      );
    } catch (error) {
      console.error('Error adding to playlist:', error);
      Alert.alert('Error', 'Failed to add speech to playlist.');
    }
  }, [currentSpeech, playlists, addToPlaylist]);

  const handleShare = async () => {
    if (!currentSpeech) return;
    try {
      const message = `Check out "${currentSpeech.title}" by ${currentSpeech.speaker} on Motivation Fuel!`;
      const url = currentSpeech.youtubeId 
        ? `https://youtube.com/watch?v=${currentSpeech.youtubeId}` 
        : undefined;
      
      if (Platform.OS === 'web') {
        if (navigator.share) {
          await navigator.share({ title: currentSpeech.title, text: message, url });
        }
      } else {
        await Share.share({ message, url });
      }
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.loop(
        Animated.sequence([
          Animated.timing(scaleAnim, {
            toValue: 1.03,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: true,
          }),
        ])
      ),
    ]).start();
  }, [scaleAnim, fadeAnim]);

  if (!currentSpeech) {
    return null;
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['rgba(0,0,0,0.95)', '#000000', '#000000']}
        style={styles.gradientBackground}
      />
      <SafeAreaView style={styles.safeArea}>
        <Animated.View style={[styles.header, { opacity: fadeAnim }]}>
          <TouchableOpacity onPress={handleMinimize} style={styles.closeButton}>
            <ChevronDown color="#FFFFFF" size={30} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>NOW PLAYING</Text>
          <View style={styles.closeButton} />
        </Animated.View>

        <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
          {currentSpeech.youtubeId ? (
            <View style={styles.playerWrapper}>
              <AudioOnlyVideoPlayer
                ref={localPlayerRef}
                videoId={currentSpeech.youtubeId}
                title={currentSpeech.title}
                thumbnail={currentSpeech.youtubeId 
                  ? `https://i.ytimg.com/vi/${currentSpeech.youtubeId}/hqdefault.jpg`
                  : currentSpeech.imageUrl
                }
                channelTitle={currentSpeech.speaker}
                autoplay={true}
                onError={(error: string) => {
                  console.error('Audio playback error:', error);
                }}
                onEnd={handleEnd}
                onNext={currentPlaylist.length > 1 ? handleNext : undefined}
                onPrevious={currentPlaylist.length > 1 ? handlePrevious : undefined}
                onPlayingChange={handlePlayingChange}
                onProgressChange={handleProgressWithAds}
              />
            </View>
          ) : (
            <>
              <Animated.View style={[styles.imageContainer, { transform: [{ scale: scaleAnim }] }]}>
                <Image source={{ uri: currentSpeech.imageUrl }} style={styles.image} />
                <LinearGradient
                  colors={['transparent', 'rgba(0,0,0,0.4)']}
                  style={styles.imageGradient}
                />
              </Animated.View>
              
              <View style={styles.info}>
                <Text style={styles.title} numberOfLines={2}>{currentSpeech.title}</Text>
                <Text style={styles.speaker}>{currentSpeech.speaker}</Text>
                <View style={styles.categoryBadge}>
                  <Text style={styles.categoryText}>{(currentSpeech.category || '').toUpperCase()}</Text>
                </View>
              </View>
            </>
          )}

          <View style={styles.bottomActions}>
            <TouchableOpacity 
              onPress={() => toggleFavorite(currentSpeech.id)} 
              style={[
                styles.actionButton,
                currentSpeech.isFavorite && styles.actionButtonActive,
              ]}
              activeOpacity={0.7}
            >
              <Heart 
                color={currentSpeech.isFavorite ? '#FF3B30' : 'rgba(255,255,255,0.8)'} 
                size={22} 
                fill={currentSpeech.isFavorite ? '#FF3B30' : 'transparent'}
                strokeWidth={currentSpeech.isFavorite ? 0 : 1.8}
              />
              <Text style={[
                styles.actionLabel,
                currentSpeech.isFavorite && styles.actionLabelActive,
              ]}>
                {currentSpeech.isFavorite ? 'Saved' : 'Save'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton} activeOpacity={0.7} onPress={handleAddToPlaylist}>
              <Plus color="rgba(255,255,255,0.8)" size={22} strokeWidth={1.8} />
              <Text style={styles.actionLabel}>Playlist</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton} activeOpacity={0.7} onPress={handleShare}>
              <Share2 color="rgba(255,255,255,0.8)" size={22} strokeWidth={1.8} />
              <Text style={styles.actionLabel}>Share</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
        <Modal
          visible={showPlaylistModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowPlaylistModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Save to Playlist</Text>
              <Text style={styles.modalSubtitle}>Choose where to save this speech</Text>

              <ScrollView style={styles.modalList} showsVerticalScrollIndicator={false}>
                {sortedPlaylists.map((playlist) => (
                  <TouchableOpacity
                    key={playlist.id}
                    style={styles.modalListItem}
                    onPress={() => handleSaveToPlaylist(playlist.id)}
                  >
                    <View style={[styles.colorDot, { backgroundColor: playlist.color || '#8B4513' }]} />
                    <View style={styles.modalListTextWrap}>
                      <Text style={styles.modalListItemTitle}>{playlist.name}</Text>
                      <Text style={styles.modalListItemSubtitle}>
                        {playlist.speechIds.length} {playlist.speechIds.length === 1 ? 'speech' : 'speeches'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalSecondaryButton]}
                  onPress={() => {
                    setShowPlaylistModal(false);
                    router.push('/playlists');
                  }}
                >
                  <Text style={styles.modalSecondaryButtonText}>Manage Playlists</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalPrimaryButton]}
                  onPress={() => setShowPlaylistModal(false)}
                >
                  <Text style={styles.modalPrimaryButtonText}>Done</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </View>
  );
}

const getStyles = (_colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  gradientBackground: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1.5,
    opacity: 0.9,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playerWrapper: {
    width: '100%',
    alignItems: 'center',
  },
  imageContainer: {
    width: '85%',
    aspectRatio: 1,
    maxWidth: 340,
    maxHeight: 340,
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 48,
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    position: 'relative',
    backgroundColor: '#1C1C1E',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imageGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '30%',
  },
  info: {
    alignItems: 'center',
    marginBottom: 48,
    paddingHorizontal: 20,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 32,
  },
  speaker: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '500',
    opacity: 0.8,
    marginBottom: 16,
  },
  categoryBadge: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  categoryText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1,
    opacity: 0.9,
  },
  bottomActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 40,
    marginTop: 24,
  },
  actionButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.06)',
    minWidth: 80,
  },
  actionButtonActive: {
    backgroundColor: 'rgba(255,59,48,0.12)',
  },
  actionLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 11,
    fontWeight: '600' as const,
    marginTop: 6,
    letterSpacing: 0.3,
  },
  actionLabelActive: {
    color: '#FF3B30',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.72)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#111214',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    paddingHorizontal: 18,
    paddingBottom: 24,
    maxHeight: '70%',
  },
  modalTitle: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: '700',
  },
  modalSubtitle: {
    color: 'rgba(255,255,255,0.65)',
    marginTop: 4,
    marginBottom: 14,
    fontSize: 13,
  },
  modalList: {
    maxHeight: 280,
  },
  modalListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.12)',
  },
  colorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 10,
  },
  modalListTextWrap: {
    flex: 1,
  },
  modalListItemTitle: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '600',
  },
  modalListItemSubtitle: {
    color: 'rgba(255,255,255,0.58)',
    fontSize: 12,
    marginTop: 2,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalSecondaryButton: {
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  modalPrimaryButton: {
    backgroundColor: '#8B4513',
  },
  modalSecondaryButtonText: {
    color: '#FFF',
    fontWeight: '600',
  },
  modalPrimaryButtonText: {
    color: '#FFF',
    fontWeight: '700',
  },
});
