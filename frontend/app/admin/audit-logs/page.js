'use client';

import { useEffect, useMemo, useState } from 'react';
import { CircleAlert, ClipboardList, Search, ShieldCheck, UserRound } from 'lucide-react';
import api from '../../../lib/api';
import BackButton from '../../../components/BackButton';
import Card from '../../../components/ui/Card';
import Badge from '../../../components/ui/Badge';
import { RowSkeleton } from '../../../components/ui/Skeleton';
import { TextInput } from '../../../components/ui/Field';
import useRefetchOnFocus from '../../../lib/useRefetchOnFocus';
import usePagination from '../../../lib/usePagination';
import Pagination from '../../../components/admin/Pagination';

const METHOD_TABS = [
  { key: '', label: 'All actions' },
  { key: 'POST', label: 'Created' },
  { key: 'PUT', label: 'Updated' },
  { key: 'PATCH', label: 'Changed' },
  { key: 'DELETE', label: 'Deleted' },
];

const METHOD_TONE = {
  POST: 'success',
  PUT: 'brand',
  PATCH: 'warning',
  DELETE: 'danger',
};

const fmtDateTime = (d) =>
  d
    ? new Date(d).toLocaleString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '\u2014';

function MetaChips({ meta }) {
  if (!meta || typeof meta !== 'object') return null;
  const entries = Object.entries(meta).slice(0, 4);
  if (entries.length === 0) return null;
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {entries.map(([key, value]) => (
        <span key={key} className="rounded-md bg-ink-100 px-2 py-0.5 text-[10px] font-medium text-ink-600">
          <span className="font-semibold text-ink-700">{key}:</span>{' '}
          {typeof value === 'object' ? JSON.stringify(value) : String(value)}
        </span>
      ))}
    </div>
  );
}

function AuditLogRow({ log }) {
  return (
    <Card className="p-[18px] border-ink-200/80 shadow-xs" hover={false}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-1.5 text-sm font-bold text-ink-900">
              <UserRound size={13} className="text-ink-400" aria-hidden="true" />
              {log.actor?.name || log.actor_name}
            </span>
            <Badge tone="purple" size="sm" icon={<ShieldCheck size={11} aria-hidden="true" />}>
              {log.actor_role}
            </Badge>
            <Badge tone={METHOD_TONE[log.method] || 'neutral'} size="sm">
              {log.method}
            </Badge>
            {!log.success && (
              <Badge tone="danger" size="sm" icon={<CircleAlert size={11} aria-hidden="true" />}>
                Failed &middot; {log.status_code}
              </Badge>
            )}
          </div>

          <p className="mt-1.5 text-sm text-ink-800">{log.action}</p>
          <p className="mt-0.5 font-mono text-[11px] text-ink-400">{log.path}</p>

          <MetaChips meta={log.meta} />

          <p className="mt-2 text-[11px] text-ink-400">{fmtDateTime(log.createdAt)}</p>
        </div>
      </div>
    </Card>
  );
}

function AdminAuditLogsContent() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [method, setMethod] = useState('');
  const [search, setSearch] = useState('');

  const load = () => {
    setLoading(true);
    api
      .get('/admin/audit-logs')
      .then(({ data }) => setLogs(data.logs || []))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);
  useRefetchOnFocus(load);

  const filtered = useMemo(() => {
    return logs.filter((log) => {
      if (method && log.method !== method) return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const haystack = `${log.actor?.name || log.actor_name} ${log.action} ${log.path}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [logs, method, search]);

  const pager = usePagination(filtered, { resetKey: `${method}:${search}` });

  return (
    <div className="space-y-6">
      <BackButton href="/admin" label="Back to dashboard" />
      <div>
        <h2 className="text-xl font-bold tracking-tight text-ink-900">Admin Action Ledger</h2>
        <p className="text-xs text-ink-500">
          Every create, update, and delete performed in the admin panel, with who did it and when. Read-only &mdash;
          nothing here can be edited or removed.
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {METHOD_TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setMethod(t.key)}
              className={`rounded-xl px-4 py-2 text-xs font-semibold transition-all ${
                method === t.key
                  ? 'bg-brand-600 text-white shadow-xs'
                  : 'border border-ink-200/80 bg-white text-ink-600 hover:border-brand-300 hover:bg-ink-50/50'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="w-full sm:w-64">
          <TextInput
            leftIcon={<Search size={15} aria-hidden="true" />}
            placeholder="Search by admin, action, or path"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-3">
        {loading && Array.from({ length: 4 }).map((_, i) => <RowSkeleton key={i} />)}
        {!loading && filtered.length === 0 && (
          <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-ink-200 bg-white py-16 text-center">
            <ClipboardList size={34} className="text-ink-300" aria-hidden="true" />
            <p className="text-sm font-semibold text-ink-700">No actions recorded yet</p>
            <p className="text-xs text-ink-400">
              {logs.length === 0
                ? 'Actions performed in the admin panel will show up here as they happen.'
                : 'No actions match your current filter.'}
            </p>
          </div>
        )}
        {!loading && pager.pageItems.map((log) => <AuditLogRow key={log.id} log={log} />)}
      </div>

      {!loading && <Pagination pager={pager} label="actions" />}
    </div>
  );
}

export default function AdminAuditLogsPage() {
  return <AdminAuditLogsContent />;
}
