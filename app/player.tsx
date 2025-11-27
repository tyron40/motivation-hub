import React, { useEffect, useRef } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TouchableOpacity,
  Image,
  SafeAreaView,
  Animated,
  Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronDown, Heart, Share2, Youtube, MoreVertical, SkipForward, SkipBack } from 'lucide-react-native';
import { useCurrentSpeech, useSpeechContext } from '@/hooks/speech-context';
import { Speech } from '@/types/speech';
import { router } from 'expo-router';
import { useTheme } from '@/hooks/theme-context';

export default function PlayerScreen() {
  const { colors } = useTheme();
  const { currentSpeech } = useCurrentSpeech();
  const { toggleFavorite, speeches, setCurrentSpeech } = useSpeechContext();
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const styles = getStyles(colors);

  const handleNext = () => {
    if (!currentSpeech || !speeches || speeches.length === 0) return;
    
    const currentIndex = speeches.findIndex((s: Speech) => s.id === currentSpeech.id);
    if (currentIndex === -1) return;
    
    const nextIndex = (currentIndex + 1) % speeches.length;
    const nextSpeech = speeches[nextIndex];
    
    if (nextSpeech) {
      console.log('⏭️ Skipping to next video:', nextSpeech.title);
      setCurrentSpeech(nextSpeech);
    }
  };

  const handlePrevious = () => {
    if (!currentSpeech || !speeches || speeches.length === 0) return;
    
    const currentIndex = speeches.findIndex((s: Speech) => s.id === currentSpeech.id);
    if (currentIndex === -1) return;
    
    const previousIndex = currentIndex === 0 ? speeches.length - 1 : currentIndex - 1;
    const previousSpeech = speeches[previousIndex];
    
    if (previousSpeech) {
      console.log('⏮️ Skipping to previous video:', previousSpeech.title);
      setCurrentSpeech(previousSpeech);
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
          <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
            <ChevronDown color="#FFFFFF" size={30} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>NOW PLAYING</Text>
          <TouchableOpacity style={styles.moreButton}>
            <MoreVertical color="#FFFFFF" size={24} />
          </TouchableOpacity>
        </Animated.View>

        <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
          {currentSpeech.youtubeId ? (
            <View style={styles.playerWrapper}>
              <Animated.View style={[styles.imageContainer, { transform: [{ scale: scaleAnim }] }]}>
                <Image 
                  source={{ 
                    uri: currentSpeech.youtubeId 
                      ? `https://i.ytimg.com/vi/${currentSpeech.youtubeId}/maxresdefault.jpg`
                      : currentSpeech.imageUrl
                  }} 
                  style={styles.image} 
                />
                <LinearGradient
                  colors={['transparent', 'rgba(0,0,0,0.4)']}
                  style={styles.imageGradient}
                />
                <TouchableOpacity 
                  style={styles.playOverlay}
                  onPress={() => {
                    if (currentSpeech.youtubeId) {
                      const youtubeUrl = `https://www.youtube.com/watch?v=${currentSpeech.youtubeId}`;
                      console.log('🎬 Opening YouTube:', youtubeUrl);
                      Linking.openURL(youtubeUrl).catch(err => {
                        console.error('Failed to open YouTube:', err);
                      });
                    }
                  }}
                >
                  <View style={styles.playButton}>
                    <Youtube color="#FFFFFF" size={48} />
                  </View>
                  <Text style={styles.playText}>Watch on YouTube</Text>
                </TouchableOpacity>
              </Animated.View>
              
              <View style={styles.info}>
                <Text style={styles.title} numberOfLines={2}>{currentSpeech.title}</Text>
                <Text style={styles.speaker}>{currentSpeech.speaker}</Text>
                <View style={styles.categoryBadge}>
                  <Text style={styles.categoryText}>{(currentSpeech.category || '').toUpperCase()}</Text>
                </View>
              </View>

              <View style={styles.actionButtons}>
                <TouchableOpacity 
                  onPress={handlePrevious}
                  style={styles.navButton}
                  disabled={!speeches || speeches.length <= 1}
                >
                  <SkipBack color="#FFFFFF" size={28} />
                </TouchableOpacity>
                <TouchableOpacity 
                  onPress={handleNext}
                  style={styles.navButton}
                  disabled={!speeches || speeches.length <= 1}
                >
                  <SkipForward color="#FFFFFF" size={28} />
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <>
              <Animated.View style={[styles.imageContainer, { transform: [{ scale: scaleAnim }] }]}>
                <Image source={{ uri: currentSpeech.imageUrl }} style={styles.image} />
                <LinearGradient
                  colors={['transparent', 'rgba(0,0,0,0.4)']}
                  style={styles.imageGradient}
                />
                <View style={styles.imageOverlay}>
                  <View style={styles.noVideoOverlay}>
                    <Youtube color="#FFFFFF" size={36} />
                    <Text style={styles.noVideoText}>No audio available</Text>
                  </View>
                </View>
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
              style={styles.actionButton}
            >
              <Heart 
                color={currentSpeech.isFavorite ? '#FF3B30' : '#FFFFFF'} 
                size={26} 
                fill={currentSpeech.isFavorite ? '#FF3B30' : 'transparent'}
                strokeWidth={currentSpeech.isFavorite ? 0 : 2}
              />
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton}>
              <Share2 color="#FFFFFF" size={24} strokeWidth={2} />
            </TouchableOpacity>
          </View>
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

const getStyles = (colors: any) => StyleSheet.create({
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
  moreButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
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
  playOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  playButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FF0000',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FF0000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 8,
  },
  playText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 16,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 40,
    marginTop: 32,
  },
  navButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
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
  imageOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
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
  noVideoOverlay: {
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.8)',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  noVideoText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
    opacity: 0.9,
  },
  bottomActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 32,
    marginTop: 20,
  },
  actionButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
});
