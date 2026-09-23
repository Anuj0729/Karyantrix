'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronRight, LifeBuoy } from 'lucide-react';
import api from '../../../lib/api';
import Card from '../../../components/ui/Card';
import Badge from '../../../components/ui/Badge';
import StatusBadge from '../../../components/StatusBadge';
import { SelectInput } from '../../../components/ui/Field';
import { RowSkeleton } from '../../../components/ui/Skeleton';
import useRefetchOnFocus from '../../../lib/useRefetchOnFocus';

const CATEGORY_LABEL = {
  payment: 'Payment issue',
  payout: 'Payout issue',
  booking: 'Booking issue',
  account: 'Account issue',
  technical: 'Technical problem',
  other: 'Something else',
};

const PRIORITY_TONE = { low: 'neutral', normal: 'brand', high: 'warning', urgent: 'danger' };

const STATUS_TABS = [
  { key: 'unresolved', label: 'Unresolved' },
  { key: 'open', label: 'Open' },
  { key: 'in_progress', label: 'In progress' },
  { key: 'resolved', label: 'Resolved' },
  { key: 'closed', label: 'Closed' },
  { key: 'all', label: 'All' },
];

function fmtDate(d) {
  return d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
}

function TicketRow({ ticket }) {
  return (
    <Link href={`/admin/support/${ticket.id}`} className="group block">
      <Card className="flex items-center justify-between gap-4 p-5 border-ink-200/80 shadow-xs transition-all hover:border-brand-300 hover:shadow-card group-hover:-translate-y-0.5" hover={false}>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-bold text-ink-900 group-hover:text-brand-600 transition-colors">
              {ticket.user?.name || 'Unknown'} <span className="font-normal text-xs text-ink-400">({ticket.user_role})</span>
            </p>
            <StatusBadge status={ticket.status} kind="ticket" />
            <Badge tone={PRIORITY_TONE[ticket.priority] || 'neutral'} size="sm">{ticket.priority}</Badge>
          </div>
          <p className="mt-1 line-clamp-1 text-xs text-ink-600 leading-relaxed">{ticket.subject}</p>
          <div className="mt-2 flex items-center gap-2">
            <span className="rounded-md bg-ink-100 px-2 py-0.5 text-[10px] font-semibold text-ink-700">
              {CATEGORY_LABEL[ticket.category] || ticket.category}
            </span>
            <span className="text-[11px] text-ink-400">Last activity {fmtDate(ticket.last_message_at)}</span>
          </div>
        </div>
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-ink-50 text-ink-400 group-hover:bg-brand-50 group-hover:text-brand-600 transition-colors shrink-0">
          <ChevronRight size={16} aria-hidden="true" />
        </div>
      </Card>
    </Link>
  );
}

function AdminSupportContent() {
  const [status, setStatus] = useState('unresolved');
  const [category, setCategory] = useState('all');
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    const params = {};
    if (status !== 'all') params.status = status;
    if (category !== 'all') params.category = category;
    api
      .get('/admin/support', { params })
      .then(({ data }) => setTickets(data.tickets || []))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [status, category]);

  useRefetchOnFocus(load);

  return (
    <div className="space-y-5">
      <div>
        <div className="flex items-center gap-2">
          <LifeBuoy size={20} className="text-brand-600" />
          <h2 className="text-xl font-bold tracking-tight text-ink-900">Support Tickets</h2>
        </div>
        <p className="mt-1 text-xs text-ink-500">Issues raised by customers and providers &mdash; payments, payouts, bookings, accounts and more.</p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {STATUS_TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setStatus(t.key)}
              className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
                status === t.key ? 'bg-brand-600 text-white shadow-xs' : 'bg-ink-50 text-ink-500 hover:bg-ink-100'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <SelectInput value={category} onChange={(e) => setCategory(e.target.value)} className="!w-auto !py-1.5 text-xs">
          <option value="all">All categories</option>
          {Object.entries(CATEGORY_LABEL).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </SelectInput>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <RowSkeleton key={i} />
          ))}
        </div>
      ) : tickets.length === 0 ? (
        <Card className="p-10 text-center border-ink-100 shadow-xs" hover={false}>
          <LifeBuoy size={28} className="mx-auto mb-3 text-ink-300" />
          <p className="text-sm font-semibold text-ink-700">No tickets here</p>
          <p className="mt-1 text-xs text-ink-400">Nothing matches this filter right now.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {tickets.map((t) => (
            <TicketRow key={t.id} ticket={t} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function AdminSupportPage() {
  return <AdminSupportContent />;
}
