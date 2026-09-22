'use client';

import { memo } from 'react';
import Link from 'next/link';
import { BadgeCheck, Briefcase, Clock, MapPin, Star } from 'lucide-react';

import Card from './ui/Card';
import Badge from './ui/Badge';
import Button from './ui/Button';
import { resolveMediaUrl } from './chat/mediaUrl';
import { priceTypeShortLabel } from '../lib/priceType';

const AVATAR_FALLBACK = 'https://i.pravatar.cc/300?img=12';

const responseLabel = (mins) => {
  if (!mins) return null;

  if (mins < 60) {
    return `~${mins}m response`;
  }

  return `~${Math.round(mins / 60)}h response`;
};

function ServiceCard({ service }) {
  const provider = service.provider || {};
  const profile = provider.providerProfile || {};

  const providerName = provider.name || 'Verified Provider';
  const avatarUrl = resolveMediaUrl(provider.avatar_url) || AVATAR_FALLBACK;

  const rating = Number(profile.avg_rating) || Number(service.avg_rating) || 0;
  const reviews = profile.total_reviews ?? service.review_count ?? 0;

  const hasPrice = service.price !== null && service.price !== undefined && service.price !== '';
  const startingPrice = hasPrice ? `₹${service.price}` : 'On quote';
  const priceType = hasPrice ? priceTypeShortLabel(service.price_type) : null;

  const responseTime = responseLabel(profile.response_time_minutes);
  const skills = service.tags?.length ? service.tags : profile.skills || [];

  return (
    <Card
      className="group relative flex h-full flex-col justify-between gap-4 overflow-hidden p-5 transition-all duration-200 hover:shadow-card-hover"
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* Provider identity */}
      <div className="flex items-start gap-3.5">
        <div className="relative shrink-0">
          <img
            src={avatarUrl}
            alt={`${providerName} profile`}
            className="h-14 w-14 rounded-2xl object-cover ring-2 ring-ink-100 shadow-xs transition-transform duration-200 group-hover:scale-[1.02]"
            width={56}
            height={56}
            loading="lazy"
            decoding="async"
          />

          <span
            className={`absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full ring-2 ring-white ${
              profile.is_online ? 'bg-trust-500' : 'bg-ink-300'
            }`}
            title={profile.is_online ? 'Online now' : 'Offline'}
            aria-label={profile.is_online ? 'Online now' : 'Offline'}
          />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h3 className="truncate font-display text-base font-bold text-ink-900 transition-colors group-hover:text-brand-600">
              {providerName}
            </h3>

            {profile.verification_status === 'verified' && (
              <BadgeCheck
                size={17}
                className="shrink-0 fill-brand-50 text-brand-600"
                aria-label="Verified provider"
              />
            )}
          </div>

          <p className="truncate text-xs font-medium text-ink-500">
            {service.title || 'Service'}
          </p>

          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-500">
            {/* Rating */}
            <span className="flex items-center gap-1 font-semibold text-ink-800">
              <Star size={13} className="fill-gold-500 text-gold-500" aria-hidden="true" />

              {rating > 0 ? rating.toFixed(1) : 'New'}

              <span className="font-normal text-ink-400">({reviews})</span>
            </span>

            {/* City */}
            {profile.city && (
              <span className="flex max-w-[150px] items-center gap-1 truncate text-ink-500">
                <MapPin size={12} className="shrink-0 text-ink-400" aria-hidden="true" />
                <span className="truncate">{profile.city}</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Details */}
      <div className="flex-1">
        {service.description && (
          <p className="mb-2.5 line-clamp-2 text-xs leading-relaxed text-ink-600">
            {service.description}
          </p>
        )}

        {skills.length > 0 && (
          <div className="mb-2.5 flex flex-wrap gap-1.5">
            {skills.slice(0, 3).map((skill) => (
              <Badge key={skill} tone="brand" size="sm">
                {skill}
              </Badge>
            ))}

            {skills.length > 3 && (
              <Badge tone="neutral" size="sm">
                +{skills.length - 3}
              </Badge>
            )}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-ink-500">
          <span className="flex items-center gap-1">
            <Briefcase size={12} className="text-ink-400" aria-hidden="true" />
            {profile.total_jobs_completed || 0} jobs done
          </span>

          {responseTime && (
            <span className="flex items-center gap-1">
              <Clock size={12} className="text-ink-400" aria-hidden="true" />
              {responseTime}
            </span>
          )}

          {profile.experience_years > 0 && <span>{profile.experience_years}+ yrs exp</span>}
        </div>
      </div>

      {/* Price + profile action */}
      <div className="mt-1 flex items-center justify-between gap-3 border-t border-ink-100 pt-3.5">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-400">
            Starting from
          </p>

          <div className="flex items-baseline gap-1">
            <span className="font-display text-lg font-bold text-ink-900">{startingPrice}</span>

            {priceType && (
              <>
                <span className="text-3xl font-medium text-ink-400">/</span>
                <span className="font-display text-lg font-bold text-ink-900">{priceType}</span>
              </>
            )}
          </div>
        </div>

        <Link href={`/providers/${provider.id}`} aria-label={`View ${providerName}'s profile`}>
          <Button variant="primary" size="sm">
            View profile
          </Button>
        </Link>
      </div>
    </Card>
  );
}

export default memo(ServiceCard);