const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const { UploadSession } = require('../models');
const { chatMediaDir, chatTmpChunkDir } = require('../config/storage');

const TMP_ROOT = chatTmpChunkDir();
const FINAL_DIR = chatMediaDir();

const ALLOWED_EXTS = {
  image: ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp', '.avif', '.heic', '.heif'],
  video: ['.mp4', '.webm', '.mov', '.m4v', '.ogv'],
  audio: ['.webm', '.m4a', '.mp3', '.wav', '.ogg', '.oga', '.opus', '.aac'],
};

const DEFAULT_EXT = { image: '.jpg', video: '.mp4', audio: '.webm' };

const safeExtFor = (mediaType, filename = '') => {
  const ext = path.extname(String(filename || '')).toLowerCase();
  const allowed = ALLOWED_EXTS[mediaType] || [];
  return allowed.includes(ext) ? ext : DEFAULT_EXT[mediaType] || '.bin';
};

const chunkPath = (uploadId, chunkIndex) => path.join(TMP_ROOT, uploadId, `chunk_${chunkIndex}`);

const initiateChatUpload = async (req, res, next) => {
  try {
    const { filename, total_chunks, media_type } = req.body;

    if (!filename || !total_chunks || !media_type) {
      return res.status(400).json({ message: 'filename, total_chunks and media_type are required' });
    }
    if (!['image', 'video', 'audio'].includes(media_type)) {
      return res.status(400).json({ message: 'media_type must be image, video or audio' });
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
      context: 'chat',
    });

    res.status(201).json({ success: true, data: { upload_id: session.id } });
  } catch (error) {
    next(error);
  }
};

const uploadChatChunk = async (req, res, next) => {
  try {
    const { upload_id, chunk_index } = req.body;
    const chunkFile = req.file;

    if (!upload_id || chunk_index === undefined || !chunkFile) {
      return res.status(400).json({ message: 'upload_id, chunk_index and chunk_file are required' });
    }

    const session = await UploadSession.findById(upload_id);
    if (!session || session.context !== 'chat') return res.status(404).json({ message: 'Upload session not found' });
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

    fs.mkdirSync(path.join(TMP_ROOT, session.id), { recursive: true });
    await fs.promises.writeFile(chunkPath(session.id, chunkIndexNum), chunkFile.buffer);

    const updated = await UploadSession.findByIdAndUpdate(
      session.id,
      { $addToSet: { received_chunks: chunkIndexNum } },
      { new: true }
    );

    const received = updated?.received_chunks.length || 0;
    const progress = Math.round((received / session.total_chunks) * 100);
    res.json({ success: true, data: { uploaded: received, total: session.total_chunks, progress } });
  } catch (error) {
    next(error);
  }
};

const completeChatUpload = async (req, res, next) => {
  try {
    const session = await UploadSession.findById(req.params.uploadId);
    if (!session || session.context !== 'chat') return res.status(404).json({ message: 'Upload session not found' });
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

    const ext = safeExtFor(session.media_type, session.filename);
    const finalName = `${session.id}${ext}`;
    const finalPath = path.join(FINAL_DIR, finalName);

    fs.mkdirSync(FINAL_DIR, { recursive: true });

    await new Promise((resolve, reject) => {
      const writeStream = fs.createWriteStream(finalPath);
      writeStream.on('error', reject);
      writeStream.on('finish', resolve);

      let index = 0;
      const writeNext = () => {
        while (index < session.total_chunks) {
          const current = chunkPath(session.id, index);
          index += 1;
          const buf = fs.readFileSync(current);
          if (!writeStream.write(buf)) {
            writeStream.once('drain', writeNext);
            return;
          }
        }
        writeStream.end();
      };

      try {
        writeNext();
      } catch (err) {
        writeStream.destroy();
        reject(err);
      }
    });

    const stats = await fs.promises.stat(finalPath).catch(() => null);
    if (!stats || stats.size === 0) {
      return res.status(500).json({ message: 'The upload could not be assembled, please try again' });
    }

    fs.rmSync(session.temp_dir, { recursive: true, force: true });

    session.url = `/uploads/chat-media/${finalName}`;
    session.status = 'completed';
    await session.save();

    res.json({ success: true, data: { media_id: session.id, url: session.url, media_type: session.media_type } });
  } catch (error) {
    next(error);
  }
};

module.exports = { initiateChatUpload, uploadChatChunk, completeChatUpload };
