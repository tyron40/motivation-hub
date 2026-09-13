import { supabase } from '@/lib/supabase';
import type { Playlist, Speech } from '@/types/speech';

interface UserLibraryRow {
  favorite_speeches: unknown;
  playlists: unknown;
}

export interface FavoriteLibrary {
  ids: string[];
  snapshots: Speech[];
}

function isPlaylist(value: unknown): value is Playlist {
  if (!value || typeof value !== 'object') return false;

  const playlist = value as Partial<Playlist>;

  return (
    typeof playlist.id === 'string' &&
    typeof playlist.name === 'string' &&
    Array.isArray(playlist.speechIds) &&
    typeof playlist.createdAt === 'number' &&
    typeof playlist.updatedAt === 'number'
  );
}

function isSpeech(value: unknown): value is Speech {
  if (!value || typeof value !== 'object') return false;

  const speech = value as Partial<Speech>;

  return (
    typeof speech.id === 'string' &&
    typeof speech.title === 'string' &&
    typeof speech.speaker === 'string'
  );
}

export function mergePlaylists(
  localPlaylists: Playlist[],
  remotePlaylists: Playlist[]
): Playlist[] {
  const merged = new Map<string, Playlist>();

  [...localPlaylists, ...remotePlaylists].forEach(playlist => {
    if (!isPlaylist(playlist)) return;

    const existing = merged.get(playlist.id);

    if (
      !existing ||
      playlist.updatedAt >= existing.updatedAt
    ) {
      merged.set(playlist.id, playlist);
    }
  });

  return Array.from(merged.values()).sort(
    (a, b) => b.updatedAt - a.updatedAt
  );
}

export async function loadRemotePlaylists(
  userId: string
): Promise<Playlist[]> {
  const { data, error } = await supabase
    .from('user_libraries')
    .select('playlists')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;

  const row = data as Pick<UserLibraryRow, 'playlists'> | null;

  return Array.isArray(row?.playlists)
    ? row.playlists.filter(isPlaylist)
    : [];
}

export async function saveRemotePlaylists(
  userId: string,
  playlists: Playlist[]
): Promise<void> {
  const { error } = await supabase
    .from('user_libraries')
    .upsert(
      {
        user_id: userId,
        playlists,
      },
      {
        onConflict: 'user_id',
      }
    );

  if (error) throw error;
}

export async function loadRemoteFavorites(
  userId: string
): Promise<Speech[]> {
  const { data, error } = await supabase
    .from('user_libraries')
    .select('favorite_speeches')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;

  const row =
    data as Pick<UserLibraryRow, 'favorite_speeches'> | null;

  return Array.isArray(row?.favorite_speeches)
    ? row.favorite_speeches.filter(isSpeech)
    : [];
}

export async function saveRemoteFavorites(
  userId: string,
  favorites: Speech[]
): Promise<void> {
  const { error } = await supabase
    .from('user_libraries')
    .upsert(
      {
        user_id: userId,
        favorite_speeches: favorites,
      },
      {
        onConflict: 'user_id',
      }
    );

  if (error) throw error;
}
