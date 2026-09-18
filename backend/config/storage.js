const fs = require('fs');
const path = require('path');

const LEGACY_UPLOAD_ROOT = path.join(__dirname, '..', 'uploads');

const UPLOAD_ROOT = process.env.UPLOAD_ROOT
  ? path.resolve(process.env.UPLOAD_ROOT)
  : LEGACY_UPLOAD_ROOT;

const ensureDir = (dir) => {
  fs.mkdirSync(dir, { recursive: true });
  return dir;
};

const chatMediaDir = () => ensureDir(path.join(UPLOAD_ROOT, 'chat-media'));
const chatTmpChunkDir = () => ensureDir(path.join(UPLOAD_ROOT, 'tmp-chunks'));

const EXPLICIT_MIME_BY_EXT = {
  '.webm': 'video/webm',
  '.m4a': 'audio/mp4',
  '.aac': 'audio/aac',
  '.oga': 'audio/ogg',
  '.ogg': 'audio/ogg',
  '.opus': 'audio/ogg',
  '.mov': 'video/quicktime',
  '.m4v': 'video/x-m4v',
  '.heic': 'image/heic',
  '.heif': 'image/heif',
  '.avif': 'image/avif',
};

const AUDIO_EXTS = new Set(['.webm', '.m4a', '.aac', '.oga', '.ogg', '.opus', '.mp3', '.wav']);

const MIME_BY_EXT = {
  ...EXPLICIT_MIME_BY_EXT,
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.bmp': 'image/bmp',
  '.mp4': 'video/mp4',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
};

const guessContentType = (ext, fallback = 'application/octet-stream') =>
  MIME_BY_EXT[String(ext || '').toLowerCase()] || fallback;

module.exports = {
  UPLOAD_ROOT,
  LEGACY_UPLOAD_ROOT,
  ensureDir,
  chatMediaDir,
  chatTmpChunkDir,
  EXPLICIT_MIME_BY_EXT,
  MIME_BY_EXT,
  guessContentType,
  AUDIO_EXTS,
};
