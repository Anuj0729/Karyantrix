'use client';

import { Gavel, Heart, MapPin, MessageCircle, Play, User } from 'lucide-react';
import { useState } from 'react';
import StatusBadge from '../StatusBadge';
import Badge from '../ui/Badge';
import Card from '../ui/Card';

const AVATAR_FALLBACK = 'https://i.pravatar.cc/300?img=8';

const API_ORIGIN = (process.env.NEXT_API_URL || 'http://localhost:5000/api').replace(/\/api\/?$/, '');
const mediaUrl = (url) => (url.startsWith('http') ? url : `${API_ORIGIN}${url}`);

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
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d`;
  return new Date(dateStr).toLocaleDateString();
};

export default function AdminRequirementCard({ requirement: r }) {
  const [expanded, setExpanded] = useState(false);
  const customer = r.customer || {};
  const media = r.media || [];
  const primaryMedia = media[0];
  const extraCount = media.length - 1;
  const description = r.description || '';
  const isLong = description.length > 160;

  return (
    <Card
      className="flex flex-col overflow-hidden border-ink-200/80 p-0 shadow-xs transition-all hover:border-brand-200 hover:shadow-card"
      hover={false}
    >
      <div className="flex items-center justify-between gap-2 px-4 py-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <img
            src={customer.avatar_url ? mediaUrl(customer.avatar_url) : AVATAR_FALLBACK}
            alt={customer.name || 'Customer'}
            className="h-9 w-9 shrink-0 rounded-full object-cover ring-2 ring-ink-100"
          />
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-ink-900 leading-tight">{customer.name || 'Customer'}</p>
            <div className="flex items-center gap-1.5 text-[11px] text-ink-400">
              <span>{timeAgo(r.createdAt)} ago</span>
              {r.location?.text && (
                <>
                  <span className="text-ink-300">&middot;</span>
                  <span className="flex items-center gap-0.5 truncate">
                    <MapPin size={10} className="shrink-0" aria-hidden="true" />
                    <span className="truncate">{r.location.text}</span>
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
        <StatusBadge status={r.status} kind="requirement" className="shrink-0" />
      </div>

      <div className="relative aspect-square w-full shrink-0 bg-ink-100">
        {primaryMedia ? (
          primaryMedia.type === 'video' ? (
            <div className="relative h-full w-full bg-black">
              <video src={mediaUrl(primaryMedia.url)} className="h-full w-full object-cover opacity-90" muted playsInline />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-black/50 backdrop-blur-sm">
                  <Play size={20} className="ml-0.5 text-white" fill="white" aria-hidden="true" />
                </div>
              </div>
            </div>
          ) : (
            <img
              src={mediaUrl(primaryMedia.url)}
              alt={(r.services || []).join(', ') || 'Requirement photo'}
              className="h-full w-full object-cover"
            />
          )
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-brand-50 via-white to-accent-50 text-brand-300">
            <Gavel size={40} aria-hidden="true" />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-300">No photos attached</span>
          </div>
        )}
        {extraCount > 0 && (
          <span className="absolute right-2.5 top-2.5 rounded-full bg-black/60 px-2 py-0.5 text-[11px] font-semibold text-white backdrop-blur-sm">
            +{extraCount} more
          </span>
        )}
        <span className="absolute bottom-2.5 left-2.5 inline-flex items-center gap-1 rounded-full bg-black/60 px-2.5 py-1 text-xs font-bold text-white backdrop-blur-sm">
          ₹{Number(r.budget || 0).toLocaleString('en-IN')}
        </span>
      </div>

      <div className="flex items-center gap-4 px-4 pt-3 text-ink-600">
        <span className="flex items-center gap-1.5 text-xs font-semibold">
          <Gavel size={16} className="text-brand-500" aria-hidden="true" />
          {r.bid_count || 0} bid{r.bid_count === 1 ? '' : 's'}
        </span>
        <span className="flex items-center gap-1.5 text-xs font-semibold">
          <Heart size={16} className="text-rose-400" aria-hidden="true" />
          {(r.interested_providers || []).length} interested
        </span>
        {r.hired_provider && (
          <span className="ml-auto flex items-center gap-1 truncate text-xs font-semibold text-emerald-700">
            <MessageCircle size={14} className="shrink-0" aria-hidden="true" />
            Hired {r.hired_provider.name}
          </span>
        )}
      </div>

      <div className="px-4 pb-4 pt-2">
        <p className="text-xs leading-relaxed text-ink-700">
          <span className="mr-1.5 font-bold text-ink-900">{customer.name || 'Customer'}</span>
          {isLong && !expanded ? `${description.slice(0, 160).trim()}…` : description}
          {isLong && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="ml-1.5 font-semibold text-ink-400 hover:text-brand-600"
            >
              {expanded ? 'less' : 'more'}
            </button>
          )}
        </p>

        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {(r.services || []).map((s) => (
            <Badge key={s} tone="brand" size="sm" className="font-medium">
              #{s.replace(/\s+/g, '')}
            </Badge>
          ))}
          {(r.categories || []).map((c) => (
            <Badge key={c.id} tone="purple" size="sm" className="font-medium">
              {c.name}
            </Badge>
          ))}
          {(r.experience_levels || []).map((lvl) => (
            <Badge key={lvl} tone="neutral" size="sm" className="font-medium">
              {EXPERIENCE_LABELS[lvl] || lvl}
            </Badge>
          ))}
        </div>

        <div className="mt-3 flex items-center gap-1.5 border-t border-ink-50 pt-2.5 text-[11px] text-ink-400">
          <User size={11} aria-hidden="true" />
          {customer.phone || 'No phone on file'}
        </div>
      </div>
    </Card>
  );
}
