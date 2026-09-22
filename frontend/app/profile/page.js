'use client';

import { AnimatePresence, motion } from 'framer-motion';
import {
    ArrowRight,
    BadgeCheck,
    Calendar,
    Camera,
    CircleAlert,
    Images,
    ListChecks,
    MapPin,
    Pencil,
    Play,
    Plus,
    Share2,
    ShieldCheck,
    Sparkles,
    Star,
    Trash2,
    UserRound,
    Wallet,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import BookingCard from '../../components/BookingCard';
import ChangePasswordCard from '../../components/ChangePasswordCard';
import ContactUpdateCard from '../../components/ContactUpdateCard';
import CoverPhotoEditor from '../../components/CoverPhotoEditor';
import AdminProfileView from '../../components/admin/AdminProfileView';
import ProtectedRoute from '../../components/ProtectedRoute';
import ProviderProfileRoute from '../../components/provider/ProviderProfileRoute';
import StatusBadge from '../../components/StatusBadge';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import { Field, TextArea, TextInput } from '../../components/ui/Field';
import { RowSkeleton, Skeleton } from '../../components/ui/Skeleton';
import Spinner from '../../components/ui/Spinner';
import { useToast } from '../../components/ui/Toast';
import { useAuth } from '../../context/AuthContext';
import api from '../../lib/api';
import useRefetchOnFocus from '../../lib/useRefetchOnFocus';
import useSwitchToProvider from '../../lib/useSwitchToProvider';
const RequirementComposerModal = dynamic(() => import('../../components/RequirementComposerModal'));

const avatarUrl = (url) => (!url ? null : url);

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] },
};

function formatJoinedDate(dateInput) {
  if (!dateInput) return null;
  const d = new Date(dateInput);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
}

function SectionLabel({ icon: Icon, children }) {
  return (
    <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-ink-400">
      {Icon && <Icon size={13} aria-hidden="true" />} {children}
    </p>
  );
}

function ApplicationStatusCard() {
  const [app, setApp] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadApplication = () => {
    api
      .get('/providers/application/me')
      .then(({ data }) => setApp(data))
      .catch(() => setApp(null))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadApplication();
  }, []);

  useRefetchOnFocus(loadApplication);

  if (loading) return <Skeleton className="h-40 rounded-3xl" />;
  if (!app?.profile) return null;

  const status = app.profile.application_status;

  return (
    <Card className="overflow-hidden p-0 rounded-3xl border border-ink-200/80 shadow-soft" hover={false}>
      <div className="flex items-center justify-between border-b border-ink-100 bg-ink-50/70 px-6 py-4">
        <div className="flex items-center gap-2">
          <ShieldCheck size={18} className="text-brand-600" />
          <h2 className="text-sm font-bold text-ink-900">Provider Application</h2>
        </div>
        <StatusBadge status={status} kind="application" />
      </div>

      <div className="p-6">
        {['draft', 'incomplete'].includes(status) && (
          <div className="space-y-4">
            <div>
              <div className="mb-2 flex items-center justify-between text-xs font-semibold text-ink-600">
                <span>Application Progress</span>
                <span className="text-brand-600 font-bold">{app.completion_percentage}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-ink-100">
                <div
                  className="h-full rounded-full bg-brand-600 transition-all duration-500"
                  style={{ width: `${app.completion_percentage}%` }}
                />
              </div>
            </div>
            <Link href="/become-provider" className="inline-block">
              <Button size="sm" icon={<ArrowRight size={14} aria-hidden="true" />}>
                Continue application
              </Button>
            </Link>
          </div>
        )}

        {['submitted', 'under_review'].includes(status) && (
          <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-brand-50 border border-brand-100 text-xs text-brand-900">
            <span className="w-2.5 h-2.5 rounded-full bg-brand-500 animate-ping shrink-0" />
            <span>Your application is currently under review by our compliance team. We&apos;ll notify you via email and notification bell as soon as it is approved.</span>
          </div>
        )}

        {['rejected', 'changes_required'].includes(status) && (
          <div className="space-y-3">
            {app.profile?.application_feedback && (
              <p className="rounded-2xl bg-amber-50 border border-amber-200/60 p-3 text-xs text-amber-800 leading-relaxed font-medium">
                {app.profile.application_feedback}
              </p>
            )}
            <Link href="/become-provider" className="inline-block">
              <Button size="sm">Update &amp; resubmit</Button>
            </Link>
          </div>
        )}
      </div>
    </Card>
  );
}

