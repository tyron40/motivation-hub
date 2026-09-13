import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  useState,
  useEffect,
  useCallback,
  useMemo,
} from 'react';
import { Playlist, Speech } from '@/types/speech';
import { useAuth } from '@/hooks/auth-context';
import {
  loadRemotePlaylists,
  mergePlaylists,
  saveRemotePlaylists,
} from '@/lib/user-library-sync';

function parseLocalPlaylists(value: string | null): Playlist[] {
  if (!value) return [];

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error('Error parsing stored playlists:', error);
    return [];
  }
}

export const [PlaylistProvider, usePlaylists] =
  createContextHook(() => {
    const {
      user,
      isLoading: authLoading,
    } = useAuth();

    const [playlists, setPlaylists] =
      useState<Playlist[]>([]);

    const [isLoading, setIsLoading] =
      useState(true);

    const storageKey = user?.id
      ? `playlists:${user.id}`
      : null;

    useEffect(() => {
      let cancelled = false;

      if (authLoading) return;

      const loadPlaylists = async () => {
        setIsLoading(true);

        if (!storageKey || !user?.id) {
          if (!cancelled) {
            setPlaylists([]);
            setIsLoading(false);
          }
          return;
        }

        const stored = await AsyncStorage.getItem(storageKey);
        const localPlaylists = parseLocalPlaylists(stored);

        if (!cancelled) {
          setPlaylists(localPlaylists);
        }

        try {
          const remotePlaylists =
            await loadRemotePlaylists(user.id);

          const merged = mergePlaylists(
            localPlaylists,
            remotePlaylists
          );

          await AsyncStorage.setItem(
            storageKey,
            JSON.stringify(merged)
          );

          if (!cancelled) {
            setPlaylists(merged);
          }

          if (
            JSON.stringify(merged) !==
            JSON.stringify(remotePlaylists)
          ) {
            await saveRemotePlaylists(user.id, merged);
          }
        } catch (error) {
          console.warn(
            'Playlist cloud sync unavailable; using local cache:',
            error
          );
        } finally {
          if (!cancelled) {
            setIsLoading(false);
          }
        }
      };

      void loadPlaylists();

      return () => {
        cancelled = true;
      };
    }, [authLoading, storageKey, user?.id]);

    const savePlaylists = useCallback(
      async (newPlaylists: Playlist[]) => {
        if (!storageKey || !user?.id) {
          console.warn(
            'Refusing to save playlists without an authenticated user'
          );
          return;
        }

        await AsyncStorage.setItem(
          storageKey,
          JSON.stringify(newPlaylists)
        );

        setPlaylists(newPlaylists);

        try {
          await saveRemotePlaylists(
            user.id,
            newPlaylists
          );
        } catch (error) {
          console.warn(
            'Playlist saved locally; cloud sync will retry on next login:',
            error
          );
        }
      },
      [storageKey, user?.id]
    );

    const createPlaylist = useCallback(
      async (
        name: string,
        description?: string,
        color?: string,
        initialSpeechId?: string,
        initialSpeech?: Speech
      ) => {
        const now = Date.now();

        const newPlaylist: Playlist = {
          id: `${user?.id ?? 'user'}-${now}`,
          name,
          description,
          speechIds: initialSpeechId
            ? [initialSpeechId]
            : [],
          speechSnapshots:
            initialSpeechId && initialSpeech
              ? [{
                  ...initialSpeech,
                  isFavorite:
                    !!initialSpeech.isFavorite,
                }]
              : [],
          createdAt: now,
          updatedAt: now,
          color: color || '#8B4513',
        };

        await savePlaylists([
          ...playlists,
          newPlaylist,
        ]);

        return newPlaylist;
      },
      [playlists, savePlaylists, user?.id]
    );

    const deletePlaylist = useCallback(
      async (playlistId: string) => {
        await savePlaylists(
          playlists.filter(
            playlist => playlist.id !== playlistId
          )
        );
      },
      [playlists, savePlaylists]
    );

    const addToPlaylist = useCallback(
      async (
        playlistId: string,
        speechId: string,
        speechSnapshot?: Speech
      ) => {
        const updated = playlists.map(playlist => {
          if (
            playlist.id === playlistId &&
            !playlist.speechIds.includes(speechId)
          ) {
            const snapshotMap =
              new Map<string, Speech>();

            (
              playlist.speechSnapshots ?? []
            ).forEach(speech => {
              snapshotMap.set(speech.id, speech);
            });

            if (speechSnapshot) {
              snapshotMap.set(
                speechId,
                speechSnapshot
              );
            }

            return {
              ...playlist,
              speechIds: [
                ...playlist.speechIds,
                speechId,
              ],
              speechSnapshots:
                Array.from(
                  snapshotMap.values()
                ),
              updatedAt: Date.now(),
            };
          }

          return playlist;
        });

        await savePlaylists(updated);
      },
      [playlists, savePlaylists]
    );

    const removeFromPlaylist = useCallback(
      async (
        playlistId: string,
        speechId: string
      ) => {
        const updated = playlists.map(playlist => {
          if (playlist.id === playlistId) {
            return {
              ...playlist,
              speechIds:
                playlist.speechIds.filter(
                  id => id !== speechId
                ),
              speechSnapshots:
                (
                  playlist.speechSnapshots ??
                  []
                ).filter(
                  speech =>
                    speech.id !== speechId
                ),
              updatedAt: Date.now(),
            };
          }

          return playlist;
        });

        await savePlaylists(updated);
      },
      [playlists, savePlaylists]
    );

    const updatePlaylist = useCallback(
      async (
        playlistId: string,
        updates: Partial<Playlist>
      ) => {
        const updated = playlists.map(playlist => {
          if (playlist.id === playlistId) {
            return {
              ...playlist,
              ...updates,
              id: playlist.id,
              createdAt: playlist.createdAt,
              updatedAt: Date.now(),
            };
          }

          return playlist;
        });

        await savePlaylists(updated);
      },
      [playlists, savePlaylists]
    );

    return useMemo(
      () => ({
        playlists,
        isLoading,
        createPlaylist,
        deletePlaylist,
        addToPlaylist,
        removeFromPlaylist,
        updatePlaylist,
      }),
      [
        playlists,
        isLoading,
        createPlaylist,
        deletePlaylist,
        addToPlaylist,
        removeFromPlaylist,
        updatePlaylist,
      ]
    );
  });
