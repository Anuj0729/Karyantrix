'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { Award, CheckCircle2, HeartHandshake, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const COLUMNS = [
  {
    title: 'For customers',
    title: 'For Customers',
    links: [
      { href: '/providers', label: 'Find providers' },
      { href: '/categories', label: 'Browse categories' },
      { href: '/profile', label: 'My account' },
      { href: '/providers', label: 'Find Providers' },
      { href: '/categories', label: 'Browse Categories' },
      { href: '/profile', label: 'My Account' },
      { href: '/bookings', label: 'Track Bookings' },
    ],
  },
  {
    title: 'For providers',
    title: 'For Providers',
    links: [
      { href: '/become-provider', label: 'Become a provider' },
      { href: '/provider/dashboard', label: 'Provider dashboard' },
      { href: '/become-provider', label: 'Become a Provider' },
      { href: '/provider/dashboard', label: 'Provider Dashboard' },
      { href: '/profile', label: 'Business Profile' },
    ],
  },
  {
    title: 'Company',
    title: 'Platform & Trust',
    links: [
      { href: '/', label: 'About Karyantrix' },
      { href: '/categories', label: 'All services' },
      { href: '/', label: 'How It Works' },
      { href: '/categories', label: 'All Services' },
      { href: '/providers?verifiedOnly=true', label: 'Verified Experts' },
      { href: '/blog', label: 'Blog' },
    ],
  },
];

const HIGHLIGHTS = [
  { icon: ShieldCheck, title: 'Verified Professionals', desc: 'Background & skill checked' },
  { icon: HeartHandshake, title: 'Satisfaction Assured', desc: 'Escrow payment protection' },
  { icon: Award, title: 'Transparent Pricing', desc: 'Upfront rates & zero hidden fees' },
];

export default function Footer() {

  const pathname = usePathname();
  const { user } = useAuth();
  if (pathname?.startsWith('/messages')) return null;

  // A customer who already has an approved provider account switches back instead of applying again.
  const columns = user?.can_switch_to_provider
    ? COLUMNS.map((col) => ({ ...col, links: col.links.filter((l) => l.href !== '/become-provider') }))
    : COLUMNS;

  return (
    <footer className="mt-20 border-t border-ink-800 bg-ink-950 text-ink-300">
      <div className="border-b border-ink-900 bg-ink-900/60">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            {HIGHLIGHTS.map((item, idx) => {
              const Icon = item.icon;
              return (
                <div key={idx} className="flex items-center gap-3.5">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-500/10 text-brand-400 border border-brand-500/20">
                    <Icon size={22} />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-white">{item.title}</h4>
                    <p className="text-xs text-ink-400">{item.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-10 px-4 py-14 sm:grid-cols-5 sm:px-6 lg:px-8">
        <div className="col-span-2 space-y-4">
          <Link href="/" className="group inline-flex items-center gap-3">
            <motion.div
              whileHover={{ rotate: -4, scale: 1.05 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-tr from-brand-600 via-brand-700 to-accent-500 shadow-glow-brand"
            >
              <Image
                src="/logo.png"
                alt="Karyantrix"
                width={40}
                height={40}
                className="h-full w-full object-cover p-1"
              />
            </motion.div>
            <span className="font-display text-xl font-bold tracking-tight text-white group-hover:text-brand-300 transition-colors">
              Karyantrix
            </span>
          </Link>
          <p className="max-w-sm text-xs leading-relaxed text-ink-400">
            India's modern on-demand service marketplace. Connecting customers with trusted, background-verified professionals for home repairs, tutoring, wellness, events, and everyday tasks.
          </p>
          <div className="flex items-center gap-2 pt-2 text-xs font-semibold text-brand-400">
            <CheckCircle2 size={16} />
            <span>Kaam Aapka, Zimmedari Hamari</span>
          </div>
        </div>

        {columns.map((col) => (
          <div key={col.title} className="space-y-3">
            <p className="text-xs font-bold uppercase tracking-wider text-white">{col.title}</p>
            <ul className="space-y-2.5">
              {col.links.map((l) => (
                <li key={l.href + l.label}>
                  <Link
                    href={l.href}
                    className="text-xs font-medium text-ink-400 transition-colors hover:text-white"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="border-t border-ink-900 px-4 py-6 text-center text-xs text-ink-500 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 sm:flex-row">
          <p>&copy; {new Date().getFullYear()} Karyantrix Inc. All rights reserved.</p>
          <div className="flex items-center gap-6 text-xs text-ink-400">
            <span>Built with Trust &amp; Precision</span>
            <span className="inline-block h-1 w-1 rounded-full bg-ink-700" />
            <span>Safe &amp; Encrypted Transactions</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
