'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Flag, ImagePlus, Mic, Send, Trash2, UserRound } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useChat } from '../../context/ChatContext';
import { useToast } from '../ui/Toast';
import Spinner from '../ui/Spinner';
import MessageBubble from './MessageBubble';
import { resolveMediaUrl } from './mediaUrl';
import dynamic from 'next/dynamic';
const ReportModal = dynamic(() => import('../ReportModal'));

const TYPING_IDLE_MS = 2000;
const MAX_ATTACHMENT_BYTES = 20 * 1024 * 1024;

const pickRecorderMimeType = () => {
  if (typeof MediaRecorder === 'undefined') return null;
  const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'];
  return candidates.find((type) => MediaRecorder.isTypeSupported?.(type)) || '';
};

const formatDuration = (totalSeconds) => {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
};

export default function ChatThread({ conversationId, backHref }) {
  const { user } = useAuth();
  const router = useRouter();
  const {
    conversations,
    messagesByConversation,
    loadMessages,
    sendText,
    sendMedia,
    editMessage,
    deleteMessage,
    setTyping,
    typingByConversation,
    closeThread,
  } = useChat();
  const { toast } = useToast();

  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [pendingUpload, setPendingUpload] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const scrollRef = useRef(null);
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const recordStreamRef = useRef(null);
  const recordTimerRef = useRef(null);

  const discardRecordingRef = useRef(false);
  const [reportOpen, setReportOpen] = useState(false);

  const conversation = conversations.find((c) => c.id === conversationId);
  const thread = messagesByConversation[conversationId] || { items: [], hasMore: false, loading: false };
  const isOtherTyping = !!typingByConversation[conversationId];

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [thread.items.length, isOtherTyping]);

  const handleLoadOlder = () => {
    if (!thread.items.length || thread.loading) return;
    loadMessages(conversationId, { before: thread.items[0].createdAt });
  };

  const stopTyping = () => {
    clearTimeout(typingTimeoutRef.current);
    setTyping(conversationId, false);
  };

  const handleTextChange = (e) => {
    setText(e.target.value);
    setTyping(conversationId, true);
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(stopTyping, TYPING_IDLE_MS);
  };

  const handleSend = async (e) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setSending(true);
    setText('');
    stopTyping();
    try {
      await sendText(conversationId, trimmed);
    } catch (err) {
      toast(err.response?.data?.message || 'Message could not be sent', { type: 'error' });
      setText(trimmed);
    } finally {
      setSending(false);
    }
  };

  const handleEditMessage = async (messageId, newText) => {
    try {
      await editMessage(conversationId, messageId, newText);
    } catch (err) {
      toast(err.response?.data?.message || 'Message could not be edited', { type: 'error' });
    }
  };

  const handleDeleteMessage = async (messageId, scope) => {
    try {
      await deleteMessage(conversationId, messageId, scope);
    } catch (err) {
      toast(err.response?.data?.message || 'Message could not be deleted', { type: 'error' });
    }
  };

  const handlePickFile = () => fileInputRef.current?.click();
  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    const isVideo = file.type.startsWith('video/');
    const isImage = file.type.startsWith('image/');
    const isAudio = file.type.startsWith('audio/');
    if (!isVideo && !isImage && !isAudio) {
      toast('Only image, video or audio files can be sent', { type: 'error' });
      return;
    }
    if (file.size > MAX_ATTACHMENT_BYTES) {
      toast('File is too large - please keep attachments under 20MB', { type: 'error' });
      return;
    }

    const mediaType = isVideo ? 'video' : isAudio ? 'audio' : 'image';
    setPendingUpload({ progress: 0, mediaType });
    try {

      await sendMedia(conversationId, file, {
        isVoiceNote: false,
        onProgress: (progress) => setPendingUpload((prev) => (prev ? { ...prev, progress } : prev)),
      });
    } catch (err) {
      toast(err.response?.data?.message || 'Attachment could not be sent', { type: 'error' });
    } finally {
      setPendingUpload(null);
    }
  };

  const teardownRecording = () => {
    clearInterval(recordTimerRef.current);
    recordTimerRef.current = null;
    recordStreamRef.current?.getTracks().forEach((track) => track.stop());
    recordStreamRef.current = null;
    mediaRecorderRef.current = null;
    recordedChunksRef.current = [];
    setIsRecording(false);
    setRecordSeconds(0);
  };

  useEffect(() => teardownRecording, []);

  const startRecording = async () => {
    if (isRecording || pendingUpload) return;
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      toast('Voice recording is not supported in this browser', { type: 'error' });
      return;
    }
    const mimeType = pickRecorderMimeType();
    if (mimeType === null) {
      toast('Voice recording is not supported in this browser', { type: 'error' });
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      recordStreamRef.current = stream;
      recordedChunksRef.current = [];
      discardRecordingRef.current = false;

      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) recordedChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        const chunks = recordedChunksRef.current;
        const wasDiscarded = discardRecordingRef.current;
        const usedMimeType = recorder.mimeType || mimeType || 'audio/webm';
        teardownRecording();

        if (wasDiscarded || chunks.length === 0) return;
        const blob = new Blob(chunks, { type: usedMimeType });
        const ext = usedMimeType.includes('mp4') ? 'm4a' : 'webm';
        const file = new File([blob], `voice-note-${Date.now()}.${ext}`, { type: usedMimeType });

        if (file.size > MAX_ATTACHMENT_BYTES) {
          toast('Voice note is too long - please keep it under 20MB', { type: 'error' });
          return;
        }

        setPendingUpload({ progress: 0, mediaType: 'audio' });
        try {
          await sendMedia(conversationId, file, {
            isVoiceNote: true,
            onProgress: (progress) => setPendingUpload((prev) => (prev ? { ...prev, progress } : prev)),
          });
        } catch (err) {
          toast(err.response?.data?.message || 'Voice message could not be sent', { type: 'error' });
        } finally {
          setPendingUpload(null);
        }
      };

      recorder.start();
      setIsRecording(true);
      setRecordSeconds(0);
      recordTimerRef.current = setInterval(() => setRecordSeconds((s) => s + 1), 1000);
    } catch (err) {
      toast('Microphone access was denied or is unavailable', { type: 'error' });
      teardownRecording();
    }
  };

  const finishRecording = () => {
    discardRecordingRef.current = false;
    mediaRecorderRef.current?.stop();
  };

  const cancelRecording = () => {
    discardRecordingRef.current = true;
    if (mediaRecorderRef.current) mediaRecorderRef.current.stop();
    else teardownRecording();
  };

  const otherAvatar = resolveMediaUrl(conversation?.other_participant?.avatar_url);

  const handleBack = () => {
    if (backHref) router.push(backHref);
    else closeThread();
  };

  return (
    <div className="flex h-full flex-col bg-white">
      <div className="flex items-center gap-3 border-b border-ink-100 bg-white px-4 py-3 shadow-xs">
        <button
          type="button"
          onClick={handleBack}
          className={`rounded-xl p-2 text-ink-500 hover:bg-ink-100 transition-colors ${backHref ? 'sm:hidden' : ''}`}
          aria-label="Back to conversations"
        >
          <ArrowLeft size={18} aria-hidden="true" />
        </button>

        <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-ink-100 ring-2 ring-brand-100 shadow-xs">
          {otherAvatar ? (
            <img src={otherAvatar} alt={conversation?.other_participant?.name} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-brand-50 text-brand-700 font-bold text-xs">
              {conversation?.other_participant?.name ? conversation.other_participant.name.slice(0, 2).toUpperCase() : <UserRound size={18} />}
            </div>
          )}
          <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-bold text-ink-900">{conversation?.other_participant?.name || 'Conversation'}</p>
            {conversation?.my_role_in_chat && (
              <span className="hidden sm:inline-flex items-center rounded-full bg-ink-100 px-2 py-0.5 text-[10px] font-medium text-ink-600 capitalize">
                {conversation.my_role_in_chat === 'customer' ? 'Provider' : 'Customer'}
              </span>
            )}
          </div>
          {isOtherTyping ? (
            <div className="flex items-center gap-1.5 text-xs text-brand-600 font-medium">
              <span className="flex gap-0.5">
                <span className="h-1 w-1 rounded-full bg-brand-600 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="h-1 w-1 rounded-full bg-brand-600 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="h-1 w-1 rounded-full bg-brand-600 animate-bounce" style={{ animationDelay: '300ms' }} />
              </span>
              <span>typing…</span>
            </div>
          ) : (
            <p className="text-[11px] text-ink-400">Direct Message</p>
          )}
        </div>

        {conversation?.other_participant && (
          <button
            type="button"
            onClick={() => setReportOpen(true)}
            title={`Report ${conversation.other_participant.name}`}
            aria-label={`Report ${conversation.other_participant.name}`}
            className="shrink-0 rounded-xl p-2 text-ink-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
          >
            <Flag size={16} aria-hidden="true" />
          </button>
        )}
      </div>

      <ReportModal
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        reportedUser={
          conversation?.other_participant
            ? {
                id: conversation.other_participant.id,
                name: conversation.other_participant.name,
                role: conversation.my_role_in_chat === 'customer' ? 'provider' : 'customer',
              }
            : null
        }
        context={{ conversation_id: conversationId }}
      />

      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto bg-slate-50/60 p-4">
        {thread.hasMore && (
          <div className="flex justify-center pb-1">
            <button
              type="button"
              onClick={handleLoadOlder}
              disabled={thread.loading}
              className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-brand-600 shadow-xs border border-ink-100 hover:bg-ink-50 disabled:text-ink-300 transition-colors"
            >
              {thread.loading ? 'Loading earlier messages…' : 'Load earlier messages'}
            </button>
          </div>
        )}

        {thread.items.length === 0 && !thread.loading && (
          <div className="my-10 mx-auto max-w-sm rounded-2xl border border-dashed border-ink-200 bg-white/80 p-6 text-center shadow-xs">
            <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-brand-50 text-brand-600">
              👋
            </div>
            <p className="text-sm font-semibold text-ink-900">Start the conversation</p>
            <p className="mt-1 text-xs text-ink-500 leading-relaxed">
              Discuss requirements, schedule timings, ask questions, or share photos and voice notes.
            </p>
          </div>
        )}

        {thread.items.map((m) => (
          <MessageBubble
            key={m.id}
            message={m}
            isOwn={m.sender === user?.id}
            onEdit={handleEditMessage}
            onDelete={handleDeleteMessage}
          />
        ))}

        {pendingUpload && (
          <div className="flex justify-end">
            <div className="flex max-w-[75%] items-center gap-2.5 rounded-2xl rounded-br-sm bg-brand-600 px-4 py-2.5 text-white shadow-md">
              <Spinner size={14} className="text-white" />
              <div className="flex flex-col">
                <span className="text-xs font-semibold capitalize">
                  Uploading {pendingUpload.mediaType}…
                </span>
                <span className="text-[10px] text-white/80">{pendingUpload.progress}% complete</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {isRecording ? (
        <div className="flex items-center gap-3 border-t border-ink-100 bg-rose-50/50 px-4 py-3 transition-all">
          <span className="relative flex h-3 w-3 shrink-0">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-75" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-rose-500" />
          </span>
          <div className="flex flex-1 items-center gap-2">
            <span className="text-sm font-semibold text-rose-950">Recording voice note</span>
            <span className="rounded-md bg-rose-100 px-2 py-0.5 font-mono text-xs font-bold text-rose-700">
              {formatDuration(recordSeconds)}
            </span>
          </div>
          <button
            type="button"
            onClick={cancelRecording}
            className="shrink-0 rounded-xl p-2 text-ink-500 hover:bg-rose-100/80 hover:text-rose-700 transition-colors"
            title="Cancel recording"
            aria-label="Cancel recording"
          >
            <Trash2 size={18} aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={finishRecording}
            className="flex shrink-0 items-center gap-1.5 rounded-xl bg-gradient-to-r from-brand-600 to-accent-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:from-brand-700 hover:to-accent-700 active:scale-95 transition-all"
            aria-label="Send voice message"
          >
            <Send size={14} aria-hidden="true" />
            <span>Send</span>
          </button>
        </div>
      ) : (
        <form onSubmit={handleSend} className="flex items-center gap-2 border-t border-ink-100/80 bg-white px-3 py-2.5">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*,audio/*"
            className="hidden"
            onChange={handleFileChange}
          />
          <button
            type="button"
            onClick={handlePickFile}
            disabled={!!pendingUpload}
            className="shrink-0 rounded-xl p-2 text-ink-500 hover:bg-ink-100 hover:text-ink-700 disabled:opacity-40 transition-colors"
            title="Attach photo, video or audio"
            aria-label="Attach a photo, video or audio file"
          >
            <ImagePlus size={20} aria-hidden="true" />
          </button>
          <input
            type="text"
            value={text}
            onChange={handleTextChange}
            onBlur={stopTyping}
            placeholder="Type a message..."
            className="min-w-0 flex-1 rounded-xl border border-ink-200/80 bg-ink-50/40 px-4 py-2 text-sm text-ink-900 placeholder-ink-400 outline-none transition focus:border-brand-500 focus:bg-white focus:ring-1 focus:ring-brand-500"
          />
          {text.trim() ? (
            <button
              type="submit"
              disabled={sending}
              className="shrink-0 rounded-xl bg-gradient-to-r from-brand-600 to-accent-600 p-2.5 text-white shadow-xs transition-all hover:from-brand-700 hover:to-accent-700 active:scale-95 disabled:opacity-50"
              aria-label="Send message"
            >
              {sending ? <Spinner size={16} className="text-white" /> : <Send size={16} aria-hidden="true" />}
            </button>
          ) : (
            <button
              type="button"
              onClick={startRecording}
              disabled={!!pendingUpload}
              className="shrink-0 rounded-xl bg-ink-100 p-2.5 text-ink-700 transition-all hover:bg-brand-50 hover:text-brand-600 active:scale-95 disabled:opacity-40"
              title="Record voice note"
              aria-label="Record a voice message"
            >
              <Mic size={16} aria-hidden="true" />
            </button>
          )}
        </form>
      )}
    </div>
  );
}
