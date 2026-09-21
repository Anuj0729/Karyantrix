'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, useInView, useReducedMotion } from 'framer-motion';
import {
  ArrowRight,
  BadgeCheck,
  Briefcase,
  CheckCircle2,
  ChevronRight,
  Gavel,
  Handshake,
  LayoutGrid,
  Lock,
  MapPinned,
  MessageCircle,
  PenSquare,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  UserCheck,
  Users,
  XCircle,
} from 'lucide-react';
import dynamic from 'next/dynamic';
const RequirementComposerModal = dynamic(() => import('../components/RequirementComposerModal'));
import Button from '../components/ui/Button';
import { Skeleton } from '../components/ui/Skeleton';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';
import useRefetchOnFocus from '../lib/useRefetchOnFocus';

const EASE = [0.16, 1, 0.3, 1];

const FEATURES = [
  {
    icon: ShieldCheck,
    title: 'Verified professionals',
    desc: 'Our team reviews every provider’s Aadhaar, bank passbook and live photo before they are allowed to bid.',
  },
  {
    icon: Gavel,
    title: 'Bids, not guesswork',
    desc: 'Post your requirement once and receive quotes from local providers. Compare price, ratings and profile side by side.',
  },
  {
    icon: Lock,
    title: 'Escrow protected payments',
    desc: 'Your money stays protected and is released only when you are satisfied with the finished work.',
  },
  {
    icon: MessageCircle,
    title: 'Real-time chat & tracking',
    desc: 'Talk to your provider inside Karyantrix and follow the progress of your job from the first hello to the last detail.',
  },
  {
    icon: Star,
    title: 'Genuine reviews',
    desc: 'Ratings come only from completed bookings, so what you read is what real customers experienced.',
  },
  {
    icon: MapPinned,
    title: 'Matched to your area',
    desc: 'Requirements reach providers inside their own service radius, so help is always close by.',
  },
];

const COMPARISON = [
  {
    topic: 'Finding a professional',
    old: 'Calling around and asking neighbours for numbers',
    now: 'Post once and verified providers come to you',
  },
  {
    topic: 'Comparing prices',
    old: 'Scattered phone quotes that are hard to compare',
    now: 'Bids with ratings and profiles, side by side',
  },
  {
    topic: 'Trust',
    old: 'An unknown person walking into your home',
    now: 'Identity documents reviewed before a provider can bid',
  },
  {
    topic: 'Payment',
    old: 'Cash upfront and hoping the job gets done',
    now: 'Escrow that releases only when you are satisfied',
  },
  {
    topic: 'Reviews',
    old: 'Word of mouth you cannot verify',
    now: 'Ratings from genuine completed bookings only',
  },
  {
    topic: 'When things go wrong',
    old: 'Nobody to turn to',
    now: 'Report or raise a support ticket anytime',
  },
];

const HOW_IT_WORKS = [
  {
    icon: PenSquare,
    step: '01',
    title: 'Post your requirement',
    desc: 'Tell us what you need in seconds: the work, your budget, timing and address.',
  },
  {
    icon: Gavel,
    step: '02',
    title: 'Receive and compare bids',
    desc: 'Verified providers send their quotes. Review ratings and profiles, then pick the best fit.',
  },
  {
    icon: Handshake,
    step: '03',
    title: 'Hire and relax',
    desc: 'Chat, track progress in real time and pay safely once the work is done.',
  },
];

const AUDIENCES = [
  {
    icon: Users,
    title: 'For customers',
    points: [
      'Post your requirement for free and let local professionals come to you',
      'Compare bids, ratings and profiles side by side before you decide',
      'Chat and track progress in real time, from first hello to finished job',
      'Pay through escrow, released only when you are satisfied',
      'Raise a report or support ticket anytime if something goes wrong',
    ],
  },
  {
    icon: Briefcase,
    title: 'For service providers',
    points: [
      'Apply once. Our team reviews your Aadhaar, bank passbook and live photo',
      'Bid on real requirements within your own service radius',
      'Set your own rates, availability and service area',
      'Build a lasting reputation with reviews from genuine bookings',
      'Get paid securely through the platform',
    ],
  },
];

const FALLBACK_CATEGORY_NAMES = ['Home repairs', 'Tutoring', 'Wellness', 'Events', 'Everyday tasks'];

const HERO_WORDS_TOP = ['Kaam', 'Aapka,'];
const HERO_WORDS_BOTTOM = ['Zimmedari', 'Hamari'];

