const express = require('express');
const { getBlogs, getBlogBySlug } = require('../controllers/blogController');

const router = express.Router();

// Public — visible to everyone (customers, providers, signed-out visitors).
// Creating/updating/deleting a blog post is only possible from the admin panel
// (see routes/adminRoutes.js, protected by admin/staff auth).
router.get('/', getBlogs);
router.get('/:slug', getBlogBySlug);

module.exports = router;
