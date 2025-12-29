import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  Modal,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router } from 'expo-router';
import { User, Volume2, Bell, Moon, Info, ChevronRight, Check, X, LogOut, Trash2, Activity, Palette, DollarSign } from 'lucide-react-native';
import { useUserProfile } from '@/hooks/user-profile-context';
import { useAuth } from '@/hooks/auth-context';
import { useTheme, ThemeColor, themeNames } from '@/hooks/theme-context';
import { supabase } from '@/lib/supabase';
import { useIAP } from '@/hooks/iap-context';
import { CreditsInfoModal } from '@/components/CreditsInfoModal';
import PaywallModal from '@/components/PaywallModal';

const voiceCharacters = [
  { id: 'alloy', name: 'Alloy', description: 'Neutral and balanced voice' },
  { id: 'echo', name: 'Echo', description: 'Warm and engaging male voice' },
  { id: 'fable', name: 'Fable', description: 'Expressive British accent' },
  { id: 'onyx', name: 'Onyx', description: 'Deep and authoritative male voice' },
  { id: 'nova', name: 'Nova', description: 'Energetic female voice' },
  { id: 'shimmer', name: 'Shimmer', description: 'Soft and gentle female voice' },
] as const;

export default function SettingsScreen() {
  const { profile, updateProfile } = useUserProfile();
  const { user, signOut } = useAuth();
  const { colors, selectedTheme, changeTheme, themes } = useTheme();
  const { usageStats } = useIAP();
  const [showNameModal, setShowNameModal] = useState(false);
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [showThemeModal, setShowThemeModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showCreditsModal, setShowCreditsModal] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [tempName, setTempName] = useState(profile.name || '');
  const [notifications, setNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleSaveName = async () => {
    if (tempName.trim()) {
      await updateProfile({ name: tempName.trim() });
      setShowNameModal(false);
      Alert.alert('Success', 'Your name has been updated');
    }
  };

  const selectedVoice = voiceCharacters.find(v => v.id === profile.preferredVoice) || voiceCharacters[0];

  const styles = getStyles(colors);

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen 
        options={{ 
          title: 'Settings',
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
        }} 
      />
      
      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Profile</Text>
          
          <TouchableOpacity 
            style={styles.settingItem}
            onPress={() => setShowNameModal(true)}
          >
            <View style={styles.settingLeft}>
              <User size={20} color={colors.primary} />
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Name</Text>
                <Text style={styles.settingValue}>{profile.name || 'Not set'}</Text>
              </View>
            </View>
            <ChevronRight size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>AI Credits</Text>
          
          <TouchableOpacity 
            style={styles.settingItem}
            onPress={() => setShowPaywall(true)}
          >
            <View style={styles.settingLeft}>
              <DollarSign size={20} color={colors.primary} />
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Credits Balance</Text>
                <Text style={styles.settingValue}>{usageStats.credits} credits available</Text>
              </View>
            </View>
            <ChevronRight size={20} color={colors.textSecondary} />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.settingItem}
            onPress={() => setShowCreditsModal(true)}
          >
            <View style={styles.settingLeft}>
              <Info size={20} color={colors.primary} />
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>How Credits Work</Text>
                <Text style={styles.settingValue}>View pricing & usage guide</Text>
              </View>
            </View>
            <ChevronRight size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Voice Coach</Text>
          
          <TouchableOpacity 
            style={styles.settingItem}
            onPress={() => setShowVoiceModal(true)}
          >
            <View style={styles.settingLeft}>
              <Volume2 size={20} color={colors.primary} />
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Coach Voice</Text>
                <Text style={styles.settingValue}>{selectedVoice.name}</Text>
              </View>
            </View>
            <ChevronRight size={20} color={colors.textSecondary} />
          </TouchableOpacity>

          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Volume2 size={20} color={colors.primary} />
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Voice Enabled</Text>
                <Text style={styles.settingValue}>
                  {profile.voiceEnabled ? 'On' : 'Off'}
                </Text>
              </View>
            </View>
            <Switch
              value={profile.voiceEnabled}
              onValueChange={(value) => updateProfile({ voiceEnabled: value })}
              trackColor={{ false: '#767577', true: colors.primary }}
              thumbColor={'white'}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>App Settings</Text>
          
          <TouchableOpacity 
            style={styles.settingItem}
            onPress={() => setShowThemeModal(true)}
          >
            <View style={styles.settingLeft}>
              <Palette size={20} color={colors.primary} />
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>App Theme</Text>
                <Text style={styles.settingValue}>{themeNames[selectedTheme]}</Text>
              </View>
            </View>
            <ChevronRight size={20} color={colors.textSecondary} />
          </TouchableOpacity>

          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Bell size={20} color={colors.primary} />
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Notifications</Text>
                <Text style={styles.settingValue}>
                  {notifications ? 'Enabled' : 'Disabled'}
                </Text>
              </View>
            </View>
            <Switch
              value={notifications}
              onValueChange={setNotifications}
              trackColor={{ false: '#767577', true: colors.primary }}
              thumbColor={'white'}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Moon size={20} color={colors.primary} />
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Dark Mode</Text>
                <Text style={styles.settingValue}>
                  {darkMode ? 'On' : 'Off'}
                </Text>
              </View>
            </View>
            <Switch
              value={darkMode}
              onValueChange={setDarkMode}
              trackColor={{ false: '#767577', true: colors.primary }}
              thumbColor={'white'}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          
          {user?.email && (
            <View style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <User size={20} color={colors.primary} />
                <View style={styles.settingInfo}>
                  <Text style={styles.settingLabel}>Email</Text>
                  <Text style={styles.settingValue}>{user.email}</Text>
                </View>
              </View>
            </View>
          )}
          
          <TouchableOpacity
            style={[styles.settingItem, styles.signOutItem]}
            onPress={async () => {
              const { error } = await signOut();
              if (error) {
                console.error('Sign out error:', error);
              }
            }}
          >
            <View style={styles.settingLeft}>
              <LogOut size={20} color="#ff6b6b" />
              <View style={styles.settingInfo}>
                <Text style={[styles.settingLabel, styles.signOutText]}>Sign Out</Text>
              </View>
            </View>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.settingItem, styles.deleteAccountItem]}
            onPress={() => setShowDeleteModal(true)}
          >
            <View style={styles.settingLeft}>
              <Trash2 size={20} color="#ff3b30" />
              <View style={styles.settingInfo}>
                <Text style={[styles.settingLabel, styles.deleteAccountText]}>Delete Account</Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          
          <TouchableOpacity style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Info size={20} color={colors.primary} />
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Version</Text>
                <Text style={styles.settingValue}>1.0.0</Text>
              </View>
            </View>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.settingItem}
            onPress={() => router.push('/diagnostic')}
          >
            <View style={styles.settingLeft}>
              <Activity size={20} color={colors.primary} />
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Diagnostics</Text>
                <Text style={styles.settingValue}>Test backend connectivity</Text>
              </View>
            </View>
            <ChevronRight size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </ScrollView>

      <Modal
        visible={showNameModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowNameModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Name</Text>
              <TouchableOpacity onPress={() => setShowNameModal(false)}>
                <X size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            
            <TextInput
              style={styles.input}
              value={tempName}
              onChangeText={setTempName}
              placeholder="Enter your name"
              placeholderTextColor={colors.textSecondary}
              autoFocus
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setTempName(profile.name || '');
                  setShowNameModal(false);
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleSaveName}
              >
                <Text style={styles.saveButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showVoiceModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowVoiceModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Choose Voice</Text>
              <TouchableOpacity onPress={() => setShowVoiceModal(false)}>
                <X size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.voiceList}>
              {voiceCharacters.map((voice) => (
                <TouchableOpacity
                  key={voice.id}
                  style={[
                    styles.voiceOption,
                    profile.preferredVoice === voice.id && styles.voiceOptionSelected,
                  ]}
                  onPress={async () => {
                    await updateProfile({ preferredVoice: voice.id as any });
                    setShowVoiceModal(false);
                    Alert.alert('Success', `Voice changed to ${voice.name}`);
                  }}
                >
                  <View style={styles.voiceInfo}>
                    <Text style={[
                      styles.voiceName,
                      profile.preferredVoice === voice.id && styles.voiceNameSelected,
                    ]}>
                      {voice.name}
                    </Text>
                    <Text style={styles.voiceDescription}>{voice.description}</Text>
                  </View>
                  {profile.preferredVoice === voice.id && (
                    <Check size={24} color={colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showThemeModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowThemeModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Choose Theme</Text>
              <TouchableOpacity onPress={() => setShowThemeModal(false)}>
                <X size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.voiceList}>
              {(Object.keys(themeNames) as ThemeColor[]).map((themeKey) => {
                const themeColors = themes[themeKey];
                return (
                  <TouchableOpacity
                    key={themeKey}
                    style={[
                      styles.themeOption,
                      selectedTheme === themeKey && styles.voiceOptionSelected,
                    ]}
                    onPress={async () => {
                      await changeTheme(themeKey);
                      setShowThemeModal(false);
                      Alert.alert('Success', `Theme changed to ${themeNames[themeKey]}`);
                    }}
                  >
                    <View style={styles.themePreview}>
                      <View style={[styles.themeColorCircle, { backgroundColor: themeColors.primary }]} />
                    </View>
                    <View style={styles.voiceInfo}>
                      <Text style={[
                        styles.voiceName,
                        selectedTheme === themeKey && styles.voiceNameSelected,
                      ]}>
                        {themeNames[themeKey]}
                      </Text>
                    </View>
                    {selectedTheme === themeKey && (
                      <Check size={24} color={colors.primary} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showDeleteModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => !isDeleting && setShowDeleteModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.deleteModalContent}>
            <View style={styles.deleteIconContainer}>
              <Trash2 size={48} color="#ff3b30" />
            </View>
            
            <Text style={styles.deleteModalTitle}>Delete Account?</Text>
            <Text style={styles.deleteModalMessage}>
              This action cannot be undone. All your data, including your profile, preferences, and saved content will be permanently deleted.
            </Text>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowDeleteModal(false)}
                disabled={isDeleting}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.modalButton, styles.deleteButton]}
                onPress={async () => {
                  setIsDeleting(true);
                  try {
                    console.log('🗑️ Deleting user account...');
                    
                    if (user?.id) {
                      const { error: deleteError } = await supabase
                        .from('profiles')
                        .delete()
                        .eq('id', user.id);
                      
                      if (deleteError) {
                        console.error('❌ Error deleting profile:', deleteError);
                      }
                    }
                    
                    const { error: signOutError } = await signOut();
                    
                    if (signOutError) {
                      console.error('❌ Error signing out:', signOutError);
                      Alert.alert('Error', 'Failed to delete account. Please try again.');
                    } else {
                      console.log('✅ Account deleted successfully');
                      Alert.alert('Account Deleted', 'Your account has been permanently deleted.');
                    }
                  } catch (error) {
                    console.error('❌ Exception deleting account:', error);
                    Alert.alert('Error', 'An unexpected error occurred. Please try again.');
                  } finally {
                    setIsDeleting(false);
                    setShowDeleteModal(false);
                  }
                }}
                disabled={isDeleting}
              >
                <Text style={styles.deleteButtonText}>
                  {isDeleting ? 'Deleting...' : 'Delete Account'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <CreditsInfoModal 
        visible={showCreditsModal}
        onClose={() => setShowCreditsModal(false)}
      />

      <PaywallModal
        visible={showPaywall}
        onClose={() => setShowPaywall(false)}
      />
    </SafeAreaView>
  );
}

const getStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  section: {
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: colors.textSecondary,
    marginBottom: 12,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  settingItem: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  settingLeft: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    flex: 1,
    gap: 12,
  },
  settingInfo: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '500' as const,
    color: colors.text,
    marginBottom: 4,
  },
  settingValue: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center' as const,
    paddingHorizontal: 20,
  },
  modalContent: {
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold' as const,
    color: colors.text,
  },
  input: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: colors.text,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  modalButtons: {
    flexDirection: 'row' as const,
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center' as const,
  },
  cancelButton: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.textSecondary + '30',
  },
  cancelButtonText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600' as const,
  },
  saveButton: {
    backgroundColor: colors.primary,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600' as const,
  },
  voiceList: {
    maxHeight: 400,
  },
  voiceOption: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: colors.background,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  voiceOptionSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '1A',
  },
  voiceInfo: {
    flex: 1,
  },
  voiceName: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: colors.text,
    marginBottom: 4,
  },
  voiceNameSelected: {
    color: colors.primary,
  },
  voiceDescription: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  themeOption: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: colors.background,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  themePreview: {
    marginRight: 12,
  },
  themeColorCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  signOutItem: {
    borderColor: 'rgba(255, 107, 107, 0.3)',
    borderWidth: 1,
  },
  signOutText: {
    color: '#ff6b6b',
  },
  deleteAccountItem: {
    borderColor: 'rgba(255, 59, 48, 0.3)',
    borderWidth: 1,
  },
  deleteAccountText: {
    color: '#ff3b30',
  },
  deleteModalContent: {
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    padding: 24,
    marginHorizontal: 20,
    alignItems: 'center' as const,
  },
  deleteIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginBottom: 20,
  },
  deleteModalTitle: {
    fontSize: 24,
    fontWeight: 'bold' as const,
    color: colors.text,
    marginBottom: 12,
    textAlign: 'center' as const,
  },
  deleteModalMessage: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center' as const,
    lineHeight: 24,
    marginBottom: 24,
  },
  deleteButton: {
    backgroundColor: '#ff3b30',
  },
  deleteButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600' as const,
  },
});
