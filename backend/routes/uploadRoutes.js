const express = require('express');
const multer = require('multer');
const { initiateUpload, uploadChunk, completeUpload } = require('../controllers/uploadController');
const { protect, authorize } = require('../middleware/auth');
const { uploadChunkFile } = require('../middleware/upload');

const router = express.Router();

const parseFields = multer().none();
const parseThumbnail = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } }).single('thumbnail');

router.post('/initiate', protect, authorize('customer', 'provider'), parseFields, initiateUpload);
router.post('/chunk', protect, authorize('customer', 'provider'), uploadChunkFile.single('chunk_file'), uploadChunk);
router.post('/:uploadId/complete', protect, authorize('customer', 'provider'), parseThumbnail, completeUpload);

module.exports = router;
