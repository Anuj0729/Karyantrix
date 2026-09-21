'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronRight, FolderOpen } from 'lucide-react';
import api from '../../../lib/api';
import BackButton from '../../../components/BackButton';
import { RowSkeleton } from '../../../components/ui/Skeleton';
import useRefetchOnFocus from '../../../lib/useRefetchOnFocus';
import usePagination from '../../../lib/usePagination';
import Pagination from '../../../components/admin/Pagination';

const PAGE_SIZE = 12;

const isComplete = (p) => p.uploaded_count === p.total_count;

const FILTERS = [
  { key: 'all', label: 'All providers' },
  { key: 'complete', label: 'All documents uploaded' },
  { key: 'incomplete', label: 'Missing documents' },
];

// Only the provider's name is shown here; everything else lives on the provider's own page.
function ProviderNameRow({ provider }) {
  const name = provider.user.name || 'Unnamed provider';

  return (
    <Link
      href={`/admin/provider-documents/${provider.id}`}
      className="group flex items-center gap-3 rounded-2xl border border-ink-200/80 bg-white p-4 shadow-soft transition-all duration-200 hover:border-brand-300 hover:shadow-card-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-sm font-bold text-brand-700">
        {name.charAt(0).toUpperCase()}
      </div>
      <p className="min-w-0 flex-1 truncate text-sm font-bold text-ink-900">{name}</p>
      <ChevronRight
        size={16}
        className="shrink-0 text-ink-300 transition-transform group-hover:translate-x-0.5 group-hover:text-brand-600"
        aria-hidden="true"
      />
    </Link>
  );
}

function AdminProviderDocumentsContent() {
  const [providers, setProviders] = useState([]);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  // Skeletons only on the very first load; focus refetches update the list quietly.
  const load = () => {
    api
      .get('/admin/provider-documents')
      .then(({ data }) => {
        setProviders(data.providers || []);
        setFailed(false);
      })
      .catch(() => setFailed(true))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);
  useRefetchOnFocus(load);

  const counts = {
    all: providers.length,
    complete: providers.filter(isComplete).length,
    incomplete: providers.filter((p) => !isComplete(p)).length,
  };

  const filtered = providers.filter((p) => {
    if (filter === 'complete' && !isComplete(p)) return false;
    if (filter === 'incomplete' && isComplete(p)) return false;
    if (!search.trim()) return true;
    const term = search.trim().toLowerCase();
    return (
      p.user.name?.toLowerCase().includes(term) ||
      p.user.email?.toLowerCase().includes(term) ||
      p.user.phone?.includes(term)
    );
  });

  const pager = usePagination(filtered, { pageSize: PAGE_SIZE, resetKey: `${filter}|${search}` });

  return (
    <div className="space-y-6">
      <BackButton href="/admin" label="Back to dashboard" />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-ink-900">Provider Documents</h2>
          <p className="text-xs text-ink-500">
            Select a provider to see their details and the KYC documents they uploaded
          </p>
        </div>

        <div className="w-full sm:w-72">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, phone..."
            aria-label="Search providers"
            className="w-full rounded-xl border border-ink-200/80 bg-white px-4 py-2 text-xs text-ink-900 placeholder-ink-400 outline-none transition focus:border-brand-500 focus:ring-1 focus:ring-brand-500 shadow-xs"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className={`rounded-xl px-4 py-2 text-xs font-semibold transition-all ${
              filter === f.key
                ? 'bg-brand-600 text-white shadow-xs'
                : 'border border-ink-200/80 bg-white text-ink-600 hover:border-brand-300 hover:bg-ink-50/50'
            }`}
          >
            {f.label} <span className="opacity-70">({counts[f.key]})</span>
          </button>
        ))}
      </div>

      {loading && (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <RowSkeleton key={i} />
          ))}
        </div>
      )}

      {!loading && pager.pageItems.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {pager.pageItems.map((p) => (
            <ProviderNameRow key={p.id} provider={p} />
          ))}
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-ink-200 bg-white py-16 text-center">
          <FolderOpen size={34} className="text-ink-300" aria-hidden="true" />
          <p className="text-sm font-semibold text-ink-700">
            {failed ? 'Could not load provider documents' : 'No providers found'}
          </p>
          <p className="text-xs text-ink-400">
            {failed ? 'Please refresh and try again.' : 'Try a different filter or search term.'}
          </p>
        </div>
      )}

      {!loading && <Pagination pager={pager} label="providers" />}
    </div>
  );
}

export default function AdminProviderDocumentsPage() {
  return <AdminProviderDocumentsContent />;
}