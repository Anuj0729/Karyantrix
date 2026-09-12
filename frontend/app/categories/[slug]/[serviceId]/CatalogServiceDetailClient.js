'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, RotateCcw, SearchX, SlidersHorizontal, Wrench } from 'lucide-react';
import api from '../../../../lib/api';
import ServiceCard from '../../../../components/ServiceCard';
import Button from '../../../../components/ui/Button';
import { ServiceCardSkeleton } from '../../../../components/ui/Skeleton';
import useGeolocation from '../../../../lib/useGeolocation';
import { useAuth } from '../../../../context/AuthContext';

const RADIUS_OPTIONS = [5, 10, 25, 50, 100, 200];

const emptyFilters = { minPrice: '', maxPrice: '', radius: '' };

export default function CatalogServiceDetailClient({ initialCatalogService = null, initialServices = [] }) {
  const { slug, serviceId } = useParams();
  const { user } = useAuth();
  const { coords, status: geoStatus } = useGeolocation();
  const [catalogService, setCatalogService] = useState(initialCatalogService);
  const [services, setServices] = useState(initialServices);
  const [sort, setSort] = useState('');
  const [filters, setFilters] = useState(emptyFilters);
  const [draft, setDraft] = useState(emptyFilters);
  const [showFilters, setShowFilters] = useState(false);
  const [loading, setLoading] = useState(initialServices.length === 0 && !initialCatalogService);

  const skippedInitialCatalogFetch = useRef(!!initialCatalogService);
  const skippedInitialServicesFetch = useRef(initialServices.length > 0);

  useEffect(() => {
    if (skippedInitialCatalogFetch.current) {
      skippedInitialCatalogFetch.current = false;
      return;
    }
    api.get('/service-catalog', { params: { id: serviceId } })
      .then(({ data }) => setCatalogService(data.services?.[0] || null))
      .catch(() => setCatalogService(null));
  }, [serviceId]);

  useEffect(() => {
    // Only surface providers whose saved location falls within the
    // customer's radius, so wait for geolocation to resolve before fetching.
    if (geoStatus === 'idle' || geoStatus === 'locating') return;
    if (skippedInitialServicesFetch.current) {
      skippedInitialServicesFetch.current = false;
      if (!coords) return; // no location to apply - the SSR-rendered list still stands
    }

    setLoading(true);
    const params = { catalog_service: serviceId, sort };
    if (filters.minPrice) params.minPrice = filters.minPrice;
    if (filters.maxPrice) params.maxPrice = filters.maxPrice;
    if (coords) {
      params.lat = coords.lat;
      params.lng = coords.lng;
      params.radius = filters.radius || user?.requirement_radius_km || 5;
    }
    api.get('/services', { params })
      .then(({ data }) => setServices(data.services || []))
      .catch(() => setServices([]))
      .finally(() => setLoading(false));
  }, [serviceId, sort, filters, geoStatus, coords, user?.requirement_radius_km]);

  const resetFilters = () => {
    setDraft(emptyFilters);
    setFilters(emptyFilters);
  };

  const activeFilterCount = useMemo(
    () => Object.values(filters).filter((v) => v !== '').length,
    [filters]
  );

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/categories/${slug}`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-600 hover:text-brand-700 bg-brand-50 hover:bg-brand-100/70 border border-brand-200/50 px-3 py-1.5 rounded-full transition-colors mb-4"
        >
          <ChevronRight size={13} className="rotate-180" aria-hidden="true" />
          <span>Back to {catalogService?.category?.name || 'Category'}</span>
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-ink-100">
          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 border border-brand-100/60 shadow-soft flex-shrink-0">
              <Wrench size={22} className="text-brand-600" aria-hidden="true" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold text-ink-900 tracking-tight">
                {catalogService?.name || 'Service'}
              </h1>
              {catalogService?.description && (
                <p className="text-sm text-ink-500 mt-0.5 max-w-xl">{catalogService.description}</p>
              )}
              {coords && (
                <p className="text-[11px] text-ink-400 mt-0.5">
                  Showing providers within {filters.radius || user?.requirement_radius_km || 5} km of your location
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-ink-100/70 border border-ink-200/60 text-xs font-semibold text-ink-700">
              <span className="w-2 h-2 rounded-full bg-trust-500" />
              {services.length} provider{services.length !== 1 ? 's' : ''} available
            </div>

            <Button
              variant={showFilters || activeFilterCount > 0 ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setShowFilters((s) => !s)}
              icon={<SlidersHorizontal size={15} aria-hidden="true" />}
            >
              Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
            </Button>

            <div className="relative">
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                className="appearance-none rounded-xl border border-ink-200 bg-white pl-3.5 pr-8 py-2 text-xs font-semibold text-ink-700 shadow-soft focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 focus:outline-none transition-all cursor-pointer"
              >
                <option value="">Sort: Newest</option>
                <option value="price_low">Price: Low to High</option>
                <option value="price_high">Price: High to Low</option>
                <option value="rating">Highest Rated</option>
              </select>
              <ChevronRight className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 rotate-90 text-ink-400" />
            </div>
          </div>
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
            <div className="rounded-2xl border border-ink-200/80 bg-white p-6 shadow-popover">
              <div className="flex items-center justify-between border-b border-ink-100 pb-3.5 mb-4">
                <span className="font-display text-sm font-bold text-ink-900 flex items-center gap-2">
                  <SlidersHorizontal size={15} className="text-brand-600" />
                  Filter Providers
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

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
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
              </div>

              <div className="flex items-center gap-2 pt-4">
                <Button size="md" onClick={() => setFilters(draft)}>
                  Apply Filters
                </Button>
                <Button size="md" variant="ghost" onClick={resetFilters}>
                  Clear
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {loading && Array.from({ length: 6 }).map((_, i) => (
          <ServiceCardSkeleton key={i} className="h-24 rounded-2xl" />
        ))}
        {!loading && services.map((service) => (
          <ServiceCard key={service.id} service={service} />
        ))}
      </div>

      {!loading && services.length === 0 && (
        <div className="mt-8 flex flex-col items-center gap-3 rounded-3xl border border-dashed border-ink-200 bg-ink-50/40 p-12 text-center">
          <div className="w-12 h-12 rounded-2xl bg-white border border-ink-100 flex items-center justify-center text-ink-400 shadow-soft">
            <SearchX size={24} aria-hidden="true" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-ink-800">No providers found</h3>
            <p className="mt-1 text-xs text-ink-500 max-w-xs">
              {coords
                ? 'No providers are offering this service within your radius right now. Try widening your distance filter.'
                : 'No providers are offering this service right now. Check back soon or post a custom requirement!'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
