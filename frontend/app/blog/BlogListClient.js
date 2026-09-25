'use client';

import { useEffect, useState } from 'react';
import { Newspaper, Sparkles } from 'lucide-react';
import api from '../../lib/api';
import BlogCard from '../../components/BlogCard';
import { CategoryCardSkeleton } from '../../components/ui/Skeleton';

export default function BlogListClient({ initialBlogs = [] }) {
  const [blogs, setBlogs] = useState(initialBlogs);
  const [loading, setLoading] = useState(initialBlogs.length === 0);

  useEffect(() => {
    if (initialBlogs.length > 0) {
      setLoading(false);
      return;
    }
    api
      .get('/blogs?limit=12')
      .then(({ data }) => setBlogs(data.blogs || []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div className="border-b border-ink-100 pb-5">
        <span className="flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-brand-600 mb-1">
          <Sparkles size={13} /> Karyantrix Blog
        </span>
        <h1 className="font-display text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl">
          Stories, guides &amp; updates
        </h1>
        <p className="mt-1 text-xs text-ink-500 sm:text-sm">
          Curated by our team &mdash; home service tips, provider spotlights and platform news.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {loading && Array.from({ length: 6 }).map((_, i) => <CategoryCardSkeleton key={i} />)}
        {!loading && blogs.map((post) => <BlogCard key={post.id || post.slug} blog={post} />)}
      </div>

      {!loading && blogs.length === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-ink-200 bg-white py-16 text-center shadow-card">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-ink-100 text-ink-400">
            <Newspaper size={24} aria-hidden="true" />
          </div>
          <h3 className="font-display text-base font-bold text-ink-800">No posts published yet</h3>
          <p className="text-xs text-ink-500">Check back soon for updates from our team.</p>
        </div>
      )}
    </div>
  );
}
