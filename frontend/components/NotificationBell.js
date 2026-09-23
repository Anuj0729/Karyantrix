'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { Bell, BellOff, CheckCheck, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';

export default function NotificationBell() {
  const { notifications = [], setNotifications } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const router = useRouter();

  const unreadCount = notifications.length;

  useEffect(() => {
    const onClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const clearAll = async () => {
    try {
      await api.patch('/notifications/read-all');
    } catch (err) {

    }
    setNotifications([]);
    setOpen(false);
  };

  const handleNotificationClick = async (n) => {
    const id = n.id || n._id;
    setNotifications((prev) => prev.filter((x) => (x.id || x._id) !== id));
    setOpen(false);
    try {
      await api.patch(`/notifications/${id}/read`);
    } catch (err) {

    }
    if (n.related_booking) {
      router.push(`/bookings?open=${n.related_booking}`);
    } else if (n.related_requirement) {
      router.push(`/requirements/${n.related_requirement}`);
    }
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className={`relative flex h-9 w-9 items-center justify-center rounded-xl border border-ink-200/80 transition-all duration-150 ${open
            ? 'border-brand-300 bg-brand-50 text-brand-700'
            : 'text-ink-600 hover:bg-ink-100/80 hover:text-ink-900'
          }`}
        aria-label="Notifications"
      >
        <Bell size={18} aria-hidden="true" />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4.5 min-w-[18px] items-center justify-center rounded-full bg-gradient-to-r from-accent-500 to-red-500 px-1 text-[10px] font-bold text-white shadow-xs">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{
              opacity: 0,
              y: -8,
              scale: 0.97,
            }}
            animate={{
              opacity: 1,
              y: 0,
              scale: 1,
            }}
            exit={{
              opacity: 0,
              y: -6,
              scale: 0.97,
            }}
            transition={{
              duration: 0.18,
              ease: [0.16, 1, 0.3, 1],
            }}
            className="
        fixed
        left-3
        right-3
        top-[62px]
        z-[9999]

        overflow-hidden
        rounded-2xl
        border border-ink-200
        bg-white

        shadow-[0_20px_50px_rgba(15,23,42,0.16)]
        ring-1 ring-black/[0.03]

        sm:absolute
        sm:left-auto
        sm:right-0
        sm:top-full
        sm:mt-3
        sm:w-[380px]
      "
          >
            <div
              className="
          flex
          min-h-[58px]
          items-center
          justify-between
          gap-4
          border-b border-ink-100
          bg-white
          px-4
          py-3
        "
            >
              <div className="flex min-w-0 items-center gap-2">
                <div
                  className="
              flex
              h-8
              w-8
              shrink-0
              items-center
              justify-center
              rounded-lg
              bg-brand-50
              text-brand-600
            "
                >
                  <Bell size={16} />
                </div>

                <div className="min-w-0">
                  <h3 className="truncate text-sm font-bold text-ink-900">
                    Notifications
                  </h3>

                  {unreadCount > 0 && (
                    <p className="text-[11px] text-ink-400">
                      {unreadCount} unread notification
                      {unreadCount !== 1 ? 's' : ''}
                    </p>
                  )}
                </div>
              </div>

              <Link
                href="/notifications"
                onClick={() => setOpen(false)}
                className="
            shrink-0
            whitespace-nowrap
            rounded-lg
            px-2
            py-1
            text-xs
            font-semibold
            text-brand-600
            transition-colors
            hover:bg-brand-50
            hover:text-brand-800
          "
              >
                See all
              </Link>
            </div>

            {notifications.length > 0 && (
              <div
                className="
            flex
            items-center
            justify-end
            border-b border-ink-100
            bg-ink-50/40
            px-4
            py-2
          "
              >
                <button
                  type="button"
                  onClick={clearAll}
                  className="
              flex
              items-center
              gap-1.5
              rounded-lg
              px-2
              py-1
              text-xs
              font-semibold
              text-brand-600
              transition-colors
              hover:bg-brand-50
              hover:text-brand-800
            "
                >
                  <CheckCheck size={14} />
                  Mark all as read
                </button>
              </div>
            )}

            <div className="max-h-[360px] overflow-y-auto">
              {notifications.length === 0 ? (
                <div
                  className="
              flex
              min-h-[250px]
              flex-col
              items-center
              justify-center
              px-6
              py-10
              text-center
            "
                >
                  <div
                    className="
                mb-4
                flex
                h-14
                w-14
                items-center
                justify-center
                rounded-2xl
                bg-ink-100
                text-ink-400
              "
                  >
                    <BellOff
                      size={24}
                      strokeWidth={1.7}
                    />
                  </div>

                  <p className="text-sm font-bold text-ink-800">
                    All caught up!
                  </p>

                  <p className="mt-1 max-w-[230px] text-xs leading-5 text-ink-400">
                    You have no unread notifications.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-ink-100/80">
                  {notifications.map((n, i) => (
                    <button
                      type="button"
                      key={n.id || n._id || i}
                      onClick={() => handleNotificationClick(n)}
                      className="
                  flex
                  w-full
                  items-start
                  gap-3
                  px-4
                  py-3.5
                  text-left
                  transition-colors
                  hover:bg-ink-50/70
                "
                    >
                      <div
                        className="
                    mt-0.5
                    flex
                    h-9
                    w-9
                    shrink-0
                    items-center
                    justify-center
                    rounded-xl
                    bg-brand-50
                    text-brand-600
                  "
                      >
                        <Sparkles size={15} />
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-semibold text-ink-900">
                          {n.title}
                        </p>

                        <p className="mt-1 text-xs leading-relaxed text-ink-500">
                          {n.message}
                        </p>

                        {n.createdAt && (
                          <p className="mt-1.5 text-[10px] text-ink-400">
                            {new Date(n.createdAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
