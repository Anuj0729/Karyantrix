'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Check, Gavel, Wallet, X } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';
import { getSocket } from '../lib/socket';
import ReviewForm from './ReviewForm';
import StatusBadge from './StatusBadge';
import Button from './ui/Button';
import { Field, TextArea, TextInput } from './ui/Field';
import Spinner from './ui/Spinner';
import { useToast } from './ui/Toast';

const AVATAR_FALLBACK = 'https://i.pravatar.cc/300?img=8';
const avatarUrl = (url) => (!url ? null : url);

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

function ProviderBidForm({ requirement, existingBid, onPlaced }) {
  const { toast } = useToast();
  const [amount, setAmount] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const amountNum = Number(amount);
    if (amount === '' || Number.isNaN(amountNum) || amountNum <= 0) {
      setError('Enter a valid bid amount');
      return;
    }
    try {
      setSubmitting(true);
      const { data } = await api.post(`/requirements/${requirement.id}/bids`, {
        amount: amountNum,
        message: message.trim() || undefined,
      });
      toast('Your bid has been placed', { type: 'success' });
      setAmount('');
      setMessage('');
      onPlaced?.(data.bid);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not place your bid');
    } finally {
      setSubmitting(false);
    }
  };

  if (requirement.status !== 'open') {
    return (
      <div className="py-8 text-center text-sm text-ink-500 bg-ink-50/50 rounded-2xl border border-dashed border-ink-200">
        This requirement is no longer open for bids.
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="rounded-2xl bg-brand-50/70 border border-brand-100/80 p-3.5 flex items-center justify-between">
        <span className="text-xs font-semibold text-brand-900">Customer&apos;s Budget</span>
        <span className="font-display text-base font-bold text-brand-700">₹{requirement.budget?.toLocaleString('en-IN')}</span>
      </div>

      {existingBid && (
        <div className="rounded-2xl bg-amber-50/80 border border-amber-200/60 p-3 text-xs text-amber-800 flex flex-col gap-1">
          <div className="flex items-center justify-between font-bold">
            <span>Your Previous Bid:</span>
            <span>₹{existingBid.amount?.toLocaleString('en-IN')}</span>
          </div>
          <p className="text-[11px] text-amber-700">Submitting below will post an updated bid to the customer.</p>
        </div>
      )}

      <Field label="Your proposed bid amount" required hint="Competitive pricing improves your chances of being hired">
        <TextInput
          type="number"
          min="0"
          step="1"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="e.g. 1200"
          icon={<span>₹</span>}
          required
        />
      </Field>

      <Field label="Proposal message (optional)" hint="Highlight your availability, guarantees, or experience">
        <TextArea
          rows={3}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="e.g. I can visit tomorrow morning. 5+ years experience with guaranteed workmanship..."
        />
      </Field>

      {error && (
        <div className="p-3 rounded-2xl bg-danger-50 border border-danger-200 text-xs text-danger-700 font-medium">
          {error}
        </div>
      )}

      <Button type="submit" fullWidth loading={submitting} icon={<Gavel size={16} aria-hidden="true" />}>
        {existingBid ? 'Update your bid' : 'Submit bid proposal'}
      </Button>
    </form>
  );
}

