'use client';

import { useEffect, useMemo, useState } from 'react';
import { CircleAlert, ClipboardList, Laptop, Search, ShieldCheck, UserRound } from 'lucide-react';
import api from '../../../lib/api';
import BackButton from '../../../components/BackButton';
import Card from '../../../components/ui/Card';
import Badge from '../../../components/ui/Badge';
import { RowSkeleton } from '../../../components/ui/Skeleton';
import { TextInput, SelectInput } from '../../../components/ui/Field';
import useRefetchOnFocus from '../../../lib/useRefetchOnFocus';
import usePagination from '../../../lib/usePagination';
import Pagination from '../../../components/admin/Pagination';

const ROLE_TABS = [
  { key: '', label: 'Everyone' },
  { key: 'admin,staff', label: 'Admin & staff' },
  { key: 'customer', label: 'Customers' },
  { key: 'provider', label: 'Providers' },
];

const ROLE_TONE = {
  admin: 'purple',
  staff: 'purple',
  customer: 'brand',
  provider: 'cyan',
};

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
  const deviceCount = log.actor_active_devices || 0;
  return (
    <Card className="p-[18px] border-ink-200/80 shadow-xs" hover={false}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-1.5 text-sm font-bold text-ink-900">
              <UserRound size={13} className="text-ink-400" aria-hidden="true" />
              {log.actor?.name || log.actor_name}
            </span>
            <Badge tone={ROLE_TONE[log.actor_role] || 'purple'} size="sm" icon={<ShieldCheck size={11} aria-hidden="true" />}>
              {log.actor_role}
            </Badge>
            <Badge tone={METHOD_TONE[log.method] || 'neutral'} size="sm">
              {log.method}
            </Badge>
            {log.actor && (
              <Badge tone={deviceCount > 1 ? 'warning' : 'neutral'} size="sm" icon={<Laptop size={11} aria-hidden="true" />}>
                {deviceCount} device{deviceCount === 1 ? '' : 's'} logged in
              </Badge>
            )}
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
  const [role, setRole] = useState('');
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

  const roleTabCounts = useMemo(() => {
    const counts = { '': logs.length };
    ROLE_TABS.forEach((tab) => {
      if (!tab.key) return;
      const roles = tab.key.split(',');
      counts[tab.key] = logs.filter((log) => roles.includes(log.actor_role)).length;
    });
    return counts;
  }, [logs]);

  const filtered = useMemo(() => {
    return logs.filter((log) => {
      if (role) {
        const roles = role.split(',');
        if (!roles.includes(log.actor_role)) return false;
      }
      if (method && log.method !== method) return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const haystack = `${log.actor?.name || log.actor_name} ${log.action} ${log.path}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [logs, role, method, search]);

  const pager = usePagination(filtered, { resetKey: `${role}:${method}:${search}` });

  return (
    <div className="space-y-6">
      <BackButton href="/admin" label="Back to dashboard" />
      <div>
        <h2 className="text-xl font-bold tracking-tight text-ink-900">Platform Action Ledger</h2>
        <p className="text-xs text-ink-500">
          Every create, update, and delete performed across the platform &mdash; by admins and staff in the admin panel,
          and by customers and providers on the public app &mdash; with who did it, when, and how many devices they're
          currently logged in on. Read-only &mdash; nothing here can be edited or removed.
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="w-full sm:max-w-xs">
          <TextInput
            leftIcon={<Search size={15} aria-hidden="true" />}
            placeholder="Search by name, action, or path"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="!py-2 text-xs"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <SelectInput value={role} onChange={(e) => setRole(e.target.value)} className="!w-auto !py-2 text-xs">
            {ROLE_TABS.map((t) => (
              <option key={t.key} value={t.key}>
                {t.label}
                {typeof roleTabCounts[t.key] === 'number' ? ` (${roleTabCounts[t.key]})` : ''}
              </option>
            ))}
          </SelectInput>

          <SelectInput value={method} onChange={(e) => setMethod(e.target.value)} className="!w-auto !py-2 text-xs">
            {METHOD_TABS.map((t) => (
              <option key={t.key} value={t.key}>
                {t.label}
              </option>
            ))}
          </SelectInput>
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
                ? 'Actions performed on the platform will show up here as they happen.'
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
