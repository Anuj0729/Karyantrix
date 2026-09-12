'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Send, ShieldCheck } from 'lucide-react';
import api from '../../../lib/api';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../components/ui/Toast';
import ProtectedRoute from '../../../components/ProtectedRoute';
import Card from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import StatusBadge from '../../../components/StatusBadge';
import { TextArea } from '../../../components/ui/Field';
import { Skeleton } from '../../../components/ui/Skeleton';
import useRefetchOnFocus from '../../../lib/useRefetchOnFocus';

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

function MessageBubble({ msg, isMine }) {
  const isAdmin = msg.sender_role === 'admin';
  return (
    <div className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-xs shadow-xs ${
        isMine ? 'bg-brand-600 text-white rounded-br-sm' : isAdmin ? 'bg-emerald-50 text-ink-800 rounded-bl-sm border border-emerald-100' : 'bg-ink-100 text-ink-800 rounded-bl-sm'
      }`}>
        <div className="mb-1 flex items-center gap-1.5">
          {isAdmin && <ShieldCheck size={11} className={isMine ? 'text-white' : 'text-emerald-600'} />}
          <span className={`text-[10px] font-bold uppercase tracking-wide ${isMine ? 'text-brand-100' : isAdmin ? 'text-emerald-600' : 'text-ink-500'}`}>
            {isAdmin ? 'Support Team' : msg.sender?.name || 'You'}
          </span>
        </div>
        <p className="whitespace-pre-wrap leading-relaxed">{msg.message}</p>
        <p className={`mt-1 text-[10px] ${isMine ? 'text-brand-200' : 'text-ink-400'}`}>{fmtDateTime(msg.createdAt)}</p>
      </div>
    </div>
  );
}

function TicketThreadContent() {
  const { id } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
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
      toast(err.response?.data?.message || 'Could not send your message', { type: 'error' });
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 space-y-4">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-40 w-full rounded-2xl" />
      </div>
    );
  }
  if (!ticket) {
    return <div className="mx-auto max-w-2xl px-4 py-16 text-center text-sm text-ink-400">Ticket not found.</div>;
  }

  const closed = ['resolved', 'closed'].includes(ticket.status);

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <Link href="/support" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-ink-500 transition-colors hover:text-brand-600">
        <ArrowLeft size={16} aria-hidden="true" />
        Back to my tickets
      </Link>

      <Card className="p-5 border-ink-100 shadow-xs" hover={false}>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-base font-bold text-ink-900">{ticket.subject}</h1>
          <StatusBadge status={ticket.status} kind="ticket" />
        </div>
        <p className="mt-1 text-[11px] text-ink-400">
          {CATEGORY_LABEL[ticket.category] || ticket.category} &middot; Raised {fmtDateTime(ticket.createdAt)}
        </p>
      </Card>

      <div className="my-4 space-y-3">
        {ticket.messages.map((m) => (
          <MessageBubble key={m.id} msg={m} isMine={m.sender?.id === user?.id} />
        ))}
        <div ref={bottomRef} />
      </div>

      {closed ? (
        <Card className="p-4 border-ink-100 shadow-xs text-center" hover={false}>
          <p className="text-xs text-ink-500">
            This ticket is marked <span className="font-semibold">{ticket.status}</span>. Still need help? Just reply below and we&rsquo;ll reopen it.
          </p>
        </Card>
      ) : null}

      <div className="mt-3 flex items-end gap-2">
        <TextArea rows={2} value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Type your reply..." className="flex-1" />
        <Button size="sm" loading={sending} disabled={!reply.trim()} onClick={sendReply} icon={<Send size={14} />}>
          Send
        </Button>
      </div>
    </div>
  );
}

export default function TicketThreadPage() {
  return (
    <ProtectedRoute allowedRoles={['customer', 'provider']}>
      <TicketThreadContent />
    </ProtectedRoute>
  );
}
