import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { User, Clock, Heart, Flame, Award, Settings, MessageCircle, ChevronRight, LogOut } from 'lucide-react-native';
import { Stack } from 'expo-router';
import { useAuth } from '@/hooks/auth-context';
import { router } from 'expo-router';
import Colors from '@/constants/colors';
import { useSpeechContext } from '@/hooks/speech-context';
import { SpeechCard } from '@/components/SpeechCard';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Speech } from '@/types/speech';

function ProfileContent() {
  const [showFavorites, setShowFavorites] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const { user, signOut } = useAuth();
  
  // Always call hooks at the top level
  const context = useSpeechContext();
  
  // Extract values from context with defaults
  const userProfile = context?.userProfile || { name: 'User', totalListeningTime: 0, favoriteCount: 0, streak: 0 };
  const favorites = context?.favorites || [];
  const toggleFavorite = context?.toggleFavorite || ((id: string) => {});
  const setCurrentSpeech = context?.setCurrentSpeech || ((speech: Speech | null) => {});
  
  // Check initialization after component mounts
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsInitialized(true);
    }, 500);
    
    return () => clearTimeout(timer);
  }, []);

  const formatListeningTime = (seconds: number) => {
    try {
      const safeSeconds = Math.max(0, Number(seconds) || 0);
      const hours = Math.floor(safeSeconds / 3600);
      const minutes = Math.floor((safeSeconds % 3600) / 60);
      if (hours > 0) {
        return `${hours}h ${minutes}m`;
      }
      return `${minutes} minutes`;
    } catch (error) {
      console.error('Error formatting time:', error);
      return '0 minutes';
    }
  };

  const stats = [
    {
      icon: Clock,
      label: 'Total Listening',
      value: formatListeningTime(userProfile?.totalListeningTime || 0),
      color: Colors.categories.daily,
    },
    {
      icon: Heart,
      label: 'Favorites',
      value: String(userProfile?.favoriteCount || 0),
      color: Colors.categories.relationships,
    },
    {
      icon: Flame,
      label: 'Day Streak',
      value: String(userProfile?.streak || 0),
      color: Colors.categories.confidence,
    },
  ];
  
  // Show loading state if context is not initialized
  if (!isInitialized) {
    return (
      <LinearGradient
        colors={[Colors.background, '#1A1A2E']}
        style={styles.container}
      >
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>Loading profile...</Text>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <LinearGradient
        colors={[Colors.background, '#1A1A2E']}
        style={styles.container}
      >
        <SafeAreaView style={styles.safeArea}>
        <ScrollView 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.header}>
            <View style={styles.profileInfo}>
              <View style={styles.avatar}>
                <User color={Colors.text} size={40} />
              </View>
              <View>
                <Text style={styles.name}>{userProfile?.name || user?.user_metadata?.name || user?.email?.split('@')[0] || 'User'}</Text>
                <Text style={styles.subtitle}>{user?.email || 'Motivation Hub Member'}</Text>
              </View>
            </View>
            <TouchableOpacity 
              style={styles.settingsButton}
              onPress={() => router.push('/settings')}
            >
              <Settings color={Colors.textSecondary} size={24} />
            </TouchableOpacity>
          </View>

          <View style={styles.statsContainer}>
            {stats.map((stat) => {
              const Icon = stat.icon;
              return (
                <View key={stat.label} style={styles.statCard}>
                  <View style={[styles.statIcon, { backgroundColor: stat.color + '20' }]}>
                    <Icon color={stat.color} size={24} />
                  </View>
                  <Text style={styles.statValue}>{stat.value}</Text>
                  <Text style={styles.statLabel}>{stat.label}</Text>
                </View>
              );
            })}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Achievements</Text>
            <View style={styles.achievementsList}>
              <View style={styles.achievement}>
                <Award color={Colors.categories.success} size={32} />
                <Text style={styles.achievementName}>Early Bird</Text>
                <Text style={styles.achievementDesc}>Listen 7 days in a row</Text>
              </View>
              <View style={styles.achievement}>
                <Award color={Colors.categories.productivity} size={32} />
                <Text style={styles.achievementName}>Explorer</Text>
                <Text style={styles.achievementDesc}>Try all categories</Text>
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <TouchableOpacity 
              style={styles.menuItem}
              onPress={() => setShowFavorites(!showFavorites)}
            >
              <View style={styles.menuItemLeft}>
                <Heart color={Colors.categories.relationships} size={20} />
                <Text style={styles.menuItemText}>Favorites ({String(favorites.length)})</Text>
              </View>
              <ChevronRight 
                color={Colors.textSecondary} 
                size={20} 
                style={[styles.chevron, showFavorites && styles.chevronRotated]}
              />
            </TouchableOpacity>
            
            {showFavorites && (
              <View style={styles.favoritesContainer}>
                {!Array.isArray(favorites) || favorites.length === 0 ? (
                  <View style={styles.emptyFavorites}>
                    <Heart color={Colors.textSecondary} size={32} />
                    <Text style={styles.emptyText}>No favorites yet</Text>
                    <Text style={styles.emptySubtext}>
                      Tap the heart icon on speeches you love
                    </Text>
                  </View>
                ) : (
                  <ScrollView 
                    horizontal 
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.favoritesScrollContent}
                  >
                    {favorites
                      .filter(speech => {
                        try {
                          return speech && typeof speech === 'object' && speech.id && speech.title;
                        } catch {
                          return false;
                        }
                      })
                      .map((speech, index) => {
                        try {
                          return (
                            <View key={`favorite-${speech?.id || index}`} style={styles.favoriteCardWrapper}>
                              <SpeechCard
                                speech={speech}
                                onPress={() => {
                                  try {
                                    setCurrentSpeech(speech);
                                    router.push('/player');
                                  } catch (error) {
                                    console.error('Error navigating to player:', error);
                                  }
                                }}
                                onFavorite={() => {
                                  try {
                                    if (speech?.id) {
                                      toggleFavorite(speech.id);
                                    }
                                  } catch (error) {
                                    console.error('Error toggling favorite:', error);
                                  }
                                }}
                              />
                            </View>
                          );
                        } catch (error) {
                          console.error('Error rendering speech card:', error);
                          return null;
                        }
                      })
                      .filter(Boolean)}
                  </ScrollView>
                )}
              </View>
            )}
            
            <TouchableOpacity 
              style={styles.menuItem}
              onPress={() => router.push('/voice-coach')}
            >
              <View style={styles.menuItemLeft}>
                <MessageCircle color={Colors.primary} size={20} />
                <Text style={styles.menuItemText}>Talk to Voice Coach</Text>
              </View>
              <ChevronRight color={Colors.textSecondary} size={20} />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.menuItem}
              onPress={() => router.push('/settings')}
            >
              <View style={styles.menuItemLeft}>
                <Settings color={Colors.textSecondary} size={20} />
                <Text style={styles.menuItemText}>Settings</Text>
              </View>
              <ChevronRight color={Colors.textSecondary} size={20} />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.menuItem, styles.signOutItem]}
              onPress={async () => {
                const { error } = await signOut();
                if (error) {
                  console.error('Sign out error:', error);
                }
              }}
            >
              <View style={styles.menuItemLeft}>
                <LogOut color="#ff6b6b" size={20} />
                <Text style={[styles.menuItemText, styles.signOutText]}>Sign Out</Text>
              </View>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
    </>
  );
}

