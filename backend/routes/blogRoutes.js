const express = require('express');
const { getBlogs, getBlogBySlug } = require('../controllers/blogController');
const {
  getSuggestions,
  createSuggestion,
  updateSuggestion,
  deleteSuggestion,
  createReply,
  updateReply,
  deleteReply
} = require('../controllers/blogSuggestionController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.get('/', getBlogs);
router.get('/:slug', getBlogBySlug);

router.get('/:slug/suggestions', getSuggestions);
router.post('/:slug/suggestions', protect, createSuggestion);
router.put('/:slug/suggestions/:id', protect, updateSuggestion);
router.delete('/:slug/suggestions/:id', protect, deleteSuggestion);

router.post('/:slug/suggestions/:id/replies', protect, authorize('admin', 'staff'), createReply);
router.put('/:slug/suggestions/:id/replies/:replyId', protect, updateReply);
router.delete('/:slug/suggestions/:id/replies/:replyId', protect, deleteReply);

module.exports = router;
