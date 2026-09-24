'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Check, Globe } from 'lucide-react';
import {
  DEFAULT_LANGUAGE,
  SITE_LANGUAGES,
  changeLanguage,
  getAvailableLanguageCodes,
  getCurrentLanguage,
} from '../lib/translate';

/**
 * Navbar language picker. Opens a vertical list of languages and hands the
 * choice to the hidden Google Translate engine (see GoogleTranslateEngine.js).
 *
 * The whole component is marked translate="no" so language names stay in their
 * own script no matter which language the page is currently in.
 */
export default function LanguageSwitcher({ className = '' }) {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState(DEFAULT_LANGUAGE);
  const rootRef = useRef(null);

  // Read the cookie after mount so server and client markup match on hydration.
  useEffect(() => {
    setCurrent(getCurrentLanguage());
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    const onKeyDown = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  // Once Google's widget has loaded, only offer languages it can really do.
  // Before that (or if it is blocked) the full list is shown.
  const languages = useMemo(() => {
    if (!open) return SITE_LANGUAGES;
    const available = getAvailableLanguageCodes();
    return available ? SITE_LANGUAGES.filter((l) => available.has(l.code)) : SITE_LANGUAGES;
  }, [open]);

  const activeLanguage = SITE_LANGUAGES.find((l) => l.code === current) || SITE_LANGUAGES[0];

  const handleSelect = useCallback(
    (code) => {
      setOpen(false);
      if (code === current) return;
      setCurrent(code);
      changeLanguage(code);
    },
    [current]
  );

  return (
    // Static on mobile so the list anchors to the full-width navbar; relative
    // from sm up so it hangs under the button.
    <div ref={rootRef} translate="no" className={`notranslate static sm:relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Language: ${activeLanguage.name}. Change language`}
        title="Change language"
        className={`flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-xl border px-2.5 text-xs font-semibold transition-colors hover:border-brand-300 hover:bg-brand-50/60 hover:text-brand-600 ${
          open
            ? 'border-brand-300 bg-brand-50/60 text-brand-600'
            : 'border-ink-200/80 text-ink-500'
        }`}
      >
        <Globe size={16} aria-hidden="true" />
        <span className="hidden uppercase lg:inline">{activeLanguage.code.split('-')[0]}</span>
      </button>

      {open && (
        <div className="absolute left-4 right-4 top-full z-50 mt-2 overflow-hidden rounded-2xl border border-ink-200/80 bg-white shadow-popover sm:left-auto sm:right-0 sm:w-64">
          <div className="border-b border-ink-100 px-4 py-2.5 text-xs font-semibold text-ink-500">
            Choose language
          </div>
          <ul role="listbox" aria-label="Site language" className="max-h-[60vh] overflow-y-auto py-1.5">
            {languages.map((lang) => {
              const selected = lang.code === current;
              return (
                <li key={lang.code} role="option" aria-selected={selected}>
                  <button
                    type="button"
                    onClick={() => handleSelect(lang.code)}
                    className={`flex w-full items-center justify-between gap-3 px-4 py-2 text-left text-sm transition-colors ${
                      selected
                        ? 'bg-brand-50 text-brand-700'
                        : 'text-ink-700 hover:bg-ink-50'
                    }`}
                  >
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate font-semibold">{lang.native}</span>
                      {lang.native !== lang.name && (
                        <span className="truncate text-xs text-ink-500">{lang.name}</span>
                      )}
                    </span>
                    {selected && <Check size={16} className="shrink-0 text-brand-600" aria-hidden="true" />}
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="border-t border-ink-100 px-4 py-2 text-[11px] text-ink-400">
            Translated by Google Translate
          </div>
        </div>
      )}
    </div>
  );
}