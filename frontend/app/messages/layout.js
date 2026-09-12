'use client';

import { usePathname } from 'next/navigation';
import { MessageCircle } from 'lucide-react';
import ProtectedRoute from '../../components/ProtectedRoute';
import ConversationList from '../../components/chat/ConversationList';

export default function MessagesLayout({ children }) {
  const pathname = usePathname();
  const activeConversationId =
    pathname && pathname !== '/messages' && pathname.startsWith('/messages/')
      ? pathname.slice('/messages/'.length).split('/')[0]
      : null;
  const hasActiveThread = !!activeConversationId;

  return (
    <ProtectedRoute allowedRoles={['customer', 'provider']}>
      <div className="flex h-[calc(100vh-180px)] min-h-[520px] max-h-[900px] overflow-hidden rounded-2xl border border-ink-200/80 bg-white shadow-card transition-all">
        <div
          className={`${hasActiveThread ? 'hidden' : 'flex'} w-full shrink-0 flex-col border-ink-100 sm:flex sm:w-[360px] sm:border-r bg-ink-50/20`}
        >
          <div className="flex items-center justify-between border-b border-ink-100/80 bg-white/80 px-4 py-3.5 backdrop-blur-sm">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                <MessageCircle size={18} aria-hidden="true" />
              </div>
              <span className="text-sm font-bold tracking-tight text-ink-900">Conversations</span>
            </div>
            <span className="text-xs font-semibold text-ink-400">Direct Chat</span>
          </div>
          <ConversationList activeId={activeConversationId} getHref={(id) => `/messages/${id}`} />
        </div>

        <div className={`${hasActiveThread ? 'flex' : 'hidden'} min-w-0 flex-1 flex-col sm:flex bg-white`}>
          {children}
        </div>
      </div>
    </ProtectedRoute>
  );
}
