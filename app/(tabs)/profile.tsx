import React, { useState, useEffect, useCallback } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Alert,
  Platform,
  Animated,
  TextInput,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Switch } from 'react-native';
import { User, Clock, Heart, Flame, Award, Settings, MessageCircle, ChevronRight, LogOut, ListMusic, Sparkles, Camera, Church, Crown, Zap, Shield, ImageIcon, Film } from 'lucide-react-native';
import { Stack } from 'expo-router';
import { useAuth } from '@/hooks/auth-context';
import { router } from 'expo-router';
import { useUserProfile } from '@/hooks/user-profile-context';
import * as ImagePicker from 'expo-image-picker';
import { useIAP } from '@/hooks/iap-context';
import PaywallModal from '@/components/PaywallModal';
import { useSpeechContext } from '@/hooks/speech-context';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { useTheme } from '@/hooks/theme-context';
import { useAdmin } from '@/hooks/admin-context';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function ProfileContent() {
  const { colors } = useTheme();
  const [isInitialized, setIsInitialized] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editingName, setEditingName] = useState('');
  const { user, signOut } = useAuth();
  const { profile: userProfileData, updateProfile } = useUserProfile();
  const { entitlements } = useIAP();
  const { isAdmin } = useAdmin();
  const insets = useSafeAreaInsets();
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  
  const context = useSpeechContext();
  
  const userProfile = context?.userProfile || { name: 'User', totalListeningTime: 0, favoriteCount: 0, streak: 0 };
  const favorites = context?.favorites || [];
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsInitialized(true);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
    }, 300);
    
    return () => clearTimeout(timer);
  }, [fadeAnim]);

  const formatListeningTime = useCallback((seconds: number) => {
    try {
      const safeSeconds = Math.max(0, Number(seconds) || 0);
      const hours = Math.floor(safeSeconds / 3600);
      const minutes = Math.floor((safeSeconds % 3600) / 60);
      if (hours > 0) {
        return `${hours}h ${minutes}m`;
      }
      return `${minutes}m`;
    } catch (error) {
      console.error('Error formatting time:', error);
      return '0m';
    }
  }, []);

  const handlePickImage = useCallback(async () => {
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
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    
    if (!result.canceled && result.assets[0]) {
      await updateProfile({ profileImageUri: result.assets[0].uri });
    }
  }, [updateProfile]);

  const handleSignOut = useCallback(() => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            await signOut();
          },
        },
      ]
    );
  }, [signOut]);

  const displayName = userProfileData?.name || user?.user_metadata?.name || user?.email?.split('@')[0] || 'User';
  const displayEmail = user?.email || '';

  useEffect(() => {
    setEditingName(displayName);
  }, [displayName]);

  const saveName = useCallback(async () => {
    const trimmed = editingName.trim();
    if (!trimmed) {
      Alert.alert('Invalid Name', 'Please enter a valid name.');
      return;
    }

    await updateProfile({ name: trimmed });
    setIsEditingName(false);
    Alert.alert('Updated', 'Your profile name has been updated.');
  }, [editingName, updateProfile]);
  
  const styles = getStyles(colors);
  
  if (!isInitialized) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ScrollView 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 12 }]}
        >
          <Animated.View style={{ opacity: fadeAnim }}>
            <View style={styles.profileHeader}>
              <TouchableOpacity style={styles.avatar} onPress={handlePickImage} activeOpacity={0.8}>
                {userProfileData?.profileImageUri ? (
                  <Image source={{ uri: userProfileData.profileImageUri }} style={styles.avatarImage} />
                ) : (
                  <LinearGradient
                    colors={[colors.primary + '40', colors.primary + '20']}
                    style={styles.avatarPlaceholder}
                  >
                    <User color={colors.primary} size={36} />
                  </LinearGradient>
                )}
                <View style={styles.cameraIcon}>
                  <Camera color="#fff" size={14} />
                </View>
              </TouchableOpacity>
              {isEditingName ? (
                <View style={styles.nameEditorRow}>
                  <TextInput
                    value={editingName}
                    onChangeText={setEditingName}
                    style={styles.nameInput}
                    placeholder="Enter your name"
                    placeholderTextColor={colors.textSecondary}
                    maxLength={40}
                  />
                  <TouchableOpacity style={styles.nameSaveButton} onPress={saveName} activeOpacity={0.8}>
                    <Text style={styles.nameSaveButtonText}>Save</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity onPress={() => setIsEditingName(true)} activeOpacity={0.8}>
                  <Text style={styles.name}>{displayName}</Text>
                </TouchableOpacity>
              )}
              <Text style={styles.email}>{displayEmail}</Text>

              {entitlements.isPremium && (
                <View style={styles.premiumBadge}>
                  <Crown color="#FFD700" size={14} />
                  <Text style={styles.premiumBadgeText}>Premium</Text>
                </View>
              )}
            </View>

            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <View style={[styles.statIconBg, { backgroundColor: colors.categories.daily + '20' }]}>
                  <Clock color={colors.categories.daily} size={18} />
                </View>
                <Text style={styles.statValue}>{formatListeningTime(userProfile?.totalListeningTime || 0)}</Text>
                <Text style={styles.statLabel}>Listened</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <View style={[styles.statIconBg, { backgroundColor: colors.categories.relationships + '20' }]}>
                  <Heart color={colors.categories.relationships} size={18} />
                </View>
                <Text style={styles.statValue}>{String(userProfile?.favoriteCount || 0)}</Text>
                <Text style={styles.statLabel}>Favorites</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <View style={[styles.statIconBg, { backgroundColor: colors.categories.confidence + '20' }]}>
                  <Flame color={colors.categories.confidence} size={18} />
                </View>
                <Text style={styles.statValue}>{String(userProfile?.streak || 0)}</Text>
                <Text style={styles.statLabel}>Streak</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <View style={[styles.statIconBg, { backgroundColor: colors.primary + '20' }]}>
                  <Zap color={colors.primary} size={18} />
                </View>
                <Text style={styles.statValue}>{entitlements.credits}</Text>
                <Text style={styles.statLabel}>Credits</Text>
              </View>
            </View>

            {!entitlements.isPremium && (
              <TouchableOpacity 
                style={styles.upgradeCard}
                onPress={() => setShowPaywall(true)}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={[colors.primary, colors.secondary]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.upgradeGradient}
                >
                  <View style={styles.upgradeIconContainer}>
                    <Crown color="#fff" size={22} />
                  </View>
                  <View style={styles.upgradeTextContainer}>
                    <Text style={styles.upgradeTitle}>Go Premium</Text>
                    <Text style={styles.upgradeSubtitle}>Ad-free + unlimited AI features</Text>
                  </View>
                  <ChevronRight color="rgba(255,255,255,0.7)" size={22} />
                </LinearGradient>
              </TouchableOpacity>
            )}

            <View style={styles.achievementsSection}>
              <Text style={styles.sectionTitle}>Achievements</Text>
              <View style={styles.achievementsRow}>
                <LinearGradient
                  colors={['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.03)']}
                  style={styles.achievementCard}
                >
                  <View style={[styles.achievementIcon, { backgroundColor: colors.categories.success + '20' }]}>
                    <Award color={colors.categories.success} size={24} />
                  </View>
                  <Text style={styles.achievementName}>Early Bird</Text>
                  <Text style={styles.achievementDesc}>7 day streak</Text>
                </LinearGradient>
                <LinearGradient
                  colors={['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.03)']}
                  style={styles.achievementCard}
                >
                  <View style={[styles.achievementIcon, { backgroundColor: colors.categories.productivity + '20' }]}>
                    <Award color={colors.categories.productivity} size={24} />
                  </View>
                  <Text style={styles.achievementName}>Explorer</Text>
                  <Text style={styles.achievementDesc}>All categories</Text>
                </LinearGradient>
              </View>
            </View>

            <View style={styles.menuSection}>
              <Text style={styles.sectionTitle}>Library</Text>
              <View style={styles.menuGroup}>
                <MenuItem 
                  icon={Heart} 
                  iconColor={colors.categories.relationships} 
                  label={`Favorites (${String(favorites.length)})`}
                  onPress={() => router.push('/favorites')}
                  colors={colors}
                />
                <View style={styles.menuDivider} />
                <MenuItem 
                  icon={ListMusic} 
                  iconColor={colors.categories.productivity} 
                  label="My Playlists"
                  onPress={() => router.push('/playlists')}
                  colors={colors}
                />
              </View>
            </View>

            <View style={styles.menuSection}>
              <Text style={styles.sectionTitle}>Coach</Text>
              <View style={styles.menuGroup}>
                <MenuItem 
                  icon={Sparkles} 
                  iconColor={colors.categories.confidence} 
                  label="Choose Coach Character"
                  onPress={() => router.push('/coach-character')}
                  colors={colors}
                />
                <View style={styles.menuDivider} />
                <MenuItem 
                  icon={MessageCircle} 
                  iconColor={colors.primary} 
                  label="Talk to Voice Coach"
                  onPress={() => router.push('/voice-coach')}
                  colors={colors}
                />
              </View>
            </View>

            {isAdmin && (
              <View style={styles.menuSection}>
                <Text style={styles.sectionTitle}>Admin</Text>
                <View style={styles.menuGroup}>
                  <MenuItem 
                    icon={ImageIcon} 
                    iconColor="#FF8A00" 
                    label="Manage Flyers"
                    onPress={() => router.push('/flyers')}
                    colors={colors}
                  />
                  <View style={styles.menuDivider} />
                  <MenuItem 
                    icon={Film} 
                    iconColor="#0984E3" 
                    label="Manage Short Clips"
                    onPress={() => router.push('/short-clips')}
                    colors={colors}
                  />
                </View>
                <View style={styles.adminBadgeRow}>
                  <Shield size={12} color={colors.primary} />
                  <Text style={[styles.adminBadgeText, { color: colors.primary }]}>Full Admin Access</Text>
                </View>
              </View>
            )}

            <View style={styles.menuSection}>
              <Text style={styles.sectionTitle}>Preferences</Text>
              <View style={styles.menuGroup}>
                <View style={styles.menuItem}>
                  <View style={styles.menuItemLeft}>
                    <View style={[styles.menuIconBg, { backgroundColor: colors.categories.success + '15' }]}>
                      <Church color={colors.categories.success} size={18} />
                    </View>
                    <View>
                      <Text style={styles.menuItemText}>Church Motivation</Text>
                      <Text style={styles.menuItemSub}>Show on home page</Text>
                    </View>
                  </View>
                  <Switch
                    value={userProfileData?.includeChurchMotivation ?? false}
                    onValueChange={(value) => updateProfile({ includeChurchMotivation: value })}
                    trackColor={{ false: colors.cardBackground, true: colors.primary + '80' }}
                    thumbColor={userProfileData?.includeChurchMotivation ? colors.primary : colors.textSecondary}
                  />
                </View>
                <View style={styles.menuDivider} />
                <MenuItem 
                  icon={Settings} 
                  iconColor={colors.textSecondary} 
                  label="Settings"
                  onPress={() => router.push('/settings')}
                  colors={colors}
                />

              </View>
            </View>

            <View style={styles.menuSection}>
              <View style={styles.menuGroup}>
                <TouchableOpacity style={styles.signOutItem} onPress={handleSignOut} activeOpacity={0.7}>
                  <View style={styles.menuItemLeft}>
                    <View style={[styles.menuIconBg, { backgroundColor: 'rgba(255,107,107,0.12)' }]}>
                      <LogOut size={18} color="#ff6b6b" />
                    </View>
                    <Text style={styles.signOutText}>Sign Out</Text>
                  </View>
                </TouchableOpacity>
              </View>
            </View>
          </Animated.View>
        </ScrollView>
      </View>
      <PaywallModal visible={showPaywall} onClose={() => setShowPaywall(false)} />
    </>
  );
}

