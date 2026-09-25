'use client';

import { memo, useState } from 'react';
import Link from 'next/link';
import { CalendarDays, Newspaper, Sparkles, X } from 'lucide-react';
import Card from './ui/Card';
import Modal from './ui/Modal';
import { resolveMediaUrl } from './chat/mediaUrl';

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export const isRecentlyPublished = (blog) => {
  const publishedAt = blog?.published_at || blog?.createdAt;
  if (!publishedAt) return false;
  return Date.now() - new Date(publishedAt).getTime() < ONE_DAY_MS;
};

const formatDate = (value) => {
  if (!value) return '';
  try {
    return new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return '';
  }
};

function BlogCard({ blog }) {
  const [showMore, setShowMore] = useState(false);
  const coverUrl = resolveMediaUrl(blog.cover_image);
  const tag = Array.isArray(blog.tags) && blog.tags.length > 0 ? blog.tags[0] : null;
  const isNew = isRecentlyPublished(blog);
  const href = `/blog/${blog.slug}`;

  return (
    <>
      <Card
        className="flex h-full flex-col overflow-hidden rounded-3xl border border-ink-200/80 bg-white shadow-soft transition-all duration-300 hover:border-brand-300 hover:shadow-card-hover"
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-30px' }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        hover={false}
      >
        <Link href={href} className="group block">
          <div className="relative aspect-[16/9] w-full overflow-hidden bg-ink-50">
            {coverUrl ? (
              <img
                src={coverUrl}
                alt={blog.title}
                className="h-full w-full object-contain transition-transform duration-500 group-hover:scale-[1.02]"
                loading="lazy"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-brand-50 via-brand-100/70 to-accent-50/50 text-brand-300">
                <Newspaper size={32} aria-hidden="true" />
              </div>
            )}

            {isNew && (
              <span className="absolute left-2.5 top-2.5 inline-flex items-center gap-1 rounded-full bg-accent-500 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white shadow-xs">
                <Sparkles size={10} aria-hidden="true" />
                New
              </span>
            )}

            {tag && (
              <span className="absolute right-2.5 top-2.5 inline-flex items-center rounded-full bg-white/95 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-brand-600 shadow-xs ring-1 ring-inset ring-brand-200/60">
                {tag}
              </span>
            )}
          </div>
        </Link>

        <Link href={href} className="flex flex-1 flex-col gap-2.5 p-5">
          <div className="group">
            <h3 className="font-display text-base font-bold leading-snug text-ink-900 line-clamp-2 group-hover:text-brand-600 transition-colors">
              {blog.title}
            </h3>
          </div>

          {blog.excerpt && (
            <div className="space-y-1.5">
              <p className="line-clamp-2 text-xs leading-relaxed text-ink-500">{blog.excerpt}</p>
              <Link href={href}
                className="text-xs font-bold text-brand-600 hover:text-brand-700"
              >
                Show more
              </Link>
            </div>
          )}

          <div className="mt-auto flex items-center gap-1.5 pt-2 text-[11px] font-medium text-ink-400">
            <CalendarDays size={13} aria-hidden="true" />
            {formatDate(blog.published_at || blog.createdAt)}
            {blog.author?.name && <span>&middot; by {blog.author.name}</span>}
          </div>
        </Link>
      </Card>
    </>
  );
}

export default memo(BlogCard);
