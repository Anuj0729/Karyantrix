'use client';

import { useEffect, useState } from 'react';
import { ExternalLink, FileCheck2, FolderOpen, ImageOff, X } from 'lucide-react';
import api from '../../../lib/api';
import BackButton from '../../../components/BackButton';
import Card from '../../../components/ui/Card';
import StatusBadge from '../../../components/StatusBadge';
import { RowSkeleton } from '../../../components/ui/Skeleton';
import { resolveMediaUrl } from '../../../components/chat/mediaUrl';
import useRefetchOnFocus from '../../../lib/useRefetchOnFocus';
import usePagination from '../../../lib/usePagination';
import Pagination from '../../../components/admin/Pagination';

const isComplete = (p) => p.uploaded_count === p.total_count;

function DocumentLightbox({ doc, onClose }) {
  useEffect(() => {
    if (!doc) return undefined;
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [doc, onClose]);

  if (!doc) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-ink-950/85 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={doc.label}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="absolute right-5 top-5 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
      >
        <X size={18} aria-hidden="true" />
      </button>
      <div className="max-h-[88vh] max-w-4xl" onClick={(e) => e.stopPropagation()}>
        <img src={doc.src} alt={doc.label} className="max-h-[78vh] w-auto rounded-xl object-contain shadow-2xl" />
        <div className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-sm text-white/80">
          <span className="font-medium">
            {doc.label} &middot; {doc.owner}
          </span>
          <a
            href={doc.src}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs font-semibold text-white underline-offset-2 hover:underline"
          >
            Open original <ExternalLink size={12} aria-hidden="true" />
          </a>
        </div>
      </div>
    </div>
  );
}

function DocumentTile({ doc, onOpen }) {
  const [failed, setFailed] = useState(false);
  const src = resolveMediaUrl(doc.url);

  return (
    <div>
      <p className="mb-1.5 text-[11px] font-semibold text-ink-500">{doc.label}</p>

      {!src ? (
        <div className="flex aspect-[4/3] flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-ink-200 bg-ink-50/60 text-ink-400">
          <ImageOff size={18} aria-hidden="true" />
          <span className="text-[11px] font-medium">Not uploaded</span>
        </div>
      ) : failed ? (
        <a
          href={src}
          target="_blank"
          rel="noopener noreferrer"
          className="flex aspect-[4/3] flex-col items-center justify-center gap-1 rounded-xl border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"
        >
          <ExternalLink size={18} aria-hidden="true" />
          <span className="text-[11px] font-semibold">Preview unavailable &middot; open file</span>
        </a>
      ) : (
        <button
          type="button"
          onClick={() => onOpen({ src, label: doc.label })}
          aria-label={`View ${doc.label}`}
          className="group relative block aspect-[4/3] w-full overflow-hidden rounded-xl border border-ink-100 bg-ink-50 shadow-xs transition-all hover:border-brand-300 hover:shadow-card"
        >
          <img
            src={src}
            alt={doc.label}
            loading="lazy"
            onError={() => setFailed(true)}
            className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.03]"
          />
          <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink-950/70 to-transparent px-2 pb-1.5 pt-6 text-left text-[11px] font-semibold text-white opacity-0 transition-opacity group-hover:opacity-100">
            Click to view
          </span>
        </button>
      )}
    </div>
  );
}

function ProviderDocumentsCard({ provider, onOpenDoc }) {
  const { user } = provider;
  const complete = isComplete(provider);

  return (
    <Card className="p-5 border-ink-200/80 shadow-xs" hover={false}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-sm font-bold text-brand-700">
            {(user.name || '?').charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-ink-900">{user.name || 'Unnamed provider'}</p>
            <p className="truncate text-xs text-ink-500">
              {user.email}
              {user.phone ? ` \u00b7 ${user.phone}` : ''}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={provider.application_status} kind="application" />
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
              complete ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
            }`}
          >
            <FileCheck2 size={12} aria-hidden="true" />
            {provider.uploaded_count}/{provider.total_count} documents
          </span>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {provider.documents.map((doc) => (
          <DocumentTile
            key={doc.key}
            doc={doc}
            onOpen={(d) => onOpenDoc({ ...d, owner: user.name || user.email })}
          />
        ))}
      </div>
    </Card>
  );
}

function AdminProviderDocumentsContent() {
  const [providers, setProviders] = useState([]);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [lightbox, setLightbox] = useState(null);

  const load = () => {
    setLoading(true);
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
    const term = search.toLowerCase();
    return (
      p.user.name?.toLowerCase().includes(term) ||
      p.user.email?.toLowerCase().includes(term) ||
      p.user.phone?.includes(term)
    );
  });

  const pager = usePagination(filtered, { resetKey: `${filter}|${search}` });

  const FILTERS = [
    { key: 'all', label: 'All providers' },
    { key: 'complete', label: 'All documents uploaded' },
    { key: 'incomplete', label: 'Missing documents' },
  ];

  return (
    <div className="space-y-6">
      <BackButton href="/admin" label="Back to dashboard" />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-ink-900">Provider Documents</h2>
          <p className="text-xs text-ink-500">
            Every KYC document uploaded by providers and applicants &mdash; Aadhaar, bank passbook and live photo
          </p>
        </div>

        <div className="w-full sm:w-72">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, phone..."
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

      <div className="space-y-4">
        {loading && Array.from({ length: 3 }).map((_, i) => <RowSkeleton key={i} />)}
        {!loading && pager.pageItems.map((p) => (
          <ProviderDocumentsCard key={p.id} provider={p} onOpenDoc={setLightbox} />
        ))}
      </div>

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

      <DocumentLightbox doc={lightbox} onClose={() => setLightbox(null)} />
    </div>
  );
}

export default function AdminProviderDocumentsPage() {
  return <AdminProviderDocumentsContent />;
}
