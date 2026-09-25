const { Blog, User, Notification } = require('../models');
const { saveBuffer, deleteByUrl } = require('../services/storageService');
const { emitToUser } = require('../sockets/socketHandler');

const PUBLIC_FIELDS = 'title slug excerpt cover_image tags author published_at createdAt updatedAt';

// Notify every other user (customer, provider, admin & staff alike) the moment a post
// goes live — except the admin/staff member who actually published it.
const notifyBlogPublished = async (blog, actorId) => {
  try {
    const recipients = await User.find({ _id: { $ne: actorId } }).select('_id');
    if (recipients.length === 0) return;

    const title = 'New blog post published';
    const message = blog.title;

    const docs = recipients.map((r) => ({
      user: r.id,
      title,
      message,
      type: 'blog',
      related_blog: blog.id,
    }));
    const created = await Notification.insertMany(docs);

    created.forEach((notification) => {
      emitToUser(notification.user, 'notification', {
        ...notification.toJSON(),
        related_blog: { id: blog.id, slug: blog.slug, title: blog.title },
      });
    });
  } catch (error) {
    // Notification delivery must never block the actual publish action.
    // eslint-disable-next-line no-console
    console.error('Failed to send blog-publish notifications:', error);
  }
};

const slugify = (text = '') =>
  text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

// A post scheduled for the future is invisible to everyone until its scheduled_at
// time arrives. This flips any post whose time has come over to 'published' —
// called at the top of every read endpoint so it goes live automatically, with
// no separate cron process required.
const publishDueScheduledBlogs = async () => {
  const due = await Blog.find({ status: 'scheduled', scheduled_at: { $lte: new Date() } });
  if (due.length === 0) return;

  const now = new Date();
  await Blog.updateMany(
    { _id: { $in: due.map((b) => b._id) } },
    { $set: { status: 'published', published_at: now, scheduled_at: null } }
  );

  due.forEach((blog) => {
    blog.status = 'published';
    blog.published_at = now;
    blog.scheduled_at = null;
    notifyBlogPublished(blog, blog.author);
  });
};

const ensureUniqueSlug = async (baseSlug, ignoreId = null) => {
  let slug = baseSlug || `post-${Date.now()}`;
  let suffix = 1;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const where = { slug };
    if (ignoreId) where._id = { $ne: ignoreId };
    // eslint-disable-next-line no-await-in-loop
    const existing = await Blog.findOne(where).select('_id');
    if (!existing) return slug;
    suffix += 1;
    slug = `${baseSlug}-${suffix}`;
  }
};

/* -------------------------------------------------------------------------
 * PUBLIC — readable by everyone (customers, providers, guests)
 * ---------------------------------------------------------------------- */

// GET /api/blogs?tag=&page=&limit=
const getBlogs = async (req, res, next) => {
  try {
    await publishDueScheduledBlogs();
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 12));
    const where = { status: 'published' };
    if (req.query.tag) where.tags = req.query.tag;

    const [blogs, total] = await Promise.all([
      Blog.find(where)
        .select(PUBLIC_FIELDS)
        .populate('author', 'name avatar_url')
        .sort({ published_at: -1, createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Blog.countDocuments(where),
    ]);

    res.json({ blogs, page, pages: Math.max(1, Math.ceil(total / limit)), total });
  } catch (error) {
    next(error);
  }
};

// GET /api/blogs/:slug
const getBlogBySlug = async (req, res, next) => {
  try {
    await publishDueScheduledBlogs();
    const blog = await Blog.findOne({ slug: req.params.slug, status: 'published' }).populate(
      'author',
      'name avatar_url'
    );
    if (!blog) return res.status(404).json({ message: 'Blog post not found' });
    res.json({ blog });
  } catch (error) {
    next(error);
  }
};

/* -------------------------------------------------------------------------
 * ADMIN / STAFF ONLY — full CRUD, mounted under /api/admin/blogs and
 * already protected by `protect, authorize('admin', 'staff')` in adminRoutes.js
 * ---------------------------------------------------------------------- */

// GET /api/admin/blogs
const getAllBlogsAdmin = async (req, res, next) => {
  try {
    await publishDueScheduledBlogs();
    const blogs = await Blog.find({}).populate('author', 'name avatar_url role').sort({ createdAt: -1 });
    res.json({ blogs });
  } catch (error) {
    next(error);
  }
};

// GET /api/admin/blogs/:id
const getBlogByIdAdmin = async (req, res, next) => {
  try {
    await publishDueScheduledBlogs();
    const blog = await Blog.findById(req.params.id).populate('author', 'name avatar_url role');
    if (!blog) return res.status(404).json({ message: 'Blog post not found' });
    res.json({ blog });
  } catch (error) {
    next(error);
  }
};

