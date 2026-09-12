'use client';

import { memo } from 'react';
import Link from 'next/link';
import { Star } from 'lucide-react';
import Card from './ui/Card';
import Badge from './ui/Badge';
import { getServiceIcon } from '../lib/serviceIcon';

function ServiceCard({ service }) {
  const rating = service.provider?.providerProfile?.avg_rating || service.avg_rating || 0;
  const reviews = service.provider?.providerProfile?.total_reviews || service.review_count || 0;
  const image = service.images?.[0];
  const Icon = getServiceIcon(service.title);

  return (
    <Link href={`/providers/${service.provider?.id}`} className="block group h-full">
      <Card
        className="flex h-full flex-col overflow-hidden rounded-3xl border border-ink-200/80 bg-white p-0 shadow-soft transition-all duration-300 hover:shadow-card-hover hover:border-brand-300"
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-30px' }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        hover={false}
      >
        {image ? (
          <div className="relative h-44 w-full overflow-hidden bg-ink-100">
            <img
              src={image}
              alt={service.title}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
            <div className="absolute top-3 right-3 rounded-full bg-white/95 px-3 py-1 text-xs font-bold text-ink-900 shadow-soft backdrop-blur-md border border-white/40">
              ₹{service.price}
              {service.price_type === 'hourly' ? '/hr' : ''}
            </div>
          </div>
        ) : (
          <div className="relative flex h-44 w-full items-center justify-center bg-gradient-to-br from-brand-50 via-white to-accent-50/50">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-100/70 text-brand-600 shadow-xs ring-1 ring-inset ring-brand-200/60 transition-transform duration-300 group-hover:scale-105">
              <Icon size={26} aria-hidden="true" />
            </div>
            <div className="absolute top-3 right-3 rounded-full bg-white/95 px-3 py-1 text-xs font-bold text-ink-900 shadow-soft backdrop-blur-md border border-white/40">
              ₹{service.price}
              {service.price_type === 'hourly' ? '/hr' : ''}
            </div>
          </div>
        )}

        <div className="flex flex-1 flex-col justify-between gap-3 p-5">
          <div>
            <h3 className="line-clamp-1 font-display text-base font-bold text-ink-900 group-hover:text-brand-600 transition-colors">
              {service.title}
            </h3>
            {service.description && (
              <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-ink-500">
                {service.description}
              </p>
            )}

            {service.tags?.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {service.tags.slice(0, 2).map((t) => (
                  <Badge key={t} tone="neutral" size="sm">
                    {t}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div className="mt-3 flex items-center justify-between border-t border-ink-100/80 pt-3 text-xs text-ink-600">
            <span className="truncate font-semibold text-ink-800">
              {service.provider?.name || 'Verified Provider'}
            </span>
            <span className="flex shrink-0 items-center gap-1 font-semibold text-ink-900">
              <Star size={13} className="fill-gold-500 text-gold-500" aria-hidden="true" />
              {rating > 0 ? Number(rating).toFixed(1) : 'New'}
              <span className="font-normal text-ink-400">({reviews})</span>
            </span>
          </div>
        </div>
      </Card>
    </Link>
  );
}

export default memo(ServiceCard);