function SwitchBackToProviderCard() {
  const { switching, switchToProvider } = useSwitchToProvider();

  return (
    <Card className="relative overflow-hidden border-brand-100 bg-gradient-to-br from-brand-50 via-white to-accent-50 p-5" hover={false}>
      <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-100 px-2.5 py-0.5 text-xs font-semibold text-brand-700">
        <BadgeCheck size={12} aria-hidden="true" /> Provider account
      </span>
      <h2 className="mt-2 font-semibold text-ink-900">Ready to offer services again?</h2>
      <p className="mb-4 mt-1 text-sm text-ink-600">
        Your approved provider profile, reviews and history are still here. Switch back to start receiving
        requirements and placing bids again &mdash; no new application needed.
      </p>
      <Button loading={switching} onClick={switchToProvider} icon={<ArrowRight size={16} aria-hidden="true" />}>
        Switch to provider account
      </Button>
    </Card>
  );
}

function AvatarEditor({ large = false }) {
  const { user, updateLocalUser } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  const pickFile = () => fileInputRef.current?.click();

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('avatar', file);
      const { data } = await api.post('/auth/me/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      updateLocalUser({ avatar_url: data.user.avatar_url });
      toast('Profile picture updated', { type: 'success' });
    } catch (err) {
      toast(err.response?.data?.message || 'Could not upload image', { type: 'error' });
    } finally {
      setUploading(false);
    }
  };

  const removeAvatar = async () => {
    setUploading(true);
    try {
      const { data } = await api.delete('/auth/me/avatar');
      updateLocalUser({ avatar_url: data.user.avatar_url });
      toast('Profile picture removed', { type: 'info' });
    } catch (err) {
      toast(err.response?.data?.message || 'Could not remove image', { type: 'error' });
    } finally {
      setUploading(false);
    }
  };

  const resolvedUrl = avatarUrl(user.avatar_url);
  const dim = large ? 'h-24 w-24 sm:h-28 sm:w-28' : 'h-20 w-20 sm:h-24 sm:w-24';

  return (
    <div className={`relative shrink-0 ${dim}`} data-no-nav-loading="true">
      <div className={`flex ${dim} items-center justify-center overflow-hidden rounded-full bg-ink-100 ring-4 ring-white shadow-card-hover`}>
        {resolvedUrl ? (
          <img src={resolvedUrl} alt={user.name} className="h-full w-full object-cover" />
        ) : (
          <UserRound size={large ? 44 : 36} className="text-ink-300" aria-hidden="true" />
        )}
        {uploading && (
          <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 backdrop-blur-xs">
            <Spinner size={20} className="text-white" />
          </div>
        )}
      </div>
      <button
        type="button"
        onClick={pickFile}
        disabled={uploading}
        aria-label="Change profile picture"
        className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full bg-brand-600 text-white shadow-soft ring-2 ring-white hover:bg-brand-700 transition-transform active:scale-95"
      >
        <Camera size={14} aria-hidden="true" />
      </button>
      {resolvedUrl && (
        <button
          type="button"
          onClick={removeAvatar}
          disabled={uploading}
          aria-label="Remove profile picture"
          className="absolute bottom-0 left-0 flex h-8 w-8 items-center justify-center rounded-full bg-white text-danger-600 shadow-soft ring-2 ring-white hover:bg-danger-50 transition-transform active:scale-95"
        >
          <Trash2 size={13} aria-hidden="true" />
        </button>
      )}
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
    </div>
  );
}

