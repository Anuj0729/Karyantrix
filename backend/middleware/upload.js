const multer = require('multer');

const fileFilter = (req, file, cb) => {
  if (!file.mimetype.startsWith('image/') && !file.mimetype.startsWith('video/')) {
    return cb(new Error('Only image or video files are allowed'));
  }
  cb(null, true);
};

const uploadRequirementMedia = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: { fileSize: 20 * 1024 * 1024, files: 5 },
});

const imageOnlyFilter = (req, file, cb) => {
  if (!file.mimetype.startsWith('image/')) {
    return cb(new Error('Only image files are allowed'));
  }
  cb(null, true);
};

const uploadAvatar = multer({
  storage: multer.memoryStorage(),
  fileFilter: imageOnlyFilter,
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
});

const uploadChunkFile = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
});

const uploadBookingProgressMedia = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: { fileSize: 50 * 1024 * 1024, files: 10 },
});

const uploadBlogCoverImage = multer({
  storage: multer.memoryStorage(),
  fileFilter: imageOnlyFilter,
  limits: { fileSize: 8 * 1024 * 1024, files: 1 },
});

module.exports = {
  uploadRequirementMedia,
  uploadAvatar,
  uploadChunkFile,
  uploadBookingProgressMedia,
  uploadBlogCoverImage,
};
