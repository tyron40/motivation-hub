import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { ChatSession, ChatMessage } from '@/types/speech';
import { useAuth } from './auth-context';

export const [ChatSessionsProvider, useChatSessions] = createContextHook(() => {
  const { user } = useAuth();
  const storageKey = useMemo(() => `chatSessions:${user?.id ?? 'guest'}`, [user?.id]);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadSessions = async () => {
      try {
        const timeoutPromise = new Promise<null>((resolve) => {
          setTimeout(() => {
            console.warn('⚠️ Chat sessions loading timeout');
            resolve(null);
          }, 1000);
        });
        
        const loadPromise = AsyncStorage.getItem(storageKey);
        const stored = await Promise.race([loadPromise, timeoutPromise]);
        
        if (stored && typeof stored === 'string') {
          try {
            setSessions(JSON.parse(stored));
          } catch (parseError) {
            console.error('❌ Error parsing chat sessions:', parseError);
            setSessions([]);
          }
        }
      } catch (error) {
        console.error('Error loading chat sessions:', error);
      } finally {
        setIsLoading(false);
      }
    };

    setSessions([]);
    setCurrentSessionId(null);
    loadSessions();
  }, [storageKey]);

  const saveSessions = useCallback(async (newSessions: ChatSession[]) => {
    try {
      await AsyncStorage.setItem(storageKey, JSON.stringify(newSessions));
      setSessions(newSessions);
    } catch (error) {
      console.error('Error saving chat sessions:', error);
    }
  }, [storageKey]);

  const createSession = useCallback(async (title: string, initialMessages: ChatMessage[] = []) => {
    const newSession: ChatSession = {
      id: Date.now().toString(),
      title,
      messages: initialMessages,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    
    const updated = [...sessions, newSession];
    await saveSessions(updated);
    setCurrentSessionId(newSession.id);
    return newSession;
  }, [sessions, saveSessions]);

  const deleteSession = useCallback(async (sessionId: string) => {
    const updated = sessions.filter(s => s.id !== sessionId);
    await saveSessions(updated);
    if (currentSessionId === sessionId) {
      setCurrentSessionId(null);
    }
  }, [sessions, currentSessionId, saveSessions]);

  const updateSession = useCallback(async (sessionId: string, updates: Partial<ChatSession>) => {
    const updated = sessions.map(s => {
      if (s.id === sessionId) {
        return {
          ...s,
          ...updates,
          updatedAt: Date.now(),
        };
      }
      return s;
    });
    await saveSessions(updated);
  }, [sessions, saveSessions]);

  const addMessageToSession = useCallback(async (sessionId: string, message: ChatMessage) => {
    const updated = sessions.map(s => {
      if (s.id === sessionId) {
        return {
          ...s,
          messages: [...s.messages, message],
          updatedAt: Date.now(),
        };
      }
      return s;
    });
    await saveSessions(updated);
  }, [sessions, saveSessions]);

  const getCurrentSession = useCallback(() => {
    if (!currentSessionId) return null;
    return sessions.find(s => s.id === currentSessionId) || null;
  }, [currentSessionId, sessions]);

  return useMemo(() => ({
    sessions,
    currentSessionId,
    isLoading,
    createSession,
    deleteSession,
    updateSession,
    addMessageToSession,
    getCurrentSession,
    setCurrentSessionId,
  }), [sessions, currentSessionId, isLoading, createSession, deleteSession, updateSession, addMessageToSession, getCurrentSession]);
});
