'use client';

import { motion } from 'framer-motion';
import {
    ArrowUpDown,
    Briefcase,
    Calendar,
    Camera,
    CheckCircle2,
    ChevronDown,
    CircleDashed,
    Clock,
    FileText,
    GraduationCap,
    Image as ImageIcon,
    MapPin,
    MessageSquare,
    Pencil,
    Phone,
    Plus,
    Share2,
    ShieldCheck,
    Star,
    Wallet
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { useMemo, useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../lib/api';
import { priceTypeShortLabel } from '../../lib/priceType';
import ChangePasswordCard from '../ChangePasswordCard';
import ContactUpdateCard from '../ContactUpdateCard';
import Button from '../ui/Button';
import Card from '../ui/Card';
import { Field, TextInput } from '../ui/Field';
import { useToast } from '../ui/Toast';
import Avatar from './Avatar';
import StarRating from './StarRating';
const AddCertificationModal = dynamic(() => import('./AddCertificationModal'));
const AddPortfolioModal = dynamic(() => import('./AddPortfolioModal'));

const avatarUrl = (url) => (!url ? null : url);

const DAY_LABELS = { mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat', sun: 'Sun' };

const fadeUp = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
};

const StatBox = ({ icon: Icon, value, label, iconBg, iconColor }) => (
  <div className="flex gap-3 rounded-xl border border-ink-100 bg-white p-6 shadow-card">
    <span className={`flex h-12 w-12 items-center justify-center rounded-lg ${iconBg}`}>
      <Icon className={`h-6 w-6 ${iconColor}`} />
    </span>
    <div className="mt-1 flex flex-col gap-1">
      <span className="text-[11px] font-bold uppercase tracking-wide text-ink-400">{label}</span>
      <span className="text-lg font-bold leading-none text-ink-900">{value}</span>
    </div>
  </div>
);

const VerificationRow = ({ label, verified }) => (
  <div className="flex items-center justify-between py-2 first:pt-0 last:pb-0">
    <span className="text-sm text-ink-900">{label}</span>
    {verified ? (
      <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-brand-600">
        <CheckCircle2 className="h-3.5 w-3.5 text-white" />
      </span>
    ) : (
      <CircleDashed className="h-4 w-4 flex-shrink-0 text-ink-400" />
    )}
  </div>
);

const NameUpdateCard = () => {
  const { user, updateLocalUser } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(user?.name || '');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!value.trim()) {
      setError('Name cannot be empty');
      return;
    }
    setSaving(true);
    try {
      const { data } = await api.put('/auth/me', { name: value.trim() });
      updateLocalUser({ name: data.user.name });
      toast('Name updated', { type: 'success' });
      setOpen(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not update name, please try again');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="p-5" hover={false}>
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-ink-900">Full name</h2>
        {!open && (
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              setValue(user?.name || '');
              setOpen(true);
            }}
          >
            Change
          </Button>
        )}
      </div>

      {!open && <p className="mt-1 text-sm text-ink-500">{user?.name || <span className="italic text-ink-400">Not set</span>}</p>}

      {open && (
        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4">
          <Field label="Full name" required>
            <TextInput value={value} onChange={(e) => setValue(e.target.value)} required />
          </Field>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-3">
            <Button type="submit" loading={saving}>Save</Button>
            <Button type="button" variant="ghost" disabled={saving} onClick={() => setOpen(false)}>Cancel</Button>
          </div>
        </form>
      )}
    </Card>
  );
};

const InfoLine = ({ icon: Icon, label, children, action }) => (
  <div className="flex items-start gap-2.5">
    <Icon className="mt-0.5 h-4 w-4 flex-shrink-0 text-ink-400" />
    <div className="min-w-0 flex-1">
      <div className="text-[11px] text-ink-400">{label}</div>
      <div className="break-words text-sm font-medium text-ink-900">{children}</div>
      {action}
    </div>
  </div>
);

