const { Conversation, Message, User, UploadSession, Notification } = require('../models');
const { emitToUser } = require('../sockets/socketHandler');

const PREVIEW_TEXT = { image: '📷 Photo', video: '🎥 Video' };
const DELETED_PREVIEW = 'This message was deleted';

const DELETE_FOR_EVERYONE_WINDOW_MS = 60 * 60 * 1000;

const buildPreview = (message) => {
  if (message.is_deleted_for_everyone) return DELETED_PREVIEW;
  if (message.type === 'text') return message.text;
  if (message.type === 'audio') return message.media?.is_voice_note ? '🎤 Voice message' : '🎵 Audio';
  return PREVIEW_TEXT[message.type] || '';
};

const notifyNewMessage = async (recipientId, senderName, message) => {
  const bodies = {
    text: message.text,
    image: '📷 Photo',
    video: '🎥 Video',
    audio: message.media?.is_voice_note ? '🎤 Voice message' : '🎵 Audio message',
  };
  const notification = await Notification.create({
    user: recipientId,
    title: senderName || 'New message',
    message: (bodies[message.type] || 'New message').slice(0, 500),
    type: 'chat',
  });
  emitToUser(recipientId, 'notification', notification);
};

const toConversationSummary = (conversation, viewerId) => {
  const isCustomer = conversation.customer.id === viewerId;
  const otherParticipant = isCustomer ? conversation.provider : conversation.customer;
  const unreadCount = isCustomer ? conversation.customer_unread_count : conversation.provider_unread_count;

  return {
    id: conversation.id,
    other_participant: otherParticipant,
    my_role_in_chat: isCustomer ? 'customer' : 'provider',
    last_message_preview: conversation.last_message_preview,
    last_message_type: conversation.last_message_type,
    last_message_at: conversation.last_message_at,
    last_message_sender: conversation.last_message_sender,
    unread_count: unreadCount,
    createdAt: conversation.createdAt,
  };
};

const getOtherParticipantId = (conversation, viewerId) =>
  (conversation.customer.toString() === viewerId ? conversation.provider : conversation.customer).toString();

const startConversation = async (req, res, next) => {
  try {
    const { provider_id } = req.body;
    if (!provider_id) return res.status(400).json({ message: 'provider_id is required' });
    if (provider_id === req.user.id) {
      return res.status(400).json({ message: 'You cannot start a conversation with yourself' });
    }

    const provider = await User.findOne({ _id: provider_id, role: 'provider', is_active: true });
    if (!provider) return res.status(404).json({ message: 'Provider not found' });

    let conversation = await Conversation.findOne({ customer: req.user.id, provider: provider_id });
    if (!conversation) {
      conversation = await Conversation.create({ customer: req.user.id, provider: provider_id });
    }

    const populated = await Conversation.findById(conversation.id).populate(
      'customer provider',
      'id name avatar_url role'
    );

    res.status(201).json({ success: true, conversation: toConversationSummary(populated, req.user.id) });
  } catch (error) {
    next(error);
  }
};

const getMyConversations = async (req, res, next) => {
  try {
    const filter = req.user.role === 'provider' ? { provider: req.user.id } : { customer: req.user.id };

    const conversations = await Conversation.find(filter)
      .sort({ last_message_at: -1, createdAt: -1 })
      .populate('customer provider', 'id name avatar_url role');

    const summaries = conversations.map((c) => toConversationSummary(c, req.user.id));
    const totalUnread = summaries.reduce((sum, c) => sum + (c.unread_count || 0), 0);

    res.json({ conversations: summaries, totalUnread });
  } catch (error) {
    next(error);
  }
};

const loadOwnedConversation = async (req) => {
  const conversation = await Conversation.findById(req.params.conversationId);
  if (!conversation) {
    const err = new Error('Conversation not found');
    err.statusCode = 404;
    throw err;
  }
  const isParticipant =
    conversation.customer.toString() === req.user.id || conversation.provider.toString() === req.user.id;
  if (!isParticipant) {
    const err = new Error('You are not part of this conversation');
    err.statusCode = 403;
    throw err;
  }
  return conversation;
};

