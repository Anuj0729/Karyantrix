'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  Briefcase,
  ExternalLink,
  FileCheck2,
  FolderOpen,
  ImageOff,
  LayoutGrid,
  Mail,
  MapPin,
  Phone,
  X,
} from 'lucide-react';
import api from '../../../../lib/api';
import BackButton from '../../../../components/BackButton';
import Card from '../../../../components/ui/Card';
import Badge from '../../../../components/ui/Badge';
import StatusBadge from '../../../../components/StatusBadge';
import { Skeleton } from '../../../../components/ui/Skeleton';
import { resolveMediaUrl } from '../../../../components/chat/mediaUrl';
import useRefetchOnFocus from '../../../../lib/useRefetchOnFocus';

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

  useEffect(() => {
    setFailed(false);
  }, [src]);

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-ink-600">{doc.label}</p>
        <span
          className={`shrink-0 text-[11px] font-semibold ${src ? 'text-emerald-600' : 'text-amber-600'}`}
        >
          {src ? 'Uploaded' : 'Missing'}
        </span>
      </div>

      {!src ? (
        <div className="flex aspect-[4/3] flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-ink-200 bg-ink-50/60 text-ink-400">
          <ImageOff size={22} aria-hidden="true" />
          <span className="text-xs font-medium">Not uploaded</span>
        </div>
      ) : failed ? (
        <a
          href={src}
          target="_blank"
          rel="noopener noreferrer"
          className="flex aspect-[4/3] flex-col items-center justify-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"
        >
          <ExternalLink size={22} aria-hidden="true" />
          <span className="text-xs font-semibold">Preview unavailable &middot; open file</span>
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
          <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink-950/70 to-transparent px-3 pb-2 pt-8 text-left text-xs font-semibold text-white opacity-0 transition-opacity group-hover:opacity-100">
            Click to view
          </span>
        </button>
      )}
    </div>
  );
}

function DetailRow({ icon: Icon, label, children }) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-ink-50 text-ink-500">
        <Icon size={15} aria-hidden="true" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-400">{label}</p>
        <div className="mt-0.5 break-words text-sm font-medium text-ink-800">{children}</div>
      </div>
    </div>
  );
}

const NotProvided = ({ children = 'Not provided' }) => <span className="font-normal text-ink-400">{children}</span>;

function ProviderDetailsCard({ provider }) {
  const { user } = provider;
  const name = user.name || 'Unnamed provider';

  return (
    <Card className="space-y-6 p-5" hover={false}>
      <div className="flex items-center gap-3">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-lg font-bold text-brand-700">
          {name.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="truncate text-base font-bold text-ink-900">{name}</p>
          {provider.professional_title && (
            <p className="truncate text-xs text-ink-500">{provider.professional_title}</p>
          )}
          <div className="mt-1.5">
            <StatusBadge status={provider.application_status} kind="application" />
          </div>
        </div>
      </div>

      <div className="space-y-4 border-t border-ink-100 pt-5">
        <DetailRow icon={Phone} label="Phone">
          {user.phone ? (
            <a href={`tel:${user.phone}`} className="hover:text-brand-600">
              {user.phone}
            </a>
          ) : (
            <NotProvided />
          )}
        </DetailRow>

        <DetailRow icon={Mail} label="Email">
          {user.email ? (
            <a href={`mailto:${user.email}`} className="break-all hover:text-brand-600">
              {user.email}
            </a>
          ) : (
            <NotProvided />
          )}
        </DetailRow>

        <DetailRow icon={Briefcase} label="Service">
          {provider.services.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {provider.services.map((s) => (
                <Badge key={s.id} tone="neutral" size="sm">
                  {s.title}
                </Badge>
              ))}
            </div>
          ) : (
            <NotProvided>No services listed</NotProvided>
          )}
        </DetailRow>

        <DetailRow icon={LayoutGrid} label="Category">
          {provider.categories.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {provider.categories.map((c) => (
                <Badge key={c.id} tone="brand" size="sm">
                  {c.name}
                </Badge>
              ))}
            </div>
          ) : (
            <NotProvided>No category selected</NotProvided>
          )}
        </DetailRow>

        <DetailRow icon={MapPin} label="Location">
          {provider.location || <NotProvided />}
        </DetailRow>
      </div>
    </Card>
  );
}

function ProviderDocumentsPanel({ provider, onOpenDoc }) {
  const complete = provider.uploaded_count === provider.total_count;
  const owner = provider.user.name || provider.user.email;

  return (
    <Card className="p-5" hover={false}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-ink-900">Uploaded documents</h3>
          <p className="text-xs text-ink-500">Click a document to view it full size</p>
        </div>
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
            complete ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
          }`}
        >
          <FileCheck2 size={12} aria-hidden="true" />
          {provider.uploaded_count}/{provider.total_count} documents
        </span>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2">
        {provider.documents.map((doc) => (
          <DocumentTile key={doc.key} doc={doc} onOpen={(d) => onOpenDoc({ ...d, owner })} />
        ))}
      </div>
    </Card>
  );
}

function DetailPageSkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
      <Skeleton className="h-96 w-full rounded-2xl" />
      <Skeleton className="h-96 w-full rounded-2xl" />
    </div>
  );
}

function AdminProviderDocumentsDetailContent() {
  const { id } = useParams();
  const [provider, setProvider] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null); // null | 'not_found' | 'failed'
  const [lightbox, setLightbox] = useState(null);

  const load = useCallback(() => {
    api
      .get(`/admin/provider-documents/${id}`)
      .then(({ data }) => {
        setProvider(data.provider);
        setError(null);
      })
      .catch((err) => setError(err.response?.status === 404 ? 'not_found' : 'failed'))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  useRefetchOnFocus(load);

  const closeLightbox = useCallback(() => setLightbox(null), []);

  return (
    <div className="space-y-6">
      <BackButton href="/admin/provider-documents" label="Back to providers" />

      {loading && <DetailPageSkeleton />}

      {!loading && !provider && (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-ink-200 bg-white py-16 text-center">
          <FolderOpen size={34} className="text-ink-300" aria-hidden="true" />
          <p className="text-sm font-semibold text-ink-700">
            {error === 'not_found' ? 'Provider not found' : 'Could not load this provider'}
          </p>
          <p className="text-xs text-ink-400">
            {error === 'not_found'
              ? 'This provider may have been removed.'
              : 'Please refresh and try again.'}
          </p>
        </div>
      )}

      {provider && (
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
          <div className="lg:sticky lg:top-6">
            <ProviderDetailsCard provider={provider} />
          </div>
          <ProviderDocumentsPanel provider={provider} onOpenDoc={setLightbox} />
        </div>
      )}

      <DocumentLightbox doc={lightbox} onClose={closeLightbox} />
    </div>
  );
}

export default function AdminProviderDocumentsDetailPage() {
  return <AdminProviderDocumentsDetailContent />;
}