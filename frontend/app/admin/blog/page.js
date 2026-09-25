"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  CalendarDays,
  Clock,
  ImagePlus,
  Newspaper,
  Pencil,
  Plus,
  Send,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react";
import api from "../../../lib/api";
import { useToast } from "../../../components/ui/Toast";
import Card from "../../../components/ui/Card";
import Button from "../../../components/ui/Button";
import {
  Field,
  TextInput,
  TextArea,
  TagInput,
} from "../../../components/ui/Field";
import { resolveMediaUrl } from "../../../components/chat/mediaUrl";
import useRefetchOnFocus from "../../../lib/useRefetchOnFocus";
import usePagination from "../../../lib/usePagination";
import Pagination from "../../../components/admin/Pagination";

const slugify = (text = "") =>
  text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

const formatDate = (value) => {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "—";
  }
};

const formatDateTime = (value) => {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
};

const toDatetimeLocal = (value) => {
  const d = value ? new Date(value) : new Date(Date.now() + 5 * 60 * 1000);
  const pad = (n) => String(n).padStart(2, "0");

  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(
    d.getDate(),
  )}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const EMPTY_FORM = {
  title: "",
  slug: "",
  excerpt: "",
  content: "",
  cover_image: "",
  tags: [],
  publishMode: "now",
  scheduled_at: "",
};