const getMessages = async (req, res, next) => {
  try {
    const conversation = await loadOwnedConversation(req);

    const limit = Math.min(Number(req.query.limit) || 30, 50);

    const query = { conversation: conversation.id, deleted_for: { $ne: req.user.id } };
    if (req.query.before) query.createdAt = { $lt: new Date(req.query.before) };

    const messages = await Message.find(query).sort({ createdAt: -1 }).limit(limit);

    res.json({ messages: messages.reverse(), hasMore: messages.length === limit });
  } catch (error) {
    next(error);
  }
};

const sendMessage = async (req, res, next) => {
  try {
    const conversation = await loadOwnedConversation(req);
    const { type = 'text', text, media_id, is_voice_note, client_id } = req.body;

    if (!['text', 'image', 'video', 'audio'].includes(type)) {
      return res.status(400).json({ message: 'type must be text, image, video or audio' });
    }

    let messageData = { conversation: conversation.id, sender: req.user.id, type };

    if (type === 'text') {
      if (!text || !text.trim()) return res.status(400).json({ message: 'text is required for a text message' });
      messageData.text = text.trim();
    } else {
      if (!media_id) return res.status(400).json({ message: 'media_id is required for image/video/audio messages' });

      const session = await UploadSession.findById(media_id);
      if (!session || session.context !== 'chat' || session.status !== 'completed') {
        return res.status(400).json({ message: 'media_id does not reference a completed chat upload' });
      }
      if (session.uploader.toString() !== req.user.id) {
        return res.status(403).json({ message: 'This upload does not belong to you' });
      }
      if (session.consumed) {
        return res.status(400).json({ message: 'This upload has already been sent as a message' });
      }
      if (session.media_type !== type) {
        return res.status(400).json({ message: `This upload is a ${session.media_type}, not a ${type}` });
      }

      messageData.media = {
        url: session.url,
        media_type: session.media_type,
        upload_id: session.id,
        is_voice_note: type === 'audio' && (is_voice_note === true || is_voice_note === 'true'),
      };
      session.consumed = true;
      await session.save();
    }

    const message = await Message.create(messageData);

    const otherParticipantId = getOtherParticipantId(conversation, req.user.id);
    const isCustomerSender = conversation.customer.toString() === req.user.id;

    const payload = { conversation_id: conversation.id, client_id: client_id || null, message };

    emitToUser(otherParticipantId, 'chat:message', payload);
    emitToUser(req.user.id, 'chat:message', payload);

    res.status(201).json({ success: true, message, client_id: client_id || null });

    const unreadField = isCustomerSender ? 'provider_unread_count' : 'customer_unread_count';
    Conversation.updateOne(
      { _id: conversation.id },
      {
        $set: {
          last_message_preview: buildPreview(message),
          last_message_type: message.type,
          last_message_at: message.createdAt,
          last_message_sender: req.user.id,
        },
     
        $inc: { [unreadField]: 1 },
      }
    ).catch(() => {});

    notifyNewMessage(otherParticipantId, req.user.name, message).catch(() => {});
  } catch (error) {
    if (res.headersSent) return;
    next(error);
  }
};

const loadOwnedMessage = async (conversation, messageId) => {
  const message = await Message.findById(messageId).select('+deleted_for');
  if (!message || message.conversation.toString() !== conversation.id) {
    const err = new Error('Message not found');
    err.statusCode = 404;
    throw err;
  }
  return message;
};

const refreshPreviewIfLatest = async (conversation, message) => {
  const latest = await Message.findOne({ conversation: conversation.id }).sort({ createdAt: -1 });
  if (latest && latest.id === message.id) {
    await Conversation.updateOne(
      { _id: conversation.id },
      { $set: { last_message_preview: buildPreview(message), last_message_type: message.type } }
    );
  }
};

