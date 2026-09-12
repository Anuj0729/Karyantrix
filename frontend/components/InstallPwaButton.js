'use client';

import { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';

export default function InstallPwaButton() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isStandalone, setIsStandalone] = useState(true);
  const [isIos, setIsIos] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [showIosSheet, setShowIosSheet] = useState(false);

  useEffect(() => {
    const standalone =
      window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true;
    setIsStandalone(standalone);

    const ua = window.navigator.userAgent || '';
    setIsIos(/iphone|ipad|ipod/i.test(ua) && !window.MSStream);

    const onBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    const onInstalled = () => {
      setDeferredPrompt(null);
      setIsStandalone(true);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const canShow = !isStandalone && !dismissed && (deferredPrompt || isIos);
  if (!canShow) return null;

  const handleClick = async () => {
    if (isIos) {
      setShowIosSheet(true);
      return;
    }
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setIsStandalone(true);
    setDeferredPrompt(null);
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className="fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-full bg-gradient-to-r from-brand-600 to-accent-500 px-4 py-3 text-sm font-semibold text-white shadow-xl shadow-brand-600/30 transition-all hover:brightness-105 hover:shadow-2xl active:scale-95 sm:bottom-6 sm:right-6"
        aria-label="Install Karyantrix app"
      >
        <Download size={18} aria-hidden="true" />
        <span className="hidden sm:inline">Install App</span>
        <span
          role="button"
          tabIndex={0}
          onClick={(e) => {
            e.stopPropagation();
            setDismissed(true);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.stopPropagation();
              setDismissed(true);
            }
          }}
          aria-label="Dismiss install prompt"
          className="ml-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-white/20 hover:bg-white/30"
        >
          <X size={12} aria-hidden="true" />
        </span>
      </button>

      {showIosSheet && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center"
          onClick={() => setShowIosSheet(false)}
        >
          <div
            className="w-full max-w-sm rounded-t-3xl bg-white p-6 shadow-card-hover sm:rounded-3xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-display text-base font-bold text-ink-900">Install Karyantrix</h3>
              <button
                type="button"
                onClick={() => setShowIosSheet(false)}
                aria-label="Close"
                className="rounded-lg p-1 text-ink-400 hover:bg-ink-100"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>
            <ol className="space-y-3 text-sm text-ink-700">
              <li className="flex gap-2.5">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-50 text-[11px] font-bold text-brand-600">1</span>
                Tap the <strong>Share</strong> icon in Safari's toolbar.
              </li>
              <li className="flex gap-2.5">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-50 text-[11px] font-bold text-brand-600">2</span>
                Scroll down and tap <strong>Add to Home Screen</strong>.
              </li>
              <li className="flex gap-2.5">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-50 text-[11px] font-bold text-brand-600">3</span>
                Tap <strong>Add</strong> to confirm.
              </li>
            </ol>
          </div>
        </div>
      )}
    </>
  );
}