function BidsList({ requirement, onRequirementUpdated }) {
  const { toast } = useToast();
  const [bids, setBids] = useState([]);
  const [meta, setMeta] = useState({
    requirement_status: requirement.status,
    hired_provider: null,
    reviewed: false,
    review: null,
    booking_status: null,
  });
  const [loading, setLoading] = useState(true);
  const [acceptingId, setAcceptingId] = useState(null);

  const load = () => {
    setLoading(true);
    api
      .get(`/requirements/${requirement.id}/bids`)
      .then(({ data }) => {
        setBids(data.bids || []);
        setMeta({
          requirement_status: data.requirement_status,
          hired_provider: data.hired_provider,
          reviewed: data.reviewed,
          review: data.review,
          booking_status: data.booking_status,
        });
      })
      .catch(() => setBids([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [requirement.id]);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('karyantrix_token') : null;
    const socket = getSocket(token);
    if (!socket) return undefined;

    const onBid = (payload) => {
      if (payload.requirement_id !== requirement.id) return;
      setBids((prev) => {
        const withoutOld = prev.filter((b) => b.provider?.id !== payload.bid.provider?.id);
        return [payload.bid, ...withoutOld];
      });
    };

    socket.on('requirement_bid', onBid);

    const onStatusChange = (payload) => {
      if (payload.requirement_id !== requirement.id) return;
      load();
    };
    socket.on('bid_status_changed', onStatusChange);
    socket.on('requirement_status_changed', onStatusChange);

    return () => {
      socket.off('requirement_bid', onBid);
      socket.off('bid_status_changed', onStatusChange);
      socket.off('requirement_status_changed', onStatusChange);
    };
  }, [requirement.id]);

  const handleAccept = async (bid) => {
    setAcceptingId(bid.id);
    try {
      await api.patch(`/requirements/${requirement.id}/bids/${bid.id}/accept`);
      toast(`${bid.provider?.name || 'Provider'} has been hired — pay the advance from Bookings to confirm`, { type: 'success' });
      onRequirementUpdated?.({ ...requirement, status: 'closed' });
      load();
    } catch (err) {
      toast(err.response?.data?.message || 'Could not accept this bid', { type: 'error' });
    } finally {
      setAcceptingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <Spinner size={24} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {meta.requirement_status === 'closed' && (
        <div className="flex items-center justify-between gap-3 rounded-2xl bg-trust-50 border border-trust-200/80 p-3.5 text-xs text-trust-900">
          <span className="flex items-center gap-2 font-medium">
            <Check size={16} className="shrink-0 text-trust-600" aria-hidden="true" />
            <span>You&apos;ve hired a provider for this job.</span>
          </span>
          {meta.booking_status !== 'completed' && (
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

      {bids.length === 0 ? (
        <div className="py-10 text-center rounded-2xl border border-dashed border-ink-200 bg-ink-50/50 p-6">
          <p className="text-xs font-medium text-ink-500">No bids received yet.</p>
          <p className="mt-1 text-[11px] text-ink-400">Nearby providers will be notified and can submit proposals anytime.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {bids
            .slice()
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .map((bid) => (
              <div
                key={bid.id}
                className="group flex items-start gap-3 rounded-2xl border border-ink-200/80 hover:border-ink-300 bg-white p-4 shadow-soft transition-all duration-200"
              >
                <img
                  src={avatarUrl(bid.provider?.avatar_url) || AVATAR_FALLBACK}
                  alt={bid.provider?.name || 'Provider'}
                  className="h-10 w-10 shrink-0 rounded-2xl object-cover ring-2 ring-ink-100 shadow-soft"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-bold text-ink-900">{bid.provider?.name || 'Provider'}</p>
                    <span className="shrink-0 font-display text-sm font-bold text-brand-600 bg-brand-50 px-2.5 py-0.5 rounded-lg border border-brand-100/60">
                      ₹{bid.amount?.toLocaleString('en-IN')}
                    </span>
                  </div>
                  {bid.message && (
                    <p className="mt-1.5 text-xs text-ink-600 bg-ink-50/60 p-2.5 rounded-xl border border-ink-100 leading-relaxed">
                      {bid.message}
                    </p>
                  )}
                  <div className="mt-2.5 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <StatusBadge status={bid.status} kind="bid" />
                      <span className="text-[11px] text-ink-400">{timeAgo(bid.createdAt)}</span>
                    </div>
                    {meta.requirement_status === 'open' && bid.status === 'pending' && (
                      <Button
                        size="sm"
                        variant="primary"
                        loading={acceptingId === bid.id}
                        onClick={() => handleAccept(bid)}
                        icon={<Check size={14} aria-hidden="true" />}
                      >
                        Accept &amp; hire
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
        </div>
      )}

      {meta.requirement_status === 'closed' && meta.hired_provider && meta.booking_status === 'completed' && (
        <ReviewForm
          requirementId={requirement.id}
          existingReview={meta.review}
          onSaved={(review) => setMeta((prev) => ({ ...prev, reviewed: true, review }))}
          className="mt-4 border-t border-ink-100 pt-4"
        />
      )}
      {meta.requirement_status === 'closed' && meta.hired_provider && meta.booking_status && meta.booking_status !== 'completed' && (
        <p className="mt-4 border-t border-ink-100 pt-3 text-xs text-center text-ink-400">
          You&apos;ll be able to rate and review this provider once the booking is completed and paid.
        </p>
      )}
    </div>
  );
}

function InterestedProvidersList({ requirement, onRequirementUpdated }) {
  const { toast } = useToast();
  const [interestedProviders, setInterestedProviders] = useState([]);
  const [meta, setMeta] = useState({
    requirement_status: requirement.status,
    hired_provider: null,
    reviewed: false,
    review: null,
    booking_status: null,
  });
  const [loading, setLoading] = useState(true);
  const [hiringId, setHiringId] = useState(null);

  const load = () => {
    setLoading(true);
    api
      .get(`/requirements/${requirement.id}/interested`)
      .then(({ data }) => {
        setInterestedProviders(data.interested_providers || []);
        setMeta({
          requirement_status: data.requirement_status,
          hired_provider: data.hired_provider,
          reviewed: data.reviewed,
          review: data.review,
          booking_status: data.booking_status,
        });
      })
      .catch(() => setInterestedProviders([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [requirement.id]);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('karyantrix_token') : null;
    const socket = getSocket(token);
    if (!socket) return undefined;

    const onInterest = (payload) => {
      if (payload.requirement_id !== requirement.id) return;
      setInterestedProviders((prev) => {
        const withoutOld = prev.filter((i) => i.provider?.id !== payload.interest.provider?.id);
        return [payload.interest, ...withoutOld];
      });
    };
    socket.on('requirement_interest', onInterest);

    const onStatusChange = (payload) => {
      if (payload.requirement_id !== requirement.id) return;
      load();
    };
    socket.on('bid_status_changed', onStatusChange);
    socket.on('requirement_status_changed', onStatusChange);

    return () => {
      socket.off('requirement_interest', onInterest);
      socket.off('bid_status_changed', onStatusChange);
      socket.off('requirement_status_changed', onStatusChange);
    };
  }, [requirement.id]);

  const handleHire = async (providerEntry) => {
    const providerId = providerEntry.provider?.id;
    if (!providerId) return;
    setHiringId(providerId);
    try {
      await api.patch(`/requirements/${requirement.id}/interested/${providerId}/hire`);
      toast(`${providerEntry.provider?.name || 'Provider'} has been hired — pay the advance from Bookings to confirm`, {
        type: 'success',
      });
      onRequirementUpdated?.({ ...requirement, status: 'closed' });
      load();
    } catch (err) {
      toast(err.response?.data?.message || 'Could not hire this provider', { type: 'error' });
    } finally {
      setHiringId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <Spinner size={24} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {meta.requirement_status === 'closed' && (
        <div className="flex items-center justify-between gap-3 rounded-2xl bg-trust-50 border border-trust-200/80 p-3.5 text-xs text-trust-900">
          <span className="flex items-center gap-2 font-medium">
            <Check size={16} className="shrink-0 text-trust-600" aria-hidden="true" />
            <span>You&apos;ve hired a provider for this job.</span>
          </span>
          {meta.booking_status !== 'completed' && (
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

      {interestedProviders.length === 0 ? (
        <div className="py-10 text-center rounded-2xl border border-dashed border-ink-200 bg-ink-50/50 p-6">
          <p className="text-xs font-medium text-ink-500">No one has shown interest yet.</p>
          <p className="mt-1 text-[11px] text-ink-400">
            Nearby providers will be notified and can tap &quot;I&apos;m interested&quot; anytime.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {interestedProviders
            .slice()
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
            .map((entry, idx) => {
              const isHired = meta.hired_provider && entry.provider?.id === meta.hired_provider;
              return (
                <div
                  key={entry.provider?.id || idx}
                  className="group flex items-start gap-3 rounded-2xl border border-ink-200/80 hover:border-ink-300 bg-white p-4 shadow-soft transition-all duration-200"
                >
                  <img
                    src={avatarUrl(entry.provider?.avatar_url) || AVATAR_FALLBACK}
                    alt={entry.provider?.name || 'Provider'}
                    className="h-10 w-10 shrink-0 rounded-2xl object-cover ring-2 ring-ink-100 shadow-soft"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-bold text-ink-900">{entry.provider?.name || 'Provider'}</p>
                      {isHired && <StatusBadge status="accepted" kind="bid" />}
                    </div>
                    {entry.message && (
                      <p className="mt-1.5 text-xs text-ink-600 bg-ink-50/60 p-2.5 rounded-xl border border-ink-100 leading-relaxed">
                        {entry.message}
                      </p>
                    )}
                    <div className="mt-2.5 flex items-center justify-between gap-2">
                      <span className="text-[11px] text-ink-400">{timeAgo(entry.created_at)}</span>
                      {meta.requirement_status === 'open' && (
                        <Button
                          size="sm"
                          variant="primary"
                          loading={hiringId === entry.provider?.id}
                          onClick={() => handleHire(entry)}
                          icon={<Check size={14} aria-hidden="true" />}
                        >
                          Hire
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
        </div>
      )}

      {meta.requirement_status === 'closed' && meta.hired_provider && meta.booking_status === 'completed' && (
        <ReviewForm
          requirementId={requirement.id}
          existingReview={meta.review}
          onSaved={(review) => setMeta((prev) => ({ ...prev, reviewed: true, review }))}
          className="mt-4 border-t border-ink-100 pt-4"
        />
      )}
      {meta.requirement_status === 'closed' && meta.hired_provider && meta.booking_status && meta.booking_status !== 'completed' && (
        <p className="mt-4 border-t border-ink-100 pt-3 text-xs text-center text-ink-400">
          You&apos;ll be able to rate and review this provider once the booking is completed and paid.
        </p>
      )}
    </div>
  );
}

export default function BidsModal({ open, onClose, requirement, onRequirementUpdated }) {
  const { user } = useAuth();
  const [myBid, setMyBid] = useState(null);
  const isOwner = user?.role === 'customer' && requirement?.customer?.id === user?.id;
  const isProvider = user?.role === 'provider';
  const isFixedPrice = requirement?.post_type === 'fixed';

  useEffect(() => {
    if (!open) return undefined;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  useEffect(() => {
    if (!open || !isProvider || !requirement || isFixedPrice) return;
    api
      .get('/requirements/bids/mine')
      .then(({ data }) => {
        const mine = (data.bids || [])
          .filter((b) => b.requirement?.id === requirement.id)
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
        setMyBid(mine || null);
      })
      .catch(() => setMyBid(null));
  }, [open, isProvider, requirement, isFixedPrice]);

  if (!open || !requirement) return null;
  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex flex-col bg-white"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
      >
        <div className="flex items-start justify-between gap-4 border-b border-ink-100 px-4 py-4 sm:px-8 sticky top-0 bg-white/95 backdrop-blur-md z-10">
          <div className="mx-auto w-full max-w-2xl flex items-start justify-between gap-4">
            <div>
              <h2 className="font-display text-lg font-bold text-ink-900 tracking-tight">
                {isOwner ? (isFixedPrice ? 'Interested Providers' : 'Requirement Bids') : 'Place Your Bid'}
              </h2>
              <p className="text-xs text-ink-500 mt-0.5">
                {isOwner
                  ? isFixedPrice
                    ? 'Review providers who are interested and hire the one you want'
                    : 'Review and accept bids from qualified service providers'
                  : 'Submit a competitive quote to win this job'}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="rounded-full p-2 text-ink-400 hover:text-ink-700 hover:bg-ink-100 transition-colors shrink-0"
            >
              <X size={18} aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-2xl px-4 py-6 sm:px-8">
            {isOwner &&
              (isFixedPrice ? (
                <InterestedProvidersList requirement={requirement} onRequirementUpdated={onRequirementUpdated} />
              ) : (
                <BidsList requirement={requirement} onRequirementUpdated={onRequirementUpdated} />
              ))}
            {isProvider && !isFixedPrice && (
              <ProviderBidForm
                requirement={requirement}
                existingBid={myBid}
                onPlaced={(bid) => {
                  setMyBid(bid);
                }}
              />
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}
