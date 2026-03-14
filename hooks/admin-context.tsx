import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/hooks/auth-context';
import { MotivationalFlyer } from '@/mocks/motivationalFlyers';

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

export const [AdminProvider, useAdmin] = createContextHook(() => {
  const { user } = useAuth();
  const [customFlyers, setCustomFlyers] = useState<MotivationalFlyer[]>([]);
  const [customVideos, setCustomVideos] = useState<AdminVideo[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const isAdmin = useMemo(() => {
    const email = user?.email?.toLowerCase();
    return ADMIN_EMAILS.includes(email ?? '');
  }, [user?.email]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [flyersRaw, videosRaw] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEY_FLYERS),
          AsyncStorage.getItem(STORAGE_KEY_VIDEOS),
        ]);

        if (flyersRaw) {
          const parsed = JSON.parse(flyersRaw);
          if (Array.isArray(parsed)) setCustomFlyers(parsed);
        }
        if (videosRaw) {
          const parsed = JSON.parse(videosRaw);
          if (Array.isArray(parsed)) setCustomVideos(parsed);
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

  return useMemo(() => ({
    isAdmin,
    isLoading,
    customFlyers,
    customVideos,
    addFlyer,
    removeFlyer,
    addVideo,
    removeVideo,
  }), [isAdmin, isLoading, customFlyers, customVideos, addFlyer, removeFlyer, addVideo, removeVideo]);
});
