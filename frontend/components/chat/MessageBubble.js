'use client';

import { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  Check,
  CheckCheck,
  Clock,
  ImageOff,
  Loader2,
  Mic,
  MoreVertical,
  Music,
  Pencil,
  RotateCcw,
  Trash2,
} from 'lucide-react';
import { resolveMediaUrl, withRetryToken } from './mediaUrl';
import { formatFullTimestamp, formatMessageTime } from '../../lib/chatDate';

const isEditable = (message, isOwn) =>
  isOwn && message.type === 'text' && !message.is_deleted_for_everyone && !message.status;

const DELETE_FOR_EVERYONE_WINDOW_MS = 60 * 60 * 1000;
const canStillDeleteForEveryone = (message) =>
  Date.now() - new Date(message.createdAt).getTime() < DELETE_FOR_EVERYONE_WINDOW_MS;

export default function MessageBubble({ message, isOwn, pending = false, onEdit, onDelete, onRetry, onDiscard }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(message.text || '');
  const [saving, setSaving] = useState(false);
  const [mediaError, setMediaError] = useState(false);
  const [mediaRetryToken, setMediaRetryToken] = useState(0);
  const menuRef = useRef(null);
  const editInputRef = useRef(null);

  const isDeleted = message.is_deleted_for_everyone;
  const status = message.status; 
  const isUploading = status === 'uploading';
  const isSending = status === 'sending' || pending;
  const hasFailed = status === 'failed';
  const isInFlight = isUploading || isSending;

  const mediaSrc = withRetryToken(resolveMediaUrl(message.media?.url), mediaRetryToken || null);

  useEffect(() => {
    setMediaError(false);
  }, [message.media?.url]);

  useEffect(() => {
    if (!menuOpen && !confirmingDelete) return undefined;
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
        setConfirmingDelete(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen, confirmingDelete]);

  useEffect(() => {
    if (isEditing) editInputRef.current?.focus();
  }, [isEditing]);

  const startEdit = () => {
    setEditText(message.text || '');
    setIsEditing(true);
    setMenuOpen(false);
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setEditText(message.text || '');
  };

  const saveEdit = async () => {
    const trimmed = editText.trim();
    if (!trimmed || trimmed === message.text) {
      setIsEditing(false);
      return;
    }
    setSaving(true);
    try {
      await onEdit?.(message.id, trimmed);
      setIsEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const handleEditKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      saveEdit();
    } else if (e.key === 'Escape') {
      cancelEdit();
    }
  };

  const handleDeleteChoice = async (scope) => {
    setConfirmingDelete(false);
    setMenuOpen(false);
    await onDelete?.(message.id, scope);
  };

  const retryMedia = () => {
    setMediaError(false);
    setMediaRetryToken(Date.now());
  };

  const bubbleClass = isOwn
    ? 'bg-brand-600 text-white rounded-2xl rounded-tr-xs shadow-xs'
    : 'bg-white border border-ink-200/80 text-ink-900 rounded-2xl rounded-tl-xs shadow-xs';

  const canShowMenu = !isInFlight && !isDeleted && (onEdit || onDelete);
  const mutedText = isOwn ? 'text-white/80' : 'text-ink-400';

  const MediaUnavailable = ({ label }) => (
    <div
      className={`my-1 flex min-w-[200px] flex-col items-center gap-1.5 rounded-xl border border-dashed px-4 py-5 text-center ${
        isOwn ? 'border-white/40 bg-white/10' : 'border-ink-200 bg-ink-50'
      }`}
    >
      <ImageOff size={18} className={isOwn ? 'text-white/70' : 'text-ink-400'} aria-hidden="true" />
      <p className={`text-[11px] font-semibold ${isOwn ? 'text-white/90' : 'text-ink-600'}`}>{label}</p>
      <button
        type="button"
        onClick={retryMedia}
        className={`mt-0.5 flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-bold transition-colors ${
          isOwn ? 'bg-white/20 text-white hover:bg-white/30' : 'bg-ink-200/70 text-ink-700 hover:bg-ink-200'
        }`}
      >
        <RotateCcw size={11} aria-hidden="true" />
        Retry
      </button>
    </div>
  );

  return (
    <div className={`group flex items-center gap-2 ${isOwn ? 'justify-end' : 'justify-start'}`}>
      {canShowMenu && isOwn && (
        <div className="relative shrink-0" ref={menuRef}>
          <MessageMenuButton onClick={() => setMenuOpen((v) => !v)} />
          {menuOpen && (
            <MessageMenu
              align="right"
              editable={isEditable(message, isOwn)}
              isOwn={isOwn}
              allowDeleteForEveryone={isOwn && canStillDeleteForEveryone(message)}
              confirmingDelete={confirmingDelete}
              onEdit={startEdit}
              onAskDelete={() => setConfirmingDelete(true)}
              onCancelConfirm={() => setConfirmingDelete(false)}
              onDeleteChoice={handleDeleteChoice}
            />
          )}
        </div>
      )}

      <div
        className={`max-w-[78%] sm:max-w-[70%] rounded-2xl px-4 py-2.5 shadow-xs transition-all ${bubbleClass} ${
          isInFlight ? 'opacity-75' : ''
        } ${hasFailed ? 'ring-1 ring-rose-400' : ''}`}
      >
        {isDeleted && (
          <p className={`flex items-center gap-1.5 whitespace-pre-wrap break-words text-xs italic ${mutedText}`}>
            <Trash2 size={13} aria-hidden="true" />
            <span>This message was deleted</span>
          </p>
        )}

        {!isDeleted && message.type === 'text' && !isEditing && (
          <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{message.text}</p>
        )}

        {!isDeleted && message.type === 'text' && isEditing && (
          <div className="min-w-[200px]">
            <textarea
              ref={editInputRef}
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              onKeyDown={handleEditKeyDown}
              rows={Math.min(6, Math.max(1, editText.split('\n').length))}
              className={`w-full resize-none rounded-xl border-0 bg-black/10 px-3 py-1.5 text-sm outline-none ring-1 ring-inset focus:ring-2 ${
                isOwn ? 'text-white placeholder-white/60 ring-white/30 focus:ring-white/70' : 'text-ink-900 ring-ink-300 focus:ring-brand-400'
              }`}
              disabled={saving}
            />
            <div className="mt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={cancelEdit}
                disabled={saving}
                className={`rounded-lg px-2 py-1 text-xs font-medium transition-colors ${
                  isOwn ? 'text-white/80 hover:text-white hover:bg-white/10' : 'text-ink-500 hover:text-ink-700 hover:bg-ink-100'
                }`}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveEdit}
                disabled={saving || !editText.trim()}
                className={`flex items-center gap-1 rounded-lg px-3 py-1 text-xs font-bold transition-all ${
                  isOwn ? 'bg-white text-brand-700 hover:bg-white/90' : 'bg-brand-600 text-white hover:bg-brand-700'
                } disabled:opacity-50`}
              >
                {saving && <Loader2 size={12} className="animate-spin" aria-hidden="true" />}
                Save
              </button>
            </div>
          </div>
        )}

        {!isDeleted && message.type === 'image' && (
          mediaSrc && !mediaError ? (
            <div className="relative overflow-hidden rounded-xl border border-black/5 bg-black/5 my-1">
              <img
                src={mediaSrc}
                alt="Shared attachment"
                className="max-h-72 w-full object-cover transition-transform hover:scale-[1.01]"
                loading="lazy"
                onError={() => setMediaError(true)}
              />
              {isUploading && <UploadOverlay progress={message.upload_progress} />}
            </div>
          ) : (
            <MediaUnavailable label="Photo unavailable" />
          )
        )}

        {!isDeleted && message.type === 'video' && (
          mediaSrc && !mediaError ? (
            <div className="relative overflow-hidden rounded-xl border border-black/5 bg-black/5 my-1">
              <video
                src={mediaSrc}
                controls
                playsInline
                preload="metadata"
                className="max-h-72 w-full rounded-xl"
                onError={() => setMediaError(true)}
              />
              {isUploading && <UploadOverlay progress={message.upload_progress} />}
            </div>
          ) : (
            <MediaUnavailable label="Video unavailable" />
          )
        )}

        {!isDeleted && message.type === 'audio' && (
          mediaSrc && !mediaError ? (
            <div className="my-1 flex min-w-[220px] flex-col gap-1.5 rounded-xl bg-black/5 p-2.5">
              <div className={`flex items-center gap-1.5 text-[11px] font-semibold ${isOwn ? 'text-white/90' : 'text-ink-600'}`}>
                {message.media?.is_voice_note ? (
                  <>
                    <Mic size={14} className={isOwn ? 'text-white' : 'text-brand-600'} aria-hidden="true" />
                    <span>Voice Note</span>
                  </>
                ) : (
                  <>
                    <Music size={14} className={isOwn ? 'text-white' : 'text-brand-600'} aria-hidden="true" />
                    <span>Audio</span>
                  </>
                )}
                {isUploading && (
                  <span className={`ml-auto text-[10px] font-medium ${mutedText}`}>
                    {message.upload_progress ?? 0}%
                  </span>
                )}
              </div>
              <audio
                src={mediaSrc}
                controls
                preload="metadata"
                className="h-8 w-full max-w-[260px]"
                onError={() => setMediaError(true)}
              />
            </div>
          ) : (
            <MediaUnavailable label="Audio unavailable" />
          )
        )}

        <div className={`mt-1.5 flex items-center justify-end gap-1.5 text-[10px] ${mutedText}`}>
          {message.is_edited && !isDeleted && <span className="italic">edited</span>}

          {hasFailed ? (
            <span className={`flex items-center gap-1 font-semibold ${isOwn ? 'text-rose-100' : 'text-rose-600'}`}>
              <AlertCircle size={12} aria-hidden="true" />
              Not sent
            </span>
          ) : (
            <span title={formatFullTimestamp(message.createdAt)}>
              {isUploading
                ? `Uploading ${message.upload_progress ?? 0}%`
                : isSending
                  ? 'Sending…'
                  : formatMessageTime(message.createdAt)}
            </span>
          )}

          {isOwn && !hasFailed && (
            isInFlight ? (
              <Clock size={12} className="opacity-80" aria-hidden="true" />
            ) : message.is_read ? (
              <CheckCheck size={13} className="text-emerald-300" aria-hidden="true" />
            ) : (
              <Check size={13} className="text-white/80" aria-hidden="true" />
            )
          )}
        </div>

        {hasFailed && (
          <div className="mt-1.5 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => onRetry?.(message.client_id || message.id)}
              className={`flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-bold transition-colors ${
                isOwn ? 'bg-white/20 text-white hover:bg-white/30' : 'bg-rose-50 text-rose-600 hover:bg-rose-100'
              }`}
            >
              <RotateCcw size={11} aria-hidden="true" />
              Retry
            </button>
            <button
              type="button"
              onClick={() => onDiscard?.(message.client_id || message.id)}
              className={`rounded-lg px-2 py-1 text-[11px] font-medium transition-colors ${
                isOwn ? 'text-white/80 hover:bg-white/15' : 'text-ink-500 hover:bg-ink-100'
              }`}
            >
              Discard
            </button>
          </div>
        )}
      </div>

      {canShowMenu && !isOwn && (
        <div className="relative shrink-0" ref={menuRef}>
          <MessageMenuButton onClick={() => setMenuOpen((v) => !v)} />
          {menuOpen && (
            <MessageMenu
              align="left"
              editable={false}
              isOwn={isOwn}
              allowDeleteForEveryone={false}
              confirmingDelete={confirmingDelete}
              onEdit={startEdit}
              onAskDelete={() => setConfirmingDelete(true)}
              onCancelConfirm={() => setConfirmingDelete(false)}
              onDeleteChoice={handleDeleteChoice}
            />
          )}
        </div>
      )}
    </div>
  );
}

