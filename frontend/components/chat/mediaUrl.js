const API_ORIGIN = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/api\/?$/, '');
 
export const resolveMediaUrl = (url) => (!url ? null : url.startsWith('http') ? url : `${API_ORIGIN}${url}`);