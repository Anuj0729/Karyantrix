const { Blog, BlogSuggestion } = require('../models');
const { emitToBlogRoom } = require('../sockets/socketHandler');

const USER_FIELDS = 'name avatar_url role';

// GET /api/blogs/:slug/suggestions
// Public — returns every reader suggestion left on a published post (with any
// admin/staff replies attached), newest first, plus the total count (rendered
// as a badge in the sidebar).
const getSuggestions = async (req, res, next) => {
  try {
    const blog = await Blog.findOne({ slug: req.params.slug, status: 'published' }).select('_id');
    if (!blog) return res.status(404).json({ message: 'Blog post not found' });

    const suggestions = await BlogSuggestion.find({ blog: blog.id })
      .populate('user', USER_FIELDS)
      .populate('replies.user', USER_FIELDS)
      .sort({ createdAt: -1 });

    res.json({ suggestions, count: suggestions.length });
  } catch (error) {
    next(error);
  }
};

// POST /api/blogs/:slug/suggestions  (auth required)
// body: { message }
const createSuggestion = async (req, res, next) => {
  try {
    const blog = await Blog.findOne({ slug: req.params.slug, status: 'published' }).select('_id');
    if (!blog) return res.status(404).json({ message: 'Blog post not found' });

    const message = (req.body.message || '').trim();
    if (!message) return res.status(400).json({ message: 'Suggestion message is required' });

    const suggestion = await BlogSuggestion.create({
      blog: blog.id,
      user: req.user.id,
      message,
    });
    await suggestion.populate('user', USER_FIELDS);

    const count = await BlogSuggestion.countDocuments({ blog: blog.id });

    res.status(201).json({ message: 'Suggestion submitted', suggestion, count });

    emitToBlogRoom(req.params.slug, 'blog:suggestion:new', {
      slug: req.params.slug,
      suggestion,
      count,
    });
  } catch (error) {
    next(error);
  }
};

