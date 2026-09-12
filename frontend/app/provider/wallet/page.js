'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowDownCircle,
  ArrowLeft,
  ArrowUpCircle,
  CheckCircle2,
  Clock3,
  IndianRupee,
  MinusCircle,
  Percent,
  Wallet as WalletIcon,
} from 'lucide-react';
import api from '../../../lib/api';
import ProtectedRoute from '../../../components/ProtectedRoute';
import Card from '../../../components/ui/Card';
import Badge from '../../../components/ui/Badge';
import { RowSkeleton, Skeleton } from '../../../components/ui/Skeleton';
import useRefetchOnFocus from '../../../lib/useRefetchOnFocus';

const fmtINR = (n) => `\u20b9${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '\u2014';

function StatCard({ label, value, icon: Icon, tone = 'brand', sub }) {
  const tones = {
    brand: 'bg-brand-50 text-brand-600',
    success: 'bg-emerald-50 text-emerald-600',
    warning: 'bg-amber-50 text-amber-600',
    danger: 'bg-rose-50 text-rose-600',
  };
  return (
    <Card className="p-[18px] border-ink-100 shadow-xs" hover={false}>
      <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${tones[tone] || tones.brand}`}>
        <Icon size={18} aria-hidden="true" />
      </div>
      <p className="mt-3 font-display text-2xl font-bold tracking-tight text-ink-900">{value}</p>
      <p className="mt-0.5 text-xs text-ink-500 font-medium leading-snug">{label}</p>
      {sub && <p className="mt-1 text-[11px] text-ink-400">{sub}</p>}
    </Card>
  );
}

const HISTORY_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'payout', label: 'Received' },
  { key: 'commission', label: 'Commission' },
  { key: 'cancellation_fee', label: 'Cancellation fees' },
];

const TYPE_META = {
  payout: { label: 'Payout', tone: 'success', Icon: ArrowDownCircle },
  commission: { label: 'Commission deducted', tone: 'warning', Icon: MinusCircle },
  cancellation_fee: { label: 'Cancellation fee', tone: 'danger', Icon: MinusCircle },
};

