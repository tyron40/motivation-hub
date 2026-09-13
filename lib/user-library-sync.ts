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

export type UserLibraryColumn =
  | 'user_profile'
  | 'speech_profile'
  | 'listening_history'
  | 'favorite_scriptures'
  | 'chat_sessions'
  | 'liked_flyer_ids'
  | 'liked_clip_ids'
  | 'saved_clip_ids';

export async function loadRemoteLibraryField<T>(
  userId: string,
  column: UserLibraryColumn,
  fallback: T
): Promise<T> {
  const { data, error } = await supabase
    .from('user_libraries')
    .select(column)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return fallback;

  const row = data as unknown as
    Record<UserLibraryColumn, unknown>;

  const value = row[column];

  return value === null ||
    typeof value === 'undefined'
    ? fallback
    : value as T;
}

export async function saveRemoteLibraryField<T>(
  userId: string,
  column: UserLibraryColumn,
  value: T
): Promise<void> {
  const payload: Record<string, unknown> = {
    user_id: userId,
    [column]: value,
  };

  const { error } = await supabase
    .from('user_libraries')
    .upsert(
      payload,
      {
        onConflict: 'user_id',
      }
    );

  if (error) throw error;
}

export function mergeRecordsById<
  T extends {
    id: string;
    updatedAt?: number;
    savedAt?: number;
  }
>(
  localRecords: T[],
  remoteRecords: T[]
): T[] {
  const merged = new Map<string, T>();

  [...localRecords, ...remoteRecords].forEach(record => {
    if (
      !record ||
      typeof record.id !== 'string'
    ) {
      return;
    }

    const existing = merged.get(record.id);

    const recordTime =
      record.updatedAt ??
      record.savedAt ??
      0;

    const existingTime =
      existing?.updatedAt ??
      existing?.savedAt ??
      0;

    if (
      !existing ||
      recordTime >= existingTime
    ) {
      merged.set(record.id, record);
    }
  });

  return Array.from(merged.values());
}
