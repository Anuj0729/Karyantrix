'use client';

import { useEffect, useMemo, useState } from 'react';

export const ADMIN_PAGE_SIZE = 10;

// Client-side pagination for lists the page has already loaded.
// `resetKey` should change whenever a filter/search changes so the list jumps back to page 1.
export default function usePagination(items, { pageSize = ADMIN_PAGE_SIZE, resetKey = '' } = {}) {
  const [page, setPage] = useState(1);

  const total = items.length;
  const pages = Math.max(1, Math.ceil(total / pageSize));

  useEffect(() => {
    setPage(1);
  }, [resetKey]);

  // The list can shrink underneath us (refetch on focus, deactivating a row...); never sit past the last page.
  useEffect(() => {
    if (page > pages) setPage(pages);
  }, [page, pages]);

  const current = Math.min(page, pages);
  const pageItems = useMemo(
    () => items.slice((current - 1) * pageSize, current * pageSize),
    [items, current, pageSize]
  );

  return { page: current, pages, total, pageSize, pageItems, setPage };
}
