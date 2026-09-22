'use client';

import { useRef, useState } from 'react';
import { Camera, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';
import Spinner from './ui/Spinner';
import { useToast } from './ui/Toast';

const resolveUrl = (url) => (!url ? null : url);

/**
 * Cover/banner photo editor. Available to every role (customer, provider, admin, staff) —
 * each profile view renders this at the top instead of a static gradient banner.
 * Falls back to `fallbackClassName` (a gradient) when no cover_photo_url is set.
 */
export default function CoverPhotoEditor({
  className = 'h-28 sm:h-36',
  fallbackClassName = 'bg-gradient-to-r from-brand-600 via-brand-500 to-accent-500',
  rounded = '',
}) {
  const { user, updateLocalUser } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  const pickFile = () => fileInputRef.current?.click();

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('cover', file);
      const { data } = await api.post('/auth/me/cover', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      updateLocalUser({ cover_photo_url: data.user.cover_photo_url });
      toast('Cover photo updated', { type: 'success' });
    } catch (err) {
      toast(err.response?.data?.message || 'Could not upload image', { type: 'error' });
    } finally {
      setUploading(false);
    }
  };

  const removeCover = async () => {
    setUploading(true);
    try {
      const { data } = await api.delete('/auth/me/cover');
      updateLocalUser({ cover_photo_url: data.user.cover_photo_url });
      toast('Cover photo removed', { type: 'info' });
    } catch (err) {
      toast(err.response?.data?.message || 'Could not remove image', { type: 'error' });
    } finally {
      setUploading(false);
    }
  };

  const resolvedUrl = resolveUrl(user?.cover_photo_url);

  return (
    <div className={`group/cover relative w-full overflow-hidden ${className} ${rounded}`} data-no-nav-loading="true">
      {resolvedUrl ? (
        <img src={resolvedUrl} alt="" className="h-full w-full object-cover" />
      ) : (
        <div className={`h-full w-full ${fallbackClassName}`}>
          <div className="absolute inset-0 bg-hero-mesh opacity-40 mix-blend-overlay" aria-hidden="true" />
        </div>
      )}

      {uploading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-xs">
          <Spinner size={22} className="text-white" />
        </div>
      )}

      <div className="absolute right-3 top-3 flex items-center gap-2 opacity-100 transition-opacity sm:opacity-0 sm:group-hover/cover:opacity-100">
        <button
          type="button"
          onClick={pickFile}
          disabled={uploading}
          aria-label={resolvedUrl ? 'Change cover photo' : 'Add cover photo'}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-black/45 text-white shadow-soft backdrop-blur-sm transition-colors hover:bg-black/60 active:scale-95"
        >
          <Camera size={14} aria-hidden="true" />
        </button>
        {resolvedUrl && (
          <button
            type="button"
            onClick={removeCover}
            disabled={uploading}
            aria-label="Remove cover photo"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-black/45 text-white shadow-soft backdrop-blur-sm transition-colors hover:bg-danger-600 active:scale-95"
          >
            <Trash2 size={13} aria-hidden="true" />
          </button>
        )}
      </div>

      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
    </div>
  );
}
