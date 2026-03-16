import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useState, useEffect, useCallback, useMemo } from 'react';
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

export const [AdminProvider, useAdmin] = createContextHook(() => {
  const { user } = useAuth();
  const [customFlyers, setCustomFlyers] = useState<MotivationalFlyer[]>([]);
  const [customVideos, setCustomVideos] = useState<AdminVideo[]>([]);
  const [customBanners, setCustomBanners] = useState<CategoryBanner[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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
    } catch (error) {
      console.error('Error removing flyer:', error);
    }
  }, [customFlyers]);

  const addVideo = useCallback(async (video: AdminVideo) => {
    try {
      const updated = [...customVideos, video];
      setCustomVideos(updated);
      await AsyncStorage.setItem(STORAGE_KEY_VIDEOS, JSON.stringify(updated));
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
