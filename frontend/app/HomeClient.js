'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  Briefcase,
  CheckCircle2,
  ChevronRight,
  Gavel,
  Handshake,
  Headset,
  LayoutGrid,
  MapPinned,
  PenSquare,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  Users,
} from 'lucide-react';
import CategoryCard from '../components/CategoryCard';
import ProviderCard from '../components/ProviderCard';
import RequirementCard from '../components/RequirementCard';
import dynamic from 'next/dynamic';
const RequirementComposerModal = dynamic(() => import('../components/RequirementComposerModal'));
import Button from '../components/ui/Button';
import { ProviderCardSkeleton, Skeleton } from '../components/ui/Skeleton';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';
import { getSocket } from '../lib/socket';
import useGeolocation from '../lib/useGeolocation';

const TRUST_POINTS = [
  {
    icon: ShieldCheck,
    label: 'Verified Professionals',
    desc: 'Identity & background checked before activation',
  },
  {
    icon: Star,
    label: 'Authentic Reviews',
    desc: 'Unfiltered ratings from genuine completed bookings',
  },
  {
    icon: Gavel,
    label: 'Competitive Bids',
    desc: 'Compare quotes from local pros and choose your price',
  },
  {
    icon: Headset,
    label: 'Escrow Protection',
    desc: 'Payment released only upon work satisfaction',
  },
];

const HOW_IT_WORKS = [
  {
    icon: PenSquare,
    step: '01',
    title: 'Post your requirement',
    desc: 'Tell us what you need in seconds — budget, timing, and address.',
  },
  {
    icon: Gavel,
    step: '02',
    title: 'Receive & compare bids',
    desc: 'Verified providers send customized quotes. Review ratings & profiles.',
  },
  {
    icon: Handshake,
    step: '03',
    title: 'Hire & relax',
    desc: 'Chat, track progress in real-time, and pay safely upon completion.',
  },
];

const ABOUT_CATEGORIES = ['Home repairs', 'Tutoring', 'Wellness', 'Events', 'Everyday tasks'];

const ABOUT_AUDIENCES = [
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

const fadeUp = {
  initial: { opacity: 0, y: 16 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-60px' },
  transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] },
};

