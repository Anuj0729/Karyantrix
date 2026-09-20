'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';

// 1 … 4 5 6 … 12
const pageWindow = (page, pages) => {
  const wanted = [...new Set([1, pages, page - 1, page, page + 1])]
    .filter((n) => n >= 1 && n <= pages)
    .sort((a, b) => a - b);
  const out = [];
  wanted.forEach((n, i) => {
    if (i > 0 && n - wanted[i - 1] > 1) out.push(`gap-${n}`);
    out.push(n);
  });
  return out;
};

export default function Pagination({ pager, label = 'items', className = '' }) {
  const { page, pages, total, pageSize, setPage } = pager;
  if (pages <= 1) return null;

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  const go = (n) => {
    if (n < 1 || n > pages || n === page) return;
    setPage(n);
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const base =
    'inline-flex h-8 min-w-8 items-center justify-center rounded-lg px-2 text-xs font-semibold transition-all';

  return (
    <nav
      aria-label="Pagination"
      className={`flex flex-col items-center justify-between gap-3 pt-2 sm:flex-row ${className}`}
    >
      <p className="text-xs text-ink-500">
        Showing <span className="font-semibold text-ink-700">{from}&ndash;{to}</span> of{' '}
        <span className="font-semibold text-ink-700">{total}</span> {label}
      </p>

      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => go(page - 1)}
          disabled={page <= 1}
          aria-label="Previous page"
          className={`${base} border border-ink-200/80 bg-white text-ink-600 hover:border-brand-300 hover:bg-ink-50/50 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-ink-200/80 disabled:hover:bg-white`}
        >
          <ChevronLeft size={15} aria-hidden="true" />
        </button>

        {pageWindow(page, pages).map((n) =>
          typeof n === 'string' ? (
            <span key={n} className="px-1 text-xs text-ink-400" aria-hidden="true">
              &hellip;
            </span>
          ) : (
            <button
              key={n}
              type="button"
              onClick={() => go(n)}
              aria-label={`Page ${n}`}
              aria-current={n === page ? 'page' : undefined}
              className={`${base} ${
                n === page
                  ? 'bg-brand-600 text-white shadow-xs'
                  : 'border border-ink-200/80 bg-white text-ink-600 hover:border-brand-300 hover:bg-ink-50/50'
              }`}
            >
              {n}
            </button>
          )
        )}

        <button
          type="button"
          onClick={() => go(page + 1)}
          disabled={page >= pages}
          aria-label="Next page"
          className={`${base} border border-ink-200/80 bg-white text-ink-600 hover:border-brand-300 hover:bg-ink-50/50 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-ink-200/80 disabled:hover:bg-white`}
        >
          <ChevronRight size={15} aria-hidden="true" />
        </button>
      </div>
    </nav>
  );
}
