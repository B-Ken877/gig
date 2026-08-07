'use client';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Loader2, AlertCircle, ArrowRight, ArrowLeft, CheckCircle2, User, Mail, Phone, MapPin, Briefcase, Globe2, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAppStore } from '@/lib/store';

const LANGUAGES = ['English', 'French', 'Spanish', 'Creole', 'Portuguese'];
const SKILLS = ['Customer Support', 'Technical Support', 'Sales', 'Live Chat', 'Email Support', 'Appointment Setting', 'Bilingual', 'Virtual Assistant'];
const SHIFTS = ['Morning', 'Afternoon', 'Night', 'Flexible'];

export default function RegisterAgentPage() {
  const { register, navigateTo, login, addToast } = useAppStore();
  const [form, setForm] = useState({
    name: '', email: '', password: '', confirm: '', phone: '',
    country: '', preferredShift: '', experience: '',
  });
  const [languages, setLanguages] = useState<string[]>([]);
  const [skills, setSkills] = useState<string[]>([]);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const toggle = (arr: string[], setArr: (a: string[]) => void, val: string) => {
    setArr(arr.includes(val) ? arr.filter(v => v !== val) : [...arr, val]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (form.password !== form.confirm) {
      setError('Passwords do not match');
      return;
    }
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setLoading(true);
    try {
      await register({
        name: form.name,
        email: form.email,
        password: form.password,
        role: 'agent',
        phone: form.phone || undefined,
        agentProfile: {
          country: form.country,
          languages,
          skills,
          experience: Number(form.experience) || 0,
          preferredShift: form.preferredShift,
        },
      });
      addToast({ title: 'Account created!', description: 'Welcome to Gig Solutions. Signing you in...', variant: 'success' });

      // Auto-login after successful registration
      try {
        await login(form.email, form.password);
        navigateTo('agent-dashboard' as never);
      } catch {
        // If auto-login fails, send them to the login page
        navigateTo('login' as never);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-[calc(100vh-64px)] bg-[#0B1A2E] py-12 px-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-2xl">
        <button onClick={() => navigateTo('home')} className="inline-flex items-center gap-1.5 text-gray-400 hover:text-white transition-colors text-sm mb-4">
          <ArrowLeft className="h-3.5 w-3.5" />
          <span className="text-gray-300">Back to Home</span>
        </button>

        <div className="rounded-2xl bg-white shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-[#0B1A2E] to-[#1a2d4a] px-6 py-8 text-white">
            <div className="flex items-center justify-center mb-3">
              <img src="/logo-wide.png" alt="Gig Solutions" className="h-12 w-auto" onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/logo-wide-40.png'; }} />
            </div>
            <h1 className="text-2xl font-bold text-center">Create Your Free Account</h1>
            <p className="mt-2 text-center text-sm text-white/70">
              Join Gig Solutions and apply for remote jobs across the Caribbean.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-5">
            {error && (
              <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                <AlertCircle className="size-4 shrink-0" />{error}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2 sm:col-span-2">
                <Label>Full Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Jean Pierre Louis" required className="pl-10" />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="you@email.com" required className="pl-10" />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Phone (optional)</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+509 1234 5678" className="pl-10" />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Password</Label>
                <div className="relative">
                  <Input type={showPassword ? 'text' : 'password'} value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="Min. 8 characters" required className="pl-10" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Confirm Password</Label>
                <Input type={showPassword ? 'text' : 'password'} value={form.confirm} onChange={e => setForm(f => ({ ...f, confirm: e.target.value }))} placeholder="Re-enter password" required />
              </div>

              <div className="space-y-2">
                <Label>Country</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input value={form.country} onChange={e => setForm(f => ({ ...f, country: e.target.value }))} placeholder="Haiti, Jamaica, Trinidad..." className="pl-10" />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Experience (years)</Label>
                <div className="relative">
                  <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input type="number" min="0" value={form.experience} onChange={e => setForm(f => ({ ...f, experience: e.target.value }))} placeholder="0" className="pl-10" />
                </div>
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label>Preferred Shift</Label>
                <div className="flex flex-wrap gap-2">
                  {SHIFTS.map(s => (
                    <button key={s} type="button" onClick={() => setForm(f => ({ ...f, preferredShift: f.preferredShift === s ? '' : s }))}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                        form.preferredShift === s ? 'bg-[#16A34A] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label>Languages</Label>
                <div className="flex flex-wrap gap-2">
                  {LANGUAGES.map(l => (
                    <button key={l} type="button" onClick={() => toggle(languages, setLanguages, l)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                        languages.includes(l) ? 'bg-[#16A34A] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label>Skills</Label>
                <div className="flex flex-wrap gap-2">
                  {SKILLS.map(s => (
                    <button key={s} type="button" onClick={() => toggle(skills, setSkills, s)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                        skills.includes(s) ? 'bg-[#16A34A] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-[#16A34A]/5 border border-[#16A34A]/20 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-[#16A34A] shrink-0 mt-0.5" />
                <p className="text-xs text-gray-600">
                  <strong className="text-gray-900">Free to register.</strong> No payment required to create an account.
                  When you find a job you like, you&apos;ll take a quick assessment to apply.
                </p>
              </div>
            </div>

            <Button type="submit" disabled={loading} className="w-full bg-[#16A34A] text-white hover:bg-[#16A34A]/90 py-6 text-base font-semibold">
              {loading ? <><Loader2 className="mr-2 size-4 animate-spin" />Creating Account...</> : <>Create Free Account <ArrowRight className="ml-2 h-4 w-4" /></>}
            </Button>

            <p className="text-center text-sm text-gray-500">
              Already have an account?{' '}
              <button type="button" onClick={() => navigateTo('login')} className="font-semibold text-[#16A34A] hover:underline">
                Sign in
              </button>
            </p>
          </form>
        </div>
      </motion.div>
    </main>
  );
}
