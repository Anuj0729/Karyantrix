'use client';

import { motion } from 'framer-motion';
import { Camera, CircleAlert, Mail, MapPin, Pencil, Phone, ShieldCheck, Trash2, UserRound } from 'lucide-react';
import { useRef, useState } from 'react';
import ChangePasswordCard from '../ChangePasswordCard';
import ContactUpdateCard from '../ContactUpdateCard';
import CoverPhotoEditor from '../CoverPhotoEditor';
import { useAuth } from '../../context/AuthContext';
import api from '../../lib/api';
import Button from '../ui/Button';
import Card from '../ui/Card';
import { Field, TextInput } from '../ui/Field';
import Modal from '../ui/Modal';
import Spinner from '../ui/Spinner';
import { useToast } from '../ui/Toast';

const avatarUrl = (url) => (!url ? null : url);

const fadeUp = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] },
};

function formatMemberSince(dateInput) {
  if (!dateInput) return '—';
  const d = new Date(dateInput);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function AdminAvatarEditor() {
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

  return (
    <div className="relative h-20 w-20 shrink-0 sm:h-24 sm:w-24" data-no-nav-loading="true">
      <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-ink-100 ring-4 ring-white shadow-card-hover sm:h-24 sm:w-24">
        {resolvedUrl ? (
          <img src={resolvedUrl} alt={user.name} className="h-full w-full object-cover" />
        ) : (
          <UserRound size={40} className="text-ink-300" aria-hidden="true" />
        )}
        {uploading && (
          <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 backdrop-blur-xs">
            <Spinner size={18} className="text-white" />
          </div>
        )}
      </div>
      <button
        type="button"
        onClick={pickFile}
        disabled={uploading}
        aria-label="Change profile picture"
        className="absolute bottom-0 right-0 flex h-7 w-7 items-center justify-center rounded-full bg-ink-900 text-white shadow-soft ring-2 ring-white transition-transform hover:bg-ink-800 active:scale-95"
      >
        <Camera size={13} aria-hidden="true" />
      </button>
      {resolvedUrl && (
        <button
          type="button"
          onClick={removeAvatar}
          disabled={uploading}
          aria-label="Remove profile picture"
          className="absolute bottom-0 left-0 flex h-7 w-7 items-center justify-center rounded-full bg-white text-danger-600 shadow-soft ring-2 ring-white transition-transform hover:bg-danger-50 active:scale-95"
        >
          <Trash2 size={12} aria-hidden="true" />
        </button>
      )}
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
    </div>
  );
}

function InfoField({ label, value }) {
  return (
    <div>
      <p className="text-xs text-ink-400">{label}</p>
      <p className="mt-1 truncate text-sm font-semibold text-ink-900">{value || '—'}</p>
    </div>
  );
}

function EditPersonalInfoModal({ open, onClose }) {
  const { user, updateLocalUser } = useAuth();
  const { toast } = useToast();
  const [form, setForm] = useState({ name: user.name || '', location: user.location || '' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.name.trim()) {
      setError('Name cannot be empty');
      return;
    }
    setSaving(true);
    try {
      const { data } = await api.put('/auth/me', form);
      updateLocalUser({ name: data.user.name, location: data.user.location });
      toast('Personal information updated', { type: 'success' });
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not update profile, please try again');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={open} onClose={onClose} size="md">
      <div className="p-6">
        <h2 className="font-display text-lg font-bold text-ink-900">Edit personal information</h2>
        <p className="mt-1 text-xs text-ink-500">Update your name and address. Role and member-since date are managed by the system.</p>

        <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-4">
          <Field label="Name" required>
            <TextInput value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </Field>
          <Field label="Address" hint="City / region shown on your admin profile">
            <TextInput
              leftIcon={<MapPin size={15} aria-hidden="true" />}
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              placeholder="e.g. Leeds, United Kingdom"
            />
          </Field>

          {error && (
            <p className="flex items-center gap-1.5 rounded-xl border border-danger-200 bg-danger-50 p-2.5 text-xs text-danger-600">
              <CircleAlert size={14} className="shrink-0" aria-hidden="true" /> {error}
            </p>
          )}

          <div className="mt-1 border-t border-ink-100 pt-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-ink-400">Contact details</p>
            <div className="space-y-3">
              <ContactUpdateCard type="email" />
              <ContactUpdateCard type="phone" />
            </div>
          </div>

          <div className="flex gap-2.5 pt-1">
            <Button type="submit" loading={saving}>Save changes</Button>
            <Button type="button" variant="ghost" disabled={saving} onClick={onClose}>Cancel</Button>
          </div>
        </form>
      </div>
    </Modal>
  );
}

export default function AdminProfileView() {
  const { user } = useAuth();
  const [editOpen, setEditOpen] = useState(false);

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-5 font-display text-lg font-bold text-ink-900">My Profile</h1>

      <motion.div {...fadeUp}>
        <Card className="overflow-hidden p-0" hover={false}>
          <CoverPhotoEditor className="h-24 sm:h-32" />
          <div className="flex flex-col items-center gap-4 p-5 text-center sm:flex-row sm:items-center sm:p-6 sm:text-left">
            <AdminAvatarEditor />
            <div className="min-w-0">
              <h2 className="truncate font-display text-lg font-bold text-ink-900">{user.name}</h2>
              <p className="mt-0.5 text-sm capitalize text-ink-500">{user.role}</p>
              {user.location && (
                <p className="mt-1 flex items-center justify-center gap-1 text-xs text-ink-400 sm:justify-start">
                  <MapPin size={12} aria-hidden="true" /> {user.location}
                </p>
              )}
            </div>
          </div>
        </Card>
      </motion.div>

      <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.05 }} className="mt-5">
        <Card className="p-5 sm:p-6" hover={false}>
          <div className="flex items-center justify-between border-b border-ink-100 pb-4">
            <h2 className="font-display text-base font-bold text-ink-900">Personal Information</h2>
            <Button variant="accent" size="sm" icon={<Pencil size={13} aria-hidden="true" />} onClick={() => setEditOpen(true)}>
              Edit
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-x-6 gap-y-6 pt-5 sm:grid-cols-3">
            <InfoField label="Name" value={user.name} />
            <InfoField label="Member Since" value={formatMemberSince(user.createdAt)} />
            <InfoField
              label="Role"
              value={
                <span className="inline-flex items-center gap-1 capitalize">
                  <ShieldCheck size={13} className="text-brand-600" aria-hidden="true" /> {user.role}
                </span>
              }
            />
            <InfoField
              label="Email Address"
              value={
                user.email ? (
                  <span className="inline-flex items-center gap-1.5">
                    <Mail size={13} className="shrink-0 text-ink-400" aria-hidden="true" /> {user.email}
                  </span>
                ) : null
              }
            />
            <InfoField
              label="Phone Number"
              value={
                user.phone ? (
                  <span className="inline-flex items-center gap-1.5">
                    <Phone size={13} className="shrink-0 text-ink-400" aria-hidden="true" /> {user.phone}
                  </span>
                ) : null
              }
            />
            <InfoField label="Address" value={user.location} />
          </div>
        </Card>
      </motion.div>

      <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.1 }} className="mt-5">
        <Card className="p-5 sm:p-6" hover={false}>
          <h2 className="border-b border-ink-100 pb-4 font-display text-base font-bold text-ink-900">Security</h2>
          <div className="pt-5">
            <ChangePasswordCard />
          </div>
        </Card>
      </motion.div>

      <EditPersonalInfoModal open={editOpen} onClose={() => setEditOpen(false)} />
    </div>
  );
}
