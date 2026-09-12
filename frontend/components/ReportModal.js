'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Flag, X } from 'lucide-react';
import api from '../lib/api';
import { useToast } from './ui/Toast';
import { Field, SelectInput, TextArea } from './ui/Field';
import Button from './ui/Button';

export const REPORT_REASONS = [
  { value: 'spam_or_scam', label: 'Spam or scam' },
  { value: 'fraud_or_non_payment', label: 'Fraud or non-payment' },
  { value: 'abusive_behavior', label: 'Abusive or threatening behavior' },
  { value: 'fake_profile', label: 'Fake profile or impersonation' },
  { value: 'poor_service_quality', label: 'Poor service quality' },
  { value: 'inappropriate_content', label: 'Inappropriate content' },
  { value: 'safety_concern', label: 'Safety concern' },
  { value: 'other', label: 'Other' },
];

export default function ReportModal({ open, onClose, reportedUser, context }) {
  const { toast } = useToast();
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const reset = () => {
    setReason('');
    setDescription('');
    setError('');
  };

  const handleClose = () => {
    reset();
    onClose?.();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!reason) {
      setError('Please select a reason');
      return;
    }
    if (!description.trim()) {
      setError('Please describe the issue');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/reports', {
        reported_user_id: reportedUser.id,
        reason,
        description: description.trim(),
        requirement_id: context?.requirement_id,
        conversation_id: context?.conversation_id,
      });
      toast('Report submitted. Our team will review it shortly.', { type: 'success' });
      handleClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not submit report, please try again');
    } finally {
      setSubmitting(false);
    }
  };

  if (!open || !reportedUser) return null;
  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={handleClose}
      >
        <motion.div
          className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 shadow-card-hover"
          initial={{ opacity: 0, y: 20, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.98 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-ink-900">
              <Flag size={18} className="text-red-500" aria-hidden="true" />
              Report {reportedUser.name}
            </h2>
            <button type="button" onClick={handleClose} aria-label="Close" className="rounded-lg p-1 text-ink-400 hover:bg-ink-100">
              <X size={18} aria-hidden="true" />
            </button>
          </div>

          <p className="mb-4 text-sm text-ink-500">
            Reports are reviewed by our admin team. We&apos;ll only take action against{' '}
            {reportedUser.role === 'provider' ? 'this provider' : 'this customer'}&apos;s account after review - filing a
            report doesn&apos;t affect it right away.
          </p>

          <form onSubmit={handleSubmit} className="space-y-3">
            <Field label="Reason" required error={!reason && error ? error : undefined}>
              <SelectInput value={reason} onChange={(e) => setReason(e.target.value)}>
                <option value="">Select a reason</option>
                {REPORT_REASONS.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </SelectInput>
            </Field>
            <Field label="Details" required hint="Please share what happened - this helps our team review it faster">
              <TextArea
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the issue..."
              />
            </Field>
            {error && reason && <p className="text-xs text-red-600">{error}</p>}
            <div className="flex gap-2 pt-1">
              <Button type="button" variant="secondary" fullWidth onClick={handleClose}>
                Cancel
              </Button>
              <Button type="submit" variant="danger" fullWidth loading={submitting}>
                Submit report
              </Button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}
