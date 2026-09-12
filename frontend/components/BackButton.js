'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

export default function BackButton({ href, label = 'Back', className = '' }) {
  const router = useRouter();

  const handleClick = () => {
    if (href) router.push(href);
    else router.back();
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-ink-500 transition-colors hover:text-brand-600 ${className}`}
    >
      <ArrowLeft size={16} aria-hidden="true" />
      {label}
    </button>
  );
}
