'use client';

import { useEffect, useRef, useState } from 'react';
import { Camera, RefreshCcw, TriangleAlert, X } from 'lucide-react';
import Modal from './Modal';
import Button from './Button';
import Spinner from './Spinner';

/**
 * Live, camera-only capture modal. Unlike a plain file input, this never accepts an
 * existing gallery image — it opens the device camera, streams a live preview, and only
 * lets the user submit a frame captured from that live stream. Used for selfie / liveness
 * style verification photos where we need proof the shot was taken in real time.
 */
export default function CameraCapture({ isOpen, onClose, onConfirm, title = 'Take a live photo' }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  const [status, setStatus] = useState('starting'); // starting | live | error
  const [errorMessage, setErrorMessage] = useState('');
  const [capturedDataUrl, setCapturedDataUrl] = useState(null);
  const [confirming, setConfirming] = useState(false);

  const stopStream = () => {
    streamRef.current?.getTracks()?.forEach((track) => track.stop());
    streamRef.current = null;
  };

  useEffect(() => {
    if (!isOpen) return undefined;

    setCapturedDataUrl(null);
    setStatus('starting');
    setErrorMessage('');

    let cancelled = false;

    const start = async () => {
      if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
        setStatus('error');
        setErrorMessage("Your browser doesn't support camera access. Please try a different device or browser.");
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 720 }, height: { ideal: 720 } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
        setStatus('live');
      } catch (err) {
        if (cancelled) return;
        setStatus('error');
        setErrorMessage(
          err?.name === 'NotAllowedError'
            ? 'Camera access was denied. Please allow camera permission to take your live photo.'
            : 'Could not access your camera. Please check your device and try again.'
        );
      }
    };

    start();

    return () => {
      cancelled = true;
      stopStream();
    };
  }, [isOpen]);

  const handleClose = () => {
    stopStream();
    setCapturedDataUrl(null);
    onClose?.();
  };

  const handleCapture = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    const size = Math.min(video.videoWidth || 720, video.videoHeight || 720);
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    const sx = ((video.videoWidth || size) - size) / 2;
    const sy = ((video.videoHeight || size) - size) / 2;
    ctx.translate(size, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, sx, sy, size, size, 0, 0, size, size);
    setCapturedDataUrl(canvas.toDataURL('image/jpeg', 0.92));
  };

  const handleRetake = () => setCapturedDataUrl(null);

  const handleUsePhoto = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setConfirming(true);
    canvas.toBlob(
      (blob) => {
        setConfirming(false);
        if (!blob) return;
        const file = new File([blob], `live-photo-${Date.now()}.jpg`, { type: 'image/jpeg' });
        stopStream();
        onConfirm?.(file);
      },
      'image/jpeg',
      0.92
    );
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="sm" closeOnOverlayClick={false}>
      <div className="p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-display text-base font-semibold text-ink-900">{title}</h3>
          <button type="button" onClick={handleClose} className="rounded-full p-1 text-ink-400 hover:bg-ink-100 hover:text-ink-700">
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <div className="relative mx-auto aspect-square w-full max-w-xs overflow-hidden rounded-2xl bg-ink-900">
          {status === 'error' ? (
            <div className="flex h-full w-full flex-col items-center justify-center gap-2 p-4 text-center">
              <TriangleAlert size={24} className="text-gold-400" aria-hidden="true" />
              <p className="text-xs text-white/80">{errorMessage}</p>
            </div>
          ) : capturedDataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={capturedDataUrl} alt="Captured live photo" className="h-full w-full object-cover" />
          ) : (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="h-full w-full scale-x-[-1] object-cover"
              />
              {status === 'starting' && (
                <div className="absolute inset-0 flex items-center justify-center bg-ink-900/60">
                  <Spinner size={26} className="text-white" />
                </div>
              )}
            </>
          )}
        </div>
        <canvas ref={canvasRef} className="hidden" />

        <p className="mt-3 text-center text-[11px] text-ink-400">
          Make sure your face is clearly visible and well lit. This photo is taken live and can&apos;t be uploaded from your gallery.
        </p>

        <div className="mt-4 flex items-center justify-center gap-2">
          {status === 'error' && (
            <Button variant="secondary" onClick={handleClose}>
              Close
            </Button>
          )}
          {status === 'live' && !capturedDataUrl && (
            <Button onClick={handleCapture} icon={<Camera size={16} aria-hidden="true" />}>
              Capture photo
            </Button>
          )}
          {capturedDataUrl && (
            <>
              <Button variant="secondary" onClick={handleRetake} icon={<RefreshCcw size={16} aria-hidden="true" />}>
                Retake
              </Button>
              <Button onClick={handleUsePhoto} loading={confirming}>
                Use this photo
              </Button>
            </>
          )}
        </div>
      </div>
    </Modal>
  );
}
