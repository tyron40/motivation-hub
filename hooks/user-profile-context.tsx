import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  useState,
  useEffect,
  useCallback,
  useMemo,
} from 'react';
import { useAuth } from './auth-context';
import {
  loadRemoteLibraryField,
  saveRemoteLibraryField,
} from '@/lib/user-library-sync';

interface UserProfile {
  name: string;
  preferredVoice:
    | 'alloy'
    | 'echo'
    | 'fable'
    | 'onyx'
    | 'nova'
    | 'shimmer';
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

function parseProfile(
  stored: string | null
): Partial<UserProfile> {
  if (!stored) return {};

  try {
    const parsed = JSON.parse(stored);

    return parsed &&
      typeof parsed === 'object'
      ? parsed
      : {};
  } catch (error) {
    console.warn(
      'Unable to parse local user profile:',
      error
    );

    return {};
  }
}

export const [
  UserProfileProvider,
  useUserProfile,
] = createContextHook(() => {
  const { user } = useAuth();

  const storageKey = useMemo(
    () => `userProfile:${user?.id ?? 'guest'}`,
    [user?.id]
  );

  const [profile, setProfile] =
    useState<UserProfile>(defaultProfile);

  const [isLoading, setIsLoading] =
    useState(true);

  useEffect(() => {
    let cancelled = false;

    const loadProfile = async () => {
      setProfile(defaultProfile);
      setIsLoading(true);

      const stored =
        await AsyncStorage.getItem(storageKey);

      const localProfile = {
        ...defaultProfile,
        ...parseProfile(stored),
      };

      if (!cancelled) {
        setProfile(localProfile);
        setIsLoading(false);
      }

      if (!user?.id) return;

      try {
        const remoteProfile =
          await loadRemoteLibraryField<
            Partial<UserProfile>
          >(
            user.id,
            'user_profile',
            {}
          );

        const mergedProfile = {
          ...defaultProfile,
          ...localProfile,
          ...remoteProfile,
        };

        await AsyncStorage.setItem(
          storageKey,
          JSON.stringify(mergedProfile)
        );

        if (!cancelled) {
          setProfile(mergedProfile);
        }

        if (
          JSON.stringify(mergedProfile) !==
          JSON.stringify(remoteProfile)
        ) {
          await saveRemoteLibraryField(
            user.id,
            'user_profile',
            mergedProfile
          );
        }
      } catch (error) {
        console.warn(
          'Profile cloud sync unavailable; using local cache:',
          error
        );
      }
    };

    void loadProfile();

    return () => {
      cancelled = true;
    };
  }, [storageKey, user?.id]);

  const persistProfile = useCallback(
    async (
      userId: string | undefined,
      targetStorageKey: string,
      nextProfile: UserProfile
    ) => {
      await AsyncStorage.setItem(
        targetStorageKey,
        JSON.stringify(nextProfile)
      );

      if (!userId) return;

      try {
        await saveRemoteLibraryField(
          userId,
          'user_profile',
          nextProfile
        );
      } catch (error) {
        console.warn(
          'Profile saved locally; cloud sync will retry on next login:',
          error
        );
      }
    },
    []
  );

  const updateProfile = useCallback(
    async (updates: Partial<UserProfile>) => {
      setProfile(previous => {
        const next = {
          ...previous,
          ...updates,
        };

        void persistProfile(
          user?.id,
          storageKey,
          next
        );

        return next;
      });
    },
    [persistProfile, storageKey, user?.id]
  );

  const updateProfileForUser = useCallback(
    async (
      userId: string,
      updates: Partial<UserProfile>
    ) => {
      if (!userId) {
        throw new Error(
          'A valid user ID is required to save the profile.'
        );
      }

      const targetStorageKey =
        `userProfile:${userId}`;

      const stored =
        await AsyncStorage.getItem(
          targetStorageKey
        );

      const currentProfile = {
        ...defaultProfile,
        ...parseProfile(stored),
      };

      const next = {
        ...currentProfile,
        ...updates,
      };

      await persistProfile(
        userId,
        targetStorageKey,
        next
      );

      if (user?.id === userId) {
        setProfile(next);
      }
    },
    [persistProfile, user?.id]
  );

  return useMemo(
    () => ({
      profile,
      updateProfile,
      updateProfileForUser,
      isLoading,
    }),
    [
      profile,
      updateProfile,
      updateProfileForUser,
      isLoading,
    ]
  );
});
