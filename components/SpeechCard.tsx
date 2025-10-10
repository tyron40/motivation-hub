import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Animated, Share, Alert, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Play, Heart, Clock, User, Share2, ListPlus } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { Speech } from '@/types/speech';

interface SpeechCardProps {
  speech: Speech;
  onPress: () => void;
  onFavorite: () => void;
  onAddToPlaylist?: () => void;
  variant?: 'featured' | 'compact';
}

export const SpeechCard: React.FC<SpeechCardProps> = ({ 
  speech, 
  onPress, 
  onFavorite,
  onAddToPlaylist,
  variant = 'compact' 
}) => {
  const [imageError, setImageError] = useState<boolean>(false);
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, [scaleAnim, fadeAnim]);
  
  // Ensure speech is a valid object
  if (!speech || typeof speech !== 'object' || !speech.title || !speech.speaker) {
    return null;
  }
  
  const handleImageError = () => {
    console.log('Image failed to load for speech:', speech.title);
    setImageError(true);
  };
  
  const renderImage = (style: any) => {
    // Always show YouTube thumbnail if we have a youtubeId
    const thumbnailUrl = speech.youtubeId 
      ? `https://i.ytimg.com/vi/${speech.youtubeId}/hqdefault.jpg`
      : speech.imageUrl;
    
    if (imageError || !thumbnailUrl) {
      return (
        <View style={[style, styles.placeholderImage]}>
          <User color={Colors.textSecondary} size={24} />
        </View>
      );
    }
    
    return (
      <Image 
        source={{ uri: thumbnailUrl }} 
        style={style}
        onError={handleImageError}
        defaultSource={undefined}
      />
    );
  };
  
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    return `${mins} min`;
  };

  const handleShare = async () => {
    try {
      const message = `Check out "${speech.title}" by ${speech.speaker}\n\n${speech.description || 'A motivational speech to inspire you!'}`;
      
      if (Platform.OS === 'web') {
        if (navigator.share) {
          await navigator.share({
            title: speech.title,
            text: message,
            url: speech.youtubeId ? `https://youtube.com/watch?v=${speech.youtubeId}` : undefined,
          });
        } else {
          await navigator.clipboard.writeText(message);
          Alert.alert('Copied!', 'Speech details copied to clipboard');
        }
      } else {
        const result = await Share.share({
          message,
          url: speech.youtubeId ? `https://youtube.com/watch?v=${speech.youtubeId}` : undefined,
        });
        
        if (result.action === Share.sharedAction) {
          console.log('✅ Speech shared successfully');
        }
      }
    } catch (error) {
      console.error('Error sharing speech:', error);
      if (Platform.OS !== 'web') {
        Alert.alert('Share Error', 'Failed to share this speech');
      }
    }
  };

  if (variant === 'featured') {
    return (
      <Animated.View style={{ transform: [{ scale: scaleAnim }], opacity: fadeAnim }}>
        <TouchableOpacity onPress={onPress} activeOpacity={0.9}>
          <LinearGradient
            colors={[Colors.gradient.start, Colors.gradient.end]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.featuredCard}
          >
          {renderImage(styles.featuredImage)}
          <View style={styles.featuredOverlay}>
            <View style={styles.featuredContent}>
              <Text style={styles.featuredCategory}>{String(speech.category || '')}</Text>
              <Text style={styles.featuredTitle}>{String(speech.title || '')}</Text>
              <Text style={styles.featuredSpeaker}>{String(speech.speaker || '')}</Text>
              <View style={styles.featuredMeta}>
                <View style={styles.duration}>
                  <View style={styles.durationIcon}>
                    <Clock color={Colors.text} size={14} />
                  </View>
                  <Text style={styles.durationText}>{formatDuration(speech.duration)}</Text>
                </View>
                <View style={styles.featuredActions}>
                  <TouchableOpacity onPress={handleShare} style={styles.actionBtn}>
                    <Share2 color={Colors.text} size={18} />
                  </TouchableOpacity>
                  {onAddToPlaylist && (
                    <TouchableOpacity onPress={onAddToPlaylist} style={styles.actionBtn}>
                      <ListPlus color={Colors.text} size={18} />
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity onPress={onFavorite} style={styles.favoriteButton}>
                    <Heart 
                      color={Colors.text} 
                      size={20} 
                      fill={speech.isFavorite ? Colors.text : 'transparent'}
                    />
                  </TouchableOpacity>
                </View>
              </View>
              <TouchableOpacity style={styles.playButton} onPress={onPress}>
                <Play color={Colors.background} size={24} fill={Colors.background} />
              </TouchableOpacity>
            </View>
          </View>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    );
  }

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }], opacity: fadeAnim }}>
      <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
        <View style={styles.compactCard}>
        {renderImage(styles.compactImage)}
        <View style={styles.compactContent}>
          <Text style={styles.compactTitle} numberOfLines={2}>{String(speech.title || '')}</Text>
          <Text style={styles.compactSpeaker}>{String(speech.speaker || '')}</Text>
          <View style={styles.compactMeta}>
            <View style={styles.duration}>
              <View style={styles.durationIcon}>
                <Clock color={Colors.textSecondary} size={12} />
              </View>
              <Text style={styles.compactDuration}>{formatDuration(speech.duration)}</Text>
            </View>
            <View style={styles.compactActions}>
              <TouchableOpacity onPress={handleShare} style={styles.compactActionBtn}>
                <Share2 color={Colors.textSecondary} size={16} />
              </TouchableOpacity>
              {onAddToPlaylist && (
                <TouchableOpacity onPress={onAddToPlaylist} style={styles.compactActionBtn}>
                  <ListPlus color={Colors.textSecondary} size={16} />
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={onFavorite}>
                <Heart 
                  color={Colors.accent} 
                  size={18} 
                  fill={speech.isFavorite ? Colors.accent : 'transparent'}
                />
              </TouchableOpacity>
            </View>
          </View>
        </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  featuredCard: {
    height: 220,
    borderRadius: 20,
    overflow: 'hidden',
    marginHorizontal: 20,
    marginVertical: 10,
  },
  featuredImage: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    opacity: 0.3,
  },
  featuredOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  featuredContent: {
    flex: 1,
    padding: 20,
    justifyContent: 'space-between',
  },
  featuredCategory: {
    color: Colors.text,
    fontSize: 12,
    fontWeight: '600',
    opacity: 0.9,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  featuredTitle: {
    color: Colors.text,
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 8,
  },
  featuredSpeaker: {
    color: Colors.text,
    fontSize: 16,
    opacity: 0.9,
    marginTop: 4,
  },
  featuredMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  duration: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  durationIcon: {
    marginRight: 4,
  },
  durationText: {
    color: Colors.text,
    fontSize: 14,
  },
  favoriteButton: {
    padding: 4,
  },
  playButton: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.text,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  compactCard: {
    flexDirection: 'row',
    backgroundColor: Colors.cardBackground,
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 20,
    marginVertical: 6,
  },
  compactImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  compactContent: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'space-between',
  },
  compactTitle: {
    color: Colors.text,
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 20,
  },
  compactSpeaker: {
    color: Colors.textSecondary,
    fontSize: 13,
    marginTop: 2,
  },
  compactMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  compactDuration: {
    color: Colors.textSecondary,
    fontSize: 12,
  },
  placeholderImage: {
    backgroundColor: Colors.cardBackground,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.textSecondary + '30',
  },
  featuredActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionBtn: {
    padding: 4,
  },
  compactActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  compactActionBtn: {
    padding: 2,
  },
});