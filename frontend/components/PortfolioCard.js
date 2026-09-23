'use client';

import { useRouter } from 'next/navigation';
import { ImageOff } from 'lucide-react';
import Badge from './ui/Badge';
import Card from './ui/Card';
import { resolveMediaUrl } from './chat/mediaUrl';

export default function PortfolioCard({ item, providerId, className = '' }) {
  const router = useRouter();
  const portfolioId = item?.id || item?._id;
  const href = providerId && portfolioId ? `/providers/${providerId}/portfolio/${portfolioId}` : null;

  const openDetail = () => {
    if (href) router.push(href);
  };

  return (
    <Card
      className={`group relative flex h-full flex-col overflow-hidden border border-ink-200/80 bg-white shadow-soft hover:shadow-card-hover transition-all duration-300 rounded-3xl ${
        href ? 'cursor-pointer' : ''
      } ${className}`}
      onClick={openDetail}
      role={href ? 'button' : undefined}
      tabIndex={href ? 0 : undefined}
      onKeyDown={(e) => {
        if (!href) return;
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openDetail();
        }
      }}
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="h-40 w-full shrink-0 overflow-hidden bg-ink-100 sm:h-44">
        {item?.image_url ? (
          <img
            src={resolveMediaUrl(item.image_url)}
            alt={item.title || 'Portfolio work'}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-ink-300">
            <ImageOff size={22} aria-hidden="true" />
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-1.5 p-4">
        <Badge tone="brand" size="sm" className="self-start font-medium">
          Portfolio
        </Badge>
        <p className="text-sm font-bold leading-snug text-ink-900 line-clamp-1">
          {item?.title || 'Untitled work'}
        </p>
        {item?.description && (
          <p className="line-clamp-2 text-xs leading-relaxed text-ink-600">{item.description}</p>
        )}
        {href && (
          <span className="mt-auto pt-1 text-xs font-semibold text-brand-600 group-hover:underline">
            See more
          </span>
        )}
      </div>
    </Card>
  );
}
