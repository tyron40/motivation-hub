import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  useState,
  useEffect,
  useCallback,
  useMemo,
} from 'react';
import { FavoriteScripture } from '@/types/speech';
import { useAuth } from './auth-context';
import {
  loadRemoteLibraryField,
  mergeRecordsById,
  saveRemoteLibraryField,
} from '@/lib/user-library-sync';

function parseScriptures(
  stored: string | null
): FavoriteScripture[] {
  if (!stored) return [];

  try {
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.warn(
      'Unable to parse local scripture favorites:',
      error
    );
    return [];
  }
}

export const [
  ScriptureFavoritesProvider,
  useScriptureFavorites,
] = createContextHook(() => {
  const { user } = useAuth();

  const storageKey = useMemo(
    () =>
      `favoriteScriptures:${user?.id ?? 'guest'}`,
    [user?.id]
  );

  const [favorites, setFavorites] =
    useState<FavoriteScripture[]>([]);

  const [isLoading, setIsLoading] =
    useState(true);

  useEffect(() => {
    let cancelled = false;

    const loadFavorites = async () => {
      setFavorites([]);
      setIsLoading(true);

      const stored =
        await AsyncStorage.getItem(storageKey);

      const localFavorites =
        parseScriptures(stored);

      if (!cancelled) {
        setFavorites(localFavorites);
        setIsLoading(false);
      }

      if (!user?.id) return;

      try {
        const remoteFavorites =
          await loadRemoteLibraryField<
            FavoriteScripture[]
          >(
            user.id,
            'favorite_scriptures',
            []
          );

        const merged = mergeRecordsById(
          localFavorites,
          Array.isArray(remoteFavorites)
            ? remoteFavorites
            : []
        );

        await AsyncStorage.setItem(
          storageKey,
          JSON.stringify(merged)
        );

        if (!cancelled) {
          setFavorites(merged);
        }

        if (
          JSON.stringify(merged) !==
          JSON.stringify(remoteFavorites)
        ) {
          await saveRemoteLibraryField(
            user.id,
            'favorite_scriptures',
            merged
          );
        }
      } catch (error) {
        console.warn(
          'Scripture cloud sync unavailable; using local cache:',
          error
        );
      }
    };

    void loadFavorites();

    return () => {
      cancelled = true;
    };
  }, [storageKey, user?.id]);

  const saveFavorites = useCallback(
    async (
      newFavorites: FavoriteScripture[]
    ) => {
      await AsyncStorage.setItem(
        storageKey,
        JSON.stringify(newFavorites)
      );

      setFavorites(newFavorites);

      if (!user?.id) return;

      try {
        await saveRemoteLibraryField(
          user.id,
          'favorite_scriptures',
          newFavorites
        );
      } catch (error) {
        console.warn(
          'Scriptures saved locally; cloud sync will retry on next login:',
          error
        );
      }
    },
    [storageKey, user?.id]
  );

  const addFavorite = useCallback(
    async (
      text: string,
      reference: string,
      category: string,
      notes?: string
    ) => {
      const now = Date.now();

      const newFavorite: FavoriteScripture = {
        id: `${user?.id ?? 'guest'}-${now}`,
        text,
        reference,
        category,
        savedAt: now,
        notes,
      };

      await saveFavorites([
        ...favorites,
        newFavorite,
      ]);

      return newFavorite;
    },
    [favorites, saveFavorites, user?.id]
  );

  const removeFavorite = useCallback(
    async (scriptureId: string) => {
      await saveFavorites(
        favorites.filter(
          favorite =>
            favorite.id !== scriptureId
        )
      );
    },
    [favorites, saveFavorites]
  );

  const updateFavorite = useCallback(
    async (
      scriptureId: string,
      updates: Partial<FavoriteScripture>
    ) => {
      await saveFavorites(
        favorites.map(favorite =>
          favorite.id === scriptureId
            ? {
                ...favorite,
                ...updates,
                id: favorite.id,
              }
            : favorite
        )
      );
    },
    [favorites, saveFavorites]
  );

  const isFavorite = useCallback(
    (reference: string) =>
      favorites.some(
        favorite =>
          favorite.reference === reference
      ),
    [favorites]
  );

  return useMemo(
    () => ({
      favorites,
      isLoading,
      addFavorite,
      removeFavorite,
      updateFavorite,
      isFavorite,
    }),
    [
      favorites,
      isLoading,
      addFavorite,
      removeFavorite,
      updateFavorite,
      isFavorite,
    ]
  );
});
