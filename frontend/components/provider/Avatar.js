'use client';

import { useState } from 'react';

const initialOf = (name) => (name ? name.trim().charAt(0).toUpperCase() : '?');

export default function Avatar({ src, name, size = 'w-10 h-10', textSize = 'text-sm' }) {
  const [failed, setFailed] = useState(false);
  const showImage = src && !failed;

  return showImage ? (
    <img
      src={src}
      alt={name || 'avatar'}
      className={`${size} rounded-full object-cover border border-ink-100 flex-shrink-0`}
      onError={() => setFailed(true)}
      loading="lazy"
      decoding="async"
    />
  ) : (
    <div
      className={`${size} ${textSize} rounded-full bg-brand-50 text-brand-700 font-semibold flex items-center justify-center border border-ink-100 flex-shrink-0`}
    >
      {initialOf(name)}
    </div>
  );
}
