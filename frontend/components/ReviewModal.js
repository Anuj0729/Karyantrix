'use client';

import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Star, X } from 'lucide-react';
import ReviewForm from './ReviewForm';

export default function ReviewModal({ open, onClose, requirementId, existingReview, onSaved }) {
  useEffect(() => {
    if (!open) return undefined;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  if (!open) return null;
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
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-200/70 flex items-center justify-center text-amber-500 shadow-soft shrink-0">
                <Star size={20} className="fill-amber-400 text-amber-500" aria-hidden="true" />
              </div>
              <div>
                <h2 className="font-display text-lg font-bold text-ink-900 tracking-tight">
                  {existingReview ? 'Update Your Review' : 'Rate Your Experience'}
                </h2>
                <p className="text-xs text-ink-500">Your feedback helps the community choose trusted providers</p>
              </div>
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
            <ReviewForm
              requirementId={requirementId}
              existingReview={existingReview}
              onSaved={(review) => {
                onSaved?.(review);
              }}
            />
          </div>
        </div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}
