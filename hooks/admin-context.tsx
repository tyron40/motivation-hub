import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useAuth } from '@/hooks/auth-context';
import { MotivationalFlyer } from '@/mocks/motivationalFlyers';
import { CategoryBanner, getDefaultBannerForCategory } from '@/mocks/categoryBanners';

const ADMIN_EMAILS = ['robertstyron40@gmail.com'];

export interface AdminVideo {
  id: string;
  title: string;
  youtubeId: string;
  thumbnail: string;
  channelTitle: string;
  description: string;
  addedAt: number;
}

const STORAGE_KEY_FLYERS = 'admin_custom_flyers';
const STORAGE_KEY_VIDEOS = 'admin_custom_videos';
const STORAGE_KEY_BANNERS = 'admin_category_banners';
const STORAGE_KEY_UPDATED_AT = 'admin_data_updated_at';

const REFRESH_INTERVAL_MS = 5 * 60 * 1000;

const getBackendUrl = () => {
  const url = process.env.EXPO_PUBLIC_RORK_API_BASE_URL ?? '';
  return url.endsWith('/') ? url.slice(0, -1) : url;
};

interface ServerAdminData {
  flyers: MotivationalFlyer[];
  videos: AdminVideo[];
  banners: CategoryBanner[];
  updatedAt: string | null;
}

const fetchAdminDataFromServer = async (): Promise<ServerAdminData | null> => {
  try {
    const baseUrl = getBackendUrl();
    console.log('📡 Fetching admin data from server...');
    const response = await fetch(`${baseUrl}/api/admin/data`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!response.ok) {
      console.warn('⚠️ Server admin data fetch failed:', response.status);
      return null;
    }
    const data = await response.json();
    console.log('✅ Fetched admin data from server:', {
      flyers: data.flyers?.length ?? 0,
      videos: data.videos?.length ?? 0,
      banners: data.banners?.length ?? 0,
      updatedAt: data.updatedAt ?? 'none',
    });
    return {
      flyers: Array.isArray(data.flyers) ? data.flyers : [],
      videos: Array.isArray(data.videos) ? data.videos : [],
      banners: Array.isArray(data.banners) ? data.banners : [],
      updatedAt: data.updatedAt ?? null,
    };
  } catch (error) {
    console.warn('⚠️ Failed to fetch admin data from server:', error);
    return null;
  }
};

const syncAdminAction = async (type: string, action: string, data: any): Promise<ServerAdminData | null> => {
  try {
    const baseUrl = getBackendUrl();
    console.log(`📡 Syncing admin action: ${type}/${action}`);
    const response = await fetch(`${baseUrl}/api/admin/data`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, action, data }),
    });
    if (!response.ok) {
      console.warn('⚠️ Server sync failed:', response.status);
      return null;
    }
    const result = await response.json();
    console.log(`✅ Synced ${type}/${action} to server`);
    if (result.flyers && result.videos && result.banners) {
      return {
        flyers: result.flyers,
        videos: result.videos,
        banners: result.banners,
        updatedAt: result.updatedAt ?? null,
      };
    }
    return null;
  } catch (error) {
    console.warn('⚠️ Failed to sync admin action:', error);
    return null;
  }
};

