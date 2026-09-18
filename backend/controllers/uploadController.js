const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const { UploadSession } = require('../models');
const { assembleChunksToStorage } = require('../services/storageService');
const { guessContentType } = require('../config/storage');

const TMP_ROOT = path.join(__dirname, '..', 'uploads', 'tmp-chunks');
fs.mkdirSync(TMP_ROOT, { recursive: true });

const extFromFilename = (filename = '') => {
  const ext = path.extname(filename).toLowerCase();
  return ext || '';
};

const chunkPath = (uploadId, chunkIndex) => path.join(TMP_ROOT, uploadId, `chunk_${chunkIndex}`);

const initiateUpload = async (req, res, next) => {
  try {
    const { filename, total_chunks, media_type } = req.body;

    if (!filename || !total_chunks || !media_type) {
      return res.status(400).json({ message: 'filename, total_chunks and media_type are required' });
    }
    if (!['image', 'video'].includes(media_type)) {
      return res.status(400).json({ message: 'media_type must be image or video' });
    }
    const totalChunksNum = Number(total_chunks);
    if (!Number.isInteger(totalChunksNum) || totalChunksNum < 1) {
      return res.status(400).json({ message: 'total_chunks must be a positive integer' });
    }

    const sessionId = new mongoose.Types.ObjectId();
    const dir = path.join(TMP_ROOT, sessionId.toString());
    fs.mkdirSync(dir, { recursive: true });

    const session = await UploadSession.create({
      _id: sessionId,
      uploader: req.user.id,
      filename,
      media_type,
      total_chunks: totalChunksNum,
      temp_dir: dir,
    });

    res.status(201).json({ success: true, data: { upload_id: session.id } });
  } catch (error) {
    next(error);
  }
};

const uploadChunk = async (req, res, next) => {
  try {
    const { upload_id, chunk_index } = req.body;
    const chunkFile = req.file;

    if (!upload_id || chunk_index === undefined || !chunkFile) {
      return res.status(400).json({ message: 'upload_id, chunk_index and chunk_file are required' });
    }

    const session = await UploadSession.findById(upload_id);
    if (!session) return res.status(404).json({ message: 'Upload session not found' });
    if (session.uploader.toString() !== req.user.id) {
      return res.status(403).json({ message: 'This upload session does not belong to you' });
    }
    if (session.status === 'completed') {
      return res.status(400).json({ message: 'This upload has already been completed' });
    }

    const chunkIndexNum = Number(chunk_index);
    if (!Number.isInteger(chunkIndexNum) || chunkIndexNum < 0 || chunkIndexNum >= session.total_chunks) {
      return res.status(400).json({ message: 'Invalid chunk_index for this upload session' });
    }

    fs.writeFileSync(chunkPath(session.id, chunkIndexNum), chunkFile.buffer);

    if (!session.received_chunks.includes(chunkIndexNum)) {
      session.received_chunks.push(chunkIndexNum);
      await session.save();
    }

    const progress = Math.round((session.received_chunks.length / session.total_chunks) * 100);
    res.json({ success: true, data: { uploaded: session.received_chunks.length, total: session.total_chunks, progress } });
  } catch (error) {
    next(error);
  }
};

const completeUpload = async (req, res, next) => {
  try {
    const session = await UploadSession.findById(req.params.uploadId);
    if (!session) return res.status(404).json({ message: 'Upload session not found' });
    if (session.uploader.toString() !== req.user.id) {
      return res.status(403).json({ message: 'This upload session does not belong to you' });
    }
    if (session.status === 'completed') {
      return res.json({ success: true, data: { media_id: session.id, url: session.url, media_type: session.media_type } });
    }
    if (session.received_chunks.length !== session.total_chunks) {
      return res.status(400).json({
        message: `Upload incomplete: received ${session.received_chunks.length}/${session.total_chunks} chunks`,
      });
    }

    const ext = extFromFilename(session.filename) || (session.media_type === 'video' ? '.mp4' : '.jpg');
    const key = `requirements/${session.id}${ext}`;
    const contentType = guessContentType(ext, `${session.media_type}/*`);

    let stored;
    try {
      stored = await assembleChunksToStorage({
        tempDir: session.temp_dir,
        totalChunks: session.total_chunks,
        key,
        contentType,
      });
    } catch (err) {
      return res.status(500).json({ message: 'The upload could not be assembled, please try again' });
    }

    fs.rmSync(session.temp_dir, { recursive: true, force: true });

    session.url = stored.url;
    session.status = 'completed';
    await session.save();

    res.json({ success: true, data: { media_id: session.id, url: session.url, media_type: session.media_type } });
  } catch (error) {
    next(error);
  }
};

module.exports = { initiateUpload, uploadChunk, completeUpload };
