'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from './AuthContext';
import { getSocket } from '../lib/socket';
import chatApi from '../lib/chatApi';
import { uploadChatMedia } from '../lib/chatUploadService';

const ChatContext = createContext(null);

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

  const totalUnread = conversations.reduce((sum, c) => sum + (c.unread_count || 0), 0);

  const refreshConversations = useCallback(async () => {
    if (!userIdRef.current) return;
    try {
      const { conversations: list } = await chatApi.getConversations();
      setConversations(list);
    } catch (err) {

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
    }
  }, [user, refreshConversations]);

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
        updated.last_message_preview =
          message.type === 'text'
            ? message.text
            : message.type === 'image'
              ? '📷 Photo'
              : message.type === 'audio'
                ? (message.media?.is_voice_note ? '🎤 Voice message' : '🎵 Audio')
                : '🎥 Video';
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

    const onChatMessage = ({ conversation_id: conversationId, message }) => {
      setMessagesByConversation((prev) => {
        const thread = prev[conversationId] || { items: [], hasMore: false, loaded: false, loading: false };
        if (thread.items.some((m) => m.id === message.id)) return prev;
        return { ...prev, [conversationId]: { ...thread, items: [...thread.items, message] } };
      });
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
            items: thread.items.map((m) => (m.sender === userIdRef.current ? { ...m, is_read: true } : m)),
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
  }, [user, refreshConversations]);

  const loadMessages = useCallback(async (conversationId, { before } = {}) => {
    setMessagesByConversation((prev) => ({
      ...prev,
      [conversationId]: { ...(prev[conversationId] || { items: [] }), loading: true },
    }));
    try {
      const { messages, hasMore } = await chatApi.getMessages(conversationId, { before });
      setMessagesByConversation((prev) => {
        const existing = prev[conversationId]?.items || [];

        const items = before ? [...messages, ...existing] : messages;
        return { ...prev, [conversationId]: { items, hasMore, loaded: true, loading: false } };
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

    }
  }, []);

  const selectConversation = useCallback(
    (conversationId) => {
      setActiveConversationId(conversationId);
      const thread = messagesByConversation[conversationId];
      if (!thread?.loaded) loadMessages(conversationId);
      markRead(conversationId);
    },
    [messagesByConversation, loadMessages, markRead]
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

  const sendText = useCallback(async (conversationId, text) => {
    const message = await chatApi.sendTextMessage(conversationId, text);
    setMessagesByConversation((prev) => {
      const thread = prev[conversationId] || { items: [], hasMore: false, loaded: true };
      if (thread.items.some((m) => m.id === message.id)) return prev;
      return { ...prev, [conversationId]: { ...thread, items: [...thread.items, message] } };
    });
    setConversations((prev) => {
      const idx = prev.findIndex((c) => c.id === conversationId);
      if (idx === -1) return prev;
      const updated = { ...prev[idx], last_message_preview: text, last_message_type: 'text', last_message_at: message.createdAt, last_message_sender: message.sender };
      const next = [...prev];
      next.splice(idx, 1);
      return [updated, ...next];
    });
    return message;
  }, []);

  const sendMedia = useCallback(async (conversationId, file, { onProgress, isVoiceNote = false } = {}) => {
    const { mediaId, mediaType } = await uploadChatMedia(file, { onProgress });
    const message = await chatApi.sendMediaMessage(conversationId, { mediaId, mediaType, isVoiceNote });
    setMessagesByConversation((prev) => {
      const thread = prev[conversationId] || { items: [], hasMore: false, loaded: true };
      if (thread.items.some((m) => m.id === message.id)) return prev;
      return { ...prev, [conversationId]: { ...thread, items: [...thread.items, message] } };
    });
    setConversations((prev) => {
      const idx = prev.findIndex((c) => c.id === conversationId);
      if (idx === -1) return prev;
      const preview =
        mediaType === 'video' ? '🎥 Video' : mediaType === 'audio' ? (isVoiceNote ? '🎤 Voice message' : '🎵 Audio') : '📷 Photo';
      const updated = { ...prev[idx], last_message_preview: preview, last_message_type: mediaType, last_message_at: message.createdAt, last_message_sender: message.sender };
      const next = [...prev];
      next.splice(idx, 1);
      return [updated, ...next];
    });
    return message;
  }, []);

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

  const deleteMessage = useCallback(async (conversationId, messageId, scope) => {
    await chatApi.deleteMessage(conversationId, messageId, scope);
    setMessagesByConversation((prev) => {
      const thread = prev[conversationId];
      if (!thread) return prev;
      if (scope === 'me') {
        return { ...prev, [conversationId]: { ...thread, items: thread.items.filter((m) => m.id !== messageId) } };
      }
      return {
        ...prev,
        [conversationId]: {
          ...thread,
          items: thread.items.map((m) =>
            m.id === messageId
              ? { ...m, is_deleted_for_everyone: true, text: null, media: { url: null, media_type: null } }
              : m
          ),
        },
      };
    });
  }, []);

  const setTyping = useCallback((conversationId, isTyping) => {
    if (!userIdRef.current) return;
    const token = typeof window !== 'undefined' ? localStorage.getItem('karyantrix_token') : null;
    const socket = getSocket(token);
    socket.emit('chat:typing', { conversation_id: conversationId, isTyping });
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
      editMessage,
      deleteMessage,
      markRead,
      setTyping,
    ]
  );

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export const useChat = () => useContext(ChatContext);
