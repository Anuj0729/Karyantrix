'use client';

import { Star } from 'lucide-react';

export default function StarRating({ value = 0, onChange, readOnly = false, size = 'w-4 h-4' }) {
  const stars = [1, 2, 3, 4, 5];

  return (
    <div className="inline-flex items-center gap-px">
      {stars.map((n) => {
        const filled = n <= Math.round(value || 0);
        return (
          <button
            key={n}
            type="button"
            disabled={readOnly}
            onClick={() => onChange?.(n)}
            className={readOnly ? 'cursor-default' : 'cursor-pointer'}
            aria-label={`${n} star`}
          >
            <Star className={`${size} ${filled ? 'fill-gold-500 text-gold-500' : 'text-ink-300'}`} />
          </button>
        );
      })}
    </div>
  );
}
