'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';

const NavigationLoadingContext = createContext(null);

export function useNavigationLoading() {
  return useContext(NavigationLoadingContext);
}

const SAFETY_TIMEOUT_MS = 12000;

function isModifiedClick(event) {
  return (
    event.defaultPrevented ||
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey
  );
}

function findAnchor(node) {
  let el = node;
  while (el && el.nodeName !== 'A') {
    el = el.parentElement;
  }
  return el;
}

export function NavigationLoadingProvider({ children }) {
  const pathname = usePathname();
  const [pending, setPending] = useState(null);
  const rafRef = useRef(null);
  const timeoutRef = useRef(null);
  const trackedElRef = useRef(null);
  const prevPathnameRef = useRef(pathname);

  const clearPending = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    rafRef.current = null;
    timeoutRef.current = null;
    trackedElRef.current = null;
    setPending(null);
  }, []);

  const beginNavigation = useCallback(
    (el) => {
      if (!el) return;
      trackedElRef.current = el;
      setPending({ rect: el.getBoundingClientRect() });

      const track = () => {
        if (!trackedElRef.current) return;
        setPending({ rect: trackedElRef.current.getBoundingClientRect() });
        rafRef.current = requestAnimationFrame(track);
      };
      rafRef.current = requestAnimationFrame(track);

      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(clearPending, SAFETY_TIMEOUT_MS);
    },
    [clearPending]
  );

  useEffect(() => {
    if (prevPathnameRef.current !== pathname) {
      prevPathnameRef.current = pathname;
      clearPending();
    }
  }, [pathname, clearPending]);

  useEffect(() => {
    const handleClick = (event) => {
      if (isModifiedClick(event)) return;

      const anchor = findAnchor(event.target);
      if (!anchor) return;
      if (anchor.closest('[data-no-nav-loading="true"]')) return;
      if (anchor.target && anchor.target !== '_self') return;
      if (anchor.hasAttribute('download')) return;

      const href = anchor.getAttribute('href');
      if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return;

      let url;
      try {
        url = new URL(href, window.location.href);
      } catch {
        return;
      }
      if (url.origin !== window.location.origin) return;

      const targetPath = url.pathname + url.search;
      const currentPath = window.location.pathname + window.location.search;
      if (targetPath === currentPath) return;

      beginNavigation(anchor);
    };

    document.addEventListener('click', handleClick, true);
    return () => document.removeEventListener('click', handleClick, true);
  }, [beginNavigation]);

  useEffect(() => () => clearPending(), [clearPending]);

  return (
    <NavigationLoadingContext.Provider value={{ beginNavigation, clearPending, isNavigating: !!pending }}>
      {children}
      <TopProgressBar active={!!pending} />
      <ClickOverlay pending={pending} />
    </NavigationLoadingContext.Provider>
  );
}

function TopProgressBar({ active }) {
  const [visible, setVisible] = useState(false);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const timers = [];
    if (active) {
      setVisible(true);
      setWidth(8);
      timers.push(setTimeout(() => setWidth(45), 60));
      timers.push(setTimeout(() => setWidth(75), 450));
      timers.push(setTimeout(() => setWidth(90), 1200));
    } else {
      setWidth((w) => (w > 0 ? 100 : 0));
      timers.push(setTimeout(() => setVisible(false), 250));
      timers.push(setTimeout(() => setWidth(0), 260));
    }
    return () => timers.forEach(clearTimeout);
  }, [active]);

  if (!visible) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[1000] h-[3px] overflow-hidden bg-transparent">
      <div
        className="h-full bg-gradient-to-r from-brand-500 via-brand-600 to-accent-500 shadow-glow-brand transition-[width] ease-out"
        style={{ width: `${width}%`, transitionDuration: width >= 100 ? '200ms' : '450ms' }}
      />
    </div>
  );
}

function ClickOverlay({ pending }) {
  if (!pending?.rect) return null;
  const { rect } = pending;
  if (rect.width < 4 || rect.height < 4) return null;

  return (
    <div
      className="fixed z-[999] flex cursor-wait items-center justify-center rounded-xl bg-white/55 backdrop-blur-[1px] transition-opacity"
      style={{ top: rect.top, left: rect.left, width: rect.width, height: rect.height }}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      aria-hidden="true"
    >
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white shadow-card ring-1 ring-ink-100">
        <svg className="h-3.5 w-3.5 animate-spin text-brand-600" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
          <path className="opacity-90" d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        </svg>
      </span>
    </div>
  );
}
