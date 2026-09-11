import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from './auth-context';

interface UserProfile {
  name: string;
  preferredVoice: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';
  voiceEnabled: boolean;
  chatbotName: string;
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
  voiceEnabled: false,
  chatbotName: 'Coach Alex',
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
            console.warn('âš ï¸ Profile loading timeout');
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
            console.error('âŒ Error parsing user profile:', parseError);
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
          .then(() => console.log('âœ… User profile updated:', next))
          .catch((error) => console.error('Error saving user profile:', error));
        return next;
      });
    } catch (error) {
      console.error('Error saving user profile:', error);
    }
  }, [storageKey]);

  const updateProfileForUser = useCallback(async (
    userId: string,
    updates: Partial<UserProfile>
  ) => {
    if (!userId) {
      throw new Error('A valid user ID is required to save the profile.');
    }

    const targetStorageKey = `userProfile:${userId}`;

    try {
      const stored = await AsyncStorage.getItem(targetStorageKey);

      let currentProfile: UserProfile = { ...defaultProfile };

      if (stored) {
        try {
          currentProfile = {
            ...defaultProfile,
            ...JSON.parse(stored),
          };
        } catch (parseError) {
          console.error('Error parsing existing user profile:', parseError);
        }
      }

      const next = {
        ...currentProfile,
        ...updates,
      };

      await AsyncStorage.setItem(
        targetStorageKey,
        JSON.stringify(next)
      );

      if (user?.id === userId) {
        setProfile(next);
      }

      console.log('User profile saved for account:', userId);
    } catch (error) {
      console.error('Error saving user profile for account:', error);
      throw error;
    }
  }, [user?.id]);

  return useMemo(() => ({
    profile,
    updateProfile,
    updateProfileForUser,
    isLoading,
  }), [profile, updateProfile, updateProfileForUser, isLoading]);
});
