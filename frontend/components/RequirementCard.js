'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, MapPin, Maximize2, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import Badge from './ui/Badge';
import Card from './ui/Card';
import Portal from './ui/Portal';

const AVATAR_FALLBACK = 'https://i.pravatar.cc/300?img=8';

const mediaUrl = (url) => url;

const EXPERIENCE_LABELS = {
  any: 'Any experience',
  beginner: 'Beginner OK',
  intermediate: 'Intermediate+',
  expert: 'Expert only',
};

const timeAgo = (dateStr) => {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
};

function MediaLightbox({ media, index, onNavigate, onClose }) {
  const item = index !== null ? media[index] : null;

  return (
    <Portal>
      <AnimatePresence>
        {item && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-[60] bg-black"
            onClick={onClose}
          >
            <motion.div
              key={index}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.18 }}
              className="flex h-full w-full items-center justify-center"
              onClick={(e) => e.stopPropagation()}
            >
              {item.type === 'video' ? (
                <video
                  src={mediaUrl(item.url)}
                  className="h-full w-full object-contain"
                  controls
                  autoPlay
                  playsInline
                />
              ) : (
                <img src={mediaUrl(item.url)} alt="Requirement attachment" className="h-full w-full object-contain" loading="lazy" decoding="async" />
              )}
            </motion.div>

            <div
              className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between bg-gradient-to-b from-black/60 to-transparent px-4 py-4 sm:px-6"
              onClick={(e) => e.stopPropagation()}
            >
              {media.length > 1 ? (
                <span className="pointer-events-auto rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm">
                  {index + 1} / {media.length}
                </span>
              ) : (
                <span />
              )}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onClose();
                }}
                className="pointer-events-auto grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white backdrop-blur-sm transition-colors hover:bg-white/20"
                aria-label="Close"
              >
                <X size={20} aria-hidden="true" />
              </button>
            </div>

            {media.length > 1 && (
              <>
                {index > 0 && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onNavigate(index - 1);
                    }}
                    className="absolute left-2 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white backdrop-blur-sm transition-colors hover:bg-white/20 sm:left-6"
                    aria-label="Previous"
                  >
                    <ChevronLeft size={22} aria-hidden="true" />
                  </button>
                )}
                {index < media.length - 1 && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onNavigate(index + 1);
                    }}
                    className="absolute right-2 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white backdrop-blur-sm transition-colors hover:bg-white/20 sm:right-6"
                    aria-label="Next"
                  >
                    <ChevronRight size={22} aria-hidden="true" />
                  </button>
                )}

                <div
                  className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center gap-1.5 bg-gradient-to-t from-black/60 to-transparent px-4 pb-6 pt-10"
                  onClick={(e) => e.stopPropagation()}
                >
                  {media.map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => onNavigate(i)}
                      aria-label={`Go to item ${i + 1}`}
                      className={`pointer-events-auto h-1.5 rounded-full transition-all ${
                        i === index ? 'w-5 bg-white' : 'w-1.5 bg-white/40 hover:bg-white/70'
                      }`}
                    />
                  ))}
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </Portal>
  );
}

