'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../../../lib/api';
import { useToast } from '../../../../components/ui/Toast';
import ProtectedRoute from '../../../../components/ProtectedRoute';
import Card from '../../../../components/ui/Card';
import Button from '../../../../components/ui/Button';
import Spinner from '../../../../components/ui/Spinner';
import { Field, TextInput, TextArea, SelectInput, TagAutocompleteInput } from '../../../../components/ui/Field';
import { LANGUAGES } from '../../../../lib/languages';
import { priceTypeShortLabel } from '../../../../lib/priceType';
import MultiSelect from '../../../../components/ui/MultiSelect';
import { uploadMediaDetailed } from '../../../../lib/uploadService';
import { resolveMediaUrl } from '../../../../components/chat/mediaUrl';
import useGeolocation from '../../../../lib/useGeolocation';
import { forwardGeocode, reverseGeocodeDetailed } from '../../../../lib/geocode';
import {
  IdCard, Briefcase, ListChecks, Image as ImageIcon, Calendar,
  ShieldCheck, ArrowLeft, ArrowRight, UploadCloud, X, CircleCheck,
} from 'lucide-react';

const STEPS = [
  { key: 'basics', label: 'Basic info', icon: IdCard },
  { key: 'experience', label: 'Experience', icon: Briefcase },
  { key: 'services', label: 'Services', icon: ListChecks },
  { key: 'portfolio', label: 'Portfolio', icon: ImageIcon },
  { key: 'availability', label: 'Availability', icon: Calendar },
  { key: 'review', label: 'Review & save', icon: ShieldCheck },
];

const deriveFromServices = (services) => {
  const categories = [];
  const skills = [];
  let starting_price = '';
  let starting_price_type = 'fixed';
  services.forEach((s) => {
    const categoryId = typeof s.category === 'string' ? s.category : s.category?.id;
    if (categoryId && !categories.includes(categoryId)) categories.push(categoryId);
    if (s.title && !skills.includes(s.title)) skills.push(s.title);
    const price = Number(s.price);
    if (!Number.isNaN(price) && (starting_price === '' || price < starting_price)) {
      starting_price = price;
      starting_price_type = s.price_type || 'fixed';
    }
  });
  return { categories, skills, starting_price, starting_price_type };
};

const EMPTY_FORM = {
  professional_title: '',
  bio: '',
  city: '',
  service_area: '',
  experience_years: '',
  categories: [],
  skills: [],
  languages: [],
  certifications: [],
  portfolio: [],
  service_radius_km: '',
  starting_price: '',
  starting_price_type: 'fixed',
  is_available: true,
  availability: { days: [], hours_from: '09:00', hours_to: '18:00', advance_booking_days: 1 },
  location: { text: '', lat: null, lng: null },
};

const ALL_DAYS = [
  { key: 'mon', label: 'Mon' }, { key: 'tue', label: 'Tue' }, { key: 'wed', label: 'Wed' },
  { key: 'thu', label: 'Thu' }, { key: 'fri', label: 'Fri' }, { key: 'sat', label: 'Sat' }, { key: 'sun', label: 'Sun' },
];

