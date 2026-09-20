'use client';

import { AnimatePresence, motion } from 'framer-motion';
import {
  BadgeCheck,
  ChevronLeft,
  ChevronRight,
  Gavel,
  Gauge,
  Maximize2,
  MapPin,
  PackageX,
  Send,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import BackButton from '../../../components/BackButton';
import BidsModal from '../../../components/BidsModal';
import { useAuth } from '../../../context/AuthContext';
import api from '../../../lib/api';
import useGeolocation from '../../../lib/useGeolocation';
import Badge from '../../../components/ui/Badge';
import Button from '../../../components/ui/Button';
import Card from '../../../components/ui/Card';
import { DetailSkeleton } from '../../../components/ui/Skeleton';
import Spinner from '../../../components/ui/Spinner';
import { Field, TextArea, TextInput } from '../../../components/ui/Field';
import Portal from '../../../components/ui/Portal';
import StatusBadge from '../../../components/StatusBadge';
import { useToast } from '../../../components/ui/Toast';

const AVATAR_FALLBACK = 'https://i.pravatar.cc/300?img=8';

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

// Left-hand column on both layouts: who posted it, what's needed, where, and the budget.
function RequirementMetaPanel({ requirement }) {
  const customer = requirement.customer || {};

  return (
    <Card className="p-5 sm:p-6 space-y-5">
      <div className="flex items-center gap-3">
        <img
          src={customer.avatar_url || AVATAR_FALLBACK}
          alt={customer.name || 'Customer'}
          className="h-12 w-12 shrink-0 rounded-2xl object-cover ring-2 ring-ink-100 shadow-soft"
        />
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 truncate text-sm font-bold text-ink-900">
            {customer.name || 'Customer'}
            {customer.is_verified && (
              <BadgeCheck size={15} className="shrink-0 text-trust-500" aria-hidden="true" />
            )}
          </p>
          <p className="mt-0.5 text-xs text-ink-400">Posted {timeAgo(requirement.createdAt)}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <StatusBadge status={requirement.status} kind="requirement" />
        <Badge tone={requirement.post_type === 'fixed' ? 'accent' : 'brand'} size="sm">
          {requirement.post_type === 'fixed' ? 'Fixed price' : 'Open to bids'}
        </Badge>
      </div>

      <div>
        <p className="text-[10px] font-bold uppercase tracking-wider text-ink-400">Services required</p>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {(requirement.services || []).map((s) => (
            <Badge key={s} tone="brand" size="sm" className="font-medium">
              {s}
            </Badge>
          ))}
        </div>
      </div>

      <div>
        <p className="text-[10px] font-bold uppercase tracking-wider text-ink-400">Experience needed</p>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {(requirement.experience_levels || ['any']).map((lvl) => (
            <Badge key={lvl} tone="neutral" size="sm" className="font-medium">
              {EXPERIENCE_LABELS[lvl] || 'Any experience'}
            </Badge>
          ))}
        </div>
      </div>

      {requirement.location?.text && (
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-ink-400">Location</p>
          <p className="mt-1.5 flex items-start gap-1.5 text-sm text-ink-700">
            <MapPin size={15} className="mt-0.5 shrink-0 text-ink-400" aria-hidden="true" />
            <span>{requirement.location.text}</span>
          </p>
          {typeof requirement.distance_km === 'number' && (
            <p className="mt-1.5 flex items-center gap-1.5 text-xs font-semibold text-brand-600">
              <Gauge size={13} aria-hidden="true" />
              {requirement.distance_km} km away
            </p>
          )}
        </div>
      )}

      {typeof requirement.budget === 'number' && (
        <div className="rounded-2xl border border-brand-100/70 bg-brand-50/80 p-3.5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-ink-400">Budget</p>
          <p className="mt-0.5 font-display text-xl font-bold text-brand-700">
            ₹{requirement.budget.toLocaleString('en-IN')}
          </p>
        </div>
      )}
    </Card>
  );
}

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
                <video src={item.url} className="h-full w-full object-contain" controls autoPlay playsInline />
              ) : (
                <img src={item.url} alt="Requirement attachment" className="h-full w-full object-contain" />
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
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </Portal>
  );
}