const editMessage = async (req, res, next) => {
  try {
    const conversation = await loadOwnedConversation(req);
    const message = await loadOwnedMessage(conversation, req.params.messageId);

    if (message.sender.toString() !== req.user.id) {
      return res.status(403).json({ message: 'You can only edit your own messages' });
    }
    if (message.type !== 'text') {
      return res.status(400).json({ message: 'Only text messages can be edited' });
    }
    if (message.is_deleted_for_everyone) {
      return res.status(400).json({ message: 'This message has been deleted' });
    }

    const { text } = req.body;
    if (!text || !text.trim()) return res.status(400).json({ message: 'text is required' });

    message.text = text.trim();
    message.is_edited = true;
    message.edited_at = new Date();
    await message.save();

    const otherParticipantId = getOtherParticipantId(conversation, req.user.id);
    const payload = { conversation_id: conversation.id, message };

    emitToUser(otherParticipantId, 'chat:message_edited', payload);
    emitToUser(req.user.id, 'chat:message_edited', payload);

    res.json({ success: true, message });

    refreshPreviewIfLatest(conversation, message).catch(() => {});
  } catch (error) {
    if (res.headersSent) return;
    next(error);
  }
};

const deleteMessage = async (req, res, next) => {
  try {
    const conversation = await loadOwnedConversation(req);
    const message = await loadOwnedMessage(conversation, req.params.messageId);
    const scope = req.query.scope;

    if (!['me', 'everyone'].includes(scope)) {
      return res.status(400).json({ message: 'scope must be "me" or "everyone"' });
    }

    if (scope === 'everyone') {
      if (message.sender.toString() !== req.user.id) {
        return res.status(403).json({ message: 'You can only delete your own messages for everyone' });
      }
      if (message.is_deleted_for_everyone) {
        return res.status(400).json({ message: 'Message has already been deleted' });
      }
      if (Date.now() - message.createdAt.getTime() > DELETE_FOR_EVERYONE_WINDOW_MS) {
        return res
          .status(400)
          .json({ message: 'Delete for everyone is only available within 1 hour of sending' });
      }

      const removedUploadId = message.media?.upload_id || null;

      message.is_deleted_for_everyone = true;
      message.deleted_at = new Date();
      message.text = null;
      message.media = { url: null, media_type: null, upload_id: null };
      await message.save();

      await refreshPreviewIfLatest(conversation, message);

      const otherParticipantId = getOtherParticipantId(conversation, req.user.id);
      const payload = { conversation_id: conversation.id, message };
      emitToUser(otherParticipantId, 'chat:message_deleted', payload);
      emitToUser(req.user.id, 'chat:message_deleted', payload);

      if (removedUploadId) {
        UploadSession.updateOne({ _id: removedUploadId }, { $set: { consumed: true } }).catch(() => {});
      }
    } else {
      const alreadyDeletedForMe = message.deleted_for.some((id) => id.toString() === req.user.id);
      if (!alreadyDeletedForMe) {
        message.deleted_for.push(req.user.id);
        await message.save();
      }

      emitToUser(req.user.id, 'chat:message_deleted', {
        conversation_id: conversation.id,
        message_id: message.id,
        scope: 'me',
      });
    }

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};

const markConversationRead = async (req, res, next) => {
  try {
    const conversation = await loadOwnedConversation(req);
    const isCustomer = conversation.customer.toString() === req.user.id;
    const unreadField = isCustomer ? 'customer_unread_count' : 'provider_unread_count';

    const otherParticipantId = getOtherParticipantId(conversation, req.user.id);

    res.json({ success: true });

    await Promise.all([
      Conversation.updateOne({ _id: conversation.id }, { $set: { [unreadField]: 0 } }),
      Message.updateMany(
        { conversation: conversation.id, sender: { $ne: req.user.id }, is_read: false },
        { $set: { is_read: true } }
      ),
    ]).catch(() => {});

    emitToUser(otherParticipantId, 'chat:read', { conversation_id: conversation.id, read_by: req.user.id });
  } catch (error) {
    if (res.headersSent) return;
    next(error);
  }
};

module.exports = {
  startConversation,
  getMyConversations,
  getMessages,
  sendMessage,
  editMessage,
  deleteMessage,
  markConversationRead,
};
