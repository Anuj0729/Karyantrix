'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from './AuthContext';
import { getSocket } from '../lib/socket';
import chatApi from '../lib/chatApi';
import { uploadChatMedia } from '../lib/chatUploadService';

const ChatContext = createContext(null);

const TYPING_IDLE_MS = 2500;

const makeClientId = () =>
  `tmp_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;

const previewFor = (message) => {
  if (message.type === 'text') return message.text;
  if (message.type === 'image') return '📷 Photo';
  if (message.type === 'video') return '🎥 Video';
  if (message.type === 'audio') return message.media?.is_voice_note ? '🎤 Voice message' : '🎵 Audio';
  return '';
};

const sortByTime = (items) =>
  [...items].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

export function ChatProvider({ children }) {
  const { user } = useAuth();
  const router = useRouter();

  const [conversations, setConversations] = useState([]);
  const [conversationsLoaded, setConversationsLoaded] = useState(false);
  const [messagesByConversation, setMessagesByConversation] = useState({});
  const [typingByConversation, setTypingByConversation] = useState({});
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [panelOpen, setPanelOpen] = useState(false);

  const userIdRef = useRef(null);
  userIdRef.current = user?.id || null;
  const activeConversationRef = useRef(null);
  activeConversationRef.current = activeConversationId;
  const panelOpenRef = useRef(false);
  panelOpenRef.current = panelOpen;

  const messagesRef = useRef({});
  messagesRef.current = messagesByConversation;

  const pendingFilesRef = useRef(new Map());

  const totalUnread = conversations.reduce((sum, c) => sum + (c.unread_count || 0), 0);

  const refreshConversations = useCallback(async () => {
    if (!userIdRef.current) return;
    try {
      const { conversations: list } = await chatApi.getConversations();
      setConversations(list);
    } catch (err) {
      console.error('Failed to refresh conversations', err);
    } finally {
      setConversationsLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (user) refreshConversations();
    else {
      setConversations([]);
      setConversationsLoaded(false);
      setMessagesByConversation({});
      setActiveConversationId(null);
      setPanelOpen(false);
      pendingFilesRef.current.clear();
    }
  }, [user, refreshConversations]);

  const upsertLocalMessage = useCallback((conversationId, message, { clientId } = {}) => {
    setMessagesByConversation((prev) => {
      const thread = prev[conversationId] || { items: [], hasMore: false, loaded: false, loading: false };

      const withoutTemp = clientId
        ? thread.items.filter((m) => m.client_id !== clientId)
        : thread.items;

      if (withoutTemp.some((m) => m.id === message.id)) {
        return withoutTemp === thread.items
          ? prev
          : { ...prev, [conversationId]: { ...thread, items: withoutTemp } };
      }

      return {
        ...prev,
        [conversationId]: { ...thread, items: sortByTime([...withoutTemp, message]) },
      };
    });
  }, []);

  const patchLocalMessage = useCallback((conversationId, matchId, patch) => {
    setMessagesByConversation((prev) => {
      const thread = prev[conversationId];
      if (!thread) return prev;
      return {
        ...prev,
        [conversationId]: {
          ...thread,
          items: thread.items.map((m) =>
            m.id === matchId || m.client_id === matchId ? { ...m, ...patch } : m
          ),
        },
      };
    });
  }, []);

  const removeLocalMessage = useCallback((conversationId, matchId) => {
    setMessagesByConversation((prev) => {
      const thread = prev[conversationId];
      if (!thread) return prev;
      return {
        ...prev,
        [conversationId]: {
          ...thread,
          items: thread.items.filter((m) => m.id !== matchId && m.client_id !== matchId),
        },
      };
    });
  }, []);

  const bumpConversation = useCallback((conversationId, message) => {
    setConversations((prev) => {
      const idx = prev.findIndex((c) => c.id === conversationId);
      if (idx === -1) return prev;
      const updated = {
        ...prev[idx],
        last_message_preview: previewFor(message),
        last_message_type: message.type,
        last_message_at: message.createdAt,
        last_message_sender: message.sender,
      };
      const next = [...prev];
      next.splice(idx, 1);
      return [updated, ...next];
    });
  }, []);

  useEffect(() => {
    if (!user) return undefined;
    const token = typeof window !== 'undefined' ? localStorage.getItem('karyantrix_token') : null;
    const socket = getSocket(token);

    const upsertConversationFromMessage = (conversationId, message) => {
      setConversations((prev) => {
        const existingIndex = prev.findIndex((c) => c.id === conversationId);
        if (existingIndex === -1) {
          refreshConversations();
          return prev;
        }

        const isActiveAndOpen =
          activeConversationRef.current === conversationId &&
          (typeof document === 'undefined' || document.visibilityState !== 'hidden');
        const isOwnMessage = message.sender === userIdRef.current;
        const updated = { ...prev[existingIndex] };
        updated.last_message_preview = previewFor(message);
        updated.last_message_type = message.type;
        updated.last_message_at = message.createdAt;
        updated.last_message_sender = message.sender;
        if (!isOwnMessage && !isActiveAndOpen) {
          updated.unread_count = (updated.unread_count || 0) + 1;
        }
        const next = [...prev];
        next.splice(existingIndex, 1);
        return [updated, ...next];
      });
    };

    const onChatMessage = ({ conversation_id: conversationId, client_id: clientId, message }) => {
      upsertLocalMessage(conversationId, message, { clientId });
      if (clientId) pendingFilesRef.current.delete(clientId);
      upsertConversationFromMessage(conversationId, message);

      const threadIsOnScreen =
        activeConversationRef.current === conversationId &&
        (typeof document === 'undefined' || document.visibilityState !== 'hidden');
      if (threadIsOnScreen && message.sender !== userIdRef.current) {
        chatApi.markConversationRead(conversationId).catch(() => {});
      }
    };

    const onChatRead = ({ conversation_id: conversationId }) => {
      setMessagesByConversation((prev) => {
        const thread = prev[conversationId];
        if (!thread) return prev;
        return {
          ...prev,
          [conversationId]: {
            ...thread,
            items: thread.items.map((m) =>
              m.sender === userIdRef.current && !m.status ? { ...m, is_read: true } : m
            ),
          },
        };
      });
    };

    const onChatTyping = ({ conversation_id: conversationId, isTyping }) => {
      setTypingByConversation((prev) => ({ ...prev, [conversationId]: isTyping }));
    };

    const onChatMessageEdited = ({ conversation_id: conversationId, message }) => {
      setMessagesByConversation((prev) => {
        const thread = prev[conversationId];
        if (!thread) return prev;
        return {
          ...prev,
          [conversationId]: { ...thread, items: thread.items.map((m) => (m.id === message.id ? message : m)) },
        };
      });

      setConversations((prev) =>
        prev.map((c) =>
          c.id === conversationId && c.last_message_at === message.createdAt
            ? { ...c, last_message_preview: message.text }
            : c
        )
      );
    };

    const onChatMessageDeleted = ({ conversation_id: conversationId, message_id: messageId, scope, message }) => {
      setMessagesByConversation((prev) => {
        const thread = prev[conversationId];
        if (!thread) return prev;
        if (scope === 'everyone' && message) {
          return {
            ...prev,
            [conversationId]: { ...thread, items: thread.items.map((m) => (m.id === message.id ? message : m)) },
          };
        }
        return {
          ...prev,
          [conversationId]: { ...thread, items: thread.items.filter((m) => m.id !== messageId) },
        };
      });

      if (scope === 'everyone' && message) {
        setConversations((prev) =>
          prev.map((c) =>
            c.id === conversationId && c.last_message_at === message.createdAt
              ? { ...c, last_message_preview: 'This message was deleted' }
              : c
          )
        );
      }
    };

    socket.on('chat:message', onChatMessage);
    socket.on('chat:read', onChatRead);
    socket.on('chat:typing', onChatTyping);
    socket.on('chat:message_edited', onChatMessageEdited);
    socket.on('chat:message_deleted', onChatMessageDeleted);

    return () => {
      socket.off('chat:message', onChatMessage);
      socket.off('chat:read', onChatRead);
      socket.off('chat:typing', onChatTyping);
      socket.off('chat:message_edited', onChatMessageEdited);
      socket.off('chat:message_deleted', onChatMessageDeleted);
    };
  }, [user, refreshConversations, upsertLocalMessage]);

  const loadMessages = useCallback(async (conversationId, { before } = {}) => {
    setMessagesByConversation((prev) => ({
      ...prev,
      [conversationId]: { ...(prev[conversationId] || { items: [] }), loading: true },
    }));
    try {
      const { messages, hasMore } = await chatApi.getMessages(conversationId, { before });
      setMessagesByConversation((prev) => {
        const existing = prev[conversationId]?.items || [];

        if (before) {
          return {
            ...prev,
            [conversationId]: { items: sortByTime([...messages, ...existing]), hasMore, loaded: true, loading: false },
          };
        }

        const stillPending = existing.filter((m) => m.status === 'sending' || m.status === 'uploading');
        const serverIds = new Set(messages.map((m) => m.id));
        const merged = [...messages, ...stillPending.filter((m) => !serverIds.has(m.id))];

        return { ...prev, [conversationId]: { items: sortByTime(merged), hasMore, loaded: true, loading: false } };
      });
    } catch (err) {
      setMessagesByConversation((prev) => ({
        ...prev,
        [conversationId]: { ...(prev[conversationId] || { items: [] }), loading: false },
      }));
    }
  }, []);

  const markRead = useCallback(async (conversationId) => {
    setConversations((prev) => prev.map((c) => (c.id === conversationId ? { ...c, unread_count: 0 } : c)));
    try {
      await chatApi.markConversationRead(conversationId);
    } catch (err) {
      // non-fatal
    }
  }, []);

  const selectConversation = useCallback(
    (conversationId) => {
      if (!conversationId) return;
      setActiveConversationId(conversationId);
      const thread = messagesRef.current[conversationId];
      if (!thread?.loaded && !thread?.loading) loadMessages(conversationId);
      markRead(conversationId);
    },
    [loadMessages, markRead]
  );

  const openPanel = useCallback(
    (conversationId) => {
      setPanelOpen(true);
      if (conversationId) selectConversation(conversationId);
    },
    [selectConversation]
  );

  const closePanel = useCallback(() => setPanelOpen(false), []);
  const closeThread = useCallback(() => setActiveConversationId(null), []);

  const openChatWithProvider = useCallback(
    async (providerId) => {
      const conversation = await chatApi.startConversation(providerId);
      setConversations((prev) => {
        if (prev.some((c) => c.id === conversation.id)) return prev;
        return [conversation, ...prev];
      });
      router.push(`/messages/${conversation.id}`);
      return conversation;
    },
    [router]
  );

  const buildOptimistic = useCallback((conversationId, clientId, overrides) => ({
    id: clientId,
    client_id: clientId,
    conversation: conversationId,
    sender: userIdRef.current,
    type: 'text',
    text: null,
    media: { url: null, media_type: null, is_voice_note: false },
    is_read: false,
    is_edited: false,
    is_deleted_for_everyone: false,
    createdAt: new Date().toISOString(),
    status: 'sending',
    ...overrides,
  }), []);

  const sendText = useCallback(
    async (conversationId, text) => {
      const clientId = makeClientId();
      const optimistic = buildOptimistic(conversationId, clientId, { type: 'text', text });

      upsertLocalMessage(conversationId, optimistic);
      bumpConversation(conversationId, optimistic);

      try {
        const message = await chatApi.sendTextMessage(conversationId, text, { clientId });
        upsertLocalMessage(conversationId, message, { clientId });
        bumpConversation(conversationId, message);
        return message;
      } catch (err) {
        patchLocalMessage(conversationId, clientId, { status: 'failed' });
        throw err;
      }
    },
    [buildOptimistic, upsertLocalMessage, bumpConversation, patchLocalMessage]
  );

  const runMediaSend = useCallback(
    async (conversationId, file, { clientId, isVoiceNote, onProgress }) => {
      try {
        const { mediaId, mediaType } = await uploadChatMedia(file, {
          onProgress: (progress) => {
            patchLocalMessage(conversationId, clientId, { upload_progress: progress });
            onProgress?.(progress);
          },
        });

        patchLocalMessage(conversationId, clientId, { status: 'sending', upload_progress: 100 });

        const message = await chatApi.sendMediaMessage(conversationId, {
          mediaId,
          mediaType,
          isVoiceNote,
          clientId,
        });

        upsertLocalMessage(conversationId, message, { clientId });
        bumpConversation(conversationId, message);
        pendingFilesRef.current.delete(clientId);
        return message;
      } catch (err) {
        patchLocalMessage(conversationId, clientId, { status: 'failed' });
        throw err;
      }
    },
    [patchLocalMessage, upsertLocalMessage, bumpConversation]
  );

  const sendMedia = useCallback(
    async (conversationId, file, { onProgress, isVoiceNote = false } = {}) => {
      const clientId = makeClientId();
      const mediaType = file.type?.startsWith('video/')
        ? 'video'
        : file.type?.startsWith('audio/')
          ? 'audio'
          : 'image';

      const localPreview = typeof URL !== 'undefined' && URL.createObjectURL ? URL.createObjectURL(file) : null;

      const optimistic = buildOptimistic(conversationId, clientId, {
        type: mediaType,
        media: { url: localPreview, media_type: mediaType, is_voice_note: isVoiceNote },
        status: 'uploading',
        upload_progress: 0,
      });

      pendingFilesRef.current.set(clientId, { file, isVoiceNote, conversationId });
      upsertLocalMessage(conversationId, optimistic);
      bumpConversation(conversationId, optimistic);

      return runMediaSend(conversationId, file, { clientId, isVoiceNote, onProgress });
    },
    [buildOptimistic, upsertLocalMessage, bumpConversation, runMediaSend]
  );

  const retryMessage = useCallback(
    async (conversationId, matchId) => {
      const thread = messagesRef.current[conversationId];
      const target = thread?.items.find((m) => m.id === matchId || m.client_id === matchId);
      if (!target) return null;

      const clientId = target.client_id || matchId;

      if (target.type === 'text') {
        patchLocalMessage(conversationId, clientId, { status: 'sending' });
        try {
          const message = await chatApi.sendTextMessage(conversationId, target.text, { clientId });
          upsertLocalMessage(conversationId, message, { clientId });
          bumpConversation(conversationId, message);
          return message;
        } catch (err) {
          patchLocalMessage(conversationId, clientId, { status: 'failed' });
          throw err;
        }
      }

      const pending = pendingFilesRef.current.get(clientId);
      if (!pending) {
        const error = new Error('The original file is no longer available - please attach it again.');
        error.isMissingFile = true;
        throw error;
      }

      patchLocalMessage(conversationId, clientId, { status: 'uploading', upload_progress: 0 });
      return runMediaSend(conversationId, pending.file, {
        clientId,
        isVoiceNote: pending.isVoiceNote,
      });
    },
    [patchLocalMessage, upsertLocalMessage, bumpConversation, runMediaSend]
  );

  const discardMessage = useCallback(
    (conversationId, matchId) => {
      pendingFilesRef.current.delete(matchId);
      removeLocalMessage(conversationId, matchId);
    },
    [removeLocalMessage]
  );

  const editMessage = useCallback(async (conversationId, messageId, text) => {
    const message = await chatApi.editMessage(conversationId, messageId, text);
    setMessagesByConversation((prev) => {
      const thread = prev[conversationId];
      if (!thread) return prev;
      return {
        ...prev,
        [conversationId]: { ...thread, items: thread.items.map((m) => (m.id === message.id ? message : m)) },
      };
    });
    return message;
  }, []);

  const deleteMessage = useCallback(
    async (conversationId, messageId, scope) => {
      const thread = messagesRef.current[conversationId];
      const local = thread?.items.find((m) => m.id === messageId);
      if (local?.status) {
        discardMessage(conversationId, messageId);
        return;
      }

      await chatApi.deleteMessage(conversationId, messageId, scope);
      setMessagesByConversation((prev) => {
        const current = prev[conversationId];
        if (!current) return prev;
        if (scope === 'me') {
          return { ...prev, [conversationId]: { ...current, items: current.items.filter((m) => m.id !== messageId) } };
        }
        return {
          ...prev,
          [conversationId]: {
            ...current,
            items: current.items.map((m) =>
              m.id === messageId
                ? { ...m, is_deleted_for_everyone: true, text: null, media: { url: null, media_type: null } }
                : m
            ),
          },
        };
      });
    },
    [discardMessage]
  );

  const typingStateRef = useRef({});

  const emitTyping = useCallback((conversationId, isTyping) => {
    if (!userIdRef.current) return;
    const token = typeof window !== 'undefined' ? localStorage.getItem('karyantrix_token') : null;
    const socket = getSocket(token);
    socket.emit('chat:typing', { conversation_id: conversationId, isTyping });
  }, []);

  const setTyping = useCallback(
    (conversationId, isTyping) => {
      if (!conversationId || !userIdRef.current) return;
      const store = typingStateRef.current;
      const entry = store[conversationId] || { active: false, timer: null };

      if (isTyping) {
        clearTimeout(entry.timer);
        entry.timer = setTimeout(() => setTyping(conversationId, false), TYPING_IDLE_MS);
        if (!entry.active) {
          entry.active = true;
          emitTyping(conversationId, true);
        }
      } else {
        clearTimeout(entry.timer);
        entry.timer = null;
        if (entry.active) {
          entry.active = false;
          emitTyping(conversationId, false);
        }
      }

      store[conversationId] = entry;
    },
    [emitTyping]
  );

  useEffect(() => () => {
    Object.values(typingStateRef.current).forEach((entry) => clearTimeout(entry?.timer));
  }, []);

  const value = useMemo(
    () => ({
      conversations,
      conversationsLoaded,
      messagesByConversation,
      typingByConversation,
      activeConversationId,
      panelOpen,
      totalUnread,
      refreshConversations,
      loadMessages,
      selectConversation,
      openPanel,
      closePanel,
      closeThread,
      openChatWithProvider,
      sendText,
      sendMedia,
      retryMessage,
      discardMessage,
      editMessage,
      deleteMessage,
      markRead,
      setTyping,
    }),
    [
      conversations,
      conversationsLoaded,
      messagesByConversation,
      typingByConversation,
      activeConversationId,
      panelOpen,
      totalUnread,
      refreshConversations,
      loadMessages,
      selectConversation,
      openPanel,
      closePanel,
      closeThread,
      openChatWithProvider,
      sendText,
      sendMedia,
      retryMessage,
      discardMessage,
      editMessage,
      deleteMessage,
      markRead,
      setTyping,
    ]
  );

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export const useChat = () => useContext(ChatContext);
