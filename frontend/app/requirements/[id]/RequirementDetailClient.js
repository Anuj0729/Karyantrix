'use client';

import { AnimatePresence, motion } from 'framer-motion';
import {
  BadgeCheck,
  Briefcase,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Gauge,
  Gavel,
  Lock,
  MapPin,
  Maximize2,
  PackageX,
  Pencil,
  Send,
  Share2,
  ShieldAlert,
  ShieldCheck,
  Star,
  Trash2,
  Wallet,
  X,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import BackButton from '../../../components/BackButton';
import { useAuth } from '../../../context/AuthContext';
import api from '../../../lib/api';
import { getSocket } from '../../../lib/socket';
import useGeolocation from '../../../lib/useGeolocation';
import Button from '../../../components/ui/Button';
import Card from '../../../components/ui/Card';
import { DetailSkeleton } from '../../../components/ui/Skeleton';
import Spinner from '../../../components/ui/Spinner';
import { Field, TextArea, TextInput } from '../../../components/ui/Field';
import Portal from '../../../components/ui/Portal';
import StatusBadge from '../../../components/StatusBadge';
import { useToast } from '../../../components/ui/Toast';

const RequirementComposerModal = dynamic(() => import('../../../components/RequirementComposerModal'));

const AVATAR_FALLBACK = 'https://i.pravatar.cc/300?img=8';

const SEAL_BIDS_FROM_OTHER_PROVIDERS = false;

const hireBidUrl = (requirementId, bidId) => `/requirements/${requirementId}/bids/${bidId}/accept`;

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

const formatInr = (amount) => `₹${Number(amount).toLocaleString('en-IN')}`;

const formatMemberSince = (dateStr) => {
  if (!dateStr) return null;
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const keepLatestBidPerProvider = (list) => {
  const seen = new Set();
  return list.filter((bid) => {
    const bidderId = String(bid.provider?.id || bid.provider);
    if (seen.has(bidderId)) return false;
    seen.add(bidderId);
    return true;
  });
};

function useRequirementBids(requirementId, enabled, initialStatus) {
  const [bids, setBids] = useState([]);
  const [status, setStatus] = useState(initialStatus);
  const [loading, setLoading] = useState(enabled);
  const [failed, setFailed] = useState(false);

  const load = useCallback(() => {
    if (!enabled) return;
    setLoading(true);
    api
      .get(`/requirements/${requirementId}/bids`)
      .then(({ data }) => {
        setBids(keepLatestBidPerProvider(data.bids || []));
        setStatus(data.requirement_status);
        setFailed(false);
      })
      .catch(() => {
        setBids([]);
        setFailed(true);
      })
      .finally(() => setLoading(false));
  }, [requirementId, enabled]);

  useEffect(() => {
    load();
  }, [load]);

  return { bids, status, loading, failed, reload: load };
}

function Chip({ children }) {
  return (
    <span className="inline-flex items-center rounded-full border border-ink-300 bg-white px-3.5 py-1.5 text-sm text-ink-700">
      {children}
    </span>
  );
}

function SectionHeading({ children }) {
  return <h3 className="text-base font-semibold text-ink-900">{children}</h3>;
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

function ProjectDetailsCard({ requirement }) {
  const [lightboxIndex, setLightboxIndex] = useState(null);
  const media = requirement.media || [];
  const services = requirement.services || [];
  const experienceLevels = requirement.experience_levels || ['any'];

  return (
    <Card hover={false} className="p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <h2 className="font-display text-lg font-semibold text-ink-900">Project Details</h2>
        <div className="shrink-0 text-right">
          {typeof requirement.budget === 'number' && (
            <p className="font-display text-lg font-bold text-ink-900">
              <span className="sr-only">Budget </span>
              {formatInr(requirement.budget)}
            </p>
          )}
          <p className="mt-1 flex items-center justify-end gap-1 text-[10px] font-bold uppercase tracking-wider text-ink-500">
            <Clock size={11} aria-hidden="true" />
            Posted {timeAgo(requirement.createdAt)}
          </p>
        </div>
      </div>

      <p className="mt-5 whitespace-pre-line text-[15px] leading-relaxed text-ink-700">{requirement.description}</p>

      {media.length > 0 && (
        <div className="mt-6">
          <SectionHeading>Photos &amp; videos</SectionHeading>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
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
                    alt={`${services[0] || 'Requirement'} media ${i + 1}`}
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

      {services.length > 0 && (
        <div className="mt-6">
          <SectionHeading>Services Required</SectionHeading>
          <div className="mt-3 flex flex-wrap gap-2">
            {services.map((s) => (
              <Chip key={s}>{s}</Chip>
            ))}
          </div>
        </div>
      )}

      <div className="mt-6">
        <SectionHeading>Experience Needed</SectionHeading>
        <div className="mt-3 flex flex-wrap gap-2">
          {experienceLevels.map((lvl) => (
            <Chip key={lvl}>{EXPERIENCE_LABELS[lvl] || 'Any experience'}</Chip>
          ))}
        </div>
      </div>

      {media.length > 0 && (
        <MediaLightbox media={media} index={lightboxIndex} onNavigate={setLightboxIndex} onClose={() => setLightboxIndex(null)} />
      )}
    </Card>
  );
}

function ClientPanel({ requirement }) {
  const customer = requirement.customer || {};
  const memberSince = formatMemberSince(customer.createdAt);
  const postedOn = formatMemberSince(requirement.createdAt);

  const rating = firstNumber(customer.customer_rating_avg);
  const reviewsCount = firstNumber(customer.customer_rating_count) ?? 0;
  const jobsDone = firstNumber(customer.jobs_done) ?? 0;
  const hasRating = typeof rating === 'number' && rating > 0 && reviewsCount > 0;

  return (
    <Card hover={false} className="p-5 sm:p-6">
      <h2 className="font-display text-base font-semibold text-ink-900">About the Client</h2>

      <div className="mt-4 flex items-center gap-3">
        <img
          src={customer.avatar_url || AVATAR_FALLBACK}
          alt={customer.name || 'Customer'}
          className="h-12 w-12 shrink-0 rounded-2xl object-cover ring-2 ring-ink-100 shadow-soft"
        />
        <div className="min-w-0">
          <p className="flex min-w-0 items-center gap-1.5 truncate text-sm font-bold text-ink-900">
            <span className="truncate">{customer.name || 'Customer'}</span>
            {customer.is_verified && (
              <BadgeCheck size={15} className="shrink-0 text-trust-500" aria-hidden="true" />
            )}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-600">
            <span className="flex items-center gap-1 font-semibold text-ink-900">
              <Star size={13} className="fill-amber-400 text-amber-400" aria-hidden="true" />
              {hasRating ? rating.toFixed(1) : 'New'}
              <span className="font-normal text-ink-400">({reviewsCount})</span>
            </span>
            <span className="flex items-center gap-1">
              <Briefcase size={13} className="text-ink-400" aria-hidden="true" />
              {jobsDone} {jobsDone === 1 ? 'job' : 'jobs'} done
            </span>
          </div>
        </div>
      </div>

      <ul className="mt-4 space-y-3.5 text-sm text-ink-700">
        {requirement.location?.text && (
          <li className="flex items-start gap-2.5">
            <MapPin size={16} className="mt-0.5 shrink-0 text-ink-500" aria-hidden="true" />
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-ink-400">Job location</p>
              <p className="mt-0.5">{requirement.location.text}</p>
            </div>
          </li>
        )}
        {memberSince && (
          <li className="flex items-center gap-2.5">
            <Clock size={16} className="shrink-0 text-ink-500" aria-hidden="true" />
            <span>Member since {memberSince}</span>
          </li>
        )}
        {postedOn && (
          <li className="flex items-start gap-2.5">
            <Clock size={16} className="mt-0.5 shrink-0 text-ink-500" aria-hidden="true" />
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-ink-400">Posted on</p>
              <p className="mt-0.5">
                {postedOn} <span className="text-ink-400">({timeAgo(requirement.createdAt)})</span>
              </p>
              {typeof requirement.distance_km === 'number' && (
                <p className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-brand-600">
                  <Gauge size={13} aria-hidden="true" />
                  {requirement.distance_km < 1 ? '<1 km away' : `${requirement.distance_km} km away`}
                </p>
              )}
            </div>
          </li>
        )}
        {!postedOn && typeof requirement.distance_km === 'number' && (
          <li className="flex items-center gap-2.5 text-xs font-semibold text-brand-600">
            <Gauge size={16} className="shrink-0" aria-hidden="true" />
            {requirement.distance_km < 1 ? '<1 km away' : `${requirement.distance_km} km away`}
          </li>
        )}
      </ul>

      <h3 className="mt-6 text-base font-semibold text-ink-900">Client Verification</h3>
      <ul className="mt-3 space-y-3 text-sm text-ink-700">
        {customer.is_verified ? (
          <li className="flex items-center gap-2.5">
            <ShieldCheck size={16} className="shrink-0 text-trust-600" aria-hidden="true" />
            <span>Verified account</span>
          </li>
        ) : (
          <li className="flex items-center gap-2.5 text-ink-500">
            <ShieldAlert size={16} className="shrink-0 text-ink-400" aria-hidden="true" />
            <span>Not verified yet</span>
          </li>
        )}
      </ul>
    </Card>
  );
}

function BidFormCard({ requirement, status, myBid, onPlaced }) {
  const { toast } = useToast();
  const [amount, setAmount] = useState('');
  const [days, setDays] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const budget = typeof requirement.budget === 'number' ? requirement.budget : null;
  const amountNum = Number(amount);
  const overBudget = budget !== null && amount !== '' && amountNum > budget;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (amount === '' || Number.isNaN(amountNum) || amountNum <= 0) {
      toast('Enter a valid bid amount', { type: 'error' });
      return;
    }
    const daysNum = Number(days);
    try {
      setSubmitting(true);
      await api.post(`/requirements/${requirement.id}/bids`, {
        amount: amountNum,
        message: message.trim() || undefined,
        delivery_days: days !== '' && daysNum > 0 ? daysNum : undefined,
      });
      toast(myBid ? 'Your bid has been updated' : 'Your bid has been placed', { type: 'success' });
      setAmount('');
      setDays('');
      setMessage('');
      onPlaced();
    } catch (err) {
      toast(err.response?.data?.message || 'Could not place your bid', { type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card hover={false} className="p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <h2 className="font-display text-lg font-semibold text-ink-900">{myBid ? 'Update your bid' : 'Place a bid'}</h2>
        {budget !== null && <span className="text-xs text-ink-500">Client budget {formatInr(budget)}</span>}
      </div>

      {status === 'open' ? (
        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          {myBid && (
            <div className="rounded-2xl bg-amber-50/80 border border-amber-200/60 p-3 text-xs text-amber-800">
              <div className="flex items-center justify-between font-bold">
                <span>Your current bid</span>
                <span>{formatInr(myBid.amount)}</span>
              </div>
            </div>
          )}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
            <Field label="Delivery in (days)">
              <TextInput type="number" min="1" step="1" value={days} onChange={(e) => setDays(e.target.value)} placeholder="e.g. 7" />
            </Field>
          </div>
          {overBudget && (
            <p className="text-xs text-amber-700">
              This is {formatInr(amountNum - budget)} over the client&apos;s budget. They may prefer a lower quote.
            </p>
          )}
          <Field label="Cover message (optional)">
            <TextArea rows={4} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Availability, experience, guarantees..." />
          </Field>
          <Button type="submit" fullWidth size="sm" loading={submitting} icon={<Gavel size={14} aria-hidden="true" />}>
            {myBid ? 'Update your bid' : 'Submit bid'}
          </Button>
          {SEAL_BIDS_FROM_OTHER_PROVIDERS && (
            <p className="flex items-center justify-center gap-1.5 text-[11px] text-ink-400">
              <Lock size={11} aria-hidden="true" />
              Your amount is sealed. Only the client can see it.
            </p>
          )}
        </form>
      ) : (
        <p className="mt-4 rounded-2xl border border-dashed border-ink-200 bg-ink-50/50 p-4 text-center text-xs text-ink-500">
          This requirement is no longer open for bids.
        </p>
      )}
    </Card>
  );
}

function InterestCard({ requirement, onRequirementUpdated }) {
  const { toast } = useToast();
  const [interested, setInterested] = useState(!!requirement.i_am_interested);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    setInterested(!!requirement.i_am_interested);
  }, [requirement.i_am_interested]);

  const handleInterest = async () => {
    if (interested) return;
    try {
      setSending(true);
      await api.post(`/requirements/${requirement.id}/interest`, {});
      setInterested(true);
      onRequirementUpdated?.({ i_am_interested: true });
      toast('The customer has been notified', { type: 'success' });
    } catch (err) {
      if (err.response?.status === 409) {
        setInterested(true);
        onRequirementUpdated?.({ i_am_interested: true });
      }
      toast(err.response?.data?.message || 'Could not send interest', { type: 'error' });
    } finally {
      setSending(false);
    }
  };

  return (
    <Card hover={false} className="p-5 sm:p-6">
      <h2 className="font-display text-lg font-semibold text-ink-900">Interested in this job?</h2>
      <p className="mt-2 text-sm text-ink-500">
        This is a fixed-price post. Let the customer know you&apos;re available and they may hire you directly.
      </p>
      {requirement.status === 'open' ? (
        <Button
          className="mt-4"
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
        <p className="mt-4 rounded-2xl border border-dashed border-ink-200 bg-ink-50/50 p-4 text-center text-xs text-ink-500">
          This requirement is no longer open.
        </p>
      )}
    </Card>
  );
}

const firstNumber = (...vals) => vals.find((v) => typeof v === 'number' && !Number.isNaN(v));

function ProposalItem({ bid, requirement, isOwner, canHire, onHired }) {
  const { toast } = useToast();
  const [expanded, setExpanded] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [hiring, setHiring] = useState(false);

  const provider = bid.provider || {};
  const budget = typeof requirement.budget === 'number' ? requirement.budget : null;
  const sealed = SEAL_BIDS_FROM_OTHER_PROVIDERS && !isOwner && !bid.is_mine;
  const message = (bid.message || '').trim();
  const isLong = message.length > 220;
  const accepted = bid.status === 'accepted';
  const hireable = isOwner && canHire && !accepted && bid.status !== 'rejected' && bid.status !== 'withdrawn';

  const services = provider.services || [];
  const rating = firstNumber(provider.avg_rating, provider.rating);
  const reviews = firstNumber(provider.reviews_count, provider.review_count, provider.total_reviews) ?? 0;
  const jobsDone = firstNumber(provider.jobs_completed, provider.completed_jobs, provider.jobs_done) ?? 0;
  const years = firstNumber(provider.experience_years, provider.years_experience);
  const distance = firstNumber(provider.distance_km, bid.distance_km);
  const location = provider.location?.text || provider.city || provider.location_text;
  const headline = provider.headline || provider.title || (services[0] ? `${services[0]} Specialist` : null);
  const hasRating = typeof rating === 'number' && rating > 0 && reviews > 0;

  let budgetNote = null;
  if (isOwner && budget !== null && !sealed) {
    const diff = Number(bid.amount) - budget;
    if (diff <= 0) budgetNote = { tone: 'good', text: diff === 0 ? 'Matches your budget' : `${formatInr(-diff)} under budget` };
    else budgetNote = { tone: 'warn', text: `${formatInr(diff)} over budget` };
  }

  const handleHire = async () => {
    try {
      setHiring(true);
      await api.post(hireBidUrl(requirement.id, bid.id), {});
      toast(`${provider.name || 'Provider'} has been hired`, { type: 'success' });
      setConfirming(false);
      onHired();
    } catch (err) {
      toast(err.response?.data?.message || 'Could not hire this provider', { type: 'error' });
    } finally {
      setHiring(false);
    }
  };

  return (
    <div
      className={`rounded-3xl border bg-white p-5 shadow-soft sm:p-6 ${
        accepted ? 'border-trust-500/60 ring-1 ring-trust-500/20' : bid.is_mine ? 'border-brand-300 ring-1 ring-brand-200/60' : 'border-brand-200/70'
      }`}
    >
      <div className="flex items-start gap-4">
        <div className="relative shrink-0">
          <img
            src={provider.avatar_url || AVATAR_FALLBACK}
            alt=""
            className="h-16 w-16 rounded-2xl object-cover ring-1 ring-ink-100 sm:h-[72px] sm:w-[72px]"
          />
          <span
            className={`absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-white ${
              provider.is_online ? 'bg-trust-500' : 'bg-ink-300'
            }`}
            aria-hidden="true"
          />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <h3 className="truncate font-display text-lg font-semibold text-brand-600">{provider.name || 'Provider'}</h3>
            {provider.is_verified && <BadgeCheck size={17} className="shrink-0 text-brand-500" aria-label="Verified" />}
            {bid.is_mine && <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-bold text-brand-700">You</span>}
          </div>

          {headline && <p className="mt-0.5 text-sm font-medium text-ink-500">{headline}</p>}

          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
            <span className="flex items-center gap-1 font-semibold text-ink-900">
              <Star size={14} className="fill-amber-400 text-amber-400" aria-hidden="true" />
              {hasRating ? rating.toFixed(1) : 'New'}
              <span className="font-normal text-ink-400">({reviews})</span>
            </span>
            {location && (
              <span className="flex items-center gap-1 text-ink-500">
                <MapPin size={13} className="text-ink-400" aria-hidden="true" />
                {location}
              </span>
            )}
            {typeof distance === 'number' && (
              <span className="text-xs font-semibold text-brand-600">{distance < 1 ? '<1 km away' : `${Math.round(distance * 10) / 10} km away`}</span>
            )}
          </div>
        </div>

        <div className="shrink-0 text-right">
          {sealed ? (
            <p className="font-display text-lg font-semibold text-ink-300">₹ ••••</p>
          ) : (
            <p className="font-display text-xl font-bold text-ink-900">{formatInr(bid.amount)}</p>
          )}
          {!sealed && bid.delivery_days > 0 && (
            <p className="mt-0.5 text-xs text-ink-500">
              in {bid.delivery_days} {bid.delivery_days === 1 ? 'day' : 'days'}
            </p>
          )}
          <p className="mt-1 text-[11px] text-ink-400">{timeAgo(bid.createdAt)}</p>
        </div>
      </div>

      {message && !sealed && (
        <p className="mt-4 whitespace-pre-line text-sm font-medium leading-relaxed text-ink-700">
          {isLong && !expanded ? `${message.slice(0, 220).trimEnd()}… ` : message}
          {isLong && (
            <button type="button" onClick={() => setExpanded((v) => !v)} className="font-semibold text-brand-600 hover:underline">
              {expanded ? ' less' : 'more'}
            </button>
          )}
        </p>
      )}
      {message && sealed && (
        <p className="mt-4 flex items-center gap-1.5 text-xs text-ink-400">
          <Lock size={12} aria-hidden="true" />
          Cover message is only visible to the client.
        </p>
      )}

      {services.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {services.slice(0, 4).map((svc) => (
            <span key={svc} className="rounded-full border border-brand-100 bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">
              {svc}
            </span>
          ))}
          {services.length > 4 && <span className="self-center text-xs text-ink-400">+{services.length - 4} more</span>}
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-ink-100 pt-3">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-medium text-ink-500">
          <span className="flex items-center gap-1.5">
            <Briefcase size={14} className="text-ink-400" aria-hidden="true" />
            {jobsDone} {jobsDone === 1 ? 'job' : 'jobs'} done
          </span>
          {typeof years === 'number' && years > 0 && <span>{years}+ yrs exp</span>}
          <StatusBadge status={bid.status} kind="bid" className="text-[10px]" />
          {sealed && (
            <span className="inline-flex items-center gap-1 rounded-full bg-brand-100 px-2.5 py-0.5 text-[10px] font-bold text-brand-700">
              <Lock size={10} aria-hidden="true" />
              Sealed
            </span>
          )}
          {budgetNote && (
            <span
              className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                budgetNote.tone === 'good' ? 'bg-trust-50 text-trust-700' : 'bg-amber-50 text-amber-800'
              }`}
            >
              {budgetNote.text}
            </span>
          )}
        </div>

        {hireable && (
          <div className="flex items-center gap-2">
            {confirming ? (
              <>
                <button
                  type="button"
                  onClick={() => setConfirming(false)}
                  disabled={hiring}
                  className="text-xs font-medium text-ink-500 hover:text-ink-800"
                >
                  Cancel
                </button>
                <Button size="sm" loading={hiring} onClick={handleHire} icon={<Check size={14} aria-hidden="true" />}>
                  Confirm hire
                </Button>
              </>
            ) : (
              <Button size="sm" onClick={() => setConfirming(true)}>
                Hire {formatInr(bid.amount)}
              </Button>
            )}
          </div>
        )}
        {accepted && (
          <span className="inline-flex items-center gap-1 text-sm font-semibold text-trust-700">
            <BadgeCheck size={16} aria-hidden="true" />
            Hired
          </span>
        )}
      </div>
    </div>
  );
}

function ProposalsCard({ bids, loading, isOwner, requirement, requirementStatus, onHired }) {
  const [sort, setSort] = useState('newest');
  const canHire = requirementStatus === 'open';

  const sorted = useMemo(() => {
    const list = [...bids];
    if (sort === 'lowest') list.sort((a, b) => Number(a.amount) - Number(b.amount));
    return list;
  }, [bids, sort]);

  const showLowest = (isOwner || !SEAL_BIDS_FROM_OTHER_PROVIDERS) && bids.length > 1;
  const lowest = showLowest ? Math.min(...bids.map((b) => Number(b.amount))) : null;

  return (
    <Card hover={false} className="p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-baseline gap-3">
          <h2 className="font-display text-lg font-semibold text-ink-900">Proposals ({bids.length})</h2>
          {lowest !== null && (
            <span className="text-xs text-ink-500">
              Lowest <span className="font-semibold text-ink-800">{formatInr(lowest)}</span>
            </span>
          )}
        </div>

        {isOwner && bids.length > 1 && (
          <div role="group" aria-label="Sort proposals" className="flex rounded-full border border-ink-200 p-0.5 text-xs font-medium">
            {[
              { id: 'newest', label: 'Newest' },
              { id: 'lowest', label: 'Lowest price' },
            ].map((o) => (
              <button
                key={o.id}
                type="button"
                aria-pressed={sort === o.id}
                onClick={() => setSort(o.id)}
                className={`rounded-full px-3 py-1 transition-colors ${
                  sort === o.id ? 'bg-brand-600 text-white' : 'text-ink-600 hover:text-brand-600'
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {isOwner && typeof requirement.budget === 'number' && (
        <p className="mt-2 text-xs text-ink-500">Your budget: {formatInr(requirement.budget)}</p>
      )}

      {loading ? (
        <div className="flex justify-center py-8">
          <Spinner size={20} />
        </div>
      ) : bids.length === 0 ? (
        <p className="mt-4 rounded-2xl border border-dashed border-ink-200 bg-ink-50/50 p-4 text-center text-xs text-ink-500">
          {isOwner ? 'No bids yet. Providers near you have been notified.' : 'No bids yet - be the first to quote.'}
        </p>
      ) : (
        <div className="mt-4 space-y-3">
          {sorted.map((bid) => (
            <ProposalItem
              key={bid.id}
              bid={bid}
              requirement={requirement}
              isOwner={isOwner}
              canHire={canHire}
              onHired={onHired}
            />
          ))}
        </div>
      )}
    </Card>
  );
}

function useInterestedProviders(requirementId, enabled) {
  const [interested, setInterested] = useState([]);
  const [meta, setMeta] = useState({ hired_provider: null, booking_status: null });
  const [loading, setLoading] = useState(enabled);
  const [failed, setFailed] = useState(false);

  const load = useCallback(() => {
    if (!enabled) return;
    setLoading(true);
    api
      .get(`/requirements/${requirementId}/interested`)
      .then(({ data }) => {
        setInterested(data.interested_providers || []);
        setMeta({ hired_provider: data.hired_provider, booking_status: data.booking_status });
        setFailed(false);
      })
      .catch(() => {
        setInterested([]);
        setFailed(true);
      })
      .finally(() => setLoading(false));
  }, [requirementId, enabled]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!enabled) return undefined;
    const token = typeof window !== 'undefined' ? localStorage.getItem('karyantrix_token') : null;
    const socket = getSocket(token);
    if (!socket) return undefined;

    const refresh = (payload) => {
      if (payload?.requirement_id !== requirementId) return;
      load();
    };
    socket.on('requirement_interest', refresh);
    socket.on('requirement_status_changed', refresh);

    return () => {
      socket.off('requirement_interest', refresh);
      socket.off('requirement_status_changed', refresh);
    };
  }, [requirementId, enabled, load]);

  return { interested, meta, loading, failed, reload: load };
}

function InterestedProviderItem({ entry, requirement, isHired, canHire, onHired }) {
  const { toast } = useToast();
  const [confirming, setConfirming] = useState(false);
  const [hiring, setHiring] = useState(false);

  const provider = entry.provider || {};
  const rating = firstNumber(provider.avg_rating, provider.rating);
  const reviews = firstNumber(provider.reviews_count, provider.review_count, provider.total_reviews) ?? 0;
  const jobsDone = firstNumber(provider.jobs_completed, provider.completed_jobs, provider.jobs_done) ?? 0;
  const hasRating = typeof rating === 'number' && rating > 0 && reviews > 0;
  const hireable = canHire && !isHired;

  const handleHire = async () => {
    try {
      setHiring(true);
      await api.patch(`/requirements/${requirement.id}/interested/${provider.id}/hire`);
      toast(`${provider.name || 'Provider'} has been hired — pay the advance from Bookings to confirm`, {
        type: 'success',
      });
      setConfirming(false);
      onHired();
    } catch (err) {
      toast(err.response?.data?.message || 'Could not hire this provider', { type: 'error' });
    } finally {
      setHiring(false);
    }
  };

  return (
    <div
      className={`rounded-3xl border bg-white p-5 shadow-soft sm:p-6 ${
        isHired ? 'border-trust-500/60 ring-1 ring-trust-500/20' : 'border-brand-200/70'
      }`}
    >
      <div className="flex items-start gap-4">
        <div className="relative shrink-0">
          <img
            src={provider.avatar_url || AVATAR_FALLBACK}
            alt=""
            className="h-16 w-16 rounded-2xl object-cover ring-1 ring-ink-100 sm:h-[72px] sm:w-[72px]"
          />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <h3 className="truncate font-display text-lg font-semibold text-brand-600">{provider.name || 'Provider'}</h3>
            {provider.is_verified && <BadgeCheck size={17} className="shrink-0 text-brand-500" aria-label="Verified" />}
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
            <span className="flex items-center gap-1 font-semibold text-ink-900">
              <Star size={14} className="fill-amber-400 text-amber-400" aria-hidden="true" />
              {hasRating ? rating.toFixed(1) : 'New'}
              <span className="font-normal text-ink-400">({reviews})</span>
            </span>
          </div>
        </div>

        <div className="shrink-0 text-right">
          <p className="text-[11px] text-ink-400">{timeAgo(entry.created_at)}</p>
        </div>
      </div>

      {entry.message && (
        <p className="mt-4 whitespace-pre-line text-sm font-medium leading-relaxed text-ink-700">{entry.message}</p>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-ink-100 pt-3">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-medium text-ink-500">
          <span className="flex items-center gap-1.5">
            <Briefcase size={14} className="text-ink-400" aria-hidden="true" />
            {jobsDone} {jobsDone === 1 ? 'job' : 'jobs'} done
          </span>
          {!isHired && (
            <span className="inline-flex items-center rounded-full bg-brand-50 px-2.5 py-0.5 text-[10px] font-bold text-brand-700">
              Interested
            </span>
          )}
        </div>

        {hireable && (
          <div className="flex items-center gap-2">
            {confirming ? (
              <>
                <button
                  type="button"
                  onClick={() => setConfirming(false)}
                  disabled={hiring}
                  className="text-xs font-medium text-ink-500 hover:text-ink-800"
                >
                  Cancel
                </button>
                <Button size="sm" loading={hiring} onClick={handleHire} icon={<Check size={14} aria-hidden="true" />}>
                  Confirm hire
                </Button>
              </>
            ) : (
              <Button size="sm" onClick={() => setConfirming(true)}>
                Hire
              </Button>
            )}
          </div>
        )}
        {isHired && (
          <span className="inline-flex items-center gap-1 text-sm font-semibold text-trust-700">
            <BadgeCheck size={16} aria-hidden="true" />
            Hired
          </span>
        )}
      </div>
    </div>
  );
}

function InterestedProvidersCard({ requirement, isOwner, canHire, onHired }) {
  const { interested, meta, loading } = useInterestedProviders(requirement.id, true);

  const sorted = useMemo(
    () => [...interested].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)),
    [interested]
  );

  return (
    <Card hover={false} className="p-5 sm:p-6">
      <h2 className="font-display text-lg font-semibold text-ink-900">Interested providers ({interested.length})</h2>

      {meta.hired_provider && (
        <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl bg-trust-50 border border-trust-200/80 p-3.5 text-xs text-trust-900">
          <span className="flex items-center gap-2 font-medium">
            <Check size={16} className="shrink-0 text-trust-600" aria-hidden="true" />
            <span>{isOwner ? "You've hired a provider for this job." : 'This job has been filled.'}</span>
          </span>
          {isOwner && meta.booking_status !== 'completed' && (
            <Link
              href="/bookings"
              className="flex shrink-0 items-center gap-1.5 font-bold text-trust-800 hover:text-trust-900 bg-trust-100/70 hover:bg-trust-100 px-3 py-1 rounded-xl transition-colors"
            >
              <Wallet size={13} aria-hidden="true" />
              <span>Go to Bookings</span>
            </Link>
          )}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-8">
          <Spinner size={20} />
        </div>
      ) : interested.length === 0 ? (
        <p className="mt-4 rounded-2xl border border-dashed border-ink-200 bg-ink-50/50 p-4 text-center text-xs text-ink-500">
          No one has shown interest yet. Nearby providers will be notified and can tap &quot;I&apos;m interested&quot;
          anytime.
        </p>
      ) : (
        <div className="mt-4 space-y-3">
          {sorted.map((entry, idx) => (
            <InterestedProviderItem
              key={entry.provider?.id || idx}
              entry={entry}
              requirement={requirement}
              isHired={!!(meta.hired_provider && entry.provider?.id === meta.hired_provider)}
              canHire={canHire && !meta.hired_provider}
              onHired={onHired}
            />
          ))}
        </div>
      )}
    </Card>
  );
}

function RequirementDetailView({ requirement, isOwner, isProvider, onRequirementUpdated }) {
  const { toast } = useToast();
  const router = useRouter();
  const [tab, setTab] = useState('details');
  const [editOpen, setEditOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const isFixedPrice = requirement.post_type === 'fixed';
  const canSeeBids = !isFixedPrice && (isOwner || isProvider);
  const canSeeInterested = isFixedPrice && (isOwner || isProvider);
  const { bids, status: bidsStatus, loading: bidsLoading, failed: bidsFailed, reload: reloadBids } = useRequirementBids(
    requirement.id,
    canSeeBids,
    requirement.status
  );

  const tabs = [
    { id: 'details', label: 'Details' },
    ...((canSeeBids && !bidsFailed) || canSeeInterested ? [{ id: 'proposals', label: 'Proposals' }] : []),
  ];
  const activeTab = tabs.some((t) => t.id === tab) ? tab : 'details';

  const title = (requirement.services || []).join(', ') || 'Requirement';
  const myBid = bids.find((b) => b.is_mine);
  const canEditOrDelete = isOwner && requirement.status === 'open';

  const handleDelete = async () => {
    if (!window.confirm('Delete this requirement? This cannot be undone.')) return;
    try {
      setDeleting(true);
      await api.delete(`/requirements/${requirement.id}`);
      toast('Requirement deleted', { type: 'success' });
      router.push('/requirements');
    } catch (err) {
      toast(err.response?.data?.message || 'Could not delete this requirement', { type: 'error' });
      setDeleting(false);
    }
  };

  const amountsVisible = isOwner || !SEAL_BIDS_FROM_OTHER_PROVIDERS;
  let stats;
  if (canSeeBids && !bidsLoading && !bidsFailed) {
    const average = bids.length > 0 ? Math.round(bids.reduce((sum, b) => sum + (Number(b.amount) || 0), 0) / bids.length) : null;
    stats = [{ label: 'Bids', value: bids.length }];
    if (amountsVisible) stats.push({ label: 'Average bid', value: average === null ? '—' : formatInr(average) });
  } else {
    stats = [{ label: 'Type', value: isFixedPrice ? 'Fixed price' : 'Open to bids' }];
  }

  const handleShare = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title, url });
      } else {
        await navigator.clipboard.writeText(url);
        toast('Link copied to clipboard', { type: 'success' });
      }
    } catch (err) {
      if (err?.name !== 'AbortError') toast('Could not share this link', { type: 'error' });
    }
  };

  const handleHired = () => {
    reloadBids();
    onRequirementUpdated({ status: 'assigned' });
  };

  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2">
          <h1 className="font-display text-xl font-semibold tracking-tight text-ink-900 sm:text-2xl">{title}</h1>
          <StatusBadge status={requirement.status} kind="requirement" />
        </div>

        <div className="flex shrink-0 items-end gap-3">
          {stats.map((stat, i) => (
            <Fragment key={stat.label}>
              {i > 0 && (
                <span aria-hidden="true" className="pb-1 text-ink-300">
                  •
                </span>
              )}
              <div className="sm:text-right">
                <p className="text-xs font-medium text-ink-500 sm:text-sm">{stat.label}</p>
                <p className="mt-0.5 font-display text-lg font-semibold text-ink-900 sm:text-xl">{stat.value}</p>
              </div>
            </Fragment>
          ))}
        </div>
      </div>

      <div className="mt-4 flex items-end justify-between gap-3 border-b border-ink-200">
        <div role="tablist" aria-label="Requirement sections" className="-mb-px flex gap-6">
          {tabs.map((t) => {
            const active = t.id === activeTab;
            return (
              <button
                key={t.id}
                type="button"
                role="tab"
                id={`requirement-tab-${t.id}`}
                aria-selected={active}
                aria-controls={`requirement-panel-${t.id}`}
                onClick={() => setTab(t.id)}
                className={`border-b-2 px-1 pb-3 pt-2 text-sm font-medium transition-colors ${
                  active ? 'border-brand-600 text-brand-600' : 'border-transparent text-ink-700 hover:text-brand-600'
                }`}
              >
                {t.label}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-1.5 pb-2">
          {isOwner && canEditOrDelete && (
            <>
              <Button size="sm" variant="ghost" onClick={() => setEditOpen(true)} icon={<Pencil size={14} aria-hidden="true" />}>
                Edit
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleDelete}
                loading={deleting}
                className="text-danger-600 hover:text-danger-700 hover:bg-danger-50"
                icon={<Trash2 size={14} aria-hidden="true" />}
              >
                Delete
              </Button>
            </>
          )}
          <button
            type="button"
            onClick={handleShare}
            aria-label="Share this requirement"
            className="grid h-9 w-9 place-items-center rounded-full text-ink-500 transition-colors hover:bg-ink-100 hover:text-brand-600"
          >
            <Share2 size={18} aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
        <div
          role="tabpanel"
          id={`requirement-panel-${activeTab}`}
          aria-labelledby={`requirement-tab-${activeTab}`}
          className="space-y-5"
        >
          {activeTab === 'details' ? (
            <>
              <ProjectDetailsCard requirement={requirement} />
              {isProvider && isFixedPrice && (
                <InterestCard requirement={requirement} onRequirementUpdated={onRequirementUpdated} />
              )}
              {isProvider && !isFixedPrice && (
                <Card hover={false} className="p-5 sm:p-6">
                  <h2 className="font-display text-lg font-semibold text-ink-900">
                    {myBid ? 'You have bid on this job' : 'Want this job?'}
                  </h2>
                  <p className="mt-2 text-sm text-ink-500">
                    {myBid
                      ? `Your current quote is ${formatInr(myBid.amount)}. You can revise it from the Proposals tab.`
                      : 'Send your quote from the Proposals tab.'}
                  </p>
                  <Button className="mt-4" size="sm" onClick={() => setTab('proposals')} icon={<Gavel size={14} aria-hidden="true" />}>
                    {myBid ? 'Update your bid' : 'Place a bid'}
                  </Button>
                </Card>
              )}
            </>
          ) : (
            <>
              {isProvider && !isFixedPrice && (
                <BidFormCard requirement={requirement} status={bidsStatus} myBid={myBid} onPlaced={reloadBids} />
              )}
              {canSeeBids && (
                <ProposalsCard
                  bids={bids}
                  loading={bidsLoading}
                  isOwner={isOwner}
                  requirement={requirement}
                  requirementStatus={bidsStatus}
                  onHired={handleHired}
                />
              )}
              {canSeeInterested && (
                <InterestedProvidersCard
                  requirement={requirement}
                  isOwner={isOwner}
                  canHire={isOwner && requirement.status === 'open'}
                  onHired={handleHired}
                />
              )}
            </>
          )}
        </div>

        <ClientPanel requirement={requirement} />
      </div>

      {canEditOrDelete && (
        <RequirementComposerModal
          open={editOpen}
          onClose={() => setEditOpen(false)}
          requirement={requirement}
          onSaved={onRequirementUpdated}
        />
      )}
    </>
  );
}

export default function RequirementDetailClient({ initialRequirement = null }) {
  const { id } = useParams();
  const { user } = useAuth();
  const { coords } = useGeolocation();
  const [requirement, setRequirement] = useState(initialRequirement);
  const [loading, setLoading] = useState(!initialRequirement);
  const [notFound, setNotFound] = useState(false);

  const skippedInitialFetch = useRef(!!initialRequirement);

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
    if (skippedInitialFetch.current) {
      skippedInitialFetch.current = false;
      return;
    }
    setLoading(true);
    reload();
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

  return (
    <div className="mx-auto max-w-6xl animate-fade-in-up">
      <BackButton />

      <RequirementDetailView
        key={requirement.id}
        requirement={requirement}
        isOwner={isOwner}
        isProvider={isProvider}
        onRequirementUpdated={(updated) => {
          setRequirement((prev) => ({ ...prev, ...updated }));
          reload();
        }}
      />
    </div>
  );
}
