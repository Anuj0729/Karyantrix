'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, LocateFixed, X } from 'lucide-react';
import api from '../lib/api';
import { uploadAllMedia } from '../lib/uploadService';
import useGeolocation from '../lib/useGeolocation';
import { reverseGeocode, forwardGeocode } from '../lib/geocode';
import { useToast } from './ui/Toast';
import { Field, TextArea, TextInput } from './ui/Field';
import MultiSelect from './ui/MultiSelect';
import Button from './ui/Button';

const MAX_MEDIA = 5;

const API_ORIGIN = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api').replace(/\/api\/?$/, '');
const mediaUrl = (url) => (url.startsWith('http') ? url : `${API_ORIGIN}${url}`);

const EXPERIENCE_OPTIONS = [
  { value: 'any', label: 'Any experience' },
  { value: 'beginner', label: 'Beginner is fine' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'expert', label: 'Expert only' },
];

export default function RequirementComposerModal({
  open,
  onClose,
  onCreated,
  requirement = null,
  onSaved,
  targetProvider = null,
}) {
  const { toast } = useToast();
  const { coords: geoCoords, status: geoStatus, request: requestLocation } = useGeolocation({ auto: false });
  const isEditMode = !!requirement;
  const hasActivity = isEditMode && ((requirement.interested_providers?.length || 0) > 0);

  const [categoryOptions, setCategoryOptions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [catalogOptions, setCatalogOptions] = useState([]);
  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const [services, setServices] = useState([]);
  const [description, setDescription] = useState('');
  const [budget, setBudget] = useState('');
  const [experienceLevels, setExperienceLevels] = useState(['any']);
  const [postType, setPostType] = useState('bids');
  const [locationText, setLocationText] = useState('');
  const [coords, setCoords] = useState(null);
  const [media, setMedia] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [uploadPhase, setUploadPhase] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState('');
  const [resolvingLocation, setResolvingLocation] = useState(false);
  const skipNextForwardGeocode = useRef(false);

  useEffect(() => {
    if (!open) return;
    if (requirement) {
      setCategories((requirement.categories || []).map((c) => c.id));
      setServices(requirement.services || []);
      setDescription(requirement.description || '');
      setBudget(requirement.budget !== undefined ? String(requirement.budget) : '');
      setExperienceLevels(requirement.experience_levels?.length ? requirement.experience_levels : ['any']);
      setPostType(requirement.post_type || 'bids');
      skipNextForwardGeocode.current = true;
      setLocationText(requirement.location?.text || '');
      setCoords(requirement.location ? { lat: requirement.location.lat, lng: requirement.location.lng } : null);
      setMedia([]);
    } else {
      setCategories([]);
      setServices([]);
      setDescription('');
      setBudget('');
      setExperienceLevels(['any']);
      setPostType('bids');
      skipNextForwardGeocode.current = true;
      setLocationText('');
      setCoords(null);
      setMedia([]);

      requestLocation();
    }
    setError('');
    setResolvingLocation(false);

  }, [open, requirement]);

  useEffect(() => {
    if (!open) return;
    api
      .get('/categories')
      .then(({ data }) => {
        const options = (data.categories || []).map((c) => ({ value: c.id, label: c.name }));
        setCategoryOptions(options);
      })
      .catch(() => setCategoryOptions([]));
  }, [open]);

  useEffect(() => {
    if (!open || categories.length === 0) {
      setCatalogOptions([]);
      return;
    }
    let cancelled = false;
    setLoadingCatalog(true);
    Promise.all(categories.map((catId) => api.get('/service-catalog', { params: { category_id: catId } }).then(({ data }) => data.services || [])))
      .then((results) => {
        if (cancelled) return;
        const merged = results.flat();
        const seen = new Set();
        const options = [];
        merged.forEach((s) => {
          if (seen.has(s.name)) return;
          seen.add(s.name);
          options.push({ value: s.name, label: s.name });
        });
        setCatalogOptions(options);
        setServices((prev) => prev.filter((name) => seen.has(name)));
      })
      .catch(() => {
        if (!cancelled) setCatalogOptions([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingCatalog(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, categories]);

  useEffect(() => {
    if (geoStatus !== 'ready' || !geoCoords) return;
    setCoords(geoCoords);
    setResolvingLocation(true);
    skipNextForwardGeocode.current = true;
    setLocationText('Locating your address...');
    let cancelled = false;
    reverseGeocode(geoCoords.lat, geoCoords.lng).then((name) => {
      if (cancelled) return;
      skipNextForwardGeocode.current = true;
      setLocationText(name || `Near ${geoCoords.lat.toFixed(3)}, ${geoCoords.lng.toFixed(3)}`);
      setResolvingLocation(false);
    });
    return () => {
      cancelled = true;
    };

  }, [geoStatus, geoCoords]);

  useEffect(() => {
    if (!open) return;
    if (skipNextForwardGeocode.current) {
      skipNextForwardGeocode.current = false;
      return;
    }
    const text = locationText.trim();
    if (text.length < 3) return;

    setResolvingLocation(true);
    const controller = new AbortController();
    const timer = setTimeout(() => {
      forwardGeocode(text, { signal: controller.signal })
        .then((result) => {
          if (result) {
            setCoords({ lat: result.lat, lng: result.lng });
          }
        })
        .finally(() => setResolvingLocation(false));
    }, 600);

    return () => {
      clearTimeout(timer);
      controller.abort();
      setResolvingLocation(false);
    };
  }, [locationText, open]);

  if (!open) return null;
  if (typeof document === 'undefined') return null;

  const addMedia = (fileList) => {
    const files = Array.from(fileList).slice(0, MAX_MEDIA - media.length);
    setMedia((prev) => [...prev, ...files].slice(0, MAX_MEDIA));
  };

  const removeMedia = (idx) => setMedia((prev) => prev.filter((_, i) => i !== idx));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (categories.length === 0) {
      setError('Please select a service category');
      return;
    }
    if (services.length === 0 || !description.trim()) {
      setError('Please select at least one service, and add a description');
      return;
    }
    if (!coords) {
      setError('Please share your current location so nearby providers can see this requirement');
      return;
    }
    const budgetNum = Number(budget);
    if (budget === '' || Number.isNaN(budgetNum) || budgetNum < 0) {
      setError('Please enter a valid budget for this job');
      return;
    }

    try {
      setSubmitting(true);

      if (isEditMode) {
        setUploadPhase('posting');
        const payload = {
          services,
          category_ids: categories,
          description: description.trim(),
          budget: budgetNum,
          experience_levels: experienceLevels,
          location_text: locationText.trim() || 'Current location',
          lat: coords.lat,
          lng: coords.lng,
          post_type: postType,
        };
        const { data } = await api.put(`/requirements/${requirement.id}`, payload);
        toast('Your requirement has been updated', { type: 'success' });
        onSaved?.(data.requirement);
        onClose();
        return;
      }

      let mediaIds = [];
      if (media.length > 0) {
        setUploadPhase('uploading');
        const perFileProgress = new Array(media.length).fill(0);
        mediaIds = await uploadAllMedia(media, {
          onFileProgress: (fileIndex, progress) => {
            perFileProgress[fileIndex] = progress;
            const overall = Math.round(perFileProgress.reduce((a, b) => a + b, 0) / media.length);
            setUploadProgress(overall);
          },
        });
      }

      setUploadPhase('posting');
      const payload = {
        services,
        category_ids: categories,
        description: description.trim(),
        budget: budgetNum,
        experience_levels: experienceLevels,
        location_text: locationText.trim() || 'Current location',
        lat: coords.lat,
        lng: coords.lng,
        media_ids: mediaIds,
        post_type: postType,
        target_provider_id: targetProvider?.id || undefined,
      };

      const { data } = await api.post('/requirements', payload);

      toast(
        targetProvider ? `Your booking request has been sent to ${targetProvider.name}` : 'Your requirement has been posted',
        { type: 'success' }
      );
      onCreated?.(data.requirement);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || `Could not ${isEditMode ? 'update' : 'post'} your requirement. Please try again.`);
    } finally {
      setSubmitting(false);
      setUploadPhase('');
      setUploadProgress(0);
    }
  };

  return createPortal(
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/60 backdrop-blur-sm px-4 py-6 sm:py-10"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white p-6 sm:p-7 shadow-2xl border border-ink-200/80"
          initial={{ opacity: 0, y: 24, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.97 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mb-6 flex items-start justify-between gap-4 pb-4 border-b border-ink-100">
            <div>
              <h2 className="font-display text-xl font-bold text-ink-900 tracking-tight">
                {isEditMode ? 'Edit requirement' : targetProvider ? `Book ${targetProvider.name}` : 'Post a requirement'}
              </h2>
              <p className="mt-1 text-xs text-ink-500">
                {isEditMode
                  ? 'Update job details, budget, and locations for providers.'
                  : targetProvider
                    ? `This request will only be sent to ${targetProvider.name} — no one else will see it.`
                    : 'Describe your job and get competitive bids from verified providers.'}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="rounded-full p-2 text-ink-400 hover:text-ink-700 hover:bg-ink-100 transition-colors"
            >
              <X size={18} aria-hidden="true" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Field label="Service category" required hint="Choose the category this job falls under">
              <MultiSelect
                options={categoryOptions}
                value={categories}
                onChange={setCategories}
                placeholder="Select category..."
              />
            </Field>

            <Field
              label="Services"
              required
              hint={
                categories.length === 0
                  ? 'Pick a category above to see its services'
                  : loadingCatalog
                    ? 'Loading services...'
                    : 'Choose the specific service(s) you need assistance with'
              }
            >
              <MultiSelect
                options={catalogOptions}
                value={services}
                onChange={setServices}
                disabled={categories.length === 0}
                placeholder={categories.length === 0 ? 'Select a category first' : 'Select services...'}
              />
            </Field>

            <Field label="Detailed description" required hint="Include specific tasks, issues, dimensions, or scheduling requirements">
              <TextArea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                placeholder="e.g. My 1.5 ton split AC needs gas refill and deep cleaning before this weekend..."
                required
              />
            </Field>

            <Field
              label="How should providers respond?"
              required
              hint={
                hasActivity
                  ? 'Cannot be changed once providers have bid or shown interest'
                  : postType === 'bids'
                    ? 'Providers submit competing bid amounts; you pick the best offer'
                    : 'Providers can only express interest at your stated budget; you pick who to hire'
              }
            >
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  disabled={hasActivity}
                  onClick={() => setPostType('bids')}
                  className={`rounded-2xl border px-3.5 py-2.5 text-left text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                    postType === 'bids'
                      ? 'border-brand-400 bg-brand-50 text-brand-700'
                      : 'border-ink-200 text-ink-600 hover:border-ink-300'
                  }`}
                >
                  <span className="block">Get bids</span>
                  <span className="mt-0.5 block text-[11px] font-normal text-ink-400">Providers quote their price</span>
                </button>
                <button
                  type="button"
                  disabled={hasActivity}
                  onClick={() => setPostType('fixed')}
                  className={`rounded-2xl border px-3.5 py-2.5 text-left text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                    postType === 'fixed'
                      ? 'border-brand-400 bg-brand-50 text-brand-700'
                      : 'border-ink-200 text-ink-600 hover:border-ink-300'
                  }`}
                >
                  <span className="block">Fixed price</span>
                  <span className="mt-0.5 block text-[11px] font-normal text-ink-400">Providers just show interest</span>
                </button>
              </div>
            </Field>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Your budget (₹)" required hint="Your estimated or target budget">
                <TextInput
                  type="number"
                  min="0"
                  step="1"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  placeholder="e.g. 1500"
                  icon={<span>₹</span>}
                  required
                />
              </Field>

              <Field label="Experience level" hint="Required expertise level">
                <MultiSelect
                  options={EXPERIENCE_OPTIONS}
                  value={experienceLevels}
                  onChange={(vals) => setExperienceLevels(vals.length > 0 ? vals : ['any'])}
                  placeholder="Any experience"
                  searchable={false}
                />
              </Field>
            </div>

            <Field
              label="Service location"
              required
              hint={
                geoStatus === 'locating' || resolvingLocation
                  ? 'Detecting your coordinates...'
                  : 'Enter your locality or use GPS to help nearby providers discover this job'
              }
            >
              <div className="relative flex items-center">
                <TextInput
                  value={locationText}
                  onChange={(e) => setLocationText(e.target.value)}
                  placeholder={geoStatus === 'locating' || resolvingLocation ? 'Detecting your location...' : 'Locality / Area / City'}
                  className="pr-24"
                  required
                />
                <button
                  type="button"
                  onClick={requestLocation}
                  title="Detect GPS location"
                  className="absolute right-2 px-2.5 py-1 text-xs font-semibold text-brand-600 bg-brand-50 hover:bg-brand-100 rounded-lg border border-brand-200/50 flex items-center gap-1.5 transition-colors"
                >
                  <LocateFixed
                    size={14}
                    aria-hidden="true"
                    className={geoStatus === 'locating' || resolvingLocation ? 'animate-spin' : ''}
                  />
                  <span>{geoStatus === 'locating' || resolvingLocation ? 'Locating...' : 'Use GPS'}</span>
                </button>
              </div>
              {(geoStatus === 'denied' || geoStatus === 'unsupported' || geoStatus === 'error') && !isEditMode && (
                <p className="mt-1 text-xs text-danger-600">
                  Couldn&apos;t detect your location automatically — please type your area above,{' '}
                  <button type="button" onClick={requestLocation} className="underline hover:no-underline font-medium">
                    or try again
                  </button>
                  .
                </p>
              )}
            </Field>

            {isEditMode ? (
              requirement.media?.length > 0 && (
                <Field label="Photos / videos" hint="Media cannot be modified after initial posting">
                  <div className="flex flex-wrap gap-2.5">
                    {requirement.media.map((m, i) => (
                      <div key={m.url} className="h-16 w-16 overflow-hidden rounded-2xl bg-ink-100 ring-1 ring-ink-200 shadow-soft">
                        {m.type === 'video' ? (
                          <video src={mediaUrl(m.url)} className="h-full w-full object-cover" muted playsInline />
                        ) : (
                          <img src={mediaUrl(m.url)} alt={`Media ${i + 1}`} className="h-full w-full object-cover" />
                        )}
                      </div>
                    ))}
                  </div>
                </Field>
              )
            ) : (
              <Field label="Attach photos / videos" hint={`Up to ${MAX_MEDIA} images or videos to illustrate the work needed`}>
                <div className="flex flex-wrap gap-2.5">
                  {media.map((file, i) => (
                    <div key={`${file.name}-${i}`} className="relative h-16 w-16 overflow-hidden rounded-2xl ring-1 ring-ink-200 shadow-soft">
                      {file.type.startsWith('video/') ? (
                        <video src={URL.createObjectURL(file)} className="h-full w-full object-cover" muted playsInline />
                      ) : (
                        <img src={URL.createObjectURL(file)} alt={`Upload ${i + 1}`} className="h-full w-full object-cover" />
                      )}
                      <button
                        type="button"
                        onClick={() => removeMedia(i)}
                        aria-label="Remove file"
                        className="absolute right-1 top-1 rounded-full bg-ink-950/70 p-1 text-white hover:bg-danger-600 transition-colors"
                      >
                        <X size={10} aria-hidden="true" />
                      </button>
                    </div>
                  ))}
                  {media.length < MAX_MEDIA && (
                    <label className="flex h-16 w-16 cursor-pointer flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-ink-200 hover:border-brand-400 bg-ink-50/50 hover:bg-brand-50/30 text-ink-400 hover:text-brand-600 transition-all">
                      <Camera size={18} aria-hidden="true" />
                      <span className="text-[10px] font-medium">Add</span>
                      <input type="file" accept="image/*,video/*" multiple className="hidden" onChange={(e) => addMedia(e.target.files)} />
                    </label>
                  )}
                </div>
              </Field>
            )}

            {error && (
              <div className="p-3 rounded-2xl bg-danger-50 border border-danger-200 text-xs text-danger-700 font-medium">
                {error}
              </div>
            )}

            {uploadPhase === 'uploading' && (
              <div className="rounded-2xl bg-brand-50 p-3 border border-brand-100">
                <div className="flex justify-between text-xs font-semibold text-brand-700 mb-1.5">
                  <span>Uploading files...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-brand-200 overflow-hidden">
                  <div
                    className="h-full bg-brand-600 rounded-full transition-all duration-200"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            <div className="pt-2">
              <Button type="submit" fullWidth loading={submitting} size="lg">
                {submitting
                  ? uploadPhase === 'uploading'
                    ? `Uploading media... ${uploadProgress}%`
                    : isEditMode
                      ? 'Saving changes...'
                      : targetProvider
                        ? 'Sending request...'
                        : 'Publishing requirement...'
                  : isEditMode
                    ? 'Save changes'
                    : targetProvider
                      ? `Send request to ${targetProvider.name}`
                      : 'Post requirement now'}
              </Button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}
