'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Award,
  Briefcase,
  CheckCircle2,
  ClipboardList,
  Gavel,
  Hammer,
  IdCard,
  MessageCircle,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  UserPlus,
  Users,
  Wallet,
} from 'lucide-react';
import Button from '../../components/ui/Button';
import { useAuth } from '../../context/AuthContext';

const EASE = [0.16, 1, 0.3, 1];

const ROLES = [
  { key: 'customer', label: 'For Customers', icon: Users },
  { key: 'provider', label: 'For Providers', icon: Briefcase },
];

const STEPS = {
  customer: [
    {
      step: '01',
      icon: UserPlus,
      title: 'Create your free account',
      desc: 'Sign up with your phone or email in under a minute. No fees to browse or post a requirement.',
    },
    {
      step: '02',
      icon: ClipboardList,
      title: 'Post your requirement',
      desc: 'Tell Karyantrix what you need done, your budget, preferred timing and address. Or search and browse verified providers directly.',
    },
    {
      step: '03',
      icon: Gavel,
      title: 'Receive and compare bids',
      desc: 'Verified local providers send in quotes. Compare price, ratings, reviews and portfolios side by side before choosing.',
    },
    {
      step: '04',
      icon: MessageCircle,
      title: 'Chat and confirm',
      desc: 'Message your chosen provider inside Karyantrix to finalise the details, then confirm the booking.',
    },
    {
      step: '05',
      icon: ShieldCheck,
      title: 'Track the job in real time',
      desc: 'Follow progress from first hello to finished job, with updates and support if anything needs attention.',
    },
    {
      step: '06',
      icon: Wallet,
      title: 'Pay safely and review',
      desc: 'Your payment stays in escrow and is released only when you are satisfied. Leave a review to help the community.',
    },
  ],
  provider: [
    {
      step: '01',
      icon: UserPlus,
      title: 'Register on Karyantrix',
      desc: 'Create your provider account and tell us about the services and skills you offer.',
    },
    {
      step: '02',
      icon: IdCard,
      title: 'Get verified',
      desc: 'Submit your Aadhaar, bank passbook and a live photo. Our team reviews every application before approval.',
    },
    {
      step: '03',
      icon: Briefcase,
      title: 'Set services, rates and area',
      desc: 'List your services, starting prices, availability and the service radius you want to work in.',
    },
    {
      step: '04',
      icon: Search,
      title: 'Bid on real requirements',
      desc: 'Browse live customer requirements near you and send competitive, transparent quotes.',
    },
    {
      step: '05',
      icon: Hammer,
      title: 'Do the job, chat and track',
      desc: 'Coordinate with the customer over chat, complete the work and update progress as you go.',
    },
    {
      step: '06',
      icon: Star,
      title: 'Get paid and build reputation',
      desc: 'Receive secure payment once the job is confirmed, then grow your rating with every genuine booking.',
    },
  ],
};

const TRUST_POINTS = [
  { icon: ShieldCheck, title: 'Verified professionals', desc: 'Aadhaar, bank passbook and live photo checked before approval' },
  { icon: Wallet, title: 'Escrow protected payments', desc: 'Money is released only when the customer is satisfied' },
  { icon: Award, title: 'Transparent pricing', desc: 'Upfront rates from every bid, with zero hidden fees' },
];

