const fs = require('fs');
const path = require('path');
const multer = require('multer');

const uploadDir = path.join(__dirname, '..', 'uploads', 'requirements');
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, unique);
  },
});

const fileFilter = (req, file, cb) => {
  if (!file.mimetype.startsWith('image/') && !file.mimetype.startsWith('video/')) {
    return cb(new Error('Only image or video files are allowed'));
  }
  cb(null, true);
};

const uploadRequirementMedia = multer({
  storage,
  fileFilter,
  limits: { fileSize: 20 * 1024 * 1024, files: 5 },
});

const avatarDir = path.join(__dirname, '..', 'uploads', 'avatars');
fs.mkdirSync(avatarDir, { recursive: true });

const avatarStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, avatarDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const unique = `${req.user.id}-${Date.now()}${ext}`;
    cb(null, unique);
  },
});

const imageOnlyFilter = (req, file, cb) => {
  if (!file.mimetype.startsWith('image/')) {
    return cb(new Error('Only image files are allowed'));
  }
  cb(null, true);
};

const uploadAvatar = multer({
  storage: avatarStorage,
  fileFilter: imageOnlyFilter,
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
});

const uploadChunkFile = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
});

const progressDir = path.join(__dirname, '..', 'uploads', 'booking-progress');
fs.mkdirSync(progressDir, { recursive: true });

const progressStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, progressDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const unique = `${req.params.id}-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, unique);
  },
});

const uploadBookingProgressMedia = multer({
  storage: progressStorage,
  fileFilter,
  limits: { fileSize: 50 * 1024 * 1024, files: 10 },
});

module.exports = { uploadRequirementMedia, uploadAvatar, uploadChunkFile, uploadBookingProgressMedia };
