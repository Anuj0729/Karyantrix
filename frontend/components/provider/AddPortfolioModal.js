'use client';

import { useEffect, useMemo, useState } from 'react';
import { Image as ImageIcon, Info, UploadCloud, X } from 'lucide-react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { uploadMediaDetailed } from '../../lib/uploadService';

const inputClass =
  'w-full rounded-lg border border-ink-200 px-3 py-2 text-sm text-ink-900 placeholder:text-ink-300 transition focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100';

export default function AddPortfolioModal({ isOpen, onClose, onSave, saving }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  const previewUrls = useMemo(() => files.map((f) => URL.createObjectURL(f)), [files]);
  useEffect(() => () => previewUrls.forEach((u) => URL.revokeObjectURL(u)), [previewUrls]);

  const handleFiles = (e) => {
    const picked = Array.from(e.target.files || []).filter((f) => f.type?.startsWith('image/'));
    if (picked.length) {
      setUploadError('');
      setFiles((prev) => [...prev, ...picked].slice(0, 6));
    }
    e.target.value = '';
  };

  const removeFile = (index) => setFiles((prev) => prev.filter((_, i) => i !== index));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || files.length === 0 || uploading) return;

    setUploading(true);
    setUploadError('');
    try {
      const uploaded = [];
      for (const file of files) {
        const { url } = await uploadMediaDetailed(file);
        uploaded.push(url);
      }
      const entries = uploaded.map((image_url) => ({ image_url, title, description }));
      const ok = await onSave(entries);
      if (ok !== false) {
        setTitle('');
        setDescription('');
        setFiles([]);
      }
    } catch (err) {
      setUploadError(err.response?.data?.message || 'Could not upload one of your photos. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="grid w-full grid-cols-1 md:grid-cols-[1.3fr_1fr]">
        <div className="p-5">
          <h2 className="text-base font-bold text-ink-900">Add Portfolio Work</h2>
          <p className="mb-4 mt-0.5 text-xs text-ink-500">
            Showcase your best projects to potential customers on Karyantrix.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wide text-ink-500">
                Project title
              </label>
              <input
                type="text"
                required
                className={`${inputClass} mt-1.5`}
                placeholder="e.g. Modern Living Room Rewiring"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wide text-ink-500">
                Description
              </label>
              <textarea
                rows={3}
                className={`${inputClass} mt-1.5 resize-none`}
                placeholder="Describe the scope of work, challenges overcome, and the final result…"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wide text-ink-500">
                Upload work photos
              </label>
              <label className="mt-1.5 flex h-28 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-ink-200 bg-ink-50/40 transition-colors hover:border-brand-300">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-50">
                  <UploadCloud className="h-4 w-4 text-brand-600" />
                </span>
                <span className="text-xs font-semibold text-ink-900">Click or drag images here</span>
                <span className="text-[11px] text-ink-400">Supports JPG, PNG, WEBP (Max 10MB per file)</span>
                <input type="file" accept="image/*" multiple className="hidden" onChange={handleFiles} disabled={uploading} />
              </label>
              {uploadError && <p className="mt-1.5 text-xs text-red-600">{uploadError}</p>}
            </div>
          </form>
        </div>

        <div className="flex flex-col gap-3 border-t border-ink-100 bg-ink-50/40 p-5 md:border-l md:border-t-0">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-500">
            Live preview
          </span>

          {previewUrls.length > 0 ? (
            <div className="grid grid-cols-2 gap-2">
              {previewUrls.slice(0, 4).map((url, i) => (
                <div key={i} className="group relative">
                  <img src={url} alt="" className="h-20 w-full rounded-lg border border-ink-100 object-cover" />
                  <button
                    type="button"
                    onClick={() => removeFile(i)}
                    disabled={uploading}
                    className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100"
                    aria-label="Remove photo"
                  >
                    <X size={10} aria-hidden="true" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="flex h-20 w-full items-center justify-center rounded-lg border border-dashed border-ink-200 bg-white"
                >
                  <ImageIcon className="h-4 w-4 text-ink-400" />
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-2 rounded-lg border border-brand-100 bg-brand-50 px-3 py-2.5">
            <Info className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-brand-600" />
            <p className="text-[11px] text-ink-900">
              High-quality photos increase customer engagement by up to 40%.
            </p>
          </div>

          <div className="mt-auto flex flex-col gap-2">
            <Button
              variant="primary"
              onClick={handleSubmit}
              loading={saving || uploading}
              disabled={!title.trim() || files.length === 0}
              type="button"
            >
              {uploading ? 'Uploading photos...' : 'Publish Work'}
            </Button>
            <Button variant="ghost" onClick={onClose} type="button" disabled={uploading}>
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