function EditProfileForm({ onClose }) {
  const { user, updateLocalUser } = useAuth();
  const { toast } = useToast();
  const [form, setForm] = useState({
    name: user.name || '',
    bio: user.bio || '',
    location: user.location || '',
    requirement_radius_km: user.requirement_radius_km ?? 5,
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.name.trim()) {
      setError('Name cannot be empty');
      return;
    }
    const radius = Number(form.requirement_radius_km);
    if (Number.isNaN(radius) || radius < 1 || radius > 200) {
      setError('Requirement radius must be between 1 and 200 km');
      return;
    }
    setSaving(true);
    try {
      const { data } = await api.put('/auth/me', { ...form, requirement_radius_km: radius });
      updateLocalUser({
        name: data.user.name,
        bio: data.user.bio,
        location: data.user.location,
        requirement_radius_km: data.user.requirement_radius_km,
      });
      toast('Profile updated', { type: 'success' });
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not update profile, please try again');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 border-t border-ink-100 pt-4">
      <Field label="Full name" required>
        <TextInput value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
      </Field>
      <Field label="Short bio" hint="Brief summary for your profile">
        <TextArea rows={3} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} placeholder="A little about yourself..." />
      </Field>
      <Field label="City / Region">
        <TextInput value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="e.g. South Delhi, New Delhi" />
      </Field>
      {user.role === 'customer' && (
        <Field label="Requirement search radius (km)" hint="Only requirements posted within this radius of your current location appear in your feed">
          <TextInput
            type="number"
            min={1}
            max={200}
            value={form.requirement_radius_km}
            onChange={(e) => setForm({ ...form, requirement_radius_km: e.target.value })}
          />
        </Field>
      )}
      {error && (
        <p className="flex items-center gap-1.5 text-xs text-danger-600 bg-danger-50 p-2.5 rounded-xl border border-danger-200">
          <CircleAlert size={14} className="shrink-0" aria-hidden="true" /> {error}
        </p>
      )}
      <div className="flex gap-2.5 pt-1">
        <Button type="submit" loading={saving}>Save changes</Button>
        <Button type="button" variant="ghost" disabled={saving} onClick={onClose}>Cancel</Button>
      </div>
    </form>
  );
}

function StatItem({ value, label, icon: Icon }) {
  return (
    <div className="flex min-w-[76px] flex-1 flex-col items-center gap-0.5 px-2 py-2.5 text-center sm:flex-none sm:items-start sm:px-4 sm:text-left">
      <span className="flex items-center gap-1 font-display text-lg font-bold leading-none text-ink-900 sm:text-xl">
        {value === null ? <Skeleton className="h-5 w-8 rounded" /> : value}
      </span>
      <span className="flex items-center gap-1 text-[11px] font-medium text-ink-500 sm:text-xs">
        {Icon && <Icon size={11} className="text-ink-400" aria-hidden="true" />}
        {label}
      </span>
    </div>
  );
}

function ProfileHeader({ stats }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [extra, setExtra] = useState({ isVerified: false, joined: null, ratingAvg: null, ratingCount: null });

  useEffect(() => {
    api
      .get('/auth/me')
      .then(({ data }) => {
        setExtra({
          isVerified: !!data.user?.is_verified,
          joined: formatJoinedDate(data.user?.createdAt),
          ratingAvg: data.user?.customer_rating_avg || 0,
          ratingCount: data.user?.customer_rating_count || 0,
        });
      })
      .catch(() => {});
  }, []);

  const handleShare = async () => {
    const shareData = { title: user.name, text: `${user.name} on Karyantrix` };
    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch {
      }
    } else if (navigator.clipboard) {
      await navigator.clipboard.writeText(window.location.href);
      toast('Profile link copied', { type: 'info' });
    }
  };

  return (
    <Card className="overflow-hidden p-0 rounded-3xl border border-ink-200/80 shadow-soft" hover={false}>
      <CoverPhotoEditor className="h-28 sm:h-36" />

      <div className="px-5 pb-5 sm:px-8 sm:pb-6">
        <div className="-mt-12 flex flex-col items-center gap-3 text-center sm:-mt-14 sm:flex-row sm:items-end sm:gap-5 sm:text-left">
          <AvatarEditor large />

          <div className="flex w-full flex-1 flex-col items-center gap-2 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
            <div className="min-w-0">
              <div className="flex items-center justify-center gap-1.5 sm:justify-start">
                <h1 className="truncate font-display text-xl font-bold tracking-tight text-ink-900 sm:text-2xl">{user.name}</h1>
                {extra.isVerified && (
                  <BadgeCheck size={18} className="shrink-0 fill-brand-600 text-white" aria-label="Verified account" />
                )}
              </div>
              <span className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-brand-50 border border-brand-100/70 px-2.5 py-0.5 text-xs font-semibold capitalize text-brand-700">
                <ShieldCheck size={12} className="text-brand-600" aria-hidden="true" /> {user.role} account
              </span>
            </div>

            <div className="flex flex-shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={handleShare}
                className="flex items-center gap-1.5 rounded-xl border border-ink-200 px-3.5 py-2 text-sm font-medium text-ink-900 transition-colors hover:bg-ink-50"
              >
                <Share2 size={14} aria-hidden="true" />
                <span className="hidden sm:inline">Share</span>
              </button>
              {!editing && (
                <Button size="sm" icon={<Pencil size={14} aria-hidden="true" />} onClick={() => setEditing(true)}>
                  Edit profile
                </Button>
              )}
            </div>
          </div>
        </div>

        {(user.bio || user.location) && !editing && (
          <div className="mt-4 space-y-1.5 text-center sm:text-left">
            {user.bio && <p className="text-sm leading-relaxed text-ink-700">{user.bio}</p>}
            {user.location && (
              <p className="flex items-center justify-center gap-1.5 text-xs text-ink-500 sm:justify-start">
                <MapPin size={13} className="shrink-0 text-ink-400" aria-hidden="true" /> {user.location}
              </p>
            )}
          </div>
        )}

        <div className="mt-5 flex flex-wrap items-center justify-center gap-y-2 divide-x divide-ink-100 rounded-2xl border border-ink-100 bg-ink-50/50 sm:flex-nowrap sm:justify-start sm:gap-2 sm:divide-x-0 sm:border-0 sm:bg-transparent">
          <StatItem value={stats.requirements} label="Requirements" icon={Sparkles} />
          <StatItem value={stats.bookings} label="Post History" icon={Wallet} />
          <StatItem
            value={extra.ratingCount === null ? null : extra.ratingCount > 0 ? extra.ratingAvg.toFixed(1) : 'New'}
            label={extra.ratingCount ? `Avg Rating (${extra.ratingCount})` : 'Avg Rating'}
            icon={Star}
          />
          <StatItem value={extra.joined} label="Member since" icon={Calendar} />
        </div>

        {user.role === 'customer' && (
          <p className="mt-3 text-center text-xs text-ink-500 sm:text-left">
            Discovery radius: showing custom requirements within{' '}
            <span className="font-bold text-ink-800">{user.requirement_radius_km ?? 5} km</span> of your location.
          </p>
        )}

        <AnimatePresence initial={false}>
          {editing && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="overflow-hidden"
            >
              <div className="mt-5">
                <EditProfileForm onClose={() => setEditing(false)} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Card>
  );
}

