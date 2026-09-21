'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronRight, Flag } from 'lucide-react';
import api from '../../../lib/api';
import BackButton from '../../../components/BackButton';
import Card from '../../../components/ui/Card';
import Badge from '../../../components/ui/Badge';
import StatusBadge from '../../../components/StatusBadge';
import { RowSkeleton } from '../../../components/ui/Skeleton';
import { REPORT_REASONS } from '../../../components/ReportModal';
import useRefetchOnFocus from '../../../lib/useRefetchOnFocus';
import usePagination from '../../../lib/usePagination';
import Pagination from '../../../components/admin/Pagination';

const TABS = [
  { key: 'pending', label: 'Pending' },
  { key: 'under_review', label: 'Under review' },
  { key: 'action_taken', label: 'Action taken' },
  { key: 'dismissed', label: 'Dismissed' },
  { key: 'all', label: 'All' },
];

const reasonLabel = (value) => REPORT_REASONS.find((r) => r.value === value)?.label || value;

function ReportRow({ report }) {
  return (
    <Link href={`/admin/reports/${report.id}`} className="group block">
      <Card className="flex items-center justify-between gap-4 p-5 border-ink-200/80 shadow-xs transition-all hover:border-brand-300 hover:shadow-card group-hover:-translate-y-0.5" hover={false}>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-bold text-ink-900 group-hover:text-brand-600 transition-colors">
              {report.reporter?.name || 'Unknown'}{' '}
              <span className="font-normal text-xs text-ink-400">({report.reporter_role})</span>
              <span className="mx-1 text-ink-400 font-normal">reported</span>
              {report.reported_user?.name || 'Unknown'}{' '}
              <span className="font-normal text-xs text-ink-400">({report.reported_role})</span>
            </p>
            <StatusBadge status={report.status} kind="report" />
          </div>
          {report.description && (
            <p className="mt-1 line-clamp-1 text-xs text-ink-600 leading-relaxed">{report.description}</p>
          )}
          <div className="mt-2 flex items-center gap-2">
            <span className="rounded-md bg-ink-100 px-2 py-0.5 text-[10px] font-semibold text-ink-700">
              {reasonLabel(report.reason)}
            </span>
            <span className="text-[11px] text-ink-400">
              Filed on {new Date(report.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
          </div>
        </div>
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-ink-50 text-ink-400 group-hover:bg-brand-50 group-hover:text-brand-600 transition-colors shrink-0">
          <ChevronRight size={16} aria-hidden="true" />
        </div>
      </Card>
    </Link>
  );
}

function AdminReportsContent() {
  const [tab, setTab] = useState('pending');
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    api
      .get('/admin/reports', { params: { status: tab } })
      .then(({ data }) => setReports(data.reports || []))
      .finally(() => setLoading(false));
  };

  useEffect(load, [tab]);

  useRefetchOnFocus(load);

  const pager = usePagination(reports, { resetKey: tab });

  return (
    <div className="space-y-6">
      <BackButton href="/admin" label="Back to dashboard" />
      <div>
        <h2 className="text-xl font-bold tracking-tight text-ink-900">Incident & Dispute Moderation</h2>
        <p className="text-xs text-ink-500">Review grievances, policy violations, and take disciplinary or resolution actions</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`rounded-xl px-4 py-2 text-xs font-semibold capitalize transition-all ${
              tab === t.key
                ? 'bg-brand-600 text-white shadow-xs'
                : 'border border-ink-200/80 bg-white text-ink-600 hover:border-brand-300 hover:bg-ink-50/50'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {loading && Array.from({ length: 3 }).map((_, i) => <RowSkeleton key={i} />)}
        {!loading && reports.length === 0 && (
          <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-ink-200 bg-white py-16 text-center">
            <Flag size={34} className="text-ink-300" aria-hidden="true" />
            <p className="text-sm font-semibold text-ink-700">No reports in this category</p>
            <p className="text-xs text-ink-400">All reports under &quot;{TABS.find((t) => t.key === tab)?.label}&quot; are clear.</p>
          </div>
        )}
        {!loading && pager.pageItems.map((r) => <ReportRow key={r.id} report={r} />)}
      </div>

      {!loading && <Pagination pager={pager} label="reports" />}
    </div>
  );
}

export default function AdminReportsPage() {
  return <AdminReportsContent />;
}