// PUT /api/blogs/:slug/suggestions/:id  (auth required — original author only)
// body: { message }
const updateSuggestion = async (req, res, next) => {
  try {
    const blog = await Blog.findOne({ slug: req.params.slug }).select('_id');
    if (!blog) return res.status(404).json({ message: 'Blog post not found' });

    const suggestion = await BlogSuggestion.findOne({ _id: req.params.id, blog: blog.id });
    if (!suggestion) return res.status(404).json({ message: 'Suggestion not found' });

    if (suggestion.user.toString() !== req.user.id) {
      return res.status(403).json({ message: 'You can only edit your own suggestion' });
    }

    const message = (req.body.message || '').trim();
    if (!message) return res.status(400).json({ message: 'Suggestion message is required' });

    suggestion.message = message;
    suggestion.edited = true;
    await suggestion.save();
    await suggestion.populate('user', USER_FIELDS);
    await suggestion.populate('replies.user', USER_FIELDS);

    res.json({ message: 'Suggestion updated', suggestion });

    emitToBlogRoom(req.params.slug, 'blog:suggestion:update', {
      slug: req.params.slug,
      suggestion,
    });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/blogs/:slug/suggestions/:id
// auth required — original author only
const deleteSuggestion = async (req, res, next) => {
  try {
    const blog = await Blog.findOne({ slug: req.params.slug }).select('_id');
    if (!blog) {
      return res.status(404).json({ message: 'Blog post not found' });
    }

    const suggestion = await BlogSuggestion.findOne({
      _id: req.params.id,
      blog: blog.id,
    });

    if (!suggestion) {
      return res.status(404).json({ message: 'Suggestion not found' });
    }

    if (suggestion.user.toString() !== req.user.id) {
      return res.status(403).json({
        message: 'You can only delete your own suggestion',
      });
    }

    await BlogSuggestion.deleteOne({ _id: suggestion._id });

    const count = await BlogSuggestion.countDocuments({
      blog: blog.id,
    });

    res.json({
      message: 'Suggestion deleted',
      suggestionId: suggestion.id,
      count,
    });

    emitToBlogRoom(req.params.slug, 'blog:suggestion:delete', {
      slug: req.params.slug,
      suggestionId: suggestion.id,
      count,
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/blogs/:slug/suggestions/:id/replies  (auth required — admin/staff only, enforced in route)
// body: { message }
const createReply = async (req, res, next) => {
  try {
    const blog = await Blog.findOne({ slug: req.params.slug }).select('_id');
    if (!blog) return res.status(404).json({ message: 'Blog post not found' });

    const suggestion = await BlogSuggestion.findOne({ _id: req.params.id, blog: blog.id });
    if (!suggestion) return res.status(404).json({ message: 'Suggestion not found' });

    const message = (req.body.message || '').trim();
    if (!message) return res.status(400).json({ message: 'Reply message is required' });

    suggestion.replies.push({ user: req.user.id, message });
    await suggestion.save();
    await suggestion.populate('replies.user', USER_FIELDS);

    const reply = suggestion.replies[suggestion.replies.length - 1];

    res.status(201).json({ message: 'Reply submitted', reply, suggestionId: suggestion.id });

    emitToBlogRoom(req.params.slug, 'blog:suggestion:reply', {
      slug: req.params.slug,
      suggestionId: suggestion.id,
      reply,
    });
  } catch (error) {
    next(error);
  }
};

// PUT /api/blogs/:slug/suggestions/:id/replies/:replyId  (auth required — reply author only)
// body: { message }
const updateReply = async (req, res, next) => {
  try {
    const blog = await Blog.findOne({ slug: req.params.slug }).select('_id');
    if (!blog) return res.status(404).json({ message: 'Blog post not found' });

    const suggestion = await BlogSuggestion.findOne({ _id: req.params.id, blog: blog.id });
    if (!suggestion) return res.status(404).json({ message: 'Suggestion not found' });

    const reply = suggestion.replies.id(req.params.replyId);
    if (!reply) return res.status(404).json({ message: 'Reply not found' });

    if (reply.user.toString() !== req.user.id) {
      return res.status(403).json({ message: 'You can only edit your own reply' });
    }

    const message = (req.body.message || '').trim();
    if (!message) return res.status(400).json({ message: 'Reply message is required' });

    reply.message = message;
    reply.edited = true;
    await suggestion.save();
    await suggestion.populate('replies.user', USER_FIELDS);

    const updatedReply = suggestion.replies.id(req.params.replyId);

    res.json({ message: 'Reply updated', reply: updatedReply, suggestionId: suggestion.id });

    emitToBlogRoom(req.params.slug, 'blog:suggestion:reply:update', {
      slug: req.params.slug,
      suggestionId: suggestion.id,
      reply: updatedReply,
    });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/blogs/:slug/suggestions/:id/replies/:replyId
// auth required — reply author only
const deleteReply = async (req, res, next) => {
  try {
    const blog = await Blog.findOne({ slug: req.params.slug }).select('_id');
    if (!blog) {
      return res.status(404).json({ message: 'Blog post not found' });
    }

    const suggestion = await BlogSuggestion.findOne({
      _id: req.params.id,
      blog: blog.id,
    });

    if (!suggestion) {
      return res.status(404).json({ message: 'Suggestion not found' });
    }

    const reply = suggestion.replies.id(req.params.replyId);

    if (!reply) {
      return res.status(404).json({ message: 'Reply not found' });
    }

    if (reply.user.toString() !== req.user.id) {
      return res.status(403).json({
        message: 'You can only delete your own reply',
      });
    }

    const replyId = reply._id.toString();

    reply.deleteOne();
    await suggestion.save();

    res.json({
      message: 'Reply deleted',
      suggestionId: suggestion.id,
      replyId,
    });

    emitToBlogRoom(req.params.slug, 'blog:suggestion:reply:delete', {
      slug: req.params.slug,
      suggestionId: suggestion.id,
      replyId,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getSuggestions,
  createSuggestion,
  updateSuggestion,
  deleteSuggestion,
  createReply,
  updateReply,
  deleteReply
};
