import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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

const PRODUCTION_API_URL = 'https://motivation-hub-git-main-tyrons-projects-584a5697.vercel.app';

const getBackendUrl = () => {
  return process.env.EXPO_PUBLIC_RORK_API_BASE_URL || PRODUCTION_API_URL;
};

const fetchAdminDataFromServer = async (): Promise<{ flyers: MotivationalFlyer[]; videos: AdminVideo[]; banners: CategoryBanner[] } | null> => {
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
    });
    return {
      flyers: Array.isArray(data.flyers) ? data.flyers : [],
      videos: Array.isArray(data.videos) ? data.videos : [],
      banners: Array.isArray(data.banners) ? data.banners : [],
    };
  } catch (error) {
    console.warn('⚠️ Failed to fetch admin data from server:', error);
    return null;
  }
};

const syncAdminAction = async (type: string, action: string, data: any): Promise<boolean> => {
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
      return false;
    }
    console.log(`✅ Synced ${type}/${action} to server`);
    return true;
  } catch (error) {
    console.warn('⚠️ Failed to sync admin action:', error);
    return false;
  }
};

export const [AdminProvider, useAdmin] = createContextHook(() => {
  const { user } = useAuth();
  const [customFlyers, setCustomFlyers] = useState<MotivationalFlyer[]>([]);
  const [customVideos, setCustomVideos] = useState<AdminVideo[]>([]);
  const [customBanners, setCustomBanners] = useState<CategoryBanner[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const hasLoadedFromServer = useRef(false);

  const isAdmin = useMemo(() => {
    const email = user?.email?.toLowerCase();
    return ADMIN_EMAILS.includes(email ?? '');
  }, [user?.email]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [flyersRaw, videosRaw, bannersRaw] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEY_FLYERS),
          AsyncStorage.getItem(STORAGE_KEY_VIDEOS),
          AsyncStorage.getItem(STORAGE_KEY_BANNERS),
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

        if (!hasLoadedFromServer.current) {
          hasLoadedFromServer.current = true;
          const serverData = await fetchAdminDataFromServer();
          if (serverData) {
            if (serverData.flyers.length > 0) {
              setCustomFlyers(serverData.flyers);
              await AsyncStorage.setItem(STORAGE_KEY_FLYERS, JSON.stringify(serverData.flyers));
            }
            if (serverData.videos.length > 0) {
              setCustomVideos(serverData.videos);
              await AsyncStorage.setItem(STORAGE_KEY_VIDEOS, JSON.stringify(serverData.videos));
            }
            if (serverData.banners.length > 0) {
              setCustomBanners(serverData.banners);
              await AsyncStorage.setItem(STORAGE_KEY_BANNERS, JSON.stringify(serverData.banners));
            }
          }
        }
      } catch (error) {
        console.error('Error loading admin data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    void loadData();
  }, []);

  const addFlyer = useCallback(async (flyer: MotivationalFlyer) => {
    try {
      const updated = [...customFlyers, flyer];
      setCustomFlyers(updated);
      await AsyncStorage.setItem(STORAGE_KEY_FLYERS, JSON.stringify(updated));
      await syncAdminAction('flyers', 'add', flyer);
      console.log('Admin: Flyer added', flyer.title);
    } catch (error) {
      console.error('Error saving flyer:', error);
    }
  }, [customFlyers]);

  const removeFlyer = useCallback(async (id: string) => {
    try {
      const updated = customFlyers.filter(f => f.id !== id);
      setCustomFlyers(updated);
      await AsyncStorage.setItem(STORAGE_KEY_FLYERS, JSON.stringify(updated));
      await syncAdminAction('flyers', 'remove', { id });
    } catch (error) {
      console.error('Error removing flyer:', error);
    }
  }, [customFlyers]);

  const addVideo = useCallback(async (video: AdminVideo) => {
    try {
      const updated = [...customVideos, video];
      setCustomVideos(updated);
      await AsyncStorage.setItem(STORAGE_KEY_VIDEOS, JSON.stringify(updated));
      await syncAdminAction('videos', 'add', video);
      console.log('Admin: Video added', video.title);
    } catch (error) {
      console.error('Error saving video:', error);
    }
  }, [customVideos]);

  const removeVideo = useCallback(async (id: string) => {
    try {
      const updated = customVideos.filter(v => v.id !== id);
      setCustomVideos(updated);
      await AsyncStorage.setItem(STORAGE_KEY_VIDEOS, JSON.stringify(updated));
      await syncAdminAction('videos', 'remove', { id });
    } catch (error) {
      console.error('Error removing video:', error);
    }
  }, [customVideos]);

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
      await syncAdminAction('banners', 'update', banner);
      console.log('Admin: Banner updated for', banner.categoryName);
    } catch (error) {
      console.error('Error saving banner:', error);
    }
  }, [customBanners]);

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
  }), [isAdmin, isLoading, customFlyers, customVideos, customBanners, addFlyer, removeFlyer, addVideo, removeVideo, updateBanner, getBannerForCategory]);
});
