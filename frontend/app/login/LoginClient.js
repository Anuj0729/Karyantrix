'use client';

import { CircleAlert, Eye, EyeOff, Mail, ShieldCheck, TrendingUp, Zap } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useRef, useState } from 'react';
import AuthShell from '../../components/auth/AuthShell';
import OtpBoxInput from '../../components/auth/OtpBoxInput';
import SocialAuthRow from '../../components/auth/SocialAuthRow';
import Button from '../../components/ui/Button';
import { Field, TextInput } from '../../components/ui/Field';
import Modal from '../../components/ui/Modal';
import { useToast } from '../../components/ui/Toast';
import { useAuth } from '../../context/AuthContext';

const RESEND_COOLDOWN_SECONDS = 45;
const MAX_PASSWORD_ATTEMPTS = 5;

const LOGIN_FEATURES = [
  { icon: <ShieldCheck size={18} aria-hidden="true" />, title: 'Secure & Private', desc: 'Your data is always protected' },
  { icon: <Zap size={18} aria-hidden="true" />, title: 'Fast & Easy', desc: 'Log in in just a few seconds' },
  { icon: <TrendingUp size={18} aria-hidden="true" />, title: 'Stay Productive', desc: 'Access your dashboard instantly' },
];

export default function LoginClient() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const { loginWithPassword, requestLoginOtp, loginWithOtp, googleAuth } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const [mode, setMode] = useState('password');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [showOtpSuggestion, setShowOtpSuggestion] = useState(false);

  const cooldownTimer = useRef(null);

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    cooldownTimer.current = setInterval(() => {
      setCooldown((c) => (c <= 1 ? 0 : c - 1));
    }, 1000);
    return () => clearInterval(cooldownTimer.current);
  }, [cooldown]);

  const startCooldown = () => setCooldown(RESEND_COOLDOWN_SECONDS);
  const formatCooldown = (s) => `00:${String(s).padStart(2, '0')}`;

  const goToDashboard = (user) => {
    toast(`Welcome back, ${user.name.split(' ')[0]}!`, { type: 'success' });

    const next = searchParams.get('next');
    const destination =
      next && next.startsWith('/') && !next.startsWith('//')
        ? next
        : user.role === 'admin' || user.role === 'staff'
          ? '/admin'
          : user.role === 'provider'
            ? '/provider/dashboard'
            : '/';

    // Give the success toast a moment on screen before leaving this page,
    // instead of navigating away the instant the request resolves.
    return new Promise((resolve) => {
      setTimeout(() => {
        router.push(destination);
        resolve();
      }, 800);
    });
  };

  const handlePasswordLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await loginWithPassword(identifier, password, remember);
      setFailedAttempts(0);
      await goToDashboard(user);
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed, please try again');
      setFailedAttempts((prev) => {
        const next = prev + 1;
        if (next >= MAX_PASSWORD_ATTEMPTS) {
          setShowOtpSuggestion(true);
          return 0;
        }
        return next;
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async () => {
    setError('');
    setSendingOtp(true);
    try {
      const data = await requestLoginOtp(identifier);
      setOtpSent(true);
      setOtp('');
      startCooldown();
      toast(data.message || 'OTP sent', { type: 'success' });
    } catch (err) {
      setError(err.response?.data?.message || 'Could not send OTP, please try again');
    } finally {
      setSendingOtp(false);
    }
  };

  const handleOtpLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await loginWithOtp(identifier, otp);
      await goToDashboard(user);
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed, please try again');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleCredential = async (credential) => {
    setError('');
    setGoogleLoading(true);
    try {
      const user = await googleAuth(credential);
      await goToDashboard(user);
    } catch (err) {
      setError(err.response?.data?.message || 'Google sign-in failed, please try again');
    } finally {
      setGoogleLoading(false);
    }
  };

  const switchMode = (next) => {
    setMode(next);
    setError('');
    setOtpSent(false);
    setOtp('');
    setCooldown(0);
    setFailedAttempts(0);
  };

  const switchToOtpFromSuggestion = () => {
    setShowOtpSuggestion(false);
    switchMode('otp');
  };

  const showingOtpScreen = mode === 'otp' && otpSent;

  return (
    <AuthShell
      variant={showingOtpScreen ? 'otp' : 'login'}
      asideTitle={showingOtpScreen ? 'Verify your identity' : 'Welcome back!'}
      asideSubtitle={
        showingOtpScreen
          ? 'Enter the 6-digit code we sent to your email or phone'
          : 'Sign in to continue your journey with Karyantrix.'
      }
      asideBadge={
        showingOtpScreen ? (
          <>
            <Mail size={14} className="text-brand-600" aria-hidden="true" /> {identifier}
          </>
        ) : null
      }
      features={showingOtpScreen ? null : LOGIN_FEATURES}
      footerTitle="Your security is our priority"
      footerText="We'll never share your information with anyone."
      topRight={
        showingOtpScreen ? (
          <button
            type="button"
            onClick={() => {
              setOtpSent(false);
              setOtp('');
              setError('');
            }}
            className="font-medium text-brand-600 hover:underline"
          >
            &larr; Back
          </button>
        ) : (
          <span className="text-ink-500">
            Don&apos;t have an account?{' '}
            <Link href="/register" className="font-medium text-brand-600 hover:underline">
              Sign up
            </Link>
          </span>
        )
      }
    >
      {showingOtpScreen ? (
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-brand-100">
              <Mail size={26} className="text-brand-600" aria-hidden="true" />
            </div>
            <h1 className="font-display text-2xl font-bold text-ink-900">Enter OTP</h1>
            <p className="mt-1.5 text-sm text-ink-500">
              We&apos;ve sent a 6-digit code to <span className="font-semibold text-ink-800">{identifier}</span>
            </p>
          </div>

          <form onSubmit={handleOtpLogin} className="flex flex-col gap-5">
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
                  onClick={handleSendOtp}
                  disabled={sendingOtp}
                  className="font-medium text-brand-600 hover:underline disabled:text-ink-300"
                >
                  {sendingOtp ? 'Resending...' : 'Resend now'}
                </button>
              )}
            </div>

            <Button type="submit" fullWidth loading={loading} disabled={otp.length < 6}>
              {loading ? 'Verifying...' : 'Verify OTP'}
            </Button>

            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-ink-100" />
              <span className="text-xs text-ink-400">or</span>
              <div className="h-px flex-1 bg-ink-100" />
            </div>

            <button
              type="button"
              onClick={() => {
                setOtpSent(false);
                setOtp('');
                setError('');
              }}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-ink-200 px-4 py-2.5 text-sm font-medium text-ink-700 transition hover:border-brand-300 hover:bg-brand-50"
            >
              <Mail size={16} aria-hidden="true" /> Change email or phone
            </button>
          </form>
        </div>
      ) : (
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center">
          <div className="mb-6">
            <h1 className="font-display text-2xl font-bold text-ink-900">Sign in</h1>
            <p className="mt-1 text-sm text-ink-500">Enter your details to access your account</p>
          </div>

          {mode === 'password' ? (
            <form onSubmit={handlePasswordLogin} className="flex flex-col gap-4">
              <Field label="Email Address">
                <TextInput placeholder="Enter your email address" required value={identifier} onChange={(e) => setIdentifier(e.target.value)} />
              </Field>
              <Field label="Password">
                <div className="relative">
                  <TextInput
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
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

              {error && (
                <p className="flex items-center gap-1.5 text-sm text-red-600">
                  <CircleAlert size={16} className="shrink-0" aria-hidden="true" /> {error}
                </p>
              )}

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm text-ink-600">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                    className="h-4 w-4 rounded border-ink-300 text-brand-600 focus:ring-brand-200"
                  />
                  Remember me
                </label>
                <Link href="/forgot-password" className="text-sm font-medium text-brand-600 hover:underline">
                  Forgot password?
                </Link>
              </div>

              <Button type="submit" fullWidth loading={loading}>
                {loading ? 'Signing in...' : 'Sign in'}
              </Button>

              <p className="text-center text-sm text-ink-500">
                If you don&apos;t want to login with password then, you will try to login with{' '}
                <button
                  type="button"
                  onClick={() => switchMode('otp')}
                  className="font-medium text-brand-600 hover:underline"
                >
                  OTP
                </button>
              </p>
            </form>
          ) : (
            <form onSubmit={(e) => e.preventDefault()} className="flex flex-col gap-4">
              <Field label="Email Address">
                <TextInput
                  placeholder="Enter your email address"
                  required
                  value={identifier}
                  onChange={(e) => {
                    setIdentifier(e.target.value);
                    setOtpSent(false);
                  }}
                />
              </Field>

              {error && (
                <p className="flex items-center gap-1.5 text-sm text-red-600">
                  <CircleAlert size={16} className="shrink-0" aria-hidden="true" /> {error}
                </p>
              )}

              <Button type="button" fullWidth loading={sendingOtp} onClick={handleSendOtp} disabled={!identifier}>
                {sendingOtp ? 'Sending OTP...' : 'Send OTP'}
              </Button>

              <p className="text-center text-sm text-ink-500">
                Prefer password?{' '}
                <button
                  type="button"
                  onClick={() => switchMode('password')}
                  className="font-medium text-brand-600 hover:underline"
                >
                  Use password instead
                </button>
              </p>
            </form>
          )}

          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-ink-100" />
            <span className="text-xs text-ink-400">or continue with</span>
            <div className="h-px flex-1 bg-ink-100" />
          </div>

          <SocialAuthRow onGoogleCredential={handleGoogleCredential} onGoogleError={(err) => setError(err.message)} disabled={googleLoading} />
        </div>
      )}

      <Modal isOpen={showOtpSuggestion} onClose={() => setShowOtpSuggestion(false)} size="sm">
        <div className="p-6 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-brand-100">
            <ShieldCheck size={26} className="text-brand-600" aria-hidden="true" />
          </div>
          <h2 className="font-display text-lg font-bold text-ink-900">Having trouble signing in?</h2>
          <p className="mt-2 text-sm text-ink-500">
            If you don&apos;t want to login with password then, you will try to login with OTP.
          </p>
          <div className="mt-6 flex flex-col gap-2">
            <Button type="button" fullWidth onClick={switchToOtpFromSuggestion}>
              Login with OTP
            </Button>
            <button
              type="button"
              onClick={() => setShowOtpSuggestion(false)}
              className="text-sm font-medium text-ink-500 hover:text-ink-700"
            >
              Try password again
            </button>
          </div>
        </div>
      </Modal>
    </AuthShell>
  );
}