// Description + media - the middle/right column shared by both layouts.
function RequirementDescriptionPanel({ requirement }) {
  const [lightboxIndex, setLightboxIndex] = useState(null);
  const media = requirement.media || [];

  return (
    <Card className="p-5 sm:p-6 space-y-5">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wider text-ink-400">Description</p>
        <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-ink-700">{requirement.description}</p>
      </div>

      {media.length > 0 && (
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-ink-400">Photos &amp; videos</p>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {media.map((m, i) => (
              <div
                key={m.url}
                role="button"
                tabIndex={0}
                onClick={() => setLightboxIndex(i)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setLightboxIndex(i);
                  }
                }}
                className="group/media relative cursor-pointer overflow-hidden rounded-2xl bg-ink-100 ring-1 ring-ink-200/50 shadow-soft"
              >
                {m.type === 'video' ? (
                  <div className="relative h-32 w-full bg-black/90 flex items-center justify-center">
                    <video src={m.url} className="h-32 w-full object-cover opacity-80" muted playsInline />
                    <span className="absolute px-2 py-0.5 rounded-full bg-black/60 text-[10px] font-semibold text-white backdrop-blur-sm">
                      Video
                    </span>
                  </div>
                ) : (
                  <img
                    src={m.url}
                    alt={`${requirement.services?.[0] || 'Requirement'} media ${i + 1}`}
                    className="h-32 w-full object-cover transition-transform duration-300 group-hover/media:scale-105"
                  />
                )}
                <span className="absolute right-1.5 top-1.5 grid h-6 w-6 place-items-center rounded-full bg-black/50 text-white opacity-0 transition-opacity group-hover/media:opacity-100">
                  <Maximize2 size={12} aria-hidden="true" />
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {media.length > 0 && (
        <MediaLightbox media={media} index={lightboxIndex} onNavigate={setLightboxIndex} onClose={() => setLightboxIndex(null)} />
      )}
    </Card>
  );
}

