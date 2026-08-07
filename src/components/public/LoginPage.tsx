'use client';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Loader2, AlertCircle, ArrowRight, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAppStore } from '@/lib/store';

const ROLE_DASHBOARD: Record<string, string> = {
  agent: 'agent-dashboard',
  admin: 'admin-dashboard',
  visitor: 'home',
};

export default function LoginPage() {
  const { login, navigateTo, addToast, currentUser, isAuthenticated, pendingJobId } = useAppStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isAuthenticated && currentUser) {
      // If the user came from a "Apply Now" click on the career page,
      // send them straight to the agent dashboard which will surface the
      // pending-job assessment modal.
      if (pendingJobId && currentUser.role === 'agent') {
        navigateTo('agent-dashboard' as never);
      } else {
        const dash = ROLE_DASHBOARD[currentUser.role] || 'home';
        navigateTo(dash as never);
      }
    }
  }, [isAuthenticated, currentUser, pendingJobId, navigateTo]);

  const handleLogin = async () => {
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      const store = useAppStore.getState();
      const user = store.currentUser;
      if (!user) return;

      addToast({ title: 'Welcome back!', description: `Signed in as ${user.name}`, variant: 'success' });

      // Same redirect logic as the useEffect above — but immediate.
      if (store.pendingJobId && user.role === 'agent') {
        navigateTo('agent-dashboard' as never);
      } else {
        const dash = ROLE_DASHBOARD[user.role] || 'home';
        navigateTo(dash as never);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); handleLogin(); };

  return (
    <main className="flex min-h-[calc(100vh-64px)] items-center justify-center px-4 py-16 bg-[#0B1A2E]">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <div className="mb-2">
          <button onClick={() => navigateTo('home')} className="inline-flex items-center gap-1.5 text-gray-400 hover:text-white transition-colors text-sm">
            <ArrowRight className="h-3.5 w-3.5 rotate-180" />
            <span className="text-gray-300">Back to Home</span>
          </button>
        </div>
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex items-center justify-center">
            <img
              src="/logo-wide.png"
              alt="Gig Solutions"
              className="h-16 w-auto"
              style={{ objectFit: 'contain' }}
              onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/logo-wide-40.png'; }}
            />
          </div>
          <p className="mt-2 text-sm text-gray-300">Sign in to your account</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white p-6 sm:p-8 enterprise-shadow">
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

          {/* Visible Register CTA */}
          <div className="mt-6 pt-6 border-t border-gray-100">
            <p className="text-center text-sm text-gray-500 mb-3">Don&apos;t have an account?</p>
            <Button
              variant="outline"
              className="w-full border-[#16A34A]/40 text-[#16A34A] hover:bg-[#16A34A]/10 font-semibold py-5"
              onClick={() => navigateTo('register-agent')}
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Create a Free Account
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
            <p className="mt-3 text-center text-xs text-gray-400">
              Free to register. No payment required to apply for jobs.
            </p>
          </div>
        </div>
      </motion.div>
    </main>
  );
}
