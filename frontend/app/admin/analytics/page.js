'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Activity,
  BarChart3,
  Briefcase,
  Flag,
  PieChart as PieIcon,
  RefreshCw,
  ShieldCheck,
  TrendingUp,
  UserCheck,
  Users,
} from 'lucide-react';
import api from '../../../lib/api';
import BackButton from '../../../components/BackButton';
import Card from '../../../components/ui/Card';
import { Skeleton } from '../../../components/ui/Skeleton';
import { REPORT_REASONS } from '../../../components/ReportModal';
import useRefetchOnFocus from '../../../lib/useRefetchOnFocus';
import {
  BarChart,
  CHART_COLORS,
  ChartEmpty,
  ChipToggleGroup,
  FilterField,
  LineChart,
  PieChart,
  Segmented,
  SelectControl,
  prettifyKey,
} from '../../../components/admin/analytics/charts';

/* ------------------------------------------------------------------ */
/* Filter configuration                                                */
/* ------------------------------------------------------------------ */

const LINE_SERIES = [
  { value: 'customers', label: 'Customers', color: CHART_COLORS[0] },
  { value: 'providers', label: 'Providers', color: CHART_COLORS[1] },
  { value: 'bookings', label: 'Bookings', color: CHART_COLORS[2] },
  { value: 'requirements', label: 'Requirements', color: CHART_COLORS[4] },
  { value: 'reports', label: 'Reports', color: CHART_COLORS[3] },
];
const LINE_COLORS = Object.fromEntries(LINE_SERIES.map((s) => [s.value, s.color]));

const LINE_RANGES = [
  { value: 1, label: '1M' },
  { value: 3, label: '3M' },
  { value: 6, label: '6M' },
  { value: 12, label: '12M' },
];

const DATA_RANGES = [
  { value: 0, label: 'All time' },
  { value: 1, label: 'Last month' },
  { value: 3, label: 'Last 3 months' },
  { value: 6, label: 'Last 6 months' },
  { value: 12, label: 'Last 12 months' },
];

const PIE_DATASETS = [
  { value: 'user_split', label: 'Customers vs providers', center: 'Users' },
  { value: 'application_status', label: 'Provider applications', center: 'Applications' },
  { value: 'booking_status', label: 'Bookings by status', center: 'Bookings' },
  { value: 'requirement_status', label: 'Requirements: open vs closed', center: 'Requirements' },
  { value: 'report_status', label: 'Reports by status', center: 'Reports' },
];

const BAR_DATASETS = [
  { value: 'provider_categories', label: 'Provider coverage by category', color: '#10B981' },
  { value: 'requirement_categories', label: 'Requirements by category', color: '#6366F1' },
  { value: 'report_reasons', label: 'Reports by violation reason', color: '#F43F5E' },
];

const TOP_N = [
  { value: 5, label: 'Top 5' },
  { value: 10, label: 'Top 10' },
];

const reasonLabel = (value) => REPORT_REASONS.find((r) => r.value === value)?.label || prettifyKey(value);

const withLabels = (items = [], dataset) =>
  items.map((item) => ({
    ...item,
    label: item.label || (dataset === 'report_reasons' ? reasonLabel(item.key) : prettifyKey(item.key)),
  }));

/* ------------------------------------------------------------------ */
/* Data hook: each chart owns its filters and fetches independently    */
/* ------------------------------------------------------------------ */

function useChartData(path, params, refreshKey) {
  const [state, setState] = useState({ data: null, loading: true, error: false });
  const paramKey = JSON.stringify(params);

  useEffect(() => {
    let cancelled = false;
    setState((s) => ({ ...s, loading: true, error: false }));
    api
      .get(path, { params: JSON.parse(paramKey) })
      .then((res) => {
        if (!cancelled) setState({ data: res.data, loading: false, error: false });
      })
      .catch(() => {
        if (!cancelled) setState((s) => ({ ...s, loading: false, error: true }));
      });
    return () => {
      cancelled = true;
    };
  }, [path, paramKey, refreshKey]);

  return state;
}

