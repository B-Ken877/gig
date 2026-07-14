'use client';

import { motion } from 'framer-motion';
import {
  Users, Search, MessageSquare, Globe, CheckCircle2, ArrowRight,
  Briefcase, Zap, Shield, TrendingUp, DollarSign,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/lib/store';

const fadeUp = { hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0 } };
const stagger = { visible: { transition: { staggerChildren: 0.12 } } };

const FEATURES = [
  { icon: Users, title: 'Agent Bank', desc: 'Browse a growing pool of registered agents filtered by skills, languages, experience, and country. View detailed profiles before making contact.' },
  { icon: MessageSquare, title: 'Direct Messaging', desc: 'Message agents directly through the platform. Discuss the role, agree on terms, and handle the hiring process on your own.' },
  { icon: Briefcase, title: 'Post Staffing Needs', desc: 'Describe what you are looking for — specific skills, languages, shift preferences — and let agents discover your needs.' },
  { icon: Globe, title: 'Job Postings', desc: 'Share external job listings from your company. Agents see them on their dashboard and can apply directly on your site.' },
  { icon: Search, title: 'Smart Filtering', desc: 'Filter agents by language (English, French, Spanish, Creole), experience level, country, and preferred shift to find the perfect match.' },
  { icon: Zap, title: 'Fast Connection', desc: 'No recruiter delays. Find an agent, send a message, and start the conversation — all on the same day.' },
];

const PRICING = [
  {
    title: 'Call Center Plan',
    price: '3,000 HTG',
    period: '/month',
    usd: '(approx. $20 USD)',
    features: [
      'Access to the full agent bank',
      'Unlimited direct messaging with agents',
      'Post staffing needs visible to all agents',
      'View job postings from the admin',
      'Browse agent profiles with full details',
      'Dedicated support from our team',
    ],
    cta: 'Register as Call Center',
    highlighted: true,
  },
  {
    title: 'Agent Plan',
    price: '2,000 HTG',
    period: '/year',
    usd: '',
    features: [
      'Visible profile in the agent bank',
      'Direct messaging with call centers',
      'View job postings from hiring companies',
      'Update skills, languages, and availability',
      'No assessments or screening required',
      'Get discovered by call centers',
    ],
    cta: 'Register as Agent',
    highlighted: false,
  },
];

const STEPS = [
  { step: '1', title: 'Register & Pay', desc: 'Create your call center account and complete the monthly fee of 3,000 HTG via our payment team.' },
  { step: '2', title: 'Set Up Your Profile', desc: 'Add your company name, industry, and link. Then start posting needs and browsing agents.' },
  { step: '3', title: 'Find & Connect', desc: 'Use the agent bank to find candidates. Message them directly, discuss the role, and hire.' },
  { step: '4', title: 'Manage & Grow', desc: 'Post job listings, update your staffing needs, and keep building your remote team.' },
];