function GridPostThumb({ requirement, onClick }) {
  const cover = requirement.media?.[0];

  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative aspect-square overflow-hidden rounded-xl bg-ink-100 ring-1 ring-ink-200/60 transition-transform active:scale-[0.97]"
    >
      {cover ? (
        cover.type === 'video' ? (
          <video src={avatarUrl(cover.url)} className="h-full w-full object-cover" muted playsInline />
        ) : (
          <img
            src={avatarUrl(cover.url)}
            alt=""
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        )
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-brand-600 via-brand-700 to-ink-900 p-3">
          <p className="line-clamp-4 text-center text-[11px] font-semibold leading-snug text-white">
            {requirement.description}
          </p>
        </div>
      )}

      <div className="absolute right-1.5 top-1.5 scale-[0.85] origin-top-right">
        <StatusBadge status={requirement.status} kind="requirement" />
      </div>

      {requirement.media?.length > 1 && (
        <span className="absolute left-1.5 top-1.5 text-white drop-shadow" aria-hidden="true">
          <Images size={15} strokeWidth={2.25} />
        </span>
      )}
      {cover?.type === 'video' && (
        <span className="absolute left-1.5 top-1.5 text-white drop-shadow" aria-hidden="true">
          <Play size={15} fill="white" strokeWidth={0} />
        </span>
      )}

      {typeof requirement.budget === 'number' && (
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-2 pb-1.5 pt-4 text-left opacity-0 transition-opacity duration-200 group-hover:opacity-100">
          <span className="text-xs font-bold text-white">₹{requirement.budget.toLocaleString('en-IN')}</span>
        </div>
      )}
    </button>
  );
}

function RequirementsTab() {
  const router = useRouter();
  const [requirements, setRequirements] = useState(null);
  const [composerOpen, setComposerOpen] = useState(false);

  const load = () => {
    api
      .get('/requirements/mine')
      .then(({ data }) => setRequirements(data.requirements || []))
      .catch(() => setRequirements([]));
  };

  useEffect(() => {
    load();
  }, []);

  useRefetchOnFocus(load);

  if (requirements === null) {
    return (
      <div className="grid grid-cols-3 gap-1 sm:gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="aspect-square rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-ink-400">
          {requirements.length} {requirements.length === 1 ? 'post' : 'posts'}
        </p>
        <Button size="sm" onClick={() => setComposerOpen(true)} icon={<Plus size={14} aria-hidden="true" />}>
          New post
        </Button>
      </div>

      {requirements.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-ink-200 bg-ink-50/40 py-16 px-6 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-ink-100 bg-white text-ink-400 shadow-soft">
            <Sparkles size={24} className="text-ink-300" aria-hidden="true" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-ink-800">No requirements posted yet</h3>
            <p className="mt-1 max-w-sm text-xs text-ink-500">
              Post a custom requirement and nearby verified providers will bid on it.
            </p>
          </div>
          <Button size="sm" onClick={() => setComposerOpen(true)} icon={<Plus size={14} aria-hidden="true" />}>
            Post your first requirement
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-1 sm:gap-2">
          {requirements.map((r) => (
            <GridPostThumb key={r.id} requirement={r} onClick={() => router.push(`/requirements/${r.id}`)} />
          ))}
        </div>
      )}

      <RequirementComposerModal open={composerOpen} onClose={() => setComposerOpen(false)} onCreated={load} />
    </div>
  );
}

