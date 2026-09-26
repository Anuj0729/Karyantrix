'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronDown,
  ClipboardList,
  LifeBuoy,
  Search,
  Sparkles,
  X,
} from 'lucide-react';
import Button from '../../components/ui/Button';
import { CATEGORIES, FAQS } from './helpData';

const EASE = [0.16, 1, 0.3, 1];

function FaqItem({ faq, isOpen, onToggle }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-card">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
      >
        <span className="text-sm font-semibold text-ink-900 sm:text-[15px]">{faq.q}</span>
        <motion.span
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.25, ease: EASE }}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ink-50 text-ink-500"
        >
          <ChevronDown size={15} aria-hidden="true" />
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: EASE }}
          >
            <div className="px-5 pb-5 text-sm leading-relaxed text-ink-500">
              <p>{faq.a}</p>
              {faq.link && (
                <Link
                  href={faq.link.href}
                  className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700"
                >
                  {faq.link.label} &rarr;
                </Link>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function HelpClient() {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [openKey, setOpenKey] = useState(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return FAQS.filter((f) => {
      const matchesCategory = category === 'all' || f.category === category;
      const matchesQuery = !q || f.q.toLowerCase().includes(q) || f.a.toLowerCase().includes(q);
      return matchesCategory && matchesQuery;
    });
  }, [query, category]);

  return (
    <div className="space-y-12 sm:space-y-16">
      {/* ------------------------------ HERO ------------------------------ */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-950 via-[#2F2677] to-brand-950 px-6 py-14 text-center text-white shadow-modal sm:px-12 sm:py-16">
        <div className="absolute inset-0 bg-hero-radial opacity-70" aria-hidden="true" />
        <motion.div
          initial={{ opacity: 0, y: -12, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5, ease: EASE }}
          className="relative mx-auto mb-5 flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl bg-white/10 p-2 shadow-glow-brand ring-1 ring-white/20 backdrop-blur"
        >
          <Image src="/logo.png" alt="Karyantrix" width={64} height={64} className="h-full w-full object-contain" />
        </motion.div>
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1, ease: EASE }}
          className="relative mx-auto mb-2 flex items-center justify-center gap-1.5 text-xs font-bold uppercase tracking-wider text-brand-200"
        >
          <Sparkles size={13} aria-hidden="true" /> Help Center
        </motion.p>
        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.15, ease: EASE }}
          className="relative mx-auto max-w-xl font-display text-3xl font-bold tracking-tight sm:text-4xl"
        >
          How can we help?
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.2, ease: EASE }}
          className="relative mx-auto mt-3 max-w-lg text-sm leading-relaxed text-brand-100 sm:text-base"
        >
          Quick answers about requirements, bids, bookings, payments and becoming a provider.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.28, ease: EASE }}
          className="relative mx-auto mt-8 max-w-xl"
        >
          <div className="flex items-center gap-2.5 rounded-2xl bg-white/95 px-4 py-3 shadow-card">
            <Search size={18} className="shrink-0 text-ink-400" aria-hidden="true" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search for a topic, e.g. escrow, cancellation, verification"
              className="w-full bg-transparent text-sm text-ink-800 placeholder:text-ink-400 focus:outline-none"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                aria-label="Clear search"
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-ink-400 hover:bg-ink-100 hover:text-ink-600"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </motion.div>
      </section>

      {/* --------------------------- FAQ CONTENT --------------------------- */}
      <section aria-labelledby="faq-heading">
        <div className="mx-auto mb-8 max-w-2xl text-center">
          <h2 id="faq-heading" className="font-display text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl">
            Frequently asked questions
          </h2>
        </div>

        <div className="mx-auto mb-8 flex max-w-3xl flex-wrap justify-center gap-2">
          {CATEGORIES.map((c) => (
            <button
              key={c.key}
              type="button"
              onClick={() => setCategory(c.key)}
              className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all ${
                category === c.key ? 'bg-brand-600 text-white shadow-xs' : 'bg-ink-50 text-ink-500 hover:bg-ink-100'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        <div className="mx-auto max-w-3xl space-y-3">
          {filtered.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-ink-200 bg-white py-14 text-center shadow-xs">
              <LifeBuoy size={26} className="mx-auto mb-3 text-ink-300" />
              <p className="text-sm font-semibold text-ink-700">No matching questions</p>
              <p className="mt-1 text-xs text-ink-400">Try a different search term, or raise a support ticket below.</p>
            </div>
          ) : (
            filtered.map((f) => (
              <FaqItem
                key={f.q}
                faq={f}
                isOpen={openKey === f.q}
                onToggle={() => setOpenKey((prev) => (prev === f.q ? null : f.q))}
              />
            ))
          )}
        </div>
      </section>

      {/* ------------------------------ CTA ------------------------------ */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-ink-900 to-ink-950 px-6 py-12 text-center text-white sm:px-10">
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 opacity-10" aria-hidden="true">
          <Image src="/logo.png" alt="" width={160} height={160} className="h-full w-full object-contain" />
        </div>
        <div className="relative mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-white ring-1 ring-white/20">
          <LifeBuoy size={20} aria-hidden="true" />
        </div>
        <h2 className="relative mt-4 font-display text-2xl font-bold tracking-tight sm:text-3xl">Still need help?</h2>
        <p className="relative mx-auto mt-2 max-w-md text-sm text-ink-300">
          Can&apos;t find your answer? Raise a support ticket and our team will get back to you.
        </p>
        <div className="relative mt-6 flex flex-wrap items-center justify-center gap-3">
          <Link href="/support" className="inline-block">
            <Button variant="accent" size="lg" icon={<LifeBuoy size={18} aria-hidden="true" />}>
              Raise a Support Ticket
            </Button>
          </Link>
          <Link href="/how-it-works" className="inline-block">
            <Button
              variant="secondary"
              size="lg"
              icon={<ClipboardList size={18} aria-hidden="true" />}
              className="!bg-white/10 !text-white !border-white/20 hover:!bg-white/20"
            >
              See How It Works
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
