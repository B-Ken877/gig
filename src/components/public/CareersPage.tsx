'use client';

import { motion } from 'framer-motion';
import {
  Globe, DollarSign, TrendingUp, GraduationCap, Clock,
  CheckCircle2, ArrowRight, UserCheck, Shield, Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/lib/store';

const fadeUp = { hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0 } };
const stagger = { visible: { transition: { staggerChildren: 0.1 } } };

const REQUIREMENTS = [
  'Reliable high-speed internet (min 25 Mbps down, 10 Mbps up)',
  'Dedicated, quiet workspace free from distractions',
  'Modern computer (Intel i5/AMD Ryzen 5 or better, 8 GB RAM minimum)',
  'USB headset with noise-cancelling microphone',
  'Uninterruptible power supply (UPS) or backup generator',
  'Professional communication skills in English (additional languages a plus)',
  'Willingness to work flexible shifts including nights and weekends if needed',
  'Minimum high school diploma (associate or bachelor degree preferred)',
];

const BENEFITS = [
  { icon: Globe, title: 'Work From Home', description: 'Work from the comfort of your home in Haiti, Jamaica, Trinidad, or anywhere in the Caribbean. No commute, no relocation.' },
  { icon: DollarSign, title: 'Earn in USD', description: 'Get paid directly by the call centers you work with. Compensation is agreed upon between you and your employer.' },
  { icon: TrendingUp, title: 'Career Growth', description: 'Gain experience with international companies. Build your resume with real-world call center operations.' },
  { icon: GraduationCap, title: 'Learn & Grow', description: 'Access job postings from companies that provide training. Start in entry-level roles and advance to team lead positions.' },
  { icon: Clock, title: 'Flexible Hours', description: 'Choose opportunities that match your schedule. Full-time, part-time, and shift-based roles available.' },
];

const ROLES = [
  { title: 'Customer Support Agent', desc: 'Handle inbound customer inquiries for global companies. Training often provided by the employer.' },
  { title: 'Technical Support Specialist', desc: 'Provide Level 1 IT troubleshooting for technology clients. Strong computer skills required.' },
  { title: 'Live Chat Agent', desc: 'Manage real-time chat support for e-commerce and SaaS platforms. Fast typing and multi-tasking skills.' },
  { title: 'Sales Agent', desc: 'Outbound calling, lead generation, and closing deals for B2B and B2C campaigns.' },
  { title: 'Appointment Setter', desc: 'Qualify prospects and schedule meetings for sales teams. Strong communication and persuasion skills.' },
  { title: 'Email Support Agent', desc: 'Manage professional email responses, ticket routing, and customer follow-ups for high-volume operations.' },
  { title: 'Virtual Assistant', desc: 'Provide administrative support, scheduling, data entry, and communication management for executives and teams.' },
  { title: 'Bilingual Agent', desc: 'Serve customers in English, French, Spanish, or Creole. Bilingual agents are in high demand and command higher rates.' },
];

