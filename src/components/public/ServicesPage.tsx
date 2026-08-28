'use client';

import { motion } from 'framer-motion';
import {
  Headphones,
  MonitorSmartphone,
  UserCheck,
  CalendarCheck,
  MessageSquare,
  Mail,
  CheckCircle2,
  ArrowRight,
  Globe,
  ShieldCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/lib/store';

const fadeUp = { hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0 } };
const stagger = { visible: { transition: { staggerChildren: 0.1 } } };

const SERVICES = [
  {
    icon: Headphones,
    title: 'Customer Support',
    image: '/images/customer-support-agent.png',
    subtitle: 'Inbound & Outbound',
    description: 'Agents trained to handle high-volume customer inquiries with empathy and professionalism. They manage questions, complaints, returns, and general support across all major industries including e-commerce, SaaS, healthcare, and financial services.',
    highlights: ['Multi-channel support (phone, email, chat)', 'CRM and ticketing system proficiency', 'Empathy-driven communication', 'Quality assurance ready'],
  },
  {
    icon: MonitorSmartphone,
    title: 'Technical Support',
    image: '/images/tech-support-agent.png',
    subtitle: 'Level 1 & Level 2',
    description: 'IT-savvy agents equipped to troubleshoot hardware, software, and network issues. They follow documented escalation procedures and maintain detailed case documentation for seamless handoffs between support tiers.',
    highlights: ['IT fundamentals and troubleshooting', 'Knowledge base documentation', 'Remote diagnostics and screen-share', 'Escalation management'],
  },
  {
    icon: UserCheck,
    title: 'Sales & Telemarketing',
    image: '/images/sales-agent.png',
    subtitle: 'Outbound & Inbound',
    description: 'Results-driven agents experienced in outbound cold calling, warm lead conversion, upselling, and cross-selling. They understand consultative sales techniques and are comfortable with CRM pipelines and sales scripts.',
    highlights: ['Consultative and solution-based selling', 'CRM pipeline management', 'Lead qualification and scoring', 'Conversion optimization'],
  },
  {
    icon: CalendarCheck,
    title: 'Appointment Setting',
    image: '/images/appointment-setter.png',
    subtitle: 'B2B & B2C',
    description: 'Specialists who qualify prospects and schedule high-value meetings for your sales team. They work from your ideal customer profile, use approved scripts, and integrate directly with your calendar and CRM systems.',
    highlights: ['ICP targeting and prospecting', 'Calendar and scheduling integration', 'Confirmation and reminder workflows', 'No-show reduction strategies'],
  },
  {
    icon: MessageSquare,
    title: 'Live Chat Support',
    image: '/images/chat-agent.png',
    subtitle: 'Web & Mobile',
    description: 'Real-time chat agents delivering instant, accurate responses across web and mobile platforms. They handle multiple conversations simultaneously while maintaining quality and brand consistency.',
    highlights: ['Multi-conversation management', 'Quick response times under 60 seconds', 'Brand voice consistency', 'Escalation to voice when needed'],
  },
  {
    icon: Mail,
    title: 'Email Support',
    image: '/images/email-agent.png',
    subtitle: 'Professional Response',
    description: 'Dedicated email agents managing high-volume inboxes with professional, on-brand responses. They categorize, prioritize, and route emails while maintaining SLA compliance and customer satisfaction.',
    highlights: ['High-volume inbox management', 'SLA-driven response times', 'Categorization and routing', 'Professional written communication'],
  },
];

const WHY_US = [
  { icon: Globe, title: 'Diverse Talent Pool', description: 'Agents from Haiti, Jamaica, Trinidad, Nigeria, the Dominican Republic, and across the Caribbean.' },
  { icon: ShieldCheck, title: 'Quality Assessed', description: 'Every agent passes a skills assessment before they can apply for a job. You only see qualified candidates.' },
];