function SectionHeading({ eyebrow, title, action, subtitle }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        {eyebrow && (
          <p className="mb-1.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-brand-600">
            <Sparkles size={13} aria-hidden="true" /> {eyebrow}
          </p>
        )}
        <h2 className="font-display text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl">
          {title}
        </h2>
        {subtitle && <p className="mt-1 text-xs text-ink-500 sm:text-sm">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export default function HomeClient({ initialCategories = [], initialProviders = [] }) {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [categories, setCategories] = useState(initialCategories);
  const [loadingCategories, setLoadingCategories] = useState(initialCategories.length === 0);
  const [providers, setProviders] = useState(initialProviders);
  const [loadingProviders, setLoadingProviders] = useState(initialProviders.length === 0);
  const [requirements, setRequirements] = useState([]);
  const [loadingRequirements, setLoadingRequirements] = useState(true);
  const [composerOpen, setComposerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { coords, status: geoStatus } = useGeolocation();

  useEffect(() => {
    if (user?.role === 'provider') {
      setLoadingCategories(false);
      return;
    }

    api
      .get('/categories')
      .then(({ data }) => setCategories(data.categories || []))
      .catch(() => setCategories((prev) => (prev.length ? prev : [])))
      .finally(() => setLoadingCategories(false));
  }, [user?.role]);

  // Top Providers should only surface providers within the customer's
  // location radius, so wait for geolocation to resolve before fetching.
  useEffect(() => {
    if (user?.role === 'provider') {
      setLoadingProviders(false);
      return;
    }
    if (geoStatus === 'idle' || geoStatus === 'locating') return;

    setLoadingProviders(true);
    const params = { sort: 'rating', limit: 3 };
    if (coords) {
      params.lat = coords.lat;
      params.lng = coords.lng;
      if (user?.requirement_radius_km) params.radius = user.requirement_radius_km;
    }
    api
      .get('/providers', { params })
      .then(({ data }) => setProviders(data.providers || []))
      .catch(() => setProviders((prev) => (prev.length ? prev : [])))
      .finally(() => setLoadingProviders(false));
  }, [user?.role, user?.requirement_radius_km, geoStatus, coords]);

  const reloadRequirements = () => {
    setLoadingRequirements(true);
    const params = { limit: 9 };

    if (coords) {
      params.lat = coords.lat;
      params.lng = coords.lng;
    }
    api
      .get('/requirements', { params })
      .then(({ data }) => setRequirements(data.requirements || []))
      .catch(() => setRequirements([]))
      .finally(() => setLoadingRequirements(false));
  };

  useEffect(() => {
    // Providers are matched against their registered service location by the
    // backend, so their requirement feed should not wait for browser GPS.
    // Customers/guests use the current browser location when available.
    if (user?.role !== 'provider' && (geoStatus === 'idle' || geoStatus === 'locating')) {
      return;
    }

    reloadRequirements();
  }, [geoStatus, coords, user?.role]);

  useEffect(() => {
    if (searchParams.get('postRequirement') !== '1') return;
    if (user?.role === 'customer') {
      setComposerOpen(true);
    }
    router.replace('/', { scroll: false });
  }, [searchParams, user?.role]);

  const handleRequirementCreated = (requirement) =>
    setRequirements((prev) => [requirement, ...prev]);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('karyantrix_token') : null;
    if (!token) return undefined;
    const socket = getSocket(token);

    const onClosed = ({ requirement_id }) => {
      setRequirements((prev) => prev.filter((r) => r.id !== requirement_id));
    };

    const onNewRequirement = (requirement) => {
      if (user?.role !== 'provider') return;
      setRequirements((prev) =>
        prev.some((r) => r.id === requirement.id) ? prev : [requirement, ...prev]
      );
    };

    // Catch up after a reconnect so requirements created while the socket
    // was temporarily disconnected are not missed.
    let hasConnectedBefore = socket.connected;
    const onConnect = () => {
      if (hasConnectedBefore) reloadRequirements();
      hasConnectedBefore = true;
    };

    socket.on('requirement_closed', onClosed);
    socket.on('requirement:new', onNewRequirement);
    socket.on('connect', onConnect);

    return () => {
      socket.off('requirement_closed', onClosed);
      socket.off('requirement:new', onNewRequirement);
      socket.off('connect', onConnect);
    };
  }, [user?.role]);

  return (
    <div className="space-y-16 sm:space-y-20">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-950 via-[#2F2677] to-brand-950 px-6 py-16 text-white shadow-modal sm:px-12 sm:py-20 lg:py-24">
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
          animate={{ y: [0, -20, 0] }}
          transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
          aria-hidden="true"
        />
        <motion.div
          className="pointer-events-none absolute -right-16 bottom-5 h-80 w-80 rounded-full bg-accent-500/20 blur-3xl"
          animate={{ y: [0, 20, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
          aria-hidden="true"
        />

        <div className="relative grid gap-12 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3.5 py-1.5 text-xs font-semibold text-white/90 backdrop-blur-md shadow-xs">
              <ShieldCheck size={14} className="text-trust-400" aria-hidden="true" />
              <span>India's Trusted Service Marketplace</span>
            </div>

            <h1 className="mt-6 font-display text-4xl font-extrabold leading-[1.1] tracking-tight sm:text-5xl lg:text-[3.5rem]">
              Kaam Aapka, <br />
              <span className="gradient-text-on-dark">Zimmedari Hamari</span>
            </h1>

            <p className="mt-6 max-w-xl text-base text-ink-200 sm:text-lg leading-relaxed">
              Find, book, and hire verified local professionals for home repairs, tutoring, wellness, events, and everyday tasks — with transparent rates and secure escrow payments.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (searchQuery.trim()) {
                  window.location.href = `/providers?search=${encodeURIComponent(searchQuery.trim())}`;
                }
              }}
              className="mt-8 flex max-w-lg items-center rounded-2xl border border-white/20 bg-white/10 p-1.5 shadow-2xl backdrop-blur-md focus-within:border-brand-400 focus-within:bg-white/15 transition-all"
            >
              <div className="flex flex-1 items-center gap-3 px-3">
                <Search size={18} className="text-ink-300 shrink-0" />
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
            </form>

            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2.5 border-t border-white/10 pt-6 text-xs text-white/80">
              <span className="flex items-center gap-2 font-medium">
                <CheckCircle2 size={15} className="text-trust-400" /> Free Requirement Posting
              </span>
              <span className="flex items-center gap-2 font-medium">
                <CheckCircle2 size={15} className="text-trust-400" /> Background Verified Pros
              </span>
              <span className="flex items-center gap-2 font-medium">
                <CheckCircle2 size={15} className="text-trust-400" /> 100% Satisfaction Guarantee
              </span>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.55, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="relative hidden lg:block"
          >
            <div className="relative rounded-3xl border border-white/15 bg-white/[0.07] p-6 shadow-2xl backdrop-blur-xl">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-500/20 text-brand-300">
                    <Sparkles size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">How Karyantrix Works</h3>
                    <p className="text-[11px] text-white/60">3 simple steps to job done</p>
                  </div>
                </div>
                <span className="rounded-full bg-trust-500/20 px-2.5 py-0.5 text-[10px] font-bold text-trust-300">
                  Easy & Safe
                </span>
              </div>

              <div className="mt-5 space-y-4">
                {HOW_IT_WORKS.map((step) => {
                  const Icon = step.icon;
                  return (
                    <div
                      key={step.title}
                      className="group flex items-start gap-3.5 rounded-2xl border border-white/5 bg-white/[0.04] p-3.5 transition-colors hover:bg-white/[0.08]"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-brand-600 to-accent-500 text-white shadow-xs">
                        <Icon size={18} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-bold text-white">{step.title}</p>
                          <span className="text-[10px] font-bold text-white/40">{step.step}</span>
                        </div>
                        <p className="mt-0.5 text-[11px] leading-relaxed text-white/70">{step.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-5 rounded-2xl bg-gradient-to-r from-brand-600/30 to-accent-500/30 p-3.5 border border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users size={16} className="text-accent-400" />
                  <span className="text-xs font-medium text-white">Ready to find a match?</span>
                </div>
                <Link href="/providers">
                  <span className="text-xs font-bold text-accent-300 hover:text-white transition-colors flex items-center gap-1">
                    Explore <ChevronRight size={14} />
                  </span>
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {TRUST_POINTS.map((t, i) => {
          const Icon = t.icon;
          return (
            <motion.div
              key={t.label}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.3, delay: i * 0.05, ease: [0.16, 1, 0.3, 1] }}
              whileHover={{ y: -3 }}
              className="flex items-start gap-4 rounded-2xl border border-ink-100 bg-white p-5 shadow-card transition-all duration-200 hover:border-brand-200 hover:shadow-card-hover"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-50 to-brand-100/80 text-brand-600 ring-1 ring-inset ring-brand-200/50">
                <Icon size={20} />
              </div>
              <div>
                <h3 className="font-display text-sm font-bold text-ink-900">{t.label}</h3>
                <p className="mt-1 text-xs leading-relaxed text-ink-500">{t.desc}</p>
              </div>
            </motion.div>
          );
        })}
      </section>

      <motion.section
        {...fadeUp}
        aria-labelledby="about-karyantrix"
        className="rounded-3xl border border-ink-100 bg-white p-8 shadow-card sm:p-12"
      >
        <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
          <div>
            <p className="mb-1.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-brand-600">
              <Sparkles size={13} aria-hidden="true" /> About Karyantrix
            </p>
            <h2
              id="about-karyantrix"
              className="font-display text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl"
            >
              Local help you can trust, without the chasing
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-ink-600">
              Karyantrix is a service marketplace that connects people who need work done with skilled professionals
              nearby. Instead of calling around for quotes, you post what you need once, verified providers bid for
              it, and you choose on price, ratings and profile.
            </p>
            <p className="mt-3 text-sm leading-relaxed text-ink-600">
              Our promise is our tagline,{' '}
              <span className="font-semibold text-ink-900">Kaam Aapka, Zimmedari Hamari</span>: your work, our
              responsibility. Every provider is verified before they can bid, and every payment is protected until
              the job is done.
            </p>

            <p className="mt-6 text-xs font-bold uppercase tracking-wider text-ink-400">What you can hire for</p>
            <div className="mt-2.5 flex flex-wrap gap-2">
              {ABOUT_CATEGORIES.map((c) => (
                <span
                  key={c}
                  className="rounded-full border border-brand-200/70 bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700"
                >
                  {c}
                </span>
              ))}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {ABOUT_AUDIENCES.map((a) => {
              const Icon = a.icon;
              return (
                <div key={a.title} className="rounded-2xl border border-ink-100 bg-ink-50/60 p-5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-50 to-brand-100/80 text-brand-600 ring-1 ring-inset ring-brand-200/50">
                      <Icon size={18} aria-hidden="true" />
                    </div>
                    <h3 className="font-display text-sm font-bold text-ink-900">{a.title}</h3>
                  </div>
                  <ul className="mt-4 space-y-2.5">
                    {a.points.map((p) => (
                      <li key={p} className="flex items-start gap-2 text-xs leading-relaxed text-ink-600">
                        <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-trust-500" aria-hidden="true" />
                        <span>{p}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      </motion.section>

      <motion.section {...fadeUp} className="pt-2">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="mb-1.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-brand-600">
              <MapPinned size={14} aria-hidden="true" /> Live Local Demand
            </p>
            <h2 className="font-display text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl">
              Requirements Near You
            </h2>
            <p className="mt-1 text-xs text-ink-500">
              {geoStatus === 'ready' && coords
                ? user?.role === 'admin'
                  ? 'Showing all active requirements'
                  : user?.role === 'provider'
                    ? 'Showing jobs within your service radius of current location'
                    : user
                      ? `Showing requirements within your ${user.requirement_radius_km ?? 5} km radius`
                      : 'Showing requirements within 5 km of your location'
                : user?.role === 'admin'
                  ? 'Showing all active requirements'
                  : user?.role === 'provider'
                    ? 'Enable location to see jobs within your service radius'
                    : user
                      ? 'Enable location to see requirements within your radius'
                      : 'Enable location in browser to discover verified requirements nearest to you'}
            </p>
          </div>

          {user?.role === 'customer' && (
            <Button
              size="md"
              icon={<PenSquare size={16} aria-hidden="true" />}
              onClick={() => setComposerOpen(true)}
            >
              Post a Requirement
            </Button>
          )}
        </div>

        {!loadingRequirements && requirements.length === 0 && (
          <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-ink-200 bg-white p-12 text-center shadow-card">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
              <MapPinned size={26} aria-hidden="true" />
            </div>
            <h3 className="font-display text-base font-bold text-ink-800">No active requirements nearby yet</h3>
            <p className="max-w-md text-xs text-ink-500">
              Be the first to post what you need done. Local providers will be notified instantly to quote!
            </p>
            {user?.role === 'customer' && (
              <Button size="sm" onClick={() => setComposerOpen(true)}>
                Post First Requirement
              </Button>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {loadingRequirements &&
            Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-64 rounded-2xl" />
            ))}
          {!loadingRequirements &&
            requirements.map((r) => (
              <RequirementCard key={r.id} requirement={r} onUpdated={reloadRequirements} />
            ))}
        </div>
      </motion.section>

      <RequirementComposerModal
        open={composerOpen}
        onClose={() => setComposerOpen(false)}
        onCreated={handleRequirementCreated}
      />

      {user?.role !== 'provider' && (
        <>
          <motion.section {...fadeUp} className="pt-2">
            <SectionHeading
              eyebrow="Explore Services"
              title="Popular Categories"
              subtitle="Discover vetted specialists across all primary service verticals"
              action={
                <Link
                  href="/categories"
                  className="group flex items-center gap-1.5 text-xs font-bold text-brand-600 hover:text-brand-800 transition-colors"
                >
                  View all categories{' '}
                  <ArrowRight
                    size={14}
                    className="transition-transform group-hover:translate-x-1"
                    aria-hidden="true"
                  />
                </Link>
              }
            />

            {!loadingCategories && categories.length === 0 && (
              <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-ink-200 bg-white p-12 text-center">
                <LayoutGrid size={32} className="text-ink-300" aria-hidden="true" />
                <p className="text-sm text-ink-500">No categories found.</p>
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
              {loadingCategories &&
                Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton key={i} className="h-32 rounded-2xl" />
                ))}
              {!loadingCategories &&
                categories.slice(0, 8).map((cat) => <CategoryCard key={cat.id} category={cat} />)}
            </div>
          </motion.section>

          <motion.section {...fadeUp} className="pt-2">
            <SectionHeading
              eyebrow="Proven Excellence"
              title="Top-Rated Providers"
              subtitle={
                geoStatus === 'ready' && coords
                  ? `Highly recommended professionals within ${user?.requirement_radius_km ?? 5} km of your location`
                  : 'Enable location to see top-rated professionals near you'
              }
              action={
                <Link
                  href="/providers"
                  className="group flex items-center gap-1.5 text-xs font-bold text-brand-600 hover:text-brand-800 transition-colors"
                >
                  Browse all providers{' '}
                  <ArrowRight
                    size={14}
                    className="transition-transform group-hover:translate-x-1"
                    aria-hidden="true"
                  />
                </Link>
              }
            />

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {loadingProviders &&
                Array.from({ length: 3 }).map((_, i) => <ProviderCardSkeleton key={i} />)}
              {!loadingProviders &&
                providers.map((p) => <ProviderCard key={p.id} provider={p} />)}
            </div>

            {!loadingProviders && providers.length === 0 && (
              <p className="mt-4 text-sm text-ink-400">
                {geoStatus === 'ready' && coords
                  ? 'No providers found near your location yet.'
                  : 'No providers listed yet.'}
              </p>
            )}
          </motion.section>
        </>
      )}

      {(!user || (user.role === 'customer' && !user.can_switch_to_provider)) && (
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          className="relative overflow-hidden rounded-3xl border border-brand-200/80 bg-gradient-to-br from-brand-50 via-white to-accent-50/70 p-8 shadow-card sm:p-12"
        >
          <div className="relative grid gap-8 sm:grid-cols-[1fr_auto] sm:items-center">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-100/80 px-3 py-1 text-xs font-bold text-brand-700">
                <CheckCircle2 size={13} aria-hidden="true" /> Provider Network
              </span>
              <h2 className="mt-3 font-display text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl">
                Are you a skilled professional?
              </h2>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-ink-600">
                Join Karyantrix to connect directly with paying clients near you, bid on real requirements, build your online reputation with verified customer reviews, and grow your earnings.
              </p>
            </div>
            <Link href="/become-provider" className="shrink-0">
              <Button
                variant="accent"
                size="lg"
                icon={<ArrowRight size={18} aria-hidden="true" />}
              >
                Become a Provider
              </Button>
            </Link>
          </div>
        </motion.section>
      )}
    </div>
  );
}
