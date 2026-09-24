'use client';

import {
  BadgeCheck,
  Briefcase,
  Clock,
  Gauge,
  MapPin,
  Maximize2,
  MessageCircle,
  PackageX,
  ShieldAlert,
  ShieldCheck,
  Star,
  X,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Fragment, useEffect, useState } from 'react';
import api from '../../../../lib/api';
import BackButton from '../../../../components/BackButton';
import Button from '../../../../components/ui/Button';
import Card from '../../../../components/ui/Card';
import { DetailSkeleton } from '../../../../components/ui/Skeleton';
import Portal from '../../../../components/ui/Portal';
import StatusBadge from '../../../../components/StatusBadge';
import { resolveMediaUrl } from '../../../../components/chat/mediaUrl';

const AVATAR_FALLBACK = 'https://i.pravatar.cc/300?img=8';

const EXPERIENCE_LABELS = {
  any: 'Any experience',
  beginner: 'Beginner OK',
  intermediate: 'Intermediate+',
  expert: 'Expert only',
};

const timeAgo = (dateStr) => {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
};

const formatInr = (amount) => `₹${Number(amount).toLocaleString('en-IN')}`;

const formatMemberSince = (dateStr) => {
  if (!dateStr) return null;
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const firstNumber = (...vals) => vals.find((v) => typeof v === 'number' && !Number.isNaN(v));

function Chip({ children }) {
  return (
    <span className="inline-flex items-center rounded-full border border-ink-300 bg-white px-3.5 py-1.5 text-sm text-ink-700">
      {children}
    </span>
  );
}

function SectionHeading({ children }) {
  return <h3 className="text-base font-semibold text-ink-900">{children}</h3>;
}

function MediaLightbox({ media, index, onNavigate, onClose }) {
  const item = index !== null ? media[index] : null;

  return (
    <Portal>
      <AnimatePresence>
        {item && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-[60] bg-black"
            onClick={onClose}
          >
            <motion.div
              key={index}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.18 }}
              className="flex h-full w-full items-center justify-center"
              onClick={(e) => e.stopPropagation()}
            >
              {item.type === 'video' ? (
                <video src={resolveMediaUrl(item.url)} className="h-full w-full object-contain" controls autoPlay playsInline />
              ) : (
                <img src={resolveMediaUrl(item.url)} alt="Requirement attachment" className="h-full w-full object-contain" />
              )}
            </motion.div>

            <div
              className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between bg-gradient-to-b from-black/60 to-transparent px-4 py-4 sm:px-6"
              onClick={(e) => e.stopPropagation()}
            >
              {media.length > 1 ? (
                <span className="pointer-events-auto rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm">
                  {index + 1} / {media.length}
                </span>
              ) : (
                <span />
              )}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onClose();
                }}
                className="pointer-events-auto grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white backdrop-blur-sm transition-colors hover:bg-white/20"
                aria-label="Close"
              >
                <X size={20} aria-hidden="true" />
              </button>
            </div>

            {media.length > 1 && (
              <>
                {index > 0 && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onNavigate(index - 1);
                    }}
                    className="absolute left-2 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white backdrop-blur-sm transition-colors hover:bg-white/20 sm:left-6"
                    aria-label="Previous"
                  >
                    <ChevronLeft size={22} aria-hidden="true" />
                  </button>
                )}
                {index < media.length - 1 && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onNavigate(index + 1);
                    }}
                    className="absolute right-2 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white backdrop-blur-sm transition-colors hover:bg-white/20 sm:right-6"
                    aria-label="Next"
                  >
                    <ChevronRight size={22} aria-hidden="true" />
                  </button>
                )}
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </Portal>
  );
}

