import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { ChatSession, ChatMessage } from '@/types/speech';
import { useAuth } from './auth-context';

export const [ChatSessionsProvider, useChatSessions] = createContextHook(() => {
  const { user } = useAuth();
  const storageKey = useMemo(() => `chatSessions:${user?.id ?? 'guest'}`, [user?.id]);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const sessionsRef = useRef<ChatSession[]>([]);
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
            const parsed = JSON.parse(stored) as ChatSession[];
            sessionsRef.current = parsed;
            setSessions(parsed);
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

    sessionsRef.current = [];
    setSessions([]);
    setCurrentSessionId(null);
    loadSessions();
  }, [storageKey]);

  useEffect(() => {
    sessionsRef.current = sessions;
  }, [sessions]);

  const saveSessions = useCallback(async (
    updater: ChatSession[] | ((prev: ChatSession[]) => ChatSession[])
  ) => {
    try {
      const nextSessions =
        typeof updater === 'function'
          ? (updater as (prev: ChatSession[]) => ChatSession[])(sessionsRef.current)
          : updater;

      sessionsRef.current = nextSessions;
      setSessions(nextSessions);
      await AsyncStorage.setItem(storageKey, JSON.stringify(nextSessions));
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
    
    await saveSessions(prev => [...prev, newSession]);
    setCurrentSessionId(newSession.id);
    return newSession;
  }, [saveSessions]);

  const deleteSession = useCallback(async (sessionId: string) => {
    await saveSessions(prev => prev.filter(s => s.id !== sessionId));
    if (currentSessionId === sessionId) {
      setCurrentSessionId(null);
    }
  }, [currentSessionId, saveSessions]);

  const updateSession = useCallback(async (sessionId: string, updates: Partial<ChatSession>) => {
    await saveSessions(prev => prev.map(s => {
      if (s.id === sessionId) {
        return {
          ...s,
          ...updates,
          updatedAt: Date.now(),
        };
      }
      return s;
    }));
  }, [saveSessions]);

  const addMessageToSession = useCallback(async (sessionId: string, message: ChatMessage) => {
    await saveSessions(prev => prev.map(s => {
      if (s.id === sessionId) {
        return {
          ...s,
          messages: [...s.messages, message],
          updatedAt: Date.now(),
        };
      }
      return s;
    }));
  }, [saveSessions]);

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
