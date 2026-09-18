const { S3Client, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { Upload } = require('@aws-sdk/lib-storage');

// STORAGE_DRIVER: 'local' (default, writes to disk under UPLOAD_ROOT) or
// 's3' (writes to an S3-compatible bucket — AWS S3, Cloudflare R2,
// MinIO, Backblaze B2, etc. all speak the same S3 API).
const STORAGE_DRIVER = (process.env.STORAGE_DRIVER || 'local').toLowerCase();
const isObjectStorageEnabled = () => STORAGE_DRIVER === 's3';

const S3_BUCKET = process.env.S3_BUCKET;
const S3_REGION = process.env.S3_REGION || 'auto';
// Leave S3_ENDPOINT blank for real AWS S3. For Cloudflare R2 set it to
// https://<account_id>.r2.cloudflarestorage.com — R2 is fully S3-API
// compatible, so the same client/code works for both.
const S3_ENDPOINT = process.env.S3_ENDPOINT || '';
// R2 and most non-AWS S3-compatible services need path-style URLs
// (https://endpoint/bucket/key) instead of virtual-hosted style.
const S3_FORCE_PATH_STYLE = (process.env.S3_FORCE_PATH_STYLE || '').toLowerCase() === 'true' || Boolean(S3_ENDPOINT);
// Public base URL used to build links to uploaded files — a CDN domain,
// an R2 public bucket domain, or a CloudFront distribution. If unset, a
// best-effort default URL is derived from the bucket/endpoint/region.
const S3_PUBLIC_URL = process.env.S3_PUBLIC_URL || '';

let client = null;
const getClient = () => {
  if (!client) {
    if (!S3_BUCKET) {
      throw new Error('S3_BUCKET is not set but STORAGE_DRIVER=s3');
    }
    client = new S3Client({
      region: S3_REGION,
      endpoint: S3_ENDPOINT || undefined,
      forcePathStyle: S3_FORCE_PATH_STYLE,
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY_ID,
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
      },
    });
  }
  return client;
};

/**
 * Uploads a Buffer or Readable stream to `key` in the bucket. Uses the
 * multipart-aware Upload helper so it works for both small buffers and
 * large streamed files (e.g. assembled chunked video uploads) without
 * needing to know the content length up front.
 */
const putObject = async (key, body, contentType) => {
  const upload = new Upload({
    client: getClient(),
    params: {
      Bucket: S3_BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType || 'application/octet-stream',
    },
  });
  await upload.done();
};

const deleteObjectByKey = async (key) => {
  await getClient().send(new DeleteObjectCommand({ Bucket: S3_BUCKET, Key: key }));
};

const getPublicUrl = (key) => {
  const base =
    S3_PUBLIC_URL ||
    (S3_ENDPOINT ? `${S3_ENDPOINT.replace(/\/$/, '')}/${S3_BUCKET}` : `https://${S3_BUCKET}.s3.${S3_REGION}.amazonaws.com`);
  return `${base.replace(/\/$/, '')}/${key}`;
};

/**
 * Best-effort reverse of getPublicUrl — extracts the object key from a
 * previously stored public URL, so a replaced/removed file's old object
 * can be deleted from the bucket. Returns null if it can't be determined.
 */
const keyFromPublicUrl = (url) => {
  try {
    const parsed = new URL(url);
    let pathname = decodeURIComponent(parsed.pathname).replace(/^\/+/, '');
    if (!S3_PUBLIC_URL && S3_ENDPOINT && S3_BUCKET && pathname.startsWith(`${S3_BUCKET}/`)) {
      pathname = pathname.slice(S3_BUCKET.length + 1);
    }
    return pathname || null;
  } catch {
    return null;
  }
};

module.exports = {
  STORAGE_DRIVER,
  isObjectStorageEnabled,
  putObject,
  deleteObjectByKey,
  getPublicUrl,
  keyFromPublicUrl,
};
