'use client';
import { useState, useEffect } from 'react';
import {
  Eye, EyeOff, Loader2, AlertCircle, ArrowRight, KeyRound, CheckCircle2,
  Lock, Mail, Clock,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAppStore } from '@/lib/store';

type VerifyState =
  | { status: 'loading' }
  | { status: 'valid'; userName: string; userEmail: string; expiresAt: string }
  | { status: 'invalid'; error: string };

type ResetState = 'idle' | 'submitting' | 'success' | 'error';

export default function ResetPasswordPage() {
  const { navigateTo } = useAppStore();
  const [token, setToken] = useState<string | null>(null);
  const [verifyState, setVerifyState] = useState<VerifyState>({ status: 'loading' });
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [resetState, setResetState] = useState<ResetState>('idle');
  const [resetError, setResetError] = useState('');

  // Extract the token from the URL hash on mount.
  // URL format: https://gigsolutions.app/#reset-password?token=abc123...
  useEffect(() => {
    // The hash looks like: "reset-password?token=..."
    const hash = window.location.hash.replace(/^#/, '');
    if (!hash.startsWith('reset-password')) {
      setVerifyState({ status: 'invalid', error: 'No reset token was provided in the link.' });
      return;
    }
    const queryStart = hash.indexOf('?');
    if (queryStart === -1) {
      setVerifyState({ status: 'invalid', error: 'No reset token was provided in the link.' });
      return;
    }
    const params = new URLSearchParams(hash.substring(queryStart + 1));
    const t = params.get('token');
    if (!t || t.length < 20) {
      setVerifyState({ status: 'invalid', error: 'The reset link is missing a valid token.' });
      return;
    }
    setToken(t);
  }, []);

  // Once we have the token, verify it with the backend
  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/auth/reset-password/verify?token=${encodeURIComponent(token)}`);
        const data = await res.json();
        if (cancelled) return;
        if (data.valid) {
          setVerifyState({
            status: 'valid',
            userName: data.user.name,
            userEmail: data.user.email,
            expiresAt: data.expiresAt,
          });
        } else {
          setVerifyState({ status: 'invalid', error: data.error || 'This reset link is invalid.' });
        }
      } catch {
        if (cancelled) return;
        setVerifyState({ status: 'invalid', error: 'Failed to verify the reset link. Please check your internet connection.' });
      }
    })();
    return () => { cancelled = true; };
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    if (password.length < 6) {
      setResetError('Password must be at least 6 characters long.');
      setResetState('error');
      return;
    }
    if (password !== confirmPassword) {
      setResetError('The passwords do not match. Please re-enter them.');
      setResetState('error');
      return;
    }
    setResetState('submitting');
    setResetError('');
    try {
      const res = await fetch('/api/auth/reset-password/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setResetState('success');
      } else {
        setResetState('error');
        setResetError(data.error || 'Failed to reset password. Please try again or request a new link.');
      }
    } catch {
      setResetState('error');
      setResetError('Network error. Please check your connection and try again.');
    }
  };

  const formatExpiry = (iso: string) => {
    const diffMs = new Date(iso).getTime() - Date.now();
    const diffMin = Math.max(0, Math.round(diffMs / 60000));
    if (diffMin < 60) return `${diffMin} minute${diffMin !== 1 ? 's' : ''}`;
    const diffHr = Math.floor(diffMin / 60);
    return `${diffHr} hour${diffHr !== 1 ? 's' : ''} ${diffMin % 60} min`;
  };

  // ─── Render: success state ───
  if (resetState === 'success') {
    return (
      <main className="flex min-h-[calc(100vh-64px)] items-center justify-center px-4 py-16 bg-[#0B1A2E]">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
          <div className="rounded-2xl border border-white/10 bg-white p-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <CheckCircle2 className="h-10 w-10 text-[#16A34A]" />
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">Password Reset</h1>
            <p className="text-sm text-gray-600 mb-6">
              Your password has been reset successfully. You can now log in with your new password.
            </p>
            <Button onClick={() => navigateTo('login')} className="w-full bg-[#16A34A] text-white hover:bg-[#16A34A]/90 py-5">
              Continue to Login <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </motion.div>
      </main>
    );
  }

  // ─── Render: invalid token state ───
  if (verifyState.status === 'invalid') {
    return (
      <main className="flex min-h-[calc(100vh-64px)] items-center justify-center px-4 py-16 bg-[#0B1A2E]">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
          <div className="rounded-2xl border border-white/10 bg-white p-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
              <AlertCircle className="h-10 w-10 text-red-500" />
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">Link Invalid or Expired</h1>
            <p className="text-sm text-gray-600 mb-6">{verifyState.error}</p>
            <Button onClick={() => navigateTo('login')} variant="outline" className="w-full py-5">
              <ArrowRight className="h-4 w-4 mr-2 rotate-180" />Back to Login
            </Button>
          </div>
        </motion.div>
      </main>
    );
  }

  // ─── Render: loading state ───
  if (verifyState.status === 'loading') {
    return (
      <main className="flex min-h-[calc(100vh-64px)] items-center justify-center px-4 py-16 bg-[#0B1A2E]">
        <div className="flex flex-col items-center gap-3 text-white">
          <Loader2 className="h-8 w-8 animate-spin text-[#16A34A]" />
          <p className="text-sm">Verifying reset link...</p>
        </div>
      </main>
    );
  }

  // ─── Render: valid token, show the form ───
  return (
    <main className="flex min-h-[calc(100vh-64px)] items-center justify-center px-4 py-16 bg-[#0B1A2E]">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <div className="mb-2">
          <button onClick={() => navigateTo('login')} className="inline-flex items-center gap-1.5 text-gray-400 hover:text-white transition-colors text-sm">
            <ArrowRight className="h-3.5 w-3.5 rotate-180" />
            <span className="text-gray-300">Back to Login</span>
          </button>
        </div>
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex items-center justify-center">
            <div className="h-16 w-16 rounded-full bg-[#16A34A]/10 flex items-center justify-center">
              <KeyRound className="h-8 w-8 text-[#16A34A]" />
            </div>
          </div>
          <h1 className="text-xl font-bold text-white">Set your new password</h1>
          <p className="mt-2 text-sm text-gray-300">Choose a new password for your Gig Solutions account.</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white p-6 sm:p-8">
          {/* User confirmation card */}
          <div className="mb-6 p-3 rounded-lg bg-blue-50 border border-blue-200">
            <p className="text-xs text-blue-700 uppercase tracking-wider font-medium mb-2">Resetting password for</p>
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-full bg-[#16A34A] flex items-center justify-center text-white text-xs font-bold shrink-0">
                {(verifyState.userName || 'U').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-gray-900 truncate">{verifyState.userName}</p>
                <p className="text-xs text-gray-500 flex items-center gap-1 truncate"><Mail className="h-3 w-3" />{verifyState.userEmail}</p>
              </div>
            </div>
            <p className="mt-2 text-[11px] text-blue-700 flex items-center gap-1">
              <Clock className="h-3 w-3" />
              This link expires in {formatExpiry(verifyState.expiresAt)}.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="new-password">New password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="new-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => { setPassword(e.target.value); setResetState('idle'); setResetError(''); }}
                  placeholder="At least 6 characters"
                  required
                  autoFocus
                  className="pl-10 pr-10"
                  minLength={6}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="confirm-password"
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={e => { setConfirmPassword(e.target.value); setResetState('idle'); setResetError(''); }}
                  placeholder="Re-enter the new password"
                  required
                  className="pl-10"
                  minLength={6}
                />
              </div>
            </div>

            {resetError && (
              <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                <AlertCircle className="size-4 shrink-0" />{resetError}
              </div>
            )}

            <Button type="submit" disabled={resetState === 'submitting' || password.length < 6 || !confirmPassword} className="w-full bg-[#16A34A] text-white hover:bg-[#16A34A]/90 py-5 font-semibold">
              {resetState === 'submitting' ? <><Loader2 className="mr-2 size-4 animate-spin" />Resetting...</> : <>Reset Password <KeyRound className="h-4 w-4 ml-2" /></>}
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-100">
            <p className="text-center text-xs text-gray-500">
              Make sure to remember your new password or store it in a password manager.
            </p>
          </div>
        </div>
      </motion.div>
    </main>
  );
}
