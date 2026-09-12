'use client';

import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

const CONFIGS = {
  success: {
    icon: CheckCircle2,
    iconColor: 'text-trust-600',
    border: 'border-trust-200/80',
    bg: 'bg-trust-50/70',
    bar: 'bg-trust-500',
  },
  error: {
    icon: AlertCircle,
    iconColor: 'text-red-600',
    border: 'border-red-200/80',
    bg: 'bg-red-50/70',
    bar: 'bg-red-500',
  },
  warning: {
    icon: AlertTriangle,
    iconColor: 'text-gold-600',
    border: 'border-gold-200/80',
    bg: 'bg-gold-50/70',
    bar: 'bg-gold-500',
  },
  info: {
    icon: Info,
    iconColor: 'text-brand-600',
    border: 'border-brand-200/80',
    bg: 'bg-brand-50/70',
    bar: 'bg-brand-600',
  },
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (message, { type = 'info', title = null, duration = 4000 } = {}) => {
      const id = Math.random().toString(36).slice(2);
      setToasts((prev) => [...prev, { id, message, type, title }]);
      if (duration) setTimeout(() => dismiss(id), duration);
      return id;
    },
    [dismiss]
  );

  // ToastProvider also wraps the entire app, so memoize the value to avoid
  // re-rendering every consumer whenever the toasts list changes.
  const value = useMemo(() => ({ toast, dismiss }), [toast, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-4 z-[100] flex flex-col items-center gap-2.5 px-4 sm:items-end sm:right-6 sm:left-auto">
        <AnimatePresence>
          {toasts.map((t) => {
            const config = CONFIGS[t.type] || CONFIGS.info;
            const Icon = config.icon;

            return (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, y: -16, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95, transition: { duration: 0.15 } }}
                transition={{ type: 'spring', stiffness: 450, damping: 30 }}
                className={`pointer-events-auto relative flex w-full max-w-sm items-start gap-3 overflow-hidden rounded-2xl border bg-white/95 p-4 shadow-popover backdrop-blur-md ${config.border}`}
                role="status"
              >
                <div className={`absolute left-0 top-0 bottom-0 w-1 ${config.bar}`} />
                <div className={`mt-0.5 rounded-lg p-1 ${config.bg}`}>
                  <Icon size={18} className={config.iconColor} aria-hidden="true" />
                </div>
                <div className="flex-1 text-sm">
                  {t.title && <p className="font-semibold text-ink-900 leading-tight">{t.title}</p>}
                  <p className={`text-ink-600 text-xs leading-relaxed ${t.title ? 'mt-1' : ''}`}>
                    {t.message}
                  </p>
                </div>
                <button
                  onClick={() => dismiss(t.id)}
                  aria-label="Dismiss notification"
                  className="shrink-0 rounded-lg p-1 text-ink-400 hover:bg-ink-100 hover:text-ink-700 transition-colors"
                >
                  <X size={15} aria-hidden="true" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a ToastProvider');
  return ctx;
};
