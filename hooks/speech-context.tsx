import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './auth-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Speech, ListeningHistory, UserProfile } from '@/types/speech';
import { speeches as mockSpeeches } from '@/mocks/speeches';
import { fetchRealSpeeches } from '@/services/speechService';
import { fetchFreshContentByCategory, searchFreshContent, fetchTrendingContent, getQuotaStatus } from '@/services/contentService';
import {
  FavoriteLibrary,
  loadRemoteFavorites,
  loadRemoteLibraryField,
  saveRemoteFavorites,
  saveRemoteLibraryField,
} from '@/lib/user-library-sync';

interface SpeechContextValue {
  speeches: Speech[];
  favorites: Speech[];
  currentSpeech: Speech | null;
  currentPlaylist: Speech[];
  isPlaying: boolean;
  listeningHistory: ListeningHistory[];
  userProfile: UserProfile;
  currentTime: number;
  duration: number;
  isLoading: boolean;
  audioError: string | null;
  isMinimized: boolean;
  toggleFavorite: (speechId: string) => void;
  playPause: () => void;
  setCurrentSpeech: (speech: Speech | null) => void;
  setCurrentPlaylist: (playlist: Speech[]) => void;
  setIsMinimized: (minimized: boolean) => void;
  searchSpeeches: (query: string) => Speech[];
  getSpeechesByCategory: (category: string) => Speech[];
  updateListeningTime: (seconds: number) => void;
  seekTo: (position: number) => void;
  loadRealSpeeches: () => Promise<void>;
  loadSpeechesByCategory: (category: string) => Promise<void>;
  searchOnlineSpeeches: (query: string) => Promise<void>;
  loadFreshContent: (category: string, useCache?: boolean) => Promise<void>;
  searchFreshContent: (query: string) => Promise<void>;
  loadTrendingContent: (useCache?: boolean) => Promise<void>;
  skipToNext: () => void;
  skipToPrevious: () => void;
  handlePlaybackStatusUpdate: (status: {
    isPlaying: boolean;
    currentTime: number;
    duration: number;
    didJustFinish: boolean;
  }) => void;
  handleAudioError: (error: string) => void;
  audioPlayerRef: React.MutableRefObject<any>;
  setIsPlaying: (playing: boolean) => void;
  setCurrentTime: (time: number) => void;
  setDuration: (duration: number) => void;
}

const defaultUserProfile: UserProfile = {
  name: 'Motivator',
  totalListeningTime: 0,
  favoriteCount: 0,
  streak: 1,
};