export const [AdminProvider, useAdmin] = createContextHook(() => {
  const { user } = useAuth();
  const [customFlyers, setCustomFlyers] = useState<MotivationalFlyer[]>([]);
  const [customVideos, setCustomVideos] = useState<AdminVideo[]>([]);
  const [customBanners, setCustomBanners] = useState<CategoryBanner[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastServerUpdate, setLastServerUpdate] = useState<string | null>(null);
  const refreshTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  const isAdmin = useMemo(() => {
    const email = user?.email?.toLowerCase();
    return ADMIN_EMAILS.includes(email ?? '');
  }, [user?.email]);

  const applyServerData = useCallback(async (serverData: ServerAdminData) => {
    const hasFlyers = serverData.flyers.length > 0;
    const hasBanners = serverData.banners.length > 0;
    const hasVideos = serverData.videos.length > 0;
    const isNewer = !lastServerUpdate || serverData.updatedAt !== lastServerUpdate;

    if (!isNewer && !hasFlyers && !hasBanners && !hasVideos) {
      console.log('📦 Admin data unchanged, skipping update');
      return;
    }

    console.log('📦 Applying server admin data to local state');

    setCustomFlyers(serverData.flyers);
    setCustomVideos(serverData.videos);
    setCustomBanners(serverData.banners);
    if (serverData.updatedAt) {
      setLastServerUpdate(serverData.updatedAt);
    }

    await Promise.all([
      AsyncStorage.setItem(STORAGE_KEY_FLYERS, JSON.stringify(serverData.flyers)),
      AsyncStorage.setItem(STORAGE_KEY_VIDEOS, JSON.stringify(serverData.videos)),
      AsyncStorage.setItem(STORAGE_KEY_BANNERS, JSON.stringify(serverData.banners)),
      serverData.updatedAt
        ? AsyncStorage.setItem(STORAGE_KEY_UPDATED_AT, serverData.updatedAt)
        : Promise.resolve(),
    ]).catch(err => console.warn('⚠️ Error caching admin data locally:', err));

    console.log('✅ Admin data synced from server → local');
  }, [lastServerUpdate]);

  const refreshFromServer = useCallback(async () => {
    console.log('🔄 Refreshing admin data from server...');
    const serverData = await fetchAdminDataFromServer();
    if (serverData) {
      await applyServerData(serverData);
    }
  }, [applyServerData]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [flyersRaw, videosRaw, bannersRaw, updatedAtRaw] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEY_FLYERS),
          AsyncStorage.getItem(STORAGE_KEY_VIDEOS),
          AsyncStorage.getItem(STORAGE_KEY_BANNERS),
          AsyncStorage.getItem(STORAGE_KEY_UPDATED_AT),
        ]);

        if (flyersRaw) {
          const parsed = JSON.parse(flyersRaw);
          if (Array.isArray(parsed)) setCustomFlyers(parsed);
        }
        if (videosRaw) {
          const parsed = JSON.parse(videosRaw);
          if (Array.isArray(parsed)) setCustomVideos(parsed);
        }
        if (bannersRaw) {
          const parsed = JSON.parse(bannersRaw);
          if (Array.isArray(parsed)) setCustomBanners(parsed);
        }
        if (updatedAtRaw) {
          setLastServerUpdate(updatedAtRaw);
        }

        const serverData = await fetchAdminDataFromServer();
        if (serverData) {
          await applyServerData(serverData);
        }
      } catch (error) {
        console.error('Error loading admin data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    void loadData();
  }, [applyServerData]);

  useEffect(() => {
    refreshTimerRef.current = setInterval(() => {
      console.log('⏰ Periodic admin data refresh triggered');
      void refreshFromServer();
    }, REFRESH_INTERVAL_MS);

    return () => {
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
      }
    };
  }, [refreshFromServer]);

  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (
        appStateRef.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        console.log('📱 App came to foreground – refreshing admin data');
        void refreshFromServer();
      }
      appStateRef.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => {
      subscription.remove();
    };
  }, [refreshFromServer]);

  const addFlyer = useCallback(async (flyer: MotivationalFlyer) => {
    try {
      const updated = [...customFlyers, flyer];
      setCustomFlyers(updated);
      await AsyncStorage.setItem(STORAGE_KEY_FLYERS, JSON.stringify(updated));
      const serverResult = await syncAdminAction('flyers', 'add', flyer);
      if (serverResult) {
        await applyServerData(serverResult);
      }
      console.log('Admin: Flyer added and synced globally', flyer.title);
    } catch (error) {
      console.error('Error saving flyer:', error);
    }
  }, [customFlyers, applyServerData]);

  const removeFlyer = useCallback(async (id: string) => {
    try {
      const updated = customFlyers.filter(f => f.id !== id);
      setCustomFlyers(updated);
      await AsyncStorage.setItem(STORAGE_KEY_FLYERS, JSON.stringify(updated));
      const serverResult = await syncAdminAction('flyers', 'remove', { id });
      if (serverResult) {
        await applyServerData(serverResult);
      }
    } catch (error) {
      console.error('Error removing flyer:', error);
    }
  }, [customFlyers, applyServerData]);

  const addVideo = useCallback(async (video: AdminVideo) => {
    try {
      const updated = [...customVideos, video];
      setCustomVideos(updated);
      await AsyncStorage.setItem(STORAGE_KEY_VIDEOS, JSON.stringify(updated));
      const serverResult = await syncAdminAction('videos', 'add', video);
      if (serverResult) {
        await applyServerData(serverResult);
      }
      console.log('Admin: Video added and synced globally', video.title);
    } catch (error) {
      console.error('Error saving video:', error);
    }
  }, [customVideos, applyServerData]);

  const removeVideo = useCallback(async (id: string) => {
    try {
      const updated = customVideos.filter(v => v.id !== id);
      setCustomVideos(updated);
      await AsyncStorage.setItem(STORAGE_KEY_VIDEOS, JSON.stringify(updated));
      const serverResult = await syncAdminAction('videos', 'remove', { id });
      if (serverResult) {
        await applyServerData(serverResult);
      }
    } catch (error) {
      console.error('Error removing video:', error);
    }
  }, [customVideos, applyServerData]);

  const updateBanner = useCallback(async (banner: CategoryBanner) => {
    try {
      const existing = customBanners.findIndex(b => b.categoryId === banner.categoryId);
      let updated: CategoryBanner[];
      if (existing >= 0) {
        updated = [...customBanners];
        updated[existing] = banner;
      } else {
        updated = [...customBanners, banner];
      }
      setCustomBanners(updated);
      await AsyncStorage.setItem(STORAGE_KEY_BANNERS, JSON.stringify(updated));
      const serverResult = await syncAdminAction('banners', 'update', banner);
      if (serverResult) {
        await applyServerData(serverResult);
      }
      console.log('Admin: Banner updated and synced globally for', banner.categoryName);
    } catch (error) {
      console.error('Error saving banner:', error);
    }
  }, [customBanners, applyServerData]);

  const getBannerForCategory = useCallback((categoryId: string, categoryName: string): CategoryBanner => {
    const custom = customBanners.find(b => b.categoryId === categoryId);
    if (custom) return custom;
    return getDefaultBannerForCategory(categoryId, categoryName);
  }, [customBanners]);

  return useMemo(() => ({
    isAdmin,
    isLoading,
    customFlyers,
    customVideos,
    customBanners,
    addFlyer,
    removeFlyer,
    addVideo,
    removeVideo,
    updateBanner,
    getBannerForCategory,
    refreshFromServer,
  }), [isAdmin, isLoading, customFlyers, customVideos, customBanners, addFlyer, removeFlyer, addVideo, removeVideo, updateBanner, getBannerForCategory, refreshFromServer]);
});
