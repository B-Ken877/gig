'use client';

import { useState } from 'react';
import { useAppStore } from '@/lib/store';
import { motion } from 'framer-motion';
import { UserPlus, Globe, Briefcase, Languages, Clock, ArrowLeft, Eye, EyeOff, CheckCircle, Shield, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

const countries = [
  'Haiti', 'Dominican Republic', 'United States', 'Canada', 'France',
  'Jamaica', 'Trinidad and Tobago', 'Bahamas', 'Barbados', 'Guyana',
  'Other'
];

function getPasswordStrength(pw: string): { label: string; color: string; width: string } {
  if (!pw) return { label: '', color: '', width: '0%' };
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (score <= 1) return { label: 'Weak', color: 'bg-red-500', width: '20%' };
  if (score <= 2) return { label: 'Fair', color: 'bg-orange-500', width: '40%' };
  if (score <= 3) return { label: 'Good', color: 'bg-yellow-500', width: '60%' };
  if (score <= 4) return { label: 'Strong', color: 'bg-emerald-500', width: '80%' };
  return { label: 'Very Strong', color: 'bg-emerald-600', width: '100%' };
}

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
        try {
          await login(form.email, form.password);
        } catch(loginErr) {
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

  const pwStrength = getPasswordStrength(form.password);

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8" style={{ background: 'linear-gradient(135deg, #0B1A2E 0%, #0f2847 50%, #0B1A2E 100%)' }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-2xl"
      >
        {/* Header */}
        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-6 mb-6">
            <button
              onClick={() => navigateTo('home')}
              className="inline-flex items-center gap-1.5 text-gray-400 hover:text-white transition-colors text-sm"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
              Home
            </button>
            <span className="text-gray-600">|</span>
            <button
              onClick={() => navigateTo('login')}
              className="inline-flex items-center gap-1.5 text-gray-400 hover:text-white transition-colors text-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              Sign In
            </button>
          </div>
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-[#16A34A]">
            <UserPlus className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-wide text-white">Register as Agent</h1>
          <p className="mt-2 text-sm text-gray-400">Create your account to find call center opportunities</p>
          <div className="mt-3 inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-full px-4 py-1.5">
            <Shield className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-amber-300 text-sm font-medium">Annual onboarding fee: <strong className="text-white">2,000 HTG/year</strong></span>
          </div>
        </div>

        {/* Form Card */}
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-2xl border-0 overflow-hidden">
          {/* Section 1: Personal Information */}
          <div className="border-b border-gray-100">
            <div className="px-6 pt-6 pb-2">
              <h2 className="text-sm font-semibold text-[#0B1A2E] uppercase tracking-wider">Personal Information</h2>
            </div>
            <div className="px-6 pb-6 space-y-4">
              <div>
                <Label className="text-gray-700 text-sm font-medium">Full Name <span className="text-red-500">*</span></Label>
                <Input value={form.fullName} onChange={e => updateField('fullName', e.target.value)}
                  placeholder="Jean Dupont" className="mt-1.5 h-11" />
                {errors.fullName && <p className="text-red-500 text-xs mt-1">{errors.fullName}</p>}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-700 text-sm font-medium">Email <span className="text-red-500">*</span></Label>
                  <Input type="email" value={form.email} onChange={e => updateField('email', e.target.value)}
                    placeholder="jean@email.com" className="mt-1.5 h-11" />
                  {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
                </div>
                <div>
                  <Label className="text-gray-700 text-sm font-medium">Phone <span className="text-red-500">*</span></Label>
                  <Input value={form.phone} onChange={e => updateField('phone', e.target.value)}
                    placeholder="+509 0000 0000" className="mt-1.5 h-11" />
                  {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-700 text-sm font-medium">Password <span className="text-red-500">*</span></Label>
                  <div className="relative mt-1.5">
                    <Input type={showPassword ? 'text' : 'password'} value={form.password}
                      onChange={e => updateField('password', e.target.value)} placeholder="Min 8 characters"
                      className="h-11 pr-10" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {form.password && (
                    <div className="mt-2">
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all duration-300 ${pwStrength.color}`} style={{ width: pwStrength.width }} />
                      </div>
                      <p className={`text-xs mt-1 ${pwStrength.color.replace('bg-', 'text-')}`}>{pwStrength.label}</p>
                    </div>
                  )}
                  {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
                </div>
                <div>
                  <Label className="text-gray-700 text-sm font-medium">Confirm Password <span className="text-red-500">*</span></Label>
                  <div className="relative mt-1.5">
                    <Input type={showConfirm ? 'text' : 'password'} value={form.confirmPassword}
                      onChange={e => updateField('confirmPassword', e.target.value)} placeholder="Repeat password"
                      className="h-11 pr-10" />
                    <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {form.confirmPassword && form.password === form.confirmPassword && (
                    <p className="text-emerald-600 text-xs mt-1 flex items-center gap-1"><Check className="w-3 h-3" />Passwords match</p>
                  )}
                  {errors.confirmPassword && <p className="text-red-500 text-xs mt-1">{errors.confirmPassword}</p>}
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Professional Information */}
          <div className="px-6 pt-6 pb-6 space-y-4">
            <div className="pb-2">
              <h2 className="text-sm font-semibold text-[#0B1A2E] uppercase tracking-wider">Professional Information</h2>
            </div>

            <div>
              <Label className="text-gray-700 text-sm font-medium flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-gray-400" /> Country <span className="text-red-500">*</span>
              </Label>
              <select value={form.country} onChange={e => updateField('country', e.target.value)}
                className="w-full mt-1.5 h-11 rounded-md border border-gray-200 bg-white px-3 text-sm focus:ring-2 focus:ring-[#16A34A] focus:border-[#16A34A] focus:outline-none transition-colors text-gray-900">
                <option value="">Select country</option>
                {countries.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              {errors.country && <p className="text-red-500 text-xs mt-1">{errors.country}</p>}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-700 text-sm font-medium flex items-center gap-1.5">
                  <Briefcase className="w-3.5 h-3.5 text-gray-400" /> Experience (years) <span className="text-red-500">*</span>
                </Label>
                <Input type="number" min="0" value={form.experience} onChange={e => updateField('experience', e.target.value)}
                  placeholder="e.g. 2" className="mt-1.5 h-11" />
                {errors.experience && <p className="text-red-500 text-xs mt-1">{errors.experience}</p>}
              </div>
              <div>
                <Label className="text-gray-700 text-sm font-medium flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-gray-400" /> Preferred Shift
                </Label>
                <select value={form.preferredShift} onChange={e => updateField('preferredShift', e.target.value)}
                  className="w-full mt-1.5 h-11 rounded-md border border-gray-200 bg-white px-3 text-sm focus:ring-2 focus:ring-[#16A34A] focus:border-[#16A34A] focus:outline-none transition-colors text-gray-900">
                  <option value="">Any shift</option>
                  <option value="Morning">Morning</option>
                  <option value="Afternoon">Afternoon</option>
                  <option value="Night">Night</option>
                  <option value="Flexible">Flexible</option>
                </select>
              </div>
            </div>

            <div>
              <Label className="text-gray-700 text-sm font-medium flex items-center gap-1.5">
                <Languages className="w-3.5 h-3.5 text-gray-400" /> Languages <span className="text-red-500">*</span>
              </Label>
              <Input value={form.languages} onChange={e => updateField('languages', e.target.value)}
                placeholder="English, French, Creole (comma-separated)" className="mt-1.5 h-11" />
              {errors.languages && <p className="text-red-500 text-xs mt-1">{errors.languages}</p>}
            </div>

            <div>
              <Label className="text-gray-700 text-sm font-medium">Skills <span className="text-red-500">*</span></Label>
              <Textarea value={form.skills} onChange={e => updateField('skills', e.target.value)}
                placeholder="Customer service, Tech support, Sales (comma-separated)"
                className="mt-1.5 min-h-[72px] text-sm" />
              {errors.skills && <p className="text-red-500 text-xs mt-1">{errors.skills}</p>}
            </div>
          </div>

          {/* Submit */}
          <div className="px-6 pb-6">
            <Button type="submit" disabled={loading}
              className="w-full bg-[#16A34A] text-white hover:bg-[#15a34a]/90 font-semibold py-3 text-base h-12 rounded-xl transition-colors">
              {loading ? (
                <span className="flex items-center gap-2"><Loader2 className="h-5 w-5 animate-spin" />Creating account...</span>
              ) : (
                <span className="flex items-center gap-2"><CheckCircle className="w-5 h-5" />Create Agent Account</span>
              )}
            </Button>
          </div>

          {/* Footer link */}
          <div className="border-t border-gray-100 px-6 py-4 bg-gray-50 text-center">
            <p className="text-sm text-gray-500">
              Already have an account?{' '}
              <button type="button" onClick={() => navigateTo('login')} className="text-[#16A34A] font-semibold hover:text-[#22c55e] transition-colors">
                Sign in
              </button>
            </p>
          </div>
        </form>
      </motion.div>
    </div>
  );
}