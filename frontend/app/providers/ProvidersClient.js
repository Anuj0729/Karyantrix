'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft,
  ChevronRight,
  Filter,
  LayoutGrid,
  List,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Sparkles,
  UserSearch,
  X,
} from 'lucide-react';
import api from '../../lib/api';
import ProviderCard from '../../components/ProviderCard';
import Button from '../../components/ui/Button';
import { ProviderCardSkeleton } from '../../components/ui/Skeleton';
import useGeolocation from '../../lib/useGeolocation';
import { useAuth } from '../../context/AuthContext';

const RADIUS_OPTIONS = [5, 10, 25, 50, 100, 200];

const SORT_OPTIONS = [
  { value: '', label: 'Recommended' },
  { value: 'rating', label: 'Highest Rated' },
  { value: 'price_low', label: 'Price: Low to High' },
  { value: 'price_high', label: 'Price: High to Low' },
  { value: 'most_experienced', label: 'Most Experienced' },
  { value: 'most_reviewed', label: 'Most Reviewed' },
  { value: 'recent', label: 'Recently Joined' },
];

const emptyFilters = {
  search: '',
  category: '',
  location: '',
  minPrice: '',
  maxPrice: '',
  minRating: '',
  minExperience: '',
  availableNow: false,
  radius: '',
  sort: '',
};

