'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  ArrowDownCircle,
  ArrowUpCircle,
  BadgeIndianRupee,
  Banknote,
  Clock3,
  History,
  IndianRupee,
  Percent,
  PiggyBank,
  RefreshCw,
  RotateCcw,
  Search,
  Settings,
  Wallet as WalletIcon,
} from 'lucide-react';
import api from '../../../lib/api';
import { useToast } from '../../../components/ui/Toast';
import Card from '../../../components/ui/Card';
import Badge from '../../../components/ui/Badge';
import Button from '../../../components/ui/Button';
import Modal from '../../../components/ui/Modal';
import { Field, TextInput, TextArea, SelectInput } from '../../../components/ui/Field';
import { Skeleton, RowSkeleton } from '../../../components/ui/Skeleton';
import useRefetchOnFocus from '../../../lib/useRefetchOnFocus';

const fmtINR = (n) =>
  `\u20b9${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '\u2014');

const initials = (name = '') =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('') || '?';

const AVATAR_COLORS = ['bg-brand-100 text-brand-700', 'bg-accent-100 text-accent-700', 'bg-purple-100 text-purple-700', 'bg-cyan-100 text-cyan-700', 'bg-gold-100 text-gold-700'];
const colorFor = (seed = '') => AVATAR_COLORS[[...seed].reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_COLORS.length];

function Avatar({ name, size = 9 }) {
  return (
    <div
      className={`flex h-${size} w-${size} shrink-0 items-center justify-center rounded-full text-xs font-bold ${colorFor(name)}`}
      style={{ height: `${size * 4}px`, width: `${size * 4}px` }}
    >
      {initials(name)}
    </div>
  );
}

function PersonCell({ user, sub }) {
  if (!user) return <span className="text-ink-400 italic text-xs">Unknown</span>;
  return (
    <div className="flex items-center gap-2.5">
      <Avatar name={user.name} size={8} />
      <div className="min-w-0">
        <p className="truncate text-xs font-semibold text-ink-900">{user.name}</p>
        <p className="truncate text-[11px] text-ink-400">{sub || user.email || user.phone || ''}</p>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, tone = 'brand', sub }) {
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
      <p className="mt-3 font-display text-2xl font-bold tracking-tight text-ink-900">{value}</p>
      <p className="mt-0.5 text-xs text-ink-500 font-medium leading-snug">{label}</p>
      {sub && <p className="mt-1 text-[11px] text-ink-400">{sub}</p>}
    </Card>
  );
}

function EmptyState({ text }) {
  return <p className="py-10 text-center text-xs text-ink-400 italic">{text}</p>;
}

function StatusPill({ status }) {
  const map = { completed: 'success', pending: 'warning', failed: 'danger' };
  return <Badge tone={map[status] || 'neutral'} size="sm" dot>{status}</Badge>;
}

function MonthlyBarChart({ data = [], color = 'bg-gradient-to-t from-brand-600 to-accent-500' }) {
  const max = Math.max(1, ...data.map((d) => d.amount));
  return (
    <div className="flex h-32 items-stretch gap-3 pt-4">
      {data.map((d) => (
        <div key={d.month} className="group flex flex-1 flex-col items-center gap-2">
          <span className="text-[10px] font-bold text-ink-600">{fmtINR(d.amount)}</span>
          <div className="flex w-full flex-1 items-end bg-ink-50/70 rounded-t-lg p-0.5">
            <div
              className={`w-full rounded-t-md transition-all duration-500 shadow-xs ${color}`}
              style={{ height: `${Math.max(4, (d.amount / max) * 100)}%` }}
            />
          </div>
          <span className="text-[11px] font-medium text-ink-400">
            {new Date(`${d.month}-01`).toLocaleDateString(undefined, { month: 'short' })}
          </span>
        </div>
      ))}
    </div>
  );
}

const TABS = [
  { id: 'overview', label: 'Overview', icon: WalletIcon },
  { id: 'received', label: 'Received', icon: ArrowDownCircle },
  { id: 'dues', label: 'Pending Dues', icon: Clock3 },
  { id: 'payouts', label: 'Payouts Owed', icon: PiggyBank },
  { id: 'refunds', label: 'Refunds', icon: RotateCcw },
  { id: 'history', label: 'History', icon: History },
];

function AdminWalletContent() {
  const { toast } = useToast();
  const [tab, setTab] = useState('overview');
  const [summary, setSummary] = useState(null);
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const [commissionModalOpen, setCommissionModalOpen] = useState(false);
  const [payoutModalBooking, setPayoutModalBooking] = useState(null);
  const [refundModalOpen, setRefundModalOpen] = useState(false);
  const [resolveTarget, setResolveTarget] = useState(null);

  const loadSummary = () => {
    setLoadingSummary(true);
    api
      .get('/admin/wallet/summary')
      .then(({ data }) => setSummary(data.totals))
      .finally(() => setLoadingSummary(false));
  };

  useEffect(() => {
    loadSummary();
  }, [refreshKey]);

  useRefetchOnFocus(loadSummary);

  const refreshAll = () => setRefreshKey((k) => k + 1);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-ink-900">Wallet & Payments</h2>
          <p className="text-xs text-ink-500">
            Money received from customers, what&rsquo;s still due, refunds owed and provider payouts &mdash; with full history & analytics.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setCommissionModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-ink-200/80 bg-white px-3 py-1.5 text-xs font-medium text-ink-600 shadow-xs transition-all hover:bg-ink-50 hover:text-ink-900 active:scale-95"
          >
            <Settings size={13} />
            <span>
              Commission {summary ? `(${summary.commissionPercent}%)` : ''} &middot; Payout in {summary ? summary.payoutSlaDays : '\u2013'}d
            </span>
          </button>
          <button
            type="button"
            onClick={refreshAll}
            className="inline-flex items-center gap-1.5 rounded-xl border border-ink-200/80 bg-white px-3 py-1.5 text-xs font-medium text-ink-600 shadow-xs transition-all hover:bg-ink-50 hover:text-ink-900 active:scale-95"
          >
            <RefreshCw size={13} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {loadingSummary ? (
        <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-2xl" />
          ))}
        </div>
      ) : summary ? (
        <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-6">
          <StatCard label="Received from customers" value={fmtINR(summary.totalReceivedFromCustomers)} icon={ArrowDownCircle} tone="success" />
          <StatCard label="Pending from customers" value={fmtINR(summary.totalPendingFromCustomers)} icon={Clock3} tone="warning" />
          <StatCard label="Refunds owed" value={fmtINR(summary.totalRefundsPending)} icon={RotateCcw} tone="danger" sub={`${fmtINR(summary.totalRefundsPaid)} refunded so far`} />
          <StatCard label="Payouts owed to providers" value={fmtINR(summary.totalPayoutsPending)} icon={PiggyBank} tone="purple" sub={`${fmtINR(summary.totalPayoutsPaid)} paid out so far`} />
          <StatCard label="Commission earned" value={fmtINR(summary.commissionEarned)} icon={Percent} tone="brand" sub={`${summary.commissionPercent}% of ${summary.completedBookingsCount} completed bookings`} />
          <StatCard label="Net platform holdings" value={fmtINR(summary.netPlatformHoldings)} icon={BadgeIndianRupee} tone="brand" sub="Received minus refunds & payouts" />
        </div>
      ) : (
        <EmptyState text="Could not load wallet summary." />
      )}

      <div className="flex items-center gap-1 overflow-x-auto rounded-2xl border border-ink-100 bg-white p-1.5 shadow-xs scrollbar-none">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all ${
                active ? 'bg-brand-600 text-white shadow-xs' : 'text-ink-500 hover:bg-ink-50 hover:text-ink-900'
              }`}
            >
              <Icon size={14} />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      <div key={`${tab}-${refreshKey}`}>
        {tab === 'overview' && <OverviewTab />}
        {tab === 'received' && <ReceivedTab />}
        {tab === 'dues' && <DuesTab />}
        {tab === 'payouts' && <PayoutsTab onLogPayout={(b) => setPayoutModalBooking(b)} />}
        {tab === 'refunds' && <RefundsTab onNew={() => setRefundModalOpen(true)} onResolve={(t) => setResolveTarget(t)} />}
        {tab === 'history' && <HistoryTab onResolve={(t) => setResolveTarget(t)} />}
      </div>

      <CommissionModal
        isOpen={commissionModalOpen}
        onClose={() => setCommissionModalOpen(false)}
        currentPercent={summary?.commissionPercent}
        currentSlaDays={summary?.payoutSlaDays}
        currentCustomerFeePercent={summary?.customerCancellationFeePercent}
        currentProviderFeePercent={summary?.providerCancellationFeePercent}
        onSaved={() => {
          setCommissionModalOpen(false);
          refreshAll();
        }}
      />

      <PayoutModal
        booking={payoutModalBooking}
        onClose={() => setPayoutModalBooking(null)}
        onSaved={() => {
          setPayoutModalBooking(null);
          toast('Payout logged', { type: 'success' });
          refreshAll();
        }}
      />

      <RefundModal
        isOpen={refundModalOpen}
        onClose={() => setRefundModalOpen(false)}
        onSaved={() => {
          setRefundModalOpen(false);
          toast('Refund logged', { type: 'success' });
          refreshAll();
        }}
      />

      <ResolveModal
        target={resolveTarget}
        onClose={() => setResolveTarget(null)}
        onSaved={() => {
          setResolveTarget(null);
          toast('Transaction updated', { type: 'success' });
          refreshAll();
        }}
      />
    </div>
  );
}

