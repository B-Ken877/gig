'use client';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAppStore } from '@/lib/store';

const ROLE_DASHBOARD: Record<string, string> = {
  agent: 'agent-dashboard', client: 'client-dashboard',
  payment_taker: 'payment-taker-dashboard', admin: 'admin-dashboard',
  visitor: 'home',
};

export default function LoginPage() {
  const { login, navigateTo, addToast, currentUser, isAuthenticated } = useAppStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isAuthenticated && currentUser) {
      if (currentUser.accountStatus === 'pending_approval') {
        navigateTo('pending-payment');
      } else {
        const dash = ROLE_DASHBOARD[currentUser.role] || 'home';
        navigateTo(dash as never);
      }
    }
  }, [isAuthenticated, currentUser]);

  const handleLogin = async () => {
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      const store = useAppStore.getState();
      const user = store.currentUser;
      if (!user) return;

      if (user.accountStatus === 'pending_approval') {
        navigateTo('pending-payment');
        return;
      }

      addToast({ title: 'Welcome back!', description: `Signed in as ${user.name}`, variant: 'success' });
      const dash = ROLE_DASHBOARD[user.role] || 'home';
      navigateTo(dash as never);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); handleLogin(); };

  return (
    <main className="flex min-h-[calc(100vh-64px)] items-center justify-center px-4 py-16">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <div className="mb-2">
          <button onClick={() => navigateTo('home')} className="inline-flex items-center gap-1.5 text-gray-400 hover:text-white transition-colors text-sm">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
            Back to Home
          </button>
        </div>
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-[#16A34A]">
            <span className="text-lg font-bold text-white">GS</span>
          </div>
          <h1 className="text-2xl font-bold tracking-widest text-[#16A34A]">GIG SOLUTIONS</h1>
          <p className="mt-2 text-sm text-muted-foreground">Sign in to your account</p>
        </div>

        <div className="rounded-2xl border bg-card p-6 sm:p-8 enterprise-shadow">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={email} onChange={e => { setEmail(e.target.value); setError(''); }} placeholder="you@email.com" required autoComplete="email" />
            </div>
            <div className="space-y-2">
              <Label>Password</Label>
              <div className="relative">
                <Input type={showPassword ? 'text' : 'password'} value={password} onChange={e => { setPassword(e.target.value); setError(''); }} placeholder="Enter your password" required className="pr-10" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                <AlertCircle className="size-4 shrink-0" />{error}
              </div>
            )}

            <Button type="submit" disabled={loading} className="w-full bg-[#16A34A] text-white hover:bg-[#16A34A]/90 py-6 text-base font-semibold">
              {loading ? <><Loader2 className="mr-2 size-4 animate-spin" />Signing In...</> : 'Sign In'}
            </Button>
          </form>

          <div className="my-6 text-center space-y-2">
            <p className="text-sm text-muted-foreground">Don&apos;t have an account?</p>
            <div className="flex gap-3 justify-center">
              <button onClick={() => navigateTo('register-agent')} className="text-sm font-semibold text-[#16A34A] hover:text-[#22c55e] transition-colors">
                Register as Agent
              </button>
              <span className="text-muted-foreground">|</span>
              <button onClick={() => navigateTo('register-client')} className="text-sm font-semibold text-blue-500 hover:text-blue-400 transition-colors">
                Register as Call Center
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </main>
  );
}
