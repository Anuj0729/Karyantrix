'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/ui/Toast';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { Field, TextInput } from '../../components/ui/Field';
import OtpBoxInput from '../../components/auth/OtpBoxInput';
import { Eye, EyeOff, CircleAlert, KeyRound } from 'lucide-react';

const STEP_IDENTIFIER = 1;
const STEP_OTP = 2;
const STEP_NEW_PASSWORD = 3;

export default function ForgotPasswordPage() {
  const { requestPasswordReset, verifyPasswordResetOtp, resetPassword } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [step, setStep] = useState(STEP_IDENTIFIER);
  const [identifier, setIdentifier] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleRequestOtp = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await requestPasswordReset(identifier);
      setStep(STEP_OTP);
      toast(data.message || 'OTP sent', { type: 'success' });
    } catch (err) {
      setError(err.response?.data?.message || 'Could not send OTP, please try again');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError('');
    setResending(true);
    try {
      const data = await requestPasswordReset(identifier);
      toast(data.message || 'A new OTP has been sent', { type: 'success' });
    } catch (err) {
      setError(err.response?.data?.message || 'Could not resend OTP, please try again');
    } finally {
      setResending(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await verifyPasswordResetOtp(identifier, otp);
      setStep(STEP_NEW_PASSWORD);
      toast('OTP verified, set your new password', { type: 'success' });
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid or expired OTP, please try again');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (e) => {
    e.preventDefault();
    setError('');
    if (newPassword !== confirmPassword) {
      setError('New password and confirm password do not match');
      return;
    }
    setLoading(true);
    try {
      const data = await resetPassword({ identifier, newPassword, confirmPassword });
      toast(data.message || 'Password reset successfully', { type: 'success' });
      router.push('/login');
    } catch (err) {
      setError(err.response?.data?.message || 'Could not reset password, please try again');
    } finally {
      setLoading(false);
    }
  };

  const titles = {
    [STEP_IDENTIFIER]: { h1: 'Forgot Password', sub: 'Enter your registered email or phone to receive a verification code' },
    [STEP_OTP]: { h1: 'Verify Your OTP', sub: `Enter the 6-digit verification code sent to ${identifier}` },
    [STEP_NEW_PASSWORD]: { h1: 'Create New Password', sub: 'Choose a strong password to secure your account' },
  };

  return (
    <div className="mx-auto max-w-md py-10 px-4">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}>
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 border border-brand-100/80 shadow-soft text-brand-600">
            <KeyRound size={22} />
          </div>
          <h1 className="font-display text-2xl font-bold text-ink-900 tracking-tight">{titles[step].h1}</h1>
          <p className="mt-1 text-xs text-ink-500 max-w-xs mx-auto leading-relaxed">{titles[step].sub}</p>
        </div>

        <Card className="p-6 sm:p-7 rounded-3xl border border-ink-200/80 bg-white shadow-popover" hover={false}>
          {step === STEP_IDENTIFIER && (
            <form onSubmit={handleRequestOtp} className="flex flex-col gap-4">
              <Field label="Email address or phone number" required hint="We'll send an OTP to verify ownership">
                <TextInput
                  placeholder="you@example.com or +91XXXXXXXXXX"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                />
              </Field>

              {error && (
                <p className="flex items-center gap-1.5 text-xs text-danger-600 bg-danger-50 p-2.5 rounded-xl border border-danger-200">
                  <CircleAlert size={14} className="shrink-0" aria-hidden="true" /> {error}
                </p>
              )}

              <Button type="submit" fullWidth loading={loading} size="lg">
                {loading ? 'Sending verification code...' : 'Send verification OTP'}
              </Button>
            </form>
          )}

          {step === STEP_OTP && (
            <form onSubmit={handleVerifyOtp} className="flex flex-col gap-5">
              <div className="py-2">
                <OtpBoxInput value={otp} onChange={setOtp} />
              </div>

              {error && (
                <p className="flex items-center gap-1.5 text-xs text-danger-600 bg-danger-50 p-2.5 rounded-xl border border-danger-200">
                  <CircleAlert size={14} className="shrink-0" aria-hidden="true" /> {error}
                </p>
              )}

              <Button type="submit" fullWidth loading={loading} size="lg" disabled={otp.length < 6}>
                {loading ? 'Verifying OTP...' : 'Verify OTP'}
              </Button>

              <div className="flex items-center justify-between text-xs pt-1 border-t border-ink-100">
                <button type="button" onClick={() => setStep(STEP_IDENTIFIER)} className="font-semibold text-ink-500 hover:text-ink-900 transition-colors">
                  &larr; Change email/phone
                </button>
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resending}
                  className="font-bold text-brand-600 hover:underline disabled:text-ink-300"
                >
                  {resending ? 'Resending...' : 'Resend code'}
                </button>
              </div>
            </form>
          )}

          {step === STEP_NEW_PASSWORD && (
            <form onSubmit={handleReset} className="flex flex-col gap-4">
              <Field label="New password" required hint="At least 6 characters, different from your old password">
                <div className="relative">
                  <TextInput
                    type={showNewPassword ? 'text' : 'password'}
                    placeholder="New password"
                    required
                    minLength={6}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword((v) => !v)}
                    tabIndex={-1}
                    aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-ink-400 hover:text-ink-600"
                  >
                    {showNewPassword ? <Eye size={18} /> : <EyeOff size={18} />}
                  </button>
                </div>
              </Field>

              <Field label="Confirm new password" required>
                <div className="relative">
                  <TextInput
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Confirm new password"
                    required
                    minLength={6}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((v) => !v)}
                    tabIndex={-1}
                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-ink-400 hover:text-ink-600"
                  >
                    {showConfirmPassword ? <Eye size={18} /> : <EyeOff size={18} />}
                  </button>
                </div>
              </Field>

              {error && (
                <p className="flex items-center gap-1.5 text-xs text-danger-600 bg-danger-50 p-2.5 rounded-xl border border-danger-200">
                  <CircleAlert size={14} className="shrink-0" aria-hidden="true" /> {error}
                </p>
              )}

              <Button type="submit" fullWidth loading={loading} size="lg">
                {loading ? 'Resetting password...' : 'Reset & update password'}
              </Button>
            </form>
          )}
        </Card>

        <p className="mt-5 text-center text-xs font-semibold text-ink-500">
          Remembered your password?{' '}
          <Link href="/login" className="font-bold text-brand-600 hover:underline">
            Sign in
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
