'use client';

import { useEffect, useRef } from 'react';

export default function useRefetchOnFocus(refetch, { pollMs = 0, enabled = true } = {}) {
  const refetchRef = useRef(refetch);
  refetchRef.current = refetch;

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return undefined;

    const onFocus = () => refetchRef.current?.();
    const onVisibility = () => {
      if (document.visibilityState === 'visible') refetchRef.current?.();
    };

    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);

    let interval;
    if (pollMs > 0) {
      interval = setInterval(() => refetchRef.current?.(), pollMs);
    }

    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
      if (interval) clearInterval(interval);
    };
  }, [pollMs, enabled]);
}