export default function ProfileScreen() {
  return (
    <ErrorBoundary>
      <ProfileContent />
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
  },
  profileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.cardBackground,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    borderWidth: 2,
    borderColor: Colors.primary + '30',
  },
  name: {
    color: Colors.text,
    fontSize: 22,
    fontWeight: 'bold',
    letterSpacing: -0.3,
  },
  subtitle: {
    color: Colors.textSecondary,
    fontSize: 14,
    marginTop: 4,
  },
  settingsButton: {
    padding: 8,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  statCard: {
    alignItems: 'center',
    flex: 1,
  },
  statIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statValue: {
    color: Colors.text,
    fontSize: 18,
    fontWeight: 'bold',
  },
  statLabel: {
    color: Colors.textSecondary,
    fontSize: 12,
    marginTop: 4,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    color: Colors.text,
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
  },
  achievementsList: {
    flexDirection: 'row',
    gap: 12,
  },
  achievement: {
    flex: 1,
    backgroundColor: Colors.cardBackground,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  achievementName: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
  },
  achievementDesc: {
    color: Colors.textSecondary,
    fontSize: 11,
    marginTop: 4,
    textAlign: 'center',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.cardBackground,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuItemText: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '500',
  },
  chevron: {
    transform: [{ rotate: '0deg' }],
  },
  chevronRotated: {
    transform: [{ rotate: '90deg' }],
  },
  favoritesContainer: {
    marginBottom: 12,
  },
  favoritesScrollContent: {
    paddingHorizontal: 20,
    gap: 12,
  },
  favoriteCardWrapper: {
    width: 280,
  },
  emptyFavorites: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 8,
  },
  emptyText: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  emptySubtext: {
    color: Colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    color: Colors.text,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 40,
  },
  errorText: {
    color: Colors.text,
    fontSize: 16,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  retryButtonText: {
    color: Colors.background,
    fontSize: 16,
    fontWeight: '600',
  },
  signOutItem: {
    borderColor: 'rgba(255, 107, 107, 0.3)',
    borderWidth: 1,
  },
  signOutText: {
    color: '#ff6b6b',
  },
});