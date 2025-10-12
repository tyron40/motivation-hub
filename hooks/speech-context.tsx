import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Speech, ListeningHistory, UserProfile } from '@/types/speech';
import { speeches as mockSpeeches } from '@/mocks/speeches';
import { fetchRealSpeeches } from '@/services/speechService';
import { getVideosByCategory, searchVideos as searchYouTubeVideos, getTrendingVideos, convertVideoToSpeech } from '@/services/youtubeService';

interface SpeechContextValue {
  speeches: Speech[];
  favorites: Speech[];
  currentSpeech: Speech | null;
  isPlaying: boolean;
  listeningHistory: ListeningHistory[];
  userProfile: UserProfile;
  currentTime: number;
  duration: number;
  isLoading: boolean;
  audioError: string | null;
  toggleFavorite: (speechId: string) => void;
  playPause: () => void;
  setCurrentSpeech: (speech: Speech | null) => void;
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
  handlePlaybackStatusUpdate: (status: {
    isPlaying: boolean;
    currentTime: number;
    duration: number;
    didJustFinish: boolean;
  }) => void;
  handleAudioError: (error: string) => void;
  audioPlayerRef: React.MutableRefObject<any>;
}

const defaultUserProfile: UserProfile = {
  name: 'Motivator',
  totalListeningTime: 0,
  favoriteCount: 0,
  streak: 1,
};