export default function ProvidersClient({
  initialProviders = [],
  initialCategories = [],
  initialCount = 0,
  initialPages = 1,
}) {
  const searchParams = useSearchParams();
  const initialUrlFilters = useMemo(
    () => ({
      ...emptyFilters,
      search: searchParams.get('search') || '',
      category: searchParams.get('category') || '',
    }),
    []
  );
  const hasUrlFilters = !!(initialUrlFilters.search || initialUrlFilters.category);

  const [categories, setCategories] = useState(initialCategories);
  const [filters, setFilters] = useState(initialUrlFilters);
  const [draft, setDraft] = useState(initialUrlFilters);
  const [providers, setProviders] = useState(initialProviders);
  const [count, setCount] = useState(initialCount);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(initialPages);
  const [loading, setLoading] = useState(initialProviders.length === 0);
  const [view, setView] = useState('grid');
  const [showFilters, setShowFilters] = useState(false);
  const { user } = useAuth();
  const { coords, status: geoStatus } = useGeolocation();

  useEffect(() => {
    api.get('/categories').then(({ data }) => setCategories(data.categories || [])).catch(() => {});
  }, []);

  const fetchProviders = useCallback(
    (f, p) => {
      setLoading(true);
      const params = { page: p, limit: 12 };
      Object.entries(f).forEach(([k, v]) => {
        if (v !== '' && v !== false) params[k] = v;
      });
      // Only show providers within the customer's location radius, once we
      // know where they are.
      if (coords) {
        params.lat = coords.lat;
        params.lng = coords.lng;
        if (!params.radius) params.radius = user?.requirement_radius_km || 5;
      }
      api
        .get('/providers', { params })
        .then(({ data }) => {
          setProviders(data.providers || []);
          setCount(data.count || 0);
          setPages(data.pages || 1);
        })
        .catch(() => {
          setProviders([]);
          setCount(0);
          setPages(1);
        })
        .finally(() => setLoading(false));
    },
    [coords, user?.requirement_radius_km]
  );

  const skippedInitialFetch = useRef(initialProviders.length > 0 && !hasUrlFilters);

  useEffect(() => {
    // Wait for the browser to resolve (or deny) geolocation before fetching,
    // so the very first fetch already respects the customer's radius.
    if (geoStatus === 'idle' || geoStatus === 'locating') return;
    if (skippedInitialFetch.current) {
      skippedInitialFetch.current = false;
      if (!coords) return; // no location to apply - the SSR-rendered list still stands
    }
    fetchProviders(filters, page);
  }, [filters, page, fetchProviders, geoStatus, coords]);

  const applyFilters = (next) => {
    setFilters(next);
    setPage(1);
  };

  const resetFilters = () => {
    setDraft(emptyFilters);
    applyFilters(emptyFilters);
  };

  const activeFilterCount = useMemo(
    () =>
      Object.entries(filters).filter(([k, v]) => k !== 'sort' && v !== '' && v !== false).length,
    [filters]
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-brand-600">
              <Sparkles size={13} /> Verified Directory
            </span>
          </div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl">
            Find Trusted Providers
          </h1>
          <p className="mt-1 text-xs text-ink-500 sm:text-sm">
            Discover and hire verified local professionals across every category with upfront pricing.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search
            size={18}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400"
            aria-hidden="true"
          />
          <input
            value={draft.search}
            onChange={(e) => setDraft((d) => ({ ...d, search: e.target.value }))}
            onKeyDown={(e) =>
              e.key === 'Enter' && applyFilters({ ...filters, search: draft.search })
            }
            placeholder="Search by specialty, skill, title or name..."
            className="w-full rounded-xl border border-ink-200/80 bg-white py-3 pl-10 pr-4 text-sm text-ink-900 shadow-soft transition-all duration-200 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
          />
          {draft.search && (
            <button
              onClick={() => {
                setDraft((d) => ({ ...d, search: '' }));
                applyFilters({ ...filters, search: '' });
              }}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-600"
            >
              <X size={15} />
            </button>
          )}
        </div>

        <div className="flex gap-2.5">
          <Button
            variant={showFilters || activeFilterCount > 0 ? 'primary' : 'secondary'}
            onClick={() => setShowFilters((s) => !s)}
            icon={<SlidersHorizontal size={17} aria-hidden="true" />}
          >
            Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
          </Button>
          <Button onClick={() => applyFilters({ ...filters, search: draft.search })}>
            Search
          </Button>
        </div>
      </div>

      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="rounded-2xl border border-ink-200/80 bg-white p-6 shadow-popover mt-4">
              <div className="flex items-center justify-between border-b border-ink-100 pb-3.5 mb-4">
                <span className="font-display text-sm font-bold text-ink-900 flex items-center gap-2">
                  <Filter size={15} className="text-brand-600" />
                  Filter Service Providers
                </span>
                {activeFilterCount > 0 && (
                  <button
                    onClick={resetFilters}
                    className="flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-800"
                  >
                    <RotateCcw size={12} />
                    Reset all
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-ink-500">
                    Category
                  </label>
                  <select
                    value={draft.category}
                    onChange={(e) => setDraft((d) => ({ ...d, category: e.target.value }))}
                    className="w-full rounded-xl border border-ink-200/80 bg-white px-3.5 py-2.5 text-sm text-ink-900 shadow-soft focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                  >
                    <option value="">All categories</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.slug}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-ink-500">
                    Location
                  </label>
                  <input
                    value={draft.location}
                    onChange={(e) => setDraft((d) => ({ ...d, location: e.target.value }))}
                    placeholder="Enter city..."
                    className="w-full rounded-xl border border-ink-200/80 bg-white px-3.5 py-2.5 text-sm text-ink-900 shadow-soft focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-ink-500">
                    Min Rating
                  </label>
                  <select
                    value={draft.minRating}
                    onChange={(e) => setDraft((d) => ({ ...d, minRating: e.target.value }))}
                    className="w-full rounded-xl border border-ink-200/80 bg-white px-3.5 py-2.5 text-sm text-ink-900 shadow-soft focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                  >
                    <option value="">Any rating</option>
                    {[4.5, 4, 3.5, 3].map((r) => (
                      <option key={r} value={r}>
                        {r}+ stars
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-ink-500">
                    Min Experience
                  </label>
                  <select
                    value={draft.minExperience}
                    onChange={(e) => setDraft((d) => ({ ...d, minExperience: e.target.value }))}
                    className="w-full rounded-xl border border-ink-200/80 bg-white px-3.5 py-2.5 text-sm text-ink-900 shadow-soft focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                  >
                    <option value="">Any experience</option>
                    {[1, 2, 5, 10].map((y) => (
                      <option key={y} value={y}>
                        {y}+ years
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-ink-500">
                    Min Price (₹)
                  </label>
                  <input
                    type="number"
                    value={draft.minPrice}
                    onChange={(e) => setDraft((d) => ({ ...d, minPrice: e.target.value }))}
                    placeholder="Min rate"
                    className="w-full rounded-xl border border-ink-200/80 bg-white px-3.5 py-2.5 text-sm text-ink-900 shadow-soft focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-ink-500">
                    Max Price (₹)
                  </label>
                  <input
                    type="number"
                    value={draft.maxPrice}
                    onChange={(e) => setDraft((d) => ({ ...d, maxPrice: e.target.value }))}
                    placeholder="Max rate"
                    className="w-full rounded-xl border border-ink-200/80 bg-white px-3.5 py-2.5 text-sm text-ink-900 shadow-soft focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-ink-500">
                    Distance
                  </label>
                  <select
                    value={draft.radius}
                    onChange={(e) => setDraft((d) => ({ ...d, radius: e.target.value }))}
                    disabled={!coords}
                    className="w-full rounded-xl border border-ink-200/80 bg-white px-3.5 py-2.5 text-sm text-ink-900 shadow-soft focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <option value="">
                      Within {user?.requirement_radius_km || 5} km (default)
                    </option>
                    {RADIUS_OPTIONS.map((r) => (
                      <option key={r} value={r}>
                        Within {r} km
                      </option>
                    ))}
                  </select>
                  {!coords && (
                    <p className="mt-1 text-[11px] text-ink-400">
                      {geoStatus === 'denied'
                        ? 'Location access denied - showing all providers'
                        : 'Enable location to filter by distance'}
                    </p>
                  )}
                </div>

                <div className="flex items-center pt-5">
                  <label className="flex cursor-pointer items-center gap-2.5 text-sm font-semibold text-ink-700 select-none">
                    <input
                      type="checkbox"
                      checked={draft.availableNow}
                      onChange={(e) =>
                        setDraft((d) => ({ ...d, availableNow: e.target.checked }))
                      }
                      className="h-4.5 w-4.5 rounded border-ink-300 text-brand-600 focus:ring-brand-400"
                    />
                    Available online now
                  </label>
                </div>

                <div className="flex items-end gap-2 pt-2">
                  <Button size="md" fullWidth onClick={() => applyFilters(draft)}>
                    Apply Filters
                  </Button>
                  <Button size="md" variant="ghost" onClick={resetFilters}>
                    Clear
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-100 pb-3">
        <p className="text-xs font-semibold text-ink-600">
          {loading ? (
            'Searching directory...'
          ) : (
            <>
              Showing <span className="font-bold text-ink-900">{count}</span> provider
              {count !== 1 ? 's' : ''}
            </>
          )}
        </p>

        <div className="flex items-center gap-3">
          <select
            value={filters.sort}
            onChange={(e) => applyFilters({ ...filters, sort: e.target.value })}
            className="rounded-xl border border-ink-200/80 bg-white px-3 py-1.5 text-xs font-semibold text-ink-800 shadow-soft focus:border-brand-500 focus:outline-none"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                Sort: {o.label}
              </option>
            ))}
          </select>

          <div className="flex overflow-hidden rounded-xl border border-ink-200/80 bg-white shadow-soft p-0.5">
            <button
              onClick={() => setView('grid')}
              aria-label="Grid view"
              className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${
                view === 'grid'
                  ? 'bg-brand-50 text-brand-700 shadow-xs'
                  : 'text-ink-400 hover:text-ink-700'
              }`}
            >
              <LayoutGrid size={16} aria-hidden="true" />
            </button>
            <button
              onClick={() => setView('list')}
              aria-label="List view"
              className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${
                view === 'list'
                  ? 'bg-brand-50 text-brand-700 shadow-xs'
                  : 'text-ink-400 hover:text-ink-700'
              }`}
            >
              <List size={16} aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>

      <div
        className={`grid gap-5 ${
          view === 'grid' ? 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-3' : 'grid-cols-1'
        }`}
      >
        {loading &&
          Array.from({ length: 6 }).map((_, i) => <ProviderCardSkeleton key={i} />)}

        {!loading &&
          providers.map((p) => <ProviderCard key={p.id} provider={p} view={view} />)}
      </div>

      {!loading && providers.length === 0 && (
        <div className="mt-8 flex flex-col items-center gap-3 rounded-3xl border border-dashed border-ink-200 bg-white py-16 px-6 text-center shadow-card">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
            <UserSearch size={32} aria-hidden="true" />
          </div>
          <h3 className="font-display text-lg font-bold text-ink-900">
            No providers match your criteria
          </h3>
          <p className="max-w-md text-xs leading-relaxed text-ink-500">
            Try adjusting your search terms, clearing filters, or choosing a wider radius to see more results.
          </p>
          <Button variant="secondary" size="sm" onClick={resetFilters} className="mt-2">
            Clear All Filters
          </Button>
        </div>
      )}

      {!loading && pages > 1 && (
        <div className="mt-10 flex items-center justify-center gap-3">
          <Button
            variant="secondary"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            icon={<ChevronLeft size={16} />}
          >
            Previous
          </Button>
          <span className="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-ink-700 border border-ink-200/80 shadow-soft">
            Page {page} of {pages}
          </span>
          <Button
            variant="secondary"
            size="sm"
            disabled={page >= pages}
            onClick={() => setPage((p) => Math.min(pages, p + 1))}
          >
            Next <ChevronRight size={16} />
          </Button>
        </div>
      )}
    </div>
  );
}
