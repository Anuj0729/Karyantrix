'use client';

import { useCallback, useEffect, useState } from 'react';
import { BellOff, CheckCheck, Sparkles } from 'lucide-react';
import api from '../../lib/api';
import ProtectedRoute from '../../components/ProtectedRoute';
import BackButton from '../../components/BackButton';
import { RowSkeleton } from '../../components/ui/Skeleton';
import { useAuth } from '../../context/AuthContext';
import { getSocket } from '../../lib/socket';
import useRefetchOnFocus from '../../lib/useRefetchOnFocus';

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

function NotificationsContent() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(() => {
    setLoading(true);
    api
      .get('/notifications')
      .then(({ data }) => setNotifications(data.notifications || []))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  useRefetchOnFocus(fetchAll);

  useEffect(() => {
    if (!user) return undefined;
    const token = typeof window !== 'undefined' ? localStorage.getItem('karyantrix_token') : null;
    const socket = getSocket(token);
    const onNotification = (notification) => {
      setNotifications((prev) => [notification, ...prev]);
    };
    socket.on('notification', onNotification);
    return () => socket.off('notification', onNotification);
  }, [user]);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const markOneRead = async (id) => {
    setNotifications((prev) => prev.map((n) => ((n.id || n._id) === id ? { ...n, is_read: true } : n)));
    try {
      await api.patch(`/notifications/${id}/read`);
    } catch (err) {

    }
  };

  const markAllRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    try {
      await api.patch('/notifications/read-all');
    } catch (err) {

    }
  };

  return (
    <div className="space-y-6">
      <BackButton href="/" label="Back" />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-ink-100">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-ink-900 tracking-tight">Notifications</h1>
          <p className="text-xs sm:text-sm text-ink-500 mt-1">Everything that's happened across your bids, bookings, and reviews.</p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="self-start sm:self-auto inline-flex items-center gap-1.5 rounded-full border border-ink-200/80 bg-white px-4 py-2 text-xs font-semibold text-brand-600 hover:bg-brand-50 hover:border-brand-200 transition-colors"
          >
            <CheckCheck size={14} />
            Mark all read
          </button>
        )}
      </div>

      {loading && (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <RowSkeleton key={i} />
          ))}
        </div>
      )}

      {!loading && notifications.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-ink-200 bg-ink-50/40 py-16 px-6 text-center">
          <div className="w-14 h-14 rounded-2xl bg-white border border-ink-100 shadow-soft flex items-center justify-center text-ink-400">
            <BellOff size={28} className="text-ink-300" aria-hidden="true" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-ink-800">All caught up!</h3>
            <p className="mt-1 text-xs text-ink-500 max-w-sm">You have no notifications yet.</p>
          </div>
        </div>
      )}

      {!loading && notifications.length > 0 && (
        <div className="flex flex-col gap-2.5">
          {notifications.map((n) => {
            const id = n.id || n._id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => !n.is_read && markOneRead(id)}
                className={`flex items-start gap-3 rounded-2xl border p-4 text-left transition-colors ${
                  n.is_read
                    ? 'border-ink-100 bg-white'
                    : 'border-brand-200/70 bg-brand-50/40 hover:bg-brand-50/70'
                }`}
              >
                <div
                  className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                    n.is_read ? 'bg-ink-100 text-ink-400' : 'bg-brand-100 text-brand-600'
                  }`}
                >
                  <Sparkles size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-ink-900">{n.title}</p>
                    {!n.is_read && <span className="h-1.5 w-1.5 rounded-full bg-brand-600 shrink-0" />}
                  </div>
                  <p className="mt-0.5 text-xs text-ink-500 leading-relaxed">{n.message}</p>
                  {n.createdAt && <p className="mt-1.5 text-[10px] text-ink-400">{timeAgo(n.createdAt)}</p>}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function NotificationsPage() {
  return (
    <ProtectedRoute allowedRoles={['customer', 'provider', 'admin']}>
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
        <NotificationsContent />
      </div>
    </ProtectedRoute>
  );
}