export default function ServicesPage() {
  const { navigateTo } = useAppStore();

  return (
    <main className="min-h-screen">
      {/* Hero */}
      <section className="relative overflow-hidden bg-[#0B1A2E] text-white">
        <div className="absolute inset-0 opacity-20 bg-[url('/images/hero-services.png')] bg-cover bg-center" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0B1A2E] via-[#0B1A2E]/90 to-transparent" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-24 sm:py-28">
          <motion.div initial="hidden" animate="visible" variants={stagger} className="max-w-3xl">
            <motion.span variants={fadeUp} transition={{ duration: 0.5 }}
              className="mb-4 inline-block rounded-full bg-[#16A34A]/20 px-4 py-1.5 text-xs font-semibold tracking-wider uppercase text-[#16A34A]">
              Our Services
            </motion.span>
            <motion.h1 variants={fadeUp} transition={{ duration: 0.5 }}
              className="text-4xl font-bold tracking-tight sm:text-5xl">
              Remote Talent, <span className="text-[#16A34A]">Ready to Work</span>
            </motion.h1>
            <motion.p variants={fadeUp} transition={{ duration: 0.5 }}
              className="mt-6 max-w-2xl text-lg leading-relaxed text-white/70">
              Our registered agents specialize in the roles that businesses need most.
              Browse the categories below to see the talent we connect you with.
            </motion.p>
          </motion.div>
        </div>
      </section>

      {/* Services Grid */}
      <section className="py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="space-y-16">
            {SERVICES.map((service, idx) => {
              const Icon = service.icon;
              const isReversed = idx % 2 !== 0;
              return (
                <motion.div key={service.title} initial="hidden" whileInView="visible" viewport={{ once: true }}
                  variants={stagger}
                  className={`grid grid-cols-1 lg:grid-cols-2 gap-12 items-center ${isReversed ? 'lg:direction-rtl' : ''}`}>
                  <div className={isReversed ? 'lg:order-2' : ''}>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#16A34A]/10">
                        <Icon className="h-6 w-6 text-[#16A34A]" />
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold">{service.title}</h3>
                        <p className="text-sm text-[#16A34A] font-medium">{service.subtitle}</p>
                      </div>
                    </div>
                    <p className="text-gray-600 leading-relaxed">{service.description}</p>
                    <ul className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {service.highlights.map(h => (
                        <li key={h} className="flex items-center gap-2 text-sm text-gray-700">
                          <CheckCircle2 className="h-4 w-4 text-[#16A34A] shrink-0" />{h}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className={isReversed ? 'lg:order-1' : ''}>
                    <div className="rounded-2xl overflow-hidden shadow-xl">
                      <img src={service.image} alt={service.title} className="w-full h-72 object-cover" loading="lazy" />
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Why Gig Solutions */}
      <section className="bg-gray-50 py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="text-center mb-16">
            <motion.span variants={fadeUp} className="mb-3 inline-block text-xs font-semibold tracking-wider uppercase text-[#16A34A]">Why Us</motion.span>
            <motion.h2 variants={fadeUp} className="text-3xl font-bold tracking-tight sm:text-4xl">
              A Different Kind of <span className="text-[#16A34A]">Platform</span>
            </motion.h2>
            <motion.p variants={fadeUp} className="mt-4 text-gray-500 max-w-2xl mx-auto">
              We connect skilled remote agents with real job opportunities — assessed, qualified, and ready to work.
            </motion.p>
          </motion.div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-3xl mx-auto">
            {WHY_US.map((item) => {
              const Icon = item.icon;
              return (
                <motion.div key={item.title} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}
                  className="rounded-xl border bg-white p-6 text-center hover:shadow-lg transition-shadow">
                  <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[#16A34A]/10">
                    <Icon className="h-6 w-6 text-[#16A34A]" />
                  </div>
                  <h3 className="text-base font-semibold">{item.title}</h3>
                  <p className="mt-2 text-sm text-gray-500 leading-relaxed">{item.description}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="navy-gradient py-20 sm:py-28">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Ready to Get Started?
          </h2>
          <p className="mt-4 text-lg text-white/60">
            Browse our open positions and apply with a quick assessment.
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
