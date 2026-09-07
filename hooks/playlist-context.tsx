import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Playlist } from '@/types/speech';
import { useAuth } from '@/hooks/auth-context';

export const [PlaylistProvider, usePlaylists] = createContextHook(() => {
  const { user, isLoading: authLoading } = useAuth();
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const storageKey = user?.id ? `playlists:${user.id}` : null;
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;

    const loadPlaylists = async () => {
      setIsLoading(true);

      if (!storageKey) {
        setPlaylists([]);
        setIsLoading(false);
        return;
      }

      try {
        const stored = await AsyncStorage.getItem(storageKey);

        if (stored) {
          try {
            setPlaylists(JSON.parse(stored));
          } catch (parseError) {
            console.error('❌ Error parsing playlists:', parseError);
            setPlaylists([]);
          }
          return;
        }

        setPlaylists([]);
      } catch (error) {
        console.error('Error loading playlists:', error);
        setPlaylists([]);
      } finally {
        setIsLoading(false);
      }
    };

    void loadPlaylists();
  }, [authLoading, storageKey]);

  const savePlaylists = useCallback(async (newPlaylists: Playlist[]) => {
    if (!storageKey) {
      console.warn(
        '⚠️ Refusing to save playlists without an authenticated user'
      );
      return;
    }

    try {
      await AsyncStorage.setItem(
        storageKey,
        JSON.stringify(newPlaylists)
      );
      setPlaylists(newPlaylists);
    } catch (error) {
      console.error('Error saving playlists:', error);
    }
  }, [storageKey]);

  const createPlaylist = useCallback(async (
    name: string,
    description?: string,
    color?: string,
    initialSpeechId?: string
  ) => {
    const newPlaylist: Playlist = {
      id: Date.now().toString(),
      name,
      description,
      speechIds: initialSpeechId ? [initialSpeechId] : [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      color: color || '#8B4513',
    };
    
    const updated = [...playlists, newPlaylist];
    await savePlaylists(updated);
    return newPlaylist;
  }, [playlists, savePlaylists]);

  const deletePlaylist = useCallback(async (playlistId: string) => {
    const updated = playlists.filter(p => p.id !== playlistId);
    await savePlaylists(updated);
  }, [playlists, savePlaylists]);

  const addToPlaylist = useCallback(async (playlistId: string, speechId: string) => {
    const updated = playlists.map(p => {
      if (p.id === playlistId && !p.speechIds.includes(speechId)) {
        return {
          ...p,
          speechIds: [...p.speechIds, speechId],
          updatedAt: Date.now(),
        };
      }
      return p;
    });
    await savePlaylists(updated);
  }, [playlists, savePlaylists]);

  const removeFromPlaylist = useCallback(async (playlistId: string, speechId: string) => {
    const updated = playlists.map(p => {
      if (p.id === playlistId) {
        return {
          ...p,
          speechIds: p.speechIds.filter(id => id !== speechId),
          updatedAt: Date.now(),
        };
      }
      return p;
    });
    await savePlaylists(updated);
  }, [playlists, savePlaylists]);

  const updatePlaylist = useCallback(async (playlistId: string, updates: Partial<Playlist>) => {
    const updated = playlists.map(p => {
      if (p.id === playlistId) {
        return {
          ...p,
          ...updates,
          updatedAt: Date.now(),
        };
      }
      return p;
    });
    await savePlaylists(updated);
  }, [playlists, savePlaylists]);

  return useMemo(() => ({
    playlists,
    isLoading,
    createPlaylist,
    deletePlaylist,
    addToPlaylist,
    removeFromPlaylist,
    updatePlaylist,
  }), [playlists, isLoading, createPlaylist, deletePlaylist, addToPlaylist, removeFromPlaylist, updatePlaylist]);
});
