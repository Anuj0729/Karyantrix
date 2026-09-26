"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CalendarDays, MessageSquare, Newspaper, Send, Trash2 } from "lucide-react";
import api from "../../../lib/api";
import { getSocket } from "../../../lib/socket";
import BackButton from "../../../components/BackButton";
import Spinner from "../../../components/ui/Spinner";
import { TextArea } from "../../../components/ui/Field";
import Button from "../../../components/ui/Button";
import { useAuth } from "../../../context/AuthContext";
import { useToast } from "../../../components/ui/Toast";
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

function ConfirmModal({
  open,
  title,
  message,
  confirmText = "Delete",
  loading = false,
  onConfirm,
  onCancel,
}) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !loading) {
          onCancel();
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
        className="w-full max-w-sm rounded-3xl border border-ink-100 bg-white p-5 shadow-2xl"
      >
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-danger-50 text-danger-600">
            <Trash2 size={18} aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h3
              id="confirm-modal-title"
              className="font-display text-base font-bold text-ink-900"
            >
              {title}
            </h3>
            <p className="mt-1.5 text-xs leading-relaxed text-ink-500">
              {message}
            </p>
          </div>
        </div>
        <div className="mt-5 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="rounded-xl px-3.5 py-2 text-xs font-semibold text-ink-500 transition-colors hover:bg-ink-50 hover:text-ink-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-xl bg-red-600 px-3.5 py-2 text-xs font-bold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading && (
              <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/40 border-t-white" />
            )}
            {loading ? "Deleting..." : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

function Avatar({ name, className = "h-8 w-8 text-xs" }) {
  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-lg bg-gradient-to-tr from-brand-600 to-accent-500 font-bold text-white shadow-xs ${className}`}
    >
      {name ? name[0].toUpperCase() : "U"}
    </div>
  );
}

function SuggestionItem({
  suggestion,
  slug,
  currentUser,
  onSuggestionUpdated,
  onSuggestionDeleted,
  onReplyAdded,
  onReplyUpdated,
  onReplyDeleted,
}) {
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(suggestion.message);
  const [savingEdit, setSavingEdit] = useState(false);

  const [showReplyForm, setShowReplyForm] = useState(false);
  const [replyValue, setReplyValue] = useState("");
  const [sendingReply, setSendingReply] = useState(false);

  const [editingReplyId, setEditingReplyId] = useState(null);
  const [editReplyValue, setEditReplyValue] = useState("");
  const [savingReply, setSavingReply] = useState(false);

  // Delete-confirmation state: one flag for the suggestion itself, and the
  // target reply (if any) currently pending confirmation.
  const [confirmDeleteSuggestion, setConfirmDeleteSuggestion] = useState(false);
  const [deletingSuggestion, setDeletingSuggestion] = useState(false);
  const [replyPendingDelete, setReplyPendingDelete] = useState(null);
  const [deletingReply, setDeletingReply] = useState(false);

  const isOwner = !!currentUser && suggestion.user?.id === currentUser.id;
  const canModerate =
    !!currentUser &&
    (currentUser.role === "admin" || currentUser.role === "staff");
  const replies = suggestion.replies || [];
  // Only one reply allowed per suggestion — once it has a reply, no more.
  const canReply = canModerate && replies.length === 0;

  const submitEdit = async () => {
    const trimmed = editValue.trim();
    if (!trimmed) return;
    setSavingEdit(true);
    try {
      const { data } = await api.put(
        `/blogs/${slug}/suggestions/${suggestion.id}`,
        { message: trimmed },
      );
      onSuggestionUpdated(data.suggestion);
      setIsEditing(false);
    } catch (err) {
      toast(err.response?.data?.message || "Could not update your suggestion", {
        type: "error",
      });
    } finally {
      setSavingEdit(false);
    }
  };

  const submitReply = async () => {
    const trimmed = replyValue.trim();
    if (!trimmed) return;
    setSendingReply(true);
    try {
      const { data } = await api.post(
        `/blogs/${slug}/suggestions/${suggestion.id}/replies`,
        {
          message: trimmed,
        },
      );
      onReplyAdded(suggestion.id, data.reply);
      setReplyValue("");
      setShowReplyForm(false);
    } catch (err) {
      toast(err.response?.data?.message || "Could not send your reply", {
        type: "error",
      });
    } finally {
      setSendingReply(false);
    }
  };

  const startEditReply = (reply) => {
    setEditingReplyId(reply.id);
    setEditReplyValue(reply.message);
  };

  const submitReplyEdit = async (replyId) => {
    const trimmed = editReplyValue.trim();
    if (!trimmed) return;
    setSavingReply(true);
    try {
      const { data } = await api.put(
        `/blogs/${slug}/suggestions/${suggestion.id}/replies/${replyId}`,
        { message: trimmed },
      );
      onReplyUpdated(suggestion.id, data.reply);
      setEditingReplyId(null);
    } catch (err) {
      toast(err.response?.data?.message || "Could not update your reply", {
        type: "error",
      });
    } finally {
      setSavingReply(false);
    }
  };

  const confirmAndDeleteSuggestion = async () => {
    setDeletingSuggestion(true);
    try {
      await api.delete(`/blogs/${slug}/suggestions/${suggestion.id}`);
      onSuggestionDeleted(suggestion.id);
      toast("Suggestion deleted", { type: "success" });
    } catch (err) {
      toast(err.response?.data?.message || "Could not delete this suggestion", {
        type: "error",
      });
    } finally {
      setDeletingSuggestion(false);
      setConfirmDeleteSuggestion(false);
    }
  };

  const confirmAndDeleteReply = async () => {
    if (!replyPendingDelete) return;
    setDeletingReply(true);
    try {
      await api.delete(
        `/blogs/${slug}/suggestions/${suggestion.id}/replies/${replyPendingDelete.id}`,
      );
      onReplyDeleted(suggestion.id, replyPendingDelete.id);
      toast("Reply deleted", { type: "success" });
    } catch (err) {
      toast(err.response?.data?.message || "Could not delete this reply", {
        type: "error",
      });
    } finally {
      setDeletingReply(false);
      setReplyPendingDelete(null);
    }
  };

  return (
    <li className="rounded-2xl bg-ink-50/70 p-4">
      <div className="flex items-start gap-3">
        <Avatar name={suggestion.user?.name} className="h-9 w-9 text-xs" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-0.5">
            <span className="text-xs font-bold text-ink-800">
              {suggestion.user?.name || "Anonymous"}
            </span>
            <span className="text-[10px] text-ink-400">
              {formatDate(suggestion.createdAt)}
              {suggestion.edited && " · edited"}
            </span>
          </div>

          {isEditing ? (
            <div className="mt-2 space-y-2">
              <TextArea
                rows={3}
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                maxLength={1000}
                autoFocus
              />
              <div className="flex items-center gap-3">
                <Button size="sm" onClick={submitEdit} loading={savingEdit}>
                  Save
                </Button>
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(false);
                    setEditValue(suggestion.message);
                  }}
                  className="text-xs font-semibold text-ink-500 hover:text-ink-700"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <p className="mt-1 text-xs leading-relaxed text-ink-600 whitespace-pre-wrap">
              {suggestion.message}
            </p>
          )}

          {!isEditing && (isOwner || canReply) && (
            <div className="mt-2 flex items-center gap-4">
              {isOwner && (
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="text-[11px] font-bold text-brand-600 hover:text-brand-700"
                >
                  Edit
                </button>
              )}
              {canReply && !showReplyForm && (
                <button
                  type="button"
                  onClick={() => setShowReplyForm(true)}
                  className="text-[11px] font-bold text-brand-600 hover:text-brand-700"
                >
                  Reply
                </button>
              )}
              {isOwner && (
                <button
                  type="button"
                  onClick={() => setConfirmDeleteSuggestion(true)}
                  className="text-[11px] font-bold text-danger-600 hover:text-danger-700"
                >
                  Delete
                </button>
              )}
            </div>
          )}

          {replies.length > 0 && (
            <ul className="mt-3 space-y-2.5 border-l-2 border-brand-200/60 pl-3.5">
              {replies.map((r) => {
                const replyIsOwner =
                  !!currentUser && r.user?.id === currentUser.id;
                const isTeam =
                  r.user?.role === "admin" || r.user?.role === "staff";
                const isEditingThisReply = editingReplyId === r.id;
                return (
                  <li
                    key={r.id}
                    className="rounded-xl bg-white p-2.5 ring-1 ring-inset ring-ink-100"
                  >
                    <div className="flex items-start gap-2">
                      <Avatar
                        name={r.user?.name}
                        className="h-6 w-6 text-[10px]"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-[11px] font-bold text-ink-800">
                            {r.user?.name || "Team"}
                          </span>
                          {isTeam && (
                            <span className="rounded-full bg-brand-50 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-brand-600 ring-1 ring-inset ring-brand-200/60">
                              Team
                            </span>
                          )}
                          <span className="text-[10px] text-ink-400">
                            {formatDate(r.createdAt)}
                            {r.edited && " · edited"}
                          </span>
                        </div>

                        {isEditingThisReply ? (
                          <div className="mt-1.5 space-y-1.5">
                            <TextArea
                              rows={2}
                              value={editReplyValue}
                              onChange={(e) =>
                                setEditReplyValue(e.target.value)
                              }
                              maxLength={1000}
                              autoFocus
                            />
                            <div className="flex items-center gap-3">
                              <Button
                                size="sm"
                                onClick={() => submitReplyEdit(r.id)}
                                loading={savingReply}
                              >
                                Save
                              </Button>
                              <button
                                type="button"
                                onClick={() => setEditingReplyId(null)}
                                className="text-xs font-semibold text-ink-500 hover:text-ink-700"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <p className="mt-1 text-[11px] leading-relaxed text-ink-600 whitespace-pre-wrap">
                            {r.message}
                          </p>
                        )}

                        {!isEditingThisReply && replyIsOwner && (
                          <div className="mt-1 flex items-center gap-3">
                            <button
                              type="button"
                              onClick={() => startEditReply(r)}
                              className="text-[10px] font-bold text-brand-600 hover:text-brand-700"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => setReplyPendingDelete(r)}
                              className="text-[10px] font-bold text-danger-600 hover:text-danger-700"
                            >
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          {showReplyForm && (
            <div className="mt-3 space-y-1.5">
              <TextArea
                rows={2}
                value={replyValue}
                onChange={(e) => setReplyValue(e.target.value)}
                placeholder="Reply as Karyantrix team..."
                maxLength={1000}
                autoFocus
              />
              <div className="flex items-center gap-3">
                <Button
                  size="sm"
                  onClick={submitReply}
                  loading={sendingReply}
                  icon={<Send size={12} aria-hidden="true" />}
                >
                  Send reply
                </Button>
                <button
                  type="button"
                  onClick={() => {
                    setShowReplyForm(false);
                    setReplyValue("");
                  }}
                  className="text-xs font-semibold text-ink-500 hover:text-ink-700"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <ConfirmModal
        open={confirmDeleteSuggestion}
        loading={deletingSuggestion}
        title="Delete this suggestion?"
        message="This will permanently remove the suggestion and any replies to it. This can't be undone."
        onConfirm={confirmAndDeleteSuggestion}
        onCancel={() => setConfirmDeleteSuggestion(false)}
      />

      <ConfirmModal
        open={!!replyPendingDelete}
        loading={deletingReply}
        title="Delete this reply?"
        message="This will permanently remove the reply. This can't be undone."
        onConfirm={confirmAndDeleteReply}
        onCancel={() => setReplyPendingDelete(null)}
      />
    </li>
  );
}

function SuggestionsPanel({ slug }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [suggestions, setSuggestions] = useState([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    api
      .get(`/blogs/${slug}/suggestions`)
      .then(({ data }) => {
        if (!active) return;
        setSuggestions(data.suggestions || []);
        setCount(data.count || 0);
      })
      .catch(() => {})
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [slug]);

  // Real-time: join this post's room and react to broadcast events so new
  // suggestions/replies/deletes from other readers show up instantly. A live
  // socket only exists for signed-in users (see AuthContext), so signed-out
  // visitors simply see the page as it loaded — everything else here still
  // works.
  useEffect(() => {
    if (!user) return;
    const socket = getSocket();
    if (!socket) return;

    socket.emit("blog:join", { slug });

    const onNew = (payload) => {
      if (payload.slug !== slug) return;
      setSuggestions((prev) =>
        prev.some((s) => s.id === payload.suggestion.id)
          ? prev
          : [payload.suggestion, ...prev],
      );
      setCount(payload.count);
    };
    const onUpdate = (payload) => {
      if (payload.slug !== slug) return;
      setSuggestions((prev) =>
        prev.map((s) =>
          s.id === payload.suggestion.id ? payload.suggestion : s,
        ),
      );
    };
    const onDelete = (payload) => {
      if (payload.slug !== slug) return;
      setSuggestions((prev) => prev.filter((s) => s.id !== payload.suggestionId));
      if (typeof payload.count === "number") setCount(payload.count);
    };
    const onReply = (payload) => {
      if (payload.slug !== slug) return;
      setSuggestions((prev) =>
        prev.map((s) =>
          s.id === payload.suggestionId
            ? {
                ...s,
                replies: (s.replies || []).some(
                  (r) => r.id === payload.reply.id,
                )
                  ? s.replies
                  : [...(s.replies || []), payload.reply],
              }
            : s,
        ),
      );
    };
    const onReplyUpdate = (payload) => {
      if (payload.slug !== slug) return;
      setSuggestions((prev) =>
        prev.map((s) =>
          s.id === payload.suggestionId
            ? {
                ...s,
                replies: (s.replies || []).map((r) =>
                  r.id === payload.reply.id ? payload.reply : r,
                ),
              }
            : s,
        ),
      );
    };
    const onReplyDelete = (payload) => {
      if (payload.slug !== slug) return;
      setSuggestions((prev) =>
        prev.map((s) =>
          s.id === payload.suggestionId
            ? {
                ...s,
                replies: (s.replies || []).filter(
                  (r) => r.id !== payload.replyId,
                ),
              }
            : s,
        ),
      );
    };

    socket.on("blog:suggestion:new", onNew);
    socket.on("blog:suggestion:update", onUpdate);
    socket.on("blog:suggestion:delete", onDelete);
    socket.on("blog:suggestion:reply", onReply);
    socket.on("blog:suggestion:reply:update", onReplyUpdate);
    socket.on("blog:suggestion:reply:delete", onReplyDelete);

    return () => {
      socket.emit("blog:leave", { slug });
      socket.off("blog:suggestion:new", onNew);
      socket.off("blog:suggestion:update", onUpdate);
      socket.off("blog:suggestion:delete", onDelete);
      socket.off("blog:suggestion:reply", onReply);
      socket.off("blog:suggestion:reply:update", onReplyUpdate);
      socket.off("blog:suggestion:reply:delete", onReplyDelete);
    };
  }, [slug, user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = message.trim();
    if (!trimmed) return;
    setError("");
    setSubmitting(true);
    try {
      const { data } = await api.post(`/blogs/${slug}/suggestions`, {
        message: trimmed,
      });
      setSuggestions((prev) =>
        prev.some((s) => s.id === data.suggestion.id)
          ? prev
          : [data.suggestion, ...prev],
      );
      setCount(data.count);
      setMessage("");
      toast("Thanks for your suggestion!", { type: "success" });
    } catch (err) {
      setError(
        err.response?.data?.message || "Could not submit your suggestion",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleSuggestionUpdated = (updated) => {
    setSuggestions((prev) =>
      prev.map((s) => (s.id === updated.id ? updated : s)),
    );
  };
  const handleSuggestionDeleted = (id) => {
    setSuggestions((prev) => prev.filter((s) => s.id !== id));
    setCount((prev) => Math.max(0, prev - 1));
  };
  const handleReplyAdded = (suggestionId, reply) => {
    setSuggestions((prev) =>
      prev.map((s) =>
        s.id === suggestionId
          ? { ...s, replies: [...(s.replies || []), reply] }
          : s,
      ),
    );
  };
  const handleReplyUpdated = (suggestionId, reply) => {
    setSuggestions((prev) =>
      prev.map((s) =>
        s.id === suggestionId
          ? {
              ...s,
              replies: (s.replies || []).map((r) =>
                r.id === reply.id ? reply : r,
              ),
            }
          : s,
      ),
    );
  };
  const handleReplyDeleted = (suggestionId, replyId) => {
    setSuggestions((prev) =>
      prev.map((s) =>
        s.id === suggestionId
          ? {
              ...s,
              replies: (s.replies || []).filter((r) => r.id !== replyId),
            }
          : s,
      ),
    );
  };

  return (
    <section className="mt-10 rounded-3xl border border-ink-100 bg-white p-5 shadow-card sm:p-6">
      <div className="flex items-center justify-between border-b border-ink-100 pb-3 mb-5">
        <span className="flex items-center gap-1.5 font-display text-sm font-bold text-ink-900">
          <MessageSquare
            size={15}
            className="text-brand-600"
            aria-hidden="true"
          />
          Suggestions
        </span>
        <span className="inline-flex items-center justify-center rounded-full bg-brand-50 px-2.5 py-0.5 text-[11px] font-bold text-brand-700 ring-1 ring-inset ring-brand-200/60">
          {count}
        </span>
      </div>

      {user ? (
        <form onSubmit={handleSubmit} className="mb-6 max-w-xl space-y-2.5">
          <TextArea
            rows={3}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Share feedback or a suggestion about this post..."
            maxLength={1000}
          />
          {error && (
            <p className="text-xs font-medium text-danger-600">{error}</p>
          )}
          <Button
            type="submit"
            size="sm"
            loading={submitting}
            icon={<Send size={13} aria-hidden="true" />}
          >
            Submit suggestion
          </Button>
        </form>
      ) : (
        <p className="mb-6 max-w-xl rounded-2xl bg-ink-50 px-3.5 py-3 text-xs text-ink-500">
          Sign in to leave a suggestion on this post.
        </p>
      )}

      {loading && (
        <div className="flex justify-center py-6">
          <Spinner size={20} className="text-brand-600" />
        </div>
      )}

      {!loading && suggestions.length === 0 && (
        <p className="text-xs text-ink-400 text-center py-4">
          No suggestions yet. Be the first!
        </p>
      )}

      {!loading && suggestions.length > 0 && (
        <ul className="space-y-3">
          {suggestions.map((s) => (
            <SuggestionItem
              key={s.id}
              suggestion={s}
              slug={slug}
              currentUser={user}
              onSuggestionUpdated={handleSuggestionUpdated}
              onSuggestionDeleted={handleSuggestionDeleted}
              onReplyAdded={handleReplyAdded}
              onReplyUpdated={handleReplyUpdated}
              onReplyDeleted={handleReplyDeleted}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

function RelatedBlogsPanel({ slug, tag }) {
  const [related, setRelated] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);

    const load = async () => {
      try {
        let list = [];

        if (tag) {
          const { data } = await api.get("/blogs", {
            params: { tag, limit: 6 },
          });
          list = (data.blogs || []).filter((b) => b.slug !== slug);
        }

        if (list.length < 5) {
          const { data } = await api.get("/blogs", { params: { limit: 8 } });
          const extra = (data.blogs || []).filter(
            (b) => b.slug !== slug && !list.some((l) => l.slug === b.slug),
          );
          list = [...list, ...extra];
        }

        if (active) setRelated(list.slice(0, 5));
      } catch {
        // Silently show an empty state below if this fails.
      } finally {
        if (active) setLoading(false);
      }
    };

    load();
    return () => {
      active = false;
    };
  }, [slug, tag]);

  return (
    <aside className="lg:sticky lg:top-20 rounded-3xl border border-ink-100 bg-white p-6 shadow-card">
      <div className="flex items-center gap-1.5 border-b border-ink-100 pb-3 mb-4 font-display text-sm font-bold text-ink-900">
        <Newspaper size={15} className="text-brand-600" aria-hidden="true" />
        Related Blogs
      </div>

      {loading && (
        <div className="flex justify-center py-6">
          <Spinner size={20} className="text-brand-600" />
        </div>
      )}

      {!loading && related.length === 0 && (
        <p className="text-xs text-ink-400 text-center py-4">
          No other posts to show yet.
        </p>
      )}

      {!loading && related.length > 0 && (
        <ul className="space-y-3">
          {related.map((post) => {
            const coverUrl = resolveMediaUrl(post.cover_image);
            return (
              <li key={post.id || post.slug}>
                <Link
                  href={`/blog/${post.slug}`}
                  className="group flex gap-3 rounded-2xl p-2 -m-2 transition-colors hover:bg-ink-50"
                >
                  <div className="relative h-24 w-32 flex-shrink-0 overflow-hidden rounded-xl bg-ink-50 ring-1 ring-inset ring-ink-100">
                    {coverUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={coverUrl}
                        alt={post.title}
                        className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-105"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-brand-300">
                        <Newspaper size={20} aria-hidden="true" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="font-display text-sm font-bold leading-snug text-ink-900 line-clamp-2 group-hover:text-brand-600 transition-colors">
                      {post.title}
                    </h4>
                    <span className="mt-1.5 flex items-center gap-1 text-[11px] font-medium text-ink-400">
                      <CalendarDays size={12} aria-hidden="true" />
                      {formatDate(post.published_at || post.createdAt)}
                    </span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </aside>
  );
}

function BlogArticle({ blog, onBack }) {
  const coverUrl = resolveMediaUrl(blog.cover_image);

  return (
    <article>
      <BackButton label="Back to Blog" onClick={onBack} />

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

  const primaryTag =
    Array.isArray(blog.tags) && blog.tags.length > 0 ? blog.tags[0] : null;

  return (
    <div className="mx-auto max-w-7xl grid grid-cols-1 gap-6 lg:grid-cols-[1fr_460px]">
      <div className="lg:order-1 min-w-0">
        <BlogArticle blog={blog} onBack={() => router.back()} />
        <SuggestionsPanel slug={slug} />
      </div>
      <div className="lg:order-2">
        <RelatedBlogsPanel slug={slug} tag={primaryTag} />
      </div>
    </div>
  );
}