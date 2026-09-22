'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import { ShieldCheck } from 'lucide-react';
import AuthIllustration from './AuthIllustration';

export default function AuthShell({
  variant = 'login',
  asideTitle,
  asideSubtitle,
  asideBadge,
  features,
  footerTitle = 'Your data is safe with us',
  footerText = "We'll never share your information.",
  topRight,
  children,
}) {
  return (
    <div className="mx-auto w-full max-w-5xl py-2 sm:py-6">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="grid overflow-hidden rounded-3xl border border-ink-100 bg-white shadow-card-hover md:grid-cols-2"
      >
        <div className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-brand-600 via-brand-700 to-ink-900 p-8 md:flex lg:p-10 text-white">
          <div className="absolute inset-0 bg-hero-mesh opacity-20 pointer-events-none" aria-hidden="true" />

          <div className="relative z-10">
            <Link href="/" className="group inline-flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-2xl bg-white shadow-soft p-1.5">
                <Image src="/logo.png" alt="Karyantrix" width={40} height={40} priority className="h-full w-full object-contain" />
              </div>
              <span className="font-display text-xl font-bold tracking-tight text-white">Karyantrix</span>
            </Link>

            <h2 className="mt-8 font-display text-3xl lg:text-4xl font-bold leading-tight text-white tracking-tight">{asideTitle}</h2>
            <p className="mt-3 max-w-sm text-sm text-brand-100/90 leading-relaxed">{asideSubtitle}</p>

            {asideBadge && (
              <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur-md px-4 py-1.5 text-xs font-semibold text-white border border-white/20 shadow-soft">
                {asideBadge}
              </div>
            )}
          </div>

          <div className="relative z-10 my-4">
            <AuthIllustration variant={variant} />
          </div>

          <div className="relative z-10">
            {features ? (
              <div className="space-y-3.5">
                {features.map((f) => (
                  <div key={f.title} className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-sm border border-white/15 text-brand-200 shadow-soft">
                      {f.icon}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white leading-tight">{f.title}</p>
                      <p className="text-xs text-brand-200/80 mt-0.5">{f.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-start gap-3 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/15 p-3.5">
                <ShieldCheck size={20} className="shrink-0 text-brand-300 mt-0.5" aria-hidden="true" />
                <div className="text-xs">
                  <span className="block font-bold text-white">{footerTitle}</span>
                  <span className="text-brand-200/90 mt-0.5 block">{footerText}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col p-6 sm:p-8 lg:p-12">
          <div className="mb-6 flex items-center justify-between gap-4">
            <Link href="/" className="flex items-center gap-2.5 md:hidden">
              <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl bg-brand-50 border border-brand-100 p-1">
                <Image src="/logo.png" alt="Karyantrix" width={36} height={36} className="h-full w-full object-contain" />
              </div>
              <span className="font-display text-lg font-bold text-ink-900">Karyantrix</span>
            </Link>
            <div className="ml-auto text-xs sm:text-sm font-medium">{topRight}</div>
          </div>

          {children}
        </div>
      </motion.div>
    </div>
  );
}
