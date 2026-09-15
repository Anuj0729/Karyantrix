'use client';

import { formatDayLabel, formatFullTimestamp } from '../../lib/chatDate';

/**
 * WhatsApp-style sticky day separator shown above the first message of each day.
 */
export default function DateDivider({ date }) {
  const label = formatDayLabel(date);
  if (!label) return null;

  return (
    <div className="sticky top-1 z-10 flex justify-center py-1 select-none">
      <span
        title={formatFullTimestamp(date)}
        className="rounded-full border border-ink-200/70 bg-white/90 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-ink-500 shadow-xs backdrop-blur-sm"
      >
        {label}
      </span>
    </div>
  );
}
