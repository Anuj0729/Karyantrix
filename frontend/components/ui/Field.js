'use client';

import { useEffect, useRef, useState } from 'react';
import { AlertCircle, X } from 'lucide-react';

export function Field({ label, hint, required, error, children, className = '' }) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && (
        <label className="flex items-center justify-between text-xs font-semibold tracking-wide text-ink-700 uppercase">
          <span>
            {label} {required && <span className="text-accent-500 font-bold">*</span>}
          </span>
        </label>
      )}
      {children}
      {hint && !error && <p className="text-xs text-ink-500">{hint}</p>}
      {error && (
        <p className="flex items-center gap-1.5 text-xs font-medium text-red-600 animate-fade-in">
          <AlertCircle size={13} className="shrink-0 text-red-500" />
          {error}
        </p>
      )}
    </div>
  );
}

const baseInput =
  'w-full rounded-xl border border-ink-200/80 bg-white px-3.5 py-2.5 text-sm text-ink-900 placeholder:text-ink-400 shadow-soft transition-all duration-200 focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 disabled:bg-ink-50 disabled:text-ink-400 disabled:cursor-not-allowed';

export function TextInput({ leftIcon, rightIcon, hasError, className = '', ...props }) {
  if (leftIcon || rightIcon) {
    return (
      <div className="relative flex items-center">
        {leftIcon && (
          <div className="pointer-events-none absolute left-3.5 text-ink-400 flex items-center">
            {leftIcon}
          </div>
        )}
        <input
          {...props}
          className={`${baseInput} ${leftIcon ? 'pl-10' : ''} ${rightIcon ? 'pr-10' : ''} ${
            hasError ? 'border-red-400 focus:border-red-500 focus:ring-red-500/20' : ''
          } ${className}`}
        />
        {rightIcon && (
          <div className="absolute right-3.5 text-ink-400 flex items-center">
            {rightIcon}
          </div>
        )}
      </div>
    );
  }

  return (
    <input
      {...props}
      className={`${baseInput} ${
        hasError ? 'border-red-400 focus:border-red-500 focus:ring-red-500/20' : ''
      } ${className}`}
    />
  );
}

export function TextArea({ hasError, className = '', ...props }) {
  return (
    <textarea
      {...props}
      className={`${baseInput} resize-none ${
        hasError ? 'border-red-400 focus:border-red-500 focus:ring-red-500/20' : ''
      } ${className}`}
    />
  );
}

export function SelectInput({ children, hasError, className = '', ...props }) {
  return (
    <div className="relative">
      <select
        {...props}
        className={`${baseInput} bg-white cursor-pointer appearance-none pr-10 ${
          hasError ? 'border-red-400 focus:border-red-500 focus:ring-red-500/20' : ''
        } ${className}`}
      >
        {children}
      </select>
      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-ink-400">
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </div>
  );
}

export function TagInput({ value = [], onChange, placeholder = 'Add tag...' }) {
  const addTag = (raw) => {
    const tag = raw.trim();
    if (tag && !value.includes(tag)) onChange([...value, tag]);
  };

  return (
    <div className="flex min-h-[46px] flex-wrap items-center gap-1.5 rounded-xl border border-ink-200/80 bg-white px-3 py-2 shadow-soft transition-all duration-200 focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500/20">
      {value.map((tag) => (
        <span
          key={tag}
          className="inline-flex items-center gap-1.5 rounded-lg bg-brand-50 border border-brand-200/70 px-2.5 py-1 text-xs font-semibold text-brand-700 transition-colors"
        >
          {tag}
          <button
            type="button"
            onClick={() => onChange(value.filter((t) => t !== tag))}
            aria-label={`Remove ${tag}`}
            className="rounded-full p-0.5 text-brand-500 hover:bg-brand-200/60 hover:text-brand-900 transition-colors"
          >
            <X size={12} aria-hidden="true" />
          </button>
        </span>
      ))}
      <input
        placeholder={value.length === 0 ? placeholder : ''}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            addTag(e.currentTarget.value);
            e.currentTarget.value = '';
          } else if (e.key === 'Backspace' && !e.currentTarget.value && value.length) {
            onChange(value.slice(0, -1));
          }
        }}
        onBlur={(e) => {
          if (e.currentTarget.value) {
            addTag(e.currentTarget.value);
            e.currentTarget.value = '';
          }
        }}
        className="min-w-[120px] flex-1 border-0 bg-transparent p-1 text-sm text-ink-900 placeholder:text-ink-400 focus:outline-none focus:ring-0"
      />
    </div>
  );
}

