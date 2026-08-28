'use client';

import { motion } from 'framer-motion';
import {
  Headphones, MonitorSmartphone, PhoneCall, CalendarCheck, MessageSquare, Mail,
  Globe, Clock, CheckCircle2, ArrowRight, Quote, ShieldCheck, Zap, Award, Users2, Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/lib/store';

const fadeUp = { hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0 } };
const stagger = { visible: { transition: { staggerChildren: 0.12 } } };

const STATS = [
  { value: '200+', label: 'Active Agents' },
  { value: '50+', label: 'Job Opportunities' },
  { value: '5+', label: 'Countries Served' },
];

const HOW_IT_WORKS = [
  { step: '01', icon: ShieldCheck, title: 'Create Your Account', description: 'Sign up for free in minutes. No credit card, no commitments. Build your profile and you\'re ready to browse opportunities.' },
  { step: '02', icon: Award, title: 'Pass the Assessment', description: 'When you find a job you like, take a quick skills assessment tailored to that role. Pass it, and your application goes straight to our team.' },
  { step: '03', icon: Briefcase, title: 'Get Hired', description: 'Our team reviews applications and reaches out to qualified agents. Once hired, you\'ll see your work details and pay schedule in your dashboard.' },
  { step: '04', icon: Zap, title: 'Start Working', description: 'Work remotely from anywhere in the Caribbean. Track your placements, see your next payday, and build your career with us.' },
];

import { Briefcase } from 'lucide-react';

const SERVICE_AREAS = [
  { icon: Headphones, title: 'Customer Support', desc: 'Inbound & outbound customer service agents' },
  { icon: MonitorSmartphone, title: 'Technical Support', desc: 'IT help desk and troubleshooting specialists' },
  { icon: PhoneCall, title: 'Sales & Telemarketing', desc: 'Outbound calling, upselling, and lead generation' },
  { icon: CalendarCheck, title: 'Appointment Setting', desc: 'B2B & B2C lead qualification and scheduling' },
  { icon: MessageSquare, title: 'Live Chat', desc: 'Real-time web and mobile chat support' },
  { icon: Mail, title: 'Email Support', desc: 'Professional email response and ticket management' },
];

const TESTIMONIALS = [
  {
    quote: "Gig Solutions gave me my first remote job. I took the assessment, got hired within a week, and now I work from home in Port-au-Prince earning in USD.",
    name: 'Nathalie Pierre',
    role: 'Customer Support Agent',
    image: '/images/testimonial-woman1.png',
  },
  {
    quote: "The assessment process is fair and fast. No long applications, no waiting for weeks. I applied on Monday, was hired by Thursday.",
    name: 'James Bernard',
    role: 'Technical Support Specialist',
    image: '/images/testimonial-man1.png',
  },
  {
    quote: "What I love most is the transparency. I can see my placements, my next payday, and my work history all in one clean dashboard.",
    name: 'Sofia Martinez',
    role: 'Bilingual Agent',
    image: '/images/testimonial-woman2.png',
  },
];

