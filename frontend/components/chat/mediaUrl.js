const RAW_BASE =
  process.env.NEXT_PUBLIC_MEDIA_BASE_URL ||
  process.env.NEXT_PUBLIC_API_ORIGIN ||
  '';

const MEDIA_BASE = RAW_BASE.trim()
  .replace(/\/+$/, '')
  .replace(/\/api$/i, '');

const ABSOLUTE_OR_INLINE = /^(https?:|data:|blob:|\/\/)/i;

export const resolveMediaUrl = (url) => {
  if (!url || typeof url !== 'string') return null;

  const trimmed = url.trim();
  if (!trimmed) return null;

  if (ABSOLUTE_OR_INLINE.test(trimmed)) return trimmed;

  const path = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return MEDIA_BASE ? `${MEDIA_BASE}${path}` : path;
};

export const withRetryToken = (url, token) => {
  if (!url || !token) return url;
  if (url.startsWith('blob:') || url.startsWith('data:')) return url;
  return `${url}${url.includes('?') ? '&' : '?'}r=${token}`;
};

export default resolveMediaUrl;