export default function CareersPage() {
  const { navigateTo } = useAppStore();

  return (
    <main className="min-h-screen">
      {/* Hero */}
      <section className="relative overflow-hidden bg-[#0B1A2E] text-white">
        <div className="absolute inset-0 opacity-20 bg-[url('/images/hero-careers.png')] bg-cover bg-center" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0B1A2E] via-[#0B1A2E]/90 to-transparent" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-24 sm:py-28">
          <motion.div initial="hidden" animate="visible" variants={stagger} className="max-w-3xl">
            <motion.span variants={fadeUp} transition={{ duration: 0.5 }}
              className="mb-4 inline-block rounded-full bg-[#16A34A]/20 px-4 py-1.5 text-xs font-semibold tracking-wider uppercase text-[#16A34A]">
              Join Our Platform
            </motion.span>
            <motion.h1 variants={fadeUp} transition={{ duration: 0.5 }}
              className="text-4xl font-bold tracking-tight sm:text-5xl">
              Your Remote Career <span className="text-[#16A34A]">Starts Here</span>
            </motion.h1>
            <motion.p variants={fadeUp} transition={{ duration: 0.5 }}
              className="mt-6 max-w-2xl text-lg leading-relaxed text-white/70">
              Register as an agent on Gig Solutions and get discovered by call centers across the Caribbean and beyond.
              No lengthy screening. No assessments. Just sign up, build your profile, and start connecting.
            </motion.p>
            <motion.div variants={fadeUp} transition={{ duration: 0.5 }} className="mt-8">
              <Button size="lg" className="bg-[#16A34A] text-white hover:bg-[#16A34A]/90"
                onClick={() => navigateTo('register-agent')}>
                Register Now — Free <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* How It Works for Agents */}
      <section className="py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="text-center mb-16">
            <motion.span variants={fadeUp} className="mb-3 inline-block text-xs font-semibold tracking-wider uppercase text-[#16A34A]">Getting Started</motion.span>
            <motion.h2 variants={fadeUp} className="text-3xl font-bold tracking-tight sm:text-4xl">
              Three Steps to <span className="text-[#16A34A]">Get Started</span>
            </motion.h2>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { step: '1', icon: UserCheck, title: 'Register & Pay', desc: 'Create your account for free. Pay 1,000 HTG / quarter only when you apply for a job. The admin will guide you through the payment via chat.' },
              { step: '2', icon: GraduationCap, title: 'Build Your Profile', desc: 'Add your skills, languages, experience level, and preferred shift. The more detailed your profile, the more discoverable you are to call centers.' },
              { step: '3', icon: Zap, title: 'Get Discovered', desc: 'Call centers browse the agent bank and message you directly. Respond, discuss the opportunity, and if it is a fit — you are hired.' },
            ].map(item => {
              const Icon = item.icon;
              return (
                <motion.div key={item.step} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}
                  className="relative text-center p-8 rounded-2xl border bg-white hover:shadow-xl transition-shadow">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#16A34A]/10">
                    <Icon className="h-8 w-8 text-[#16A34A]" />
                  </div>
                  <span className="absolute top-4 right-6 text-5xl font-black text-gray-100">{item.step}</span>
                  <h3 className="text-lg font-semibold">{item.title}</h3>
                  <p className="mt-2 text-sm text-gray-500 leading-relaxed">{item.desc}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Available Roles */}
      <section className="bg-gray-50 py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="text-center mb-16">
            <motion.span variants={fadeUp} className="mb-3 inline-block text-xs font-semibold tracking-wider uppercase text-[#16A34A]">Opportunities</motion.span>
            <motion.h2 variants={fadeUp} className="text-3xl font-bold tracking-tight sm:text-4xl">
              Roles That Are <span className="text-[#16A34A]">In Demand</span>
            </motion.h2>
            <motion.p variants={fadeUp} className="mt-4 text-gray-500 max-w-2xl mx-auto">
              Call centers on our platform are actively looking for agents in these categories.
            </motion.p>
          </motion.div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {ROLES.map(r => (
              <motion.div key={r.title} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}
                className="rounded-xl border bg-white p-5 hover:shadow-lg transition-shadow">
                <h3 className="text-sm font-semibold">{r.title}</h3>
                <p className="mt-1 text-xs text-gray-500 leading-relaxed">{r.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Requirements */}
      <section className="py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
            <div>
              <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}>
                <motion.span variants={fadeUp} className="mb-3 inline-block text-xs font-semibold tracking-wider uppercase text-[#16A34A]">Requirements</motion.span>
                <motion.h2 variants={fadeUp} className="text-3xl font-bold tracking-tight sm:text-4xl">
                  What You Need to <span className="text-[#16A34A]">Get Started</span>
                </motion.h2>
                <motion.p variants={fadeUp} className="mt-4 text-gray-600 leading-relaxed">
                  To succeed as a remote agent, you will need a proper home office setup and professional communication skills.
                  Here is what call centers expect:
                </motion.p>
              </motion.div>
              <ul className="mt-8 space-y-3">
                {REQUIREMENTS.map(r => (
                  <li key={r} className="flex items-start gap-3 text-sm text-gray-700">
                    <CheckCircle2 className="h-5 w-5 text-[#16A34A] shrink-0 mt-0.5" />
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="space-y-4">
              {BENEFITS.map(b => {
                const Icon = b.icon;
                return (
                  <motion.div key={b.title} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}
                    className="rounded-xl border bg-white p-5 flex items-start gap-4 hover:shadow-md transition-shadow">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#16A34A]/10">
                      <Icon className="h-5 w-5 text-[#16A34A]" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold">{b.title}</h3>
                      <p className="mt-1 text-xs text-gray-500 leading-relaxed">{b.description}</p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="navy-gradient py-20 sm:py-28">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Ready to Start Your Remote Career?
          </h2>
          <p className="mt-4 text-lg text-white/60">
            Join the platform for free. Pay 1,000 HTG / quarter only when you apply for a job. Get discovered by call centers hiring now.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Button size="lg" className="bg-[#16A34A] text-white hover:bg-[#16A34A]/90"
              onClick={() => navigateTo('register-agent')}>
              Register as Agent <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button size="lg" variant="outline" className="border-white/30 bg-transparent text-white hover:bg-white/10 hover:text-white"
              onClick={() => navigateTo('contact')}>
              Have Questions?
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}
