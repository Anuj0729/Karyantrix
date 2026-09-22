'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ImageOff, MapPin } from 'lucide-react';
import api from '../../lib/api';
import { resolveMediaUrl } from './mediaUrl';

// Small in-memory cache so the same requirement link isn't refetched every
// time a chat re-renders (message lists re-render often while polling/socket
// updates land).
const requirementCache = new Map();

export default function RequirementLinkPreview({ requirementId, isOwn }) {
  const router = useRouter();
  const [requirement, setRequirement] = useState(() => requirementCache.get(requirementId) || null);
  const [status, setStatus] = useState(() => (requirementCache.has(requirementId) ? 'ready' : 'loading'));

  useEffect(() => {
    if (!requirementId) return undefined;

    if (requirementCache.has(requirementId)) {
      setRequirement(requirementCache.get(requirementId));
      setStatus('ready');
      return undefined;
    }

    let cancelled = false;
    setStatus('loading');

    api
      .get(`/requirements/${requirementId}`)
      .then((res) => {
        if (cancelled) return;
        const data = res.data?.requirement || null;
        if (!data) {
          setStatus('error');
          return;
        }
        requirementCache.set(requirementId, data);
        setRequirement(data);
        setStatus('ready');
      })
      .catch(() => {
        if (!cancelled) setStatus('error');
      });

    return () => {
      cancelled = true;
    };
  }, [requirementId]);

  if (status === 'error') return null;

  if (status === 'loading') {
    return (
      <div
        className={`mt-2 h-28 w-full animate-pulse rounded-xl ${isOwn ? 'bg-white/15' : 'bg-ink-100'}`}
        aria-hidden="true"
      />
    );
  }

  if (!requirement) return null;

  const image = requirement.media?.[0];
  const imgSrc = image ? resolveMediaUrl(image.url) : null;

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        router.push(`/requirements/${requirementId}`);
      }}
      onDoubleClick={(e) => e.stopPropagation()}
      className={`mt-2 block w-full overflow-hidden rounded-xl border text-left transition-colors ${
        isOwn ? 'border-white/25 bg-white/10 hover:bg-white/15' : 'border-ink-200 bg-ink-50 hover:bg-ink-100'
      }`}
    >
      {imgSrc ? (
        <img
          src={imgSrc}
          alt={requirement.services?.[0] || 'Requirement'}
          className="h-32 w-full object-cover"
          loading="lazy"
        />
      ) : (
        <div className={`flex h-20 w-full items-center justify-center ${isOwn ? 'bg-white/10' : 'bg-ink-100'}`}>
          <ImageOff size={18} className={isOwn ? 'text-white/60' : 'text-ink-400'} aria-hidden="true" />
        </div>
      )}
      <div className="px-2.5 py-1.5">
        <p className={`truncate text-[11px] font-semibold ${isOwn ? 'text-white' : 'text-ink-800'}`}>
          {requirement.services?.[0] || 'Requirement'}
        </p>
        {requirement.location?.text && (
          <p
            className={`mt-0.5 flex items-center gap-1 truncate text-[10px] ${
              isOwn ? 'text-white/70' : 'text-ink-500'
            }`}
          >
            <MapPin size={10} className="shrink-0" aria-hidden="true" />
            <span className="truncate">{requirement.location.text}</span>
          </p>
        )}
      </div>
    </button>
  );
}