interface MenuItemProps {
  icon: any;
  iconColor: string;
  label: string;
  onPress: () => void;
  colors: any;
}

const MenuItem = React.memo(({ icon: Icon, iconColor, label, onPress, colors }: MenuItemProps) => {
  const styles = getStyles(colors);
  return (
    <TouchableOpacity style={styles.menuItem} onPress={onPress} activeOpacity={0.6}>
      <View style={styles.menuItemLeft}>
        <View style={[styles.menuIconBg, { backgroundColor: iconColor + '15' }]}>
          <Icon color={iconColor} size={18} />
        </View>
        <Text style={styles.menuItemText}>{label}</Text>
      </View>
      <ChevronRight color={colors.textSecondary + '60'} size={18} />
    </TouchableOpacity>
  );
});

export default function ProfileScreen() {
  return (
    <ErrorBoundary>
      <ProfileContent />
    </ErrorBoundary>
  );
}

const getStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 120,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  profileHeader: {
    alignItems: 'center' as const,
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    marginBottom: 14,
    position: 'relative' as const,
  },
  avatarImage: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 3,
    borderColor: colors.primary + '40',
  },
  avatarPlaceholder: {
    width: 88,
    height: 88,
    borderRadius: 44,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    borderWidth: 3,
    borderColor: colors.primary + '30',
  },
  cameraIcon: {
    position: 'absolute' as const,
    bottom: 2,
    right: 2,
    backgroundColor: colors.primary,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    borderWidth: 3,
    borderColor: colors.background,
  },
  name: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '700' as const,
    letterSpacing: -0.5,
  },
  nameEditorRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
    marginTop: 2,
  },
  nameInput: {
    minWidth: 170,
    maxWidth: 230,
    borderWidth: 1,
    borderColor: colors.primary + '55',
    backgroundColor: colors.cardBackground,
    color: colors.text,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    fontWeight: '600' as const,
    textAlign: 'center' as const,
  },
  nameSaveButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
  },
  nameSaveButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700' as const,
  },
  email: {
    color: colors.textSecondary,
    fontSize: 14,
    marginTop: 4,
  },
  premiumBadge: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
    marginTop: 10,
    backgroundColor: 'rgba(255,215,0,0.12)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.2)',
  },
  premiumBadgeText: {
    color: '#FFD700',
    fontSize: 13,
    fontWeight: '700' as const,
  },
  statsRow: {
    flexDirection: 'row' as const,
    marginHorizontal: 20,
    backgroundColor: colors.cardBackground,
    borderRadius: 20,
    padding: 18,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  statItem: {
    flex: 1,
    alignItems: 'center' as const,
  },
  statIconBg: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    marginBottom: 8,
  },
  statValue: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700' as const,
    marginBottom: 2,
  },
  statLabel: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '500' as const,
  },
  statDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    marginVertical: 4,
  },
  upgradeCard: {
    marginHorizontal: 20,
    marginBottom: 24,
    borderRadius: 18,
    overflow: 'hidden' as const,
    ...Platform.select({
      ios: {
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 12,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  upgradeGradient: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    padding: 18,
    gap: 14,
  },
  upgradeIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  upgradeTextContainer: {
    flex: 1,
  },
  upgradeTitle: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700' as const,
  },
  upgradeSubtitle: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
    marginTop: 2,
  },
  achievementsSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: 1,
    marginBottom: 12,
  },
  achievementsRow: {
    flexDirection: 'row' as const,
    gap: 12,
  },
  achievementCard: {
    flex: 1,
    borderRadius: 18,
    padding: 18,
    alignItems: 'center' as const,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  achievementIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    marginBottom: 10,
  },
  achievementName: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600' as const,
  },
  achievementDesc: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 3,
  },
  menuSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  menuGroup: {
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    overflow: 'hidden' as const,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  menuItem: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  menuItemLeft: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 12,
    flex: 1,
  },
  menuIconBg: {
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  menuItemText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '500' as const,
  },
  menuItemSub: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 1,
  },
  menuDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.04)',
    marginLeft: 62,
  },
  signOutItem: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  signOutText: {
    color: '#ff6b6b',
    fontSize: 15,
    fontWeight: '500' as const,
  },
  adminBadgeRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
    marginTop: 8,
    paddingHorizontal: 4,
  },
  adminBadgeText: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
});