function ProjectDetailsCard({ requirement }) {
  const [lightboxIndex, setLightboxIndex] = useState(null);
  const media = requirement.media || [];
  const services = requirement.services || [];
  const experienceLevels = requirement.experience_levels || ['any'];

  return (
    <Card hover={false} className="p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <h2 className="font-display text-lg font-semibold text-ink-900">Project Details</h2>
        <div className="shrink-0 text-right">
          {typeof requirement.budget === 'number' && (
            <p className="font-display text-lg font-bold text-ink-900">
              <span className="sr-only">Budget </span>
              {formatInr(requirement.budget)}
            </p>
          )}
          <p className="mt-1 flex items-center justify-end gap-1 text-[10px] font-bold uppercase tracking-wider text-ink-500">
            <Clock size={11} aria-hidden="true" />
            Posted {timeAgo(requirement.createdAt)}
          </p>
        </div>
      </div>

      <p className="mt-5 whitespace-pre-line text-[15px] leading-relaxed text-ink-700">{requirement.description}</p>

      {media.length > 0 && (
        <div className="mt-6">
          <SectionHeading>Photos &amp; videos</SectionHeading>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {media.map((m, i) => (
              <div
                key={m.url}
                role="button"
                tabIndex={0}
                onClick={() => setLightboxIndex(i)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setLightboxIndex(i);
                  }
                }}
                className="group/media relative cursor-pointer overflow-hidden rounded-2xl bg-ink-100 ring-1 ring-ink-200/50 shadow-soft"
              >
                {m.type === 'video' ? (
                  <div className="relative h-32 w-full bg-black/90 flex items-center justify-center">
                    <video src={resolveMediaUrl(m.url)} className="h-32 w-full object-cover opacity-80" muted playsInline />
                    <span className="absolute px-2 py-0.5 rounded-full bg-black/60 text-[10px] font-semibold text-white backdrop-blur-sm">
                      Video
                    </span>
                  </div>
                ) : (
                  <img
                    src={resolveMediaUrl(m.url)}
                    alt={`${services[0] || 'Requirement'} media ${i + 1}`}
                    className="h-32 w-full object-cover transition-transform duration-300 group-hover/media:scale-105"
                  />
                )}
                <span className="absolute right-1.5 top-1.5 grid h-6 w-6 place-items-center rounded-full bg-black/50 text-white opacity-0 transition-opacity group-hover/media:opacity-100">
                  <Maximize2 size={12} aria-hidden="true" />
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {services.length > 0 && (
        <div className="mt-6">
          <SectionHeading>Services Required</SectionHeading>
          <div className="mt-3 flex flex-wrap gap-2">
            {services.map((s) => (
              <Chip key={s}>{s}</Chip>
            ))}
          </div>
        </div>
      )}

      <div className="mt-6">
        <SectionHeading>Experience Needed</SectionHeading>
        <div className="mt-3 flex flex-wrap gap-2">
          {experienceLevels.map((lvl) => (
            <Chip key={lvl}>{EXPERIENCE_LABELS[lvl] || 'Any experience'}</Chip>
          ))}
        </div>
      </div>

      {media.length > 0 && (
        <MediaLightbox media={media} index={lightboxIndex} onNavigate={setLightboxIndex} onClose={() => setLightboxIndex(null)} />
      )}
    </Card>
  );
}

function ClientPanel({ requirement }) {
  const customer = requirement.customer || {};
  const memberSince = formatMemberSince(customer.createdAt);
  const postedOn = formatMemberSince(requirement.createdAt);

  const rating = firstNumber(customer.customer_rating_avg);
  const reviewsCount = firstNumber(customer.customer_rating_count) ?? 0;
  const jobsDone = firstNumber(customer.jobs_done) ?? 0;
  const hasRating = typeof rating === 'number' && rating > 0 && reviewsCount > 0;

  return (
    <Card hover={false} className="p-5 sm:p-6">
      <h2 className="font-display text-base font-semibold text-ink-900">About the Client</h2>

      <div className="mt-4 flex items-center gap-3">
        <img
          src={customer.avatar_url ? resolveMediaUrl(customer.avatar_url) : AVATAR_FALLBACK}
          alt={customer.name || 'Customer'}
          className="h-12 w-12 shrink-0 rounded-2xl object-cover ring-2 ring-ink-100 shadow-soft"
        />
        <div className="min-w-0">
          <p className="flex min-w-0 items-center gap-1.5 truncate text-sm font-bold text-ink-900">
            <span className="truncate">{customer.name || 'Customer'}</span>
            {customer.is_verified && <BadgeCheck size={15} className="shrink-0 text-trust-500" aria-hidden="true" />}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-600">
            <span className="flex items-center gap-1 font-semibold text-ink-900">
              <Star size={13} className="fill-amber-400 text-amber-400" aria-hidden="true" />
              {hasRating ? rating.toFixed(1) : 'New'}
              <span className="font-normal text-ink-400">({reviewsCount})</span>
            </span>
            <span className="flex items-center gap-1">
              <Briefcase size={13} className="text-ink-400" aria-hidden="true" />
              {jobsDone} {jobsDone === 1 ? 'job' : 'jobs'} done
            </span>
          </div>
        </div>
      </div>

      <ul className="mt-4 space-y-3.5 text-sm text-ink-700">
        {customer.phone && (
          <li className="flex items-center gap-2.5">
            <MessageCircle size={16} className="shrink-0 text-ink-500" aria-hidden="true" />
            <span>{customer.phone}</span>
          </li>
        )}
        {requirement.location?.text && (
          <li className="flex items-start gap-2.5">
            <MapPin size={16} className="mt-0.5 shrink-0 text-ink-500" aria-hidden="true" />
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-ink-400">Job location</p>
              <p className="mt-0.5">{requirement.location.text}</p>
            </div>
          </li>
        )}
        {memberSince && (
          <li className="flex items-center gap-2.5">
            <Clock size={16} className="shrink-0 text-ink-500" aria-hidden="true" />
            <span>Member since {memberSince}</span>
          </li>
        )}
        {postedOn && (
          <li className="flex items-start gap-2.5">
            <Clock size={16} className="mt-0.5 shrink-0 text-ink-500" aria-hidden="true" />
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-ink-400">Posted on</p>
              <p className="mt-0.5">
                {postedOn} <span className="text-ink-400">({timeAgo(requirement.createdAt)})</span>
              </p>
              {typeof requirement.distance_km === 'number' && (
                <p className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-brand-600">
                  <Gauge size={13} aria-hidden="true" />
                  {requirement.distance_km < 1 ? '<1 km away' : `${requirement.distance_km} km away`}
                </p>
              )}
            </div>
          </li>
        )}
      </ul>

      <h3 className="mt-6 text-base font-semibold text-ink-900">Client Verification</h3>
      <ul className="mt-3 space-y-3 text-sm text-ink-700">
        {customer.is_verified ? (
          <li className="flex items-center gap-2.5">
            <ShieldCheck size={16} className="shrink-0 text-trust-600" aria-hidden="true" />
            <span>Verified account</span>
          </li>
        ) : (
          <li className="flex items-center gap-2.5 text-ink-500">
            <ShieldAlert size={16} className="shrink-0 text-ink-400" aria-hidden="true" />
            <span>Not verified yet</span>
          </li>
        )}
      </ul>

      {requirement.hired_provider && (
        <>
          <h3 className="mt-6 text-base font-semibold text-ink-900">Hired Provider</h3>
          <div className="mt-3 flex items-center gap-3 rounded-2xl border border-trust-200/70 bg-trust-50/60 p-3">
            <img
              src={requirement.hired_provider.avatar_url ? resolveMediaUrl(requirement.hired_provider.avatar_url) : AVATAR_FALLBACK}
              alt={requirement.hired_provider.name}
              className="h-10 w-10 rounded-xl object-cover ring-1 ring-trust-200"
            />
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-ink-900">{requirement.hired_provider.name}</p>
              {requirement.hired_provider.phone && (
                <p className="truncate text-xs text-ink-500">{requirement.hired_provider.phone}</p>
              )}
            </div>
          </div>
        </>
      )}
    </Card>
  );
}

function BidRow({ bid }) {
  const provider = bid.provider || {};
  const rating = firstNumber(provider.avg_rating, provider.rating);
  const reviews = firstNumber(provider.reviews_count, provider.review_count, provider.total_reviews) ?? 0;
  const hasRating = typeof rating === 'number' && rating > 0 && reviews > 0;
  const message = (bid.message || '').trim();

  return (
    <div className="rounded-3xl border border-brand-200/70 bg-white p-5 shadow-soft sm:p-6">
      <div className="flex items-start gap-4">
        <img
          src={provider.avatar_url ? resolveMediaUrl(provider.avatar_url) : AVATAR_FALLBACK}
          alt=""
          className="h-14 w-14 shrink-0 rounded-2xl object-cover ring-1 ring-ink-100"
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <h3 className="truncate font-display text-base font-semibold text-brand-600">{provider.name || 'Provider'}</h3>
            {provider.is_verified && <BadgeCheck size={15} className="shrink-0 text-brand-500" aria-label="Verified" />}
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
            <span className="flex items-center gap-1 font-semibold text-ink-900">
              <Star size={13} className="fill-amber-400 text-amber-400" aria-hidden="true" />
              {hasRating ? rating.toFixed(1) : 'New'}
              <span className="font-normal text-ink-400">({reviews})</span>
            </span>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <p className="font-display text-lg font-bold text-ink-900">{formatInr(bid.amount)}</p>
          {bid.delivery_days > 0 && (
            <p className="mt-0.5 text-xs text-ink-500">
              in {bid.delivery_days} {bid.delivery_days === 1 ? 'day' : 'days'}
            </p>
          )}
          <p className="mt-1 text-[11px] text-ink-400">{timeAgo(bid.createdAt)}</p>
        </div>
      </div>

      {message && <p className="mt-4 whitespace-pre-line text-sm font-medium leading-relaxed text-ink-700">{message}</p>}

      <div className="mt-4 flex items-center justify-between gap-3 border-t border-ink-100 pt-3">
        <StatusBadge status={bid.status} kind="bid" className="text-[10px]" />
      </div>
    </div>
  );
}

function InterestedRow({ entry }) {
  const provider = entry.provider || {};
  const rating = firstNumber(provider.avg_rating, provider.rating);
  const reviews = firstNumber(provider.reviews_count, provider.review_count, provider.total_reviews) ?? 0;
  const hasRating = typeof rating === 'number' && rating > 0 && reviews > 0;

  return (
    <div className="rounded-3xl border border-brand-200/70 bg-white p-5 shadow-soft sm:p-6">
      <div className="flex items-start gap-4">
        <img
          src={provider.avatar_url ? resolveMediaUrl(provider.avatar_url) : AVATAR_FALLBACK}
          alt=""
          className="h-14 w-14 shrink-0 rounded-2xl object-cover ring-1 ring-ink-100"
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <h3 className="truncate font-display text-base font-semibold text-brand-600">{provider.name || 'Provider'}</h3>
            {provider.is_verified && <BadgeCheck size={15} className="shrink-0 text-brand-500" aria-label="Verified" />}
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
            <span className="flex items-center gap-1 font-semibold text-ink-900">
              <Star size={13} className="fill-amber-400 text-amber-400" aria-hidden="true" />
              {hasRating ? rating.toFixed(1) : 'New'}
              <span className="font-normal text-ink-400">({reviews})</span>
            </span>
          </div>
        </div>
        <p className="shrink-0 text-[11px] text-ink-400">{timeAgo(entry.created_at)}</p>
      </div>
      {entry.message && (
        <p className="mt-4 whitespace-pre-line text-sm font-medium leading-relaxed text-ink-700">{entry.message}</p>
      )}
    </div>
  );
}

function RequirementDetailView({ requirement, bids }) {
  const [tab, setTab] = useState('details');

  const isFixedPrice = requirement.post_type === 'fixed';
  const interested = requirement.interested_providers || [];
  const title = (requirement.services || []).join(', ') || 'Requirement';

  const tabs = [
    { id: 'details', label: 'Details' },
    { id: 'proposals', label: isFixedPrice ? `Interested (${interested.length})` : `Proposals (${bids.length})` },
  ];

  let stats;
  if (!isFixedPrice) {
    const average = bids.length > 0 ? Math.round(bids.reduce((sum, b) => sum + (Number(b.amount) || 0), 0) / bids.length) : null;
    stats = [
      { label: 'Bids', value: bids.length },
      { label: 'Average bid', value: average === null ? '—' : formatInr(average) },
    ];
  } else {
    stats = [
      { label: 'Type', value: 'Fixed price' },
      { label: 'Interested', value: interested.length },
    ];
  }

  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2">
          <h1 className="font-display text-xl font-semibold tracking-tight text-ink-900 sm:text-2xl">{title}</h1>
          <StatusBadge status={requirement.status} kind="requirement" />
        </div>

        <div className="flex shrink-0 items-end gap-3">
          {stats.map((stat, i) => (
            <Fragment key={stat.label}>
              {i > 0 && (
                <span aria-hidden="true" className="pb-1 text-ink-300">
                  •
                </span>
              )}
              <div className="sm:text-right">
                <p className="text-xs font-medium text-ink-500 sm:text-sm">{stat.label}</p>
                <p className="mt-0.5 font-display text-lg font-semibold text-ink-900 sm:text-xl">{stat.value}</p>
              </div>
            </Fragment>
          ))}
        </div>
      </div>

      <div className="mt-4 flex items-end justify-between gap-3 border-b border-ink-200">
        <div role="tablist" aria-label="Requirement sections" className="-mb-px flex gap-6">
          {tabs.map((t) => {
            const active = t.id === tab;
            return (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setTab(t.id)}
                className={`border-b-2 px-1 pb-3 pt-2 text-sm font-medium transition-colors ${
                  active ? 'border-brand-600 text-brand-600' : 'border-transparent text-ink-700 hover:text-brand-600'
                }`}
              >
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
        <div className="space-y-5">
          {tab === 'details' ? (
            <ProjectDetailsCard requirement={requirement} />
          ) : (
            <Card hover={false} className="p-5 sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-display text-lg font-semibold text-ink-900">
                  {isFixedPrice ? `Interested providers (${interested.length})` : `Proposals (${bids.length})`}
                </h2>
              </div>

              {isFixedPrice ? (
                interested.length === 0 ? (
                  <p className="mt-4 rounded-2xl border border-dashed border-ink-200 bg-ink-50/50 p-4 text-center text-xs text-ink-500">
                    No one has shown interest yet.
                  </p>
                ) : (
                  <div className="mt-4 space-y-3">
                    {interested.map((entry, idx) => (
                      <InterestedRow key={entry.provider?.id || idx} entry={entry} />
                    ))}
                  </div>
                )
              ) : bids.length === 0 ? (
                <p className="mt-4 rounded-2xl border border-dashed border-ink-200 bg-ink-50/50 p-4 text-center text-xs text-ink-500">
                  No bids yet.
                </p>
              ) : (
                <div className="mt-4 space-y-3">
                  {bids.map((bid) => (
                    <BidRow key={bid.id} bid={bid} />
                  ))}
                </div>
              )}
            </Card>
          )}
        </div>

        <ClientPanel requirement={requirement} />
      </div>
    </>
  );
}

export default function AdminRequirementDetailPage() {
  const { id } = useParams();
  const [requirement, setRequirement] = useState(null);
  const [bids, setBids] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    setLoading(true);
    setNotFound(false);
    api
      .get(`/admin/requirements/${id}`)
      .then(({ data }) => {
        setRequirement(data.requirement);
        setBids(data.bids || []);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl">
        <DetailSkeleton />
      </div>
    );
  }

  if (notFound || !requirement) {
    return (
      <div className="flex flex-col items-center gap-3 py-20 text-center">
        <PackageX size={40} className="text-ink-300" aria-hidden="true" />
        <h2 className="font-display text-lg font-bold text-ink-800">Requirement not found</h2>
        <p className="text-xs text-ink-500">This post doesn&apos;t exist or was removed.</p>
        <Link href="/admin/requirements">
          <Button variant="secondary" size="sm" className="mt-2">
            Back to requirements
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl animate-fade-in-up">
      <BackButton href="/admin/requirements" label="Back to requirements" />
      <RequirementDetailView requirement={requirement} bids={bids} />
    </div>
  );
}
