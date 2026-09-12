'use client';

import { useRouter, usePathname } from 'next/navigation';
import { MessageCircle } from 'lucide-react';
import { useChat } from '../../context/ChatContext';
import { useNavigationLoading } from '../../context/NavigationLoadingContext';

export default function ChatButton() {
  const { totalUnread } = useChat();
  const router = useRouter();
  const pathname = usePathname();
  const navLoading = useNavigationLoading();

  const handleClick = (e) => {
    if (pathname === '/messages') return;
    navLoading?.beginNavigation(e.currentTarget);
    router.push('/messages');
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className="relative rounded-lg p-2 text-ink-600 transition-colors hover:bg-ink-100"
      aria-label="Messages"
    >
      <MessageCircle size={22} aria-hidden="true" />
      {totalUnread > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white animate-pulse-ring">
          {totalUnread > 9 ? '9+' : totalUnread}
        </span>
      )}
    </button>
  );
}
