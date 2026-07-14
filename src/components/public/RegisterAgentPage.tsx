'use client';

import { useState } from 'react';
import { useAppStore } from '@/lib/store';
import { motion } from 'framer-motion';
import { UserPlus, Globe, Briefcase, Languages, Clock, Shield, ArrowLeft, Eye, EyeOff, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

const countries = [
  'Haiti', 'Dominican Republic', 'United States', 'Canada', 'France',
  'Jamaica', 'Trinidad and Tobago', 'Bahamas', 'Barbados', 'Guyana',
  'Other'
];

export default function RegisterAgentPage() {
  const { register, navigateTo, addToast, login } = useAppStore();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    country: '',
    experience: '',
    languages: '',
    skills: '',
    preferredShift: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const updateField = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.fullName.trim()) e.fullName = 'Full name is required';
    if (!form.email.trim()) e.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Invalid email';
    if (!form.phone.trim()) e.phone = 'Phone number is required';
    if (!form.password) e.password = 'Password is required';
    else if (form.password.length < 8) e.password = 'Min 8 characters';
    if (form.password !== form.confirmPassword) e.confirmPassword = 'Passwords do not match';
    if (!form.country) e.country = 'Country is required';
    if (!form.experience) e.experience = 'Experience is required';
    if (!form.languages.trim()) e.languages = 'At least one language is required';
    if (!form.skills.trim()) e.skills = 'At least one skill is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const result = await register({
        name: form.fullName,
        email: form.email,
        phone: form.phone,
        password: form.password,
        role: 'agent' as const,
        agentProfile: {
          country: form.country,
          experience: parseInt(form.experience) || 0,
          languages: form.languages.split(',').map(s => s.trim()).filter(Boolean),
          skills: form.skills.split(',').map(s => s.trim()).filter(Boolean),
          preferredShift: form.preferredShift || null,
        },
      });

      if (result.requiresApproval) {
        // Auto-login to access payment chat
        try {
          await login(form.email, form.password);
        } catch(loginErr) {
          // If auto-login fails, go to login page
          addToast({ title: 'Account created!', description: 'Please sign in to complete your payment.', variant: 'success' });
          navigateTo('login');
          return;
        }
        addToast({ title: 'Account created!', description: 'Please complete your onboarding payment to activate your account.', variant: 'success' });
        navigateTo('pending-payment');
        return;
      }
    } catch (err) {
      addToast({ title: 'Registration failed', description: err instanceof Error ? err.message : 'Something went wrong. Please try again.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg"
      >
        <div className="text-center mb-6">
          <button
            onClick={() => navigateTo('login')}
            className="inline-flex items-center gap-2 text-slate-400 hover:text-white mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Login
          </button>
          <div className="w-16 h-16 bg-emerald-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <UserPlus className="w-8 h-8 text-emerald-400" />
          </div>
          <h1 className="text-3xl font-bold text-white">Register as Agent</h1>
          <p className="text-slate-400 mt-2">Create your agent account to find call center opportunities</p>
          <div className="mt-3 inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 rounded-full px-4 py-1.5">
            <Shield className="w-4 h-4 text-amber-400" />
            <span className="text-amber-300 text-sm font-medium">Annual Fee: 2,000 HTG</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 space-y-4">
          <div>
            <Label className="text-slate-300">Full Name *</Label>
            <Input value={form.fullName} onChange={e => updateField('fullName', e.target.value)}
              placeholder="Jean Dupont" className="bg-white/5 border-white/10 text-white mt-1" />
            {errors.fullName && <p className="text-red-400 text-xs mt-1">{errors.fullName}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-slate-300">Email *</Label>
              <Input type="email" value={form.email} onChange={e => updateField('email', e.target.value)}
                placeholder="jean@email.com" className="bg-white/5 border-white/10 text-white mt-1" />
              {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email}</p>}
            </div>
            <div>
              <Label className="text-slate-300">Phone *</Label>
              <Input value={form.phone} onChange={e => updateField('phone', e.target.value)}
                placeholder="+509 0000 0000" className="bg-white/5 border-white/10 text-white mt-1" />
              {errors.phone && <p className="text-red-400 text-xs mt-1">{errors.phone}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-slate-300">Password *</Label>
              <div className="relative mt-1">
                <Input type={showPassword ? 'text' : 'password'} value={form.password}
                  onChange={e => updateField('password', e.target.value)} placeholder="Min 8 characters"
                  className="bg-white/5 border-white/10 text-white pr-10" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password}</p>}
            </div>
            <div>
              <Label className="text-slate-300">Confirm *</Label>
              <div className="relative mt-1">
                <Input type={showConfirm ? 'text' : 'password'} value={form.confirmPassword}
                  onChange={e => updateField('confirmPassword', e.target.value)} placeholder="Repeat password"
                  className="bg-white/5 border-white/10 text-white pr-10" />
                <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400">
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.confirmPassword && <p className="text-red-400 text-xs mt-1">{errors.confirmPassword}</p>}
            </div>
          </div>

          <div>
            <Label className="text-slate-300 flex items-center gap-2"><Globe className="w-4 h-4" /> Country *</Label>
            <select value={form.country} onChange={e => updateField('country', e.target.value)}
              className="w-full mt-1 bg-white/5 border border-white/10 text-white rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none">
              <option value="" className="bg-slate-800">Select country</option>
              {countries.map(c => <option key={c} value={c} className="bg-slate-800">{c}</option>)}
            </select>
            {errors.country && <p className="text-red-400 text-xs mt-1">{errors.country}</p>}
          </div>

          <div>
            <Label className="text-slate-300 flex items-center gap-2"><Briefcase className="w-4 h-4" /> Experience (years) *</Label>
            <Input type="number" min="0" value={form.experience} onChange={e => updateField('experience', e.target.value)}
              placeholder="e.g. 2" className="bg-white/5 border-white/10 text-white mt-1" />
            {errors.experience && <p className="text-red-400 text-xs mt-1">{errors.experience}</p>}
          </div>

          <div>
            <Label className="text-slate-300 flex items-center gap-2"><Languages className="w-4 h-4" /> Languages *</Label>
            <Input value={form.languages} onChange={e => updateField('languages', e.target.value)}
              placeholder="English, French, Creole (comma-separated)" className="bg-white/5 border-white/10 text-white mt-1" />
            {errors.languages && <p className="text-red-400 text-xs mt-1">{errors.languages}</p>}
          </div>

          <div>
            <Label className="text-slate-300">Skills *</Label>
            <Textarea value={form.skills} onChange={e => updateField('skills', e.target.value)}
              placeholder="Customer service, Tech support, Sales (comma-separated)"
              className="bg-white/5 border-white/10 text-white mt-1 min-h-[60px]" />
            {errors.skills && <p className="text-red-400 text-xs mt-1">{errors.skills}</p>}
          </div>

          <div>
            <Label className="text-slate-300 flex items-center gap-2"><Clock className="w-4 h-4" /> Preferred Shift</Label>
            <select value={form.preferredShift} onChange={e => updateField('preferredShift', e.target.value)}
              className="w-full mt-1 bg-white/5 border border-white/10 text-white rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none">
              <option value="" className="bg-slate-800">Any</option>
              <option value="Morning" className="bg-slate-800">Morning</option>
              <option value="Afternoon" className="bg-slate-800">Afternoon</option>
              <option value="Night" className="bg-slate-800">Night</option>
              <option value="Flexible" className="bg-slate-800">Flexible</option>
            </select>
          </div>

          <Button type="submit" disabled={loading}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-3 text-base">
            {loading ? (
              <span className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Creating account...
              </span>
            ) : (
              <span className="flex items-center gap-2"><CheckCircle className="w-5 h-5" />Create Agent Account</span>
            )}
          </Button>
        </form>
      </motion.div>
    </div>
  );
}