// Like TagInput, but shows a dropdown of matching suggestions as the person types
// (e.g. typing "hi" suggests "Hindi") so they can click/select instead of typing
// the full word. Falls back to adding whatever was typed on Enter, so values not
// in the suggestion list still work.
export function TagAutocompleteInput({ value = [], onChange, suggestions = [], placeholder = 'Add tag...' }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const wrapRef = useRef(null);

  useEffect(() => {
    const onClickOutside = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const filtered = query.trim()
    ? suggestions
        .filter(
          (s) =>
            s.toLowerCase().includes(query.trim().toLowerCase()) &&
            !value.some((v) => v.toLowerCase() === s.toLowerCase())
        )
        .slice(0, 8)
    : [];

  const addTag = (raw) => {
    const tag = raw.trim();
    if (tag && !value.some((v) => v.toLowerCase() === tag.toLowerCase())) onChange([...value, tag]);
    setQuery('');
    setOpen(false);
    setHighlight(0);
  };

  return (
    <div className="relative" ref={wrapRef}>
      <div className="flex min-h-[46px] flex-wrap items-center gap-1.5 rounded-xl border border-ink-200/80 bg-white px-3 py-2 shadow-soft transition-all duration-200 focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500/20">
        {value.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand-50 border border-brand-200/70 px-2.5 py-1 text-xs font-semibold text-brand-700 transition-colors"
          >
            {tag}
            <button
              type="button"
              onClick={() => onChange(value.filter((t) => t !== tag))}
              aria-label={`Remove ${tag}`}
              className="rounded-full p-0.5 text-brand-500 hover:bg-brand-200/60 hover:text-brand-900 transition-colors"
            >
              <X size={12} aria-hidden="true" />
            </button>
          </span>
        ))}
        <input
          value={query}
          placeholder={value.length === 0 ? placeholder : ''}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            setHighlight(0);
          }}
          onFocus={() => query.trim() && setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              setOpen(true);
              setHighlight((h) => Math.min(h + 1, Math.max(filtered.length - 1, 0)));
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              setHighlight((h) => Math.max(h - 1, 0));
            } else if (e.key === 'Enter' || e.key === ',') {
              e.preventDefault();
              if (open && filtered[highlight]) {
                addTag(filtered[highlight]);
              } else {
                addTag(e.currentTarget.value);
              }
            } else if (e.key === 'Backspace' && !query && value.length) {
              onChange(value.slice(0, -1));
            } else if (e.key === 'Escape') {
              setOpen(false);
            }
          }}
          onBlur={() => {
            // Delay so a click on a suggestion registers before the list closes.
            setTimeout(() => setOpen(false), 120);
          }}
          className="min-w-[120px] flex-1 border-0 bg-transparent p-1 text-sm text-ink-900 placeholder:text-ink-400 focus:outline-none focus:ring-0"
        />
      </div>

      {open && filtered.length > 0 && (
        <div className="absolute z-40 mt-1.5 max-h-52 w-full overflow-y-auto rounded-xl border border-ink-200/90 bg-white py-1 shadow-popover">
          {filtered.map((s, i) => (
            <div
              key={s}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => addTag(s)}
              className={`cursor-pointer px-3.5 py-2 text-sm transition-colors ${
                i === highlight ? 'bg-brand-50/70 font-semibold text-brand-800' : 'text-ink-700 hover:bg-ink-50'
              }`}
            >
              {s}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