export default function HomePage() {
  const { navigateTo } = useAppStore();

  return (
    <main className="min-h-screen">
      {/* ── Hero ── */}
      <section className="relative overflow-hidden bg-[#0B1A2E] text-white">
        <div className="absolute inset-0 opacity-20 bg-[url('/images/hero-home.png')] bg-cover bg-center" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0B1A2E] via-[#0B1A2E]/90 to-transparent" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-24 sm:py-32 lg:py-40">
          <motion.div initial="hidden" animate="visible" variants={stagger} className="max-w-3xl">
            <motion.span variants={fadeUp} transition={{ duration: 0.5 }}
              className="mb-4 inline-flex items-center gap-2 rounded-full bg-[#16A34A]/20 px-4 py-1.5 text-xs font-semibold tracking-wider uppercase text-[#16A34A]">
              <Sparkles className="h-3.5 w-3.5" /> Remote Jobs, Real Careers
            </motion.span>
            <motion.h1 variants={fadeUp} transition={{ duration: 0.5 }}
              className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              Your Remote Career <span className="text-[#16A34A]">Starts Here</span>
            </motion.h1>
            <motion.p variants={fadeUp} transition={{ duration: 0.5 }}
              className="mt-6 max-w-2xl text-lg leading-relaxed text-white/70">
              Gig Solutions connects skilled agents across the Caribbean with remote job opportunities.
              Browse open positions, pass a quick assessment, and start working from home — all in one place.
            </motion.p>
            <motion.div variants={fadeUp} transition={{ duration: 0.5 }} className="mt-8 flex flex-wrap gap-4">
              <Button size="lg" className="bg-[#16A34A] text-white hover:bg-[#16A34A]/90"
                onClick={() => navigateTo('careers')}>
                Browse Jobs <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button size="lg" className="bg-white text-[#0B1A2E] hover:bg-white/90 font-semibold"
                onClick={() => navigateTo('register-agent')}>
                Create Free Account <Users2 className="ml-2 h-4 w-4" />
              </Button>
              <Button size="lg" variant="outline" className="border-white/30 bg-transparent text-white hover:bg-white/10 hover:text-white"
                onClick={() => navigateTo('services')}>
                Explore Services
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ── Stats ── */}
      <section className="-mt-12 relative z-10 mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {STATS.map((s) => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              className="rounded-xl border bg-white p-6 text-center shadow-lg">
              <p className="text-3xl font-bold text-[#16A34A]">{s.value}</p>
              <p className="mt-1 text-sm text-gray-500">{s.label}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── How It Works ── */}
      <section className="py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="text-center mb-16">
            <motion.span variants={fadeUp} className="mb-3 inline-block text-xs font-semibold tracking-wider uppercase text-[#16A34A]">How It Works</motion.span>
            <motion.h2 variants={fadeUp} className="text-3xl font-bold tracking-tight sm:text-4xl">
              Simple. Direct. <span className="text-[#16A34A]">Effective.</span>
            </motion.h2>
            <motion.p variants={fadeUp} className="mt-4 text-lg text-gray-500 max-w-2xl mx-auto">
              No recruiters, no lengthy screening processes. Just a straightforward path from sign-up to your first paycheck.
            </motion.p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {HOW_IT_WORKS.map((item) => {
              const Icon = item.icon;
              return (
                <motion.div key={item.step} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}
                  className="relative text-center">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#16A34A]/10">
                    <Icon className="h-8 w-8 text-[#16A34A]" />
                  </div>
                  <span className="absolute top-0 right-1/2 translate-x-8 text-6xl font-black text-gray-100">{item.step}</span>
                  <h3 className="text-lg font-semibold">{item.title}</h3>
                  <p className="mt-2 text-sm text-gray-500 leading-relaxed">{item.description}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Service Areas ── */}
      <section className="bg-gray-50 py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="text-center mb-16">
            <motion.span variants={fadeUp} className="mb-3 inline-block text-xs font-semibold tracking-wider uppercase text-[#16A34A]">Service Areas</motion.span>
            <motion.h2 variants={fadeUp} className="text-3xl font-bold tracking-tight sm:text-4xl">
              Roles We <span className="text-[#16A34A]">Hire For</span>
            </motion.h2>
          </motion.div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {SERVICE_AREAS.map((s) => {
              const Icon = s.icon;
              return (
                <motion.div key={s.title} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}
                  className="rounded-xl border bg-white p-6 hover:shadow-lg transition-shadow">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-[#16A34A]/10">
                    <Icon className="h-6 w-6 text-[#16A34A]" />
                  </div>
                  <h3 className="text-base font-semibold">{s.title}</h3>
                  <p className="mt-1 text-sm text-gray-500">{s.desc}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── For Agents ── */}
      <section className="py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
              <span className="mb-3 inline-block text-xs font-semibold tracking-wider uppercase text-[#16A34A]">For Agents</span>
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Your Skills Deserve <span className="text-[#16A34A]">Real Opportunities</span>
              </h2>
              <p className="mt-4 text-gray-600 leading-relaxed">
                Create your free account, browse open positions, and apply with a quick skills assessment.
                Whether you specialize in customer support, sales, tech support, or chat — there&apos;s a role waiting for you.
              </p>
              <ul className="mt-6 space-y-3">
                {[
                  'Free to register — no payment required to create an account',
                  'Browse all open jobs on our public careers page',
                  'Pass a quick per-job assessment to apply',
                  'See your placements and next payday in your dashboard',
                ].map(t => (
                  <li key={t} className="flex items-center gap-2 text-sm text-gray-700">
                    <CheckCircle2 className="h-4 w-4 text-[#16A34A] shrink-0" />{t}
                  </li>
                ))}
              </ul>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button className="bg-[#16A34A] text-white hover:bg-[#16A34A]/90"
                  onClick={() => navigateTo('register-agent')}>
                  Create Free Account <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <Button variant="outline" className="border-[#16A34A]/40 text-[#16A34A] hover:bg-[#16A34A]/10"
                  onClick={() => navigateTo('careers')}>
                  Browse Jobs
                </Button>
              </div>
            </motion.div>
            <motion.div initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
              className="rounded-2xl overflow-hidden shadow-2xl">
              <img src="/images/remote-caribbean.png" alt="Remote agent in the Caribbean" className="w-full h-80 object-cover" />
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section className="bg-gray-50 py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="text-center mb-16">
            <motion.span variants={fadeUp} className="mb-3 inline-block text-xs font-semibold tracking-wider uppercase text-[#16A34A]">Testimonials</motion.span>
            <motion.h2 variants={fadeUp} className="text-3xl font-bold tracking-tight sm:text-4xl">
              Trusted by <span className="text-[#16A34A]">Agents Like You</span>
            </motion.h2>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {TESTIMONIALS.map((t) => (
              <motion.div key={t.name} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}
                className="rounded-xl border bg-white p-6 hover:shadow-lg transition-shadow">
                <Quote className="h-8 w-8 text-[#16A34A]/20 mb-4" />
                <p className="text-sm text-gray-600 leading-relaxed italic">{t.quote}</p>
                <div className="mt-6 flex items-center gap-3">
                  <img src={t.image} alt={t.name} className="h-10 w-10 rounded-full object-cover" />
                  <div>
                    <p className="text-sm font-semibold">{t.name}</p>
                    <p className="text-xs text-gray-500">{t.role}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Gig Solutions Academy ── */}
      <section className="py-20 sm:py-28 bg-gray-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div variants={fadeUp}>
              <span className="mb-3 inline-block text-xs font-semibold tracking-wider uppercase text-[#16A34A]">Gig Solutions Academy</span>
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                From Call Center Agent to <span className="text-[#16A34A]">Professional Translator</span>
              </h2>
              <p className="mt-4 text-gray-600 leading-relaxed">
                You already have the communication skills. You already handle multilingual conversations daily.
                Our book — <em>The Translator&apos;s Blueprint</em> — shows you exactly how to pivot into professional
                translation and earn more doing what you already do best.
              </p>
              <ul className="mt-6 space-y-3">
                {[
                  '500+ pages of practical, no-fluff guidance',
                  'Industry-specific vocabulary sheets for 10+ specializations',
                  'Step-by-step portfolio building with zero experience',
                  'Insider tips to pass certification exams on your first attempt',
                ].map(t => (
                  <li key={t} className="flex items-center gap-2 text-sm text-gray-700">
                    <CheckCircle2 className="h-4 w-4 text-[#16A34A] shrink-0" />{t}
                  </li>
                ))}
              </ul>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button className="bg-[#16A34A] text-white hover:bg-[#16A34A]/90"
                  onClick={() => navigateTo('academy')}>
                  Explore the Academy <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </motion.div>
            <motion.div variants={fadeUp} className="flex justify-center">
              <img src="/academy-book-cover.jpg" alt="The Translator's Blueprint — book cover"
                   className="w-64 sm:w-72 rounded-xl shadow-2xl transition-transform hover:scale-105" />
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="navy-gradient py-20 sm:py-28">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Ready to Get Started?
          </h2>
          <p className="mt-4 text-lg text-white/60">
            Browse our open positions or create a free account to apply. Your next remote job is just a few clicks away.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Button size="lg" className="bg-[#16A34A] text-white hover:bg-[#16A34A]/90"
              onClick={() => navigateTo('careers')}>
              Browse Jobs <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button size="lg" variant="outline" className="border-white/30 bg-transparent text-white hover:bg-white/10 hover:text-white"
              onClick={() => navigateTo('register-agent')}>
              Create Free Account
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}
