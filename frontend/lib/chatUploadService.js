import api from './api';

export const DEFAULT_CHUNK_SIZE = 5 * 1024 * 1024;

export const inferMediaType = (file) => {
  if (file.type?.startsWith('video/')) return 'video';
  if (file.type?.startsWith('audio/')) return 'audio';
  return 'image';
};

export const getTotalChunks = (file, chunkSize = DEFAULT_CHUNK_SIZE) =>
  Math.max(1, Math.ceil(file.size / Math.max(1, chunkSize)));

const initiateUpload = async ({ filename, totalChunks, mediaType }) => {
  const formData = new FormData();
  formData.append('filename', filename);
  formData.append('total_chunks', String(totalChunks));
  formData.append('media_type', mediaType);

  const { data } = await api.post('/chats/uploads/initiate', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  const uploadId = data?.data?.upload_id;
  if (!uploadId) throw new Error('Upload session did not return an upload_id');
  return uploadId;
};

const uploadChunk = async ({ uploadId, chunkIndex, chunkFile }) => {
  const formData = new FormData();
  formData.append('upload_id', uploadId);
  formData.append('chunk_index', String(chunkIndex));
  formData.append('chunk_file', chunkFile);

  const { data } = await api.post('/chats/uploads/chunk', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data?.data;
};

const completeUpload = async ({ uploadId }) => {
  const { data } = await api.post(`/chats/uploads/${uploadId}/complete`, new FormData(), {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  const mediaId = data?.data?.media_id;
  if (!mediaId) throw new Error('Completed upload did not return a media_id');
  return { mediaId, mediaType: data.data.media_type, url: data.data.url };
};

export const uploadChatMedia = async (file, { chunkSize = DEFAULT_CHUNK_SIZE, onProgress } = {}) => {
  const mediaType = inferMediaType(file);
  const totalChunks = getTotalChunks(file, chunkSize);

  const uploadId = await initiateUpload({ filename: file.name || 'upload', totalChunks, mediaType });

  for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex += 1) {
    const start = chunkIndex * chunkSize;
    const end = Math.min(file.size, start + chunkSize);
    const chunkFile = file.slice(start, end);

    const result = await uploadChunk({ uploadId, chunkIndex, chunkFile });
    const progress = result?.progress ?? Math.round(((chunkIndex + 1) / totalChunks) * 100);
    onProgress?.(progress);
  }

  return completeUpload({ uploadId });
};

export default { uploadChatMedia, getTotalChunks, inferMediaType };
