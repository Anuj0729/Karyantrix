'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { MessageCircle, Search, UserRound, X } from 'lucide-react';
import { useChat } from '../../context/ChatContext';
import { Skeleton } from '../ui/Skeleton';
import { resolveMediaUrl } from './mediaUrl';
import { formatConversationWhen, formatFullTimestamp } from '../../lib/chatDate';

export default function ConversationList({ activeId, getHref }) {
  const { conversations, conversationsLoaded, selectConversation } = useChat();
  const router = useRouter();
  const [search, setSearch] = useState('');

  const handleSelect = (id) => {
    if (getHref) router.push(getHref(id));
    else selectConversation(id);
  };

  const filteredConversations = conversations.filter((c) => {
    if (!search.trim()) return true;
    const term = search.toLowerCase();
    const name = c.other_participant?.name?.toLowerCase() || '';
    const preview = c.last_message_preview?.toLowerCase() || '';
    return name.includes(term) || preview.includes(term);
  });

  if (!conversationsLoaded) {
    return (
      <div className="space-y-3 p-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-16 rounded-xl" />
        ))}
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-16 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-ink-100/70 text-ink-400">
          <MessageCircle size={24} aria-hidden="true" />
        </div>
        <p className="text-sm font-semibold text-ink-800">No conversations yet</p>
        <p className="max-w-[220px] text-xs text-ink-400 leading-relaxed">
          Visit a provider&apos;s profile and click &quot;Contact&quot; to start chatting.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="border-b border-ink-100 p-2.5">
        <div className="relative flex items-center">
          <Search size={14} className="absolute left-3 text-ink-400" aria-hidden="true" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search conversations..."
            className="w-full rounded-xl border border-ink-200/80 bg-ink-50/50 py-1.5 pl-8 pr-7 text-xs text-ink-800 placeholder-ink-400 outline-none transition focus:border-brand-500 focus:bg-white focus:ring-1 focus:ring-brand-500"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-2.5 text-ink-400 hover:text-ink-600"
              aria-label="Clear search"
            >
              <X size={13} />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto divide-y divide-ink-50">
        {filteredConversations.length === 0 ? (
          <div className="py-8 text-center text-xs text-ink-400">
            No chats matching &quot;{search}&quot;
          </div>
        ) : (
          filteredConversations.map((c) => {
            const avatarSrc = resolveMediaUrl(c.other_participant?.avatar_url);
            const isActive = activeId === c.id;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => handleSelect(c.id)}
                className={`group flex w-full items-center gap-3 px-3.5 py-3 text-left transition-all ${
                  isActive
                    ? 'border-l-[3px] border-l-brand-600 bg-brand-50/60 shadow-xs'
                    : 'border-l-[3px] border-l-transparent hover:bg-ink-50/60'
                }`}
              >
                <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full bg-ink-100 ring-2 ring-white shadow-xs">
                  {avatarSrc ? (
                    <img src={avatarSrc} alt={c.other_participant?.name} className="h-full w-full object-cover" loading="lazy" decoding="async" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-brand-50 text-brand-700 font-bold text-xs">
                      {c.other_participant?.name ? c.other_participant.name.slice(0, 2).toUpperCase() : <UserRound size={18} />}
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className={`truncate text-xs font-semibold ${isActive ? 'text-brand-950 font-bold' : 'text-ink-900'}`}>
                      {c.other_participant?.name}
                    </p>
                    <span
                      title={formatFullTimestamp(c.last_message_at)}
                      className={`shrink-0 text-[10px] ${isActive ? 'text-brand-700 font-medium' : 'text-ink-400'}`}
                    >
                      {formatConversationWhen(c.last_message_at)}
                    </span>
                  </div>
                  <p className={`truncate text-[11px] mt-0.5 ${c.unread_count > 0 ? 'font-semibold text-ink-900' : 'text-ink-500'}`}>
                    {c.last_message_preview || 'Say hello 👋'}
                  </p>
                </div>
                {c.unread_count > 0 && (
                  <span className="flex h-5 min-w-[20px] shrink-0 items-center justify-center rounded-full bg-brand-600 px-1.5 text-[10px] font-bold text-white shadow-xs ring-2 ring-white">
                    {c.unread_count > 9 ? '9+' : c.unread_count}
                  </span>
                )}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
