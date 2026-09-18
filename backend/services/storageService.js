const fs = require('fs');
const path = require('path');
const { Readable } = require('stream');
const { UPLOAD_ROOT, ensureDir } = require('../config/storage');
const {
  isObjectStorageEnabled,
  putObject,
  deleteObjectByKey,
  getPublicUrl,
  keyFromPublicUrl,
} = require('../config/objectStorage');

const STORAGE_DRIVER = isObjectStorageEnabled() ? 's3' : 'local';

const writeLocalBuffer = async (key, buffer) => {
  const destPath = path.join(UPLOAD_ROOT, key);
  ensureDir(path.dirname(destPath));
  await fs.promises.writeFile(destPath, buffer);
  return `/uploads/${key}`;
};

/**
 * Stores a single in-memory buffer (avatars, booking-progress photos, etc.)
 * under `key` (e.g. "avatars/64f...-169900.jpg") using whichever driver is
 * configured (STORAGE_DRIVER=local|s3), and returns its public URL.
 */
const saveBuffer = async ({ key, buffer, contentType }) => {
  if (isObjectStorageEnabled()) {
    await putObject(key, buffer, contentType);
    return { url: getPublicUrl(key), key, driver: 's3' };
  }
  const url = await writeLocalBuffer(key, buffer);
  return { url, key, driver: 'local' };
};

/**
 * Builds a Readable stream that reads chunk_0, chunk_1, ... chunk_{N-1}
 * from `dir` in order. Used to assemble a chunked upload session into one
 * final file without ever holding the whole file in memory at once.
 */
const chunkedReadStream = (dir, totalChunks) => {
  let index = 0;
  return new Readable({
    read() {
      if (index >= totalChunks) {
        this.push(null);
        return;
      }
      const chunkFile = path.join(dir, `chunk_${index}`);
      index += 1;
      fs.readFile(chunkFile, (err, buf) => {
        if (err) {
          this.destroy(err);
          return;
        }
        this.push(buf);
      });
    },
  });
};

/**
 * Streams all chunks of a completed chunked-upload session directly into
 * final storage (S3/R2 via multipart upload, or local disk) under `key`,
 * then returns the public URL. Caller still owns removing the local temp
 * chunk directory afterwards (chunks always stage on local disk briefly,
 * regardless of the final storage driver).
 */
const assembleChunksToStorage = async ({ tempDir, totalChunks, key, contentType }) => {
  const source = chunkedReadStream(tempDir, totalChunks);

  if (isObjectStorageEnabled()) {
    await putObject(key, source, contentType);
    return { url: getPublicUrl(key), key, driver: 's3' };
  }

  const destPath = path.join(UPLOAD_ROOT, key);
  ensureDir(path.dirname(destPath));
  await new Promise((resolve, reject) => {
    const writeStream = fs.createWriteStream(destPath);
    source.on('error', reject);
    writeStream.on('error', reject);
    writeStream.on('finish', resolve);
    source.pipe(writeStream);
  });

  const stats = await fs.promises.stat(destPath).catch(() => null);
  if (!stats || stats.size === 0) {
    throw new Error('The upload could not be assembled, please try again');
  }

  return { url: `/uploads/${key}`, key, driver: 'local' };
};

/**
 * Best-effort delete of a previously stored file, given the public URL
 * that was saved on the document (e.g. user.avatar_url). Never throws —
 * failures are logged and swallowed since this is just cleanup.
 */
const deleteByUrl = async (url) => {
  if (!url) return;
  try {
    if (isObjectStorageEnabled()) {
      const key = keyFromPublicUrl(url);
      if (key) await deleteObjectByKey(key);
      return;
    }
    if (!url.startsWith('/uploads/')) return;
    const localPath = path.join(UPLOAD_ROOT, url.slice('/uploads/'.length));
    await fs.promises.unlink(localPath).catch(() => {});
  } catch (err) {
    console.error(`Failed to delete stored file "${url}":`, err.message);
  }
};

module.exports = { STORAGE_DRIVER, saveBuffer, assembleChunksToStorage, deleteByUrl };
