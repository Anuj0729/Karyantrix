'use client';

import { memo } from 'react';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import Card from './ui/Card';
import { getServiceIcon } from '../lib/serviceIcon';

function CatalogServiceCard({ service, categorySlug }) {
  const Icon = getServiceIcon(service.name, categorySlug);

  return (
    <Link
      href={`/categories/${categorySlug}/${service.id}`}
      className="group block h-full"
    >
      <Card
        className="relative flex h-full flex-col justify-between overflow-hidden rounded-3xl border border-ink-200/80 bg-white p-5 sm:p-6 shadow-soft transition-all duration-300 hover:border-brand-300 hover:shadow-card-hover"
        initial={{ opacity: 0, y: 14 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-30px' }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        hover={false}
      >
        <div>
          <div className="flex items-center justify-between">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-50 via-brand-100/70 to-accent-50/50 text-brand-600 ring-1 ring-inset ring-brand-200/60 transition-transform duration-300 group-hover:scale-105 shadow-xs">
              <Icon size={22} strokeWidth={2} aria-hidden="true" />
            </div>

            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50/80 px-2.5 py-1 text-[11px] font-semibold text-brand-700 border border-brand-200/60">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
              Bookable
            </span>
          </div>

          <div className="mt-4">
            <h3 className="line-clamp-1 font-display text-base font-bold text-ink-900 transition-colors duration-200 group-hover:text-brand-600">
              {service.name}
            </h3>

            {service.description ? (
              <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-ink-500">
                {service.description}
              </p>
            ) : (
              <p className="mt-1.5 text-xs italic text-ink-400">
                Verified on-demand professional service.
              </p>
            )}
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between border-t border-ink-100/80 pt-3.5">
          <span className="text-xs font-semibold text-brand-600 group-hover:text-brand-700 transition-colors">
            Explore &amp; hire
          </span>
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-50 text-brand-600 transition-all duration-200 group-hover:bg-brand-600 group-hover:text-white group-hover:translate-x-0.5 group-hover:-translate-y-0.5 shadow-xs">
            <ArrowUpRight size={14} aria-hidden="true" />
          </div>
        </div>
      </Card>
    </Link>
  );
}
export default memo(CatalogServiceCard);