function BookingsTab() {
  const [bookings, setBookings] = useState(null);

  const load = () => {
    api
      .get('/bookings/mine')
      .then(({ data }) => setBookings(data.bookings || []))
      .catch(() => setBookings([]));
  };

  useEffect(() => {
    load();
  }, []);

  useRefetchOnFocus(load);

  if (bookings === null) {
    return (
      <div className="space-y-4">
        <RowSkeleton />
        <RowSkeleton />
        <RowSkeleton />
      </div>
    );
  }

  if (bookings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-ink-200 bg-ink-50/40 py-16 px-6 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-ink-100 bg-white text-ink-400 shadow-soft">
          <Wallet size={24} className="text-ink-300" aria-hidden="true" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-ink-800">No Post History yet</h3>
          <p className="mt-1 max-w-sm text-xs text-ink-500">Once you post a requirement, it will show up here.</p>
        </div>
      </div>
    );
  }

  const preview = bookings.slice(0, 5);

  return (
    <div className="space-y-4">
      {preview.map((booking) => (
        <BookingCard key={booking.id} booking={booking} onUpdated={load} />
      ))}
      {bookings.length > preview.length && (
        <Link href="/bookings" className="inline-block">
          <Button variant="secondary" size="sm" icon={<ArrowRight size={14} aria-hidden="true" />}>
            View all {bookings.length} bookings
          </Button>
        </Link>
      )}
    </div>
  );
}