export const [SpeechProvider, useSpeechContext] = createContextHook<SpeechContextValue>(() => {
  const queryClient = useQueryClient();
  const [speeches, setSpeeches] = useState<Speech[]>([]);
  const [currentSpeech, setCurrentSpeech] = useState<Speech | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [listeningHistory, setListeningHistory] = useState<ListeningHistory[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile>(defaultUserProfile);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const audioPlayerRef = useRef<any>(null);
  const [audioError, setAudioError] = useState<string | null>(null);

  // Load favorites from AsyncStorage
  const favoritesQuery = useQuery({
    queryKey: ['favorites'],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem('favorites');
      return stored ? JSON.parse(stored) : [];
    },
  });

  // Load user profile from AsyncStorage
  const profileQuery = useQuery({
    queryKey: ['userProfile'],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem('userProfile');
      return stored ? JSON.parse(stored) : defaultUserProfile;
    },
  });

  // Load listening history
  const historyQuery = useQuery({
    queryKey: ['listeningHistory'],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem('listeningHistory');
      return stored ? JSON.parse(stored) : [];
    },
  });

  // Save favorites mutation
  const saveFavoritesMutation = useMutation({
    mutationFn: async (favoriteIds: string[]) => {
      await AsyncStorage.setItem('favorites', JSON.stringify(favoriteIds));
      return favoriteIds;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favorites'] });
    },
  });
  const { mutate: mutateFavorites } = saveFavoritesMutation;

  // Save profile mutation
  const saveProfileMutation = useMutation({
    mutationFn: async (profile: UserProfile) => {
      await AsyncStorage.setItem('userProfile', JSON.stringify(profile));
      return profile;
    },
  });
  const { mutate: mutateProfile } = saveProfileMutation;

  // Load real speeches on app start with enhanced error handling
  useEffect(() => {
    let isMounted = true;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    
    const initializeSpeeches = async () => {
      console.log('📺 Initializing app with YouTube API speeches...');
      
      try {
        if (isMounted) {
          setIsLoading(true);
        }
        
        // Start with mock data immediately for better UX
        if (isMounted && Array.isArray(mockSpeeches) && mockSpeeches.length > 0) {
          console.log(`📚 Setting ${mockSpeeches.length} mock speeches as fallback`);
          setSpeeches(mockSpeeches);
        }
        
        // Add timeout to prevent hanging on network requests
        timeoutId = setTimeout(() => {
          if (isMounted) {
            console.warn('⚠️ YouTube API loading timeout, using mock data');
            setIsLoading(false);
          }
        }, 15000); // 15 second timeout
        
        // Load trending content from YouTube
        try {
          const trendingVideos = await getTrendingVideos(20);
          const trendingSpeeches = trendingVideos.map(video => convertVideoToSpeech(video));
          
          if (timeoutId) {
            clearTimeout(timeoutId);
          }
          
          if (Array.isArray(trendingSpeeches) && trendingSpeeches.length > 0 && isMounted) {
            // Validate speeches before setting them
            const validSpeeches = trendingSpeeches.filter(speech => 
              speech && 
              typeof speech === 'object' && 
              speech.id && 
              speech.title && 
              speech.speaker &&
              typeof speech.id === 'string' &&
              typeof speech.title === 'string' &&
              typeof speech.speaker === 'string'
            );
            
            if (validSpeeches.length > 0) {
              console.log(`✅ Loaded ${validSpeeches.length} valid YouTube speeches from API`);
              setSpeeches(validSpeeches);
            } else {
              console.log('⚠️ No valid YouTube speeches found, keeping mock data');
            }
          } else {
            console.log('⚠️ No YouTube speeches found, keeping mock data');
          }
        } catch (fetchError) {
          console.error('❌ Error loading YouTube speeches from API, keeping mock data:', fetchError);
          // Mock data is already set, so no need to set it again
        }
      } catch (error) {
        console.error('❌ Error in speech initialization:', error);
        // Ensure we have some data even if everything fails
        if (isMounted && Array.isArray(mockSpeeches) && mockSpeeches.length > 0) {
          setSpeeches(mockSpeeches);
        }
      } finally {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };
    
    initializeSpeeches();
    
    return () => {
      isMounted = false;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, []);

  // Update speeches with favorite status
  useEffect(() => {
    if (favoritesQuery.data && speeches.length > 0) {
      const favoriteIds = favoritesQuery.data as string[];
      setSpeeches(prevSpeeches => prevSpeeches.map(speech => ({
        ...speech,
        isFavorite: favoriteIds.includes(speech.id),
      })));
    }
  }, [favoritesQuery.data, speeches.length]);

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

  const favorites = useMemo(() => 
    speeches.filter(speech => speech.isFavorite),
    [speeches]
  );

  const toggleFavorite = useCallback((speechId: string) => {
    try {
      if (!speechId || typeof speechId !== 'string') {
        console.warn('Invalid speechId provided to toggleFavorite:', speechId);
        return;
      }
      
      if (!Array.isArray(speeches)) {
        console.warn('Speeches array is not valid:', speeches);
        return;
      }
      
      const updatedSpeeches = speeches.map(speech => {
        if (speech && speech.id === speechId) {
          return { ...speech, isFavorite: !speech.isFavorite };
        }
        return speech;
      });
      
      setSpeeches(updatedSpeeches);
      
      const newFavoriteIds = updatedSpeeches
        .filter(s => s && s.isFavorite)
        .map(s => s.id)
        .filter(id => id && typeof id === 'string');
      
      mutateFavorites(newFavoriteIds);
      
      setUserProfile(prev => {
        if (!prev || typeof prev !== 'object') {
          console.warn('Invalid user profile:', prev);
          return defaultUserProfile;
        }
        
        const newProfile = {
          ...prev,
          favoriteCount: newFavoriteIds.length,
        };
        mutateProfile(newProfile);
        return newProfile;
      });
    } catch (error) {
      console.error('Error in toggleFavorite:', error);
    }
  }, [speeches, mutateFavorites, mutateProfile]);

  const playPause = useCallback(() => {
    console.log('🎵 Toggle play/pause, current state:', isPlaying);
    setIsPlaying(prev => !prev);
  }, [isPlaying]);

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
    return speeches.filter(speech => speech.category === category);
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
      
      // Load speeches from YouTube
      const categoryVideos = await getVideosByCategory(category, 10);
      const categorySpeeches = categoryVideos.map(video => convertVideoToSpeech(video));
      
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

  // Load fresh content from YouTube
  const loadFreshContent = useCallback(async (category: string, useCache: boolean = true) => {
    setIsLoading(true);
    try {
      console.log(`📺 Loading fresh content for category: ${category}`);
      const freshVideos = await getVideosByCategory(category, 10);
      const freshSpeeches = freshVideos.map(video => convertVideoToSpeech(video));
      
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

  // Search fresh content from YouTube
  const searchFreshContentHandler = useCallback(async (query: string) => {
    setIsLoading(true);
    try {
      console.log(`🔍 Searching fresh content for: ${query}`);
      const searchResults = await searchYouTubeVideos(query, 20);
      const searchSpeeches = searchResults.map(video => convertVideoToSpeech(video));
      
      if (searchSpeeches.length > 0) {
        const validResults = searchSpeeches.filter(speech => 
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

  // Load trending content from YouTube
  const loadTrendingContentHandler = useCallback(async (useCache: boolean = true) => {
    setIsLoading(true);
    try {
      console.log('📈 Loading trending content');
      const trendingVideos = await getTrendingVideos(20);
      const trendingSpeeches = trendingVideos.map(video => convertVideoToSpeech(video));
      
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
      console.log(`🔍 Searching YouTube for: ${query}`);
      const searchResults = await searchYouTubeVideos(query, 20);
      const searchSpeeches = searchResults.map(video => convertVideoToSpeech(video));
      if (searchSpeeches.length > 0) {
        // Validate search results before setting them
        const validResults = searchSpeeches.filter(speech => {
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

  // Handle audio playback status updates
  const handlePlaybackStatusUpdate = useCallback((status: {
    isPlaying: boolean;
    currentTime: number;
    duration: number;
    didJustFinish: boolean;
  }) => {
    setCurrentTime(status.currentTime);
    setDuration(status.duration);
    setIsPlaying(status.isPlaying);
    
    if (status.didJustFinish) {
      console.log('🏁 Audio finished playing');
      setIsPlaying(false);
      setCurrentTime(0);
    }
  }, []);

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
      
      setIsPlaying(false);
      setAudioError(null);
    } catch (error) {
      console.error('Error resetting audio state:', error);
      // Set safe defaults
      setCurrentTime(0);
      setDuration(0);
      setIsPlaying(false);
      setAudioError(null);
    }
  }, [currentSpeech]);

  return useMemo(() => ({
    speeches,
    favorites,
    currentSpeech,
    isPlaying,
    listeningHistory,
    userProfile,
    currentTime,
    duration,
    isLoading,
    audioError,
    toggleFavorite,
    playPause,
    setCurrentSpeech,
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
    handlePlaybackStatusUpdate,
    handleAudioError,
    audioPlayerRef,
  }), [
    speeches,
    favorites,
    currentSpeech,
    isPlaying,
    listeningHistory,
    userProfile,
    currentTime,
    duration,
    isLoading,
    audioError,
    toggleFavorite,
    playPause,
    setCurrentSpeech,
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
    handlePlaybackStatusUpdate,
    handleAudioError,
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