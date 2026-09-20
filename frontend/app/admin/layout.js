'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BarChart3,
  Ban,
  Briefcase,
  ExternalLink,
  Flag,
  FolderOpen,
  Gavel,
  LayoutGrid,
  LifeBuoy,
  ShieldCheck,
  UsersRound,
  Wallet,
} from 'lucide-react';
import ProtectedRoute from '../../components/ProtectedRoute';

const ADMIN_NAV = [
  { href: '/admin', label: 'Overview', icon: LayoutGrid, exact: true },
  { href: '/admin/users', label: 'Users & Providers', icon: UsersRound },
  { href: '/admin/provider-applications', label: 'Provider Approvals', icon: ShieldCheck },
  { href: '/admin/provider-documents', label: 'Provider Documents', icon: FolderOpen },
  { href: '/admin/categories-services', label: 'Categories & Services', icon: Briefcase },
  { href: '/admin/requirements', label: 'Requirements', icon: Gavel },
  { href: '/admin/wallet', label: 'Wallet', icon: Wallet },
  { href: '/admin/cancellations', label: 'Cancellations', icon: Ban },
  { href: '/admin/reports', label: 'Reports', icon: Flag },
  { href: '/admin/support', label: 'Support', icon: LifeBuoy },
  { href: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
];

export default function AdminLayout({ children }) {
  const pathname = usePathname();

  const isNavActive = (item) => {
    if (item.exact) {
      return pathname === item.href;
    }
    return pathname.startsWith(item.href);
  };

  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <div className="min-h-screen pb-16">
        <div className="mb-8 rounded-2xl border border-ink-200/80 bg-gradient-to-r from-ink-900 via-slate-900 to-ink-950 p-6 text-white shadow-xl">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-tr from-brand-500 to-accent-500 shadow-md">
                <ShieldCheck size={26} className="text-white" aria-hidden="true" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="font-display text-xl font-bold tracking-tight text-white sm:text-2xl">
                    Admin Command Center
                  </h1>
                  <span className="inline-flex items-center rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-300 ring-1 ring-inset ring-emerald-500/30">
                    Live Operations
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-slate-400">
                  Platform oversight, user verification, dispute resolution & catalog management
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href="/"
                className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/10 px-3.5 py-2 text-xs font-semibold text-white backdrop-blur-sm transition-all hover:bg-white/20 active:scale-95"
              >
                <span>View Public Site</span>
                <ExternalLink size={14} aria-hidden="true" />
              </Link>
            </div>
          </div>

          <div className="mt-6 flex items-center gap-1 overflow-x-auto border-t border-white/10 pt-4 scrollbar-none">
            {ADMIN_NAV.map((item) => {
              const active = isNavActive(item);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`group flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all ${
                    active
                      ? 'bg-brand-500 text-white shadow-md shadow-brand-500/30'
                      : 'text-slate-300 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <Icon
                    size={15}
                    className={active ? 'text-white' : 'text-slate-400 group-hover:text-white'}
                    aria-hidden="true"
                  />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>

        <div className="transition-all">{children}</div>
      </div>
    </ProtectedRoute>
  );
}