function ReviewsTab() {
  const [reviews, setReviews] = useState(null);

  const load = () => {
    api
      .get('/reviews/customer/me')
      .then(({ data }) => setReviews(data.reviews || []))
      .catch(() => setReviews([]));
  };

  useEffect(() => {
    load();
  }, []);

  useRefetchOnFocus(load);

  if (reviews === null) {
    return (
      <div className="space-y-4">
        <RowSkeleton />
        <RowSkeleton />
        <RowSkeleton />
      </div>
    );
  }

  if (reviews.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-ink-200 bg-ink-50/40 py-16 px-6 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-ink-100 bg-white text-ink-400 shadow-soft">
          <Star size={24} className="text-ink-300" aria-hidden="true" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-ink-800">No reviews yet</h3>
          <p className="mt-1 max-w-sm text-xs text-ink-500">
            Once a provider you&apos;ve hired completes a job and reviews you, it&apos;ll show up here.
          </p>
        </div>
      </div>
    );
  }

  const avg = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;

  return (
    <div className="space-y-4">
      <Card className="space-y-4 p-5" hover={false}>
        <div className="flex items-center gap-2">
          <Star size={16} className="fill-gold-500 text-gold-500" aria-hidden="true" />
          <span className="font-display text-lg font-bold text-ink-900">{avg.toFixed(1)}</span>
          <span className="text-xs text-ink-500">
            from {reviews.length} provider{reviews.length === 1 ? '' : 's'} you&apos;ve worked with
          </span>
        </div>
        <div className="space-y-3 border-t border-ink-100 pt-4">
          {reviews.map((r) => (
            <div key={r.id} className="rounded-2xl border border-ink-100 bg-ink-50/50 p-3.5">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold text-ink-800">{r.provider?.name || 'A provider'}</p>
                <div className="flex items-center gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      size={12}
                      className={i < r.rating ? 'fill-gold-500 text-gold-500' : 'text-ink-200'}
                      aria-hidden="true"
                    />
                  ))}
                </div>
              </div>
              {r.title && <p className="mt-1.5 text-xs font-semibold text-ink-700">{r.title}</p>}
              {r.comment && <p className="mt-1 text-xs text-ink-500">{r.comment}</p>}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function AccountTab() {
  const { user } = useAuth();

  return (
    <div className="space-y-8">
      <div>
        <SectionLabel>Contact details</SectionLabel>
        <div className="space-y-4">
          <ContactUpdateCard type="email" />
          <ContactUpdateCard type="phone" />
        </div>
      </div>

      <div>
        <SectionLabel>Security</SectionLabel>
        <ChangePasswordCard />
      </div>

      {user.role === 'customer' && user.can_switch_to_provider && <SwitchBackToProviderCard />}

      {user.role === 'customer' && !user.can_switch_to_provider && (
        <div>
          <SectionLabel>Provider application</SectionLabel>
          <ApplicationStatusCard />
        </div>
      )}

      {user.role === 'customer' && !user.can_switch_to_provider && (
        <Card className="relative overflow-hidden border-brand-100 bg-gradient-to-br from-brand-50 via-white to-accent-50 p-5" hover={false}>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-100 px-2.5 py-0.5 text-xs font-semibold text-brand-700">
            <Sparkles size={12} aria-hidden="true" /> Grow your income
          </span>
          <h2 className="mt-2 font-semibold text-ink-900">Want to offer services on Karyantrix?</h2>
          <p className="mb-4 mt-1 text-sm text-ink-600">
            Complete a short professional application &mdash; skills, services, portfolio and availability &mdash; and
            your provider account goes live as soon as you submit it.
          </p>
          <Link href="/become-provider">
            <Button icon={<ArrowRight size={16} aria-hidden="true" />}>Start provider application</Button>
          </Link>
        </Card>
      )}
    </div>
  );
}

const TABS = [
  { key: 'requirements', label: 'Requirements', icon: Sparkles },
  { key: 'bookings', label: 'Post History', icon: Wallet },
  { key: 'reviews', label: 'Reviews', icon: Star },
  { key: 'account', label: 'Account', icon: ListChecks },
];

function ProfileContent() {
  const [tab, setTab] = useState('requirements');
  const [counts, setCounts] = useState({ requirements: null, bookings: null });

  useEffect(() => {
    api
      .get('/requirements/mine')
      .then(({ data }) => setCounts((c) => ({ ...c, requirements: (data.requirements || []).length })))
      .catch(() => setCounts((c) => ({ ...c, requirements: 0 })));
    api
      .get('/bookings/mine')
      .then(({ data }) => setCounts((c) => ({ ...c, bookings: (data.bookings || []).length })))
      .catch(() => setCounts((c) => ({ ...c, bookings: 0 })));
  }, []);

  const TabContent = useMemo(() => {
    if (tab === 'requirements') return <RequirementsTab />;
    if (tab === 'bookings') return <BookingsTab />;
    if (tab === 'reviews') return <ReviewsTab />;
    return <AccountTab />;
  }, [tab]);

  return (
    <div className="mx-auto max-w-2xl">
      <motion.div {...fadeUp}>
        <ProfileHeader stats={counts} />
      </motion.div>

      <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.05 }} className="sticky top-[65px] z-20 mt-6 -mx-1 border-b border-ink-100 bg-ink-50/70 px-1 backdrop-blur-md sm:rounded-t-2xl">
        <div className="flex items-center justify-around sm:justify-start sm:gap-2">
          {TABS.map(({ key, label, icon: Icon }) => {
            const active = tab === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setTab(key)}
                className={`relative flex flex-1 items-center justify-center gap-1.5 py-3 text-xs font-semibold transition-colors sm:flex-none sm:px-4 ${
                  active ? 'text-brand-700' : 'text-ink-500 hover:text-ink-800'
                }`}
              >
                <Icon size={15} aria-hidden="true" />
                <span>{label}</span>
                {active && (
                  <motion.span
                    layoutId="profile-tab-underline"
                    className="absolute inset-x-3 -bottom-px h-[2.5px] rounded-full bg-brand-600"
                    transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </motion.div>

      <motion.div key={tab} {...fadeUp} className="mt-6">
        {TabContent}
      </motion.div>
    </div>
  );
}

function ProfileRouter() {
  const { user } = useAuth();

  if (user.role === 'provider') {
    return (
      <div className="mx-auto w-full max-w-6xl">
        <ProviderProfileRoute />
      </div>
    );
  }

  if (user.role === 'admin' || user.role === 'staff') {
    return <AdminProfileView />;
  }

  return <ProfileContent />;
}

export default function ProfilePage() {
  return (
    <ProtectedRoute>
      <ProfileRouter />
    </ProtectedRoute>
  );
}