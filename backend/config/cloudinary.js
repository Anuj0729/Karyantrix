const cloudinary = require('cloudinary').v2;

// STORAGE_DRIVER must be 'cloudinary' (see config/objectStorage.js for the
// other supported values: 'local', 's3') for any of this to be used. Media
// is uploaded straight to your Cloudinary account and its permanent
// secure_url is what gets stored on the document (Requirement/Message/
// User.avatar_url/etc.) - so it keeps working after a redeploy or restart,
// unlike files written to the container's local disk.
const STORAGE_DRIVER = (process.env.STORAGE_DRIVER || 'local').toLowerCase();
const isCloudinaryEnabled = () => STORAGE_DRIVER === 'cloudinary';

const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY;
const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET;
// Optional: group all uploads from this app under one Cloudinary folder
// (handy if the same Cloudinary account is shared with other projects).
const CLOUDINARY_FOLDER = (process.env.CLOUDINARY_FOLDER || '').replace(/^\/+|\/+$/g, '');

let configured = false;
const ensureConfigured = () => {
  if (configured) return;
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
    throw new Error(
      'CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET must be set when STORAGE_DRIVER=cloudinary'
    );
  }
  cloudinary.config({
    cloud_name: CLOUDINARY_CLOUD_NAME,
    api_key: CLOUDINARY_API_KEY,
    api_secret: CLOUDINARY_API_SECRET,
    secure: true,
  });
  configured = true;
};

// Cloudinary buckets uploads by resource_type: images go under 'image',
// video AND audio both go under 'video' (Cloudinary has no separate audio
// type), everything else falls back to 'raw'.
const resourceTypeFor = (contentType = '') => {
  if (contentType.startsWith('image/')) return 'image';
  if (contentType.startsWith('video/') || contentType.startsWith('audio/')) return 'video';
  return 'raw';
};

// Our storage "key" (e.g. "avatars/64f...-1699.jpg") includes an extension,
// but Cloudinary derives the delivered file's extension from the actual
// uploaded content and appends it itself - so we strip it from the
// public_id to avoid a doubled-up ".jpg.jpg" style name.
const publicIdFromKey = (key) => {
  const withoutExt = key.replace(/\.[^./]+$/, '');
  return CLOUDINARY_FOLDER ? `${CLOUDINARY_FOLDER}/${withoutExt}` : withoutExt;
};

const runUploadStream = (key, contentType) => {
  ensureConfigured();
  const resourceType = resourceTypeFor(contentType);
  let resolveFn;
  let rejectFn;
  const done = new Promise((resolve, reject) => {
    resolveFn = resolve;
    rejectFn = reject;
  });
  const uploadStream = cloudinary.uploader.upload_stream(
    {
      public_id: publicIdFromKey(key),
      resource_type: resourceType,
      overwrite: true,
    },
    (error, result) => (error ? rejectFn(error) : resolveFn(result))
  );
  return { uploadStream, done };
};

// Uploads a single in-memory Buffer (avatars, booking-progress photos,
// etc.) to Cloudinary and resolves with the Cloudinary result (we care
// mainly about result.secure_url).
const uploadBuffer = (key, buffer, contentType) => {
  const { uploadStream, done } = runUploadStream(key, contentType);
  uploadStream.end(buffer);
  return done;
};

// Pipes a Readable stream (used to assemble a chunked upload session
// straight from its temp chunk files, without holding the whole file in
// memory) into Cloudinary and resolves with the Cloudinary result.
const uploadReadStream = (key, readStream, contentType) => {
  const { uploadStream, done } = runUploadStream(key, contentType);
  readStream.on('error', (err) => uploadStream.destroy(err));
  readStream.pipe(uploadStream);
  return done;
};

const deleteByPublicId = async (publicId, resourceType = 'image') => {
  ensureConfigured();
  await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
};

// Best-effort reverse of a stored Cloudinary secure_url -> { publicId,
// resourceType }, so a replaced/removed file's old asset can be deleted
// from the Cloudinary account. URL shape:
// https://res.cloudinary.com/<cloud_name>/<resource_type>/upload/[v<version>/]<public_id>.<ext>
const parseCloudinaryUrl = (url) => {
  try {
    const parsed = new URL(url);
    if (!/(^|\.)cloudinary\.com$/i.test(parsed.hostname)) return null;
    const parts = parsed.pathname.replace(/^\/+/, '').split('/');
    const uploadIdx = parts.indexOf('upload');
    if (uploadIdx < 2) return null;
    const resourceType = parts[uploadIdx - 1]; // image | video | raw
    let rest = parts.slice(uploadIdx + 1);
    if (rest[0] && /^v\d+$/.test(rest[0])) rest = rest.slice(1);
    if (rest.length === 0) return null;
    rest[rest.length - 1] = rest[rest.length - 1].replace(/\.[^./]+$/, '');
    const publicId = decodeURIComponent(rest.join('/'));
    return publicId ? { publicId, resourceType } : null;
  } catch {
    return null;
  }
};

module.exports = {
  STORAGE_DRIVER,
  isCloudinaryEnabled,
  uploadBuffer,
  uploadReadStream,
  deleteByPublicId,
  parseCloudinaryUrl,
};
