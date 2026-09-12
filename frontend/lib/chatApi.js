import api from './api';

export const startConversation = async (providerId) => {
  const formData = new FormData();
  formData.append('provider_id', providerId);
  const { data } = await api.post('/chats/start', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
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

export const sendTextMessage = async (conversationId, text) => {
  const formData = new FormData();
  formData.append('type', 'text');
  formData.append('text', text);
  const { data } = await api.post(`/chats/${conversationId}/messages`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data.message;
};

export const sendMediaMessage = async (conversationId, { mediaId, mediaType, isVoiceNote }) => {
  const formData = new FormData();
  formData.append('type', mediaType);
  formData.append('media_id', mediaId);

  if (mediaType === 'audio') formData.append('is_voice_note', isVoiceNote ? 'true' : 'false');
  const { data } = await api.post(`/chats/${conversationId}/messages`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data.message;
};

export const editMessage = async (conversationId, messageId, text) => {
  const formData = new FormData();
  formData.append('text', text);
  const { data } = await api.patch(`/chats/${conversationId}/messages/${messageId}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
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