/* ---------- Small animated building blocks ---------- */

function AnimatedNumber({ value }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });
  const reduceMotion = useReducedMotion();
  const [display, setDisplay] = useState(0);
  const fromRef = useRef(0);

  useEffect(() => {
    if (!inView || value == null) return undefined;
    if (reduceMotion) {
      fromRef.current = value;
      setDisplay(value);
      return undefined;
    }

    // Animates from whatever is on screen to the new value, so live updates
    // (a new provider registering, a new category being added) glide smoothly.
    const from = fromRef.current;
    const start = performance.now();
    const duration = 1600;
    let raf;

    const tick = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 4);
      const current = Math.round(from + (value - from) * eased);
      fromRef.current = current;
      setDisplay(current);
      if (progress < 1) raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, value, reduceMotion]);

  return <span ref={ref}>{display.toLocaleString('en-IN')}</span>;
}

function SectionHeading({ id, eyebrow, title, subtitle, center = false }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.55, ease: EASE }}
      className={`mb-10 ${center ? 'mx-auto max-w-2xl text-center' : 'max-w-2xl'}`}
    >
      {eyebrow && (
        <p
          className={`mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-brand-600 ${
            center ? 'justify-center' : ''
          }`}
        >
          <Sparkles size={13} aria-hidden="true" /> {eyebrow}
        </p>
      )}
      <h2 id={id} className="font-display text-2xl font-bold tracking-tight text-ink-900 sm:text-4xl">
        {title}
      </h2>
      {subtitle && <p className="mt-3 text-sm leading-relaxed text-ink-500 sm:text-base">{subtitle}</p>}
    </motion.div>
  );
}

/* ---------- Page ---------- */