/* ------------------------------------------------------------------ */
/* Layout pieces                                                       */
/* ------------------------------------------------------------------ */

const KPI_TONES = {
  brand: 'bg-brand-50 text-brand-600',
  success: 'bg-emerald-50 text-emerald-600',
  warning: 'bg-amber-50 text-amber-600',
  danger: 'bg-rose-50 text-rose-600',
  purple: 'bg-purple-50 text-purple-600',
  sky: 'bg-sky-50 text-sky-600',
};

function KpiCard({ label, value, delta, icon: Icon, tone = 'brand' }) {
  return (
    <Card className="p-4 border-ink-100 shadow-xs hover:border-brand-200 transition-all" hover={false}>
      <div className="flex items-start justify-between gap-2">
        <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${KPI_TONES[tone]}`}>
          <Icon size={18} aria-hidden="true" />
        </div>
        {delta !== undefined && delta !== null && (
          <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
            <TrendingUp size={10} aria-hidden="true" />+{delta}
            <span className="font-medium text-emerald-600/80"> 30d</span>
          </span>
        )}
      </div>
      <p className="mt-3 font-display text-2xl font-bold tracking-tight text-ink-900">{value ?? 0}</p>
      <p className="mt-0.5 text-xs font-medium leading-snug text-ink-500">{label}</p>
    </Card>
  );
}

function ChartCard({ icon: Icon, tone, title, subtitle, filters, loading, error, children, className = '' }) {
  return (
    <Card className={`flex flex-col border-ink-100 p-5 shadow-xs ${className}`} hover={false}>
      <div className="flex items-start gap-2.5">
        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${KPI_TONES[tone]}`}>
          <Icon size={16} aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <h3 className="text-sm font-bold text-ink-900">{title}</h3>
          <p className="text-xs text-ink-500">{subtitle}</p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-end gap-x-4 gap-y-3 rounded-xl border border-ink-100/80 bg-ink-50/50 p-3">
        {filters}
      </div>

      <div className={`relative mt-5 flex-1 transition-opacity ${loading ? 'opacity-50' : ''}`}>
        {error ? <ChartEmpty message="Could not load this chart. Try refreshing." /> : children}
      </div>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Charts                                                              */
/* ------------------------------------------------------------------ */

function TrendLineCard({ refreshKey }) {
  const [months, setMonths] = useState(6);
  const [granularity, setGranularity] = useState('month');
  const [series, setSeries] = useState(['customers', 'providers']);

  const { data, loading, error } = useChartData(
    '/admin/analytics/line',
    { months, granularity, series: series.join(',') },
    refreshKey
  );

  const changeRange = (value) => {
    setMonths(value);
    if (granularity === 'day' && value > 3) setGranularity('week');
    if (granularity === 'month' && value < 3) setGranularity('week');
  };

  const toggleSeries = (key) =>
    setSeries((prev) => {
      if (prev.includes(key)) return prev.length === 1 ? prev : prev.filter((k) => k !== key);
      return [...prev, key];
    });

  const hasData = data && data.series?.some((s) => s.total > 0);

  return (
    <ChartCard
      icon={Activity}
      tone="brand"
      title="Growth & activity trends"
      subtitle="Line graph of sign-ups and marketplace activity over time"
      loading={loading}
      error={error && !data}
      filters={
        <>
          <FilterField label="Range">
            <Segmented ariaLabel="Trend range" options={LINE_RANGES} value={months} onChange={changeRange} />
          </FilterField>
          <FilterField label="Interval">
            <Segmented
              ariaLabel="Trend interval"
              value={granularity}
              onChange={setGranularity}
              options={[
                { value: 'day', label: 'Daily', disabled: months > 3 },
                { value: 'week', label: 'Weekly' },
                { value: 'month', label: 'Monthly', disabled: months < 3 },
              ]}
            />
          </FilterField>
          <FilterField label="Metrics">
            <ChipToggleGroup
              ariaLabel="Trend metrics"
              options={LINE_SERIES}
              selected={series}
              onToggle={toggleSeries}
            />
          </FilterField>
        </>
      }
    >
      {!data ? (
        <Skeleton className="h-64 w-full rounded-xl" />
      ) : !hasData ? (
        <ChartEmpty />
      ) : (
        <>
          <LineChart labels={data.labels} series={data.series} colors={LINE_COLORS} />
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
            {data.series.map((s) => (
              <div key={s.key} className="rounded-xl border border-ink-100 bg-white px-3 py-2">
                <p className="flex items-center gap-1.5 text-[11px] font-medium text-ink-500">
                  <span className="h-2 w-2 rounded-full" style={{ background: LINE_COLORS[s.key] }} />
                  {s.label}
                </p>
                <p className="font-display text-lg font-bold text-ink-900">{s.total}</p>
              </div>
            ))}
          </div>
        </>
      )}
    </ChartCard>
  );
}

function DistributionPieCard({ refreshKey }) {
  const [dataset, setDataset] = useState('user_split');
  const [months, setMonths] = useState(0);

  const { data, loading, error } = useChartData('/admin/analytics/pie', { dataset, months }, refreshKey);
  const meta = PIE_DATASETS.find((d) => d.value === dataset);
  const items = data ? withLabels(data.items, dataset) : [];

  return (
    <ChartCard
      icon={PieIcon}
      tone="purple"
      title="Distribution breakdown"
      subtitle="Pie chart of how records split across statuses"
      loading={loading}
      error={error && !data}
      filters={
        <>
          <FilterField label="Breakdown">
            <SelectControl ariaLabel="Pie chart breakdown" value={dataset} onChange={setDataset} options={PIE_DATASETS} />
          </FilterField>
          <FilterField label="Period">
            <SelectControl
              ariaLabel="Pie chart period"
              value={months}
              onChange={(v) => setMonths(Number(v))}
              options={DATA_RANGES}
            />
          </FilterField>
        </>
      }
    >
      {!data ? (
        <Skeleton className="h-52 w-full rounded-xl" />
      ) : data.total === 0 ? (
        <ChartEmpty />
      ) : (
        <PieChart items={items} total={data.total} centerLabel={meta?.center} />
      )}
    </ChartCard>
  );
}

function RankingBarCard({ refreshKey }) {
  const [dataset, setDataset] = useState('provider_categories');
  const [months, setMonths] = useState(0);
  const [limit, setLimit] = useState(5);

  const { data, loading, error } = useChartData('/admin/analytics/bar', { dataset, months, limit }, refreshKey);
  const meta = BAR_DATASETS.find((d) => d.value === dataset);
  const items = data ? withLabels(data.items, dataset) : [];

  return (
    <ChartCard
      icon={BarChart3}
      tone="success"
      title="Category & dispute rankings"
      subtitle="Bar graph comparing the biggest categories or violation types"
      loading={loading}
      error={error && !data}
      filters={
        <>
          <FilterField label="Compare">
            <SelectControl ariaLabel="Bar chart dataset" value={dataset} onChange={setDataset} options={BAR_DATASETS} />
          </FilterField>
          <FilterField label="Period">
            <SelectControl
              ariaLabel="Bar chart period"
              value={months}
              onChange={(v) => setMonths(Number(v))}
              options={DATA_RANGES}
            />
          </FilterField>
          <FilterField label="Show">
            <Segmented ariaLabel="Bar chart size" options={TOP_N} value={limit} onChange={setLimit} />
          </FilterField>
        </>
      }
    >
      {!data ? (
        <Skeleton className="h-52 w-full rounded-xl" />
      ) : items.length === 0 ? (
        <ChartEmpty />
      ) : (
        <BarChart items={items} color={meta?.color} />
      )}
    </ChartCard>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

function AdminAnalyticsContent() {
  const [summary, setSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const fetchSummary = useCallback(() => {
    setIsRefreshing(true);
    api
      .get('/admin/analytics')
      .then((res) => setSummary(res.data))
      .catch(() => {})
      .finally(() => {
        setSummaryLoading(false);
        setIsRefreshing(false);
      });
  }, []);

  const refreshAll = useCallback(() => {
    fetchSummary();
    setRefreshKey((k) => k + 1);
  }, [fetchSummary]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  useRefetchOnFocus(refreshAll);

  const openReports = (summary?.reports?.pending ?? 0) + (summary?.reports?.under_review ?? 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <BackButton href="/admin" label="Back to dashboard" />
          <h2 className="mt-3 text-xl font-bold tracking-tight text-ink-900">Platform Analytics & Insights</h2>
          <p className="text-xs text-ink-500">
            Growth, marketplace activity and dispute trends. Every chart has its own filters.
          </p>
        </div>
        <button
          type="button"
          onClick={refreshAll}
          disabled={isRefreshing}
          className="inline-flex items-center gap-1.5 self-start rounded-xl border border-ink-200/80 bg-white px-3 py-1.5 text-xs font-medium text-ink-600 shadow-xs transition-all hover:bg-ink-50 hover:text-ink-900 active:scale-95 disabled:opacity-50 sm:self-auto"
          title="Refresh analytics"
        >
          <RefreshCw size={13} className={isRefreshing ? 'animate-spin text-brand-600' : ''} />
          <span>{isRefreshing ? 'Updating...' : 'Refresh'}</span>
        </button>
      </div>

      {summaryLoading ? (
        <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-3 xl:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-2xl" />
          ))}
        </div>
      ) : summary ? (
        <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-3 xl:grid-cols-6">
          <KpiCard
            label="Total customers"
            value={summary.customers?.total}
            delta={summary.customers?.new_last_30_days}
            icon={Users}
            tone="brand"
          />
          <KpiCard
            label="Active customers"
            value={summary.customers?.active}
            icon={UserCheck}
            tone="success"
          />
          <KpiCard
            label="Total providers"
            value={summary.providers?.total}
            delta={summary.providers?.new_last_30_days}
            icon={Briefcase}
            tone="sky"
          />
          <KpiCard
            label="Verified providers"
            value={summary.providers?.approved}
            icon={ShieldCheck}
            tone="purple"
          />
          <KpiCard
            label="Applications pending"
            value={summary.providers?.pending_applications}
            icon={Briefcase}
            tone="warning"
          />
          <KpiCard label="Open reports" value={openReports} icon={Flag} tone="danger" />
        </div>
      ) : (
        <p className="text-sm text-ink-400">Could not load analytics summary.</p>
      )}

      <TrendLineCard refreshKey={refreshKey} />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <DistributionPieCard refreshKey={refreshKey} />
        <RankingBarCard refreshKey={refreshKey} />
      </div>

      {summary && (
        <div className="rounded-xl border border-ink-100/80 bg-ink-50/50 p-3.5 text-xs text-ink-500">
          <span className="font-semibold text-ink-700">{summary.reports?.open_against_providers || 0}</span> open
          report{(summary.reports?.open_against_providers ?? 0) !== 1 ? 's' : ''} against providers &middot;{' '}
          <span className="font-semibold text-ink-700">{summary.reports?.open_against_customers || 0}</span> open
          report{(summary.reports?.open_against_customers ?? 0) !== 1 ? 's' : ''} against customers &middot;{' '}
          <span className="font-semibold text-ink-700">{summary.reports?.total || 0}</span> reports all-time
        </div>
      )}
    </div>
  );
}

export default function AdminAnalyticsPage() {
  return <AdminAnalyticsContent />;
}