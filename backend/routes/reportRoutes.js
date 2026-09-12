const express = require('express');
const { createReport } = require('../controllers/reportController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.post('/', protect, authorize('customer', 'provider'), createReport);

module.exports = router;
