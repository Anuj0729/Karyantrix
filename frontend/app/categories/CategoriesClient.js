'use client';

import { useEffect, useMemo, useState } from 'react';
import { LayoutGrid, Search, Sparkles, X } from 'lucide-react';
import api from '../../lib/api';
import CategoryCard from '../../components/CategoryCard';
import { CategoryCardSkeleton } from '../../components/ui/Skeleton';

export default function CategoriesClient({ initialCategories = [] }) {
  const [categories, setCategories] = useState(initialCategories);
  const [loading, setLoading] = useState(initialCategories.length === 0);
  const [filterText, setFilterText] = useState('');

  useEffect(() => {
    if (initialCategories.length > 0) {
      setLoading(false);
      return;
    }
    api
      .get('/categories')
      .then(({ data }) => setCategories(data.categories || []))
      .finally(() => setLoading(false));
  }, []);

  // Filter as the user types - matches on category name or description.
  const filteredCategories = useMemo(() => {
    const q = filterText.trim().toLowerCase();
    if (!q) return categories;
    return categories.filter(
      (cat) =>
        cat.name?.toLowerCase().includes(q) || cat.description?.toLowerCase().includes(q)
    );
  }, [categories, filterText]);

  return (
    <div className="space-y-6">
      <div className="border-b border-ink-100 pb-5">
        <span className="flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-brand-600 mb-1">
          <Sparkles size={13} /> Service Catalog
        </span>
        <h1 className="font-display text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl">
          Browse All Categories
        </h1>
        <p className="mt-1 text-xs text-ink-500 sm:text-sm">
          Select a category to explore certified services, verified specialists, and transparent rates.
        </p>
      </div>

      <div className="relative max-w-md">
        <Search
          size={17}
          className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400"
          aria-hidden="true"
        />
        <input
          value={filterText}
          onChange={(e) => setFilterText(e.target.value)}
          placeholder="Filter categories..."
          className="w-full rounded-xl border border-ink-200/80 bg-white py-2.5 pl-10 pr-9 text-sm text-ink-900 shadow-soft transition-all duration-200 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
        />
        {filterText && (
          <button
            onClick={() => setFilterText('')}
            aria-label="Clear filter"
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-600"
          >
            <X size={15} />
          </button>
        )}
      </div>

      {!loading && filterText && (
        <p className="text-xs font-semibold text-ink-500">
          Showing <span className="text-ink-900">{filteredCategories.length}</span> of{' '}
          {categories.length} categories
        </p>
      )}

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {loading &&
          Array.from({ length: 8 }).map((_, i) => <CategoryCardSkeleton key={i} />)}
        {!loading &&
          filteredCategories.map((cat) => <CategoryCard key={cat.id} category={cat} />)}
      </div>

      {!loading && categories.length === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-ink-200 bg-white py-16 text-center shadow-card">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-ink-100 text-ink-400">
            <LayoutGrid size={24} aria-hidden="true" />
          </div>
          <h3 className="font-display text-base font-bold text-ink-800">No categories found</h3>
          <p className="text-xs text-ink-500">
            Categories will appear here once configured in the system.
          </p>
        </div>
      )}

      {!loading && categories.length > 0 && filteredCategories.length === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-ink-200 bg-white py-16 text-center shadow-card">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-ink-100 text-ink-400">
            <Search size={22} aria-hidden="true" />
          </div>
          <h3 className="font-display text-base font-bold text-ink-800">No matching categories</h3>
          <p className="text-xs text-ink-500">
            Try a different search term or clear the filter.
          </p>
        </div>
      )}
    </div>
  );
}