// POST /api/admin/blogs
// Works out the status/published_at/scheduled_at trio from what the client sent.
// status is one of 'draft' | 'scheduled' | 'published' (no separate manual toggle —
// the create/edit form derives it from "Publish now" vs "Schedule for later").
// A scheduled_at that has already arrived is treated as "publish now".
const resolveStatusFields = (status, scheduledAtInput) => {
  if (status === 'published') {
    return { status: 'published', published_at: new Date(), scheduled_at: null };
  }
  if (status === 'scheduled' && scheduledAtInput) {
    const when = new Date(scheduledAtInput);
    if (!Number.isNaN(when.getTime()) && when.getTime() > Date.now()) {
      return { status: 'scheduled', published_at: null, scheduled_at: when };
    }
    // The chosen time is invalid or already in the past — publish right away.
    return { status: 'published', published_at: new Date(), scheduled_at: null };
  }
  return { status: 'draft', published_at: null, scheduled_at: null };
};

const createBlog = async (req, res, next) => {
  try {
    const { title, excerpt, content, cover_image, tags, status, scheduled_at } = req.body;
    if (!title || !content) {
      return res.status(400).json({ message: 'Title and content are required' });
    }

    const baseSlug = slugify(req.body.slug || title);
    const slug = await ensureUniqueSlug(baseSlug);
    const resolved = resolveStatusFields(status, scheduled_at);

    const blog = await Blog.create({
      title,
      slug,
      excerpt: excerpt || null,
      content,
      cover_image: cover_image || null,
      tags: Array.isArray(tags) ? tags.filter(Boolean) : [],
      author: req.user.id,
      ...resolved,
    });

    res.status(201).json({ message: 'Blog post created', blog });

    if (resolved.status === 'published') notifyBlogPublished(blog, req.user.id);
  } catch (error) {
    next(error);
  }
};

// PUT /api/admin/blogs/:id
const updateBlog = async (req, res, next) => {
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog) return res.status(404).json({ message: 'Blog post not found' });

    const { title, excerpt, content, cover_image, tags, status, scheduled_at } = req.body;

    if (title !== undefined) blog.title = title;
    if (req.body.slug !== undefined && slugify(req.body.slug) !== blog.slug) {
      blog.slug = await ensureUniqueSlug(slugify(req.body.slug) || slugify(title || blog.title), blog.id);
    }
    if (excerpt !== undefined) blog.excerpt = excerpt || null;
    if (content !== undefined) blog.content = content;
    if (cover_image !== undefined) {
      if (blog.cover_image && blog.cover_image !== cover_image) await deleteByUrl(blog.cover_image);
      blog.cover_image = cover_image || null;
    }
    if (tags !== undefined) blog.tags = Array.isArray(tags) ? tags.filter(Boolean) : [];

    const wasPublished = blog.status === 'published';
    if (status !== undefined) {
      const resolved = resolveStatusFields(status, scheduled_at);
      // Keep the original publish date if it was already published before this edit.
      if (resolved.status === 'published' && wasPublished) resolved.published_at = blog.published_at;
      blog.status = resolved.status;
      blog.published_at = resolved.published_at;
      blog.scheduled_at = resolved.scheduled_at;
    }

    await blog.save();
    res.json({ message: 'Blog post updated', blog });

    if (!wasPublished && blog.status === 'published') notifyBlogPublished(blog, req.user.id);
  } catch (error) {
    next(error);
  }
};

// DELETE /api/admin/blogs/:id
const deleteBlog = async (req, res, next) => {
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog) return res.status(404).json({ message: 'Blog post not found' });

    if (blog.cover_image) await deleteByUrl(blog.cover_image);
    await blog.deleteOne();

    res.json({ message: 'Blog post deleted' });
  } catch (error) {
    next(error);
  }
};

// POST /api/admin/blogs/upload-cover  (multipart, field name "cover")
const uploadBlogCover = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No image file was uploaded' });

    const ext = (req.file.originalname.match(/\.[a-zA-Z0-9]+$/) || ['.jpg'])[0].toLowerCase();
    const key = `blogs/${req.user.id}-${Date.now()}${ext}`;
    const { url } = await saveBuffer({ key, buffer: req.file.buffer, contentType: req.file.mimetype });

    res.status(201).json({ url });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getBlogs,
  getBlogBySlug,
  getAllBlogsAdmin,
  getBlogByIdAdmin,
  createBlog,
  updateBlog,
  deleteBlog,
  uploadBlogCover,
};
