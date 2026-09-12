const mongoose = require('mongoose');
const toJSONPlugin = require('../utils/toJSON');

const uploadSessionSchema = new mongoose.Schema(
  {
    uploader: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    filename: { type: String, required: true },
    media_type: { type: String, enum: ['image', 'video', 'audio'], required: true },
    context: { type: String, enum: ['requirement', 'chat'], default: 'requirement' },
    total_chunks: { type: Number, required: true, min: 1 },
    received_chunks: { type: [Number], default: [] },
    temp_dir: { type: String, required: true },
    status: { type: String, enum: ['pending', 'completed'], default: 'pending' },
    url: { type: String, default: null },
    consumed: { type: Boolean, default: false },
  },
  { timestamps: true }
);

uploadSessionSchema.index({ uploader: 1, status: 1 });

toJSONPlugin(uploadSessionSchema);

module.exports = mongoose.model('UploadSession', uploadSessionSchema);
