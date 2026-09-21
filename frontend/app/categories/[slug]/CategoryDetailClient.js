"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from 'next/link';
import { ArrowLeft, Search, SearchX, ChevronRight, X } from "lucide-react";
import api from "../../../lib/api";
import CatalogServiceCard from "../../../components/CatalogServiceCard";
import { Skeleton } from "../../../components/ui/Skeleton";
import { getCategoryIcon } from "../../../lib/categoryIcon";

export default function CategoryDetailClient({
  initialCategory = null,
  initialCatalogServices = [],
}) {
  const router = useRouter();
  const { slug } = useParams();
  const [category, setCategory] = useState(initialCategory);
  const [catalogServices, setCatalogServices] = useState(
    initialCatalogServices,
  );
  const [loading, setLoading] = useState(initialCatalogServices.length === 0);
  const [filterText, setFilterText] = useState("");

  const skippedInitialCategoryFetch = useRef(!!initialCategory);
  const skippedInitialCatalogFetch = useRef(
    !!initialCategory && initialCatalogServices.length > 0,
  );

  useEffect(() => {
    if (skippedInitialCategoryFetch.current) {
      skippedInitialCategoryFetch.current = false;
      return;
    }
    api
      .get(`/categories/${slug}`)
      .then(({ data }) => setCategory(data.category))
      .catch(() => setCategory(null));
  }, [slug]);

  useEffect(() => {
    if (!category?.id) return;
    if (skippedInitialCatalogFetch.current) {
      skippedInitialCatalogFetch.current = false;
      return;
    }
    setLoading(true);
    api
      .get("/service-catalog", { params: { category_id: category.id } })
      .then(({ data }) => setCatalogServices(data.services || []))
      .catch(() => setCatalogServices([]))
      .finally(() => setLoading(false));
  }, [category?.id]);

  const CategoryIcon = getCategoryIcon(category?.icon);

  // Filter as the user types - matches on service name or description.
  const filteredServices = useMemo(() => {
    const q = filterText.trim().toLowerCase();
    if (!q) return catalogServices;
    return catalogServices.filter(
      (service) =>
        service.name?.toLowerCase().includes(q) ||
        service.description?.toLowerCase().includes(q)
    );
  }, [catalogServices, filterText]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-ink-100">
        <div>
          <Link
            href={`/categories`}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-600 hover:text-brand-700 bg-brand-50 hover:bg-brand-100/70 border border-brand-200/50 px-3 py-1.5 rounded-full transition-colors mb-4"
          >
            <ChevronRight size={13} className="rotate-180" aria-hidden="true" />
            <span>Back to Categories</span>
          </Link>

          <div className="flex items-center gap-3.5">
            {category?.icon && (
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 border border-brand-100/60 shadow-soft">
                <CategoryIcon
                  size={24}
                  className="text-brand-600"
                  aria-hidden="true"
                />
              </div>
            )}
            <div>
              <h1 className="font-display text-2xl font-bold text-ink-900 tracking-tight">
                {category?.name || "Category"}
              </h1>
              {category?.description && (
                <p className="text-sm text-ink-500 mt-0.5 max-w-xl">
                  {category.description}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="inline-flex items-center self-start sm:self-auto gap-2 px-3.5 py-1.5 rounded-full bg-ink-100/70 border border-ink-200/60 text-xs font-semibold text-ink-700">
          <span className="w-2 h-2 rounded-full bg-brand-500" />
          {catalogServices.length} service
          {catalogServices.length !== 1 ? "s" : ""} available
        </div>
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
          placeholder="Filter services in this category..."
          className="w-full rounded-xl border border-ink-200/80 bg-white py-2.5 pl-10 pr-9 text-sm text-ink-900 shadow-soft transition-all duration-200 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
        />
        {filterText && (
          <button
            onClick={() => setFilterText("")}
            aria-label="Clear filter"
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-600"
          >
            <X size={15} />
          </button>
        )}
      </div>

      {!loading && filterText && (
        <p className="text-xs font-semibold text-ink-500">
          Showing <span className="text-ink-900">{filteredServices.length}</span> of{" "}
          {catalogServices.length} services
        </p>
      )}

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
        {loading &&
          Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        {!loading &&
          filteredServices.map((service) => (
            <CatalogServiceCard
              key={service.id}
              service={service}
              categorySlug={slug}
            />
          ))}
      </div>

      {!loading && catalogServices.length === 0 && (
        <div className="mt-8 flex flex-col items-center gap-3 rounded-3xl border border-dashed border-ink-200 bg-ink-50/40 p-12 text-center">
          <div className="w-12 h-12 rounded-2xl bg-white border border-ink-100 flex items-center justify-center text-ink-400 shadow-soft">
            <SearchX size={24} aria-hidden="true" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-ink-800">
              No services found
            </h3>
            <p className="mt-1 text-xs text-ink-500 max-w-xs">
              There are currently no catalog services listed in this category.
            </p>
          </div>
        </div>
      )}

      {!loading && catalogServices.length > 0 && filteredServices.length === 0 && (
        <div className="mt-8 flex flex-col items-center gap-3 rounded-3xl border border-dashed border-ink-200 bg-ink-50/40 p-12 text-center">
          <div className="w-12 h-12 rounded-2xl bg-white border border-ink-100 flex items-center justify-center text-ink-400 shadow-soft">
            <SearchX size={24} aria-hidden="true" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-ink-800">
              No matching services
            </h3>
            <p className="mt-1 text-xs text-ink-500 max-w-xs">
              Try a different search term or clear the filter.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}