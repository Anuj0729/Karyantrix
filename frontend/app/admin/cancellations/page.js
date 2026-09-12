'use client';

import { useEffect, useState } from 'react';
import { Ban, IndianRupee, RefreshCw, TrendingDown, UserCog, UserRound } from 'lucide-react';
import api from '../../../lib/api';
import BackButton from '../../../components/BackButton';
import Card from '../../../components/ui/Card';
import Badge from '../../../components/ui/Badge';
import { Skeleton, RowSkeleton } from '../../../components/ui/Skeleton';
import { CANCELLATION_REASON_LABELS } from '../../../components/CancelBookingModal';
import useRefetchOnFocus from '../../../lib/useRefetchOnFocus';

const fmtINR = (n) => `\u20b9${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '\u2014';
const reasonLabel = (value) => CANCELLATION_REASON_LABELS[value] || value;

const FILTERS = [
  { key: '', label: 'All' },
  { key: 'customer', label: 'Cancelled by customer' },
  { key: 'provider', label: 'Cancelled by provider' },
];

function StatCard({ label, value, icon: Icon, tone = 'brand' }) {
  const tones = {
    brand: 'bg-brand-50 text-brand-600',
    success: 'bg-emerald-50 text-emerald-600',
    warning: 'bg-amber-50 text-amber-600',
    danger: 'bg-rose-50 text-rose-600',
    purple: 'bg-purple-50 text-purple-600',
  };
  return (
    <Card className="p-[18px] border-ink-100 shadow-xs hover:border-brand-200 transition-all" hover={false}>
      <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${tones[tone] || tones.brand}`}>
        <Icon size={18} aria-hidden="true" />
      </div>
      <p className="mt-3 font-display text-2xl font-bold tracking-tight text-ink-900">{value ?? 0}</p>
      <p className="mt-0.5 text-xs text-ink-500 font-medium leading-snug">{label}</p>
    </Card>
  );
}

