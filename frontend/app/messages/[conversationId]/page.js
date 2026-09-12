'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useChat } from '../../../context/ChatContext';
import ChatThread from '../../../components/chat/ChatThread';

export default function MessageThreadPage() {
  const { conversationId } = useParams();
  const router = useRouter();
  const { conversations, conversationsLoaded, selectConversation, closeThread } = useChat();

  useEffect(() => {
    if (conversationId) selectConversation(conversationId);
    return () => closeThread();
  }, [conversationId, selectConversation, closeThread]);

  useEffect(() => {
    if (conversationsLoaded && conversations.length > 0 && !conversations.some((c) => c.id === conversationId)) {
      router.replace('/messages');
    }
  }, [conversationsLoaded, conversations, conversationId, router]);

  return <ChatThread conversationId={conversationId} backHref="/messages" />;
}
