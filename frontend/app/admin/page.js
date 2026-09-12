'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  AlertCircle,
  ArrowUpRight,
  Ban,
  BarChart3,
  Briefcase,
  Check,
  ChevronRight,
  Flag,
  Gavel,
  LayoutGrid,
  RefreshCw,
  ShieldCheck,
  Users,
  UsersRound,
} from 'lucide-react';
import api from '../../lib/api';
import Card from '../../components/ui/Card';
import { Skeleton } from '../../components/ui/Skeleton';
import useRefetchOnFocus from '../../lib/useRefetchOnFocus';

function AdminDashboardContent() {
  const [stats, setStats] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setIsRefreshing(true);
      const dashRes = await api.get('/admin/dashboard').catch(() => ({ data: { stats: null } }));

      if (dashRes?.data?.stats) {
        setStats(dashRes.data.stats);
      }
    } catch {
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useRefetchOnFocus(fetchData);

  const cards = [
    {
      label: 'Customers',
      value: stats?.totalCustomers,
      icon: Users,
      color: 'text-brand-600',
      bg: 'bg-brand-50',
      border: 'hover:border-brand-200',
      subtext: 'Registered clients',
      href: '/admin/users',
    },
    {
      label: 'Providers',
      value: stats?.totalProviders,
      icon: Briefcase,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
      border: 'hover:border-emerald-200',
      subtext: 'Verified specialists',
      href: '/admin/users',
    },
    {
      label: 'Total Requirements',
      value: stats?.totalRequirements,
      icon: Gavel,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
      border: 'hover:border-purple-200',
      subtext: 'Work requests posted',
      href: '/admin/requirements',
    },
    {
      label: 'Closed (Hired)',
      value: stats?.closedRequirements,
      icon: Check,
      color: 'text-teal-600',
      bg: 'bg-teal-50',
      border: 'hover:border-teal-200',
      subtext: stats?.totalRequirements
        ? `${Math.round(((stats.closedRequirements || 0) / stats.totalRequirements) * 100)}% completion`
        : 'Fulfilled contracts',
      href: '/admin/requirements',
    },
    {
      label: 'Active Categories',
      value: stats?.totalCategories,
      icon: LayoutGrid,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
      border: 'hover:border-amber-200',
      subtext: 'Service taxonomy',
      href: '/admin/categories-services',
    },
    {
      label: 'Open Reports',
      value: stats?.pendingReports,
      icon: Flag,
      color: 'text-rose-600',
      bg: 'bg-rose-50',
      border: 'hover:border-rose-200',
      subtext: (stats?.pendingReports || 0) > 0 ? 'Action required' : 'Platform clear',
      href: '/admin/reports',
      alert: (stats?.pendingReports || 0) > 0,
    },
    {
      label: 'Cancelled Bookings',
      value: stats?.cancelledBookings,
      icon: Ban,
      color: 'text-red-600',
      bg: 'bg-red-50',
      border: 'hover:border-red-200',
      subtext: 'Cancelled by customers & providers',
      href: '/admin/cancellations',
    },
    {
      label: 'Provider Approval',
      value: stats?.pendingProviderApplications,
      icon: ShieldCheck,
      color: 'text-indigo-600',
      bg: 'bg-indigo-50',
      border: 'hover:border-indigo-200',
      subtext: (stats?.pendingProviderApplications || 0) > 0 ? 'Awaiting review' : 'All caught up',
      href: '/admin/provider-applications',
      alert: (stats?.pendingProviderApplications || 0) > 0,
    },
  ];

  const quickLinks = [
    {
      href: '/admin/provider-applications',
      label: 'Provider Approval',
      description: 'Review submitted provider applications, credentials & approve or reject onboarding',
      icon: ShieldCheck,
      iconColor: 'text-indigo-600',
      iconBg: 'bg-indigo-50 group-hover:bg-indigo-600 group-hover:text-white',
      badge: stats?.pendingProviderApplications > 0 ? `${stats.pendingProviderApplications} Pending` : null,
      badgeColor: 'bg-indigo-500 text-white',
    },
    {
      href: '/admin/users',
      label: 'Manage Users & Providers',
      description: 'Directory, KYC verification, profile details & account status',
      icon: UsersRound,
      iconColor: 'text-brand-600',
      iconBg: 'bg-brand-50 group-hover:bg-brand-600 group-hover:text-white',
    },
    {
      href: '/admin/categories-services',
      label: 'Categories & Services',
      description: 'Maintain taxonomy structure, category groupings & active service offerings',
      icon: LayoutGrid,
      iconColor: 'text-purple-600',
      iconBg: 'bg-purple-50 group-hover:bg-purple-600 group-hover:text-white',
    },
    {
      href: '/admin/reports',
      label: 'Reports & Moderation',
      description: 'Triage escalated user disputes, review flags & enforce platform safety',
      icon: Flag,
      iconColor: 'text-rose-600',
      iconBg: 'bg-rose-50 group-hover:bg-rose-600 group-hover:text-white',
      badge: stats?.pendingReports > 0 ? `${stats.pendingReports} Open` : null,
      badgeColor: 'bg-rose-500 text-white',
    },
    {
      href: '/admin/cancellations',
      label: 'Cancellations',
      description: 'Review cancelled bookings, reasons, fees charged & refunds owed',
      icon: Ban,
      iconColor: 'text-red-600',
      iconBg: 'bg-red-50 group-hover:bg-red-600 group-hover:text-white',
      badge: stats?.cancelledBookings > 0 ? `${stats.cancelledBookings} Total` : null,
      badgeColor: 'bg-red-500 text-white',
    },
    {
      href: '/admin/analytics',
      label: 'Platform Analytics',
      description: 'Monitor monthly user growth, category demand trends & activity patterns',
      icon: BarChart3,
      iconColor: 'text-emerald-600',
      iconBg: 'bg-emerald-50 group-hover:bg-emerald-600 group-hover:text-white',
    },
    {
      href: '/admin/requirements',
      label: 'All Requirements',
      description: 'Inspect public job listings, submitted quotes & ongoing contracts',
      icon: Gavel,
      iconColor: 'text-teal-600',
      iconBg: 'bg-teal-50 group-hover:bg-teal-600 group-hover:text-white',
    },
  ];

  const hasPendingWork = (stats?.pendingReports || 0) > 0;

  return (
    <div className="space-y-8">
      {hasPendingWork ? (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50/70 p-4 sm:flex-row sm:items-center sm:justify-between text-amber-900 shadow-xs"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-white shadow-xs">
              <AlertCircle size={18} aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm font-bold text-amber-950">Action Needed on Platform Items</p>
              <p className="text-xs text-amber-800">
                {stats.pendingReports} user report{stats.pendingReports !== 1 ? 's' : ''} awaiting resolution
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-center">
            <Link
              href="/admin/reports"
              className="inline-flex items-center gap-1 rounded-xl bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-rose-700 transition-colors"
            >
              <span>Inspect Reports</span>
              <ChevronRight size={14} />
            </Link>
          </div>
        </motion.div>
      ) : null}

      <div>
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <h2 className="text-base font-bold text-ink-900">System Metrics Overview</h2>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live
            </span>
          </div>
          <button
            type="button"
            onClick={fetchData}
            disabled={isRefreshing}
            className="inline-flex items-center gap-1.5 rounded-xl border border-ink-200/80 bg-white px-2.5 py-1 text-xs font-medium text-ink-600 shadow-xs hover:bg-ink-50 hover:text-ink-900 transition-all active:scale-95 disabled:opacity-50"
            title="Refresh dashboard stats"
          >
            <RefreshCw size={13} className={isRefreshing ? 'animate-spin text-brand-600' : ''} />
            <span className="hidden sm:inline">{isRefreshing ? 'Updating...' : 'Refresh'}</span>
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {cards.map((c, idx) => {
            const Icon = c.icon;
            return (
              <motion.div
                key={c.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: idx * 0.04 }}
              >
                <Link href={c.href} className="group block h-full">
                  <Card
                    className={`h-full p-4 border-ink-100/90 shadow-xs transition-all duration-200 group-hover:shadow-card ${c.border}`}
                    hover={false}
                  >
                    <div className="flex items-center justify-between">
                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-xl ${c.bg} ${c.color} shadow-xs transition-transform duration-200 group-hover:scale-105`}
                      >
                        <Icon size={20} aria-hidden="true" />
                      </div>
                      <ArrowUpRight
                        size={14}
                        className="text-ink-300 opacity-0 transition-all duration-200 group-hover:opacity-100 group-hover:text-ink-600 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                      />
                    </div>

                    <div className="mt-3.5">
                      {stats ? (
                        <p className="font-display text-2xl font-bold tracking-tight text-ink-900">
                          {c.value ?? 0}
                        </p>
                      ) : (
                        <Skeleton className="h-8 w-16" />
                      )}
                      <p className="mt-0.5 text-xs font-bold text-ink-700 group-hover:text-brand-600 transition-colors">
                        {c.label}
                      </p>
                      <p className="mt-0.5 text-[11px] text-ink-400 truncate">
                        {c.subtext}
                      </p>
                    </div>
                  </Card>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </div>

      <div>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-ink-900">Operational Portals</h2>
            <p className="text-xs text-ink-500">Access core management modules, catalog oversight & platform tools</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {quickLinks.map((l, idx) => {
            const Icon = l.icon;
            return (
              <motion.div
                key={l.href}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.15 + idx * 0.04 }}
              >
                <Link href={l.href} className="group block h-full">
                  <Card className="flex h-full items-start gap-4 p-5 border-ink-100 shadow-xs transition-all duration-200 hover:border-brand-300 hover:shadow-card group-hover:-translate-y-0.5">
                    <div
                      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl transition-all duration-200 shadow-xs ${l.iconBg}`}
                    >
                      <Icon size={22} aria-hidden="true" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-ink-900 transition-colors group-hover:text-brand-600">
                          {l.label}
                        </p>
                        {!!l.badge && (
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold shadow-xs ${
                              l.badgeColor || 'bg-brand-600 text-white'
                            }`}
                          >
                            {l.badge}
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-ink-500 leading-relaxed line-clamp-2">
                        {l.description}
                      </p>
                    </div>

                    <div className="shrink-0 self-center text-ink-300 transition-transform duration-200 group-hover:translate-x-1 group-hover:text-brand-600">
                      <ChevronRight size={18} />
                    </div>
                  </Card>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function AdminDashboardPage() {
  return <AdminDashboardContent />;
}