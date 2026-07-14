'use client';

import { useState } from 'react';
import { useAppStore } from '@/lib/store';
import { motion } from 'framer-motion';
import { Building2, Globe, Shield, ArrowLeft, Eye, EyeOff, CheckCircle, Link } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const industries = [
  'Customer Service', 'Technical Support', 'Sales & Telemarketing',
  'Healthcare', 'Financial Services', 'E-commerce', 'Travel & Hospitality',
  'Telecommunications', 'Government', 'Education', 'BPO / Call Center', 'Other',
];

export default function RegisterClientPage() {
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
    companyName: '',
    industry: '',
    companyWebsite: '',
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
    if (!form.fullName.trim()) e.fullName = 'Contact person name is required';
    if (!form.email.trim()) e.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Invalid email';
    if (!form.phone.trim()) e.phone = 'Phone number is required';
    if (!form.password) e.password = 'Password is required';
    else if (form.password.length < 8) e.password = 'Min 8 characters';
    if (form.password !== form.confirmPassword) e.confirmPassword = 'Passwords do not match';
    if (!form.companyName.trim()) e.companyName = 'Company name is required';
    if (!form.industry) e.industry = 'Industry is required';
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
        role: 'client' as const,
        clientProfile: {
          companyName: form.companyName,
          industry: form.industry,
          companyLink: form.companyWebsite || '',
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-lg">
        <div className="text-center mb-6">
          <button onClick={() => navigateTo('login')}
            className="inline-flex items-center gap-2 text-slate-400 hover:text-white mb-4 transition-colors">
            <ArrowLeft className="w-4 h-4" />Back to Login
          </button>
          <div className="w-16 h-16 bg-blue-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Building2 className="w-8 h-8 text-blue-400" />
          </div>
          <h1 className="text-3xl font-bold text-white">Register as Call Center</h1>
          <p className="text-slate-400 mt-2">Create your call center account to post jobs and find agents</p>
          <div className="mt-3 inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 rounded-full px-4 py-1.5">
            <Shield className="w-4 h-4 text-amber-400" />
            <span className="text-amber-300 text-sm font-medium">Monthly Fee: 3,000 HTG ($20 USD)</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 space-y-4">
          <div>
            <Label className="text-slate-300">Contact Person Name *</Label>
            <Input value={form.fullName} onChange={e => updateField('fullName', e.target.value)}
              placeholder="Marie Joseph" className="bg-white/5 border-white/10 text-white mt-1" />
            {errors.fullName && <p className="text-red-400 text-xs mt-1">{errors.fullName}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-slate-300">Email *</Label>
              <Input type="email" value={form.email} onChange={e => updateField('email', e.target.value)}
                placeholder="marie@company.com" className="bg-white/5 border-white/10 text-white mt-1" />
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
            <Label className="text-slate-300 flex items-center gap-2"><Building2 className="w-4 h-4" /> Company Name *</Label>
            <Input value={form.companyName} onChange={e => updateField('companyName', e.target.value)}
              placeholder="Acme Call Center" className="bg-white/5 border-white/10 text-white mt-1" />
            {errors.companyName && <p className="text-red-400 text-xs mt-1">{errors.companyName}</p>}
          </div>

          <div>
            <Label className="text-slate-300 flex items-center gap-2"><Globe className="w-4 h-4" /> Industry *</Label>
            <select value={form.industry} onChange={e => updateField('industry', e.target.value)}
              className="w-full mt-1 bg-white/5 border border-white/10 text-white rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none">
              <option value="" className="bg-slate-800">Select industry</option>
              {industries.map(i => <option key={i} value={i} className="bg-slate-800">{i}</option>)}
            </select>
            {errors.industry && <p className="text-red-400 text-xs mt-1">{errors.industry}</p>}
          </div>

          <div>
            <Label className="text-slate-300 flex items-center gap-2"><Link className="w-4 h-4" /> Company Website</Label>
            <Input value={form.companyWebsite} onChange={e => updateField('companyWebsite', e.target.value)}
              placeholder="https://www.yourcompany.com" className="bg-white/5 border-white/10 text-white mt-1" />
          </div>

          <Button type="submit" disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 text-base">
            {loading ? (
              <span className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Creating account...
              </span>
            ) : (
              <span className="flex items-center gap-2"><CheckCircle className="w-5 h-5" />Create Call Center Account</span>
            )}
          </Button>
        </form>
      </motion.div>
    </div>
  );
}
