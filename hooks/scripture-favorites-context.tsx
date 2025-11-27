import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { FavoriteScripture } from '@/types/speech';

const STORAGE_KEY = 'favoriteScriptures';

export const [ScriptureFavoritesProvider, useScriptureFavorites] = createContextHook(() => {
  const [favorites, setFavorites] = useState<FavoriteScripture[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadFavorites = async () => {
      try {
        const timeoutPromise = new Promise<null>((resolve) => {
          setTimeout(() => {
            console.warn('⚠️ Scripture favorites loading timeout');
            resolve(null);
          }, 5000);
        });
        
        const loadPromise = AsyncStorage.getItem(STORAGE_KEY);
        const stored = await Promise.race([loadPromise, timeoutPromise]);
        
        if (stored && typeof stored === 'string') {
          try {
            setFavorites(JSON.parse(stored));
          } catch (parseError) {
            console.error('❌ Error parsing scripture favorites:', parseError);
            setFavorites([]);
          }
        }
      } catch (error) {
        console.error('Error loading favorite scriptures:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadFavorites();
  }, []);

  const saveFavorites = useCallback(async (newFavorites: FavoriteScripture[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newFavorites));
      setFavorites(newFavorites);
    } catch (error) {
      console.error('Error saving favorite scriptures:', error);
    }
  }, []);

  const addFavorite = useCallback(async (text: string, reference: string, category: string, notes?: string) => {
    const newFavorite: FavoriteScripture = {
      id: Date.now().toString(),
      text,
      reference,
      category,
      savedAt: Date.now(),
      notes,
    };
    
    const updated = [...favorites, newFavorite];
    await saveFavorites(updated);
    return newFavorite;
  }, [favorites, saveFavorites]);

  const removeFavorite = useCallback(async (scriptureId: string) => {
    const updated = favorites.filter(f => f.id !== scriptureId);
    await saveFavorites(updated);
  }, [favorites, saveFavorites]);

  const updateFavorite = useCallback(async (scriptureId: string, updates: Partial<FavoriteScripture>) => {
    const updated = favorites.map(f => {
      if (f.id === scriptureId) {
        return { ...f, ...updates };
      }
      return f;
    });
    await saveFavorites(updated);
  }, [favorites, saveFavorites]);

  const isFavorite = useCallback((reference: string) => {
    return favorites.some(f => f.reference === reference);
  }, [favorites]);

  return useMemo(() => ({
    favorites,
    isLoading,
    addFavorite,
    removeFavorite,
    updateFavorite,
    isFavorite,
  }), [favorites, isLoading, addFavorite, removeFavorite, updateFavorite, isFavorite]);
});
