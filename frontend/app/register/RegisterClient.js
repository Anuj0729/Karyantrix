'use client';

import { CircleAlert, Eye, EyeOff, Mail } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import AuthShell from '../../components/auth/AuthShell';
import OtpBoxInput from '../../components/auth/OtpBoxInput';
import SocialAuthRow from '../../components/auth/SocialAuthRow';
import Button from '../../components/ui/Button';
import { Field, TextInput } from '../../components/ui/Field';
import { useToast } from '../../components/ui/Toast';
import { useAuth } from '../../context/AuthContext';

const RESEND_COOLDOWN_SECONDS = 45;

export default function RegisterClient() {
  const { initiateRegister, resendRegisterOtp, verifyRegister, googleAuth } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ name: '', identifier: '', password: '', confirmPassword: '' });
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const cooldownTimer = useRef(null);

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    cooldownTimer.current = setInterval(() => {
      setCooldown((c) => (c <= 1 ? 0 : c - 1));
    }, 1000);
    return () => clearInterval(cooldownTimer.current);
  }, [cooldown]);

  const formatCooldown = (s) => `00:${String(s).padStart(2, '0')}`;

  const goHome = (user) => {
    toast(`Account created - welcome to Karyantrix, ${user.name.split(' ')[0]}!`, { type: 'success' });

    // Give the success toast a moment on screen before leaving this page,
    // instead of navigating away the instant the request resolves.
    return new Promise((resolve) => {
      setTimeout(() => {
        router.push('/');
        resolve();
      }, 800);
    });
  };

  const handleDetailsSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (!agreedToTerms) {
      setError('Please agree to the Terms of Use and Privacy Policy to continue');
      return;
    }

    setLoading(true);
    try {
      const data = await initiateRegister(form);
      setStep(2);
      setCooldown(RESEND_COOLDOWN_SECONDS);
      toast(data.message || 'OTP sent', { type: 'success' });
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed, please try again');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await verifyRegister({ identifier: form.identifier, otp });
      await goHome(user);
    } catch (err) {
      setError(err.response?.data?.message || 'Verification failed, please try again');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError('');
    setResending(true);
    try {
      const data = await resendRegisterOtp(form.identifier);
      setCooldown(RESEND_COOLDOWN_SECONDS);
      toast(data.message || 'A new OTP has been sent', { type: 'success' });
    } catch (err) {
      setError(err.response?.data?.message || 'Could not resend OTP, please try again');
    } finally {
      setResending(false);
    }
  };

  const handleGoogleCredential = async (credential) => {
    setError('');
    setGoogleLoading(true);
    try {
      const user = await googleAuth(credential);
      await goHome(user);
    } catch (err) {
      setError(err.response?.data?.message || 'Google sign-up failed, please try again');
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <AuthShell
      variant={step === 1 ? 'register' : 'otp'}
      asideTitle={step === 1 ? 'Create your account' : 'Verify your identity'}
      asideSubtitle={
        step === 1 ? 'Join Karyantrix and unlock a world of smart productivity.' : 'Enter the 6-digit code we sent to your email or phone'
      }
      asideBadge={
        step === 2 ? (
          <>
            <Mail size={14} className="text-brand-600" aria-hidden="true" /> {form.identifier}
          </>
        ) : null
      }
      footerTitle={step === 1 ? 'Your data is safe with us' : 'Your security is our priority'}
      footerText={step === 1 ? "We never share your information." : "We'll never share your information with anyone."}
      topRight={
        step === 2 ? (
          <button
            type="button"
            onClick={() => {
              setStep(1);
              setError('');
            }}
            className="font-medium text-brand-600 hover:underline"
          >
            &larr; Back
          </button>
        ) : (
          <span className="text-ink-500">
            Already have an account?{' '}
            <Link href="/login" className="font-medium text-brand-600 hover:underline">
              Login
            </Link>
          </span>
        )
      }
    >
      {step === 1 ? (
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center">
          <div className="mb-6">
            <h1 className="font-display text-2xl font-bold text-ink-900">Sign up</h1>
            <p className="mt-1 text-sm text-ink-500">Fill in the details to get started</p>
          </div>

          <form onSubmit={handleDetailsSubmit} className="flex flex-col gap-4">
            <Field label="Full Name">
              <TextInput placeholder="Enter your full name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </Field>
            <Field label="Email or Phone Number" hint="We'll send an OTP here to verify it's you">
              <TextInput
                placeholder="Enter your email or phone number"
                required
                value={form.identifier}
                onChange={(e) => setForm({ ...form, identifier: e.target.value })}
              />
            </Field>
            <Field label="Password" hint="At least 6 characters">
              <div className="relative">
                <TextInput
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Create a password"
                  required
                  minLength={6}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  tabIndex={-1}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-ink-400 hover:text-ink-600"
                >
                  {showPassword ? <Eye size={18} /> : <EyeOff size={18} />}
                </button>
              </div>
            </Field>
            <Field label="Confirm Password">
              <div className="relative">
                <TextInput
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Confirm your password"
                  required
                  minLength={6}
                  value={form.confirmPassword}
                  onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
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
              <p className="flex items-center gap-1.5 text-sm text-red-600">
                <CircleAlert size={16} className="shrink-0" aria-hidden="true" /> {error}
              </p>
            )}

            <label className="flex items-start gap-2 text-sm text-ink-600">
              <input
                type="checkbox"
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-ink-300 text-brand-600 focus:ring-brand-200"
              />
              <span>
                I agree to the <span className="font-medium text-brand-600">Terms of Use</span> and{' '}
                <span className="font-medium text-brand-600">Privacy Policy</span>
              </span>
            </label>

            <Button type="submit" fullWidth loading={loading}>
              {loading ? 'Sending OTP...' : 'Create Account'}
            </Button>
          </form>

          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-ink-100" />
            <span className="text-xs text-ink-400">or sign up with</span>
            <div className="h-px flex-1 bg-ink-100" />
          </div>

          <SocialAuthRow onGoogleCredential={handleGoogleCredential} onGoogleError={(err) => setError(err.message)} disabled={googleLoading} />

          <p className="mt-6 text-center text-xs text-ink-400">
            Want to offer services instead? You can start a provider application anytime from your profile.
          </p>
        </div>
      ) : (
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-brand-100">
              <Mail size={26} className="text-brand-600" aria-hidden="true" />
            </div>
            <h1 className="font-display text-2xl font-bold text-ink-900">Enter OTP</h1>
            <p className="mt-1.5 text-sm text-ink-500">
              We&apos;ve sent a 6-digit code to <span className="font-semibold text-ink-800">{form.identifier}</span>
            </p>
          </div>

          <form onSubmit={handleOtpSubmit} className="flex flex-col gap-5">
            <OtpBoxInput value={otp} onChange={setOtp} />

            {error && (
              <p className="flex items-center gap-1.5 text-sm text-red-600">
                <CircleAlert size={16} className="shrink-0" aria-hidden="true" /> {error}
              </p>
            )}

            <div className="text-center text-sm text-ink-500">
              Didn&apos;t receive the code?{' '}
              {cooldown > 0 ? (
                <span className="font-medium text-ink-700">Resend code in {formatCooldown(cooldown)}</span>
              ) : (
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resending}
                  className="font-medium text-brand-600 hover:underline disabled:text-ink-300"
                >
                  {resending ? 'Resending...' : 'Resend now'}
                </button>
              )}
            </div>

            <Button type="submit" fullWidth loading={loading} disabled={otp.length < 6}>
              {loading ? 'Verifying...' : 'Verify & create account'}
            </Button>

            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-ink-100" />
              <span className="text-xs text-ink-400">or</span>
              <div className="h-px flex-1 bg-ink-100" />
            </div>

            <button
              type="button"
              onClick={() => {
                setStep(1);
                setError('');
              }}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-ink-200 px-4 py-2.5 text-sm font-medium text-ink-700 transition hover:border-brand-300 hover:bg-brand-50"
            >
              <Mail size={16} aria-hidden="true" /> Change email or phone
            </button>
          </form>
        </div>
      )}
    </AuthShell>
  );
}