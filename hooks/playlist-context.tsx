import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Playlist } from '@/types/speech';

const STORAGE_KEY = 'playlists';

export const [PlaylistProvider, usePlaylists] = createContextHook(() => {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadPlaylists = async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) {
          setPlaylists(JSON.parse(stored));
        }
      } catch (error) {
        console.error('Error loading playlists:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadPlaylists();
  }, []);

  const savePlaylists = useCallback(async (newPlaylists: Playlist[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newPlaylists));
      setPlaylists(newPlaylists);
    } catch (error) {
      console.error('Error saving playlists:', error);
    }
  }, []);

  const createPlaylist = useCallback(async (name: string, description?: string, color?: string) => {
    const newPlaylist: Playlist = {
      id: Date.now().toString(),
      name,
      description,
      speechIds: [],
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
