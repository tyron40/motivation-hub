import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useState, useEffect, useCallback, useMemo } from 'react';

interface UserProfile {
  name: string;
  preferredVoice: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';
  voiceEnabled: boolean;
  profileImageUri?: string;
  coachCharacter?: {
    id: string;
    name: string;
    imageUrl: string;
    description: string;
    isCustom: boolean;
  };
}

const defaultProfile: UserProfile = {
  name: '',
  preferredVoice: 'alloy',
  voiceEnabled: true,
};

export const [UserProfileProvider, useUserProfile] = createContextHook(() => {
  const [profile, setProfile] = useState<UserProfile>(defaultProfile);
  const [isLoading, setIsLoading] = useState(true);

  // Load profile from storage
  useEffect(() => {
    const loadProfile = async () => {
      try {
        const timeoutPromise = new Promise<null>((resolve) => {
          setTimeout(() => {
            console.warn('⚠️ Profile loading timeout');
            resolve(null);
          }, 2000);
        });
        
        const loadPromise = AsyncStorage.getItem('userProfile');
        const stored = await Promise.race([loadPromise, timeoutPromise]);
        
        if (stored) {
          const parsedProfile = JSON.parse(stored);
          setProfile({ ...defaultProfile, ...parsedProfile });
        }
      } catch (error) {
        console.error('Error loading user profile:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadProfile();
  }, []);

  // Save profile to storage
  const updateProfile = useCallback(async (updates: Partial<UserProfile>) => {
    try {
      const newProfile = { ...profile, ...updates };
      setProfile(newProfile);
      await AsyncStorage.setItem('userProfile', JSON.stringify(newProfile));
      console.log('✅ User profile updated:', newProfile);
    } catch (error) {
      console.error('Error saving user profile:', error);
    }
  }, [profile]);

  return useMemo(() => ({
    profile,
    updateProfile,
    isLoading,
  }), [profile, updateProfile, isLoading]);
});