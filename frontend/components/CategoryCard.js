'use client';

import { memo } from 'react';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import Card from './ui/Card';
import { getCategoryIcon } from '../lib/categoryIcon';

function CategoryCard({ category }) {
  const Icon = getCategoryIcon(category.icon);

  return (
    <Link href={`/categories/${category.slug}`} className="block group h-full">
      <Card
        className="relative flex h-full flex-col items-start justify-between gap-4 p-5 sm:p-6 rounded-3xl border border-ink-200/80 bg-white shadow-soft transition-all duration-300 hover:border-brand-300 hover:shadow-card-hover"
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-30px' }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        hover={false}
      >
        <div className="flex w-full items-center justify-between">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-50 via-brand-100/70 to-accent-50/50 text-brand-600 ring-1 ring-inset ring-brand-200/60 transition-transform duration-300 group-hover:scale-105 shadow-xs">
            <Icon size={22} className="text-brand-600" aria-hidden="true" />
          </div>
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-ink-50 text-ink-400 transition-all duration-200 group-hover:bg-brand-50 group-hover:text-brand-600 shadow-xs">
            <ArrowUpRight size={14} className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </div>
        </div>

        <div className="w-full">
          <h3 className="font-display text-base font-bold text-ink-900 group-hover:text-brand-600 transition-colors">
            {category.name}
          </h3>
          {category.description && (
            <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-ink-500">
              {category.description}
            </p>
          )}
        </div>
      </Card>
    </Link>
  );
}

export default memo(CategoryCard);