export const [SpeechProvider, useSpeechContext] = createContextHook<SpeechContextValue>(() => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const favoritesStorageKey = user?.id ? `favorites:${user.id}` : null;
  const favoriteSnapshotsStorageKey = user?.id
    ? `favoriteSnapshots:${user.id}`
    : null;
  const profileStorageKey = user?.id ? `speechProfile:${user.id}` : null;
  const historyStorageKey = user?.id ? `listeningHistory:${user.id}` : null;
  const [speeches, setSpeeches] = useState<Speech[]>([]);
  const [currentSpeech, setCurrentSpeech] = useState<Speech | null>(null);
  const [currentPlaylist, setCurrentPlaylist] = useState<Speech[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [listeningHistory, setListeningHistory] = useState<ListeningHistory[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile>(defaultUserProfile);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const audioPlayerRef = useRef<any>(null);
  const historyCheckpointRef = useRef<{
    speechId: string;
    bucket: number;
  }>({
    speechId: '',
    bucket: -1,
  });
  const [audioError, setAudioError] = useState<string | null>(null);

  // Load favorites immediately from the local cache, then merge
  // the authenticated user's durable Supabase snapshots.
  const favoritesQuery = useQuery({
    queryKey: ['favorites', user?.id],
    queryFn: async (): Promise<FavoriteLibrary> => {
      if (
        !favoritesStorageKey ||
        !favoriteSnapshotsStorageKey ||
        !user?.id
      ) {
        return {
          ids: [],
          snapshots: [],
        };
      }

      const [storedIds, storedSnapshots] =
        await AsyncStorage.multiGet([
          favoritesStorageKey,
          favoriteSnapshotsStorageKey,
        ]);

      let localIds: string[] = [];
      let localSnapshots: Speech[] = [];

      try {
        const parsedIds = storedIds[1]
          ? JSON.parse(storedIds[1])
          : [];

        localIds = Array.isArray(parsedIds)
          ? parsedIds.filter(
              (id): id is string =>
                typeof id === 'string'
            )
          : [];
      } catch (error) {
        console.warn(
          'Unable to parse local favorite IDs:',
          error
        );
      }

      try {
        const parsedSnapshots = storedSnapshots[1]
          ? JSON.parse(storedSnapshots[1])
          : [];

        localSnapshots = Array.isArray(parsedSnapshots)
          ? parsedSnapshots.filter(
              (speech): speech is Speech =>
                !!speech &&
                typeof speech.id === 'string' &&
                typeof speech.title === 'string' &&
                typeof speech.speaker === 'string'
            )
          : [];
      } catch (error) {
        console.warn(
          'Unable to parse local favorite snapshots:',
          error
        );
      }

      try {
        const remoteSnapshots =
          await loadRemoteFavorites(user.id);

        const snapshotMap =
          new Map<string, Speech>();

        localSnapshots.forEach(speech => {
          snapshotMap.set(speech.id, {
            ...speech,
            isFavorite: true,
          });
        });

        remoteSnapshots.forEach(speech => {
          snapshotMap.set(speech.id, {
            ...speech,
            isFavorite: true,
          });
        });

        const snapshots =
          Array.from(snapshotMap.values());

        const ids = Array.from(
          new Set([
            ...localIds,
            ...snapshots.map(speech => speech.id),
          ])
        );

        await AsyncStorage.multiSet([
          [
            favoritesStorageKey,
            JSON.stringify(ids),
          ],
          [
            favoriteSnapshotsStorageKey,
            JSON.stringify(snapshots),
          ],
        ]);

        if (
          JSON.stringify(snapshots) !==
          JSON.stringify(remoteSnapshots)
        ) {
          await saveRemoteFavorites(
            user.id,
            snapshots
          );
        }

        return {
          ids,
          snapshots,
        };
      } catch (error) {
        console.warn(
          'Favorite cloud sync unavailable; using local cache:',
          error
        );

        return {
          ids: localIds,
          snapshots: localSnapshots,
        };
      }
    },
  });

  // Save locally first, then synchronize full snapshots to Supabase.
  const saveFavoritesMutation = useMutation({
    mutationFn: async (
      library: FavoriteLibrary
    ): Promise<FavoriteLibrary> => {
      if (
        !favoritesStorageKey ||
        !favoriteSnapshotsStorageKey ||
        !user?.id
      ) {
        return library;
      }

      await AsyncStorage.multiSet([
        [
          favoritesStorageKey,
          JSON.stringify(library.ids),
        ],
        [
          favoriteSnapshotsStorageKey,
          JSON.stringify(library.snapshots),
        ],
      ]);

      try {
        await saveRemoteFavorites(
          user.id,
          library.snapshots
        );
      } catch (error) {
        console.warn(
          'Favorites saved locally; cloud sync will retry on next login:',
          error
        );
      }

      return library;
    },
    onSuccess: library => {
      queryClient.setQueryData(
        ['favorites', user?.id],
        library
      );
    },
  });

  const { mutate: mutateFavorites } =
    saveFavoritesMutation;

  // Load the speech profile locally first, then merge
  // account data without delaying the initial screen.
  const profileQuery = useQuery({
    queryKey: ['speechProfile', user?.id],
    queryFn: async (): Promise<UserProfile> => {
      if (!profileStorageKey || !user?.id) {
        return defaultUserProfile;
      }

      const stored =
        await AsyncStorage.getItem(
          profileStorageKey
        );

      let localProfile = defaultUserProfile;

      if (stored) {
        try {
          localProfile = {
            ...defaultUserProfile,
            ...JSON.parse(stored),
          };
        } catch (error) {
          console.warn(
            'Unable to parse local speech profile:',
            error
          );
        }
      }

      try {
        const remoteProfile =
          await loadRemoteLibraryField<
            Partial<UserProfile>
          >(
            user.id,
            'speech_profile',
            {}
          );

        const mergedProfile = {
          ...defaultUserProfile,
          ...localProfile,
          ...remoteProfile,
        };

        await AsyncStorage.setItem(
          profileStorageKey,
          JSON.stringify(mergedProfile)
        );

        if (
          JSON.stringify(mergedProfile) !==
          JSON.stringify(remoteProfile)
        ) {
          await saveRemoteLibraryField(
            user.id,
            'speech_profile',
            mergedProfile
          );
        }

        return mergedProfile;
      } catch (error) {
        console.warn(
          'Speech profile cloud sync unavailable; using local cache:',
          error
        );

        return localProfile;
      }
    },
  });

  // Load and merge the newest progress for each speech.
  const historyQuery = useQuery({
    queryKey: ['listeningHistory', user?.id],
    queryFn: async (): Promise<
      ListeningHistory[]
    > => {
      if (!historyStorageKey || !user?.id) {
        return [];
      }

      const stored =
        await AsyncStorage.getItem(
          historyStorageKey
        );

      let localHistory: ListeningHistory[] = [];

      if (stored) {
        try {
          const parsed = JSON.parse(stored);

          localHistory = Array.isArray(parsed)
            ? parsed
            : [];
        } catch (error) {
          console.warn(
            'Unable to parse local listening history:',
            error
          );
        }
      }

      try {
        const remoteHistory =
          await loadRemoteLibraryField<
            ListeningHistory[]
          >(
            user.id,
            'listening_history',
            []
          );

        const mergedMap =
          new Map<string, ListeningHistory>();

        [
          ...localHistory,
          ...(Array.isArray(remoteHistory)
            ? remoteHistory
            : []),
        ].forEach(entry => {
          if (
            !entry ||
            typeof entry.speechId !== 'string'
          ) {
            return;
          }

          const existing =
            mergedMap.get(entry.speechId);

          const entryTime = new Date(
            entry.listenedAt
          ).getTime();

          const existingTime = existing
            ? new Date(
                existing.listenedAt
              ).getTime()
            : 0;

          if (
            !existing ||
            entryTime >= existingTime
          ) {
            mergedMap.set(
              entry.speechId,
              {
                ...entry,
                listenedAt:
                  new Date(entry.listenedAt),
              }
            );
          }
        });

        const merged = Array.from(
          mergedMap.values()
        ).sort(
          (a, b) =>
            new Date(b.listenedAt).getTime() -
            new Date(a.listenedAt).getTime()
        );

        await AsyncStorage.setItem(
          historyStorageKey,
          JSON.stringify(merged)
        );

        if (
          JSON.stringify(merged) !==
          JSON.stringify(remoteHistory)
        ) {
          await saveRemoteLibraryField(
            user.id,
            'listening_history',
            merged
          );
        }

        return merged;
      } catch (error) {
        console.warn(
          'Listening history cloud sync unavailable; using local cache:',
          error
        );

        return localHistory.map(entry => ({
          ...entry,
          listenedAt:
            new Date(entry.listenedAt),
        }));
      }
    },
  });

  const saveProfileMutation = useMutation({
    mutationFn: async (
      profile: UserProfile
    ) => {
      if (!profileStorageKey || !user?.id) {
        return profile;
      }

      await AsyncStorage.setItem(
        profileStorageKey,
        JSON.stringify(profile)
      );

      try {
        await saveRemoteLibraryField(
          user.id,
          'speech_profile',
          profile
        );
      } catch (error) {
        console.warn(
          'Speech profile saved locally; cloud sync will retry:',
          error
        );
      }

      return profile;
    },
    onSuccess: profile => {
      queryClient.setQueryData(
        ['speechProfile', user?.id],
        profile
      );
    },
  });

  const { mutate: mutateProfile } =
    saveProfileMutation;

  const persistListeningHistory =
    useCallback(
      async (
        history: ListeningHistory[]
      ) => {
        if (
          !historyStorageKey ||
          !user?.id
        ) {
          return;
        }

        await AsyncStorage.setItem(
          historyStorageKey,
          JSON.stringify(history)
        );

        queryClient.setQueryData(
          ['listeningHistory', user.id],
          history
        );

        try {
          await saveRemoteLibraryField(
            user.id,
            'listening_history',
            history
          );
        } catch (error) {
          console.warn(
            'Listening progress saved locally; cloud sync will retry:',
            error
          );
        }
      },
      [
        historyStorageKey,
        queryClient,
        user?.id,
      ]
    );

  // Load real speeches on app start with quota-aware scheduled refresh
  useEffect(() => {
    let isMounted = true;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    let refreshIntervalId: ReturnType<typeof setInterval> | undefined;

    const REFRESH_INTERVAL = 1000 * 60 * 60 * 3; // 3 hours

    const validateSpeech = (speech: any): speech is Speech => {
      return (
        speech &&
        typeof speech === 'object' &&
        speech.id &&
        speech.title &&
        speech.speaker &&
        typeof speech.id === 'string' &&
        typeof speech.title === 'string' &&
        typeof speech.speaker === 'string'
      );
    };

    const loadContent = async (isInitial: boolean) => {
      if (!isMounted) return;

      if (isInitial) {
        setIsLoading(true);
      }

      try {
        const quota = await getQuotaStatus();
        console.log(
          `YouTube quota status – fetches: ${quota.fetchCount}/${quota.fetchMax}, limitReached: ${quota.isLimitReached}`
        );

        const trendingSpeeches = await fetchTrendingContent(20, true);

        if (Array.isArray(trendingSpeeches) && trendingSpeeches.length > 0 && isMounted) {
          const validSpeeches = trendingSpeeches.filter(validateSpeech);
          if (validSpeeches.length > 0) {
            console.log(`Loaded ${validSpeeches.length} YouTube speeches via ContentManager`);
            setSpeeches(validSpeeches);
          } else if (isInitial) {
            console.log('No valid YouTube speeches, keeping mock data');
          }
        } else if (isInitial) {
          console.log('No YouTube speeches returned, keeping mock data');
        }
      } catch (error) {
        console.error('Error loading YouTube speeches:', error);
      } finally {
        if (isMounted && isInitial) {
          setIsLoading(false);
        }
      }
    };

    const initializeSpeeches = async () => {
      console.log('Initializing app with quota-aware YouTube content...');

      if (isMounted && Array.isArray(mockSpeeches) && mockSpeeches.length > 0) {
        setSpeeches(mockSpeeches);
      }

      timeoutId = setTimeout(() => {
        if (isMounted) {
          console.warn('YouTube API loading timeout, using mock data');
          setIsLoading(false);
        }
      }, 15000);

      await loadContent(true);

      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = undefined;
      }

      refreshIntervalId = setInterval(() => {
        console.log('Scheduled 3-hour content refresh triggered');
        void loadContent(false);
      }, REFRESH_INTERVAL);
    };

    void initializeSpeeches();

    return () => {
      isMounted = false;
      if (timeoutId) clearTimeout(timeoutId);
      if (refreshIntervalId) clearInterval(refreshIntervalId);
    };
  }, []);

  // Update speeches with the current user's favorite status.
  useEffect(() => {
    const favoriteIds =
      favoritesQuery.data?.ids ?? [];

    if (speeches.length > 0) {
      const favoriteSet =
        new Set(favoriteIds);

      setSpeeches(prevSpeeches =>
        prevSpeeches.map(speech => ({
          ...speech,
          isFavorite:
            favoriteSet.has(speech.id),
        }))
      );
    }
  }, [favoritesQuery.data?.ids, speeches.length]);

  // Update user profile
  useEffect(() => {
    if (profileQuery.data) {
      setUserProfile(profileQuery.data);
    }
  }, [profileQuery.data]);

  // Update listening history
  useEffect(() => {
    if (historyQuery.data) {
      setListeningHistory(historyQuery.data);
    }
  }, [historyQuery.data]);

  const favoriteIdsSet = useMemo(
    () => new Set(
      favoritesQuery.data?.ids ?? []
    ),
    [favoritesQuery.data?.ids]
  );

  const favoriteSnapshots =
    favoritesQuery.data?.snapshots ?? [];

  const favorites = useMemo(() => {
    const speechMap =
      new Map<string, Speech>();

    favoriteSnapshots.forEach(speech => {
      if (favoriteIdsSet.has(speech.id)) {
        speechMap.set(speech.id, {
          ...speech,
          isFavorite: true,
        });
      }
    });

    speeches.forEach(speech => {
      if (
        speech?.id &&
        favoriteIdsSet.has(speech.id)
      ) {
        speechMap.set(speech.id, {
          ...speech,
          isFavorite: true,
        });
      }
    });

    if (
      currentSpeech?.id &&
      favoriteIdsSet.has(currentSpeech.id)
    ) {
      speechMap.set(currentSpeech.id, {
        ...currentSpeech,
        isFavorite: true,
      });
    }

    return Array.from(speechMap.values());
  }, [
    speeches,
    currentSpeech,
    favoriteIdsSet,
    favoriteSnapshots,
  ]);

  // Convert legacy local favorite IDs into complete snapshots
  // as matching speeches become available.
  useEffect(() => {
    const favoriteIds =
      favoritesQuery.data?.ids ?? [];

    if (favoriteIds.length === 0) {
      return;
    }

    const snapshotMap =
      new Map<string, Speech>();

    favoriteSnapshots.forEach(speech => {
      snapshotMap.set(speech.id, speech);
    });

    let addedSnapshot = false;

    speeches.forEach(speech => {
      if (
        favoriteIdsSet.has(speech.id) &&
        !snapshotMap.has(speech.id)
      ) {
        snapshotMap.set(speech.id, {
          ...speech,
          isFavorite: true,
        });

        addedSnapshot = true;
      }
    });

    if (
      currentSpeech?.id &&
      favoriteIdsSet.has(currentSpeech.id) &&
      !snapshotMap.has(currentSpeech.id)
    ) {
      snapshotMap.set(currentSpeech.id, {
        ...currentSpeech,
        isFavorite: true,
      });

      addedSnapshot = true;
    }

    if (addedSnapshot) {
      mutateFavorites({
        ids: favoriteIds,
        snapshots:
          Array.from(snapshotMap.values()),
      });
    }
  }, [
    speeches,
    currentSpeech,
    favoriteIdsSet,
    favoriteSnapshots,
    favoritesQuery.data?.ids,
    mutateFavorites,
  ]);

  const toggleFavorite = useCallback(
    (speechId: string) => {
      try {
        if (
          !speechId ||
          typeof speechId !== 'string'
        ) {
          console.warn(
            'Invalid speechId provided to toggleFavorite:',
            speechId
          );
          return;
        }

        const favoriteSet = new Set(
          favoritesQuery.data?.ids ?? []
        );

        const wasFavorite =
          favoriteSet.has(speechId);

        const targetSpeech =
          speeches.find(
            speech => speech?.id === speechId
          ) ??
          (
            currentSpeech?.id === speechId
              ? currentSpeech
              : undefined
          ) ??
          favoriteSnapshots.find(
            speech => speech.id === speechId
          );

        if (!wasFavorite && !targetSpeech) {
          console.warn(
            'Unable to favorite speech because its data was not found:',
            speechId
          );
          return;
        }

        if (wasFavorite) {
          favoriteSet.delete(speechId);
        } else {
          favoriteSet.add(speechId);
        }

        const snapshotMap =
          new Map<string, Speech>();

        favoriteSnapshots.forEach(speech => {
          snapshotMap.set(speech.id, speech);
        });

        if (wasFavorite) {
          snapshotMap.delete(speechId);
        } else if (targetSpeech) {
          snapshotMap.set(speechId, {
            ...targetSpeech,
            isFavorite: true,
          });
        }

        const newFavoriteIds =
          Array.from(favoriteSet);

        const newSnapshots =
          Array.from(snapshotMap.values());

        setSpeeches(prevSpeeches =>
          prevSpeeches.map(speech =>
            speech.id === speechId
              ? {
                  ...speech,
                  isFavorite: !wasFavorite,
                }
              : speech
          )
        );

        setCurrentSpeech(previous =>
          previous?.id === speechId
            ? {
                ...previous,
                isFavorite: !wasFavorite,
              }
            : previous
        );

        mutateFavorites({
          ids: newFavoriteIds,
          snapshots: newSnapshots,
        });

        setUserProfile(previous => {
          const safeProfile =
            previous &&
            typeof previous === 'object'
              ? previous
              : defaultUserProfile;

          const newProfile = {
            ...safeProfile,
            favoriteCount:
              newFavoriteIds.length,
          };

          mutateProfile(newProfile);
          return newProfile;
        });
      } catch (error) {
        console.error(
          'Error in toggleFavorite:',
          error
        );
      }
    },
    [
      speeches,
      currentSpeech,
      favoriteSnapshots,
      favoritesQuery.data?.ids,
      mutateFavorites,
      mutateProfile,
    ]
  );

  const isPlayingRef = useRef(isPlaying);
  useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);

  const playPause = useCallback(() => {
    console.log('[Playback Trace] Context playPause called');
    console.log('[Playback Trace] Global player ref exists:', Boolean(audioPlayerRef.current));
    audioPlayerRef.current?.togglePlay();
  }, [audioPlayerRef]);

  const skipToNext = useCallback(() => {
    if (!currentSpeech || currentPlaylist.length === 0) return;
    const currentIndex = currentPlaylist.findIndex((s: Speech) => s.id === currentSpeech.id);
    if (currentIndex === -1) return;
    const nextIndex = (currentIndex + 1) % currentPlaylist.length;
    const nextSpeech = currentPlaylist[nextIndex];
    if (nextSpeech) {
      console.log('⏭️ Skipping to next in playlist:', nextSpeech.title);
      setCurrentSpeech(nextSpeech);
    }
  }, [currentSpeech, currentPlaylist]);

  const skipToPrevious = useCallback(() => {
    if (!currentSpeech || currentPlaylist.length === 0) return;
    const currentIndex = currentPlaylist.findIndex((s: Speech) => s.id === currentSpeech.id);
    if (currentIndex === -1) return;
    const prevIndex = currentIndex === 0 ? currentPlaylist.length - 1 : currentIndex - 1;
    const prevSpeech = currentPlaylist[prevIndex];
    if (prevSpeech) {
      console.log('⏮️ Skipping to previous in playlist:', prevSpeech.title);
      setCurrentSpeech(prevSpeech);
    }
  }, [currentSpeech, currentPlaylist]);

  const searchSpeeches = useCallback((query: string): Speech[] => {
    const lowercaseQuery = query.toLowerCase();
    return speeches.filter(speech => 
      speech.title.toLowerCase().includes(lowercaseQuery) ||
      speech.speaker.toLowerCase().includes(lowercaseQuery) ||
      speech.category.toLowerCase().includes(lowercaseQuery) ||
      speech.tags?.some(tag => tag.toLowerCase().includes(lowercaseQuery))
    );
  }, [speeches]);

  const getSpeechesByCategory = useCallback((category: string): Speech[] => {
    const normalizedCategory = (category || '').toLowerCase().trim();
    if (!normalizedCategory) return [];

    const words = normalizedCategory.split(/\s+/).filter(Boolean);

    const scoreSpeech = (speech: Speech): number => {
      const speechCategory = (speech.category || '').toLowerCase();
      const title = (speech.title || '').toLowerCase();
      const description = (speech.description || '').toLowerCase();
      const tags = (speech.tags || []).join(' ').toLowerCase();

      let score = 0;

      if (speechCategory === normalizedCategory) score += 10;
      if (speechCategory.includes(normalizedCategory) || normalizedCategory.includes(speechCategory)) score += 6;

      for (const w of words) {
        if (!w) continue;
        if (speechCategory.includes(w)) score += 4;
        if (title.includes(w)) score += 3;
        if (description.includes(w)) score += 2;
        if (tags.includes(w)) score += 2;
      }

      return score;
    };

    const scored = speeches
      .map((speech) => ({ speech, score: scoreSpeech(speech) }))
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((x) => x.speech);

    return scored;
  }, [speeches]);

  const updateListeningTime = useCallback((seconds: number) => {
    setUserProfile(prev => {
      const newProfile = {
        ...prev,
        totalListeningTime: prev.totalListeningTime + seconds,
      };
      mutateProfile(newProfile);
      return newProfile;
    });
  }, [mutateProfile]);

  const seekTo = useCallback(async (position: number) => {
    console.log('🎯 Seeking to position:', position);
    if (audioPlayerRef.current && audioPlayerRef.current.seekTo) {
      await audioPlayerRef.current.seekTo(position);
    }
    setCurrentTime(position);
  }, []);

  // Load real speeches from YouTube
  const loadRealSpeeches = useCallback(async () => {
    setIsLoading(true);
    try {
      console.log('📺 Loading YouTube speeches...');
      const realSpeeches = await fetchRealSpeeches();
      if (realSpeeches.length > 0) {
        // Validate speeches before setting them
        const validSpeeches = realSpeeches.filter(speech => 
          speech && 
          typeof speech === 'object' && 
          speech.id && 
          speech.title && 
          speech.speaker
        );
        
        if (validSpeeches.length > 0) {
          setSpeeches(validSpeeches);
          console.log(`✅ Loaded ${validSpeeches.length} valid YouTube speeches`);
        } else {
          console.log('⚠️ No valid YouTube speeches found, keeping mock data');
        }
      } else {
        console.log('⚠️ No YouTube speeches found, keeping mock data');
      }
    } catch (error) {
      console.error('❌ Error loading YouTube speeches:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load speeches by category with enhanced error handling
  const loadSpeechesByCategory = useCallback(async (category: string) => {
    if (!category || typeof category !== 'string') {
      console.warn('Invalid category provided:', category);
      return;
    }
    
    setIsLoading(true);
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    
    try {
      console.log(`📺 Loading YouTube API speeches for category: ${category}`);
      
      // Add timeout to prevent hanging
      timeoutId = setTimeout(() => {
        console.warn(`⚠️ Category loading timeout for: ${category}`);
        setIsLoading(false);
      }, 10000);
      
      // Load speeches from YouTube API via backend
      const categorySpeeches = await fetchFreshContentByCategory(category, 50, true);
      
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = undefined;
      }
      
      if (Array.isArray(categorySpeeches) && categorySpeeches.length > 0) {
        // Validate speeches before adding them
        const validSpeeches = categorySpeeches.filter(speech => {
          try {
            return speech && 
              typeof speech === 'object' && 
              speech.id && 
              speech.title && 
              speech.speaker &&
              typeof speech.id === 'string' &&
              typeof speech.title === 'string' &&
              typeof speech.speaker === 'string';
          } catch {
            console.warn('Invalid speech object:', speech);
            return false;
          }
        });
        
        if (validSpeeches.length > 0) {
          // Merge with existing speeches, avoiding duplicates
          setSpeeches(prev => {
            try {
              if (!Array.isArray(prev)) {
                console.warn('Previous speeches not an array, replacing with new speeches');
                return validSpeeches;
              }
              
              const existingIds = new Set(prev.map(s => s && s.id).filter(Boolean));
              const newSpeeches = validSpeeches.filter(s => s && s.id && !existingIds.has(s.id));
              return [...prev, ...newSpeeches];
            } catch {
              console.error('Error merging speeches');
              return prev; // Return previous state if merge fails
            }
          });
          console.log(`✅ Loaded ${validSpeeches.length} valid YouTube API speeches for ${category}`);
        } else {
          console.log(`⚠️ No valid YouTube API speeches found for category: ${category}`);
        }
      } else {
        console.log(`⚠️ No YouTube API speeches returned for category: ${category}`);
      }
    } catch (error) {
      console.error(`❌ Error loading YouTube API speeches for ${category}:`, error);
    } finally {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      setIsLoading(false);
    }
  }, []);

  // Load fresh content from YouTube API via backend
  const loadFreshContent = useCallback(async (category: string, useCache: boolean = true) => {
    setIsLoading(true);
    try {
      console.log(`📺 Loading fresh content for category: ${category}`);
      const freshSpeeches = await fetchFreshContentByCategory(category, 10, useCache);
      
      if (freshSpeeches.length > 0) {
        const validSpeeches = freshSpeeches.filter(speech => 
          speech && 
          typeof speech === 'object' && 
          speech.id && 
          speech.title && 
          speech.speaker
        );
        
        if (validSpeeches.length > 0) {
          setSpeeches(prev => {
            const existingIds = new Set(prev.map(s => s.id));
            const newSpeeches = validSpeeches.filter(s => !existingIds.has(s.id));
            return [...prev, ...newSpeeches];
          });
          console.log(`✅ Loaded ${validSpeeches.length} fresh speeches for ${category}`);
        }
      }
    } catch (error) {
      console.error(`❌ Error loading fresh content for ${category}:`, error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Search fresh content from YouTube API via backend
  const searchFreshContentHandler = useCallback(async (query: string) => {
    setIsLoading(true);
    try {
      console.log(`🔍 Searching fresh content for: ${query}`);
      const searchResults = await searchFreshContent(query, 20);
      
      if (searchResults.length > 0) {
        const validResults = searchResults.filter(speech => 
          speech && 
          typeof speech === 'object' && 
          speech.id && 
          speech.title && 
          speech.speaker
        );
        
        if (validResults.length > 0) {
          setSpeeches(validResults);
          console.log(`✅ Found ${validResults.length} fresh speeches for "${query}"`);
        }
      }
    } catch (error) {
      console.error(`❌ Error searching fresh content:`, error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load trending content from YouTube API via backend
  const loadTrendingContentHandler = useCallback(async (useCache: boolean = true) => {
    setIsLoading(true);
    try {
      console.log('📈 Loading trending content');
      const trendingSpeeches = await fetchTrendingContent(20, useCache);
      
      if (trendingSpeeches.length > 0) {
        const validSpeeches = trendingSpeeches.filter(speech => 
          speech && 
          typeof speech === 'object' && 
          speech.id && 
          speech.title && 
          speech.speaker
        );
        
        if (validSpeeches.length > 0) {
          setSpeeches(validSpeeches);
          console.log(`✅ Loaded ${validSpeeches.length} trending speeches`);
        }
      }
    } catch (error) {
      console.error('❌ Error loading trending content:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Search online speeches
  const searchOnlineSpeeches = useCallback(async (query: string) => {
    setIsLoading(true);
    try {
      console.log(`🔍 Searching YouTube API for: ${query}`);
      const searchResults = await searchFreshContent(query, 20);
      if (searchResults.length > 0) {
        // Validate search results before setting them
        const validResults = searchResults.filter(speech => {
          try {
            return speech && 
              typeof speech === 'object' && 
              speech.id && 
              speech.title && 
              speech.speaker &&
              typeof speech.id === 'string' &&
              typeof speech.title === 'string' &&
              typeof speech.speaker === 'string';
          } catch {
            console.warn('Invalid search result:', speech);
            return false;
          }
        });
        
        if (validResults.length > 0) {
          // Merge with existing speeches, avoiding duplicates
          setSpeeches(prev => {
            const existingIds = new Set(prev.map(s => s.id));
            const newSpeeches = validResults.filter(s => !existingIds.has(s.id));
            return [...prev, ...newSpeeches];
          });
          console.log(`✅ Found ${validResults.length} valid YouTube API speeches for "${query}"`);
        } else {
          console.log('⚠️ No valid search results found');
        }
      } else {
        console.log('⚠️ No search results found');
      }
    } catch (error) {
      console.error(`❌ Error searching YouTube API for "${query}":`, error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handlePlaybackStatusUpdate =
    useCallback((status: {
      isPlaying: boolean;
      currentTime: number;
      duration: number;
      didJustFinish: boolean;
    }) => {
      if (status.currentTime >= 0) {
        setCurrentTime(status.currentTime);
      }

      if (status.duration > 0) {
        setDuration(status.duration);
      }

      const speechId = currentSpeech?.id;
      const checkpointBucket =
        Math.floor(status.currentTime / 30);

      const shouldSaveProgress =
        !!speechId &&
        status.duration > 0 &&
        (
          status.didJustFinish ||
          historyCheckpointRef.current.speechId
            !== speechId ||
          historyCheckpointRef.current.bucket
            !== checkpointBucket
        );

      if (shouldSaveProgress && speechId) {
        historyCheckpointRef.current = {
          speechId,
          bucket: checkpointBucket,
        };

        const progress = status.didJustFinish
          ? 100
          : Math.min(
              100,
              Math.max(
                0,
                (
                  status.currentTime /
                  status.duration
                ) * 100
              )
            );

        setListeningHistory(previous => {
          const nextEntry: ListeningHistory = {
            speechId,
            listenedAt: new Date(),
            progress,
          };

          const nextHistory = [
            nextEntry,
            ...previous.filter(
              entry =>
                entry.speechId !== speechId
            ),
          ].slice(0, 250);

          void persistListeningHistory(
            nextHistory
          );

          return nextHistory;
        });
      }

      if (status.didJustFinish) {
        console.log(
          'Audio finished playing'
        );

        isPlayingRef.current = false;
        setIsPlaying(false);
        setCurrentTime(0);
      }
    }, [
      currentSpeech?.id,
      persistListeningHistory,
    ]);

  // Handle audio errors with enhanced logging
  const handleAudioError = useCallback((error: string) => {
    try {
      // Only log critical errors, not transient ones
      if (error && !error.includes('timeout') && !error.includes('check failed')) {
        console.error('❌ Audio error:', error);
        
        if (typeof error === 'string' && error.length > 0) {
          setAudioError(error);
        } else {
          setAudioError('Unknown audio error');
        }
        
        // Only reset playback for critical errors
        setIsPlaying(false);
        setCurrentTime(0);
      } else {
        // For transient errors, just log them
        console.log('⚠️ Transient audio issue:', error);
        // Clear error after a short delay
        setTimeout(() => setAudioError(null), 3000);
      }
    } catch (handlerError) {
      console.error('❌ Error in handleAudioError:', handlerError);
      setAudioError('Audio error handler failed');
      setIsPlaying(false);
    }
  }, []);

  // Reset audio when speech changes with safety checks
  useEffect(() => {
    try {
      setCurrentTime(0);
      
      if (currentSpeech && typeof currentSpeech === 'object' && typeof currentSpeech.duration === 'number') {
        setDuration(currentSpeech.duration);
      } else {
        setDuration(0);
      }
      
      setAudioError(null);
    } catch (error) {
      console.error('Error resetting audio state:', error);
      setCurrentTime(0);
      setDuration(0);
      setAudioError(null);
    }
  }, [currentSpeech]);

  return useMemo(() => ({
    speeches,
    favorites,
    currentSpeech,
    currentPlaylist,
    isPlaying,
    listeningHistory,
    userProfile,
    currentTime,
    duration,
    isLoading,
    audioError,
    isMinimized,
    toggleFavorite,
    playPause,
    setCurrentSpeech,
    setCurrentPlaylist,
    setIsMinimized,
    searchSpeeches,
    getSpeechesByCategory,
    updateListeningTime,
    seekTo,
    loadRealSpeeches,
    loadSpeechesByCategory,
    searchOnlineSpeeches,
    loadFreshContent,
    searchFreshContent: searchFreshContentHandler,
    loadTrendingContent: loadTrendingContentHandler,
    skipToNext,
    skipToPrevious,
    handlePlaybackStatusUpdate,
    handleAudioError,
    audioPlayerRef,
    setIsPlaying,
    setCurrentTime,
    setDuration,
  }), [
    speeches,
    favorites,
    currentSpeech,
    currentPlaylist,
    isPlaying,
    listeningHistory,
    userProfile,
    currentTime,
    duration,
    isLoading,
    audioError,
    isMinimized,
    toggleFavorite,
    playPause,
    setCurrentSpeech,
    setCurrentPlaylist,
    setIsMinimized,
    searchSpeeches,
    getSpeechesByCategory,
    updateListeningTime,
    seekTo,
    loadRealSpeeches,
    loadSpeechesByCategory,
    searchOnlineSpeeches,
    loadFreshContent,
    searchFreshContentHandler,
    loadTrendingContentHandler,
    skipToNext,
    skipToPrevious,
    handlePlaybackStatusUpdate,
    handleAudioError,
    setIsPlaying,
    setCurrentTime,
    setDuration,
  ]);
});

// Helper hooks
export const useFavorites = () => {
  const { favorites } = useSpeechContext();
  return favorites;
};

export const useCurrentSpeech = () => {
  const { currentSpeech, isPlaying, playPause, setCurrentSpeech, currentTime, duration, seekTo } = useSpeechContext();
  return { currentSpeech, isPlaying, playPause, setCurrentSpeech, currentTime, duration, seekTo };
};

export const useSpeechSearch = (query: string) => {
  const { searchSpeeches } = useSpeechContext();
  return useMemo(() => searchSpeeches(query), [query, searchSpeeches]);
};