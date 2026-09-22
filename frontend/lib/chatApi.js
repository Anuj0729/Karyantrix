import api from './api';

export const startConversation = async (providerId) => {
  const { data } = await api.post('/chats/start', { provider_id: providerId });
  return data.conversation;
};

export const getConversations = async () => {
  const { data } = await api.get('/chats');
  return data;
};

export const getMessages = async (conversationId, { before } = {}) => {
  const { data } = await api.get(`/chats/${conversationId}/messages`, {
    params: before ? { before } : undefined,
  });
  return data;
};

export const sendTextMessage = async (conversationId, text, { clientId, replyTo } = {}) => {
  const { data } = await api.post(`/chats/${conversationId}/messages`, {
    type: 'text',
    text,
    client_id: clientId,
    reply_to: replyTo || undefined,
  });
  return data.message;
};

export const sendMediaMessage = async (
  conversationId,
  { mediaId, mediaType, isVoiceNote, clientId, replyTo }
) => {
  const { data } = await api.post(`/chats/${conversationId}/messages`, {
    type: mediaType,
    media_id: mediaId,
    is_voice_note: mediaType === 'audio' ? !!isVoiceNote : undefined,
    client_id: clientId,
    reply_to: replyTo || undefined,
  });
  return data.message;
};

export const editMessage = async (conversationId, messageId, text) => {
  const { data } = await api.patch(`/chats/${conversationId}/messages/${messageId}`, { text });
  return data.message;
};

export const deleteMessage = async (conversationId, messageId, scope) => {
  await api.delete(`/chats/${conversationId}/messages/${messageId}`, { params: { scope } });
};

export const markConversationRead = async (conversationId) => {
  await api.patch(`/chats/${conversationId}/read`);
};

export default {
  startConversation,
  getConversations,
  getMessages,
  sendTextMessage,
  sendMediaMessage,
  editMessage,
  deleteMessage,
  markConversationRead,
};