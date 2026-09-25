'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { LogOut, LifeBuoy, Menu, User, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import NotificationBell from './NotificationBell';
import ChatButton from './chat/ChatButton';
import LanguageSwitcher from './LanguageSwitcher';
import ThemeToggle from './ThemeToggle';
import Button from './ui/Button';
import useSwitchToProvider from '../lib/useSwitchToProvider';

export default function Navbar() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { switching, switchToProvider } = useSwitchToProvider();

  const handleSwitchToProvider = async () => {
    setMobileOpen(false);
    await switchToProvider();
  };

  const handleLogout = () => {
    logout();
    setMobileOpen(false);
    router.push('/login');
  };

  const navLinks = [
    { href: '/providers', label: 'Find Providers' },
    { href: '/categories', label: 'Browse Services' },
    { href: '/requirements', label: 'Requirements' },
    { href: '/blog', label: 'Blog' },
  ];

  const isLinkActive = (href) => {
    if (href === '/') return pathname === '/';
    return pathname?.startsWith(href);
  };

  return (
    <nav className="sticky top-0 z-40 w-full border-b border-ink-200/70 bg-white/85 backdrop-blur-md transition-shadow">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="group flex shrink-0 items-center gap-3"
          onClick={() => setMobileOpen(false)}
        >
          <motion.div
            whileHover={{ scale: 1.05, rotate: -3 }}
            whileTap={{ scale: 0.95 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-tr from-brand-600 via-brand-700 to-accent-500 shadow-glow-brand"
          >
            <Image
              src="/logo.png"
              alt="Karyantrix Logo"
              width={40}
              height={40}
              priority
              className="h-full w-full object-cover p-1"
            />
          </motion.div>
          <div className="flex flex-col">
            <span className="font-display text-lg font-bold tracking-tight text-ink-900 group-hover:text-brand-600 transition-colors">
              Karyantrix
            </span>
            <span className="hidden sm:block text-[10px] font-medium tracking-wide uppercase text-ink-500">
              Kaam Aapka, Zimmedari Hamari
            </span>
          </div>
        </Link>

        <div className="hidden items-center gap-1 md:flex">
          {navLinks.map((l) => {
            const active = isLinkActive(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`relative px-3.5 py-2 text-sm font-semibold rounded-lg transition-all duration-150 ${
                  active
                    ? 'text-brand-700 bg-brand-50/80 shadow-xs'
                    : 'text-ink-600 hover:text-ink-900 hover:bg-ink-100/60'
                }`}
              >
                {l.label}
              </Link>
            );
          })}
        </div>

        <div className="hidden items-center gap-3 md:flex">
          <LanguageSwitcher />
          <ThemeToggle />
          {!user ? (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className={`px-3.5 py-2 text-sm font-semibold rounded-lg transition-colors ${
                  pathname === '/login'
                    ? 'text-brand-600 bg-brand-50/70'
                    : 'text-ink-600 hover:text-ink-900 hover:bg-ink-100/60'
                }`}
              >
                Log in
              </Link>
              <Link href="/register">
                <Button size="md" variant="primary">
                  Sign up
                </Button>
              </Link>
            </div>
          ) : (
            <div className="flex items-center gap-2.5">
              {user.role === 'provider' && (
                <Link
                  href="/provider/dashboard"
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                    pathname?.startsWith('/provider/dashboard')
                      ? 'bg-brand-50 text-brand-700 font-bold'
                      : 'text-ink-700 hover:bg-ink-100/70'
                  }`}
                >
                  Dashboard
                </Link>
              )}

              {(user.role === 'admin' || user.role === 'staff') && (
                <Link
                  href="/admin"
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                    pathname?.startsWith('/admin')
                      ? 'bg-brand-50 text-brand-700 font-bold'
                      : 'text-ink-700 hover:bg-ink-100/70'
                  }`}
                >
                  Admin Panel
                </Link>
              )}

              {(user.role === 'customer' || user.role === 'provider') && (
                <Link
                  href="/bookings"
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                    pathname?.startsWith('/bookings')
                      ? 'bg-brand-50 text-brand-700 font-bold'
                      : 'text-ink-700 hover:bg-ink-100/70'
                  }`}
                >
                  Bookings
                </Link>
              )}

              {(user.role === 'customer' || user.role === 'provider') && (
                <Link
                  href="/support"
                  title="Help & Support"
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                    pathname?.startsWith('/support')
                      ? 'bg-brand-50 text-brand-700 font-bold'
                      : 'text-ink-700 hover:bg-ink-100/70'
                  }`}
                >
                  Help
                </Link>
              )}

              {user.role === 'customer' && !user.can_switch_to_provider && (
                <Link
                  href="/become-provider"
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                    pathname === '/become-provider'
                      ? 'bg-accent-50 text-accent-700 font-bold'
                      : 'text-accent-600 hover:bg-accent-50/60'
                  }`}
                >
                  Become Provider
                </Link>
              )}

              {user.role === 'customer' && user.can_switch_to_provider && (
                <button
                  type="button"
                  onClick={handleSwitchToProvider}
                  disabled={switching}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg text-accent-600 transition-colors hover:bg-accent-50/60 disabled:opacity-60"
                >
                  {switching ? 'Switching…' : 'Switch to Provider'}
                </button>
              )}

              <div className="h-5 w-px bg-ink-200" />

              {(user.role === 'customer' || user.role === 'provider') && <ChatButton />}
              <NotificationBell />

              <Link
                href="/profile"
                className="group flex items-center gap-2 rounded-xl border border-ink-200/80 bg-ink-50/60 py-1.5 pl-2 pr-3 transition-all duration-150 hover:border-brand-300 hover:bg-brand-50/60"
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-tr from-brand-600 to-accent-500 text-xs font-bold text-white shadow-xs">
                  {user.name ? user.name[0].toUpperCase() : 'U'}
                </div>
                <span className="text-xs font-semibold text-ink-800 group-hover:text-brand-700">
                  {user.name.split(' ')[0]}
                </span>
              </Link>

              <button
                onClick={handleLogout}
                aria-label="Log out"
                title="Log out"
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-ink-200/80 text-ink-500 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600"
              >
                <LogOut size={16} />
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 md:hidden">
          <LanguageSwitcher />
          <ThemeToggle />
          {user && (user.role === 'customer' || user.role === 'provider') && <ChatButton />}
          {user && <NotificationBell />}
          <button
            onClick={() => setMobileOpen((o) => !o)}
            aria-label="Toggle menu"
            aria-expanded={mobileOpen}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-ink-200/80 text-ink-700 transition-colors hover:bg-ink-100"
          >
            {mobileOpen ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden border-t border-ink-200/70 bg-white/95 backdrop-blur-lg md:hidden"
          >
            <div className="flex flex-col gap-1 px-4 py-4">
              {navLinks.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={() => setMobileOpen(false)}
                  className={`rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-colors ${
                    isLinkActive(l.href)
                      ? 'bg-brand-50 text-brand-700'
                      : 'text-ink-700 hover:bg-ink-50'
                  }`}
                >
                  {l.label}
                </Link>
              ))}

              {!user ? (
                <div className="mt-2 flex flex-col gap-2 pt-2 border-t border-ink-100">
                  <Link
                    href="/login"
                    onClick={() => setMobileOpen(false)}
                    className="rounded-xl border border-ink-200/80 px-3.5 py-2.5 text-center text-sm font-semibold text-ink-800 hover:bg-ink-50"
                  >
                    Log in
                  </Link>
                  <Link
                    href="/register"
                    onClick={() => setMobileOpen(false)}
                    className="rounded-xl bg-brand-gradient px-3.5 py-2.5 text-center text-sm font-bold text-white shadow-glow-brand"
                  >
                    Sign up
                  </Link>
                </div>
              ) : (
                <div className="mt-2 flex flex-col gap-1 pt-2 border-t border-ink-100">
                  {user.role === 'provider' && (
                    <Link
                      href="/provider/dashboard"
                      onClick={() => setMobileOpen(false)}
                      className="rounded-xl px-3.5 py-2.5 text-sm font-semibold text-ink-800 hover:bg-ink-50"
                    >
                      Dashboard
                    </Link>
                  )}
                  {(user.role === 'admin' || user.role === 'staff') && (
                    <Link
                      href="/admin"
                      onClick={() => setMobileOpen(false)}
                      className="rounded-xl px-3.5 py-2.5 text-sm font-semibold text-ink-800 hover:bg-ink-50"
                    >
                      Admin Panel
                    </Link>
                  )}
                  {(user.role === 'customer' || user.role === 'provider') && (
                    <Link
                      href="/bookings"
                      onClick={() => setMobileOpen(false)}
                      className="rounded-xl px-3.5 py-2.5 text-sm font-semibold text-ink-800 hover:bg-ink-50"
                    >
                      My Bookings
                    </Link>
                  )}
                  {(user.role === 'customer' || user.role === 'provider') && (
                    <Link
                      href="/support"
                      onClick={() => setMobileOpen(false)}
                      className="flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-ink-800 hover:bg-ink-50"
                    >
                      <LifeBuoy size={16} className="text-brand-600" />
                      Help &amp; Support
                    </Link>
                  )}
                  {user.role === 'customer' && !user.can_switch_to_provider && (
                    <Link
                      href="/become-provider"
                      onClick={() => setMobileOpen(false)}
                      className="rounded-xl bg-accent-50 px-3.5 py-2.5 text-sm font-semibold text-accent-700 hover:bg-accent-100/70"
                    >
                      Become a Provider
                    </Link>
                  )}
                  {user.role === 'customer' && user.can_switch_to_provider && (
                    <button
                      type="button"
                      onClick={handleSwitchToProvider}
                      disabled={switching}
                      className="rounded-xl bg-accent-50 px-3.5 py-2.5 text-left text-sm font-semibold text-accent-700 hover:bg-accent-100/70 disabled:opacity-60"
                    >
                      {switching ? 'Switching…' : 'Switch to Provider'}
                    </button>
                  )}
                  <Link
                    href="/profile"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-ink-800 hover:bg-ink-50"
                  >
                    <User size={16} className="text-brand-600" />
                    Profile &amp; Account ({user.name.split(' ')[0]})
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="mt-2 flex items-center justify-center gap-2 rounded-xl border border-red-200/80 bg-red-50/60 px-3.5 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-100/80 transition-colors"
                  >
                    <LogOut size={16} />
                    Log out
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}