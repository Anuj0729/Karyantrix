'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { Briefcase, Check, Clock, Gavel, Pencil, Search, XCircle, Wallet } from 'lucide-react';
import api from '../../../lib/api';
import ProtectedRoute from '../../../components/ProtectedRoute';
import StatusBadge from '../../../components/StatusBadge';
import Card from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import { RowSkeleton } from '../../../components/ui/Skeleton';
import { useAuth } from '../../../context/AuthContext';
import { getSocket } from '../../../lib/socket';
import useRefetchOnFocus from '../../../lib/useRefetchOnFocus';

const TABS = [
  { key: '', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'accepted', label: 'Hired' },
  { key: 'rejected', label: 'Not selected' },
];

function ProviderDashboardContent() {
  const { user } = useAuth();
  const [bids, setBids] = useState([]);
  const [activeTab, setActiveTab] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchBids = useCallback(() => {
    setLoading(true);
    api.get('/requirements/bids/mine')
      .then(({ data }) => setBids(data.bids || []))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchBids();
  }, [fetchBids]);

  useRefetchOnFocus(fetchBids);

  useEffect(() => {
    if (!user) return undefined;
    const token = typeof window !== 'undefined' ? localStorage.getItem('karyantrix_token') : null;
    const socket = getSocket(token);

    socket.on('bid_accepted', fetchBids);
    socket.on('bid_status_changed', fetchBids);

    return () => {
      socket.off('bid_accepted', fetchBids);
      socket.off('bid_status_changed', fetchBids);
    };
  }, [user, fetchBids]);

  const filteredBids = useMemo(
    () => (activeTab ? bids.filter((b) => b.status === activeTab) : bids),
    [bids, activeTab]
  );

  const stats = useMemo(() => {
    const pending = bids.filter((b) => b.status === 'pending').length;
    const accepted = bids.filter((b) => b.status === 'accepted').length;
    const rejected = bids.filter((b) => b.status === 'rejected').length;
    return [
      { label: 'Pending bids', value: pending, icon: Clock },
      { label: 'Jobs hired for', value: accepted, icon: Check },
      { label: 'Not selected', value: rejected, icon: XCircle },
      { label: 'Total bids', value: bids.length, icon: Gavel },
      { label: 'Pending Bids', value: pending, icon: Clock, bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-100' },
      { label: 'Jobs Hired For', value: accepted, icon: Check, bg: 'bg-trust-50', text: 'text-trust-600', border: 'border-trust-100' },
      { label: 'Not Selected', value: rejected, icon: XCircle, bg: 'bg-ink-100/60', text: 'text-ink-500', border: 'border-ink-200/60' },
      { label: 'Total Bids Placed', value: bids.length, icon: Gavel, bg: 'bg-brand-50', text: 'text-brand-600', border: 'border-brand-100' },
    ];
  }, [bids]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-3 border-b border-ink-100">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-ink-900 tracking-tight">Provider Dashboard</h1>
          <p className="text-xs sm:text-sm text-ink-500 mt-1">Manage your bids, active proposals, and service listings</p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <Link href="/">
            <Button variant="secondary" size="sm" icon={<Search size={15} aria-hidden="true" />}>
              Browse jobs
            </Button>
          </Link>
          <Link href="/provider/wallet">
            <Button variant="secondary" size="sm" icon={<Wallet size={15} aria-hidden="true" />}>
              Wallet
            </Button>
          </Link>
          <Link href="/provider/profile">
            <Button variant="primary" size="sm" icon={<Pencil size={14} aria-hidden="true" />}>
              Profile &amp; listings
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <Card key={s.label} className={`p-4 sm:p-5 rounded-3xl border ${s.border} bg-white shadow-soft`} hover={false}>
              <div className="flex items-center justify-between">
                <span className={`flex h-10 w-10 items-center justify-center rounded-2xl ${s.bg} ${s.text}`}>
                  <Icon size={18} aria-hidden="true" />
                </span>
              </div>
              <p className="mt-3 font-display text-2xl font-bold text-ink-900 tracking-tight">{s.value}</p>
              <p className="text-xs font-semibold text-ink-500 mt-0.5">{s.label}</p>
            </Card>
          );
        })}
      </div>

      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {TABS.map((tab) => {
          const count = tab.key ? bids.filter((b) => b.status === tab.key).length : bids.length;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-shrink-0 inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold transition-all duration-200 ${
                isActive
                  ? 'bg-brand-600 text-white shadow-soft shadow-brand-600/30'
                  : 'bg-white border border-ink-200/80 text-ink-600 hover:text-ink-900 hover:bg-ink-50'
              }`}
            >
              <span>{tab.label}</span>
              {count > 0 && (
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                    isActive ? 'bg-white/20 text-white' : 'bg-ink-100 text-ink-600'
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="flex flex-col gap-3.5">
        {loading && Array.from({ length: 3 }).map((_, i) => <RowSkeleton key={i} />)}
        {!loading && filteredBids.map((bid) => (
          <Card key={bid.id} className="p-5 rounded-3xl border border-ink-200/80 bg-white shadow-soft hover:shadow-card-hover transition-all" hover={false}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-bold text-base text-ink-900">
                  {(bid.requirement?.services || []).join(', ') || 'Custom Requirement'}
                </p>
                <p className="mt-1 line-clamp-2 text-xs sm:text-sm text-ink-600 leading-relaxed">
                  {bid.requirement?.description}
                </p>
              </div>
              <StatusBadge status={bid.status} kind="bid" className="shrink-0 font-semibold" />
            </div>

            <div className="mt-4 pt-3.5 border-t border-ink-100/80 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-ink-400">Your Quote:</span>
                <span className="font-display font-bold text-brand-700 bg-brand-50 px-2.5 py-1 rounded-xl border border-brand-100/70 text-sm">
                  &#8377;{bid.amount?.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-ink-500">
                <span>Customer budget:</span>
                <span className="font-bold text-ink-800">&#8377;{bid.requirement?.budget?.toLocaleString('en-IN')}</span>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {!loading && filteredBids.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-ink-200 bg-ink-50/40 py-16 px-6 text-center">
          <div className="w-14 h-14 rounded-2xl bg-white border border-ink-100 shadow-soft flex items-center justify-center text-ink-400">
            <Briefcase size={28} className="text-ink-300" aria-hidden="true" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-ink-800">No bids found</h3>
            <p className="mt-1 text-xs text-ink-500 max-w-sm">
              {activeTab
                ? 'No bids currently match this status filter.'
                : 'You have not submitted any bids yet. Browse nearby job posts to submit proposals.'}
            </p>
          </div>
          <Link href="/">
            <Button size="sm" className="mt-2">Browse customer requirements</Button>
          </Link>
        </div>
      )}
    </div>
  );
}

export default function ProviderDashboardPage() {
  return (
    <ProtectedRoute allowedRoles={['provider']}>
      <ProviderDashboardContent />
    </ProtectedRoute>
  );
}
