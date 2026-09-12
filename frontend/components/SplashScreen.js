'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';

export default function SplashScreen() {
  const { loading } = useAuth();
  const [visible, setVisible] = useState(true);

  // This splash screen is only meant to cover the very first app load while
  // auth state is being resolved. It must NOT re-trigger on subsequent
  // client-side navigations, or every link click/back-forward navigation
  // would be blocked by a ~1s full-screen overlay.
  useEffect(() => {
    const startTime = Date.now();
    const MIN_DISPLAY_MS = 600;
    const MAX_TIMEOUT_MS = 2600;

    let timeoutId;

    const tryDismiss = () => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, MIN_DISPLAY_MS - elapsed);
      timeoutId = setTimeout(() => {
        setVisible(false);
      }, remaining);
    };

    if (!loading) {
      tryDismiss();
    } else {
      const safetyId = setTimeout(() => {
        setVisible(false);
      }, MAX_TIMEOUT_MS);
      return () => {
        clearTimeout(timeoutId);
        clearTimeout(safetyId);
      };
    }

    return () => clearTimeout(timeoutId);
    // Intentionally runs once on mount only (not on pathname changes).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="karyantrix-splash"
          role="status"
          aria-live="polite"
          aria-label="Loading Karyantrix"
          initial={{ opacity: 1 }}
          exit={{
            opacity: 0,
            scale: 1.04,
            filter: 'blur(8px)',
            transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] },
          }}
          className="fixed inset-0 z-[999] flex flex-col items-center justify-center bg-white/95 backdrop-blur-xl"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: [0.3, 0.6, 0.3], scale: [0.85, 1.15, 0.85] }}
            transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
            className="pointer-events-none absolute h-72 w-72 rounded-full bg-gradient-to-tr from-brand-500/20 via-brand-600/15 to-accent-500/20 blur-3xl"
          />

          <div className="relative z-10 flex flex-col items-center">
            <div className="relative flex items-center justify-center">
              <motion.div
                initial={{ scale: 0.8, opacity: 0.7 }}
                animate={{ scale: [1, 1.45, 1.7], opacity: [0.5, 0.2, 0] }}
                transition={{ duration: 2.2, repeat: Infinity, ease: 'easeOut' }}
                className="absolute h-24 w-24 rounded-3xl border border-brand-400/40 bg-brand-100/20"
              />
              <motion.div
                initial={{ scale: 0.8, opacity: 0.7 }}
                animate={{ scale: [1, 1.3, 1.55], opacity: [0.6, 0.3, 0] }}
                transition={{ duration: 2.2, repeat: Infinity, ease: 'easeOut', delay: 0.4 }}
                className="absolute h-24 w-24 rounded-3xl border border-accent-400/30 bg-accent-100/10"
              />

              <motion.div
                initial={{ scale: 0.65, opacity: 0, rotate: -6 }}
                animate={{ scale: 1, opacity: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 260, damping: 20 }}
                className="relative flex h-20 w-20 items-center justify-center overflow-hidden rounded-3xl border border-white/80 bg-white p-3 shadow-modal ring-1 ring-black/5"
              >
                <Image
                  src="/logo.png"
                  alt="Karyantrix"
                  width={68}
                  height={68}
                  priority
                  className="h-full w-full object-contain"
                />
                <motion.div
                  className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/40 to-transparent"
                  initial={{ x: '-100%' }}
                  animate={{ x: '100%' }}
                  transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut', repeatDelay: 1 }}
                />
              </motion.div>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.18, duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
              className="mt-6 text-center"
            >
              <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-ink-900">
                <span className="bg-gradient-to-r from-brand-600 via-brand-700 to-accent-600 bg-clip-text text-transparent">
                  Karyantrix
                </span>
              </h1>
              <motion.p
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.4 }}
                className="mt-1 text-xs font-semibold uppercase tracking-widest text-ink-400"
              >
                Kaam Aapka, Zimmedari Hamari
              </motion.p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 140 }}
              transition={{ delay: 0.35, duration: 0.4 }}
              className="mt-7 h-1 overflow-hidden rounded-full bg-ink-100"
            >
              <motion.div
                initial={{ x: '-100%' }}
                animate={{ x: '100%' }}
                transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
                className="h-full w-1/2 rounded-full bg-gradient-to-r from-brand-600 to-accent-500"
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.3 }}
              className="mt-3 flex items-center gap-1.5"
            >
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-brand-600 [animation-delay:-0.3s]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-brand-600 [animation-delay:-0.15s]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-brand-600" />
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