export default function ForClientsPage() {
  const { navigateTo } = useAppStore();

  return (
    <main className="min-h-screen">
      {/* Hero */}
      <section className="relative overflow-hidden bg-[#0B1A2E] text-white">
        <div className="absolute inset-0 opacity-20 bg-[url('/images/hero-clients.png')] bg-cover bg-center" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0B1A2E] via-[#0B1A2E]/90 to-transparent" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-24 sm:py-28">
          <motion.div initial="hidden" animate="visible" variants={stagger} className="max-w-3xl">
            <motion.span variants={fadeUp} transition={{ duration: 0.5 }}
              className="mb-4 inline-block rounded-full bg-[#16A34A]/20 px-4 py-1.5 text-xs font-semibold tracking-wider uppercase text-[#16A34A]">
              For Call Centers
            </motion.span>
            <motion.h1 variants={fadeUp} transition={{ duration: 0.5 }}
              className="text-4xl font-bold tracking-tight sm:text-5xl">
              Hire Caribbean Agents <span className="text-[#16A34A]">Directly</span>
            </motion.h1>
            <motion.p variants={fadeUp} transition={{ duration: 0.5 }}
              className="mt-6 max-w-2xl text-lg leading-relaxed text-white/70">
              Browse our agent bank, filter by skills and languages, and message candidates directly.
              No recruiter fees, no lengthy processes. Just talent and opportunity.
            </motion.p>
            <motion.div variants={fadeUp} transition={{ duration: 0.5 }} className="mt-8">
              <Button size="lg" className="bg-[#16A34A] text-white hover:bg-[#16A34A]/90"
                onClick={() => navigateTo('register-client')}>
                Register Your Call Center <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="text-center mb-16">
            <motion.span variants={fadeUp} className="mb-3 inline-block text-xs font-semibold tracking-wider uppercase text-[#16A34A]">How It Works</motion.span>
            <motion.h2 variants={fadeUp} className="text-3xl font-bold tracking-tight sm:text-4xl">
              Start Hiring in <span className="text-[#16A34A]">4 Steps</span>
            </motion.h2>
          </motion.div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {STEPS.map(s => (
              <motion.div key={s.step} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}
                className="relative text-center p-6 rounded-xl border bg-white hover:shadow-lg transition-shadow">
                <span className="absolute top-2 right-4 text-5xl font-black text-gray-100">{s.step}</span>
                <h3 className="text-base font-semibold">{s.title}</h3>
                <p className="mt-2 text-xs text-gray-500 leading-relaxed">{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="bg-gray-50 py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="text-center mb-16">
            <motion.span variants={fadeUp} className="mb-3 inline-block text-xs font-semibold tracking-wider uppercase text-[#16A34A]">Platform Features</motion.span>
            <motion.h2 variants={fadeUp} className="text-3xl font-bold tracking-tight sm:text-4xl">
              Everything You Need to <span className="text-[#16A34A]">Find Talent</span>
            </motion.h2>
          </motion.div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map(f => {
              const Icon = f.icon;
              return (
                <motion.div key={f.title} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}
                  className="rounded-xl border bg-white p-6 hover:shadow-lg transition-shadow">
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-[#16A34A]/10">
                    <Icon className="h-5 w-5 text-[#16A34A]" />
                  </div>
                  <h3 className="text-sm font-semibold">{f.title}</h3>
                  <p className="mt-1 text-xs text-gray-500 leading-relaxed">{f.desc}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-20 sm:py-28">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="text-center mb-16">
            <motion.span variants={fadeUp} className="mb-3 inline-block text-xs font-semibold tracking-wider uppercase text-[#16A34A]">Pricing</motion.span>
            <motion.h2 variants={fadeUp} className="text-3xl font-bold tracking-tight sm:text-4xl">
              Simple, <span className="text-[#16A34A]">Transparent</span> Pricing
            </motion.h2>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {PRICING.map(p => (
              <motion.div key={p.title} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}
                className={`rounded-2xl border p-8 ${p.highlighted ? 'border-[#16A34A] bg-[#16A34A]/5 relative' : 'bg-white'}`}>
                {p.highlighted && <span className="absolute -top-3 left-6 rounded-full bg-[#16A34A] px-3 py-1 text-xs font-semibold text-white">Most Popular</span>}
                <h3 className="text-lg font-semibold">{p.title}</h3>
                <div className="mt-4">
                  <span className="text-4xl font-bold text-[#16A34A]">{p.price}</span>
                  <span className="text-gray-500">{p.period}</span>
                  {p.usd && <p className="text-xs text-gray-400 mt-1">{p.usd}</p>}
                </div>
                <ul className="mt-6 space-y-3">
                  {p.features.map(f => (
                    <li key={f} className="flex items-center gap-2 text-sm text-gray-700">
                      <CheckCircle2 className="h-4 w-4 text-[#16A34A] shrink-0" />{f}
                    </li>
                  ))}
                </ul>
                <Button className={`mt-8 w-full ${p.highlighted ? 'bg-[#16A34A] text-white hover:bg-[#16A34A]/90' : 'border border-gray-300'}`}
                  onClick={() => navigateTo(p.cta.toLowerCase().includes('call center') ? 'register-client' : 'register-agent')}>
                  {p.cta}
                </Button>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="navy-gradient py-20 sm:py-28">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Ready to Build Your Remote Team?
          </h2>
          <p className="mt-4 text-lg text-white/60">
            Register your call center today and start browsing our agent bank immediately after onboarding.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Button size="lg" className="bg-[#16A34A] text-white hover:bg-[#16A34A]/90"
              onClick={() => navigateTo('register-client')}>
              Get Started <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button size="lg" variant="outline" className="border-white/30 text-white hover:bg-white/10"
              onClick={() => navigateTo('contact')}>
              Contact Sales
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}
