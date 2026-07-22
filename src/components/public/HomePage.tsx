'use client';

import { motion } from 'framer-motion';
import {
  Headphones,
  MonitorSmartphone,
  BarChart3,
  Users,
  Globe,
  Clock,
  CheckCircle2,
  MessageSquare,
  Mail,
  PhoneCall,
  CalendarCheck,
  UserCheck,
  ArrowRight,
  Quote,
  Building2,
  Shield,
  Zap,
  HandshakeIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/lib/store';

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0 },
};
const stagger = {
  visible: { transition: { staggerChildren: 0.12 } },
};

const STATS = [
  { value: '200+', label: 'Registered Agents' },
  { value: '30+', label: 'Call Center Partners' },
  { value: '5+', label: 'Countries Served' },
];

const HOW_IT_WORKS = [
  {
    step: '01',
    icon: UserCheck,
    title: 'Register & Pay',
    description: 'Agents and call centers create a free account to join the platform. Payment is only required later — agents pay when applying for a job, call centers pay when accessing Job Links.',
  },
  {
    step: '02',
    icon: Users,
    title: 'Build Your Profile',
    description: 'Agents showcase their skills, languages, and experience. Call centers post their hiring needs and job listings.',
  },
  {
    step: '03',
    icon: MessageSquare,
    title: 'Connect Directly',
    description: 'Call centers browse the agent bank, view profiles, and message agents directly. No middleman, no delays.',
  },
  {
    step: '04',
    icon: HandshakeIcon,
    title: 'Hire & Grow',
    description: 'Once connected, call centers and agents work together directly. The platform handles the introduction, you handle the rest.',
  },
];

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
    quote: "Gig Solutions made it so easy to find qualified Spanish-speaking agents for our campaign. We browsed profiles, messaged them directly, and had people trained within a week.",
    name: 'Carlos Mendoza',
    role: 'Operations Director, LatAmCall Inc.',
    image: '/images/testimonial-man1.png',
  },
  {
    quote: "As a remote agent in Haiti, I was struggling to find legitimate opportunities. Gig Solutions connected me with a US-based call center that values my skills. I work from home and earn in USD.",
    name: 'Nathalie Pierre',
    role: 'Customer Support Agent',
    image: '/images/testimonial-woman1.png',
  },
  {
    quote: "The agent bank is incredible. We found 12 agents in one afternoon who matched our exact requirements. The platform cut our hiring time from weeks to days.",
    name: 'Sandra Thompson',
    role: 'HR Manager, Caribbean BPO Solutions',
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
              className="mb-4 inline-block rounded-full bg-[#16A34A]/20 px-4 py-1.5 text-xs font-semibold tracking-wider uppercase text-[#16A34A]">
              The Caribbean Agent Marketplace
            </motion.span>
            <motion.h1 variants={fadeUp} transition={{ duration: 0.5 }}
              className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              Connect with <span className="text-[#16A34A]">Top Call Center Talent</span> Across the Caribbean
            </motion.h1>
            <motion.p variants={fadeUp} transition={{ duration: 0.5 }}
              className="mt-6 max-w-2xl text-lg leading-relaxed text-white/70">
              Gig Solutions is the platform where call centers discover skilled remote agents — and where agents find real opportunities.
              Browse profiles, connect directly, and hire on your terms.
            </motion.p>
            <motion.div variants={fadeUp} transition={{ duration: 0.5 }} className="mt-8 flex flex-wrap gap-4">
              <Button size="lg" className="bg-[#16A34A] text-white hover:bg-[#16A34A]/90"
                onClick={() => navigateTo('register-agent')}>
                Get Started <ArrowRight className="ml-2 h-4 w-4" />
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
              No recruiters, no lengthy screening processes. Just a straightforward platform connecting talent with opportunity.
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
              Agents Ready for <span className="text-[#16A34A]">Every Role</span>
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

      {/* ── For Agents & Call Centers ── */}
      <section className="py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
              <span className="mb-3 inline-block text-xs font-semibold tracking-wider uppercase text-[#16A34A]">For Agents</span>
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Your Skills Deserve <span className="text-[#16A34A]">Real Opportunities</span>
              </h2>
              <p className="mt-4 text-gray-600 leading-relaxed">
                Create your profile, list your skills and languages, and let call centers find you.
                Whether you specialize in customer support, sales, tech support, or chat — there is a company looking for someone exactly like you.
              </p>
              <ul className="mt-6 space-y-3">
                {['Free to register — 1,000 HTG / 3 months only when you apply for a job', 'No assessments or screening required', 'Direct contact with hiring call centers', 'Work remotely from your country'].map(t => (
                  <li key={t} className="flex items-center gap-2 text-sm text-gray-700">
                    <CheckCircle2 className="h-4 w-4 text-[#16A34A] shrink-0" />{t}
                  </li>
                ))}
              </ul>
              <Button className="mt-8 bg-[#16A34A] text-white hover:bg-[#16A34A]/90"
                onClick={() => navigateTo('register-agent')}>
                Register as Agent <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </motion.div>
            <motion.div initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
              className="rounded-2xl overflow-hidden shadow-2xl">
              <img src="/images/remote-caribbean.png" alt="Remote agent in the Caribbean" className="w-full h-80 object-cover" />
            </motion.div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mt-24">
            <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
              className="order-2 lg:order-1 rounded-2xl overflow-hidden shadow-2xl">
              <img src="/images/team-callcenter.png" alt="Call center team" className="w-full h-80 object-cover" />
            </motion.div>
            <motion.div initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} className="order-1 lg:order-2">
              <span className="mb-3 inline-block text-xs font-semibold tracking-wider uppercase text-[#16A34A]">For Call Centers</span>
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Find the Right Agents <span className="text-[#16A34A]">Fast</span>
              </h2>
              <p className="mt-4 text-gray-600 leading-relaxed">
                Browse our agent bank, filter by skills, languages, and experience, then connect directly.
                Post your staffing needs, share job listings, and message candidates — all from one dashboard.
              </p>
              <ul className="mt-6 space-y-3">
                {['Browse a curated bank of skilled agents', 'Post job listings with direct apply links', 'Message agents directly through the platform', 'Free to register — 3,000 HTG / year only when you access Job Links'].map(t => (
                  <li key={t} className="flex items-center gap-2 text-sm text-gray-700">
                    <CheckCircle2 className="h-4 w-4 text-[#16A34A] shrink-0" />{t}
                  </li>
                ))}
              </ul>
              <Button className="mt-8 bg-[#16A34A] text-white hover:bg-[#16A34A]/90"
                onClick={() => navigateTo('register-client')}>
                Register as Call Center <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
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
              Trusted by Agents & <span className="text-[#16A34A]">Call Centers</span>
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
            {/* Left: copy + CTA */}
            <motion.div variants={fadeUp}>
              <span className="mb-3 inline-block text-xs font-semibold tracking-wider uppercase text-[#16A34A]">Gig Solutions Academy</span>
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                From Call Center Agent to <span className="text-[#16A34A]">Professional Translator</span>
              </h2>
              <p className="mt-4 text-gray-600 leading-relaxed">
                You already have the communication skills. You already handle multilingual conversations daily.
                Our book — <em>The Translator's Blueprint</em> — shows you exactly how to pivot into professional
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
            {/* Right: book cover */}
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
            Whether you are an agent looking for your next opportunity or a call center seeking talent, Gig Solutions is your platform.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Button size="lg" className="bg-[#16A34A] text-white hover:bg-[#16A34A]/90"
              onClick={() => navigateTo('register-agent')}>
              Create Your Account <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button size="lg" variant="outline" className="border-white/30 bg-transparent text-white hover:bg-white/10 hover:text-white"
              onClick={() => navigateTo('contact')}>
              Contact Us
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}

