'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Send, ShieldCheck } from 'lucide-react';
import api from '../../../../lib/api';
import { useToast } from '../../../../components/ui/Toast';
import Card from '../../../../components/ui/Card';
import Button from '../../../../components/ui/Button';
import StatusBadge from '../../../../components/StatusBadge';
import { TextArea, SelectInput } from '../../../../components/ui/Field';
import { Skeleton } from '../../../../components/ui/Skeleton';
import useRefetchOnFocus from '../../../../lib/useRefetchOnFocus';

const CATEGORY_LABEL = {
  payment: 'Payment issue',
  payout: 'Payout issue',
  booking: 'Booking issue',
  account: 'Account issue',
  technical: 'Technical problem',
  other: 'Something else',
};

const fmtDateTime = (d) =>
  d
    ? new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
    : '';

function MessageBubble({ msg, isAdminSender }) {
  return (
    <div className={`flex ${isAdminSender ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-xs shadow-xs ${
        isAdminSender ? 'bg-emerald-600 text-white rounded-br-sm' : 'bg-ink-100 text-ink-800 rounded-bl-sm'
      }`}>
        <div className="mb-1 flex items-center gap-1.5">
          {isAdminSender && <ShieldCheck size={11} className="text-white" />}
          <span className={`text-[10px] font-bold uppercase tracking-wide ${isAdminSender ? 'text-emerald-100' : 'text-ink-500'}`}>
            {isAdminSender ? 'You (Support Team)' : msg.sender?.name || 'User'}
          </span>
        </div>
        <p className="whitespace-pre-wrap leading-relaxed">{msg.message}</p>
        <p className={`mt-1 text-[10px] ${isAdminSender ? 'text-emerald-100' : 'text-ink-400'}`}>{fmtDateTime(msg.createdAt)}</p>
      </div>
    </div>
  );
}

function AdminTicketThreadContent() {
  const { id } = useParams();
  const { toast } = useToast();
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const [updating, setUpdating] = useState(false);
  const bottomRef = useRef(null);

  const load = () => {
    api
      .get(`/support/${id}`)
      .then(({ data }) => setTicket(data.ticket))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [id]);

  useRefetchOnFocus(load);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [ticket?.messages?.length]);

  const sendReply = async () => {
    if (!reply.trim()) return;
    setSending(true);
    try {
      const { data } = await api.post(`/support/${id}/messages`, { message: reply.trim() });
      setTicket(data.ticket);
      setReply('');
    } catch (err) {
      toast(err.response?.data?.message || 'Could not send your reply', { type: 'error' });
    } finally {
      setSending(false);
    }
  };

  const updateField = async (field, value) => {
    setUpdating(true);
    try {
      const { data } = await api.patch(`/admin/support/${id}/status`, { [field]: value });
      setTicket((prev) => ({ ...prev, ...data.ticket }));
      toast('Ticket updated', { type: 'success' });
    } catch (err) {
      toast(err.response?.data?.message || 'Could not update ticket', { type: 'error' });
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-40 w-full rounded-2xl" />
      </div>
    );
  }
  if (!ticket) return <p className="text-sm text-ink-400">Ticket not found.</p>;

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Link href="/admin/support" className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-500 transition-colors hover:text-brand-600">
        <ArrowLeft size={16} aria-hidden="true" />
        Back to all tickets
      </Link>

      <Card className="p-5 border-ink-100 shadow-xs" hover={false}>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-base font-bold text-ink-900">{ticket.subject}</h1>
          <StatusBadge status={ticket.status} kind="ticket" />
        </div>
        <p className="mt-1 text-[11px] text-ink-400">
          {ticket.user?.name} ({ticket.user_role}) &middot; {CATEGORY_LABEL[ticket.category] || ticket.category} &middot; Raised {fmtDateTime(ticket.createdAt)}
        </p>
        {ticket.user?.email && <p className="text-[11px] text-ink-400">{ticket.user.email} {ticket.user.phone ? `\u00b7 ${ticket.user.phone}` : ''}</p>}

        <div className="mt-4 grid grid-cols-2 gap-3 border-t border-ink-50 pt-4">
          <div>
            <label className="mb-1 block text-[11px] font-semibold text-ink-500">Status</label>
            <SelectInput value={ticket.status} disabled={updating} onChange={(e) => updateField('status', e.target.value)}>
              <option value="open">Open</option>
              <option value="in_progress">In progress</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </SelectInput>
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-semibold text-ink-500">Priority</label>
            <SelectInput value={ticket.priority} disabled={updating} onChange={(e) => updateField('priority', e.target.value)}>
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </SelectInput>
          </div>
        </div>
      </Card>

      <div className="space-y-3">
        {ticket.messages.map((m) => (
          <MessageBubble key={m.id} msg={m} isAdminSender={m.sender_role === 'admin'} />
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="flex items-end gap-2">
        <TextArea rows={2} value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Reply to this ticket..." className="flex-1" />
        <Button size="sm" loading={sending} disabled={!reply.trim()} onClick={sendReply} icon={<Send size={14} />}>
          Send
        </Button>
      </div>
    </div>
  );
}

export default function AdminTicketThreadPage() {
  return <AdminTicketThreadContent />;
}
