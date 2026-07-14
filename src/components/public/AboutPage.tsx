'use client';

import { motion } from 'framer-motion';
import { Target, Heart, Lightbulb, Shield, Users, Globe, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/lib/store';

const fadeUp = { hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0 } };
const stagger = { visible: { transition: { staggerChildren: 0.12 } } };

const LEADERS = [
  {
    name: 'Marc-Andre Duvall',
    title: 'Founder & CEO',
    image: '/images/leader-ceo.png',
    bio: 'A Haitian-American entrepreneur with 15+ years in BPO operations. Marc-Andre founded Gig Solutions to give Caribbean talent direct access to global call center opportunities — without the traditional gatekeepers.',
  },
  {
    name: 'Alicia Chen',
    title: 'Chief Operations Officer',
    image: '/images/leader-coo.png',
    bio: 'Former VP of Operations at a leading Jamaican BPO. Alicia oversees platform operations, agent relations, and ensures every user has a seamless experience.',
  },
  {
    name: 'David Okafor',
    title: 'Head of Growth',
    image: '/images/leader-recruiter.png',
    bio: 'With a decade of experience across West Africa and the Caribbean, David leads our growth efforts — bringing new call centers and agents onto the platform.',
  },
  {
    name: 'Sofia Ramirez',
    title: 'Head of Client Success',
    image: '/images/leader-clientsuccess.png',
    bio: 'Sofia ensures every call center on the platform finds the talent they need. She manages partner relationships from onboarding through ongoing support.',
  },
];

const VALUES = [
  { icon: Target, title: 'Simplicity', description: 'No complicated processes. Register, pay, build your profile, and connect. We keep it straightforward.' },
  { icon: Heart, title: 'People First', description: 'Every agent on this platform is a real person with real skills. We treat them with the respect they deserve.' },
  { icon: Lightbulb, title: 'Direct Connection', description: 'We believe the best hiring happens when call centers and agents talk directly. No intermediaries, no delays.' },
  { icon: Shield, title: 'Transparency', description: 'Flat pricing, clear terms, and honest communication. What you see is what you get.' },
];

const MILESTONES = [
  { year: '2023', event: 'Gig Solutions founded in Port-au-Prince, Haiti' },
  { year: '2024', event: 'Expanded to Jamaica, Trinidad, and the Dominican Republic' },
  { year: '2024', event: 'Launched the agent marketplace and call center portal' },
  { year: '2025', event: '200+ agents and 30+ call center partners across 5 countries' },
];

