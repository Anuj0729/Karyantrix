'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, Clock, Hammer, ImagePlus, Loader2, MessageSquareWarning, Play, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';
import { getSocket } from '../lib/socket';
import Badge from './ui/Badge';
import Button from './ui/Button';
import { Field, TextArea } from './ui/Field';
import { useToast } from './ui/Toast';

const mediaUrl = (url) => (!url ? null : url);

function UpdateStatusBadge({ status }) {
  if (status === 'approved') return <Badge tone="success" icon={<CheckCircle2 size={12} aria-hidden="true" />}>Approved</Badge>;
  if (status === 'changes_requested') return <Badge tone="danger" icon={<MessageSquareWarning size={12} aria-hidden="true" />}>Changes requested</Badge>;
  return <Badge tone="warning" icon={<Clock size={12} aria-hidden="true" />}>Awaiting review</Badge>;
}

function MediaThumb({ item }) {
  const src = mediaUrl(item.url);
  if (item.type === 'video') {
    return (
      <a
        href={src}
        target="_blank"
        rel="noopener noreferrer"
        className="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-ink-900"
      >
        <video src={src} className="h-full w-full object-cover opacity-70" />
        <Play size={18} className="absolute text-white" aria-hidden="true" />
      </a>
    );
  }
  return (
    <a href={src} target="_blank" rel="noopener noreferrer" className="block h-20 w-20 shrink-0 overflow-hidden rounded-lg">
      <img src={src} alt="Progress media" className="h-full w-full object-cover" />
    </a>
  );
}

