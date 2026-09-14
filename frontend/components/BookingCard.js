'use client';

import { Ban, CheckCircle2, Hammer, IndianRupee, ListChecks, Star, XCircle } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';
import { loadRazorpayScript } from '../lib/loadRazorpay';
import { CANCELLATION_REASON_LABELS } from './CancelBookingModal';
import StatusBadge from './StatusBadge';
import Button from './ui/Button';
import Card from './ui/Card';
import { useToast } from './ui/Toast';
const BookingProgressModal = dynamic(() => import('./BookingProgressModal'));
const ReviewModal = dynamic(() => import('./ReviewModal'));
const CancelBookingModal = dynamic(() => import('./CancelBookingModal'));

const AVATAR_FALLBACK = 'https://i.pravatar.cc/300?img=8';
const avatarUrl = (url) => (!url ? null : url);

export default function BookingCard({ booking, onUpdated }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  const [progressOpen, setProgressOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [myReview, setMyReview] = useState(null);

  const isCustomer = user?.role === 'customer';
  const otherParty = isCustomer ? booking.provider : booking.customer;
  const services = booking.requirement?.services?.join(', ') || 'Requirement';
  const requirementId = booking.requirement?.id;

  useEffect(() => {
    if (!isCustomer || booking.status !== 'completed' || !requirementId) return;
    api
      .get(`/reviews/mine/${requirementId}`)
      .then(({ data }) => setMyReview(data.review))
      .catch(() => setMyReview(null));
  }, [isCustomer, booking.status, requirementId]);

  const payLeg = async (leg) => {
    setBusy(true);
    try {
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded || !window.Razorpay) {
        toast('Could not load the payment window. Check your connection and try again.', { type: 'error' });
        return;
      }

      const { data: order } = await api.post(`/bookings/${booking.id}/${leg}/order`);

      const rzp = new window.Razorpay({
        key: order.key_id,
        amount: order.amount,
        currency: order.currency,
        order_id: order.order_id,
        name: 'Karyantrix',
        description: `${leg === 'advance' ? 'Advance' : 'Final'} payment for ${services}`,
        prefill: {
          name: user?.name,
          email: user?.email,
          contact: user?.phone,
        },
        theme: { color: '#4338ca' },
        handler: async (response) => {
          try {
            await api.post(`/bookings/${booking.id}/${leg}/verify`, {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
            toast(leg === 'advance' ? 'Advance paid — the provider can start work' : 'Balance paid — booking complete', {
              type: 'success',
            });
            if (leg === 'balance') setReviewOpen(true);
            onUpdated?.();
          } catch (err) {
            toast(err.response?.data?.message || 'Payment succeeded but verification failed. Contact support.', { type: 'error' });
          }
        },
        modal: {
          ondismiss: () => setBusy(false),
        },
      });

      rzp.on('payment.failed', () => {
        toast('Payment failed. You can try again.', { type: 'error' });
      });

      rzp.open();
    } catch (err) {
      toast(err.response?.data?.message || 'Could not start payment', { type: 'error' });
    } finally {
      setBusy(false);
    }
  };

  const isAdvancePaid = booking.advance?.status === 'paid';
  const isBalancePaid = booking.balance?.status === 'paid';
  const progressPercent = isBalancePaid ? 100 : isAdvancePaid ? 50 : 10;
  const isCancellable = ['awaiting_advance', 'in_progress'].includes(booking.status);

  return (
    <Card className="p-5 sm:p-6 rounded-3xl border border-ink-200/80 bg-white shadow-soft hover:shadow-card-hover transition-all duration-300" hover={false}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3.5">
          <div className="relative shrink-0">
            <img
              src={avatarUrl(otherParty?.avatar_url) || AVATAR_FALLBACK}
              alt={otherParty?.name || 'User'}
              className="h-12 w-12 rounded-2xl object-cover ring-2 ring-ink-100 shadow-soft"
            />
            <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-trust-500 ring-2 ring-white" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-base font-bold text-ink-900 leading-snug">{services}</p>
            <p className="truncate text-xs text-ink-500 mt-0.5">
              <span className="font-semibold text-ink-700">{isCustomer ? 'Provider' : 'Customer'}:</span> {otherParty?.name || '—'}
            </p>
          </div>
        </div>
        <StatusBadge status={booking.status} kind="booking" className="shrink-0 font-semibold" />
      </div>

      <div className="mt-4 rounded-2xl bg-ink-50/70 border border-ink-100 p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-ink-500">Payment Milestones</span>
          <span className="font-display text-sm font-bold text-ink-900">
            Total: &#8377;{booking.total_amount?.toLocaleString('en-IN')}
          </span>
        </div>

        <div className="h-2 w-full rounded-full bg-ink-200 overflow-hidden mb-3">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              isBalancePaid ? 'bg-trust-500' : isAdvancePaid ? 'bg-brand-500' : 'bg-amber-400'
            }`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <div className="grid grid-cols-2 gap-3 pt-1 border-t border-ink-200/50 text-xs">
          <div className="flex items-center justify-between bg-white rounded-xl p-2.5 border border-ink-100 shadow-xs">
            <div>
              <p className="text-[10px] uppercase font-bold text-ink-400">Advance ({booking.advance_percent}%)</p>
              <p className="font-bold text-ink-900">&#8377;{booking.advance_amount?.toLocaleString('en-IN')}</p>
            </div>
            {isAdvancePaid ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-trust-700 bg-trust-50 px-2 py-0.5 rounded-md border border-trust-200/60">
                <CheckCircle2 size={12} className="text-trust-600" /> Paid
              </span>
            ) : (
              <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/60">
                Pending
              </span>
            )}
          </div>

          <div className="flex items-center justify-between bg-white rounded-xl p-2.5 border border-ink-100 shadow-xs">
            <div>
              <p className="text-[10px] uppercase font-bold text-ink-400">Balance ({100 - booking.advance_percent}%)</p>
              <p className="font-bold text-ink-900">&#8377;{booking.balance_amount?.toLocaleString('en-IN')}</p>
            </div>
            {isBalancePaid ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-trust-700 bg-trust-50 px-2 py-0.5 rounded-md border border-trust-200/60">
                <CheckCircle2 size={12} className="text-trust-600" /> Paid
              </span>
            ) : (
              <span className="text-[11px] font-bold text-ink-400 bg-ink-100/70 px-2 py-0.5 rounded-md">
                Due on completion
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-ink-100">
        {booking.status === 'cancelled' && (
          <div className="space-y-2.5">
            <div className="flex items-center gap-2.5 rounded-2xl bg-red-50 border border-red-100 p-3.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-600">
                <XCircle size={16} aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-red-800">
                  Cancelled by {booking.cancellation?.cancelled_by_role === user?.role ? 'you' : booking.cancellation?.cancelled_by_role}
                </p>
                <p className="mt-0.5 text-[11px] text-red-700 leading-relaxed">
                  {CANCELLATION_REASON_LABELS[booking.cancellation?.reason] || booking.cancellation?.reason}
                  {booking.cancellation?.details ? ` — ${booking.cancellation.details}` : ''}
                </p>
              </div>
            </div>
            {(booking.cancellation?.fee_amount > 0 || booking.cancellation?.refund_amount > 0) && (
              <div className="grid grid-cols-2 gap-2.5 text-xs">
                {booking.cancellation?.fee_amount > 0 && (
                  <div className="rounded-xl bg-ink-50/70 border border-ink-100 p-2.5">
                    <p className="text-[10px] uppercase font-bold text-ink-400">Cancellation fee</p>
                    <p className="font-bold text-ink-900">
                      &#8377;{booking.cancellation.fee_amount.toLocaleString('en-IN')}{' '}
                      <span className="font-normal text-ink-400">({booking.cancellation.fee_percent}%)</span>
                    </p>
                  </div>
                )}
                {booking.cancellation?.refund_amount > 0 && (
                  <div className="rounded-xl bg-ink-50/70 border border-ink-100 p-2.5">
                    <p className="text-[10px] uppercase font-bold text-ink-400">Refund to customer</p>
                    <p className="font-bold text-ink-900">&#8377;{booking.cancellation.refund_amount.toLocaleString('en-IN')}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {isCustomer && booking.status === 'awaiting_advance' && (
          <Button size="md" fullWidth loading={busy} onClick={() => payLeg('advance')} icon={<IndianRupee size={15} aria-hidden="true" />}>
            Pay advance &#8377;{booking.advance_amount?.toLocaleString('en-IN')} to confirm booking
          </Button>
        )}
        {isCustomer && booking.status === 'in_progress' && (
          <Button size="md" variant="secondary" fullWidth onClick={() => setProgressOpen(true)} icon={<ListChecks size={15} aria-hidden="true" />}>
            Track work progress &amp; updates
          </Button>
        )}
        {isCustomer && booking.status === 'work_completed' && (
          <div className="space-y-2.5">
            <Button size="md" fullWidth loading={busy} onClick={() => payLeg('balance')} icon={<IndianRupee size={15} aria-hidden="true" />}>
              Pay remaining balance &#8377;{booking.balance_amount?.toLocaleString('en-IN')}
            </Button>
            <Button size="md" variant="secondary" fullWidth onClick={() => setProgressOpen(true)} icon={<ListChecks size={15} aria-hidden="true" />}>
              Review completed work &amp; photos
            </Button>
          </div>
        )}
        {isCustomer && booking.status === 'completed' && (
          <div className="space-y-2.5">
            <div className="flex items-center justify-center gap-2 py-1.5 px-3 rounded-xl bg-trust-50 text-xs font-bold text-trust-800 border border-trust-100">
              <CheckCircle2 size={15} className="text-trust-600" />
              <span>Paid in full &mdash; Job completed successfully!</span>
            </div>
            <Button
              size="md"
              variant="secondary"
              fullWidth
              onClick={() => setReviewOpen(true)}
              icon={<Star size={15} className="text-gold-500 fill-gold-500" aria-hidden="true" />}
            >
              {myReview ? 'Update your review' : 'Rate & review this service'}
            </Button>
          </div>
        )}

        {!isCustomer && booking.status === 'awaiting_advance' && (
          <div className="p-3 text-center rounded-2xl bg-amber-50/70 border border-amber-200/60 text-xs text-amber-800 font-medium">
            Waiting for the customer to deposit the advance payment before work begins.
          </div>
        )}
        {!isCustomer && booking.status === 'in_progress' && (
          <Button size="md" fullWidth onClick={() => setProgressOpen(true)} icon={<Hammer size={15} aria-hidden="true" />}>
            Post work updates &amp; complete job
          </Button>
        )}
        {!isCustomer && booking.status === 'work_completed' && (
          <div className="space-y-2">
            <div className="p-3 text-center rounded-2xl bg-brand-50/70 border border-brand-100 text-xs text-brand-800 font-medium">
              Work marked completed. Waiting for the customer to release the remaining balance.
            </div>
            <Button size="md" variant="secondary" fullWidth onClick={() => setProgressOpen(true)} icon={<ListChecks size={15} aria-hidden="true" />}>
              View submitted progress history
            </Button>
          </div>
        )}
        {!isCustomer && booking.status === 'completed' && (
          <div className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-2xl bg-trust-50 text-xs font-bold text-trust-800 border border-trust-100">
            <CheckCircle2 size={15} className="text-trust-600" />
            <span>Paid in full &mdash; job successfully closed and payment received.</span>
          </div>
        )}

        {isCancellable && (
          <Button
            size="sm"
            variant="ghost"
            fullWidth
            className="mt-2.5 text-red-600 hover:bg-red-50 hover:text-red-700"
            onClick={() => setCancelOpen(true)}
            icon={<Ban size={14} aria-hidden="true" />}
          >
            Cancel booking
          </Button>
        )}
      </div>

      <BookingProgressModal
        open={progressOpen}
        onClose={() => setProgressOpen(false)}
        bookingId={booking.id}
        onUpdated={onUpdated}
      />

      <CancelBookingModal
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        booking={booking}
        isCustomer={isCustomer}
        onCancelled={() => {
          setCancelOpen(false);
          onUpdated?.();
        }}
      />

      {isCustomer && requirementId && (
        <ReviewModal
          open={reviewOpen}
          onClose={() => setReviewOpen(false)}
          requirementId={requirementId}
          existingReview={myReview}
          onSaved={(review) => {
            setMyReview(review);
            setReviewOpen(false);
          }}
        />
      )}
    </Card>
  );
}
