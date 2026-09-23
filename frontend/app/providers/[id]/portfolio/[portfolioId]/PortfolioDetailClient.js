'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  BadgeCheck,
  Briefcase,
  Calendar,
  ImageOff,
  MapPin,
  MessageCircle,
  Star,
} from 'lucide-react';
import api from '../../../../../lib/api';
import BackButton from '../../../../../components/BackButton';
import Badge from '../../../../../components/ui/Badge';
import Button from '../../../../../components/ui/Button';
import Card from '../../../../../components/ui/Card';
import { DetailSkeleton } from '../../../../../components/ui/Skeleton';
import { resolveMediaUrl } from '../../../../../components/chat/mediaUrl';

const formatMemberSince = (dateStr) => {
  if (!dateStr) return null;
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

export default function PortfolioDetailClient({ providerId, portfolioId, initialProvider = null, initialItem = null }) {
  const [provider, setProvider] = useState(initialProvider);
  const [item, setItem] = useState(initialItem);
  const [loading, setLoading] = useState(!initialProvider);

  useEffect(() => {
    if (initialProvider && initialItem) {
      setLoading(false);
      return;
    }
    api
      .get(`/providers/${providerId}`)
      .then(({ data }) => {
        const prov = data.provider || null;
        setProvider(prov);
        const portfolio = prov?.providerProfile?.portfolio || [];
        setItem(portfolio.find((p) => String(p.id || p._id) === String(portfolioId)) || null);
      })
      .catch(() => {
        setProvider(null);
        setItem(null);
      })
      .finally(() => setLoading(false));
  }, [providerId, portfolioId, initialProvider, initialItem]);

  if (loading) return <DetailSkeleton />;

  if (!provider || !item) {
    return (
      <div className="flex flex-col items-center gap-3 py-20 text-center">
        <ImageOff size={38} className="text-ink-300" aria-hidden="true" />
        <h2 className="font-display text-lg font-bold text-ink-800">Portfolio work not found</h2>
        <p className="text-xs text-ink-500">
          This project may have been removed or the provider updated their portfolio.
        </p>
        <Link href={providerId ? `/providers/${providerId}` : '/providers'}>
          <Button variant="secondary" size="sm" className="mt-2">
            Back to Profile
          </Button>
        </Link>
      </div>
    );
  }

  const p = provider.providerProfile || {};
  const memberSince = formatMemberSince(provider.createdAt);

  return (
    <div className="space-y-6 animate-fade-in-up">
      <BackButton href={`/providers/${providerId}`} label="Back to profile" />

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="font-display text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl">
              {item.title || 'Portfolio work'}
            </h1>
            <Badge tone="success" size="sm">
              Completed
            </Badge>
          </div>
          <p className="mt-1 text-xs text-ink-400">Portfolio project by {provider.name}</p>
        </div>
        <div className="text-right">
          <span className="block text-[10px] font-bold uppercase tracking-wider text-ink-400">Type</span>
          <p className="font-display text-base font-bold text-ink-900">Portfolio</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <Card className="p-0 overflow-hidden md:col-span-2" hover={false}>
          {item.image_url ? (
            <img
              src={resolveMediaUrl(item.image_url)}
              alt={item.title || 'Portfolio work'}
              className="h-64 w-full object-cover sm:h-96"
              loading="lazy"
              decoding="async"
            />
          ) : (
            <div className="flex h-64 w-full items-center justify-center bg-ink-50 text-ink-300 sm:h-96">
              <ImageOff size={32} aria-hidden="true" />
            </div>
          )}

          <div className="p-6">
            <h2 className="font-display text-sm font-bold text-ink-900">Project Details</h2>
            <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-ink-700">
              {item.description || 'No description was provided for this project.'}
            </p>
          </div>
        </Card>

        <Card className="p-5 h-fit" hover={false}>
          <h3 className="font-display text-sm font-bold text-ink-900">About the Professional</h3>

          <div className="mt-4 flex items-center gap-3">
            <img
              src={resolveMediaUrl(provider.avatar_url) || 'https://i.pravatar.cc/300?img=12'}
              alt={provider.name}
              className="h-12 w-12 rounded-2xl object-cover ring-2 ring-ink-100"
            />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="truncate text-sm font-bold text-ink-900">{provider.name}</p>
                {p.verification_status === 'verified' && (
                  <BadgeCheck size={15} className="shrink-0 text-trust-500" aria-hidden="true" />
                )}
              </div>
              <p className="flex items-center gap-1 text-xs text-ink-500">
                <Star size={12} className="fill-gold-500 text-gold-500" aria-hidden="true" />
                {p.avg_rating > 0 ? p.avg_rating.toFixed(1) : 'New'}
                <span className="text-ink-400">({p.total_reviews || 0})</span>
                <Briefcase size={12} className="ml-2 text-ink-400" aria-hidden="true" />
                {p.total_jobs_completed || 0} jobs done
              </p>
            </div>
          </div>

          <div className="mt-4 space-y-2.5 border-t border-ink-100 pt-4">
            {p.city && (
              <div className="flex items-center gap-2 text-xs text-ink-600">
                <MapPin size={13} className="shrink-0 text-ink-400" aria-hidden="true" />
                {p.city}
              </div>
            )}
            {memberSince && (
              <div className="flex items-center gap-2 text-xs text-ink-600">
                <Calendar size={13} className="shrink-0 text-ink-400" aria-hidden="true" />
                Member since {memberSince}
              </div>
            )}
          </div>

          <Link href={`/providers/${providerId}`} className="mt-5 block">
            <Button variant="primary" size="sm" fullWidth icon={<MessageCircle size={15} aria-hidden="true" />}>
              View Full Profile
            </Button>
          </Link>
        </Card>
      </div>
    </div>
  );
}
