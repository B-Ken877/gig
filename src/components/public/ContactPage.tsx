'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  MapPin, Phone, Mail, MessageCircle, Loader2, Clock, Send,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useAppStore } from '@/lib/store';

const fadeUp = { hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0 } };
const stagger = { visible: { transition: { staggerChildren: 0.12 } } };

const SUBJECTS = [
  'General Inquiry',
  'Agent Registration',
  'Call Center Partnership',
  'Payment Support',
  'Technical Issue',
  'Other',
];

const CONTACT_INFO = [
  { icon: Mail, label: 'Email', value: 'info@gigsolutions.com', href: 'mailto:info@gigsolutions.com' },
  { icon: Phone, label: 'Phone', value: '+509 0000-0000', href: 'tel:+50900000000' },
  { icon: MapPin, label: 'Location', value: 'Port-au-Prince, Haiti', href: null },
  { icon: Clock, label: 'Hours', value: 'Mon-Fri 8AM-6PM EST', href: null },
];

export default function ContactPage() {
  const { addToast } = useAppStore();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '', subject: '', message: '' });

  const updateField = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    await new Promise((r) => setTimeout(r, 1200));
    setSubmitting(false);
    addToast({ title: 'Message Sent', description: 'Thank you for reaching out. Our team will respond within 24 hours.', variant: 'success' });
    setForm({ name: '', email: '', phone: '', subject: '', message: '' });
  };

  return (
    <main className="min-h-screen">
      {/* Hero */}
      <section className="relative overflow-hidden bg-[#0B1A2E] text-white">
        <div className="absolute inset-0 opacity-20 bg-[url('/images/hero-contact.png')] bg-cover bg-center" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0B1A2E] via-[#0B1A2E]/90 to-transparent" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-24 sm:py-28">
          <motion.div initial="hidden" animate="visible" variants={stagger} className="max-w-3xl">
            <motion.span variants={fadeUp} transition={{ duration: 0.5 }}
              className="mb-4 inline-block rounded-full bg-[#16A34A]/20 px-4 py-1.5 text-xs font-semibold tracking-wider uppercase text-[#16A34A]">
              Contact
            </motion.span>
            <motion.h1 variants={fadeUp} transition={{ duration: 0.5 }}
              className="text-4xl font-bold tracking-tight sm:text-5xl">
              Get in <span className="text-[#16A34A]">Touch</span>
            </motion.h1>
            <motion.p variants={fadeUp} transition={{ duration: 0.5 }}
              className="mt-6 max-w-2xl text-lg leading-relaxed text-white/70">
              Have a question about the platform, need help with your account, or want to explore a partnership?
              We would love to hear from you.
            </motion.p>
          </motion.div>
        </div>
      </section>

      {/* Contact Form + Info */}
      <section className="py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            {/* Form */}
            <div className="lg:col-span-2">
              <h2 className="text-2xl font-bold mb-6">Send Us a Message</h2>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <Label>Full Name</Label>
                    <Input value={form.name} onChange={e => updateField('name', e.target.value)} placeholder="Your full name" required />
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input type="email" value={form.email} onChange={e => updateField('email', e.target.value)} placeholder="you@example.com" required />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <Label>Phone (optional)</Label>
                    <Input value={form.phone} onChange={e => updateField('phone', e.target.value)} placeholder="+509 0000-0000" />
                  </div>
                  <div className="space-y-2">
                    <Label>Subject</Label>
                    <Select value={form.subject} onValueChange={v => updateField('subject', v)}>
                      <SelectTrigger><SelectValue placeholder="Select a subject" /></SelectTrigger>
                      <SelectContent>
                        {SUBJECTS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Message</Label>
                  <Textarea value={form.message} onChange={e => updateField('message', e.target.value)} rows={6}
                    placeholder="Tell us how we can help..." required />
                </div>
                <Button type="submit" disabled={submitting} size="lg"
                  className="bg-[#16A34A] text-white hover:bg-[#16A34A]/90">
                  {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Sending...</> : <><Send className="mr-2 h-4 w-4" />Send Message</>}
                </Button>
              </form>
            </div>

            {/* Contact Info */}
            <div className="space-y-6">
              <h2 className="text-2xl font-bold mb-6">Contact Info</h2>
              {CONTACT_INFO.map(c => {
                const Icon = c.icon;
                const Wrapper = c.href ? 'a' : 'div';
                return (
                  <div key={c.label} className="flex items-start gap-4 p-4 rounded-xl border bg-white hover:shadow-md transition-shadow">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#16A34A]/10">
                      <Icon className="h-5 w-5 text-[#16A34A]" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{c.label}</p>
                      {c.href ? (
                        <a href={c.href} className="text-sm text-[#16A34A] hover:underline">{c.value}</a>
                      ) : (
                        <p className="text-sm text-gray-600">{c.value}</p>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Quick links */}
              <div className="rounded-xl border bg-gray-50 p-5 mt-8">
                <h3 className="text-sm font-semibold mb-3">Quick Links</h3>
                <div className="space-y-2">
                  {[
                    { label: 'Register as Agent', page: 'register' as const },
                    { label: 'Register as Call Center', page: 'register' as const },
                    { label: 'View Services', page: 'services' as const },
                  ].map(l => (
                    <button key={l.label} onClick={() => useAppStore.getState().navigateTo(l.page)}
                      className="block w-full text-left text-sm text-[#16A34A] hover:underline py-1">
                      {l.label} &rarr;
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