function BlogFormModal({ open, onClose, onSaved, blog }) {
  const { toast } = useToast();
  const isEdit = Boolean(blog);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [slugTouched, setSlugTouched] = useState(false);

  useEffect(() => {
    if (!open) return;

    setSlugTouched(false);

    setForm(
      blog
        ? {
            title: blog.title || "",
            slug: blog.slug || "",
            excerpt: blog.excerpt || "",
            content: blog.content || "",
            cover_image: blog.cover_image || "",
            tags: blog.tags || [],
            publishMode: blog.status === "scheduled" ? "schedule" : "now",
            scheduled_at:
              blog.status === "scheduled"
                ? toDatetimeLocal(blog.scheduled_at)
                : "",
          }
        : EMPTY_FORM,
    );
  }, [open, blog]);

  const closeAndReset = () => {
    setForm(EMPTY_FORM);
    onClose();
  };

  const handleDismiss = async () => {
    if (!isEdit && (form.title.trim() || form.content.trim())) {
      try {
        await api.post("/admin/blogs", {
          title: form.title.trim() || "Untitled draft",
          slug: form.slug || undefined,
          excerpt: form.excerpt,
          content: form.content.trim() || " ",
          cover_image: form.cover_image,
          tags: form.tags,
          status: "draft",
        });

        toast("Unsaved post kept as a draft", { type: "info" });
        onSaved();
      } catch {
        // Ignore autosave errors.
      }
    }

    closeAndReset();
  };

  const handleCoverUpload = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";

    if (!file) return;

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("cover", file);

      const { data } = await api.post("/admin/blogs/upload-cover", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      setForm((f) => ({
        ...f,
        cover_image: data.url,
      }));

      toast("Cover image uploaded", { type: "success" });
    } catch (err) {
      toast(err.response?.data?.message || "Could not upload the cover image", {
        type: "error",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (form.publishMode === "schedule" && !form.scheduled_at) {
      toast("Pick a date and time to schedule this post", {
        type: "error",
      });
      return;
    }

    setSaving(true);

    try {
      const scheduling = form.publishMode === "schedule";

      const payload = {
        title: form.title,
        slug: form.slug || slugify(form.title),
        excerpt: form.excerpt,
        content: form.content,
        cover_image: form.cover_image,
        tags: form.tags,
        status: scheduling ? "scheduled" : "published",
        scheduled_at: scheduling
          ? new Date(form.scheduled_at).toISOString()
          : null,
      };

      if (isEdit) {
        await api.put(`/admin/blogs/${blog.id}`, payload);

        toast(scheduling ? "Blog post scheduled" : "Blog post updated", {
          type: "success",
        });
      } else {
        await api.post("/admin/blogs", payload);

        toast(scheduling ? "Blog post scheduled" : "Blog post created", {
          type: "success",
        });
      }

      closeAndReset();
      onSaved();
    } catch (err) {
      toast(
        err.response?.data?.message ||
          `Could not ${isEdit ? "update" : "create"} the post`,
        { type: "error" },
      );
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  const coverPreview = resolveMediaUrl(form.cover_image);

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={handleDismiss}
      >
        <motion.div
          className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-card-hover"
          initial={{ opacity: 0, y: 20, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.98 }}
          transition={{
            duration: 0.2,
            ease: [0.16, 1, 0.3, 1],
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold text-ink-900">
              {isEdit ? "Edit blog post" : "Create blog post"}
            </h2>

            <button
              type="button"
              onClick={handleDismiss}
              aria-label="Close"
              className="rounded-lg p-1 text-ink-400 hover:bg-ink-100"
            >
              <X size={18} aria-hidden="true" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3.5">
            <Field label="Title" required>
              <TextInput
                required
                value={form.title}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    title: e.target.value,
                    slug: slugTouched ? f.slug : slugify(e.target.value),
                  }))
                }
                placeholder="e.g. 5 tips before hiring a home electrician"
              />
            </Field>

            <Field label="Slug" hint="Auto-generated from the title, editable">
              <TextInput
                required
                value={form.slug}
                onChange={(e) => {
                  setSlugTouched(true);
                  setForm((f) => ({
                    ...f,
                    slug: slugify(e.target.value),
                  }));
                }}
              />
            </Field>

            <Field
              label="Excerpt"
              hint="Short summary shown on the blog listing (max 300 characters)"
            >
              <TextArea
                rows={2}
                maxLength={300}
                value={form.excerpt}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    excerpt: e.target.value,
                  }))
                }
              />
            </Field>

            <Field label="Cover image">
              <div className="flex items-center gap-3">
                <div className="flex h-16 w-24 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-ink-200/80 bg-ink-50">
                  {coverPreview ? (
                    <img
                      src={coverPreview}
                      alt="Cover preview"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <ImagePlus
                      size={20}
                      className="text-ink-300"
                      aria-hidden="true"
                    />
                  )}
                </div>

                <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-ink-200/80 bg-white px-3.5 py-2 text-xs font-semibold text-ink-700 shadow-soft hover:bg-ink-50">
                  <UploadCloud size={14} aria-hidden="true" />
                  {uploading
                    ? "Uploading..."
                    : coverPreview
                      ? "Replace image"
                      : "Upload image"}

                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleCoverUpload}
                    disabled={uploading}
                  />
                </label>

                {coverPreview && (
                  <button
                    type="button"
                    onClick={() =>
                      setForm((f) => ({
                        ...f,
                        cover_image: "",
                      }))
                    }
                    className="text-xs font-semibold text-rose-600 hover:text-rose-700"
                  >
                    Remove
                  </button>
                )}
              </div>
            </Field>

            <Field label="Tags" hint="Press Enter or comma to add a tag">
              <TagInput
                value={form.tags}
                onChange={(tags) =>
                  setForm((f) => ({
                    ...f,
                    tags,
                  }))
                }
                placeholder="e.g. home-repair"
              />
            </Field>

            <Field
              label="Content"
              required
              hint="Plain text — line breaks are preserved on the published page"
            >
              <TextArea
                required
                rows={10}
                value={form.content}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    content: e.target.value,
                  }))
                }
                placeholder="Write the full article here..."
              />
            </Field>

            <Field label="Publish">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setForm((f) => ({
                      ...f,
                      publishMode: "now",
                    }))
                  }
                  className={`flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2.5 text-xs font-semibold transition-colors ${
                    form.publishMode === "now"
                      ? "border-brand-500 bg-brand-50 text-brand-700"
                      : "border-ink-200/80 bg-white text-ink-600 hover:bg-ink-50"
                  }`}
                >
                  <Send size={14} aria-hidden="true" />
                  Publish now
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setForm((f) => ({
                      ...f,
                      publishMode: "schedule",
                      scheduled_at: f.scheduled_at || toDatetimeLocal(),
                    }))
                  }
                  className={`flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2.5 text-xs font-semibold transition-colors ${
                    form.publishMode === "schedule"
                      ? "border-brand-500 bg-brand-50 text-brand-700"
                      : "border-ink-200/80 bg-white text-ink-600 hover:bg-ink-50"
                  }`}
                >
                  <Clock size={14} aria-hidden="true" />
                  Schedule for later
                </button>
              </div>
            </Field>

            {form.publishMode === "schedule" && (
              <Field
                label="Publish date & time"
                required
                hint="Stays hidden from everyone until this moment, then goes live on its own"
              >
                <TextInput
                  type="datetime-local"
                  required
                  min={toDatetimeLocal()}
                  value={form.scheduled_at}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      scheduled_at: e.target.value,
                    }))
                  }
                />
              </Field>
            )}

            <Button
              type="submit"
              loading={saving}
              disabled={uploading}
              fullWidth
            >
              {isEdit
                ? form.publishMode === "schedule"
                  ? "Save & schedule"
                  : "Save changes"
                : form.publishMode === "schedule"
                  ? "Schedule post"
                  : "Create post"}
            </Button>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function DeleteBlogModal({ blog, onClose, onConfirm, deleting }) {
  if (!blog) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="w-full max-w-sm rounded-3xl border border-ink-100 bg-white p-6 text-center shadow-modal"
          initial={{ opacity: 0, y: 16, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.96 }}
          transition={{
            duration: 0.2,
            ease: [0.16, 1, 0.3, 1],
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-rose-100 bg-rose-50 text-rose-600">
            <AlertTriangle size={24} aria-hidden="true" />
          </div>

          <h3 className="font-display text-lg font-bold text-ink-900">
            Delete "{blog.title}"?
          </h3>

          <p className="mt-1.5 text-xs leading-relaxed text-ink-500">
            This permanently removes the post. It will immediately disappear
            from the public blog for everyone.
          </p>

          <div className="mt-6 flex items-center gap-3">
            <Button
              variant="secondary"
              fullWidth
              onClick={onClose}
              disabled={deleting}
            >
              Cancel
            </Button>

            <Button
              variant="danger"
              fullWidth
              loading={deleting}
              onClick={onConfirm}
            >
              Delete
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

const STATUS_BADGE_STYLES = {
  published: "bg-trust-50 text-trust-700 border-trust-200/60",
  scheduled: "bg-sky-50 text-sky-700 border-sky-200/60",
  draft: "bg-amber-50 text-amber-700 border-amber-200/60",
};

const STATUS_DOT_STYLES = {
  published: "bg-trust-500",
  scheduled: "bg-sky-500",
  draft: "bg-amber-500",
};

const STATUS_LABELS = {
  published: "Published",
  scheduled: "Scheduled",
  draft: "Draft",
};

function BlogCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-3xl border border-ink-200/80 bg-white shadow-soft">
      <div className="aspect-[16/9] w-full animate-pulse bg-ink-100" />

      <div className="space-y-2.5 p-5">
        <div className="h-4 w-3/4 animate-pulse rounded bg-ink-100" />
        <div className="h-3 w-full animate-pulse rounded bg-ink-100" />
        <div className="h-3 w-1/2 animate-pulse rounded bg-ink-100" />
      </div>
    </div>
  );
}

function AdminBlogCard({ blog, onEdit, onDelete }) {
  const router = useRouter();
  const coverUrl = resolveMediaUrl(blog.cover_image);
  const status = blog.status || "draft";

  const handleCardClick = () => {
    if (status === "published" && blog.slug) {
      router.push(`/blog/${blog.slug}`);
    }
  };

  return (
    <Card
      className={`group flex h-full flex-col overflow-hidden rounded-3xl border border-ink-200/80 bg-white shadow-soft transition-all duration-300 ${
        status === "published"
          ? "cursor-pointer hover:border-brand-300 hover:shadow-card-hover"
          : ""
      }`}
      hover={false}
      onClick={handleCardClick}
    >
      <div className="relative aspect-[16/9] w-full overflow-hidden bg-ink-50">
        {coverUrl ? (
          <img
            src={coverUrl}
            alt={blog.title}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-brand-50 via-brand-100/70 to-accent-50/50 text-brand-300">
            <Newspaper size={32} aria-hidden="true" />
          </div>
        )}

        <span
          className={`absolute left-2.5 top-2.5 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide shadow-xs ${STATUS_BADGE_STYLES[status]}`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT_STYLES[status]}`}
          />
          {STATUS_LABELS[status]}
        </span>

        <div className="absolute right-2.5 top-2.5 flex items-center gap-1.5 opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100 focus-within:opacity-100">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(blog);
            }}
            aria-label={`Edit ${blog.title}`}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/95 text-ink-500 shadow-xs transition-colors hover:bg-white hover:text-ink-800"
          >
            <Pencil size={14} aria-hidden="true" />
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(blog);
            }}
            aria-label={`Delete ${blog.title}`}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/95 text-rose-500 shadow-xs transition-colors hover:bg-white hover:text-rose-600"
          >
            <Trash2 size={14} aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-5">
        <h3 className="line-clamp-2 font-display text-base font-bold leading-snug text-ink-900">
          {blog.title}
        </h3>

        {blog.excerpt && (
          <p className="line-clamp-2 text-xs leading-relaxed text-ink-500">
            {blog.excerpt}
          </p>
        )}

        <div className="mt-auto flex items-center gap-2 pt-2 text-[11px] font-medium text-ink-400">
          <span className="flex items-center gap-1.5">
            {status === "scheduled" ? (
              <>
                <Clock size={12} aria-hidden="true" />
                Goes live {formatDateTime(blog.scheduled_at)}
                {blog.author?.name && (
                  <span>&middot; by {blog.author.name}</span>
                )}
              </>
            ) : (
              <>
                <CalendarDays size={12} aria-hidden="true" />
                {formatDate(blog.published_at || blog.createdAt)}
                {blog.author?.name && (
                  <span>&middot; by {blog.author.name}</span>
                )}
              </>
            )}
          </span>
        </div>
      </div>
    </Card>
  );
}

const STATUS_FILTERS = [
  { value: "all", label: "All" },
  { value: "published", label: "Published" },
  { value: "scheduled", label: "Scheduled" },
  { value: "draft", label: "Draft" },
];

function AdminBlogContent() {
  const { toast } = useToast();
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [blogToEdit, setBlogToEdit] = useState(null);
  const [blogToDelete, setBlogToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [statusFilter, setStatusFilter] = useState("published");

  const fetchBlogs = async () => {
    try {
      const { data } = await api.get("/admin/blogs");
      setBlogs(data.blogs || []);
    } catch {
      toast("Could not load blog posts", { type: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBlogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useRefetchOnFocus(fetchBlogs);

  const filteredBlogs = useMemo(
    () =>
      blogs.filter((b) => statusFilter === "all" || b.status === statusFilter),
    [blogs, statusFilter],
  );

  const pager = usePagination(filteredBlogs, {
    resetKey: statusFilter,
  });

  const handleDelete = async () => {
    if (!blogToDelete) return;

    setDeleting(true);

    try {
      await api.delete(`/admin/blogs/${blogToDelete.id}`);

      toast("Blog post deleted", {
        type: "success",
      });

      setBlogToDelete(null);
      fetchBlogs();
    } catch (err) {
      toast(err.response?.data?.message || "Could not delete the post", {
        type: "error",
      });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-xl font-bold tracking-tight text-ink-900 sm:text-2xl">
            Blog
          </h1>

          <p className="mt-0.5 text-xs text-ink-500 sm:text-sm">
            Only admins and staff can create, edit or delete posts. Published
            posts are visible to every visitor, customer and provider.
          </p>
        </div>

        <Button icon={<Plus size={16} />} onClick={() => setCreateOpen(true)}>
          New post
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {STATUS_FILTERS.map((f) => {
          const count =
            f.value === "all"
              ? blogs.length
              : blogs.filter((blog) => blog.status === f.value).length;

          const isActive = statusFilter === f.value;

          return (
            <button
              key={f.value}
              type="button"
              onClick={() => setStatusFilter(f.value)}
              className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                isActive
                  ? "bg-brand-600 text-white"
                  : "bg-ink-100 text-ink-600 hover:bg-ink-200"
              }`}
            >
              <span>{f.label}</span>

              <span
                className={`inline-flex min-w-[20px] items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                  isActive
                    ? "bg-white/20 text-white"
                    : "bg-white text-ink-500 shadow-xs"
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <BlogCardSkeleton key={i} />
          ))}
        </div>
      ) : filteredBlogs.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-ink-200 bg-white py-16 text-center shadow-card">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-ink-100 text-ink-400">
            <Newspaper size={24} aria-hidden="true" />
          </div>

          <h3 className="font-display text-base font-bold text-ink-800">
            No posts yet
          </h3>

          <p className="text-xs text-ink-500">
            Create your first blog post to publish it to everyone.
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {pager.pageItems.map((blog) => (
              <AdminBlogCard
                key={blog.id}
                blog={blog}
                onEdit={setBlogToEdit}
                onDelete={setBlogToDelete}
              />
            ))}
          </div>

          <Pagination pager={pager} label="posts" />
        </>
      )}

      <BlogFormModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSaved={fetchBlogs}
      />

      <BlogFormModal
        open={Boolean(blogToEdit)}
        blog={blogToEdit}
        onClose={() => setBlogToEdit(null)}
        onSaved={fetchBlogs}
      />

      <DeleteBlogModal
        blog={blogToDelete}
        onClose={() => setBlogToDelete(null)}
        onConfirm={handleDelete}
        deleting={deleting}
      />
    </div>
  );
}

export default function AdminBlogPage() {
  return <AdminBlogContent />;
}