export default function AboutPage() {
  const { navigateTo } = useAppStore();

  return (
    <main className="min-h-screen">
      {/* Hero */}
      <section className="relative overflow-hidden bg-[#0B1A2E] text-white">
        <div className="absolute inset-0 opacity-20 bg-[url('/images/hero-about.png')] bg-cover bg-center" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0B1A2E] via-[#0B1A2E]/90 to-transparent" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-24 sm:py-28">
          <motion.div initial="hidden" animate="visible" variants={stagger} className="max-w-3xl">
            <motion.span variants={fadeUp} transition={{ duration: 0.5 }}
              className="mb-4 inline-block rounded-full bg-[#16A34A]/20 px-4 py-1.5 text-xs font-semibold tracking-wider uppercase text-[#16A34A]">
              About Us
            </motion.span>
            <motion.h1 variants={fadeUp} transition={{ duration: 0.5 }}
              className="text-4xl font-bold tracking-tight sm:text-5xl">
              Connecting Caribbean Talent <span className="text-[#16A34A]">With Opportunity</span>
            </motion.h1>
            <motion.p variants={fadeUp} transition={{ duration: 0.5 }}
              className="mt-6 max-w-2xl text-lg leading-relaxed text-white/70">
              Gig Solutions is a marketplace platform that connects skilled remote agents in the Caribbean and beyond with call centers that need them.
              We are not a staffing agency — we are the bridge between talent and opportunity.
            </motion.p>
          </motion.div>
        </div>
      </section>

      {/* Mission */}
      <section className="py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}>
              <motion.span variants={fadeUp} className="mb-3 inline-block text-xs font-semibold tracking-wider uppercase text-[#16A34A]">Our Mission</motion.span>
              <motion.h2 variants={fadeUp} className="text-3xl font-bold tracking-tight sm:text-4xl">
                Making Remote Work <span className="text-[#16A34A]">Accessible</span>
              </motion.h2>
              <motion.p variants={fadeUp} className="mt-4 text-gray-600 leading-relaxed">
                The Caribbean is home to a talented, educated, and motivated workforce. Yet too many skilled professionals struggle to find legitimate remote opportunities with international companies.
              </motion.p>
              <motion.p variants={fadeUp} className="mt-4 text-gray-600 leading-relaxed">
                Gig Solutions changes that. We built a platform where agents create profiles showcasing their skills, languages, and experience — and where call centers can browse, filter, and connect with them directly. No recruiters, no placement fees, no waiting. Just a direct line between talent and the companies that need it.
              </motion.p>
              <motion.p variants={fadeUp} className="mt-4 text-gray-600 leading-relaxed">
                For call centers, we offer an affordable way to access a diverse talent pool across multiple countries and time zones. For agents, we offer visibility, opportunity, and the chance to build a career on their own terms.
              </motion.p>
            </motion.div>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }}
              className="rounded-2xl overflow-hidden shadow-2xl">
              <img src="/images/team-meeting.png" alt="Team collaboration" className="w-full h-96 object-cover" />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="bg-gray-50 py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="text-center mb-16">
            <motion.span variants={fadeUp} className="mb-3 inline-block text-xs font-semibold tracking-wider uppercase text-[#16A34A]">Our Values</motion.span>
            <motion.h2 variants={fadeUp} className="text-3xl font-bold tracking-tight sm:text-4xl">
              What We <span className="text-[#16A34A]">Stand For</span>
            </motion.h2>
          </motion.div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {VALUES.map(v => {
              const Icon = v.icon;
              return (
                <motion.div key={v.title} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}
                  className="rounded-xl border bg-white p-6 text-center hover:shadow-lg transition-shadow">
                  <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[#16A34A]/10">
                    <Icon className="h-6 w-6 text-[#16A34A]" />
                  </div>
                  <h3 className="text-base font-semibold">{v.title}</h3>
                  <p className="mt-2 text-sm text-gray-500 leading-relaxed">{v.description}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="text-center mb-16">
            <motion.span variants={fadeUp} className="mb-3 inline-block text-xs font-semibold tracking-wider uppercase text-[#16A34A]">Our Team</motion.span>
            <motion.h2 variants={fadeUp} className="text-3xl font-bold tracking-tight sm:text-4xl">
              The People Behind <span className="text-[#16A34A]">Gig Solutions</span>
            </motion.h2>
          </motion.div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {LEADERS.map(l => (
              <motion.div key={l.name} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}
                className="rounded-xl border bg-white overflow-hidden hover:shadow-lg transition-shadow group">
                <div className="h-56 overflow-hidden">
                  <img src={l.image} alt={l.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                </div>
                <div className="p-5">
                  <h3 className="text-base font-semibold">{l.name}</h3>
                  <p className="text-xs text-[#16A34A] font-medium">{l.title}</p>
                  <p className="mt-2 text-xs text-gray-500 leading-relaxed">{l.bio}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section className="bg-gray-50 py-20 sm:py-28">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="text-center mb-16">
            <motion.span variants={fadeUp} className="mb-3 inline-block text-xs font-semibold tracking-wider uppercase text-[#16A34A]">Our Journey</motion.span>
            <motion.h2 variants={fadeUp} className="text-3xl font-bold tracking-tight sm:text-4xl">
              Key <span className="text-[#16A34A]">Milestones</span>
            </motion.h2>
          </motion.div>
          <div className="space-y-6">
            {MILESTONES.map(m => (
              <motion.div key={m.year} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}
                className="flex items-start gap-6">
                <div className="shrink-0 w-20 text-right">
                  <span className="text-lg font-bold text-[#16A34A]">{m.year}</span>
                </div>
                <div className="shrink-0 w-px bg-[#16A34A]/20 self-stretch relative">
                  <div className="absolute -left-1.5 top-1 h-3 w-3 rounded-full bg-[#16A34A]" />
                </div>
                <p className="text-sm text-gray-700 pb-4">{m.event}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="navy-gradient py-20 sm:py-28">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Join the Gig Solutions Community
          </h2>
          <p className="mt-4 text-lg text-white/60">
            Whether you are an agent or a call center, there is a place for you here.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Button size="lg" className="bg-[#16A34A] text-white hover:bg-[#16A34A]/90"
              onClick={() => navigateTo('register-agent')}>
              Create Your Account <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}