function BreakdownBars({ items = [], color = 'bg-red-500' }) {
  const max = Math.max(1, ...items.map((i) => i.count));
  if (items.length === 0) return <p className="text-xs text-ink-400 italic py-4">No cancellations recorded yet.</p>;
  return (
    <div className="space-y-3">
      {items.map((item, i) => (
        <div key={i}>
          <div className="mb-1.5 flex items-center justify-between text-xs">
            <span className="font-semibold text-ink-700">{reasonLabel(item.reason)}</span>
            <span className="font-bold text-ink-900 font-mono">{item.count}</span>
          </div>
          <div className="h-2 w-full rounded-full bg-ink-100 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${color}`}
              style={{ width: `${(item.count / max) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function CancellationRow({ booking }) {
  const c = booking.cancellation || {};
  const services = booking.requirement?.services?.join(', ') || 'Requirement';
  const cancelledByCustomer = c.cancelled_by_role === 'customer';

  return (
    <Card className="p-[18px] border-ink-200/80 shadow-xs" hover={false}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-bold text-ink-900">{services}</p>
            <Badge tone={cancelledByCustomer ? 'purple' : 'cyan'} size="sm" icon={cancelledByCustomer ? <UserRound size={11} /> : <UserCog size={11} />}>
              Cancelled by {c.cancelled_by_role}
            </Badge>
          </div>
          <p className="mt-1 text-xs text-ink-600">
            <span className="font-semibold text-ink-700">Customer:</span> {booking.customer?.name || '\u2014'} &middot;{' '}
            <span className="font-semibold text-ink-700">Provider:</span> {booking.provider?.name || '\u2014'}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="rounded-md bg-ink-100 px-2 py-0.5 text-[10px] font-semibold text-ink-700">
              {reasonLabel(c.reason)}
            </span>
            <span className="text-[11px] text-ink-400">Cancelled on {fmtDate(c.cancelled_at)}</span>
          </div>
          {c.details && <p className="mt-2 text-xs text-ink-600 leading-relaxed">&ldquo;{c.details}&rdquo;</p>}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5 text-right">
          {c.fee_amount > 0 && (
            <div>
              <p className="text-[10px] uppercase font-bold text-ink-400">Fee charged</p>
              <p className="text-sm font-bold text-red-600">{fmtINR(c.fee_amount)} <span className="font-normal text-ink-400">({c.fee_percent}%)</span></p>
            </div>
          )}
          {c.refund_amount > 0 && (
            <div>
              <p className="text-[10px] uppercase font-bold text-ink-400">Refund owed</p>
              <p className="text-sm font-bold text-emerald-600">{fmtINR(c.refund_amount)}</p>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

function AdminCancellationsContent() {
  const [filter, setFilter] = useState('');
  const [bookings, setBookings] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [listRes, statsRes] = await Promise.all([
        api.get('/admin/cancellations', { params: filter ? { cancelled_by_role: filter } : {} }),
        api.get('/admin/cancellations/analytics'),
      ]);
      setBookings(listRes.data.bookings || []);
      setStats(statsRes.data);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load();
  }, [filter]);

  useRefetchOnFocus(load);

  const refresh = () => {
    setRefreshing(true);
    load();
  };

  return (
    <div className="space-y-6">
      <BackButton href="/admin" label="Back to dashboard" />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-ink-900">Booking Cancellations</h2>
          <p className="text-xs text-ink-500">Track who cancels bookings, why, and the fees & refunds it generates.</p>
        </div>
        <button
          type="button"
          onClick={refresh}
          disabled={refreshing}
          className="inline-flex items-center gap-1.5 rounded-xl border border-ink-200/80 bg-white px-3 py-1.5 text-xs font-medium text-ink-600 shadow-xs transition-all hover:bg-ink-50 hover:text-ink-900 active:scale-95 disabled:opacity-50 self-start sm:self-auto"
        >
          <RefreshCw size={13} className={refreshing ? 'animate-spin text-brand-600' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {stats ? (
        <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-5">
          <StatCard label="Total Cancelled" value={stats.total_cancelled} icon={Ban} tone="danger" />
          <StatCard label="Cancellation Rate" value={`${stats.cancellation_rate}%`} icon={TrendingDown} tone="warning" />
          <StatCard label="By Customers" value={stats.cancelled_by_customer} icon={UserRound} tone="purple" />
          <StatCard label="By Providers" value={stats.cancelled_by_provider} icon={UserCog} tone="brand" />
          <StatCard label="Fees Collected" value={fmtINR(stats.total_fees_collected)} icon={IndianRupee} tone="success" />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-2xl" />
          ))}
        </div>
      )}

      {stats && (
        <Card className="p-5 border-ink-100 shadow-xs" hover={false}>
          <p className="text-xs font-bold text-ink-700 mb-4">Cancellations by Reason</p>
          <BreakdownBars items={stats.by_reason || []} />
        </Card>
      )}

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`rounded-xl px-4 py-2 text-xs font-semibold transition-all ${
              filter === f.key
                ? 'bg-brand-600 text-white shadow-xs'
                : 'border border-ink-200/80 bg-white text-ink-600 hover:border-brand-300 hover:bg-ink-50/50'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {loading && Array.from({ length: 3 }).map((_, i) => <RowSkeleton key={i} />)}
        {!loading && bookings.map((b) => <CancellationRow key={b.id} booking={b} />)}
        {!loading && bookings.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-ink-200 bg-ink-50/40 py-16 px-6 text-center">
            <div className="w-14 h-14 rounded-2xl bg-white border border-ink-100 shadow-soft flex items-center justify-center text-ink-400">
              <Ban size={28} className="text-ink-300" aria-hidden="true" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-ink-800">No cancellations found</h3>
              <p className="mt-1 text-xs text-ink-500 max-w-sm">
                {filter ? 'No cancellations currently match this filter.' : 'No bookings have been cancelled yet.'}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdminCancellationsPage() {
  return <AdminCancellationsContent />;
}
