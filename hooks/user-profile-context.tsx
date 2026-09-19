import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from 'react';
import { useAuth } from './auth-context';
import { loadRemoteLibraryField } from '@/lib/user-library-sync';
import { supabase } from '@/lib/supabase';

type ThemeColor = 'purple' | 'blue' | 'green' | 'orange' | 'red' | 'pink';

interface UserProfile {
  name: string;
  preferredVoice: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';
  voiceEnabled: boolean;
  chatbotName: string;
  includeChurchMotivation: boolean;
  theme: ThemeColor;
  notifications: boolean;
  darkMode: boolean;
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
  theme: 'blue',
  notifications: true,
  darkMode: true,
};

function parseProfile(stored: string | null): Partial<UserProfile> {
  if (!stored) return {};
  try {
    const parsed = JSON.parse(stored);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed
      : {};
  } catch (error) {
    console.warn('Unable to parse local user profile:', error);
    return {};
  }
}

function pendingKey(userId: string): string {
  return `userProfilePending:${userId}`;
}

async function patchRemoteProfile(
  patch: Partial<UserProfile>
): Promise<Partial<UserProfile>> {
  const { data, error } = await supabase.rpc(
    'patch_my_user_settings',
    { p_patch: patch }
  );
  if (error) throw error;
  return data && typeof data === 'object' && !Array.isArray(data)
    ? data as Partial<UserProfile>
    : patch;
}

export const [UserProfileProvider, useUserProfile] = createContextHook(() => {
  const { user } = useAuth();
  const storageKey = useMemo(
    () => `userProfile:${user?.id ?? 'guest'}`,
    [user?.id]
  );
  const [profile, setProfile] = useState<UserProfile>(defaultProfile);
  const [isLoading, setIsLoading] = useState(true);
  const profileRef = useRef<UserProfile>(defaultProfile);
  const writeQueueRef = useRef<Promise<void>>(Promise.resolve());

  const applyProfile = useCallback((next: UserProfile) => {
    profileRef.current = next;
    setProfile(next);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadProfile = async () => {
      setIsLoading(true);
      applyProfile(defaultProfile);
      const local = {
        ...defaultProfile,
        ...parseProfile(await AsyncStorage.getItem(storageKey)),
      };

      if (!user?.id) {
        if (!cancelled) applyProfile(local);
        if (!cancelled) setIsLoading(false);
        return;
      }

      try {
        const remote = await loadRemoteLibraryField<Partial<UserProfile>>(
          user.id,
          'user_profile',
          {}
        );
        const pending = parseProfile(
          await AsyncStorage.getItem(pendingKey(user.id))
        );
        const hasRemote = Object.keys(remote).length > 0;
        const base = hasRemote ? remote : local;
        let merged = {
          ...defaultProfile,
          ...base,
          ...pending,
        } as UserProfile;

        const patch = Object.keys(pending).length > 0
          ? pending
          : hasRemote
            ? null
            : local;

        if (patch) {
          try {
            const saved = await patchRemoteProfile(patch);
            merged = { ...defaultProfile, ...merged, ...saved };
            await AsyncStorage.removeItem(pendingKey(user.id));
          } catch (error) {
            await AsyncStorage.setItem(
              pendingKey(user.id),
              JSON.stringify(patch)
            );
            console.warn('Profile cloud retry remains queued:', error);
          }
        }

        await AsyncStorage.setItem(storageKey, JSON.stringify(merged));
        if (!cancelled) applyProfile(merged);
      } catch (error) {
        console.warn('Profile cloud sync unavailable; using local cache:', error);
        if (!cancelled) applyProfile(local);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    void loadProfile();
    return () => { cancelled = true; };
  }, [applyProfile, storageKey, user?.id]);

  const persistPatch = useCallback(
    async (
      userId: string | undefined,
      targetStorageKey: string,
      updates: Partial<UserProfile>,
      next: UserProfile
    ) => {
      await AsyncStorage.setItem(targetStorageKey, JSON.stringify(next));
      if (!userId) return;

      const key = pendingKey(userId);
      const queued = {
        ...parseProfile(await AsyncStorage.getItem(key)),
        ...updates,
      };
      await AsyncStorage.setItem(key, JSON.stringify(queued));

      try {
        const saved = await patchRemoteProfile(queued);
        const latestQueued = parseProfile(await AsyncStorage.getItem(key));
        if (JSON.stringify(latestQueued) === JSON.stringify(queued)) {
          await AsyncStorage.removeItem(key);
        }
        if (user?.id === userId) {
          const merged = { ...profileRef.current, ...saved } as UserProfile;
          applyProfile(merged);
          await AsyncStorage.setItem(targetStorageKey, JSON.stringify(merged));
        }
      } catch (error) {
        console.warn('Profile saved locally; cloud retry queued:', error);
      }
    },
    [applyProfile, user?.id]
  );

  const updateProfile = useCallback(
    async (updates: Partial<UserProfile>) => {
      const next = { ...profileRef.current, ...updates };
      applyProfile(next);
      const task = writeQueueRef.current
        .catch(() => undefined)
        .then(() => persistPatch(user?.id, storageKey, updates, next));
      writeQueueRef.current = task;
      await task;
    },
    [applyProfile, persistPatch, storageKey, user?.id]
  );

  const updateProfileForUser = useCallback(
    async (userId: string, updates: Partial<UserProfile>) => {
      if (!userId) throw new Error('A valid user ID is required to save the profile.');
      const targetStorageKey = `userProfile:${userId}`;
      const current = {
        ...defaultProfile,
        ...parseProfile(await AsyncStorage.getItem(targetStorageKey)),
      };
      const next = { ...current, ...updates };
      await AsyncStorage.setItem(targetStorageKey, JSON.stringify(next));
      await AsyncStorage.setItem(pendingKey(userId), JSON.stringify(updates));

      if (user?.id === userId) {
        applyProfile(next);
        await persistPatch(userId, targetStorageKey, updates, next);
      }
    },
    [applyProfile, persistPatch, user?.id]
  );

  return useMemo(() => ({
    profile,
    updateProfile,
    updateProfileForUser,
    isLoading,
  }), [profile, updateProfile, updateProfileForUser, isLoading]);
});
