'use client';

import { useState } from 'react';
import { Eye, EyeOff, CircleAlert, KeyRound } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from './ui/Toast';
import Card from './ui/Card';
import Button from './ui/Button';
import { Field, TextInput } from './ui/Field';

const EMPTY_FORM = { currentPassword: '', newPassword: '', confirmPassword: '' };

export default function ChangePasswordCard() {
  const { changePassword } = useAuth();
  const { toast } = useToast();

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const update = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const resetAndClose = () => {
    setForm(EMPTY_FORM);
    setError('');
    setOpen(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (form.newPassword.length < 6) {
      setError('New password must be at least 6 characters');
      return;
    }
    if (form.newPassword !== form.confirmPassword) {
      setError('New password and confirm password do not match');
      return;
    }

    setLoading(true);
    try {
      await changePassword(form);
      toast('Password changed successfully', { type: 'success' });
      resetAndClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not change password, please try again');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-5" hover={false}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <KeyRound size={18} className="text-ink-400" aria-hidden="true" />
          <h2 className="font-semibold text-ink-900">Password</h2>
        </div>
        {!open && (
          <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>
            Change password
          </Button>
        )}
      </div>

      {!open && <p className="mt-1 text-sm text-ink-500">Update the password used to sign in to your account.</p>}

      {open && (
        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4">
          <Field label="Current password" required>
            <div className="relative">
              <TextInput
                type={showCurrent ? 'text' : 'password'}
                placeholder="Current password"
                required
                autoComplete="current-password"
                value={form.currentPassword}
                onChange={update('currentPassword')}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowCurrent((v) => !v)}
                tabIndex={-1}
                aria-label={showCurrent ? 'Hide password' : 'Show password'}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-ink-400 hover:text-ink-600"
              >
                {showCurrent ? <Eye size={18} /> : <EyeOff size={18} />}
              </button>
            </div>
          </Field>

          <Field label="New password" required hint="At least 6 characters">
            <div className="relative">
              <TextInput
                type={showNew ? 'text' : 'password'}
                placeholder="New password"
                required
                autoComplete="new-password"
                value={form.newPassword}
                onChange={update('newPassword')}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowNew((v) => !v)}
                tabIndex={-1}
                aria-label={showNew ? 'Hide password' : 'Show password'}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-ink-400 hover:text-ink-600"
              >
                {showNew ? <Eye size={18} /> : <EyeOff size={18} />}
              </button>
            </div>
          </Field>

          <Field label="Confirm new password" required>
            <TextInput
              type={showNew ? 'text' : 'password'}
              placeholder="Confirm new password"
              required
              autoComplete="new-password"
              value={form.confirmPassword}
              onChange={update('confirmPassword')}
            />
          </Field>

          {error && (
            <p className="flex items-center gap-1.5 text-sm text-red-600">
              <CircleAlert size={16} className="shrink-0" aria-hidden="true" /> {error}
            </p>
          )}

          <div className="flex gap-3">
            <Button type="submit" loading={loading}>Save new password</Button>
            <Button type="button" variant="ghost" disabled={loading} onClick={resetAndClose}>
              Cancel
            </Button>
          </div>
        </form>
      )}
    </Card>
  );
}
