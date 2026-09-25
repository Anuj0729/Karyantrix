"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, Newspaper } from "lucide-react";
import api from "../../../lib/api";
import BackButton from "../../../components/BackButton";
import Spinner from "../../../components/ui/Spinner";
import { resolveMediaUrl } from "../../../components/chat/mediaUrl";
import { isRecentlyPublished } from "../../../components/BlogCard";

const formatDate = (value) => {
  if (!value) return "";
  try {
    return new Date(value).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return "";
  }
};

export default function BlogDetailClient({ initialBlog, slug }) {
  const router = useRouter();
  const [blog, setBlog] = useState(initialBlog);
  const [loading, setLoading] = useState(!initialBlog);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (initialBlog) return;
    api
      .get(`/blogs/${slug}`)
      .then(({ data }) => setBlog(data.blog || null))
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [initialBlog, slug]);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Spinner size={26} className="text-brand-600" />
      </div>
    );
  }

  if (notFound || !blog) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-ink-200 bg-white py-16 text-center shadow-card">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-ink-100 text-ink-400">
          <Newspaper size={24} aria-hidden="true" />
        </div>
        <h3 className="font-display text-base font-bold text-ink-800">
          Post not found
        </h3>
        <p className="text-xs text-ink-500">
          This blog post may have been unpublished or removed.
        </p>
        <button
          type="button"
          onClick={() => router.push("/blog")}
          className="mt-2 rounded-xl bg-brand-600 px-4 py-2 text-xs font-semibold text-white hover:bg-brand-700"
        >
          Back to Blog
        </button>
      </div>
    );
  }

  const coverUrl = resolveMediaUrl(blog.cover_image);

  return (
    <article className="mx-auto max-w-3xl">
      <BackButton label="Back to Blog" onClick={() => router.back()} />

      {Array.isArray(blog.tags) && blog.tags.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-1.5">
          {isRecentlyPublished(blog) && (
            <span className="inline-flex items-center gap-1 rounded-full bg-accent-500 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
              New
            </span>
          )}
          {blog.tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center rounded-full bg-brand-50 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-brand-600 ring-1 ring-inset ring-brand-200/60"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      <h1 className="font-display text-2xl font-bold leading-tight tracking-tight text-ink-900 sm:text-3xl">
        {blog.title}
      </h1>

      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs font-medium text-ink-500">
        <span className="flex items-center gap-1.5">
          <CalendarDays size={14} aria-hidden="true" />
          {formatDate(blog.published_at || blog.createdAt)}
        </span>
        {blog.author?.name && <span>by {blog.author.name}</span>}
      </div>

      {coverUrl && (
        <div className="mt-6 overflow-hidden rounded-3xl border border-ink-200/80 shadow-soft">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={coverUrl}
            alt={blog.title}
            className="w-full object-cover"
          />
        </div>
      )}

      <div className="mt-8 max-w-none whitespace-pre-wrap text-[15px] leading-relaxed text-ink-700">
        {blog.content}
      </div>
    </article>
  );
}
