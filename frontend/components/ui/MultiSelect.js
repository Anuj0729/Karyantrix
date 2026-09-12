'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, Search, X } from 'lucide-react';

export default function MultiSelect({
  options = [],
  value = [],
  onChange,
  placeholder = 'Select options...',
  searchable = true,
  disabled = false,
  className = '',
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const ref = useRef(null);

  useEffect(() => {
    const onClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const toggle = (val) => {
    if (value.includes(val)) {
      onChange(value.filter((v) => v !== val));
    } else {
      onChange([...value, val]);
    }
  };

  const removeChip = (val, e) => {
    e.stopPropagation();
    onChange(value.filter((v) => v !== val));
  };

  const filtered = query.trim()
    ? options.filter((o) =>
        (o.label || '').toLowerCase().includes(query.trim().toLowerCase())
      )
    : options;

  const selectedLabels = options.filter((o) => value.includes(o.value));

  return (
    <div className={`relative ${className}`} ref={ref}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((o) => !o)}
        className={`flex min-h-[46px] w-full items-center justify-between gap-2 rounded-xl border border-ink-200/80 bg-white px-3.5 py-2 text-left text-sm shadow-soft transition-all duration-200 ${
          disabled
            ? 'cursor-not-allowed bg-ink-50/70 opacity-60'
            : 'hover:border-ink-300 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20'
        }`}
      >
        <div className="flex flex-1 flex-wrap items-center gap-1.5">
          {selectedLabels.length === 0 && (
            <span className="text-ink-400 select-none">{placeholder}</span>
          )}
          {selectedLabels.map((o) => (
            <span
              key={o.value}
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand-50 border border-brand-200/70 px-2.5 py-1 text-xs font-semibold text-brand-700 transition-colors"
            >
              {o.label}
              <span
                role="button"
                tabIndex={-1}
                onClick={(e) => removeChip(o.value, e)}
                aria-label={`Remove ${o.label}`}
                className="rounded-full p-0.5 text-brand-500 hover:bg-brand-200/60 hover:text-brand-900 transition-colors cursor-pointer"
              >
                <X size={11} aria-hidden="true" />
              </span>
            </span>
          ))}
        </div>
        <ChevronDown
          size={16}
          className={`shrink-0 text-ink-400 transition-transform duration-200 ${
            open ? 'rotate-180 text-brand-600' : ''
          }`}
          aria-hidden="true"
        />
      </button>

      {open && !disabled && (
        <div className="absolute z-40 mt-1.5 w-full overflow-hidden rounded-xl border border-ink-200/90 bg-white shadow-popover">
          {searchable && (
            <div className="flex items-center gap-2 border-b border-ink-100 bg-ink-50/50 px-3 py-2">
              <Search size={14} className="text-ink-400" aria-hidden="true" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search..."
                className="w-full border-0 bg-transparent p-0 text-xs font-medium text-ink-900 placeholder:text-ink-400 focus:outline-none focus:ring-0"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="text-ink-400 hover:text-ink-600"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          )}
          <div className="max-h-60 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <p className="px-3.5 py-3 text-xs text-ink-400 text-center">No options found</p>
            ) : (
              filtered.map((o) => {
                const checked = value.includes(o.value);
                return (
                  <div
                    key={o.value}
                    onClick={() => toggle(o.value)}
                    className={`flex cursor-pointer items-center justify-between px-3.5 py-2 text-sm transition-colors ${
                      checked
                        ? 'bg-brand-50/70 font-semibold text-brand-800'
                        : 'text-ink-700 hover:bg-ink-50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
                          checked
                            ? 'border-brand-600 bg-brand-600 text-white'
                            : 'border-ink-300 bg-white'
                        }`}
                      >
                        {checked && <Check size={11} strokeWidth={3} />}
                      </div>
                      <span>{o.label}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