const SectionHeader = ({ icon: Icon, title, action }) => (
  <div className="flex items-center justify-between bg-brand-50 px-4 py-3">
    <h4 className="flex items-center gap-1.5 text-sm font-semibold text-ink-900">
      <Icon className="h-4 w-4 text-brand-600" />
      {title}
    </h4>
    {action}
  </div>
);

const PricingTile = ({ icon: Icon, label, value, badge, onEdit }) => (
  <div className="flex-1 rounded-xl border border-ink-100 bg-white p-4">
    <div className="flex items-start justify-between gap-2">
      <div className="min-w-0">
        <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-ink-400">
          <Icon className="h-3 w-3" />
          {label}
        </span>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-sm font-semibold text-ink-900">
          {value}
          {badge && <span className="rounded-full bg-brand-50 px-1.5 py-0.5 text-[10px] font-medium text-brand-700">{badge}</span>}
        </div>
      </div>
      <button type="button" onClick={onEdit} className="flex-shrink-0 text-ink-400 transition-colors hover:text-brand-600">
        <Pencil className="h-3.5 w-3.5" />
      </button>
    </div>
  </div>
);

function timeAgo(dateInput) {
  if (!dateInput) return null;
  const diff = Date.now() - new Date(dateInput).getTime();
  if (Number.isNaN(diff)) return null;
  const days = Math.floor(diff / 86400000);
  if (days < 1) return 'Today';
  if (days === 1) return '1 day ago';
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} month${months === 1 ? '' : 's'} ago`;
  const years = Math.floor(months / 12);
  return `${years} year${years === 1 ? '' : 's'} ago`;
}

const ReviewCard = ({ review }) => {
  const name = review.customer?.name || 'Customer';
  const relativeTime = timeAgo(review.createdAt);

  return (
    <div className="rounded-xl border border-ink-100 p-3.5">
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-start gap-3">
          <Avatar name={name} size="w-9 h-9" textSize="text-xs" />
          <div className="min-w-0">
            <span className="block truncate text-sm font-semibold text-ink-900">{name}</span>
            <div className="flex flex-wrap items-center gap-1.5">
              <StarRating value={review.rating} readOnly size="w-3.5 h-3.5" />
              <span className="text-xs font-semibold text-ink-900">{Number(review.rating || 0).toFixed(1)}</span>
              {relativeTime && (
                <>
                  <span className="text-xs text-ink-400">&bull;</span>
                  <span className="text-xs text-ink-400">{relativeTime}</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {review.title && <p className="mt-2.5 text-sm font-semibold text-ink-900">{review.title}</p>}
      {review.comment && <p className="mt-1 text-sm text-ink-700">{review.comment}</p>}

      {review.provider_response?.text && (
        <div className="mt-2.5 rounded-lg bg-ink-50 p-3">
          <p className="text-xs font-medium text-ink-500">Your response</p>
          <p className="mt-1 text-sm text-ink-700">{review.provider_response.text}</p>
        </div>
      )}

      <div className="mt-2 flex justify-end">
        <button
          type="button"
          onClick={() => navigator.share?.({ title: name, text: review.comment || '' })}
          className="text-ink-400 transition-colors hover:text-ink-700"
        >
          <Share2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

const formatAvailability = (availability) => {
  if (!availability) return 'Mon - Sat 9:00 AM - 6:00 PM';
  const days = Array.isArray(availability.days) && availability.days.length > 0
    ? availability.days.map((d) => DAY_LABELS[d] || d).join(', ')
    : 'Mon - Sat';
  const from = availability.hours_from || '09:00';
  const to = availability.hours_to || '18:00';
  return `${days} \u00b7 ${from} - ${to}`;
};

export default function MyProviderProfileView({ profile, services, reviews, onEdit, onProfileUpdated }) {
  const { user, updateLocalUser } = useAuth();
  const { toast } = useToast();
  const [showAddCertification, setShowAddCertification] = useState(false);
  const [showAddPortfolio, setShowAddPortfolio] = useState(false);
  const [sortBy, setSortBy] = useState('newest');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const avatarInputRef = useRef(null);

  const handleAvatarSelect = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append('avatar', file);
      const { data } = await api.post('/auth/me/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      updateLocalUser({ avatar_url: data.user.avatar_url });
      toast('Photo updated', { type: 'success' });
    } catch (err) {
      toast(err.response?.data?.message || 'Could not update photo. Please try again.', { type: 'error' });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const syncProfile = async (payload, successMsg) => {
    setSyncing(true);
    try {
      const { data } = await api.put('/providers/me', payload);
      onProfileUpdated?.(data.profile);
      toast(successMsg, { type: 'success' });
      return true;
    } catch (err) {
      toast(err.response?.data?.message || 'Could not save. Please try again.', { type: 'error' });
      return false;
    } finally {
      setSyncing(false);
    }
  };

  const handleSaveCertification = async (entry) => {
    const next = [...certifications, entry];
    const ok = await syncProfile({ certifications: next }, 'Certification added');
    if (ok) setShowAddCertification(false);
  };

  const handleSavePortfolio = async (entries) => {
    const newEntries = Array.isArray(entries) ? entries : [entries];
    const next = [...portfolio, ...newEntries];
    const ok = await syncProfile({ portfolio: next }, newEntries.length > 1 ? `${newEntries.length} portfolio photos added` : 'Portfolio work added');
    if (ok) setShowAddPortfolio(false);
    return ok;
  };

  const name = user?.name || 'Your profile';
  const photoUrl = avatarUrl(user?.avatar_url);
  const phone = user?.phone;
  const experience = profile.experience_years || 0;
  const rating = parseFloat(profile.avg_rating) || 0;
  const totalReviews = profile.total_reviews || 0;
  const jobsCompleted = profile.total_jobs_completed || 0;
  const skills = Array.isArray(profile.skills) ? profile.skills : [];
  const certifications = Array.isArray(profile.certifications) ? profile.certifications : [];
  const portfolio = Array.isArray(profile.portfolio) ? profile.portfolio : [];
  const categories = Array.isArray(profile.categories) ? profile.categories : [];

  const uniqueCategories = useMemo(() => {
    const map = new Map();
    categories.forEach((cat) => {
      const id = cat?.id ?? cat;
      const label = cat?.name ?? cat;
      if (id === undefined || id === null) return;
      const key = String(id);
      if (!map.has(key)) map.set(key, label ?? 'Uncategorized');
    });
    return [...map.values()];
  }, [categories]);

  const fullServiceAddress = [profile.service_area, profile.city].filter(Boolean).join(', ') || profile.location?.text;

  const strengthChecks = [
    !!phone,
    !!fullServiceAddress,
    !!profile.bio,
    !!profile.professional_title,
    services.length > 0,
    !!photoUrl,
    certifications.length > 0,
  ];
  const strengthPercent = Math.round((strengthChecks.filter(Boolean).length / strengthChecks.length) * 100);

  const isAccountVerified = !!user?.is_verified;
  const isProfileVerified = profile.verification_status === 'verified';
  const isApproved = !!profile.is_approved;

  const getReviewDate = (r) => new Date(r.createdAt || 0).getTime();
  const sortedReviews = useMemo(() => {
    const list = [...reviews];
    switch (sortBy) {
      case 'oldest':
        return list.sort((a, b) => getReviewDate(a) - getReviewDate(b));
      case 'highest':
        return list.sort((a, b) => (b.rating || 0) - (a.rating || 0));
      case 'lowest':
        return list.sort((a, b) => (a.rating || 0) - (b.rating || 0));
      case 'newest':
      default:
        return list.sort((a, b) => getReviewDate(b) - getReviewDate(a));
    }
  }, [reviews, sortBy]);

  return (
    <div className="flex flex-col gap-5">

      <motion.div {...fadeUp} transition={{ duration: 0.35, ease: 'easeOut' }}>
        <div className="relative h-[100px] overflow-hidden rounded-t-2xl border border-b-0 border-ink-100 bg-gradient-to-r from-brand-500/15 via-brand-400/5 to-transparent sm:h-[130px]" />

        <div className="relative z-10 mx-3 -mt-6 rounded-xl border border-ink-100 bg-white px-5 py-4 shadow-card">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-400">Profile Strength</span>
              <p className="mt-0.5 text-sm text-ink-900">Complete your profile to unlock more opportunities</p>
            </div>
            <span className="flex-shrink-0 text-lg font-bold text-brand-600">
              {strengthPercent}% <span className="text-xs font-medium text-ink-400">Complete</span>
            </span>
          </div>
          <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-ink-100">
            <div className="h-full rounded-full bg-brand-600 transition-all duration-500" style={{ width: `${strengthPercent}%` }} />
          </div>
        </div>

        <div className="rounded-b-2xl border border-t-0 border-ink-100 bg-white px-5 pb-5 pt-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="flex items-center gap-3.5">
              <div className="group/avatar relative flex-shrink-0 rounded-full">
                <Avatar src={photoUrl} name={name} size="w-16 h-16" textSize="text-2xl" />
                <button
                  type="button"
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={uploadingAvatar}
                  aria-label="Upload profile photo"
                  className="absolute inset-0 flex items-center justify-center rounded-full bg-black/0 opacity-0 transition-all duration-200 group-hover/avatar:bg-black/45 group-hover/avatar:opacity-100 disabled:cursor-wait"
                >
                  <Camera className="h-5 w-5 text-white" />
                </button>
                <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarSelect} />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="truncate text-xl font-bold leading-tight text-ink-900">{name}</h3>
                  {uniqueCategories.map((catName, i) => (
                    <span key={`${catName}-${i}`} className="rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-semibold text-brand-700">
                      {catName}
                    </span>
                  ))}
                </div>
                <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs text-ink-500">
                  <span>{experience} Year{experience === 1 ? '' : 's'} Experience</span>
                  <span className="flex items-center gap-1">
                    <Star className="h-3.5 w-3.5 fill-gold-500 text-gold-500" />
                    {rating.toFixed(1)} ({totalReviews} Review{totalReviews === 1 ? '' : 's'})
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={() => navigator.share?.({ title: name, url: window.location.href })}
                className="flex items-center gap-1.5 rounded-xl border border-ink-200 px-3.5 py-2 text-sm font-medium text-ink-900 transition-colors hover:bg-ink-50"
              >
                <Share2 className="h-3.5 w-3.5" />
                Share
              </button>
              <button
                type="button"
                onClick={onEdit}
                className="flex items-center gap-1.5 rounded-xl bg-brand-600 px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
              >
                <Pencil className="h-3.5 w-3.5" />
                Edit Profile
              </button>
            </div>
          </div>
        </div>
      </motion.div>

      <motion.div {...fadeUp} transition={{ duration: 0.35, delay: 0.05, ease: 'easeOut' }} className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatBox icon={Star} value={rating.toFixed(1)} label="Avg Rating" iconBg="bg-emerald-50" iconColor="text-emerald-600" />
        <StatBox icon={MessageSquare} value={totalReviews} label="Reviews" iconBg="bg-blue-50" iconColor="text-blue-600" />
        <StatBox icon={Calendar} value={`${experience} Years`} label="Experience" iconBg="bg-orange-50" iconColor="text-orange-600" />
        <StatBox icon={Briefcase} value={jobsCompleted} label="Jobs Completed" iconBg="bg-purple-50" iconColor="text-purple-600" />
      </motion.div>

      <motion.div {...fadeUp} transition={{ duration: 0.35, delay: 0.1, ease: 'easeOut' }} className="grid grid-cols-1 items-start gap-4 sm:grid-cols-[minmax(0,300px)_1fr]">
        <div className="flex flex-col gap-4">
          <div className="overflow-hidden rounded-2xl border border-ink-100 bg-white">
            <SectionHeader icon={Phone} title="Contact Information" />
            <div className="flex flex-col gap-3 p-4">
              <InfoLine icon={Phone} label="Business Phone">
                {phone || 'Not added yet'}
              </InfoLine>
              <InfoLine
                icon={MapPin}
                label="Service Address"
                action={
                  !fullServiceAddress && (
                    <button type="button" onClick={onEdit} className="mt-0.5 text-xs font-medium text-brand-600 hover:underline">
                      Add Address
                    </button>
                  )
                }
              >
                {fullServiceAddress || 'Not added yet'}
              </InfoLine>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-ink-100 bg-white">
            <SectionHeader icon={ShieldCheck} title="Verifications" />
            <div className="divide-y divide-ink-100 p-4">
              <VerificationRow label="Account Verified" verified={isAccountVerified} />
              <VerificationRow label="Profile Verified" verified={isProfileVerified} />
              <VerificationRow label="Approved Provider" verified={isApproved} />
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-ink-100 bg-white">
          <SectionHeader
            icon={FileText}
            title="About My Work"
            action={
              <button type="button" onClick={onEdit} className="flex items-center gap-1 text-xs font-medium text-brand-600 hover:underline">
                <Pencil className="h-3 w-3" />
                Update Bio
              </button>
            }
          />

          <div className="p-4">
            <p className="mb-3 text-sm leading-relaxed text-ink-900">
              {profile.bio || 'Add a bio so customers know what you offer.'}
            </p>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-xl bg-ink-50 p-3">
                <span className="text-[10px] font-semibold uppercase tracking-wide text-ink-400">Primary Skills</span>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {skills.length > 0 ? (
                    skills.map((s) => (
                      <span key={s} className="rounded-full border border-ink-100 bg-white px-2 py-0.5 text-xs font-medium text-ink-900">
                        {s}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs italic text-ink-400">Not added yet</span>
                  )}
                </div>
              </div>
              <div className="rounded-xl bg-ink-50 p-3">
                <span className="text-[10px] font-semibold uppercase tracking-wide text-ink-400">Service Area</span>
                <p className="mt-1.5 text-sm font-semibold text-ink-900">{profile.service_area || 'Not added yet'}</p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      <motion.div {...fadeUp} transition={{ duration: 0.35, delay: 0.24, ease: 'easeOut' }} className="overflow-hidden rounded-2xl border border-ink-100 bg-white">
        <SectionHeader icon={ShieldCheck} title="Account Settings" />
        <div className="flex flex-col gap-4 p-4">
          <NameUpdateCard />
          <ContactUpdateCard type="phone" />
          <ChangePasswordCard />
        </div>
      </motion.div>

      <motion.div {...fadeUp} transition={{ duration: 0.35, delay: 0.22, ease: 'easeOut' }} className="overflow-hidden rounded-2xl border border-ink-100 bg-white">
        <SectionHeader icon={Wallet} title="Availability & Pricing" />
        <div className="flex flex-col gap-3 p-4 sm:flex-row">
          <PricingTile
            icon={Wallet}
            label="Starting Fee"
            value={profile.starting_price ? `Starting from \u20b9${profile.starting_price}` : 'Not added yet'}
            badge={profile.starting_price ? priceTypeShortLabel(profile.starting_price_type) : null}
            onEdit={onEdit}
          />
          <PricingTile
            icon={Clock}
            label="Availability"
            value={formatAvailability(profile.availability)}
            badge={profile.is_available ? 'Available Today' : 'Not Available'}
            onEdit={onEdit}
          />
        </div>
      </motion.div>

      <motion.div {...fadeUp} transition={{ duration: 0.35, delay: 0.22, ease: 'easeOut' }} className="overflow-hidden rounded-2xl border border-ink-100 bg-white">
        <SectionHeader
          icon={GraduationCap}
          title="Certifications"
          action={
            <button type="button" onClick={() => setShowAddCertification(true)} className="flex items-center gap-1 text-xs font-medium text-brand-600 hover:underline">
              <Plus className="h-3.5 w-3.5" />
              Add Certification
            </button>
          }
        />

        {certifications.length === 0 ? (
          <p className="p-4 text-sm italic text-ink-400">No certifications added yet.</p>
        ) : (
          <div className="flex flex-col gap-3 p-4">
            {certifications.map((cert, i) => (
              <div key={i} className="flex items-start gap-3">
                <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-brand-50">
                  <GraduationCap className="h-4 w-4 text-brand-600" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-ink-900">{cert.title}</p>
                  {cert.issuer && <p className="text-xs text-ink-500">{cert.issuer}</p>}
                  {cert.year && <p className="mt-0.5 text-xs text-ink-500">{cert.year}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>

      <motion.div {...fadeUp} transition={{ duration: 0.35, delay: 0.22, ease: 'easeOut' }} className="overflow-hidden rounded-2xl border border-ink-100 bg-white">
        <SectionHeader
          icon={ImageIcon}
          title="Portfolio"
          action={
            <button type="button" onClick={() => setShowAddPortfolio(true)} className="flex items-center gap-1 text-xs font-medium text-brand-600 hover:underline">
              <Plus className="h-3.5 w-3.5" />
              Add Work
            </button>
          }
        />

        {portfolio.length === 0 ? (
          <p className="p-4 text-sm italic text-ink-400">No portfolio work added yet.</p>
        ) : (
          <div className="grid grid-cols-3 gap-2 p-4 sm:grid-cols-6">
            {portfolio.map((item, i) => (
              <div key={i} title={item.title} className="group relative aspect-square overflow-hidden rounded-lg bg-ink-50">
                {item.image_url ? (
                  <img
                    src={avatarUrl(item.image_url)}
                    alt={item.title || 'Portfolio work'}
                    className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <ImageIcon className="h-4 w-4 text-ink-400" />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </motion.div>

      <motion.div {...fadeUp} transition={{ duration: 0.35, delay: 0.22, ease: 'easeOut' }} className="overflow-hidden rounded-2xl border border-ink-100 bg-white">
        <SectionHeader
          icon={Star}
          title="Ratings & Reviews"
          action={
            totalReviews > 0 && (
              <div className="relative">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="cursor-pointer appearance-none rounded-lg border border-ink-200 bg-white py-1.5 pl-2.5 pr-6 text-xs font-medium text-ink-900"
                >
                  <option value="newest">Most Recent</option>
                  <option value="oldest">Oldest</option>
                  <option value="highest">Highest Rated</option>
                  <option value="lowest">Lowest Rated</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-400" />
              </div>
            )
          }
        />

        <div className="p-4">
          {reviews.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-ink-200 py-8 text-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-ink-50">
                <Star className="h-5 w-5 text-ink-400" />
              </div>
              <p className="text-sm text-ink-500">No reviews yet</p>
              <p className="max-w-[220px] text-xs text-ink-400">Once customers rate your work, it will show up here.</p>
            </div>
          ) : (
            <>
              <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                <div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-extrabold leading-none text-ink-900">{rating.toFixed(1)}</span>
                    <StarRating value={rating} readOnly size="w-4 h-4" />
                  </div>
                  <span className="text-xs text-ink-400">
                    {totalReviews} Review{totalReviews === 1 ? '' : 's'}
                  </span>
                </div>
                <div className="relative">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="flex cursor-pointer appearance-none items-center gap-1.5 rounded-lg border border-ink-200 bg-white py-1.5 pl-8 pr-3 text-xs font-medium text-ink-900"
                  >
                    <option value="newest">Sort by: Newest</option>
                    <option value="oldest">Sort by: Oldest</option>
                    <option value="highest">Sort by: Highest</option>
                    <option value="lowest">Sort by: Lowest</option>
                  </select>
                  <ArrowUpDown className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-400" />
                </div>
              </div>

              <div className="flex flex-col gap-3">
                {sortedReviews.map((rev) => (
                  <ReviewCard key={rev.id} review={rev} />
                ))}
              </div>
            </>
          )}
        </div>
      </motion.div>

      <AddCertificationModal
        isOpen={showAddCertification}
        onClose={() => setShowAddCertification(false)}
        onSave={handleSaveCertification}
        saving={syncing}
      />
      <AddPortfolioModal
        isOpen={showAddPortfolio}
        onClose={() => setShowAddPortfolio(false)}
        onSave={handleSavePortfolio}
        saving={syncing}
      />
    </div>
  );
}