function ProviderProfileEditContent() {
  const router = useRouter();
  const { toast } = useToast();
  const { coords, status: geoStatus } = useGeolocation({ auto: false });

  const [initializing, setInitializing] = useState(true);
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [services, setServices] = useState([]);
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  const [catalogCategoryId, setCatalogCategoryId] = useState('');
  const [catalogOptions, setCatalogOptions] = useState([]);
  const [selectedCatalogIds, setSelectedCatalogIds] = useState([]);
  const [catalogPrices, setCatalogPrices] = useState({});
  const [catalogPriceType, setCatalogPriceType] = useState('fixed');
  const [certForm, setCertForm] = useState({ title: '', issuer: '', year: '' });
  const [portfolioForm, setPortfolioForm] = useState({ image_url: '', title: '', description: '' });
  const [portfolioUploading, setPortfolioUploading] = useState(false);
  const [resolvingLocation, setResolvingLocation] = useState(false);
  const hasSavedLocationRef = useRef(false);
  const userEditedLocationRef = useRef(false);
  const skipNextForwardGeocode = useRef(false);

  useEffect(() => {
    const init = async () => {
      try {
        const [{ data: profileData }, { data: catData }, { data: svcData }] = await Promise.all([
          api.get('/providers/me'),
          api.get('/categories'),
          api.get('/services/my/listings').catch(() => ({ data: { services: [] } })),
        ]);
        setCategories(catData.categories || []);
        const loadedServices = svcData.services || [];
        setServices(loadedServices);
        const derived = deriveFromServices(loadedServices);
        if (profileData.profile) {
          const p = profileData.profile;
          setForm({
            professional_title: p.professional_title || '',
            bio: p.bio || '',
            city: p.city || '',
            service_area: p.service_area || '',
            experience_years: p.experience_years ?? '',
            categories: derived.categories,
            skills: derived.skills,
            languages: p.languages || [],
            certifications: p.certifications || [],
            portfolio: p.portfolio || [],
            service_radius_km: p.service_radius_km || '',
            starting_price: derived.starting_price !== '' ? derived.starting_price : (p.starting_price || ''),
            starting_price_type: derived.starting_price !== '' ? derived.starting_price_type : (p.starting_price_type || 'fixed'),
            is_available: p.is_available ?? true,
            availability: p.availability || EMPTY_FORM.availability,
            location: p.location || EMPTY_FORM.location,
          });
          if (p.location?.lat != null && p.location?.lng != null) {
            hasSavedLocationRef.current = true;
            skipNextForwardGeocode.current = true;
          }
        }
      } finally {
        setInitializing(false);
      }
    };
    init();
  }, []);

  useEffect(() => {
    if (initializing) return;
    if (geoStatus !== 'ready' || !coords) return;
    if (hasSavedLocationRef.current) return;
    if (userEditedLocationRef.current) return;

    setResolvingLocation(true);
    skipNextForwardGeocode.current = true;
    setForm((f) => ({ ...f, location: { text: 'Locating your address...', lat: coords.lat, lng: coords.lng } }));
    let cancelled = false;
    reverseGeocodeDetailed(coords.lat, coords.lng).then((result) => {
      if (cancelled) return;
      if (userEditedLocationRef.current) {
        setResolvingLocation(false);
        return;
      }
      const text = result?.text || `Near ${coords.lat.toFixed(3)}, ${coords.lng.toFixed(3)}`;
      skipNextForwardGeocode.current = true;
      setForm((f) => ({
        ...f,
        location: { text, lat: coords.lat, lng: coords.lng },
        city: result?.city || f.city,
        service_area: text,
      }));
      setResolvingLocation(false);
    });
    return () => {
      cancelled = true;
    };
  }, [geoStatus, coords, initializing]);

  useEffect(() => {
    if (initializing) return;
    if (skipNextForwardGeocode.current) {
      skipNextForwardGeocode.current = false;
      return;
    }
    const text = form.location.text.trim();
    if (text.length < 3) return;

    setResolvingLocation(true);
    const controller = new AbortController();
    const timer = setTimeout(() => {
      forwardGeocode(text, { signal: controller.signal })
        .then((result) => {
          if (result) {
            skipNextForwardGeocode.current = true;
            setForm((f) => ({
              ...f,
              location: { text: f.location.text, lat: result.lat, lng: result.lng },
              service_area: f.location.text,
            }));
          }
        })
        .finally(() => setResolvingLocation(false));
    }, 600);

    return () => {
      clearTimeout(timer);
      controller.abort();
      setResolvingLocation(false);
    };
  }, [form.location.text, initializing]);

  useEffect(() => {
    if (!catalogCategoryId) {
      setCatalogOptions([]);
      return;
    }
    api
      .get('/service-catalog', { params: { category_id: catalogCategoryId } })
      .then(({ data }) => setCatalogOptions(data.services || []))
      .catch(() => setCatalogOptions([]));
  }, [catalogCategoryId]);

  const saveProgress = async (silent = false) => {
    setSaving(true);
    try {
      await api.put('/providers/me', form);
      if (!silent) toast('Profile updated', { type: 'success' });
      return true;
    } catch (err) {
      toast(err.response?.data?.message || 'Could not save profile', { type: 'error' });
      return false;
    } finally {
      setSaving(false);
    }
  };

  const flatCategories = categories;
  const addedCatalogServiceIds = new Set(services.map((s) => (typeof s.catalog_service === 'string' ? s.catalog_service : s.catalog_service?.id)).filter(Boolean));

  const goNext = async () => {
    const ok = await saveProgress(true);
    if (ok) setStep((s) => Math.min(STEPS.length - 1, s + 1));
  };

  const goBack = () => setStep((s) => Math.max(0, s - 1));
  const goToStep = (targetIndex) => setStep(targetIndex);

  const addServices = async ({ silent = false } = {}) => {
    if (selectedCatalogIds.length === 0) {
      if (!silent) toast('Select at least one service', { type: 'error' });
      return false;
    }
    const idsToSubmit = selectedCatalogIds.filter((id) => !addedCatalogServiceIds.has(id));
    if (idsToSubmit.length === 0) {
      setSelectedCatalogIds([]);
      setCatalogPrices({});
      if (!silent) toast("You've already added the selected service(s)", { type: 'error' });
      return false;
    }
    const items = idsToSubmit.map((id) => ({
      catalog_service_id: id,
      price: catalogPrices[id],
      price_type: catalogPriceType,
    }));
    if (items.some((it) => !it.price)) {
      if (!silent) toast('Enter a price for every service you selected', { type: 'error' });
      return false;
    }
    try {
      const { data } = await api.post('/services/bulk', { items });
      if (data.failed?.length > 0) {
        data.failed.forEach((f) => toast(f.message, { type: 'error' }));
      }
      if (data.services?.length > 0) {
        const updatedServices = [...data.services, ...services];
        setServices(updatedServices);
        const derived = deriveFromServices(updatedServices);
        setForm((f) => ({
          ...f,
          categories: derived.categories,
          skills: derived.skills,
          starting_price: derived.starting_price,
          starting_price_type: derived.starting_price_type,
        }));
        toast(`${data.services.length} service(s) added`, { type: 'success' });
      }
      setCatalogCategoryId('');
      setCatalogOptions([]);
      setSelectedCatalogIds([]);
      setCatalogPrices({});
      return (data.services?.length || 0) > 0;
    } catch (err) {
      toast(err.response?.data?.message || 'Could not add services', { type: 'error' });
      return false;
    }
  };

  const removeService = async (id) => {
    try {
      await api.delete(`/services/${id}`);
      const updatedServices = services.filter((s) => s.id !== id);
      setServices(updatedServices);
      const derived = deriveFromServices(updatedServices);
      setForm((f) => ({
        ...f,
        categories: derived.categories,
        skills: derived.skills,
        starting_price: derived.starting_price,
        starting_price_type: derived.starting_price_type,
      }));
      toast('Listing removed', { type: 'info' });
    } catch (err) {
      toast(err.response?.data?.message || 'Could not remove listing', { type: 'error' });
    }
  };

  const addCertification = () => {
    if (!certForm.title) return;
    setForm((f) => ({ ...f, certifications: [...f.certifications, { ...certForm, year: certForm.year ? Number(certForm.year) : undefined }] }));
    setCertForm({ title: '', issuer: '', year: '' });
  };

  const addPortfolioItem = async () => {
    if (!portfolioForm.image_url) return;
    const nextPortfolio = [...form.portfolio, portfolioForm];
    setForm((f) => ({ ...f, portfolio: nextPortfolio }));
    setPortfolioForm({ image_url: '', title: '', description: '' });

    // Persist immediately (same as the quick "Add Work" modal) instead of
    // waiting for the wizard's Next/Save step - otherwise the item only
    // lives in local state and is silently lost if the provider leaves
    // this step (e.g. via the Back button) without saving.
    try {
      await api.put('/providers/me', { portfolio: nextPortfolio });
      toast('Portfolio work added', { type: 'success' });
    } catch (err) {
      toast(err.response?.data?.message || 'Could not save portfolio item, please try again', { type: 'error' });
    }
  };

  const removePortfolioItem = async (index) => {
    const nextPortfolio = form.portfolio.filter((_, idx) => idx !== index);
    setForm((f) => ({ ...f, portfolio: nextPortfolio }));
    try {
      await api.put('/providers/me', { portfolio: nextPortfolio });
    } catch (err) {
      toast(err.response?.data?.message || 'Could not remove portfolio item, please try again', { type: 'error' });
    }
  };

  const handlePortfolioFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type?.startsWith('image/')) {
      toast('Please choose an image file', { type: 'error' });
      return;
    }
    setPortfolioUploading(true);
    try {
      const { url } = await uploadMediaDetailed(file);
      setPortfolioForm((p) => ({ ...p, image_url: url }));
    } catch (err) {
      toast(err.response?.data?.message || 'Could not upload image', { type: 'error' });
    } finally {
      setPortfolioUploading(false);
    }
  };

  const toggleDay = (day) => {
    setForm((f) => ({
      ...f,
      availability: {
        ...f.availability,
        days: f.availability.days.includes(day) ? f.availability.days.filter((d) => d !== day) : [...f.availability.days, day],
      },
    }));
  };

  const handleSave = async () => {
    const ok = await saveProgress(false);
    if (ok) router.push('/provider/profile');
  };

  if (initializing) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Spinner size={28} className="text-brand-600" />
      </div>
    );
  }

  const stepDef = STEPS[step];

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-ink-100">
        <div className="flex items-center gap-3">
          <button
            onClick={async () => {
              // Safety net: don't silently drop any unsaved step data
              // (e.g. a photo added on the Portfolio step) when leaving
              // via Back instead of Next/Save.
              await saveProgress(true);
              router.push('/provider/profile');
            }}
            aria-label="Back"
            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl border border-ink-200 text-ink-500 transition-colors hover:bg-ink-50 hover:text-ink-900"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-ink-900 tracking-tight">Edit provider profile</h1>
            <p className="mt-1 text-xs sm:text-sm text-ink-500">Update your professional profile any time.</p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {STEPS.map((s, i) => {
          const Icon = s.icon;
          const isCurrent = i === step;
          const isCompleted = i < step;
          return (
            <button
              key={s.key}
              onClick={() => goToStep(i)}
              className={`flex-shrink-0 inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all duration-200 ${
                isCurrent
                  ? 'bg-brand-600 text-white shadow-soft shadow-brand-600/30'
                  : isCompleted
                    ? 'bg-trust-50 border border-trust-200/70 text-trust-700 hover:bg-trust-100/60'
                    : 'bg-white border border-ink-200/70 text-ink-400 hover:text-ink-600'
              }`}
            >
              {isCompleted ? (
                <CircleCheck size={14} className="text-trust-600" />
              ) : (
                <Icon size={14} aria-hidden="true" />
              )}
              <span>{s.label}</span>
            </button>
          );
        })}
      </div>

      <Card className="p-6 sm:p-8 rounded-3xl border border-ink-200/80 bg-white shadow-card-hover" hover={false}>
        <AnimatePresence mode="wait">
          <motion.div
            key={stepDef.key}
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          >
            {stepDef.key === 'basics' && (
              <div className="space-y-4">
                <h2 className="font-semibold text-ink-900">Basic professional information</h2>
                <Field label="Professional title" hint='e.g. "Licensed Plumber" or "Wedding Photographer"'>
                  <TextInput value={form.professional_title} onChange={(e) => setForm((f) => ({ ...f, professional_title: e.target.value }))} placeholder="Your professional title" />
                </Field>
                <Field label="Bio / about" hint="Tell customers about your background and what makes you great at what you do.">
                  <TextArea rows={4} value={form.bio} onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))} placeholder="Write a short professional bio..." />
                </Field>
                <Field
                  label="Precise location"
                  hint="Edit it any time and we'll update the coordinates to match what you type."
                >
                  <TextInput
                    value={form.location.text}
                    onChange={(e) => {
                      userEditedLocationRef.current = true;
                      setForm((f) => ({ ...f, location: { ...f.location, text: e.target.value } }));
                    }}
                    placeholder="Your area / locality"
                  />
                  {(geoStatus === 'locating' || resolvingLocation) && (
                    <p className="mt-1 text-xs text-ink-400">Locating...</p>
                  )}
                  {form.location.lat != null && !(geoStatus === 'locating' || resolvingLocation) && (
                    <p className="mt-1 text-xs text-green-600">Location captured &mdash; this is what customers' jobs will be matched against.</p>
                  )}
                  {geoStatus === 'denied' && (
                    <p className="mt-1 text-xs text-red-600">Location access was denied - type your area above so nearby job alerts work.</p>
                  )}
                </Field>
                <Field label="Languages" hint="Type a language and press Enter">
                  <TagAutocompleteInput
                    value={form.languages}
                    onChange={(languages) => setForm((f) => ({ ...f, languages }))}
                    suggestions={LANGUAGES}
                    placeholder="e.g. Hindi, English..."
                  />
                </Field>
                <Field label="Service radius (km)" hint="Only jobs posted within this radius of your location will show up in your feed">
                  <TextInput type="number" value={form.service_radius_km} onChange={(e) => setForm((f) => ({ ...f, service_radius_km: e.target.value }))} placeholder="e.g. 10" />
                </Field>
                <Field label="Starting price (₹)" hint="Set automatically from the cheapest service you offer - add or edit prices in the Services step">
                  <div className="flex items-center gap-2">
                    <TextInput type="number" value={form.starting_price} disabled placeholder="Add a service to set this" className="flex-1" />
                    {form.starting_price !== '' && (
                      <span className="shrink-0 rounded-lg bg-ink-100 px-2.5 py-2 text-xs font-semibold capitalize text-ink-600">
                        {priceTypeShortLabel(form.starting_price_type)}
                      </span>
                    )}
                  </div>
                </Field>
              </div>
            )}

            {stepDef.key === 'experience' && (
              <div className="space-y-4">
                <h2 className="font-semibold text-ink-900">Experience</h2>
                <Field label="Years of experience">
                  <TextInput type="number" min="0" value={form.experience_years} onChange={(e) => setForm((f) => ({ ...f, experience_years: e.target.value }))} placeholder="e.g. 5" />
                </Field>
                <Field label="Certifications" hint="Optional, but builds trust with customers">
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_100px_auto]">
                    <TextInput placeholder="Certification title" value={certForm.title} onChange={(e) => setCertForm((c) => ({ ...c, title: e.target.value }))} />
                    <TextInput placeholder="Issuer" value={certForm.issuer} onChange={(e) => setCertForm((c) => ({ ...c, issuer: e.target.value }))} />
                    <TextInput placeholder="Year" type="number" value={certForm.year} onChange={(e) => setCertForm((c) => ({ ...c, year: e.target.value }))} />
                    <Button type="button" variant="secondary" size="md" onClick={addCertification}>Add</Button>
                  </div>
                  {form.certifications.length > 0 && (
                    <ul className="mt-3 space-y-1.5">
                      {form.certifications.map((c, i) => (
                        <li key={i} className="flex items-center justify-between rounded-lg bg-ink-50 px-3 py-2 text-sm">
                          <span>{c.title} &mdash; {c.issuer} {c.year ? `(${c.year})` : ''}</span>
                          <button onClick={() => setForm((f) => ({ ...f, certifications: f.certifications.filter((_, idx) => idx !== i) }))} aria-label="Remove">
                            <X size={16} className="text-ink-400 hover:text-red-500" aria-hidden="true" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </Field>
              </div>
            )}

            {stepDef.key === 'services' && (
              <div className="space-y-4">
                <h2 className="font-semibold text-ink-900">Services</h2>
                <p className="text-sm text-ink-500">
                  Pick from the services set up by the admin, then set your own price for each.
                </p>
                <div className="space-y-3 rounded-xl border border-ink-100 bg-ink-50/50 p-4">
                  <SelectInput
                    value={catalogCategoryId}
                    onChange={(e) => {
                      setCatalogCategoryId(e.target.value);
                      setSelectedCatalogIds([]);
                    }}
                  >
                    <option value="">Select category</option>
                    {flatCategories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </SelectInput>

                  {catalogCategoryId && (
                    <MultiSelect
                      options={catalogOptions
                        .filter((s) => !addedCatalogServiceIds.has(s.id))
                        .map((s) => ({ value: s.id, label: s.name }))}
                      value={selectedCatalogIds}
                      onChange={setSelectedCatalogIds}
                      placeholder={
                        catalogOptions.length === 0
                          ? 'No services set up under this category yet'
                          : catalogOptions.every((s) => addedCatalogServiceIds.has(s.id))
                            ? "You've already added every service in this category"
                            : 'Select the services you offer'
                      }
                    />
                  )}

                  {selectedCatalogIds.length > 0 && (
                    <>
                      <div className="space-y-2 rounded-lg border border-ink-100 bg-white p-3">
                        {selectedCatalogIds.map((id) => {
                          const svc = catalogOptions.find((o) => o.id === id);
                          return (
                            <div key={id} className="flex items-center justify-between gap-3">
                              <span className="flex-1 text-sm text-ink-700">{svc?.name}</span>
                              <TextInput
                                type="number"
                                min="0"
                                placeholder="Your price (₹)"
                                className="w-32"
                                value={catalogPrices[id] || ''}
                                onChange={(e) => setCatalogPrices((p) => ({ ...p, [id]: e.target.value }))}
                              />
                            </div>
                          );
                        })}
                      </div>
                      <SelectInput value={catalogPriceType} onChange={(e) => setCatalogPriceType(e.target.value)}>
                        <option value="fixed">Fixed</option>
                        <option value="hourly">Hourly</option>
                        <option value="estimate">Estimate</option>
                      </SelectInput>
                    </>
                  )}

                  <Button type="button" size="sm" onClick={() => addServices()} disabled={selectedCatalogIds.length === 0}>
                    Add {selectedCatalogIds.length > 1 ? `${selectedCatalogIds.length} services` : 'service'}
                  </Button>
                </div>

                {services.length > 0 && (
                  <ul className="space-y-2">
                    {services.map((s) => (
                      <li key={s.id} className="flex items-center justify-between rounded-lg border border-ink-100 px-3 py-2.5 text-sm">
                        <span className="font-medium text-ink-800">{s.title}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-ink-500">&#8377;{s.price}{s.price_type === 'hourly' ? '/hr' : ''}</span>
                          <button onClick={() => removeService(s.id)} className="text-xs font-medium text-red-600 hover:underline">
                            Remove
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
                {services.length === 0 && <p className="text-sm text-ink-400">No listings yet &mdash; add one above.</p>}
              </div>
            )}

            {stepDef.key === 'portfolio' && (
              <div className="space-y-4">
                <h2 className="font-semibold text-ink-900">Portfolio</h2>
                <p className="text-sm text-ink-500">Optional, but strongly recommended &mdash; show off previous work.</p>
                <div className="space-y-3 rounded-xl border border-ink-100 bg-ink-50/50 p-4">
                  {portfolioForm.image_url ? (
                    <div className="relative h-32 w-full overflow-hidden rounded-lg border border-ink-100">
                      <img src={resolveMediaUrl(portfolioForm.image_url)} alt="" className="h-full w-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setPortfolioForm((p) => ({ ...p, image_url: '' }))}
                        className="absolute right-2 top-2 rounded-full bg-black/60 p-1 text-white"
                        aria-label="Remove image"
                      >
                        <X size={14} aria-hidden="true" />
                      </button>
                    </div>
                  ) : (
                    <label className="flex h-28 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-ink-200 bg-white transition-colors hover:border-brand-300">
                      {portfolioUploading ? (
                        <>
                          <Spinner size={20} />
                          <span className="text-xs font-semibold text-ink-500">Uploading...</span>
                        </>
                      ) : (
                        <>
                          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-50">
                            <UploadCloud size={16} className="text-brand-600" aria-hidden="true" />
                          </span>
                          <span className="text-xs font-semibold text-ink-900">Click to upload a photo</span>
                          <span className="text-[11px] text-ink-400">JPG, PNG or WEBP</span>
                        </>
                      )}
                      <input type="file" accept="image/*" className="hidden" onChange={handlePortfolioFile} disabled={portfolioUploading} />
                    </label>
                  )}
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <TextInput placeholder="Project title" value={portfolioForm.title} onChange={(e) => setPortfolioForm((p) => ({ ...p, title: e.target.value }))} />
                    <TextInput placeholder="Short description" value={portfolioForm.description} onChange={(e) => setPortfolioForm((p) => ({ ...p, description: e.target.value }))} />
                  </div>
                  <Button type="button" size="sm" onClick={addPortfolioItem} disabled={!portfolioForm.image_url || portfolioUploading}>
                    Add to portfolio
                  </Button>
                </div>
                {form.portfolio.length > 0 && (
                  <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
                    {form.portfolio.map((item, i) => (
                      <div key={i} className="group relative overflow-hidden rounded-lg">
                        <img src={resolveMediaUrl(item.image_url)} alt={item.title} className="h-24 w-full object-cover" />
                        <button
                          onClick={() => removePortfolioItem(i)}
                          className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100"
                          aria-label="Remove"
                        >
                          <X size={12} aria-hidden="true" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {stepDef.key === 'availability' && (
              <div className="space-y-4">
                <h2 className="font-semibold text-ink-900">Availability</h2>
                <Field label="Working days">
                  <div className="flex flex-wrap gap-2">
                    {ALL_DAYS.map((d) => (
                      <button
                        type="button"
                        key={d.key}
                        onClick={() => toggleDay(d.key)}
                        className={`h-10 w-14 rounded-lg border text-sm font-medium transition-colors ${
                          form.availability.days.includes(d.key) ? 'border-brand-600 bg-brand-600 text-white' : 'border-ink-200 text-ink-600 hover:border-brand-300'
                        }`}
                      >
                        {d.label}
                      </button>
                    ))}
                  </div>
                </Field>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <Field label="Working hours from">
                    <TextInput type="time" value={form.availability.hours_from} onChange={(e) => setForm((f) => ({ ...f, availability: { ...f.availability, hours_from: e.target.value } }))} />
                  </Field>
                  <Field label="Working hours to">
                    <TextInput type="time" value={form.availability.hours_to} onChange={(e) => setForm((f) => ({ ...f, availability: { ...f.availability, hours_to: e.target.value } }))} />
                  </Field>
                  <Field label="Advance notice (days)" hint="Minimum notice you need">
                    <TextInput type="number" min="0" value={form.availability.advance_booking_days} onChange={(e) => setForm((f) => ({ ...f, availability: { ...f.availability, advance_booking_days: e.target.value } }))} />
                  </Field>
                </div>
                <label className="flex items-center gap-2 text-sm text-ink-700">
                  <input
                    type="checkbox"
                    checked={form.is_available}
                    onChange={(e) => setForm((f) => ({ ...f, is_available: e.target.checked }))}
                    className="h-4 w-4 rounded border-ink-300 text-brand-600 focus:ring-brand-400"
                  />
                  Currently available for new jobs
                </label>
              </div>
            )}

            {stepDef.key === 'review' && (
              <div className="space-y-5">
                <h2 className="font-semibold text-ink-900">Review & save</h2>
                <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
                  <div className="rounded-lg bg-ink-50 p-3"><p className="text-ink-400">Title</p><p className="font-medium text-ink-800">{form.professional_title || '—'}</p></div>
                  <div className="rounded-lg bg-ink-50 p-3"><p className="text-ink-400">Location</p><p className="font-medium text-ink-800">{form.location.text || '—'}</p></div>
                  <div className="rounded-lg bg-ink-50 p-3"><p className="text-ink-400">Experience</p><p className="font-medium text-ink-800">{form.experience_years || '—'} yrs</p></div>
                  <div className="rounded-lg bg-ink-50 p-3"><p className="text-ink-400">Service radius</p><p className="font-medium text-ink-800">{form.service_radius_km ? `${form.service_radius_km} km` : '—'}</p></div>
                  <div className="rounded-lg bg-ink-50 p-3"><p className="text-ink-400">Services</p><p className="font-medium text-ink-800">{services.length}</p></div>
                  <div className="rounded-lg bg-ink-50 p-3"><p className="text-ink-400">Languages</p><p className="font-medium text-ink-800">{form.languages.length}</p></div>
                </div>

                <Button fullWidth size="lg" loading={saving} onClick={handleSave}>
                  Save changes
                </Button>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </Card>

      {stepDef.key !== 'review' && (
        <div className="mt-5 flex items-center justify-between">
          <Button variant="ghost" onClick={goBack} disabled={step === 0}>
            <ArrowLeft size={16} aria-hidden="true" /> Back
          </Button>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              loading={saving}
              onClick={async () => {
                const ok = await saveProgress(false);
                if (ok) router.push('/provider/profile');
              }}
            >
              Save & exit
            </Button>
            <Button onClick={goNext}>
              Next <ArrowRight size={16} aria-hidden="true" />
            </Button>
          </div>
        </div>
      )}
      {stepDef.key === 'review' && (
        <div className="mt-5">
          <Button variant="ghost" onClick={goBack}>
            <ArrowLeft size={16} aria-hidden="true" /> Back
          </Button>
        </div>
      )}
    </div>
  );
}

export default function ProviderProfileEditPage() {
  return (
    <ProtectedRoute allowedRoles={['provider']}>
      <ProviderProfileEditContent />
    </ProtectedRoute>
  );
}