export default function HomeClient({ initialStats = null, initialCategoryNames = [] }) {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const reduceMotion = useReducedMotion();
  const [stats, setStats] = useState(initialStats);
  const [categoryNames, setCategoryNames] = useState(initialCategoryNames);
  const [composerOpen, setComposerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const loadStats = useCallback(() => {
    api
      .get('/stats')
      .then(({ data }) => {
        if (data?.stats) setStats(data.stats);
        if (Array.isArray(data?.categoryNames)) setCategoryNames(data.categoryNames);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  // Keeps the live numbers fresh while the page stays open.
  useRefetchOnFocus(loadStats, { pollMs: 60000 });

  // "Post a Requirement" links from other pages land here with ?postRequirement=1.
  useEffect(() => {
    if (searchParams.get('postRequirement') !== '1') return;
    if (user?.role === 'customer') {
      setComposerOpen(true);
    }
    router.replace('/', { scroll: false });
  }, [searchParams, user?.role]);

  const handleSearch = (e) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (q) router.push(`/providers?search=${encodeURIComponent(q)}`);
  };

  const chips = categoryNames.length ? categoryNames : FALLBACK_CATEGORY_NAMES;

  const STAT_CARDS = [
    { icon: LayoutGrid, label: 'Service categories', value: stats?.categories, tone: 'from-brand-500 to-brand-700' },
    { icon: BadgeCheck, label: 'Services you can hire', value: stats?.services, tone: 'from-accent-400 to-accent-600' },
    { icon: Users, label: 'Happy customers joined', value: stats?.customers, tone: 'from-trust-500 to-trust-700' },
    { icon: UserCheck, label: 'Verified providers joined', value: stats?.providers, tone: 'from-brand-600 to-accent-500' },
  ];

  const floatTransition = (duration, delay = 0) =>
    reduceMotion ? undefined : { duration, delay, repeat: Infinity, ease: 'easeInOut' };

  return (
    <div className="space-y-20 sm:space-y-28">
      {/* ------------------------------ HERO ------------------------------ */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-950 via-[#2F2677] to-brand-950 px-6 py-16 text-white shadow-modal sm:px-12 sm:py-10 lg:py-10">
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
          className="pointer-events-none absolute -left-20 top-10 h-72 w-72 rounded-full bg-brand-500/20 blur-3xl"
          animate={reduceMotion ? undefined : { y: [0, -24, 0], x: [0, 12, 0] }}
          transition={floatTransition(8)}
          aria-hidden="true"
        />
        <motion.div
          className="pointer-events-none absolute -right-16 bottom-5 h-80 w-80 rounded-full bg-accent-500/20 blur-3xl"
          animate={reduceMotion ? undefined : { y: [0, 24, 0], x: [0, -12, 0] }}
          transition={floatTransition(9)}
          aria-hidden="true"
        />

        <div className="relative grid gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: EASE }}
              className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3.5 py-1.5 text-xs font-semibold text-white/90 shadow-xs backdrop-blur-md"
            >
              <ShieldCheck size={14} className="text-trust-400" aria-hidden="true" />
              <span>India&apos;s Trusted Service Marketplace</span>
            </motion.div>

            <h1 className="mt-6 font-display text-4xl font-extrabold leading-[1.1] tracking-tight sm:text-5xl lg:text-[3.5rem]">
              <span className="block">
                {HERO_WORDS_TOP.map((word, i) => (
                  <motion.span
                    key={word}
                    className="mr-3 inline-block"
                    initial={{ opacity: 0, y: 28, filter: 'blur(6px)' }}
                    animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                    transition={{ duration: 0.7, delay: 0.15 + i * 0.12, ease: EASE }}
                  >
                    {word}
                  </motion.span>
                ))}
              </span>
              <span className="block">
                {HERO_WORDS_BOTTOM.map((word, i) => (
                  <motion.span
                    key={word}
                    className="gradient-text-on-dark mr-3 inline-block"
                    initial={{ opacity: 0, y: 28, filter: 'blur(6px)' }}
                    animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                    transition={{ duration: 0.7, delay: 0.4 + i * 0.12, ease: EASE }}
                  >
                    {word}
                  </motion.span>
                ))}
              </span>
            </h1>

            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.65, ease: EASE }}
              className="mt-6 max-w-xl text-base leading-relaxed text-ink-200 sm:text-lg"
            >
              Karyantrix connects you with verified local professionals for home repairs, tutoring, wellness, events and
              everyday tasks, with transparent bids and secure escrow payments.
            </motion.p>

            <motion.form
              onSubmit={handleSearch}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.8, ease: EASE }}
              className="mt-8 flex max-w-lg items-center rounded-2xl border border-white/20 bg-white/10 p-1.5 shadow-2xl backdrop-blur-md transition-all focus-within:border-brand-400 focus-within:bg-white/15"
            >
              <div className="flex flex-1 items-center gap-3 px-3">
                <Search size={18} className="shrink-0 text-ink-300" aria-hidden="true" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="What service do you need? (e.g. Electrician, Tutor)"
                  className="w-full bg-transparent text-sm text-white placeholder:text-ink-300 focus:outline-none"
                />
              </div>
              <Button type="submit" variant="accent" size="md">
                Search
              </Button>
            </motion.form>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.95, ease: EASE }}
              className="mt-6 flex flex-wrap items-center gap-3"
            >
              <Link
                href="/categories"
                className="group inline-flex items-center gap-1.5 text-sm font-bold text-white/90 transition-colors hover:text-white"
              >
                Browse all services
                <ArrowRight size={15} className="transition-transform group-hover:translate-x-1" aria-hidden="true" />
              </Link>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 1.1 }}
              className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2.5 border-t border-white/10 pt-6 text-xs text-white/80"
            >
              {['Free requirement posting', 'Verified professionals', 'Escrow protected payments'].map((t) => (
                <span key={t} className="flex items-center gap-2 font-medium">
                  <CheckCircle2 size={15} className="text-trust-400" aria-hidden="true" /> {t}
                </span>
              ))}
            </motion.div>
          </div>

          {/* Floating flow cards */}
          <div className="relative hidden h-[26rem] lg:block" aria-hidden="true">
            <motion.div
              className="absolute left-2 top-2 w-72 rounded-2xl border border-white/15 bg-white/[0.08] p-4 shadow-2xl backdrop-blur-xl"
              initial={{ opacity: 0, x: 40 }}
              animate={reduceMotion ? { opacity: 1, x: 0 } : { opacity: 1, x: 0, y: [0, -10, 0] }}
              transition={{
                opacity: { duration: 0.6, delay: 0.3 },
                x: { duration: 0.6, delay: 0.3, ease: EASE },
                y: floatTransition(6),
              }}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-brand-600 to-accent-500">
                  <PenSquare size={18} />
                </div>
                <div>
                  <p className="text-xs font-bold text-white">You post a requirement</p>
                  <p className="text-[11px] text-white/60">Free, and it takes seconds</p>
                </div>
              </div>
            </motion.div>

            <motion.div
              className="absolute right-0 top-32 w-72 rounded-2xl border border-white/15 bg-white/[0.08] p-4 shadow-2xl backdrop-blur-xl"
              initial={{ opacity: 0, x: -40 }}
              animate={reduceMotion ? { opacity: 1, x: 0 } : { opacity: 1, x: 0, y: [0, 12, 0] }}
              transition={{
                opacity: { duration: 0.6, delay: 0.5 },
                x: { duration: 0.6, delay: 0.5, ease: EASE },
                y: floatTransition(7, 0.4),
              }}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-accent-500 to-accent-600">
                  <Gavel size={18} />
                </div>
                <div>
                  <p className="text-xs font-bold text-white">Verified providers bid</p>
                  <p className="text-[11px] text-white/60">Compare price, ratings and profile</p>
                </div>
              </div>
            </motion.div>

            <motion.div
              className="absolute bottom-2 left-6 w-72 rounded-2xl border border-white/15 bg-white/[0.08] p-4 shadow-2xl backdrop-blur-xl"
              initial={{ opacity: 0, x: 40 }}
              animate={reduceMotion ? { opacity: 1, x: 0 } : { opacity: 1, x: 0, y: [0, -8, 0] }}
              transition={{
                opacity: { duration: 0.6, delay: 0.7 },
                x: { duration: 0.6, delay: 0.7, ease: EASE },
                y: floatTransition(8, 0.8),
              }}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-trust-500 to-trust-700">
                  <Lock size={18} />
                </div>
                <div>
                  <p className="text-xs font-bold text-white">You hire and pay safely</p>
                  <p className="text-[11px] text-white/60">Escrow releases when you are happy</p>
                </div>
              </div>
            </motion.div>

            <svg className="absolute inset-0 h-full w-full" viewBox="0 0 400 420" fill="none">
              <motion.path
                d="M110 70 C 200 90, 240 100, 300 150 C 340 185, 250 230, 180 300 C 150 330, 140 350, 140 360"
                stroke="rgba(255,255,255,0.22)"
                strokeWidth="1.5"
                strokeDasharray="5 7"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 2, delay: 1, ease: 'easeInOut' }}
              />
            </svg>
          </div>
        </div>
      </section>

      {/* --------------------------- LIVE STATS --------------------------- */}
      <section aria-labelledby="live-numbers" className="relative">
        <SectionHeading
          center
          eyebrow="Karyantrix in numbers"
          id="live-numbers"
          title="A marketplace that keeps growing"
          subtitle="These numbers are live. They update on their own as new categories, services, customers and providers join Karyantrix."
        />

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {STAT_CARDS.map((s, i) => {
            const Icon = s.icon;
            return (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 28, scale: 0.96 }}
                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.55, delay: i * 0.09, ease: EASE }}
                whileHover={{ y: -6 }}
                className="group relative overflow-hidden rounded-3xl border border-ink-100 bg-white p-5 shadow-card transition-shadow duration-300 hover:shadow-card-hover sm:p-7"
              >
                <div
                  className={`absolute -right-8 -top-8 h-28 w-28 rounded-full bg-gradient-to-br ${s.tone} opacity-10 transition-all duration-500 group-hover:scale-150 group-hover:opacity-20`}
                  aria-hidden="true"
                />
                <div
                  className={`relative flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${s.tone} text-white shadow-glow-brand`}
                >
                  <Icon size={22} aria-hidden="true" />
                </div>
                <div className="relative mt-5 font-display text-3xl font-extrabold tracking-tight text-ink-900 sm:text-5xl">
                  {s.value == null ? <Skeleton className="h-10 w-24" /> : <AnimatedNumber value={s.value} />}
                </div>
                <p className="relative mt-1.5 text-xs font-bold text-ink-500 sm:text-sm">{s.label}</p>
              </motion.div>
            );
          })}
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="mt-5 flex items-center justify-center gap-2 text-xs font-bold text-ink-400"
        >
          <span className="relative flex h-2.5 w-2.5" aria-hidden="true">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-trust-400 opacity-70" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-trust-500" />
          </span>
          Live from the Karyantrix community
        </motion.p>
      </section>

      {/* ----------------------------- ABOUT ------------------------------ */}
      <section aria-labelledby="about-karyantrix" className="grid gap-10 lg:grid-cols-[1fr_1fr] lg:items-center">
        <motion.div
          initial={{ opacity: 0, x: -32 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.65, ease: EASE }}
        >
          <p className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-brand-600">
            <Sparkles size={13} aria-hidden="true" /> About Karyantrix
          </p>
          <h2
            id="about-karyantrix"
            className="font-display text-2xl font-bold tracking-tight text-ink-900 sm:text-4xl"
          >
            Local help you can trust, without the chasing
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-ink-600 sm:text-base">
            Karyantrix is a service marketplace that connects people who need work done with skilled professionals
            nearby. Instead of calling around for quotes, you post what you need once, verified providers bid for it,
            and you choose on price, ratings and profile.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-ink-600 sm:text-base">
            Our promise is our tagline,{' '}
            <span className="font-semibold text-ink-900">Kaam Aapka, Zimmedari Hamari</span>: your work, our
            responsibility. Every provider is verified before they can bid, and every payment is protected until the
            job is done.
          </p>

          <p className="mt-7 text-xs font-bold uppercase tracking-wider text-ink-400">What you can hire for</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {chips.map((c, i) => (
              <motion.span
                key={c}
                initial={{ opacity: 0, scale: 0.85 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.35, delay: i * 0.05, ease: EASE }}
                whileHover={{ y: -2 }}
                className="rounded-full border border-brand-200/70 bg-brand-50 px-3.5 py-1.5 text-xs font-semibold text-brand-700"
              >
                {c}
              </motion.span>
            ))}
            <Link
              href="/categories"
              className="inline-flex items-center gap-1 rounded-full bg-brand-600 px-3.5 py-1.5 text-xs font-bold text-white transition-colors hover:bg-brand-700"
            >
              See all <ChevronRight size={13} aria-hidden="true" />
            </Link>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 32 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.65, ease: EASE }}
          className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-950 via-[#2F2677] to-brand-950 p-8 text-white shadow-modal sm:p-10"
        >
          <motion.div
            className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-accent-500/25 blur-3xl"
            animate={reduceMotion ? undefined : { scale: [1, 1.25, 1] }}
            transition={floatTransition(6)}
            aria-hidden="true"
          />
          <p className="text-xs font-bold uppercase tracking-wider text-white/60">Our promise</p>
          <p className="mt-3 font-display text-3xl font-extrabold leading-tight sm:text-4xl">
            Your work,
            <br />
            <span className="gradient-text-on-dark">our responsibility.</span>
          </p>
          <ul className="mt-7 space-y-3.5">
            {[
              'Every provider is verified before they can bid',
              'Every payment is protected until the job is done',
              'Every review comes from a genuine booking',
            ].map((line, i) => (
              <motion.li
                key={line}
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.45, delay: 0.25 + i * 0.12, ease: EASE }}
                className="flex items-start gap-3 text-sm text-white/85"
              >
                <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-trust-400" aria-hidden="true" />
                {line}
              </motion.li>
            ))}
          </ul>
        </motion.div>
      </section>

      {/* ---------------------------- FEATURES ---------------------------- */}
      <section aria-labelledby="features">
        <SectionHeading
          center
          eyebrow="Our features"
          id="features"
          title="Everything you need to get work done safely"
          subtitle="From the first post to the final payment, Karyantrix is built to keep you in control."
        />
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => {
            const Icon = f.icon;
            return (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.55, delay: (i % 3) * 0.1, ease: EASE }}
                whileHover={{ y: -6 }}
                className="group relative overflow-hidden rounded-3xl border border-ink-100 bg-white p-6 shadow-card transition-all duration-300 hover:border-brand-200 hover:shadow-card-hover"
              >
                <div
                  className="absolute inset-x-0 top-0 h-1 origin-left scale-x-0 bg-gradient-to-r from-brand-500 to-accent-500 transition-transform duration-500 group-hover:scale-x-100"
                  aria-hidden="true"
                />
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-50 to-brand-100/80 text-brand-600 ring-1 ring-inset ring-brand-200/50 transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-110">
                  <Icon size={22} aria-hidden="true" />
                </div>
                <h3 className="mt-5 font-display text-base font-bold text-ink-900">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-500">{f.desc}</p>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* ------------------------- HOW IT DIFFERS ------------------------- */}
      <section aria-labelledby="how-different">
        <SectionHeading
          center
          eyebrow="Why Karyantrix"
          id="how-different"
          title="How Karyantrix is different"
          subtitle="Hiring help has always meant chasing people and hoping for the best. We changed that."
        />

        <div className="overflow-hidden rounded-3xl border border-ink-100 bg-white shadow-card">
          <div className="hidden grid-cols-[0.8fr_1fr_1fr] border-b border-ink-100 bg-ink-50/70 px-6 py-4 text-xs font-bold uppercase tracking-wider text-ink-400 md:grid">
            <span />
            <span>The usual way</span>
            <span className="text-brand-600">With Karyantrix</span>
          </div>

          {COMPARISON.map((row, i) => (
            <motion.div
              key={row.topic}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-30px' }}
              transition={{ duration: 0.5, delay: i * 0.05, ease: EASE }}
              className="grid gap-3 border-b border-ink-100 px-6 py-5 transition-colors last:border-b-0 hover:bg-brand-50/40 md:grid-cols-[0.8fr_1fr_1fr] md:items-center md:gap-6"
            >
              <p className="font-display text-sm font-bold text-ink-900">{row.topic}</p>
              <p className="flex items-start gap-2.5 text-sm text-ink-500">
                <XCircle size={17} className="mt-0.5 shrink-0 text-red-400" aria-hidden="true" />
                <span>{row.old}</span>
              </p>
              <p className="flex items-start gap-2.5 text-sm text-ink-800">
                <CheckCircle2 size={17} className="mt-0.5 shrink-0 text-trust-500" aria-hidden="true" />
                <span>{row.now}</span>
              </p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* -------------------------- HOW IT WORKS -------------------------- */}
      <section aria-labelledby="how-it-works">
        <SectionHeading
          center
          eyebrow="How it works"
          id="how-it-works"
          title="Three simple steps to a job done"
          subtitle="No chasing, no guesswork. Just post, compare and hire."
        />

        <div className="relative grid gap-6 md:grid-cols-3">
          <motion.div
            className="absolute left-[16%] right-[16%] top-11 hidden h-0.5 origin-left bg-gradient-to-r from-brand-300 via-brand-500 to-accent-400 md:block"
            initial={{ scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 1.2, delay: 0.2, ease: 'easeInOut' }}
            aria-hidden="true"
          />
          {HOW_IT_WORKS.map((s, i) => {
            const Icon = s.icon;
            return (
              <motion.div
                key={s.title}
                initial={{ opacity: 0, y: 32 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.6, delay: i * 0.15, ease: EASE }}
                whileHover={{ y: -6 }}
                className="relative rounded-3xl border border-ink-100 bg-white p-7 text-center shadow-card transition-shadow duration-300 hover:shadow-card-hover"
              >
                <div className="relative mx-auto flex h-[3.75rem] w-[3.75rem] items-center justify-center rounded-2xl bg-gradient-to-tr from-brand-600 to-accent-500 text-white shadow-glow-brand">
                  <Icon size={26} aria-hidden="true" />
                  <span className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-white text-[10px] font-extrabold text-brand-700 shadow-card">
                    {s.step}
                  </span>
                </div>
                <h3 className="mt-5 font-display text-base font-bold text-ink-900">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-500">{s.desc}</p>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* --------------------------- AUDIENCES ---------------------------- */}
      <section aria-labelledby="who-its-for">
        <SectionHeading
          center
          eyebrow="Built for both sides"
          id="who-its-for"
          title="Made for customers and providers"
          subtitle="Whether you need work done or want to grow your business, Karyantrix works for you."
        />
        <div className="grid gap-5 md:grid-cols-2">
          {AUDIENCES.map((a, idx) => {
            const Icon = a.icon;
            return (
              <motion.div
                key={a.title}
                initial={{ opacity: 0, x: idx === 0 ? -32 : 32 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.65, ease: EASE }}
                className="rounded-3xl border border-ink-100 bg-white p-7 shadow-card sm:p-8"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-50 to-brand-100/80 text-brand-600 ring-1 ring-inset ring-brand-200/50">
                    <Icon size={20} aria-hidden="true" />
                  </div>
                  <h3 className="font-display text-lg font-bold text-ink-900">{a.title}</h3>
                </div>
                <ul className="mt-5 space-y-3.5">
                  {a.points.map((p, i) => (
                    <motion.li
                      key={p}
                      initial={{ opacity: 0, x: -12 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.4, delay: 0.15 + i * 0.07, ease: EASE }}
                      className="flex items-start gap-2.5 text-sm leading-relaxed text-ink-600"
                    >
                      <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-trust-500" aria-hidden="true" />
                      <span>{p}</span>
                    </motion.li>
                  ))}
                </ul>
              </motion.div>
            );
          })}
        </div>
      </section>
    </div>
  );
}