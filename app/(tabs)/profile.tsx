import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Alert,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { User, Clock, Heart, Flame, Award, Settings, MessageCircle, ChevronRight, LogOut, ListMusic, Sparkles, Camera, Image as ImageIcon, Activity } from 'lucide-react-native';
import { Stack } from 'expo-router';
import { useAuth } from '@/hooks/auth-context';
import { router } from 'expo-router';
import { useUserProfile } from '@/hooks/user-profile-context';
import * as ImagePicker from 'expo-image-picker';
import Colors from '@/constants/colors';
import { useIAP } from '@/hooks/iap-context';
import PaywallModal from '@/components/PaywallModal';
import { useSpeechContext } from '@/hooks/speech-context';
import { SpeechCard } from '@/components/SpeechCard';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Speech } from '@/types/speech';

function ProfileContent() {
  const [showFavorites, setShowFavorites] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const { user, signOut } = useAuth();
  const { profile: userProfileData, updateProfile } = useUserProfile();
  const { entitlements } = useIAP();
  
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
              <TouchableOpacity 
                style={styles.avatar}
                onPress={async () => {
                  if (Platform.OS === 'web') {
                    Alert.alert('Not Available', 'Image upload is not available on web');
                    return;
                  }
                  
                  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
                  if (status !== 'granted') {
                    Alert.alert('Permission Required', 'Please grant camera roll permissions');
                    return;
                  }
                  
                  const result = await ImagePicker.launchImageLibraryAsync({
                    mediaTypes: ImagePicker.MediaTypeOptions.Images,
                    allowsEditing: true,
                    aspect: [1, 1],
                    quality: 0.8,
                  });
                  
                  if (!result.canceled && result.assets[0]) {
                    await updateProfile({ profileImageUri: result.assets[0].uri });
                  }
                }}
              >
                {userProfileData?.profileImageUri ? (
                  <Image source={{ uri: userProfileData.profileImageUri }} style={styles.avatarImage} />
                ) : (
                  <User color={Colors.text} size={40} />
                )}
                <View style={styles.cameraIcon}>
                  <Camera color={Colors.background} size={16} />
                </View>
              </TouchableOpacity>
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

          {!entitlements.isPremium && (
            <TouchableOpacity 
              style={styles.upgradeCard}
              onPress={() => setShowPaywall(true)}
            >
              <LinearGradient
                colors={['#FF6B35', '#F7931E']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.upgradeGradient}
              >
                <View style={styles.upgradeContent}>
                  <View style={styles.upgradeLeft}>
                    <Sparkles color="#fff" size={28} />
                    <View>
                      <Text style={styles.upgradeTitle}>Upgrade to Premium</Text>
                      <Text style={styles.upgradeSubtitle}>Enjoy ad-free experience</Text>
                    </View>
                  </View>
                  <View style={styles.upgradeButton}>
                    <Text style={styles.upgradeButtonText}>Unlock</Text>
                  </View>
                </View>
              </LinearGradient>
            </TouchableOpacity>
          )}

          {entitlements.isPremium && (
            <View style={styles.premiumStatusCard}>
              <View style={styles.premiumStatusContent}>
                <Sparkles color={Colors.accent} size={24} />
                <View style={styles.premiumStatusText}>
                  <Text style={styles.premiumStatusTitle}>Premium Member</Text>
                  <Text style={styles.premiumStatusSubtitle}>Enjoy your ad-free experience</Text>
                </View>
              </View>
            </View>
          )}



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
              onPress={() => router.push('/favorites')}
            >
              <View style={styles.menuItemLeft}>
                <Heart color={Colors.categories.relationships} size={20} />
                <Text style={styles.menuItemText}>Favorites ({String(favorites.length)})</Text>
              </View>
              <ChevronRight color={Colors.textSecondary} size={20} />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.menuItem}
              onPress={() => router.push('/playlists')}
            >
              <View style={styles.menuItemLeft}>
                <ListMusic color={Colors.categories.productivity} size={20} />
                <Text style={styles.menuItemText}>My Playlists</Text>
              </View>
              <ChevronRight color={Colors.textSecondary} size={20} />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.menuItem}
              onPress={() => router.push('/coach-character')}
            >
              <View style={styles.menuItemLeft}>
                <Sparkles color={Colors.categories.confidence} size={20} />
                <Text style={styles.menuItemText}>Choose Coach Character</Text>
              </View>
              <ChevronRight color={Colors.textSecondary} size={20} />
            </TouchableOpacity>
            
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
              style={styles.menuItem}
              onPress={() => router.push('/diagnostic')}
            >
              <View style={styles.menuItemLeft}>
                <Activity color={Colors.categories.productivity} size={20} />
                <Text style={styles.menuItemText}>Diagnostics</Text>
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
    <PaywallModal visible={showPaywall} onClose={() => setShowPaywall(false)} />
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
    position: 'relative',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 36,
  },
  cameraIcon: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: Colors.primary,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.background,
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
  upgradeCard: {
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  upgradeGradient: {
    padding: 20,
  },
  upgradeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  upgradeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  upgradeTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  upgradeSubtitle: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 13,
    marginTop: 2,
  },
  upgradeButton: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  upgradeButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
  },
  premiumStatusCard: {
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: 'rgba(255,107,53,0.15)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,107,53,0.3)',
  },
  premiumStatusContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
  },
  premiumStatusText: {
    flex: 1,
  },
  premiumStatusTitle: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: 'bold',
  },
  premiumStatusSubtitle: {
    color: Colors.textSecondary,
    fontSize: 13,
    marginTop: 2,
  },

});