export default function RequirementCard({ requirement }) {
  const router = useRouter();
  const openDetail = () => router.push(`/requirements/${requirement.id}`);
  const customer = requirement.customer || {};
  const isFixedPrice = requirement.post_type === 'fixed';
  const [lightboxIndex, setLightboxIndex] = useState(null);

  return (
    <Card
      className="group relative flex h-[430px] flex-col overflow-hidden border border-ink-200/80 bg-white p-5 sm:p-6 shadow-soft hover:shadow-card-hover transition-all duration-300 rounded-3xl cursor-pointer"
      onClick={openDetail}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openDetail();
        }
      }}
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="flex min-h-0 flex-1 flex-col gap-4">
        <div className="flex shrink-0 items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative shrink-0">
              <img
                src={customer.avatar_url ? mediaUrl(customer.avatar_url) : AVATAR_FALLBACK}
                alt={customer.name || 'Customer'}
                className="h-11 w-11 rounded-2xl object-cover ring-2 ring-ink-100 shadow-soft"
                width={44}
                height={44}
                loading="lazy"
                decoding="async"
              />
              <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-trust-500 ring-2 ring-white" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-ink-900 leading-tight">{customer.name || 'Customer'}</p>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-ink-400 mt-1">
                <span>{timeAgo(requirement.createdAt)}</span>
                {requirement.location?.text && (
                  <>
                    <span className="text-ink-300">•</span>
                    <span className="flex items-center gap-1 truncate text-ink-500">
                      <MapPin size={12} className="text-ink-400 shrink-0" aria-hidden="true" />
                      <span className="truncate">{requirement.location.text}</span>
                      {typeof requirement.distance_km === 'number' && (
                        <span className="font-semibold text-brand-600 shrink-0">({requirement.distance_km} km)</span>
                      )}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {typeof requirement.budget === 'number' && (
            <div className="shrink-0 text-right">
              <span className="text-[10px] uppercase font-bold tracking-wider text-ink-400 block">Budget</span>
              <div className="inline-flex items-center gap-1 font-display text-base sm:text-lg font-bold text-brand-600 bg-brand-50/80 px-2.5 py-0.5 rounded-xl border border-brand-100/70">
                <span>₹</span>
                {requirement.budget.toLocaleString('en-IN')}
              </div>
            </div>
          )}
        </div>

        <div className="flex h-12 shrink-0 flex-wrap items-start gap-1.5 overflow-hidden pt-1">
          {(requirement.services || []).map((s) => (
            <Badge key={s} tone="brand" size="sm" className="font-medium">
              {s}
            </Badge>
          ))}
          {(requirement.experience_levels || ['any']).map((lvl) => (
            <Badge key={lvl} tone="neutral" size="sm" className="font-medium">
              {EXPERIENCE_LABELS[lvl] || 'Any experience'}
            </Badge>
          ))}
          {requirement.status && requirement.status !== 'open' && (
            <Badge tone="warning" size="sm" className="uppercase tracking-wider font-semibold">
              {requirement.status}
            </Badge>
          )}
          {isFixedPrice && (
            <Badge tone="accent" size="sm" className="font-medium">
              Fixed price
            </Badge>
          )}
        </div>

        <div className="min-h-0">
          <p className="line-clamp-2 text-sm text-ink-700 leading-relaxed">{requirement.description}</p>
        </div>

        {requirement.media?.length > 0 && (
          <div className={`grid h-44 shrink-0 gap-2 ${requirement.media.length === 1 ? 'grid-cols-1' : 'grid-cols-3'}`}>
            {requirement.media.slice(0, 3).map((m, i) => (
              <div
                key={m.url}
                role="button"
                tabIndex={0}
                onClick={(e) => {
                  e.stopPropagation();
                  setLightboxIndex(i);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    e.stopPropagation();
                    setLightboxIndex(i);
                  }
                }}
                className="group/media relative h-full cursor-pointer overflow-hidden rounded-2xl bg-ink-100 ring-1 ring-ink-200/50 shadow-soft"
              >
                {m.type === 'video' ? (
                  <div className="relative h-full w-full bg-black/90 flex items-center justify-center">
                    <video src={mediaUrl(m.url)} className="h-full w-full object-cover opacity-80" muted playsInline />
                    <span className="absolute px-2 py-0.5 rounded-full bg-black/60 text-[10px] font-semibold text-white backdrop-blur-sm">
                      Video
                    </span>
                  </div>
                ) : (
                  <img
                    src={mediaUrl(m.url)}
                    alt={`${requirement.services?.[0] || 'Requirement'} media ${i + 1}`}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover/media:scale-105"
                    loading="lazy"
                    decoding="async"
                  />
                )}
                {i === 2 && requirement.media.length > 3 && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/60 font-display text-sm font-bold text-white backdrop-blur-xs">
                    +{requirement.media.length - 3} more
                  </div>
                )}
                <span className="absolute right-1.5 top-1.5 grid h-6 w-6 place-items-center rounded-full bg-black/50 text-white opacity-0 transition-opacity group-hover/media:opacity-100">
                  <Maximize2 size={12} aria-hidden="true" />
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {requirement.media?.length > 0 && (
        <div onClick={(e) => e.stopPropagation()}>
          <MediaLightbox
            media={requirement.media}
            index={lightboxIndex}
            onNavigate={setLightboxIndex}
            onClose={() => setLightboxIndex(null)}
          />
        </div>
      )}
    </Card>
  );
}
