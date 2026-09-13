import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from 'react';
import {
  ChatSession,
  ChatMessage,
} from '@/types/speech';
import { useAuth } from './auth-context';
import {
  loadRemoteLibraryField,
  mergeRecordsById,
  saveRemoteLibraryField,
} from '@/lib/user-library-sync';

function parseSessions(
  stored: string | null
): ChatSession[] {
  if (!stored) return [];

  try {
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.warn(
      'Unable to parse local chat sessions:',
      error
    );
    return [];
  }
}

export const [
  ChatSessionsProvider,
  useChatSessions,
] = createContextHook(() => {
  const { user } = useAuth();

  const storageKey = useMemo(
    () => `chatSessions:${user?.id ?? 'guest'}`,
    [user?.id]
  );

  const [sessions, setSessions] =
    useState<ChatSession[]>([]);

  const sessionsRef =
    useRef<ChatSession[]>([]);

  const [
    currentSessionId,
    setCurrentSessionId,
  ] = useState<string | null>(null);

  const [isLoading, setIsLoading] =
    useState(true);

  useEffect(() => {
    let cancelled = false;

    const loadSessions = async () => {
      sessionsRef.current = [];
      setSessions([]);
      setCurrentSessionId(null);
      setIsLoading(true);

      const stored =
        await AsyncStorage.getItem(storageKey);

      const localSessions =
        parseSessions(stored);

      if (!cancelled) {
        sessionsRef.current = localSessions;
        setSessions(localSessions);
        setIsLoading(false);
      }

      if (!user?.id) return;

      try {
        const remoteSessions =
          await loadRemoteLibraryField<
            ChatSession[]
          >(
            user.id,
            'chat_sessions',
            []
          );

        const merged = mergeRecordsById(
          localSessions,
          Array.isArray(remoteSessions)
            ? remoteSessions
            : []
        ).sort(
          (a, b) => b.updatedAt - a.updatedAt
        );

        await AsyncStorage.setItem(
          storageKey,
          JSON.stringify(merged)
        );

        if (!cancelled) {
          sessionsRef.current = merged;
          setSessions(merged);
        }

        if (
          JSON.stringify(merged) !==
          JSON.stringify(remoteSessions)
        ) {
          await saveRemoteLibraryField(
            user.id,
            'chat_sessions',
            merged
          );
        }
      } catch (error) {
        console.warn(
          'Chat cloud sync unavailable; using local cache:',
          error
        );
      }
    };

    void loadSessions();

    return () => {
      cancelled = true;
    };
  }, [storageKey, user?.id]);

  useEffect(() => {
    sessionsRef.current = sessions;
  }, [sessions]);

  const saveSessions = useCallback(
    async (
      updater:
        | ChatSession[]
        | ((
            previous: ChatSession[]
          ) => ChatSession[])
    ) => {
      const nextSessions =
        typeof updater === 'function'
          ? updater(sessionsRef.current)
          : updater;

      sessionsRef.current = nextSessions;
      setSessions(nextSessions);

      await AsyncStorage.setItem(
        storageKey,
        JSON.stringify(nextSessions)
      );

      if (!user?.id) return;

      try {
        await saveRemoteLibraryField(
          user.id,
          'chat_sessions',
          nextSessions
        );
      } catch (error) {
        console.warn(
          'Chats saved locally; cloud sync will retry on next login:',
          error
        );
      }
    },
    [storageKey, user?.id]
  );

  const createSession = useCallback(
    async (
      title: string,
      initialMessages: ChatMessage[] = []
    ) => {
      const now = Date.now();

      const newSession: ChatSession = {
        id: `${user?.id ?? 'guest'}-${now}`,
        title,
        messages: initialMessages,
        createdAt: now,
        updatedAt: now,
      };

      await saveSessions(previous => [
        ...previous,
        newSession,
      ]);

      setCurrentSessionId(newSession.id);
      return newSession;
    },
    [saveSessions, user?.id]
  );

  const deleteSession = useCallback(
    async (sessionId: string) => {
      await saveSessions(previous =>
        previous.filter(
          session =>
            session.id !== sessionId
        )
      );

      if (currentSessionId === sessionId) {
        setCurrentSessionId(null);
      }
    },
    [currentSessionId, saveSessions]
  );

  const updateSession = useCallback(
    async (
      sessionId: string,
      updates: Partial<ChatSession>
    ) => {
      await saveSessions(previous =>
        previous.map(session =>
          session.id === sessionId
            ? {
                ...session,
                ...updates,
                id: session.id,
                createdAt: session.createdAt,
                updatedAt: Date.now(),
              }
            : session
        )
      );
    },
    [saveSessions]
  );

  const addMessageToSession = useCallback(
    async (
      sessionId: string,
      message: ChatMessage
    ) => {
      await saveSessions(previous =>
        previous.map(session =>
          session.id === sessionId
            ? {
                ...session,
                messages: [
                  ...session.messages,
                  message,
                ],
                updatedAt: Date.now(),
              }
            : session
        )
      );
    },
    [saveSessions]
  );

  const getCurrentSession = useCallback(
    () => {
      if (!currentSessionId) return null;

      return sessions.find(
        session =>
          session.id === currentSessionId
      ) ?? null;
    },
    [currentSessionId, sessions]
  );

  return useMemo(
    () => ({
      sessions,
      currentSessionId,
      isLoading,
      createSession,
      deleteSession,
      updateSession,
      addMessageToSession,
      getCurrentSession,
      setCurrentSessionId,
    }),
    [
      sessions,
      currentSessionId,
      isLoading,
      createSession,
      deleteSession,
      updateSession,
      addMessageToSession,
      getCurrentSession,
    ]
  );
});
