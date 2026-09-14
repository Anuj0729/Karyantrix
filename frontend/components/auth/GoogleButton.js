'use client';

import { useEffect, useState } from 'react';

const GOOGLE_SCRIPT_SRC = 'https://accounts.google.com/gsi/client';
let googleScriptPromise = null;

function loadGoogleScript() {
  if (typeof window === 'undefined') return Promise.resolve();
  if (window.google?.accounts?.id) return Promise.resolve();
  if (googleScriptPromise) return googleScriptPromise;

  googleScriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${GOOGLE_SCRIPT_SRC}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', reject);
      return;
    }
    const script = document.createElement('script');
    script.src = GOOGLE_SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = reject;
    document.head.appendChild(script);
  });

  return googleScriptPromise;
}

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 8 3l6-6C34.6 5.1 29.6 3 24 3 12.4 3 3 12.4 3 24s9.4 21 21 21 21-9.4 21-21c0-1.4-.1-2.7-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.5 15.9 18.9 13 24 13c3.1 0 5.8 1.1 8 3l6-6C34.6 6.1 29.6 4 24 4c-7.7 0-14.3 4.4-17.7 10.7z" />
      <path fill="#4CAF50" d="M24 44c5.5 0 10.4-1.9 14.2-5.1l-6.6-5.4C29.6 35.4 27 36 24 36c-5.3 0-9.7-3.3-11.3-8l-6.6 5.1C9.6 39.5 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-0.8 2.3-2.3 4.3-4.3 5.7l6.6 5.4C39.9 36.9 44 31 44 24c0-1.4-.1-2.7-.4-3.5z" />
    </svg>
  );
}

export default function GoogleButton({ onCredential, onError, disabled = false }) {
  const [scriptReady, setScriptReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const clientId = process.env.GOOGLE_CLIENT_ID;

  useEffect(() => {
    if (!clientId) return;
    let cancelled = false;

    loadGoogleScript()
      .then(() => {
        if (cancelled || !window.google?.accounts?.id) return;
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: (response) => {
            setLoading(false);
            if (response?.credential) onCredential?.(response.credential);
            else onError?.(new Error('No credential returned by Google'));
          },
          auto_select: false,
        });
        setScriptReady(true);
      })
      .catch(() => onError?.(new Error('Could not load Google sign-in, please try again')));

    return () => {
      cancelled = true;
    };
  }, [clientId, onCredential, onError]);

  const handleClick = () => {
    if (!scriptReady || !window.google?.accounts?.id) {
      onError?.(new Error('Google sign-in is still loading, please try again in a moment'));
      return;
    }
    setLoading(true);
    window.google.accounts.id.prompt((notification) => {
      if (notification.isNotDisplayed?.() || notification.isSkippedMoment?.()) {
        setLoading(false);
        onError?.(new Error('Google sign-in popup was blocked or dismissed, please try again'));
      }
    });
  };

  const isDisabled = disabled || !clientId || loading;

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isDisabled}
      title={!clientId ? 'Google sign-in is not configured yet' : 'Continue with Google'}
      aria-label="Continue with Google"
      className="flex h-12 w-full items-center justify-center rounded-2xl border border-ink-200 bg-white text-sm font-semibold text-ink-700 shadow-soft transition-all duration-200 hover:border-ink-300 hover:bg-ink-50/80 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
    >
      {loading ? (
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-ink-300 border-t-brand-600" />
      ) : (
        <div className="flex items-center gap-3">
          <GoogleIcon />
          <span>Continue with Google</span>
        </div>
      )}
    </button>
  );
}
