'use client';

import { motion } from 'framer-motion';
import { BarChart3, Lock, Mail, ShieldCheck, User, Users } from 'lucide-react';

export default function AuthIllustration({ variant = 'login' }) {
  return (
    <div className="relative mx-auto flex h-60 w-full max-w-[270px] items-center justify-center lg:h-68">
      <div className="pointer-events-none absolute h-40 w-40 rounded-full bg-brand-400/25 blur-2xl" />

      <motion.div
        animate={{
          y: [0, -10, 0],
          rotate: [-0.5, 0.5, -0.5],
        }}
        transition={{
          duration: 6,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className="relative w-full rounded-3xl border border-white/60 bg-white/95 p-5 shadow-modal backdrop-blur-md"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-100 to-brand-200 text-brand-700 shadow-xs">
            <User size={20} aria-hidden="true" />
          </div>
          <div className="flex-1 space-y-2">
            <div className="h-2.5 w-3/4 rounded-full bg-ink-200" />
            <div className="h-2 w-1/2 rounded-full bg-ink-100" />
          </div>
        </div>

        {variant === 'otp' ? (
          <div className="mt-4 flex items-center justify-center gap-2 rounded-2xl bg-brand-50/80 py-4 border border-brand-100/60">
            {Array.from({ length: 6 }).map((_, i) => (
              <motion.span
                key={i}
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.15 }}
                className={`h-2.5 w-2.5 rounded-full ${i < 3 ? 'bg-brand-600 shadow-xs' : 'bg-brand-200'}`}
              />
            ))}
          </div>
        ) : (
          <div className="mt-4 space-y-2.5 rounded-2xl bg-ink-50/80 p-3.5 border border-ink-100/60">
            <div className="h-2 w-full rounded-full bg-ink-200" />
            <div className="h-8 w-full rounded-xl bg-gradient-to-r from-brand-100 via-brand-200 to-accent-100/80" />
          </div>
        )}

        {variant !== 'otp' && (
          <div className="mt-3.5 flex items-center justify-between rounded-xl bg-gradient-to-r from-brand-600 to-brand-700 px-3.5 py-2.5 shadow-sm">
            <div className="flex items-center gap-2">
              <Lock size={14} className="text-white" aria-hidden="true" />
              <span className="text-[10px] font-bold text-white/90 uppercase tracking-wider">Secure</span>
            </div>
            <div className="flex gap-1.5">
              {Array.from({ length: 4 }).map((_, i) => (
                <span key={i} className="h-1.5 w-1.5 rounded-full bg-white/80" />
              ))}
            </div>
          </div>
        )}
      </motion.div>

      <motion.div
        animate={{
          y: [0, 8, 0],
          rotate: [0, 4, 0, -4, 0],
        }}
        transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut', delay: 0.3 }}
        className="absolute -right-3 -top-1 flex h-12 w-12 items-center justify-center rounded-2xl border border-white/80 bg-white shadow-card-hover ring-1 ring-black/5"
      >
        {variant === 'register' ? (
          <Users size={20} className="text-brand-600" aria-hidden="true" />
        ) : (
          <BarChart3 size={20} className="text-brand-600" aria-hidden="true" />
        )}
      </motion.div>

      <motion.div
        animate={{
          y: [0, -8, 0],
          rotate: [0, -4, 0, 4, 0],
        }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 0.15 }}
        className="absolute -bottom-3 -left-3 flex h-12 w-12 items-center justify-center rounded-2xl border border-white/80 bg-trust-500 text-white shadow-glow-trust"
      >
        {variant === 'otp' ? (
          <Mail size={20} className="text-white" aria-hidden="true" />
        ) : (
          <ShieldCheck size={22} className="text-white" aria-hidden="true" />
        )}
      </motion.div>
    </div>
  );
}
