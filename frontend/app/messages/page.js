'use client';

import { MessageCircle } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default function MessagesWelcomePage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 bg-gradient-to-b from-ink-50/30 to-white px-6 text-center">
      <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-tr from-brand-100 to-accent-100 shadow-sm border border-brand-200/50">
        <MessageCircle size={36} className="text-brand-600" aria-hidden="true" />
        <span className="absolute -top-1 -right-1 flex h-4 w-4">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-4 w-4 bg-accent-500"></span>
        </span>
      </div>
      <div className="max-w-sm space-y-1.5">
        <h3 className="text-lg font-bold text-ink-900">Your Direct Conversations</h3>
        <p className="text-sm text-ink-500 leading-relaxed">
          Select a chat from the sidebar to view messages, share updates, send voice notes, and coordinate service details securely.
        </p>
      </div>
      <div className="flex items-center gap-2 rounded-full border border-ink-200/70 bg-white px-3.5 py-1.5 text-xs text-ink-500 shadow-xs">
        <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
        <span>End-to-end secure in-app messaging</span>
      </div>
    </div>
  );
}
