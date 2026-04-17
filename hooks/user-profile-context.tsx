import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from './auth-context';

interface UserProfile {
  name: string;
  preferredVoice: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';
  voiceEnabled: boolean;
  includeChurchMotivation: boolean;
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
  includeChurchMotivation: false,
};

export const [UserProfileProvider, useUserProfile] = createContextHook(() => {
  const { user } = useAuth();
  const storageKey = useMemo(() => `userProfile:${user?.id ?? 'guest'}`, [user?.id]);
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
          }, 1000);
        });
        
        const loadPromise = AsyncStorage.getItem(storageKey);
        const stored = await Promise.race([loadPromise, timeoutPromise]);
        
        if (stored && typeof stored === 'string') {
          try {
            const parsedProfile = JSON.parse(stored);
            setProfile({ ...defaultProfile, ...parsedProfile });
          } catch (parseError) {
            console.error('❌ Error parsing user profile:', parseError);
            setProfile(defaultProfile);
          }
        }
      } catch (error) {
        console.error('Error loading user profile:', error);
      } finally {
        setIsLoading(false);
      }
    };

    setProfile(defaultProfile);
    loadProfile();
  }, [storageKey]);

  // Save profile to storage
  const updateProfile = useCallback(async (updates: Partial<UserProfile>) => {
    try {
      setProfile((prev) => {
        const next = { ...prev, ...updates };
        void AsyncStorage.setItem(storageKey, JSON.stringify(next))
          .then(() => console.log('✅ User profile updated:', next))
          .catch((error) => console.error('Error saving user profile:', error));
        return next;
      });
    } catch (error) {
      console.error('Error saving user profile:', error);
    }
  }, [storageKey]);

  return useMemo(() => ({
    profile,
    updateProfile,
    isLoading,
  }), [profile, updateProfile, isLoading]);
});