'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Wallet } from 'lucide-react';
import api from '../../lib/api';
import ProtectedRoute from '../../components/ProtectedRoute';
import BookingCard from '../../components/BookingCard';
import { RowSkeleton } from '../../components/ui/Skeleton';
import { useAuth } from '../../context/AuthContext';
import { getSocket } from '../../lib/socket';
import useRefetchOnFocus from '../../lib/useRefetchOnFocus';

const TABS = [
  { key: '', label: 'All' },
  { key: 'awaiting_advance', label: 'Advance due' },
  { key: 'in_progress', label: 'In progress' },
  { key: 'work_completed', label: 'Balance due' },
  { key: 'completed', label: 'Completed' },
  { key: 'cancelled', label: 'Cancelled' },
];

function BookingsContent() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [activeTab, setActiveTab] = useState('');
  const [loading, setLoading] = useState(true);

  // `silent` skips the loading flag so an in-place refresh (window focus,
  // socket event) never hides the already-rendered list. Toggling `loading`
  // back to true here would unmount every <BookingCard>, which was closing
  // open modals underneath the user (e.g. the OS file picker regaining
  // window focus mid-upload used to blow away the work-update modal).
  const fetchBookings = useCallback((silent = false) => {
    if (!silent) setLoading(true);
    api
      .get('/bookings/mine')
      .then(({ data }) => setBookings(data.bookings || []))
      .finally(() => {
        if (!silent) setLoading(false);
      });
  }, []);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  useRefetchOnFocus(() => fetchBookings(true));

  useEffect(() => {
    if (!user) return undefined;
    const token = typeof window !== 'undefined' ? localStorage.getItem('karyantrix_token') : null;
    const socket = getSocket(token);

    const onBookingUpdated = ({ booking_id: bookingId, status }) => {
      setBookings((prev) =>
        prev.map((b) => (b.id === bookingId ? { ...b, status } : b))
      );
    };

    const onProgressUpdate = () => fetchBookings(true);

    socket.on('booking_updated', onBookingUpdated);
    socket.on('booking_progress_update', onProgressUpdate);

    return () => {
      socket.off('booking_updated', onBookingUpdated);
      socket.off('booking_progress_update', onProgressUpdate);
    };
  }, [user, fetchBookings]);

  const filtered = useMemo(
    () => (activeTab ? bookings.filter((b) => b.status === activeTab) : bookings),
    [bookings, activeTab]
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-ink-100">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-ink-900 tracking-tight">My bookings</h1>
          <p className="text-xs sm:text-sm text-ink-500 mt-1">
            Track milestones, release milestone payments, and review ongoing work.
          </p>
        </div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-brand-50 border border-brand-100/80 text-xs font-semibold text-brand-700 self-start sm:self-auto">
          <Wallet size={14} className="text-brand-600" />
          <span>{bookings.length} total booking{bookings.length !== 1 ? 's' : ''}</span>
        </div>
      </div>

      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none">
        {TABS.map((tab) => {
          const count = tab.key ? bookings.filter((b) => b.status === tab.key).length : bookings.length;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-shrink-0 inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold transition-all duration-200 ${
                isActive
                  ? 'bg-brand-600 text-white shadow-soft shadow-brand-600/30'
                  : 'bg-white border border-ink-200/80 text-ink-600 hover:text-ink-900 hover:bg-ink-50'
              }`}
            >
              <span>{tab.label}</span>
              {count > 0 && (
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                    isActive ? 'bg-white/20 text-white' : 'bg-ink-100 text-ink-600'
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="flex flex-col gap-4">
        {loading && Array.from({ length: 3 }).map((_, i) => <RowSkeleton key={i} />)}
        {!loading && filtered.map((booking) => (
          <BookingCard key={booking.id} booking={booking} onUpdated={fetchBookings} />
        ))}
      </div>

      {!loading && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-ink-200 bg-ink-50/40 py-16 px-6 text-center">
          <div className="w-14 h-14 rounded-2xl bg-white border border-ink-100 shadow-soft flex items-center justify-center text-ink-400">
            <Wallet size={28} className="text-ink-300" aria-hidden="true" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-ink-800">No bookings found</h3>
            <p className="mt-1 text-xs text-ink-500 max-w-sm">
              {activeTab
                ? 'No bookings currently match this filter. Select "All" to see all your bookings.'
                : 'You have not placed or received any bookings yet.'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default function BookingsPage() {
  return (
    <ProtectedRoute allowedRoles={['customer', 'provider']}>
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <BookingsContent />
      </div>
    </ProtectedRoute>
  );
}
