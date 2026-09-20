'use client';

import { useState } from 'react';
import { AlertTriangle, Users, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../ui/Toast';
import Button from '../ui/Button';
import Modal from '../ui/Modal';

export default function SwitchToCustomerModal({ open, onClose }) {
  const { switchToCustomer } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleClose = () => {
    if (submitting) return;
    setError('');
    onClose?.();
  };

  const handleConfirm = async () => {
    setSubmitting(true);
    setError('');
    try {
      await switchToCustomer();
      toast('Your account is now a customer account', { type: 'success' });
      onClose?.();
      router.push('/profile');
    } catch (err) {
      const message = err.response?.data?.message || 'Could not switch to a customer account, please try again';
      setError(message);
      toast(message, { type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={open} onClose={handleClose} size="sm" closeOnOverlayClick={!submitting}>
      <div className="flex items-center justify-between border-b border-ink-100 px-6 py-5 bg-ink-50/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-brand-50 border border-brand-100 flex items-center justify-center text-brand-600 shadow-soft">
            <Users size={18} aria-hidden="true" />
          </div>
          <div>
            <h2 className="font-display text-lg font-bold text-ink-900 tracking-tight">Switch to customer</h2>
            <p className="text-xs text-ink-500">Your provider profile will be paused</p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleClose}
          aria-label="Close"
          disabled={submitting}
          className="rounded-full p-2 text-ink-400 hover:text-ink-700 hover:bg-ink-100 transition-colors disabled:opacity-50"
        >
          <X size={18} aria-hidden="true" />
        </button>
      </div>

      <div className="space-y-4 px-6 py-5">
        <div className="flex items-start gap-2.5 rounded-2xl border border-amber-200/80 bg-amber-50 p-3.5 text-xs text-amber-900">
          <AlertTriangle size={16} className="shrink-0 mt-0.5 text-amber-600" aria-hidden="true" />
          <p>
            You&apos;ll no longer show up in provider search, your services will be paused, and any pending bids you&apos;ve
            placed will be withdrawn. Your provider profile, reviews and history are kept, and you can switch back to
            your provider account anytime from your profile or the top menu. This isn&apos;t allowed while you have an
            active booking in progress.
          </p>
        </div>

        {error && <p className="text-xs font-medium text-red-600">{error}</p>}

        <div className="flex gap-2 pt-1">
          <Button type="button" variant="secondary" size="md" fullWidth onClick={handleClose} disabled={submitting}>
            Stay as provider
          </Button>
          <Button type="button" variant="primary" size="md" fullWidth loading={submitting} onClick={handleConfirm}>
            Switch to customer
          </Button>
        </div>
      </div>
    </Modal>
  );
}
