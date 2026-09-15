const jwt = require("jsonwebtoken");

let ioInstance = null;

const getConversationModel = () => require("../models").Conversation;

const PARTICIPANT_CACHE_TTL_MS = 10 * 60 * 1000;
const PARTICIPANT_CACHE_MAX = 2000;
const participantCache = new Map();

const getParticipants = async (conversationId) => {
  const cached = participantCache.get(conversationId);
  if (cached && cached.expiresAt > Date.now()) return cached;

  const Conversation = getConversationModel();
  const conversation = await Conversation.findById(conversationId)
    .select("customer provider")
    .lean();
  if (!conversation) return null;

  if (participantCache.size >= PARTICIPANT_CACHE_MAX) {
    const oldestKey = participantCache.keys().next().value;
    participantCache.delete(oldestKey);
  }

  const entry = {
    customer: conversation.customer.toString(),
    provider: conversation.provider.toString(),
    expiresAt: Date.now() + PARTICIPANT_CACHE_TTL_MS,
  };
  participantCache.set(conversationId, entry);
  return entry;
};

const initSocket = (io) => {
  ioInstance = io;

  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error("Authentication token missing"));

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.id;
      socket.userRole = decoded.role;
      next();
    } catch (err) {
      next(new Error("Invalid or expired token"));
    }
  });

  io.on("connection", (socket) => {
    const room = `user_${socket.userId}`;
    socket.join(room);
    if (process.env.NODE_ENV !== "production") {
      console.log(
        `Socket connected: user ${socket.userId} (${socket.userRole}) joined ${room}`,
      );
    }

    socket.on("chat:typing", async ({ conversation_id, isTyping } = {}) => {
      if (!conversation_id) return;
      try {
        const participants = await getParticipants(String(conversation_id));
        if (!participants) return;

        const isParticipant =
          participants.customer === socket.userId ||
          participants.provider === socket.userId;
        if (!isParticipant) return;

        const otherId =
          participants.customer === socket.userId
            ? participants.provider
            : participants.customer;

        emitToUser(otherId, "chat:typing", {
          conversation_id,
          user_id: socket.userId,
          isTyping: !!isTyping,
        });
      } catch (err) {
        console.error("Error handling chat:typing event:", err);
      }
    });

    socket.on("disconnect", () => {
      if (process.env.NODE_ENV !== "production") {
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

module.exports = { initSocket, emitToUser, emitBroadcast, getParticipants };