/** Small badge that stamps the Karyantrix logo, reused across the page. */
function LogoBadge({ size = 44, className = '' }) {
  return (
    <div
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-tr from-brand-600 via-brand-700 to-accent-500 shadow-glow-brand ${className}`}
      style={{ height: size, width: size }}
    >
      <Image
        src="/logo.png"
        alt="Karyantrix"
        width={size}
        height={size}
        className="h-full w-full object-cover p-1.5"
      />
    </div>
  );
}

export default function HowItWorksClient() {
  const { user } = useAuth();
  const [role, setRole] = useState(user?.role === 'provider' ? 'provider' : 'customer');

  const steps = useMemo(() => STEPS[role], [role]);
  const isProvider = role === 'provider';

  return (
    <div className="space-y-16 sm:space-y-20">
      {/* ------------------------------ HERO ------------------------------ */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-950 via-[#2F2677] to-brand-950 px-6 py-14 text-center text-white shadow-modal sm:px-12 sm:py-16">
        <div className="absolute inset-0 bg-hero-radial opacity-70" aria-hidden="true" />
        <div
          className="absolute inset-0 opacity-[0.04]"
          aria-hidden="true"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.8) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />
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
          <Sparkles size={13} aria-hidden="true" /> How Karyantrix works
        </motion.p>
        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.15, ease: EASE }}
          className="relative mx-auto max-w-2xl font-display text-3xl font-bold tracking-tight sm:text-4xl"
        >
          From first post to job done, here&apos;s the whole journey
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.2, ease: EASE }}
          className="relative mx-auto mt-3 max-w-xl text-sm leading-relaxed text-brand-100 sm:text-base"
        >
          Whether you need work done or want to grow your business, Karyantrix keeps it simple, verified and safe. Pick a side below to see the steps.
        </motion.p>

        {/* Role switcher */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.28, ease: EASE }}
          className="relative mx-auto mt-8 inline-flex items-center gap-1 rounded-2xl bg-white/10 p-1 ring-1 ring-white/15 backdrop-blur"
          role="tablist"
          aria-label="Choose a role to view its steps"
        >
          {ROLES.map((r) => {
            const Icon = r.icon;
            const active = role === r.key;
            return (
              <button
                key={r.key}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setRole(r.key)}
                className={`relative flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors sm:px-5 ${
                  active ? 'text-brand-900' : 'text-white/80 hover:text-white'
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="role-pill"
                    className="absolute inset-0 rounded-xl bg-white shadow-card"
                    transition={{ duration: 0.3, ease: EASE }}
                  />
                )}
                <Icon size={16} className="relative" aria-hidden="true" />
                <span className="relative">{r.label}</span>
              </button>
            );
          })}
        </motion.div>
      </section>

      {/* ---------------------------- STEP LIST ---------------------------- */}
      <section aria-labelledby="steps-heading">
        <div className="mx-auto mb-10 max-w-2xl text-center">
          <p className="mb-2 flex items-center justify-center gap-1.5 text-xs font-bold uppercase tracking-wider text-brand-600">
            <Sparkles size={13} aria-hidden="true" /> {isProvider ? 'Provider journey' : 'Customer journey'}
          </p>
          <h2 id="steps-heading" className="font-display text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl">
            {isProvider ? 'Six steps to winning real work' : 'Six steps to getting the job done'}
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-ink-500 sm:text-base">
            {isProvider
              ? 'Apply once, get verified and start bidding on requirements near you.'
              : 'Post once, compare verified bids and relax while the job gets done.'}
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {steps.map((s, i) => {
            const Icon = s.icon;
            return (
              <motion.div
                key={`${role}-${s.step}`}
                initial={{ opacity: 0, y: 28 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.5, delay: i * 0.08, ease: EASE }}
                whileHover={{ y: -6 }}
                className="relative rounded-3xl border border-ink-100 bg-white p-6 shadow-card transition-shadow duration-300 hover:shadow-card-hover"
              >
                <div className="flex items-start justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-brand-600 to-accent-500 text-white shadow-glow-brand">
                    <Icon size={22} aria-hidden="true" />
                  </div>
                  <LogoBadge size={28} className="opacity-90" />
                </div>
                <span className="mt-4 block text-[11px] font-extrabold uppercase tracking-widest text-brand-500">
                  Step {s.step}
                </span>
                <h3 className="mt-1 font-display text-base font-bold text-ink-900">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-500">{s.desc}</p>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* ----------------------------- TRUST ----------------------------- */}
      <section aria-labelledby="trust-heading" className="rounded-3xl border border-ink-100 bg-ink-50/60 p-7 sm:p-10">
        <div className="mx-auto mb-8 max-w-2xl text-center">
          <div className="mx-auto mb-4">
            <LogoBadge size={48} className="mx-auto" />
          </div>
          <h2 id="trust-heading" className="font-display text-xl font-bold tracking-tight text-ink-900 sm:text-2xl">
            Every step is backed by the same promise
          </h2>
          <p className="mt-2 text-sm text-ink-500">Kaam Aapka, Zimmedari Hamari &mdash; your work, our responsibility.</p>
        </div>
        <div className="grid gap-5 sm:grid-cols-3">
          {TRUST_POINTS.map((t) => {
            const Icon = t.icon;
            return (
              <div key={t.title} className="flex items-start gap-3 rounded-2xl bg-white p-5 shadow-card">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-500/10 text-brand-600">
                  <Icon size={19} aria-hidden="true" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-ink-900">{t.title}</h4>
                  <p className="mt-1 text-xs leading-relaxed text-ink-500">{t.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ------------------------------ CTA ------------------------------ */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-ink-900 to-ink-950 px-6 py-12 text-center text-white sm:px-10">
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 opacity-10" aria-hidden="true">
          <Image src="/logo.png" alt="" width={160} height={160} className="h-full w-full object-contain" />
        </div>
        <div className="pointer-events-none absolute -left-10 -bottom-10 h-40 w-40 opacity-10" aria-hidden="true">
          <Image src="/logo.png" alt="" width={160} height={160} className="h-full w-full object-contain" />
        </div>
        <h2 className="relative font-display text-2xl font-bold tracking-tight sm:text-3xl">
          {isProvider ? 'Ready to start bidding?' : 'Ready to get your work done?'}
        </h2>
        <p className="relative mx-auto mt-2 max-w-md text-sm text-ink-300">
          {isProvider
            ? 'Apply in minutes and get verified to bid on requirements near you.'
            : 'Post your requirement for free and hear back from verified providers today.'}
        </p>
        <div className="relative mt-6 flex flex-wrap items-center justify-center gap-3">
          {isProvider ? (
            <Link href="/become-provider" className="inline-block">
              <Button variant="accent" size="lg" icon={<Briefcase size={18} aria-hidden="true" />}>
                Become a Provider
              </Button>
            </Link>
          ) : (
            <Link href="/requirements" className="inline-block">
              <Button variant="accent" size="lg" icon={<ClipboardList size={18} aria-hidden="true" />}>
                Post a Requirement
              </Button>
            </Link>
          )}
          <Link href="/providers" className="inline-block">
            <Button variant="secondary" size="lg" icon={<CheckCircle2 size={18} aria-hidden="true" />} className="!bg-white/10 !text-white !border-white/20 hover:!bg-white/20">
              Browse Providers
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