function ProgressEntry({ update, isCustomer, isProvider, isLatestFinal, bookingStatus, onRespond, busyId, onMarkCompleted, completing }) {
  return (
    <div className="rounded-xl border border-ink-100 p-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {update.is_final && <Badge tone="brand">Final update</Badge>}
          <UpdateStatusBadge status={update.status} />
        </div>
        <p className="text-xs text-ink-400">{update.createdAt ? new Date(update.createdAt).toLocaleString() : ''}</p>
      </div>

      <p className="whitespace-pre-wrap text-sm text-ink-800">{update.note}</p>

      {update.media?.length > 0 && (
        <div className="mt-2.5 flex flex-wrap gap-2">
          {update.media.map((m, i) => (
            <MediaThumb key={i} item={m} />
          ))}
        </div>
      )}

      {update.status === 'changes_requested' && update.customer_feedback && (
        <div className="mt-2.5 rounded-lg bg-red-50 p-2.5 text-xs text-red-700">
          <span className="font-semibold">Customer feedback: </span>
          {update.customer_feedback}
        </div>
      )}

      {isCustomer && update.status === 'pending' && (
        <div className="mt-3 flex flex-col gap-2 border-t border-ink-100 pt-3">
          <Button
            size="sm"
            fullWidth
            loading={busyId === `${update._id || update.id}-approve`}
            onClick={() => onRespond(update, 'approve')}
            icon={<CheckCircle2 size={14} aria-hidden="true" />}
          >
            Approve
          </Button>
          <RequestChangesInline
            onSubmit={(feedback) => onRespond(update, 'request_changes', feedback)}
            busy={busyId === `${update._id || update.id}-changes`}
          />
        </div>
      )}

      {isProvider && isLatestFinal && bookingStatus === 'in_progress' && (
        <div className="mt-3 border-t border-ink-100 pt-3">
          {update.status === 'approved' && (
            <>
              <p className="mb-2 text-xs text-ink-500">
                The customer approved this final update. You can now mark the entire job as completed to request the balance payment.
              </p>
              <Button
                size="sm"
                variant="outline"
                fullWidth
                loading={completing}
                onClick={onMarkCompleted}
                icon={<CheckCircle2 size={14} className="text-trust-600" aria-hidden="true" />}
              >
                Mark all work as completed
              </Button>
            </>
          )}

          {update.status === 'pending' && (
            <p className="rounded-xl border border-amber-200/80 bg-amber-50 p-2.5 text-xs text-amber-800">
              Waiting for the customer to review and approve this update before you can mark this job as completed.
            </p>
          )}

          {update.status === 'changes_requested' && (
            <p className="rounded-xl border border-red-200/80 bg-red-50 p-2.5 text-xs text-red-700">
              The customer requested changes on this final update. Post a new final update once you&apos;ve addressed their feedback.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function RequestChangesInline({ onSubmit, busy }) {
  const [open, setOpen] = useState(false);
  const [feedback, setFeedback] = useState('');

  if (!open) {
    return (
      <Button size="sm" variant="secondary" fullWidth onClick={() => setOpen(true)} icon={<MessageSquareWarning size={14} aria-hidden="true" />}>
        Request changes
      </Button>
    );
  }

  return (
    <div className="space-y-2">
      <TextArea
        rows={2}
        placeholder="What needs to change?"
        value={feedback}
        onChange={(e) => setFeedback(e.target.value)}
      />
      <div className="flex gap-2">
        <Button size="sm" variant="secondary" fullWidth onClick={() => setOpen(false)}>
          Cancel
        </Button>
        <Button
          size="sm"
          variant="danger"
          fullWidth
          loading={busy}
          disabled={!feedback.trim()}
          onClick={() => feedback.trim() && onSubmit(feedback.trim())}
        >
          Send
        </Button>
      </div>
    </div>
  );
}

export default function BookingProgressModal({ open, onClose, bookingId, onUpdated }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState('');
  const [isFinal, setIsFinal] = useState(false);
  const [files, setFiles] = useState([]);
  const [posting, setPosting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [busyId, setBusyId] = useState(null);
  const [completing, setCompleting] = useState(false);

  const isCustomer = user?.role === 'customer';
  const isProvider = user?.role === 'provider';

  const fetchBooking = (silent = false) => {
    if (!bookingId) return;
    if (!silent) setLoading(true);
    api
      .get(`/bookings/${bookingId}`)
      .then(({ data }) => setBooking(data.booking))
      .catch(() => toast('Could not load this booking', { type: 'error' }))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (open) {
      fetchBooking();
      setNote('');
      setIsFinal(false);
      setFiles([]);
    }
  }, [open, bookingId]);

  useEffect(() => {
    if (!open || !bookingId) return undefined;
    const token = typeof window !== 'undefined' ? localStorage.getItem('karyantrix_token') : null;
    const socket = getSocket(token);

    const onProgress = (payload) => {
      if (payload?.booking_id !== bookingId) return;
      fetchBooking(true);
    };
    const onBookingUpdated = (payload) => {
      if (payload?.booking_id !== bookingId) return;
      fetchBooking(true);
    };

    socket.on('booking_progress_update', onProgress);
    socket.on('booking_updated', onBookingUpdated);
    return () => {
      socket.off('booking_progress_update', onProgress);
      socket.off('booking_updated', onBookingUpdated);
    };
  }, [open, bookingId]);

  const sortedUpdates = useMemo(
    () => [...(booking?.progress_updates || [])].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)),
    [booking]
  );

  const hasPendingFinal = useMemo(
    () => sortedUpdates.some((u) => u.is_final && u.status === 'pending'),
    [sortedUpdates]
  );

  const latestFinal = useMemo(() => sortedUpdates.find((u) => u.is_final), [sortedUpdates]);

  const handlePost = async (e) => {
    e.preventDefault();
    if (!note.trim()) {
      toast('Add a short note describing the work done', { type: 'error' });
      return;
    }
    if (files.length === 0) {
      toast('Attach at least one photo or video of the work', { type: 'error' });
      return;
    }
    setPosting(true);
    setUploadProgress(0);
    try {
      const formData = new FormData();
      formData.append('note', note.trim());
      formData.append('is_final', String(isFinal));
      files.forEach((f) => formData.append('media', f));

      await api.post(`/bookings/${bookingId}/progress`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 120000, // large photos/videos on a slow connection shouldn't hang forever
        onUploadProgress: (evt) => {
          if (evt.total) setUploadProgress(Math.round((evt.loaded * 100) / evt.total));
        },
      });
      toast('Progress update posted', { type: 'success' });
      setNote('');
      setIsFinal(false);
      setFiles([]);
      fetchBooking(true);
      onUpdated?.();
    } catch (err) {
      const message =
        err.code === 'ECONNABORTED'
          ? 'Upload took too long and timed out. Check your connection or try with fewer/smaller files.'
          : err.response?.data?.message || 'Could not post the progress update';
      toast(message, { type: 'error' });
    } finally {
      setPosting(false);
      setUploadProgress(0);
    }
  };

  const handleRespond = async (update, action, feedback) => {
    const id = update._id || update.id;
    setBusyId(`${id}-${action === 'approve' ? 'approve' : 'changes'}`);
    try {
      await api.patch(`/bookings/${bookingId}/progress/${id}/respond`, { action, feedback });
      toast(action === 'approve' ? 'Update approved' : 'Feedback sent to the provider', { type: 'success' });
      fetchBooking(true);
      onUpdated?.();
    } catch (err) {
      toast(err.response?.data?.message || 'Could not send your response', { type: 'error' });
    } finally {
      setBusyId(null);
    }
  };

  const handleMarkCompleted = async () => {
    setCompleting(true);
    try {
      await api.patch(`/bookings/${bookingId}/complete-work`);
      toast('Marked as completed — the customer has been notified to pay the balance', { type: 'success' });
      fetchBooking(true);
      onUpdated?.();
    } catch (err) {
      toast(err.response?.data?.message || 'Could not mark this job as completed', { type: 'error' });
    } finally {
      setCompleting(false);
    }
  };

  if (!open) return null;
  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/60 backdrop-blur-sm px-4 py-6 sm:py-10"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-3xl bg-white shadow-2xl border border-ink-200/80"
          initial={{ opacity: 0, y: 24, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.97 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between border-b border-ink-100 px-6 py-[18px] bg-ink-50/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-brand-50 border border-brand-100/70 flex items-center justify-center text-brand-600 shadow-soft">
                <Hammer size={18} aria-hidden="true" />
              </div>
              <div>
                <h2 className="font-display text-lg font-bold text-ink-900 tracking-tight">Work Progress &amp; Milestones</h2>
                <p className="text-xs text-ink-500">Live progress tracking with media proof</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="rounded-full p-2 text-ink-400 hover:text-ink-700 hover:bg-ink-100 transition-colors"
            >
              <X size={18} aria-hidden="true" />
            </button>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
            {loading && (
              <div className="flex flex-col items-center justify-center py-12 text-ink-400 gap-2">
                <Loader2 size={24} className="animate-spin text-brand-600" aria-hidden="true" />
                <p className="text-xs font-medium text-ink-500">Loading progress history...</p>
              </div>
            )}

            {!loading && booking && (
              <>
                {isProvider && booking.status === 'in_progress' && (
                  <form onSubmit={handlePost} className="space-y-3.5 rounded-2xl border border-ink-200/80 bg-ink-50/60 p-4 shadow-soft">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-ink-700">Submit New Work Update</h3>
                      <span className="text-[11px] text-ink-400">Step by step proof</span>
                    </div>

                    <Field label="Description of work done" required>
                      <TextArea
                        rows={3}
                        placeholder="e.g. Completed initial inspection, repaired condenser coil, and recharged refrigerant..."
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                      />
                    </Field>

                    <Field label="Upload photo / video proof" required hint="At least 1 file (up to 10 photos or videos, max 50MB each)">
                      <label className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-ink-300 hover:border-brand-400 bg-white hover:bg-brand-50/20 px-4 py-3.5 text-xs font-semibold text-ink-600 hover:text-brand-600 transition-all">
                        <ImagePlus size={18} className="text-ink-400 group-hover:text-brand-600" aria-hidden="true" />
                        <span>{files.length > 0 ? `${files.length} file(s) selected` : 'Click to browse files'}</span>
                        <input
                          type="file"
                          accept="image/*,video/*"
                          multiple
                          className="hidden"
                          onChange={(e) => setFiles(Array.from(e.target.files || []))}
                        />
                      </label>
                    </Field>

                    <label className="flex items-center gap-2 text-xs font-semibold text-ink-700 cursor-pointer pt-1">
                      <input
                        type="checkbox"
                        checked={isFinal}
                        onChange={(e) => setIsFinal(e.target.checked)}
                        className="h-4 w-4 rounded-md border-ink-300 text-brand-600 focus:ring-brand-500"
                      />
                      <span>This is the final update — all work has been fully completed</span>
                    </label>

                    <Button type="submit" size="md" fullWidth loading={posting}>
                      {posting && uploadProgress > 0 ? `Uploading... ${uploadProgress}%` : 'Post work update'}
                    </Button>
                  </form>
                )}

                {isCustomer && hasPendingFinal && (
                  <div className="rounded-2xl bg-amber-50 border border-amber-200/80 p-4 text-xs text-amber-900 flex items-start gap-3">
                    <MessageSquareWarning size={18} className="text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">Final Review Required</p>
                      <p className="mt-0.5 text-amber-800">
                        Your provider has marked this job as completed. Please review their final update below to approve or request adjustments before settling the remaining balance.
                      </p>
                    </div>
                  </div>
                )}

                {sortedUpdates.length === 0 && (
                  <div className="py-10 text-center rounded-2xl border border-dashed border-ink-200 bg-ink-50/50 p-6">
                    <p className="text-xs font-semibold text-ink-600">No updates posted yet</p>
                    <p className="mt-1 text-[11px] text-ink-400">Photos and milestones will appear here as work progresses.</p>
                  </div>
                )}

                <div className="space-y-3.5">
                  {sortedUpdates.map((update) => (
                    <ProgressEntry
                      key={update._id || update.id}
                      update={update}
                      isCustomer={isCustomer}
                      isProvider={isProvider}
                      isLatestFinal={!!latestFinal && (latestFinal._id || latestFinal.id) === (update._id || update.id)}
                      bookingStatus={booking.status}
                      onRespond={handleRespond}
                      busyId={busyId}
                      onMarkCompleted={handleMarkCompleted}
                      completing={completing}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}
