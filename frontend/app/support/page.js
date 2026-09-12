'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronRight, LifeBuoy, Plus } from 'lucide-react';
import api from '../../lib/api';
import { useToast } from '../../components/ui/Toast';
import ProtectedRoute from '../../components/ProtectedRoute';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import StatusBadge from '../../components/StatusBadge';
import { Field, TextInput, TextArea, SelectInput } from '../../components/ui/Field';
import { RowSkeleton } from '../../components/ui/Skeleton';
import useRefetchOnFocus from '../../lib/useRefetchOnFocus';

const CATEGORY_LABEL = {
  payment: 'Payment issue',
  payout: 'Payout issue',
  booking: 'Booking issue',
  account: 'Account issue',
  technical: 'Technical problem',
  other: 'Something else',
};

const TABS = [
  { key: 'all', label: 'All' },
  { key: 'open', label: 'Open' },
  { key: 'in_progress', label: 'In progress' },
  { key: 'resolved', label: 'Resolved' },
  { key: 'closed', label: 'Closed' },
];

function fmtDate(d) {
  return d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
}

function TicketRow({ ticket }) {
  return (
    <Link href={`/support/${ticket.id}`} className="group block">
      <Card className="flex items-center justify-between gap-4 p-4.5 border-ink-200/80 shadow-xs transition-all hover:border-brand-300 hover:shadow-card group-hover:-translate-y-0.5" hover={false}>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-bold text-ink-900 group-hover:text-brand-600 transition-colors">{ticket.subject}</p>
            <StatusBadge status={ticket.status} kind="ticket" />
          </div>
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

function NewTicketModal({ isOpen, onClose, onCreated }) {
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState('payment');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      setSubject('');
      setCategory('payment');
      setMessage('');
    }
  }, [isOpen]);

  const submit = async () => {
    if (!subject.trim() || !message.trim()) {
      toast('Please fill in the subject and describe your issue', { type: 'error' });
      return;
    }
    setSaving(true);
    try {
      const { data } = await api.post('/support', { subject: subject.trim(), category, message: message.trim() });
      onCreated(data.ticket);
    } catch (err) {
      toast(err.response?.data?.message || 'Could not submit your ticket', { type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      <div className="p-6 space-y-4">
        <h3 className="text-base font-bold text-ink-900">Raise a support ticket</h3>
        <p className="text-xs text-ink-500">Tell us what's wrong &mdash; our team will reply here as soon as possible.</p>
        <Field label="What's this about?" required>
          <SelectInput value={category} onChange={(e) => setCategory(e.target.value)}>
            {Object.entries(CATEGORY_LABEL).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </SelectInput>
        </Field>
        <Field label="Subject" required>
          <TextInput value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. My payout hasn't arrived yet" maxLength={150} />
        </Field>
        <Field label="Describe the issue" required>
          <TextArea rows={5} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Include booking ID, dates, or amounts if relevant" maxLength={2000} />
        </Field>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" loading={saving} onClick={submit}>Submit ticket</Button>
        </div>
      </div>
    </Modal>
  );
}

function SupportContent() {
  const [tab, setTab] = useState('all');
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  const load = () => {
    setLoading(true);
    api
      .get('/support/mine', { params: tab !== 'all' ? { status: tab } : {} })
      .then(({ data }) => setTickets(data.tickets || []))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [tab]);

  useRefetchOnFocus(load);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <LifeBuoy size={20} className="text-brand-600" />
            <h1 className="text-xl font-bold tracking-tight text-ink-900">Help & Support</h1>
          </div>
          <p className="mt-1 text-xs text-ink-500">
            Payment, payout, booking or account issue? Raise a ticket and our team will help you sort it out.
          </p>
        </div>
        <Button size="sm" icon={<Plus size={14} />} onClick={() => setModalOpen(true)}>
          New ticket
        </Button>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
              tab === t.key ? 'bg-brand-600 text-white shadow-xs' : 'bg-ink-50 text-ink-500 hover:bg-ink-100'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <RowSkeleton key={i} />
          ))}
        </div>
      ) : tickets.length === 0 ? (
        <Card className="p-10 text-center border-ink-100 shadow-xs" hover={false}>
          <LifeBuoy size={28} className="mx-auto mb-3 text-ink-300" />
          <p className="text-sm font-semibold text-ink-700">No tickets yet</p>
          <p className="mt-1 text-xs text-ink-400">Facing an issue with a payment, payout or booking? Raise a ticket and we'll help.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {tickets.map((t) => (
            <TicketRow key={t.id} ticket={t} />
          ))}
        </div>
      )}

      <NewTicketModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={(ticket) => {
          setModalOpen(false);
          setTickets((prev) => [ticket, ...prev]);
          window.location.href = `/support/${ticket.id}`;
        }}
      />
    </div>
  );
}

export default function SupportPage() {
  return (
    <ProtectedRoute allowedRoles={['customer', 'provider']}>
      <SupportContent />
    </ProtectedRoute>
  );
}