function HistoryRow({ item }) {
  const meta = TYPE_META[item.type] || { label: item.type, tone: 'neutral', Icon: ArrowUpCircle };
  const sign = item.direction === 'credit' ? '+' : '\u2212';
  const amountColor = item.direction === 'credit' ? 'text-emerald-600' : 'text-rose-600';

  return (
    <div className="flex items-center justify-between gap-3 border-b border-ink-50 py-3 last:border-0">
      <div className="flex min-w-0 items-center gap-2.5">
        <div
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
            item.direction === 'credit' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
          }`}
        >
          <meta.Icon size={15} aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold text-ink-800">
            {meta.label}
            {item.customer?.name ? ` \u00b7 ${item.customer.name}` : ''}
          </p>
          <p className="truncate text-[11px] text-ink-400">{item.notes || fmtDate(item.date)}</p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <div className="text-right">
          <p className={`font-mono text-sm font-bold ${amountColor}`}>
            {sign} {fmtINR(item.amount)}
          </p>
          <p className="text-[11px] text-ink-400">{fmtDate(item.date)}</p>
        </div>
        <Badge
          tone={item.status === 'completed' ? 'success' : item.status === 'failed' ? 'danger' : 'warning'}
          size="sm"
          dot
          icon={item.status === 'completed' ? <CheckCircle2 size={11} /> : undefined}
        >
          {item.status}
        </Badge>
      </div>
    </div>
  );
}

function ProviderWalletContent() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  const loadWallet = () => {
    api
      .get('/bookings/wallet/my-wallet')
      .then(({ data }) => setData(data))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadWallet();
  }, []);

  useRefetchOnFocus(loadWallet);

  const filteredHistory = useMemo(() => {
    if (!data) return [];
    if (filter === 'all') return data.history;
    return data.history.filter((h) => h.type === filter);
  }, [data, filter]);

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/provider/dashboard"
          className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-ink-500 transition-colors hover:text-brand-600"
        >
          <ArrowLeft size={16} aria-hidden="true" />
          Back to dashboard
        </Link>
        <h2 className="mt-1 text-xl font-bold tracking-tight text-ink-900">My Wallet</h2>
        <p className="text-xs text-ink-500">
          See what you&rsquo;ve received, what&rsquo;s pending, and what&rsquo;s been deducted &mdash; with full history.
        </p>
      </div>

      {loading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-28 w-full rounded-2xl" />
            ))}
          </div>
          {Array.from({ length: 4 }).map((_, i) => (
            <RowSkeleton key={i} />
          ))}
        </div>
      ) : !data ? (
        <p className="text-sm text-ink-400">Could not load your wallet.</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3">
            <StatCard label="Total received" value={fmtINR(data.summary.totalReceived)} icon={WalletIcon} tone="success" />
            <StatCard label="Pending payout" value={fmtINR(data.summary.totalPending)} icon={Clock3} tone="warning" />
            <StatCard
              label="Total deducted"
              value={fmtINR(data.summary.totalDeducted)}
              icon={MinusCircle}
              tone="danger"
              sub={`Commission ${fmtINR(data.summary.totalCommissionDeducted)} \u00b7 Cancellation fees ${fmtINR(
                data.summary.totalCancellationFeesDeducted
              )}`}
            />
          </div>

          <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-2">
            <div className="flex items-center gap-2 rounded-xl bg-ink-50/60 px-3.5 py-2.5 text-xs text-ink-600">
              <Percent size={14} className="text-ink-400" aria-hidden="true" />
              Commission rate: <span className="font-semibold text-ink-800">{data.commission_percent}%</span>
            </div>
            <div className="flex items-center gap-2 rounded-xl bg-ink-50/60 px-3.5 py-2.5 text-xs text-ink-600">
              <IndianRupee size={14} className="text-ink-400" aria-hidden="true" />
              Payout promise:{' '}
              <span className="font-semibold text-ink-800">
                {data.payout_sla_days} day{data.payout_sla_days === 1 ? '' : 's'}
              </span>
            </div>
          </div>

          {data.awaiting_payout.length > 0 && (
            <section className="space-y-3">
              <h3 className="text-sm font-bold text-ink-900">Awaiting payout</h3>
              <div className="space-y-2.5">
                {data.awaiting_payout.map((b) => (
                  <Card key={b.booking_id} className="p-4 border-ink-100 shadow-xs" hover={false}>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-xs font-semibold text-ink-800">Booking with {b.customer?.name}</p>
                        <p className="mt-0.5 text-[11px] text-ink-400">
                          Completed {fmtDate(b.work_completed_at)} &middot; total {fmtINR(b.total_amount)}
                          {b.already_paid > 0 && <> &middot; {fmtINR(b.already_paid)} already paid</>}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="font-bold font-mono text-sm text-amber-600">{fmtINR(b.pending_amount)}</p>
                          {b.expected_by && <p className="text-[11px] text-ink-400">Expected by {fmtDate(b.expected_by)}</p>}
                        </div>
                        <Badge tone="warning" size="sm" dot>
                          Pending
                        </Badge>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </section>
          )}

          <section className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-bold text-ink-900">Transaction history</h3>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {HISTORY_FILTERS.map((f) => (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setFilter(f.key)}
                  className={`rounded-full border px-3 py-1 text-[11px] font-medium transition-colors ${
                    filter === f.key
                      ? 'border-brand-300 bg-brand-50 text-brand-700'
                      : 'border-ink-200/60 text-ink-500 hover:border-ink-300'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {filteredHistory.length === 0 ? (
              <Card className="p-6 border-ink-100 shadow-xs" hover={false}>
                <p className="text-xs text-ink-400 italic">No transactions in this category yet.</p>
              </Card>
            ) : (
              <Card className="p-5 border-ink-100 shadow-xs" hover={false}>
                <div>
                  {filteredHistory.map((item) => (
                    <HistoryRow key={item.id} item={item} />
                  ))}
                </div>
              </Card>
            )}
          </section>
        </>
      )}
    </div>
  );
}

export default function ProviderWalletPage() {
  return (
    <ProtectedRoute allowedRoles={['provider']}>
      <ProviderWalletContent />
    </ProtectedRoute>
  );
}