function OverviewTab() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadAnalytics = () => {
    api
      .get('/admin/wallet/analytics')
      .then(({ data }) => setData(data))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadAnalytics();
  }, []);

  useRefetchOnFocus(loadAnalytics);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-48 w-full rounded-2xl" />
        <Skeleton className="h-48 w-full rounded-2xl" />
      </div>
    );
  }
  if (!data) return <EmptyState text="No analytics data available." />;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="p-5 border-ink-100 shadow-xs" hover={false}>
          <p className="text-xs font-bold text-ink-700">Received from customers &middot; last 6 months</p>
          <MonthlyBarChart data={data.monthly_received} color="bg-gradient-to-t from-emerald-600 to-teal-400" />
        </Card>
        <Card className="p-5 border-ink-100 shadow-xs" hover={false}>
          <p className="text-xs font-bold text-ink-700">Paid out to providers &middot; last 6 months</p>
          <MonthlyBarChart data={data.monthly_paid_out} color="bg-gradient-to-t from-purple-600 to-fuchsia-400" />
        </Card>
        <Card className="p-5 border-ink-100 shadow-xs" hover={false}>
          <p className="text-xs font-bold text-ink-700">Refunded to customers &middot; last 6 months</p>
          <MonthlyBarChart data={data.monthly_refunded} color="bg-gradient-to-t from-rose-600 to-amber-500" />
        </Card>
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="p-5 border-ink-100 shadow-xs" hover={false}>
          <p className="mb-3 text-xs font-bold text-ink-700">Top customers by spend</p>
          {data.top_customers_by_spend.length === 0 ? (
            <EmptyState text="No payments recorded yet." />
          ) : (
            <div className="space-y-2.5">
              {data.top_customers_by_spend.map((c, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-ink-700">{c.name}</span>
                  <span className="font-bold text-ink-900 font-mono">{fmtINR(c.total)}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
        <Card className="p-5 border-ink-100 shadow-xs" hover={false}>
          <p className="mb-3 text-xs font-bold text-ink-700">Top providers by earnings (gross)</p>
          {data.top_providers_by_earnings.length === 0 ? (
            <EmptyState text="No completed bookings yet." />
          ) : (
            <div className="space-y-2.5">
              {data.top_providers_by_earnings.map((p, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-ink-700">{p.name}</span>
                  <span className="font-bold text-ink-900 font-mono">{fmtINR(p.total)}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

function ReceivedTab() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const load = () => {
    setLoading(true);
    api
      .get('/admin/wallet/received')
      .then(({ data }) => setRows(data.customers || []))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  useRefetchOnFocus(load);

  const filtered = useMemo(() => {
    if (!search.trim()) return rows;
    const term = search.toLowerCase();
    return rows.filter((r) => r.name?.toLowerCase().includes(term) || r.email?.toLowerCase().includes(term) || r.phone?.includes(term));
  }, [rows, search]);

  return (
    <Card className="p-5 border-ink-100 shadow-xs" hover={false}>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs font-bold text-ink-700">Money received, grouped by customer</p>
        <div className="relative w-full sm:w-64">
          <Search size={13} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search customer..."
            className="w-full rounded-xl border border-ink-200/80 bg-white py-2 pl-8 pr-3 text-xs text-ink-900 placeholder-ink-400 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
          />
        </div>
      </div>
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <RowSkeleton key={i} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState text="No payments received yet." />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-ink-100 text-ink-400">
                <th className="py-2 font-semibold">Customer</th>
                <th className="py-2 font-semibold text-right">Total received</th>
                <th className="py-2 font-semibold text-right">Payments</th>
                <th className="py-2 font-semibold text-right">Last payment</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.customer_id} className="border-b border-ink-50 last:border-0">
                  <td className="py-3"><PersonCell user={{ name: r.name, email: r.email, phone: r.phone }} /></td>
                  <td className="py-3 text-right font-bold font-mono text-emerald-600">{fmtINR(r.total_received)}</td>
                  <td className="py-3 text-right text-ink-500">{r.transactions_count}</td>
                  <td className="py-3 text-right text-ink-500">{fmtDate(r.last_payment_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

function DuesTab() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadDues = () => {
    setLoading(true);
    api
      .get('/admin/wallet/pending-dues')
      .then(({ data }) => setRows(data.customers || []))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadDues();
  }, []);

  useRefetchOnFocus(loadDues);

  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <RowSkeleton key={i} />
        ))}
      </div>
    );
  }
  if (rows.length === 0) return <Card className="p-8 border-ink-100 shadow-xs" hover={false}><EmptyState text="No outstanding dues. Everyone's paid up." /></Card>;

  return (
    <div className="space-y-3.5">
      {rows.map((entry, i) => (
        <Card key={i} className="p-4 border-ink-100 shadow-xs" hover={false}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <PersonCell user={entry.customer} />
            <div className="flex items-center gap-4">
              {entry.due_now_total > 0 && (
                <div className="text-right">
                  <p className="text-[11px] text-ink-400">Due now</p>
                  <p className="font-bold font-mono text-rose-600">{fmtINR(entry.due_now_total)}</p>
                </div>
              )}
              <div className="text-right">
                <p className="text-[11px] text-ink-400">Total pending</p>
                <p className="font-bold font-mono text-amber-600">{fmtINR(entry.total_pending)}</p>
              </div>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2 border-t border-ink-50 pt-3">
            {entry.items.map((it, j) => (
              <Badge key={j} tone={it.due_now ? 'danger' : 'warning'} size="sm">
                {it.leg === 'advance' ? 'Advance' : 'Balance'} &middot; {fmtINR(it.amount)} {it.due_now ? '(due now)' : '(not due yet)'}
              </Badge>
            ))}
          </div>
        </Card>
      ))}
    </div>
  );
}

function PayoutsTab({ onLogPayout }) {
  const [rows, setRows] = useState([]);
  const [commission, setCommission] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api
      .get('/admin/wallet/payouts/pending')
      .then(({ data }) => {
        setRows(data.providers || []);
        setCommission(data.commission_percent);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <RowSkeleton key={i} />
        ))}
      </div>
    );
  }
  if (rows.length === 0) return <Card className="p-8 border-ink-100 shadow-xs" hover={false}><EmptyState text="No pending payouts to providers." /></Card>;

  return (
    <div className="space-y-3.5">
      <p className="text-[11px] text-ink-400">Payable = booking total minus the {commission}% platform commission, for fully-paid bookings.</p>
      {rows.map((entry, i) => (
        <Card key={i} className="p-4 border-ink-100 shadow-xs" hover={false}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <PersonCell user={entry.provider} />
            <div className="text-right">
              <p className="text-[11px] text-ink-400">Total owed</p>
              <p className="font-bold font-mono text-purple-600">{fmtINR(entry.total_pending)}</p>
            </div>
          </div>
          <div className="mt-3 space-y-2 border-t border-ink-50 pt-3">
            {entry.bookings.map((b) => (
              <div key={b.booking_id} className="flex flex-col gap-2 rounded-xl bg-ink-50/60 p-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-[11px] text-ink-500">
                  Booking with <span className="font-semibold text-ink-700">{b.customer?.name}</span> &middot; total {fmtINR(b.total_amount)} &middot; completed {fmtDate(b.work_completed_at)}
                  {b.already_paid > 0 && <> &middot; {fmtINR(b.already_paid)} already paid</>}
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-bold font-mono text-sm text-purple-600">{fmtINR(b.pending_amount)}</span>
                  <Button size="xs" variant="outline" onClick={() => onLogPayout({ ...b, provider: entry.provider })}>
                    Log payout
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      ))}
    </div>
  );
}

function RefundsTab({ onNew, onResolve }) {
  const [status, setStatus] = useState('pending');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    api
      .get('/admin/wallet/refunds', { params: status ? { status } : {} })
      .then(({ data }) => setRows(data.refunds || []))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [status]);

  return (
    <Card className="p-5 border-ink-100 shadow-xs" hover={false}>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {['pending', 'completed', 'failed', ''].map((s) => (
            <button
              key={s || 'all'}
              onClick={() => setStatus(s)}
              className={`rounded-xl px-3 py-1.5 text-xs font-semibold capitalize transition-all ${
                status === s ? 'bg-brand-600 text-white shadow-xs' : 'bg-ink-50 text-ink-500 hover:bg-ink-100'
              }`}
            >
              {s || 'All'}
            </button>
          ))}
        </div>
        <Button size="sm" onClick={onNew} icon={<RotateCcw size={14} />}>
          Log a refund
        </Button>
      </div>
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <RowSkeleton key={i} />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <EmptyState text="No refunds in this status." />
      ) : (
        <div className="space-y-2.5">
          {rows.map((r) => (
            <div key={r.id} className="flex flex-col gap-2 rounded-xl border border-ink-100 p-3.5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <PersonCell user={r.customer} sub={r.booking ? `Booking ${r.booking.id.slice(-6)}` : 'Not tied to a booking'} />
              </div>
              <div className="flex items-center gap-3">
                <span className="font-bold font-mono text-sm text-rose-600">{fmtINR(r.amount)}</span>
                <StatusPill status={r.status} />
                {r.status === 'pending' && (
                  <Button size="xs" variant="outline" onClick={() => onResolve(r)}>
                    Resolve
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function HistoryTab({ onResolve }) {
  const [filters, setFilters] = useState({ type: '', status: '', direction: '' });
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1 });
  const [loading, setLoading] = useState(true);

  const load = (page = 1) => {
    setLoading(true);
    const params = { page, limit: 20 };
    if (filters.type) params.type = filters.type;
    if (filters.status) params.status = filters.status;
    if (filters.direction) params.direction = filters.direction;
    api
      .get('/admin/wallet/history', { params })
      .then(({ data }) => {
        setRows(data.transactions || []);
        setPagination(data.pagination || { page: 1, pages: 1 });
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load(1);
  }, [filters]);

  const typeLabel = {
    advance_received: 'Advance received',
    balance_received: 'Balance received',
    payout: 'Payout to provider',
    refund: 'Refund to customer',
    adjustment: 'Adjustment',
  };

  return (
    <Card className="p-5 border-ink-100 shadow-xs" hover={false}>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <SelectInput
          value={filters.type}
          onChange={(e) => setFilters((f) => ({ ...f, type: e.target.value }))}
          className="!w-auto !py-1.5 text-xs"
        >
          <option value="">All types</option>
          <option value="advance_received">Advance received</option>
          <option value="balance_received">Balance received</option>
          <option value="payout">Payout</option>
          <option value="refund">Refund</option>
          <option value="adjustment">Adjustment</option>
        </SelectInput>
        <SelectInput
          value={filters.direction}
          onChange={(e) => setFilters((f) => ({ ...f, direction: e.target.value }))}
          className="!w-auto !py-1.5 text-xs"
        >
          <option value="">All directions</option>
          <option value="credit">Credit (in)</option>
          <option value="debit">Debit (out)</option>
        </SelectInput>
        <SelectInput
          value={filters.status}
          onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
          className="!w-auto !py-1.5 text-xs"
        >
          <option value="">All statuses</option>
          <option value="completed">Completed</option>
          <option value="pending">Pending</option>
          <option value="failed">Failed</option>
        </SelectInput>
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <RowSkeleton key={i} />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <EmptyState text="No transactions match these filters." />
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-ink-100 text-ink-400">
                  <th className="py-2 font-semibold">Date</th>
                  <th className="py-2 font-semibold">Type</th>
                  <th className="py-2 font-semibold">Customer</th>
                  <th className="py-2 font-semibold">Provider</th>
                  <th className="py-2 font-semibold text-right">Amount</th>
                  <th className="py-2 font-semibold">Status</th>
                  <th className="py-2 font-semibold"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((t) => (
                  <tr key={t.id} className="border-b border-ink-50 last:border-0">
                    <td className="py-3 text-ink-500 whitespace-nowrap">{fmtDate(t.createdAt)}</td>
                    <td className="py-3">
                      <div className="flex items-center gap-1.5">
                        {t.direction === 'credit' ? (
                          <ArrowDownCircle size={13} className="text-emerald-500" />
                        ) : (
                          <ArrowUpCircle size={13} className="text-rose-500" />
                        )}
                        <span className="font-medium text-ink-700">{typeLabel[t.type] || t.type}</span>
                      </div>
                    </td>
                    <td className="py-3 text-ink-600">{t.customer?.name || '\u2014'}</td>
                    <td className="py-3 text-ink-600">{t.provider?.name || '\u2014'}</td>
                    <td className={`py-3 text-right font-mono font-bold ${t.direction === 'credit' ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {t.direction === 'credit' ? '+' : '-'}
                      {fmtINR(t.amount)}
                    </td>
                    <td className="py-3"><StatusPill status={t.status} /></td>
                    <td className="py-3">
                      {t.status === 'pending' && ['payout', 'refund'].includes(t.type) && (
                        <Button size="xs" variant="outline" onClick={() => onResolve(t)}>
                          Resolve
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {pagination.pages > 1 && (
            <div className="mt-4 flex items-center justify-center gap-2">
              {Array.from({ length: pagination.pages }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => load(i + 1)}
                  className={`h-7 w-7 rounded-lg text-xs font-semibold transition-all ${
                    pagination.page === i + 1 ? 'bg-brand-600 text-white' : 'bg-ink-50 text-ink-500 hover:bg-ink-100'
                  }`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </Card>
  );
}

function CommissionModal({ isOpen, onClose, currentPercent, currentSlaDays, currentCustomerFeePercent, currentProviderFeePercent, onSaved }) {
  const [value, setValue] = useState(currentPercent ?? 10);
  const [slaDays, setSlaDays] = useState(currentSlaDays ?? 3);
  const [customerFeePercent, setCustomerFeePercent] = useState(currentCustomerFeePercent ?? 10);
  const [providerFeePercent, setProviderFeePercent] = useState(currentProviderFeePercent ?? 10);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      setValue(currentPercent ?? 10);
      setSlaDays(currentSlaDays ?? 3);
      setCustomerFeePercent(currentCustomerFeePercent ?? 10);
      setProviderFeePercent(currentProviderFeePercent ?? 10);
    }
  }, [isOpen, currentPercent, currentSlaDays, currentCustomerFeePercent, currentProviderFeePercent]);

  const save = async () => {
    setSaving(true);
    try {
      await api.patch('/admin/wallet/settings', {
        commission_percent: Number(value),
        payout_sla_days: Number(slaDays),
        customer_cancellation_fee_percent: Number(customerFeePercent),
        provider_cancellation_fee_percent: Number(providerFeePercent),
      });
      onSaved();
    } catch (err) {
      toast(err.response?.data?.message || 'Could not update settings', { type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm">
      <div className="p-6 space-y-4">
        <h3 className="text-base font-bold text-ink-900">Commission & payout settings</h3>
        <p className="text-xs text-ink-500">
          The commission is kept from every completed booking; the rest is payable to the provider. The payout promise
          is the number of business days you commit to settling a provider after the customer&rsquo;s final payment &mdash;
          shown to the provider on their Earnings page and in their &ldquo;final payment received&rdquo; notification.
        </p>
        <Field label="Commission percent" required>
          <TextInput type="number" min={0} max={100} step="0.5" value={value} onChange={(e) => setValue(e.target.value)} />
        </Field>
        <Field label="Payout promise (business days)" required hint="e.g. 3 means providers are told 'paid out within 3 business days'.">
          <TextInput type="number" min={0} max={60} step="1" value={slaDays} onChange={(e) => setSlaDays(e.target.value)} />
        </Field>
        <div className="border-t border-ink-100 pt-4 space-y-4">
          <p className="text-xs text-ink-500">
            Cancellation fees are charged to whichever side cancels a booking &mdash; deducted from the advance refund if
            it&rsquo;s already been paid, or logged as a pending amount owed to the platform otherwise.
          </p>
          <Field label="Customer cancellation fee (%)" required hint="Charged when the customer cancels.">
            <TextInput
              type="number"
              min={0}
              max={100}
              step="0.5"
              value={customerFeePercent}
              onChange={(e) => setCustomerFeePercent(e.target.value)}
            />
          </Field>
          <Field label="Provider cancellation fee (%)" required hint="Charged when the provider cancels.">
            <TextInput
              type="number"
              min={0}
              max={100}
              step="0.5"
              value={providerFeePercent}
              onChange={(e) => setProviderFeePercent(e.target.value)}
            />
          </Field>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" loading={saving} onClick={save}>Save</Button>
        </div>
      </div>
    </Modal>
  );
}

function PayoutModal({ booking, onClose, onSaved }) {
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('bank_transfer');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [markCompleted, setMarkCompleted] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (booking) {
      setAmount(booking.pending_amount ?? '');
      setReference('');
      setNotes('');
      setMarkCompleted(true);
    }
  }, [booking]);

  const save = async () => {
    if (!amount || Number(amount) <= 0) {
      toast('Enter a valid amount', { type: 'error' });
      return;
    }
    setSaving(true);
    try {
      await api.post('/admin/wallet/payouts', {
        booking: booking.booking_id,
        amount: Number(amount),
        method,
        reference,
        notes,
        mark_completed: markCompleted,
      });
      onSaved();
    } catch (err) {
      toast(err.response?.data?.message || 'Could not log payout', { type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={!!booking} onClose={onClose} size="md">
      {booking && (
        <div className="p-6 space-y-4">
          <h3 className="text-base font-bold text-ink-900">Log payout to {booking.provider?.name}</h3>
          <p className="text-xs text-ink-500">
            Record the bank transfer / UPI payment you made to this provider for their completed booking with {booking.customer?.name}.
            Amount owed: <span className="font-semibold text-ink-700">{fmtINR(booking.pending_amount)}</span>
          </p>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Amount (\u20b9)" required>
              <TextInput type="number" min={0} value={amount} onChange={(e) => setAmount(e.target.value)} />
            </Field>
            <Field label="Method">
              <SelectInput value={method} onChange={(e) => setMethod(e.target.value)}>
                <option value="bank_transfer">Bank transfer</option>
                <option value="upi">UPI</option>
                <option value="cash">Cash</option>
                <option value="other">Other</option>
              </SelectInput>
            </Field>
          </div>
          <Field label="Reference (UTR / transaction ID)">
            <TextInput value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Optional" />
          </Field>
          <Field label="Notes">
            <TextArea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" />
          </Field>
          <label className="flex items-center gap-2 text-xs text-ink-600">
            <input type="checkbox" checked={markCompleted} onChange={(e) => setMarkCompleted(e.target.checked)} className="rounded border-ink-300" />
            Already paid &mdash; mark as completed now
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
            <Button size="sm" loading={saving} onClick={save}>Log payout</Button>
          </div>
        </div>
      )}
    </Modal>
  );
}

function RefundModal({ isOpen, onClose, onSaved }) {
  const [bookingId, setBookingId] = useState('');
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('bank_transfer');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [markCompleted, setMarkCompleted] = useState(false);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      setBookingId('');
      setAmount('');
      setReference('');
      setNotes('');
      setMarkCompleted(false);
    }
  }, [isOpen]);

  const save = async () => {
    if (!bookingId.trim()) {
      toast('Enter a booking ID this refund relates to', { type: 'error' });
      return;
    }
    if (!amount || Number(amount) <= 0) {
      toast('Enter a valid amount', { type: 'error' });
      return;
    }
    setSaving(true);
    try {
      await api.post('/admin/wallet/refunds', {
        booking: bookingId.trim(),
        amount: Number(amount),
        method,
        reference,
        notes,
        mark_completed: markCompleted,
      });
      onSaved();
    } catch (err) {
      toast(err.response?.data?.message || 'Could not log refund', { type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      <div className="p-6 space-y-4">
        <h3 className="text-base font-bold text-ink-900">Log a refund</h3>
        <p className="text-xs text-ink-500">Record a refund owed or paid back to a customer for a booking (e.g. cancellation, dispute, overcharge).</p>
        <Field label="Booking ID" required hint="Copy from the booking or requirement detail page.">
          <TextInput value={bookingId} onChange={(e) => setBookingId(e.target.value)} placeholder="e.g. 66f0c1..." />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Amount (\u20b9)" required>
            <TextInput type="number" min={0} value={amount} onChange={(e) => setAmount(e.target.value)} />
          </Field>
          <Field label="Method">
            <SelectInput value={method} onChange={(e) => setMethod(e.target.value)}>
              <option value="bank_transfer">Bank transfer</option>
              <option value="upi">UPI</option>
              <option value="razorpay">Razorpay refund</option>
              <option value="cash">Cash</option>
              <option value="other">Other</option>
            </SelectInput>
          </Field>
        </div>
        <Field label="Reference">
          <TextInput value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Optional" />
        </Field>
        <Field label="Reason / notes">
          <TextArea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Why this refund is due" />
        </Field>
        <label className="flex items-center gap-2 text-xs text-ink-600">
          <input type="checkbox" checked={markCompleted} onChange={(e) => setMarkCompleted(e.target.checked)} className="rounded border-ink-300" />
          Already refunded &mdash; mark as completed now
        </label>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" loading={saving} onClick={save}>Log refund</Button>
        </div>
      </div>
    </Modal>
  );
}

function ResolveModal({ target, onClose, onSaved }) {
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (target) {
      setReference(target.reference || '');
      setNotes('');
    }
  }, [target]);

  const resolve = async (status) => {
    setSaving(true);
    try {
      await api.patch(`/admin/wallet/transactions/${target.id}/resolve`, { status, reference, notes });
      onSaved();
    } catch (err) {
      toast(err.response?.data?.message || 'Could not update transaction', { type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={!!target} onClose={onClose} size="sm">
      {target && (
        <div className="p-6 space-y-4">
          <h3 className="text-base font-bold text-ink-900">Resolve {target.type === 'payout' ? 'payout' : 'refund'}</h3>
          <p className="text-xs text-ink-500">
            Amount: <span className="font-semibold text-ink-700">{fmtINR(target.amount)}</span>
          </p>
          <Field label="Reference (UTR / transaction ID)">
            <TextInput value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Optional" />
          </Field>
          <Field label="Notes">
            <TextArea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="danger" size="sm" loading={saving} onClick={() => resolve('failed')}>
              Mark failed
            </Button>
            <Button size="sm" loading={saving} onClick={() => resolve('completed')}>
              Mark completed
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}

export default function AdminWalletPage() {
  return <AdminWalletContent />;
}
