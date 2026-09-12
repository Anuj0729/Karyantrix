'use client';

import { useState } from 'react';
import { Mail, Phone, CircleAlert } from 'lucide-react';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from './ui/Toast';
import Card from './ui/Card';
import Button from './ui/Button';
import { Field, TextInput } from './ui/Field';

const ICONS = { email: Mail, phone: Phone };
const LABELS = { email: 'Email', phone: 'Phone number' };
const PLACEHOLDERS = { email: 'you@example.com', phone: '+91 98765 43210' };

export default function ContactUpdateCard({ type }) {
  const { user, updateLocalUser } = useAuth();
  const { toast } = useToast();
  const Icon = ICONS[type];
  const currentValue = user?.[type];

  const [open, setOpen] = useState(false);
  const [step, setStep] = useState('enter');
  const [value, setValue] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const resetAndClose = () => {
    setStep('enter');
    setValue('');
    setOtp('');
    setError('');
    setOpen(false);
  };

  const requestOtp = async (e) => {
    e.preventDefault();
    setError('');
    if (!value.trim()) {
      setError(`Please enter a ${LABELS[type].toLowerCase()}`);
      return;
    }
    setLoading(true);
    try {
      await api.post('/auth/me/contact/request-otp', { type, value: value.trim() });
      toast(`OTP sent to ${value.trim()}`, { type: 'success' });
      setStep('otp');
    } catch (err) {
      setError(err.response?.data?.message || 'Could not send OTP, please try again');
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async (e) => {
    e.preventDefault();
    setError('');
    if (!otp.trim()) {
      setError('Please enter the OTP');
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.post('/auth/me/contact/verify-otp', { type, value: value.trim(), otp: otp.trim() });
      updateLocalUser({ [type]: data.user[type] });
      toast(`${LABELS[type]} updated successfully`, { type: 'success' });
      resetAndClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not verify OTP, please try again');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-5" hover={false}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon size={18} className="text-ink-400" aria-hidden="true" />
          <h2 className="font-semibold text-ink-900">{LABELS[type]}</h2>
        </div>
        {!open && (
          <Button size="sm" variant="secondary" onClick={() => { setOpen(true); setValue(currentValue || ''); }}>
            {currentValue ? 'Change' : `Add ${LABELS[type].toLowerCase()}`}
          </Button>
        )}
      </div>

      {!open && (
        <p className="mt-1 text-sm text-ink-500">
          {currentValue || <span className="italic text-ink-400">Not added yet</span>}
        </p>
      )}

      {open && step === 'enter' && (
        <form onSubmit={requestOtp} className="mt-4 flex flex-col gap-4">
          <Field label={`New ${LABELS[type].toLowerCase()}`} required>
            <TextInput
              type={type === 'email' ? 'email' : 'tel'}
              placeholder={PLACEHOLDERS[type]}
              required
              value={value}
              onChange={(e) => setValue(e.target.value)}
            />
          </Field>
          {error && (
            <p className="flex items-center gap-1.5 text-sm text-red-600">
              <CircleAlert size={16} className="shrink-0" aria-hidden="true" /> {error}
            </p>
          )}
          <div className="flex gap-3">
            <Button type="submit" loading={loading}>Send OTP</Button>
            <Button type="button" variant="ghost" disabled={loading} onClick={resetAndClose}>Cancel</Button>
          </div>
        </form>
      )}

      {open && step === 'otp' && (
        <form onSubmit={verifyOtp} className="mt-4 flex flex-col gap-4">
          <p className="text-sm text-ink-500">Enter the OTP sent to <span className="font-medium text-ink-800">{value}</span></p>
          <Field label="OTP" required>
            <TextInput
              inputMode="numeric"
              placeholder="6-digit code"
              required
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
            />
          </Field>
          {error && (
            <p className="flex items-center gap-1.5 text-sm text-red-600">
              <CircleAlert size={16} className="shrink-0" aria-hidden="true" /> {error}
            </p>
          )}
          <div className="flex gap-3">
            <Button type="submit" loading={loading}>Verify & save</Button>
            <Button type="button" variant="ghost" disabled={loading} onClick={() => setStep('enter')}>Back</Button>
          </div>
        </form>
      )}
    </Card>
  );
}
