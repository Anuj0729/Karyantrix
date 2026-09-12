const jwt = require('jsonwebtoken');

let ioInstance = null;

const getConversationModel = () => require('../models').Conversation;

const initSocket = (io) => {
  ioInstance = io;

  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('Authentication token missing'));

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.id;
      socket.userRole = decoded.role;
      next();
    } catch (err) {
      next(new Error('Invalid or expired token'));
    }
  });

  io.on('connection', (socket) => {
    const room = `user_${socket.userId}`;
    socket.join(room);
    if (process.env.NODE_ENV !== 'production') {
    console.log(`Socket connected: user ${socket.userId} (${socket.userRole}) joined ${room}`);
    }

    socket.on('chat:typing', async ({ conversation_id, isTyping } = {}) => {
      if (!conversation_id) return;
      try {
        const Conversation = getConversationModel();
        const conversation = await Conversation.findById(conversation_id).select('customer provider');
        if (!conversation) return;

        const isParticipant =
          conversation.customer.toString() === socket.userId || conversation.provider.toString() === socket.userId;
        if (!isParticipant) return;

        const otherId =
          conversation.customer.toString() === socket.userId
            ? conversation.provider.toString()
            : conversation.customer.toString();

        emitToUser(otherId, 'chat:typing', { conversation_id, user_id: socket.userId, isTyping: !!isTyping });
      } catch (err) {

      }
    });

    socket.on('disconnect', () => {
      if (process.env.NODE_ENV !== 'production') {
      console.log(`Socket disconnected: user ${socket.userId}`);
      }
    });
  });
};

const emitToUser = (userId, event, payload) => {
  if (!ioInstance) return;
  ioInstance.to(`user_${userId}`).emit(event, payload);
};

const emitBroadcast = (event, payload) => {
  if (!ioInstance) return;
  ioInstance.emit(event, payload);
};

module.exports = { initSocket, emitToUser, emitBroadcast };
