'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, Ban, X } from 'lucide-react';
import api from '../lib/api';
import { useToast } from './ui/Toast';
import { Field, SelectInput, TextArea } from './ui/Field';
import Button from './ui/Button';

export const CUSTOMER_CANCELLATION_REASONS = [
  { value: 'change_of_plans', label: 'Change of plans' },
  { value: 'found_another_provider', label: 'Found another provider' },
  { value: 'price_too_high', label: 'Price is too high' },
  { value: 'no_longer_needed', label: 'No longer need this service' },
  { value: 'provider_unresponsive', label: 'Provider is unresponsive' },
  { value: 'other', label: 'Other' },
];

export const PROVIDER_CANCELLATION_REASONS = [
  { value: 'unavailable', label: 'No longer available for this job' },
  { value: 'customer_unresponsive', label: 'Customer is unresponsive' },
  { value: 'scope_mismatch', label: 'Job scope does not match what was agreed' },
  { value: 'pricing_dispute', label: 'Dispute over pricing' },
  { value: 'safety_concern', label: 'Safety concern' },
  { value: 'other', label: 'Other' },
];

export const CANCELLATION_REASON_LABELS = Object.fromEntries(
  [...CUSTOMER_CANCELLATION_REASONS, ...PROVIDER_CANCELLATION_REASONS].map((r) => [r.value, r.label])
);

export default function CancelBookingModal({ open, onClose, booking, isCustomer, onCancelled }) {
  const { toast } = useToast();
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const reasons = isCustomer ? CUSTOMER_CANCELLATION_REASONS : PROVIDER_CANCELLATION_REASONS;

  const reset = () => {
    setReason('');
    setDetails('');
    setError('');
  };

  const handleClose = () => {
    if (submitting) return;
    reset();
    onClose?.();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!reason) {
      setError('Please select a reason for the cancellation');
      return;
    }
    if (!details.trim()) {
      setError('Please add a short explanation');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const { data } = await api.post(`/bookings/${booking.id}/cancel`, { reason, details: details.trim() });
      toast('Booking cancelled', { type: 'success' });
      reset();
      onCancelled?.(data.booking);
    } catch (err) {
      const message = err.response?.data?.message || 'Could not cancel this booking';
      setError(message);
      toast(message, { type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;
  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/60 backdrop-blur-sm px-4 py-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={handleClose}
      >
        <motion.div
          className="flex w-full max-w-md flex-col overflow-hidden rounded-3xl bg-white shadow-2xl border border-ink-200/80"
          initial={{ opacity: 0, y: 24, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.97 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between border-b border-ink-100 px-6 py-4.5 bg-ink-50/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center text-red-600 shadow-soft">
                <Ban size={18} aria-hidden="true" />
              </div>
              <div>
                <h2 className="font-display text-lg font-bold text-ink-900 tracking-tight">Cancel booking</h2>
                <p className="text-xs text-ink-500">This cannot be undone</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleClose}
              aria-label="Close"
              className="rounded-full p-2 text-ink-400 hover:text-ink-700 hover:bg-ink-100 transition-colors"
            >
              <X size={18} aria-hidden="true" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
            <div className="flex items-start gap-2.5 rounded-2xl border border-amber-200/80 bg-amber-50 p-3.5 text-xs text-amber-900">
              <AlertTriangle size={16} className="shrink-0 mt-0.5 text-amber-600" aria-hidden="true" />
              <p>
                Cancelling may attract a cancellation fee, deducted from any amount already paid on this booking. The
                other party will be notified immediately.
              </p>
            </div>

            <Field label="Reason for cancellation" required error={error && !reason ? error : ''}>
              <SelectInput value={reason} onChange={(e) => setReason(e.target.value)} hasError={!!error && !reason}>
                <option value="">Select a reason...</option>
                {reasons.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </SelectInput>
            </Field>

            <Field label="Additional details" required hint="Give the other party some context.">
              <TextArea
                rows={4}
                placeholder="Tell us more about why you're cancelling..."
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                hasError={!!error && !!reason}
              />
            </Field>

            {error && reason && details.trim() === '' && (
              <p className="text-xs font-medium text-red-600">{error}</p>
            )}

            <div className="flex gap-2 pt-1">
              <Button type="button" variant="secondary" size="md" fullWidth onClick={handleClose} disabled={submitting}>
                Keep booking
              </Button>
              <Button type="submit" variant="danger" size="md" fullWidth loading={submitting}>
                Confirm cancellation
              </Button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}
