'use client';

import { useEffect, useState } from 'react';
import { Briefcase, Flag, LayoutGrid, RefreshCw, TrendingUp, Users } from 'lucide-react';
import api from '../../../lib/api';
import BackButton from '../../../components/BackButton';
import Card from '../../../components/ui/Card';
import { Skeleton } from '../../../components/ui/Skeleton';
import { REPORT_REASONS } from '../../../components/ReportModal';
import useRefetchOnFocus from '../../../lib/useRefetchOnFocus';

const monthLabel = (ym) => {
  const [y, m] = ym.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: 'short' });
};

const reasonLabel = (value) => REPORT_REASONS.find((r) => r.value === value)?.label || value;

function StatCard({ label, value, icon: Icon, tone = 'brand' }) {
  const tones = {
    brand: 'bg-brand-50 text-brand-600',
    success: 'bg-emerald-50 text-emerald-600',
    warning: 'bg-amber-50 text-amber-600',
    danger: 'bg-rose-50 text-rose-600',
    purple: 'bg-purple-50 text-purple-600',
  };
  return (
    <Card className="p-[18px] border-ink-100 shadow-xs hover:border-brand-200 transition-all" hover={false}>
      <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${tones[tone] || tones.brand}`}>
        <Icon size={18} aria-hidden="true" />
      </div>
      <p className="mt-3 font-display text-2xl font-bold tracking-tight text-ink-900">{value ?? 0}</p>
      <p className="mt-0.5 text-xs text-ink-500 font-medium leading-snug">{label}</p>
    </Card>
  );
}

function MonthlyBarChart({ data = [], color = 'bg-gradient-to-t from-brand-600 to-accent-500' }) {
  const max = Math.max(1, ...data.map((d) => d.count));
  return (
    <div className="flex h-36 items-stretch gap-3 pt-4">
      {data.map((d) => (
        <div key={d.month} className="group flex flex-1 flex-col items-center gap-2">
          <span className="text-[11px] font-bold text-ink-600 transition-transform group-hover:-translate-y-0.5 group-hover:text-brand-600">
            {d.count}
          </span>
          <div className="flex w-full flex-1 items-end bg-ink-50/70 rounded-t-lg p-0.5">
            <div
              className={`w-full rounded-t-md transition-all duration-500 group-hover:brightness-110 shadow-xs ${color}`}
              style={{ height: `${Math.max(6, (d.count / max) * 100)}%` }}
            />
          </div>
          <span className="text-[11px] font-medium text-ink-400">{monthLabel(d.month)}</span>
        </div>
      ))}
    </div>
  );
}

function BreakdownBars({ items = [], getLabel, getCount, color = 'bg-brand-500' }) {
  const max = Math.max(1, ...items.map(getCount));
  if (items.length === 0) return <p className="text-xs text-ink-400 italic py-4">No activity data recorded yet.</p>;
  return (
    <div className="space-y-3">
      {items.map((item, i) => (
        <div key={i}>
          <div className="mb-1.5 flex items-center justify-between text-xs">
            <span className="font-semibold text-ink-700">{getLabel(item)}</span>
            <span className="font-bold text-ink-900 font-mono">{getCount(item)}</span>
          </div>
          <div className="h-2 w-full rounded-full bg-ink-100 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${color}`}
              style={{ width: `${(getCount(item) / max) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function AdminAnalyticsContent() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchData = () => {
    setIsRefreshing(true);
    api
      .get('/admin/analytics')
      .then((res) => setData(res.data))
      .finally(() => {
        setLoading(false);
        setIsRefreshing(false);
      });
  };

  useEffect(() => {
    fetchData();
  }, []);

  useRefetchOnFocus(fetchData);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <BackButton href="/admin" label="Back to dashboard" />
          <h2 className="mt-3 text-xl font-bold tracking-tight text-ink-900">Platform Analytics & Insights</h2>
          <p className="text-xs text-ink-500">System growth metrics, acquisition channels, provider distribution & dispute rates</p>
        </div>
        <button
          type="button"
          onClick={fetchData}
          disabled={isRefreshing}
          className="inline-flex items-center gap-1.5 self-start rounded-xl border border-ink-200/80 bg-white px-3 py-1.5 text-xs font-medium text-ink-600 shadow-xs transition-all hover:bg-ink-50 hover:text-ink-900 active:scale-95 disabled:opacity-50 sm:self-auto"
          title="Refresh analytics"
        >
          <RefreshCw size={13} className={isRefreshing ? 'animate-spin text-brand-600' : ''} />
          <span>{isRefreshing ? 'Updating...' : 'Refresh'}</span>
        </button>
      </div>

      {loading ? (
        <div className="space-y-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-48 w-full rounded-2xl" />
          ))}
        </div>
      ) : !data ? (
        <p className="text-sm text-ink-400">Could not load analytics.</p>
      ) : (
        <div className="space-y-8">
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                <Users size={16} aria-hidden="true" />
              </div>
              <h3 className="font-bold text-sm text-ink-900">Customer Growth</h3>
            </div>
            <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3">
              <StatCard label="Total Customers" value={data.customers?.total} icon={Users} tone="brand" />
              <StatCard label="Active Accounts" value={data.customers?.active} icon={TrendingUp} tone="success" />
              <StatCard label="New (Last 30 Days)" value={data.customers?.new_last_30_days} icon={Users} tone="purple" />
            </div>
            <Card className="p-5 border-ink-100 shadow-xs" hover={false}>
              <p className="text-xs font-bold text-ink-700">Monthly Customer Sign-ups</p>
              <MonthlyBarChart data={data.customers?.monthly_signups || []} />
            </Card>
          </section>

          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                <Briefcase size={16} aria-hidden="true" />
              </div>
              <h3 className="font-bold text-sm text-ink-900">Provider Network</h3>
            </div>
            <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
              <StatCard label="Total Providers" value={data.providers?.total} icon={Briefcase} tone="brand" />
              <StatCard label="Verified / Approved" value={data.providers?.approved} icon={TrendingUp} tone="success" />
              <StatCard label="New (Last 30 Days)" value={data.providers?.new_last_30_days} icon={Briefcase} tone="purple" />
            </div>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <Card className="p-5 border-ink-100 shadow-xs" hover={false}>
                <p className="text-xs font-bold text-ink-700">Provider Registrations by Month</p>
                <MonthlyBarChart data={data.providers?.monthly_signups || []} color="bg-gradient-to-t from-emerald-600 to-teal-400" />
              </Card>
              <Card className="p-5 border-ink-100 shadow-xs" hover={false}>
                <p className="flex items-center gap-1.5 text-xs font-bold text-ink-700 mb-4">
                  <LayoutGrid size={14} aria-hidden="true" /> Top Categories by Provider Coverage
                </p>
                <BreakdownBars
                  items={data.providers?.top_categories || []}
                  getLabel={(c) => c.name}
                  getCount={(c) => c.count}
                  color="bg-emerald-500"
                />
              </Card>
            </div>
          </section>

          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-50 text-rose-600">
                <Flag size={16} aria-hidden="true" />
              </div>
              <h3 className="font-bold text-sm text-ink-900">Moderation & Disputes</h3>
            </div>
            <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-5">
              <StatCard label="Total Reports" value={data.reports?.total} icon={Flag} tone="purple" />
              <StatCard label="Pending Review" value={data.reports?.pending} icon={Flag} tone="warning" />
              <StatCard label="Under Review" value={data.reports?.under_review} icon={Flag} tone="brand" />
              <StatCard label="Action Taken" value={data.reports?.action_taken} icon={Flag} tone="danger" />
              <StatCard label="Dismissed" value={data.reports?.dismissed} icon={Flag} tone="success" />
            </div>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <Card className="p-5 border-ink-100 shadow-xs" hover={false}>
                <p className="text-xs font-bold text-ink-700">Dispute Trend by Month</p>
                <MonthlyBarChart data={data.reports?.monthly_trend || []} color="bg-gradient-to-t from-rose-600 to-amber-500" />
              </Card>
              <Card className="p-5 border-ink-100 shadow-xs" hover={false}>
                <p className="text-xs font-bold text-ink-700 mb-4">Reports by Violation Category</p>
                <BreakdownBars
                  items={data.reports?.by_reason || []}
                  getLabel={(r) => reasonLabel(r.reason)}
                  getCount={(r) => r.count}
                  color="bg-rose-500"
                />
              </Card>
            </div>
            <div className="rounded-xl border border-ink-100/80 bg-ink-50/50 p-3.5 text-xs text-ink-500">
              <span className="font-semibold text-ink-700">{data.reports?.open_against_providers || 0}</span> open report{(data.reports?.open_against_providers ?? 0) !== 1 ? 's' : ''} against providers &middot; <span className="font-semibold text-ink-700">{data.reports?.open_against_customers || 0}</span> open report{(data.reports?.open_against_customers ?? 0) !== 1 ? 's' : ''} against customers
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

export default function AdminAnalyticsPage() {
  return <AdminAnalyticsContent />;
}
