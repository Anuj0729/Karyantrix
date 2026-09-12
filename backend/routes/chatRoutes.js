const express = require('express');
const multer = require('multer');
const {
  startConversation,
  getMyConversations,
  getMessages,
  sendMessage,
  editMessage,
  deleteMessage,
  markConversationRead,
} = require('../controllers/chatController');
const { initiateChatUpload, uploadChatChunk, completeChatUpload } = require('../controllers/chatUploadController');
const { protect, authorize } = require('../middleware/auth');
const { uploadChunkFile } = require('../middleware/upload');

const router = express.Router();

const parseFields = multer().none();

router.post('/start', protect, authorize('customer'), parseFields, startConversation);

router.get('/', protect, getMyConversations);
router.get('/:conversationId/messages', protect, getMessages);
router.post('/:conversationId/messages', protect, parseFields, sendMessage);
router.patch('/:conversationId/messages/:messageId', protect, parseFields, editMessage);
router.delete('/:conversationId/messages/:messageId', protect, deleteMessage);
router.patch('/:conversationId/read', protect, markConversationRead);

router.post('/uploads/initiate', protect, authorize('customer', 'provider'), parseFields, initiateChatUpload);
router.post(
  '/uploads/chunk',
  protect,
  authorize('customer', 'provider'),
  uploadChunkFile.single('chunk_file'),
  uploadChatChunk
);
router.post('/uploads/:uploadId/complete', protect, authorize('customer', 'provider'), parseFields, completeChatUpload);

module.exports = router;