// Right column for a provider viewing a "bids" post: place/update a bid, and see everyone else's.
function ProviderBidsPanel({ requirement }) {
  const { toast } = useToast();
  const [bids, setBids] = useState([]);
  const [status, setStatus] = useState(requirement.status);
  const [loading, setLoading] = useState(true);
  const [amount, setAmount] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = () => {
    setLoading(true);
    api
      .get(`/requirements/${requirement.id}/bids`)
      .then(({ data }) => {
        setBids(data.bids || []);
        setStatus(data.requirement_status);
      })
      .catch(() => setBids([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requirement.id]);

  const myBid = bids.find((b) => b.is_mine);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const amountNum = Number(amount);
    if (amount === '' || Number.isNaN(amountNum) || amountNum <= 0) {
      toast('Enter a valid bid amount', { type: 'error' });
      return;
    }
    try {
      setSubmitting(true);
      await api.post(`/requirements/${requirement.id}/bids`, { amount: amountNum, message: message.trim() || undefined });
      toast('Your bid has been placed', { type: 'success' });
      setAmount('');
      setMessage('');
      load();
    } catch (err) {
      toast(err.response?.data?.message || 'Could not place your bid', { type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const lowest = bids.length > 1 ? Math.min(...bids.map((b) => b.amount)) : null;

  return (
    <Card className="p-5 sm:p-6 space-y-5">
      <p className="text-[10px] font-bold uppercase tracking-wider text-ink-400">Bids</p>

      {status === 'open' ? (
        <form onSubmit={handleSubmit} className="space-y-3">
          {myBid && (
            <div className="rounded-2xl bg-amber-50/80 border border-amber-200/60 p-3 text-xs text-amber-800">
              <div className="flex items-center justify-between font-bold">
                <span>Your current bid</span>
                <span>₹{myBid.amount?.toLocaleString('en-IN')}</span>
              </div>
            </div>
          )}
          <Field label="Your bid amount" required>
            <TextInput
              type="number"
              min="0"
              step="1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="e.g. 1200"
              leftIcon={<span>₹</span>}
            />
          </Field>
          <Field label="Message (optional)">
            <TextArea rows={3} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Availability, experience, guarantees..." />
          </Field>
          <Button type="submit" fullWidth size="sm" loading={submitting} icon={<Gavel size={14} aria-hidden="true" />}>
            {myBid ? 'Update your bid' : 'Submit bid'}
          </Button>
        </form>
      ) : (
        <p className="rounded-2xl border border-dashed border-ink-200 bg-ink-50/50 p-4 text-center text-xs text-ink-500">
          This requirement is no longer open for bids.
        </p>
      )}

      <div className="border-t border-ink-100 pt-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-ink-900">All bids ({bids.length})</h3>
          {lowest !== null && (
            <span className="text-[11px] text-ink-500">
              Lowest <span className="font-semibold text-ink-800">₹{lowest.toLocaleString('en-IN')}</span>
            </span>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <Spinner size={20} />
          </div>
        ) : bids.length === 0 ? (
          <p className="mt-3 rounded-2xl border border-dashed border-ink-200 bg-ink-50/50 p-4 text-center text-xs text-ink-500">
            No bids yet - be the first to quote.
          </p>
        ) : (
          <div className="mt-3 space-y-2.5">
            {bids.map((bid) => (
              <div
                key={bid.id}
                className={`rounded-2xl border bg-white p-3 shadow-soft ${
                  bid.is_mine ? 'border-brand-300 ring-1 ring-brand-200/60' : 'border-ink-200/80'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="flex min-w-0 items-center gap-1.5 truncate text-xs font-bold text-ink-900">
                    <img
                      src={bid.provider?.avatar_url || AVATAR_FALLBACK}
                      alt=""
                      className="h-6 w-6 shrink-0 rounded-lg object-cover"
                    />
                    <span className="truncate">{bid.provider?.name || 'Provider'}</span>
                    {bid.is_mine && (
                      <span className="shrink-0 rounded-full bg-brand-50 px-1.5 py-0.5 text-[9px] font-bold text-brand-700">You</span>
                    )}
                  </span>
                  <span className="shrink-0 font-display text-xs font-bold text-brand-600">
                    ₹{bid.amount?.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="mt-1.5 flex items-center gap-2">
                  <StatusBadge status={bid.status} kind="bid" className="text-[10px]" />
                  <span className="text-[10px] text-ink-400">{timeAgo(bid.createdAt)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}

// Right column for a provider viewing a "fixed price" post: just express interest, since only the
// customer who posted can see the full list of who else is interested.
function ProviderInterestPanel({ requirement }) {
  const { toast } = useToast();
  const [interested, setInterested] = useState(false);
  const [sending, setSending] = useState(false);

  const handleInterest = async () => {
    try {
      setSending(true);
      await api.post(`/requirements/${requirement.id}/interest`, {});
      setInterested(true);
      toast('The customer has been notified', { type: 'success' });
    } catch (err) {
      toast(err.response?.data?.message || 'Could not send interest', { type: 'error' });
    } finally {
      setSending(false);
    }
  };

  return (
    <Card className="p-5 sm:p-6 space-y-4">
      <p className="text-[10px] font-bold uppercase tracking-wider text-ink-400">Interest</p>
      <p className="text-xs text-ink-500">
        This is a fixed-price post. Let the customer know you&apos;re available and they may hire you directly.
      </p>
      {requirement.status === 'open' ? (
        <Button
          fullWidth
          variant={interested ? 'secondary' : 'primary'}
          disabled={interested}
          loading={sending}
          onClick={handleInterest}
          icon={<Send size={14} aria-hidden="true" />}
        >
          {interested ? "You're interested" : "I'm interested"}
        </Button>
      ) : (
        <p className="rounded-2xl border border-dashed border-ink-200 bg-ink-50/50 p-4 text-center text-xs text-ink-500">
          This requirement is no longer open.
        </p>
      )}
    </Card>
  );
}

export default function RequirementDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const { coords } = useGeolocation();
  const [requirement, setRequirement] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);

  const reload = () => {
    const params = {};
    if (coords) {
      params.lat = coords.lat;
      params.lng = coords.lng;
    }
    api
      .get(`/requirements/${id}`, { params })
      .then(({ data }) => {
        setRequirement(data.requirement);
        setNotFound(false);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    setLoading(true);
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, coords?.lat, coords?.lng]);

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl">
        <DetailSkeleton />
      </div>
    );
  }

  if (notFound || !requirement) {
    return (
      <div className="flex flex-col items-center gap-3 py-20 text-center">
        <PackageX size={40} className="text-ink-300" aria-hidden="true" />
        <h2 className="font-display text-lg font-bold text-ink-800">Requirement not found</h2>
        <p className="text-xs text-ink-500">This post doesn&apos;t exist, was removed, or isn&apos;t available to you.</p>
        <Link href="/">
          <Button variant="secondary" size="sm" className="mt-2">
            Back to home
          </Button>
        </Link>
      </div>
    );
  }

  const isOwner = user?.role === 'customer' && requirement.customer?.id === user?.id;
  const isProvider = user?.role === 'provider';
  const isFixedPrice = requirement.post_type === 'fixed';

  return (
    <div className="mx-auto max-w-6xl animate-fade-in-up">
      <BackButton />

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-xl font-bold tracking-tight text-ink-900 sm:text-2xl">
          {(requirement.services || []).join(', ') || 'Requirement'}
        </h1>
        {isOwner && (
          <Button size="sm" variant="secondary" onClick={() => setManageOpen(true)} icon={<Gavel size={14} aria-hidden="true" />}>
            {isFixedPrice ? 'View interest' : 'Manage bids'}
          </Button>
        )}
      </div>

      {isProvider ? (
        // Provider view: three parts - who/what/where/budget, description + media, and bids/interest.
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[280px_1fr_320px]">
          <RequirementMetaPanel requirement={requirement} />
          <RequirementDescriptionPanel requirement={requirement} />
          {isFixedPrice ? (
            <ProviderInterestPanel requirement={requirement} />
          ) : (
            <ProviderBidsPanel requirement={requirement} />
          )}
        </div>
      ) : (
        // Customer (and everyone else) view: two parts - who/what/where/budget, then description + media.
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[320px_1fr]">
          <RequirementMetaPanel requirement={requirement} />
          <RequirementDescriptionPanel requirement={requirement} />
        </div>
      )}

      {isOwner && (
        <BidsModal
          open={manageOpen}
          onClose={() => setManageOpen(false)}
          requirement={requirement}
          onRequirementUpdated={(updated) => {
            setRequirement((prev) => ({ ...prev, ...updated }));
            reload();
          }}
        />
      )}
    </div>
  );
}