function UploadOverlay({ progress = 0 }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/45 text-white">
      <Loader2 size={20} className="animate-spin" aria-hidden="true" />
      <span className="text-[11px] font-semibold">{progress}%</span>
    </div>
  );
}

function MessageMenuButton({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-full p-1.5 text-ink-400 opacity-0 transition-all hover:bg-ink-100 hover:text-ink-700 group-hover:opacity-100"
      aria-label="Message options"
    >
      <MoreVertical size={15} aria-hidden="true" />
    </button>
  );
}

function MessageMenu({
  align,
  editable,
  isOwn,
  allowDeleteForEveryone,
  confirmingDelete,
  onEdit,
  onAskDelete,
  onCancelConfirm,
  onDeleteChoice,
}) {
  const positionClass = align === 'right' ? 'right-0' : 'left-0';

  if (confirmingDelete) {
    return (
      <div className={`absolute top-full z-30 mt-1 w-52 overflow-hidden rounded-xl border border-ink-100/80 bg-white/95 py-1 shadow-card backdrop-blur-md ${positionClass}`}>
        <button
          type="button"
          onClick={() => onDeleteChoice('me')}
          className="block w-full px-3.5 py-2 text-left text-xs font-medium text-ink-700 hover:bg-ink-50 transition-colors"
        >
          Delete for me
        </button>
        {allowDeleteForEveryone && (
          <button
            type="button"
            onClick={() => onDeleteChoice('everyone')}
            className="block w-full px-3.5 py-2 text-left text-xs font-medium text-rose-600 hover:bg-rose-50 transition-colors"
          >
            Delete for everyone
          </button>
        )}
        <button
          type="button"
          onClick={onCancelConfirm}
          className="block w-full border-t border-ink-100 px-3.5 py-2 text-left text-xs text-ink-500 hover:bg-ink-50 transition-colors"
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <div className={`absolute top-full z-30 mt-1 w-36 overflow-hidden rounded-xl border border-ink-100/80 bg-white/95 py-1 shadow-card backdrop-blur-md ${positionClass}`}>
      {editable && (
        <button
          type="button"
          onClick={onEdit}
          className="flex w-full items-center gap-2 px-3.5 py-2 text-left text-xs font-medium text-ink-700 hover:bg-ink-50 transition-colors"
        >
          <Pencil size={13} aria-hidden="true" />
          Edit
        </button>
      )}
      <button
        type="button"
        onClick={onAskDelete}
        className="flex w-full items-center gap-2 px-3.5 py-2 text-left text-xs font-medium text-rose-600 hover:bg-rose-50 transition-colors"
      >
        <Trash2 size={13} aria-hidden="true" />
        Delete
      </button>
    </div>
  );
}
