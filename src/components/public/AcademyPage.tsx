'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ArrowRight,
  Lock,
  Star,
  Quote,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/lib/store';

/**
 * Gig Solutions Academy — landing page for the translation book guide.
 *
 * Ported from the standalone marketing page at medikahaiti.site/gig
 * (a static HTML/CSS page). Adapted to React + Tailwind + the gig-solutions
 * component library. The "GS" initials logo block from the original is
 * replaced with the actual gig-solutions logo image (/logo-wide.png).
 *
 * The page sells a $5 sample chapter of "The Translator's Blueprint"
 * — a book that teaches call center agents how to transition into
 * professional translation. CTA opens a WhatsApp chat.
 */

const WHATSAPP_URL =
  'https://wa.me/50947579322?text=' +
  encodeURIComponent(
    "Hello Gig Solutions Academy! I want to buy the sample chapter for $5.",
  );

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0 },
};
const stagger = {
  visible: { transition: { staggerChildren: 0.12 } },
};

const HERO_STATS = [
  { num: '500+', label: 'Pages of Content' },
  { num: '10+', label: 'Specializations' },
  { num: '97%', label: 'Reader Satisfaction' },
];

const PROBLEMS = [
  {
    icon: '😰',
    bg: 'bg-red-50',
    title: 'Stuck in a Dead-End Cycle',
    body: 'Long hours, repetitive tasks, and limited growth. You know you’re capable of more, but the path forward feels unclear and overwhelming.',
  },
  {
    icon: '❓',
    bg: 'bg-amber-50',
    title: 'No Clear Roadmap',
    body: 'There’s plenty of generic advice online, but nothing specifically designed for call center professionals who want to become translators. Until now.',
  },
  {
    icon: '💸',
    bg: 'bg-indigo-50',
    title: 'Leaving Money on the Table',
    body: 'Professional translators earn 2–5x more than call center agents. Every month you wait is thousands of dollars in lost earning potential.',
  },
];

const BOOK_FEATURES = [
  'Real strategies used by former call center agents who now earn $50K+ as translators',
  'Industry-specific vocabulary sheets and glossaries for 10+ specializations',
  'Step-by-step guide to building your portfolio with zero experience',
  'Insider tips on passing certification exams on your first attempt',
  'How to find and land high-paying clients from day one',
];

const TESTIMONIALS = [
  {
    stars: 5,
    text: 'I worked in a call center for 4 years and felt stuck. This book showed me I already had the skills — I just needed the roadmap. 3 months later, I’m earning double as a freelance translator.',
    name: 'Marie C.',
    role: 'Former Call Center Agent → Professional Translator',
    avatar: 'M',
  },
  {
    stars: 5,
    text: 'The chapter on certifications alone was worth 100x the price. I passed my ATA exam on the first try using the strategies in this book. Life-changing resource.',
    name: 'Jean-Pierre R.',
    role: 'Bilingual Agent → Certified Legal Translator',
    avatar: 'J',
  },
  {
    stars: 5,
    text: 'What sets this apart is it’s written FOR call center people. Every example, every strategy feels like it was written by someone who actually sat in our chairs. Highly practical.',
    name: 'Sophia L.',
    role: 'Customer Service Rep → Medical Interpreter',
    avatar: 'S',
  },
];

const PRICING_FEATURES = [
  'Full sample chapter (50+ pages)',
  'Translation skills self-assessment quiz',
  'Industry salary comparison guide',
  '5-day email crash course included',
  'Exclusive discount on the full book',
];

const FAQS = [
  {
    q: 'Who is this book for?',
    a: 'This book is specifically written for current and former call center agents who speak multiple languages and want to transition into professional translation. Whether you’re a bilingual agent, a customer service rep, or a technical support specialist — if you handle multilingual communication, this book is for you.',
  },
  {
    q: 'What’s included in the $5 sample?',
    a: 'The $5 sample includes a complete 50+ page chapter, a translation skills self-assessment quiz, an industry salary comparison guide, and enrollment in our 5-day email crash course. You’ll also get an exclusive discount code for the full book.',
  },
  {
    q: 'Do I need a degree in translation?',
    a: 'Absolutely not. Many successful translators come from non-traditional backgrounds. Your call center experience gives you a massive head start. This book shows you how to leverage what you already know and fill in the gaps efficiently.',
  },
  {
    q: 'How is this different from free online resources?',
    a: 'Free resources are scattered, generic, and not tailored to call center professionals. This book is a complete, structured system that takes you from A to Z. Every strategy, every example, every template is designed specifically for your background and career path.',
  },
  {
    q: 'Is there a money-back guarantee?',
    a: 'Yes! We offer a 30-day no-questions-asked money-back guarantee. If you don’t find the sample chapter valuable, just email us and we’ll refund every penny. Zero risk.',
  },
];

export default function AcademyPage() {
  const { navigateTo } = useAppStore();
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  // Smooth-scroll to hash targets (the original page used anchor links).
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const hash = window.location.hash.replace('#academy', '').replace('#', '');
    if (!hash) return;
    const el = document.getElementById(hash);
    if (el) {
      // Defer until after paint
      requestAnimationFrame(() => el.scrollIntoView({ behavior: 'smooth' }));
    }
  }, []);

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="bg-white text-[#0B1D3A]">
      {/* ── HERO ── */}
      <section
        className="relative overflow-hidden pt-16 pb-20 px-4 sm:px-6"
        style={{
          background:
            'linear-gradient(135deg, #060F1F 0%, #0B1D3A 50%, #132D5E 100%)',
        }}
      >
        {/* Decorative radial glow */}
        <div
          className="absolute pointer-events-none"
          style={{
            top: '-50%',
            right: '-20%',
            width: '800px',
            height: '800px',
            background:
              'radial-gradient(circle, rgba(22,163,74,0.12) 0%, transparent 70%)',
          }}
        />
        {/* Bottom fade to white */}
        <div
          className="absolute bottom-0 left-0 right-0 h-32 pointer-events-none"
          style={{
            background: 'linear-gradient(to top, #ffffff, transparent)',
          }}
        />

        <div className="relative z-10 max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
          <motion.div initial="hidden" animate="visible" variants={stagger}>
            <motion.span
              variants={fadeUp}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 bg-[#16A34A]/15 border border-[#16A34A]/30 text-[#22C55E] px-4 py-1.5 rounded-full text-xs font-semibold mb-6"
            >
              <span className="w-1.5 h-1.5 bg-[#22C55E] rounded-full animate-pulse" />
              New Release — 2026 Edition
            </motion.span>

            <motion.h1
              variants={fadeUp}
              transition={{ duration: 0.5 }}
              className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white leading-tight mb-6"
              style={{ fontFamily: '"Playfair Display", serif' }}
            >
              Turn Your Call Center Experience Into a{' '}
              <em className="not-italic text-[#22C55E]">
                Thriving Translation Career
              </em>
            </motion.h1>

            <motion.p
              variants={fadeUp}
              transition={{ duration: 0.5 }}
              className="text-lg text-white/70 leading-relaxed mb-8 max-w-xl"
            >
              You already have the communication skills. You already handle
              multilingual conversations daily. This book shows you exactly how
              to pivot into professional translation — and earn more doing
              what you already do best.
            </motion.p>

            <motion.div
              variants={fadeUp}
              transition={{ duration: 0.5 }}
              className="flex flex-wrap gap-4"
            >
              <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer">
                <Button
                  size="lg"
                  className="bg-[#16A34A] hover:bg-[#0F7B35] text-white font-bold px-8 py-6 text-base shadow-lg shadow-[#16A34A]/40 rounded-xl transition-transform hover:-translate-y-0.5"
                >
                  <BookOpen className="h-5 w-5" />
                  Get Sample — $5
                </Button>
              </a>
              <Button
                size="lg"
                variant="outline"
                onClick={() => scrollTo('book')}
                className="border-2 border-white/25 bg-transparent text-white hover:bg-white/5 hover:border-white/50 font-bold px-8 py-6 text-base rounded-xl"
              >
                Learn More <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </motion.div>

            <motion.div
              variants={fadeUp}
              transition={{ duration: 0.5 }}
              className="flex flex-wrap gap-10 mt-12 pt-8 border-t border-white/10"
            >
              {HERO_STATS.map((s) => (
                <div key={s.label}>
                  <div className="text-3xl font-extrabold text-[#22C55E]">
                    {s.num}
                  </div>
                  <div className="text-xs text-white/50 mt-1 uppercase tracking-widest">
                    {s.label}
                  </div>
                </div>
              ))}
            </motion.div>
          </motion.div>

          {/* Hero image */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7 }}
            className="relative"
          >
            <img
              src="https://sfile.chatglm.cn/images-ppt/e9a5a9544eaf.jpeg"
              alt="Professional call center agent working at a modern desk"
              className="w-full rounded-2xl shadow-2xl"
              style={{ aspectRatio: '4 / 3', objectFit: 'cover' }}
            />
            {/* Floating badge */}
            <div className="absolute -bottom-6 -left-6 bg-white rounded-xl shadow-xl p-4 flex items-center gap-3 z-10 max-w-xs">
              <div className="w-12 h-12 rounded-lg bg-[#16A34A]/10 flex items-center justify-center text-2xl">
                📘
              </div>
              <div>
                <strong className="block text-sm text-[#0B1D3A]">
                  Your Career Shift Starts Here
                </strong>
                <span className="text-xs text-gray-500">
                  From agent to certified translator
                </span>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── PROBLEM ── */}
      <section id="problem" className="py-20 sm:py-28 bg-gray-50 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto text-center">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
          >
            <motion.span
              variants={fadeUp}
              className="inline-flex items-center gap-2 text-[#16A34A] text-xs font-bold uppercase tracking-widest mb-4"
            >
              <span className="w-6 h-0.5 bg-[#16A34A]" />
              The Reality
            </motion.span>
            <motion.h2
              variants={fadeUp}
              className="text-3xl sm:text-4xl font-extrabold text-[#0B1D3A] mb-5 leading-tight"
              style={{ fontFamily: '"Playfair Display", serif' }}
            >
              You’re Closer Than You Think —
              <br />
              But Something’s Holding You Back
            </motion.h2>
            <motion.p
              variants={fadeUp}
              className="text-lg text-gray-500 max-w-2xl mx-auto mb-14"
            >
              Call center agents already possess 80% of the skills needed to
              become professional translators. Here’s what’s missing.
            </motion.p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {PROBLEMS.map((p, i) => (
              <motion.div
                key={p.title}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={stagger}
                className="bg-white rounded-xl p-9 border border-gray-200 transition-all hover:-translate-y-1 hover:shadow-xl text-left"
              >
                <motion.div
                  variants={fadeUp}
                  className={`w-14 h-14 rounded-xl flex items-center justify-center text-3xl mb-5 ${p.bg}`}
                >
                  {p.icon}
                </motion.div>
                <motion.h3
                  variants={fadeUp}
                  className="text-lg font-bold text-[#0B1D3A] mb-3"
                >
                  {p.title}
                </motion.h3>
                <motion.p
                  variants={fadeUp}
                  className="text-sm text-gray-500 leading-relaxed"
                >
                  {p.body}
                </motion.p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── BOOK ── */}
      <section id="book" className="py-20 sm:py-28 px-4 sm:px-6 bg-white">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
          {/* Book cover */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="flex justify-center"
          >
            <img
              src="/academy-book-cover.jpg"
              alt="The Translator’s Blueprint — Gig Solutions Academy book cover"
              className="w-4/5 max-w-xs rounded-xl shadow-2xl transition-transform hover:scale-105"
            />
          </motion.div>

          {/* Book details */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
          >
            <motion.span
              variants={fadeUp}
              className="inline-flex items-center gap-2 text-[#16A34A] text-xs font-bold uppercase tracking-widest mb-4"
            >
              <span className="w-6 h-0.5 bg-[#16A34A]" />
              The Book
            </motion.span>
            <motion.h2
              variants={fadeUp}
              className="text-3xl sm:text-4xl font-extrabold text-[#0B1D3A] mb-5 leading-tight"
              style={{ fontFamily: '"Playfair Display", serif' }}
            >
              The Translator’s Blueprint: From Call Center to Global
              Professional
            </motion.h2>
            <motion.p
              variants={fadeUp}
              className="text-lg text-gray-500 mb-8 leading-relaxed"
            >
              A comprehensive, no-fluff guide written specifically for call
              center agents who are ready to transform their careers. This
              isn’t theory — it’s a step-by-step system.
            </motion.p>

            <motion.ul
              variants={fadeUp}
              className="space-y-4 mb-8"
            >
              {BOOK_FEATURES.map((f) => (
                <li
                  key={f}
                  className="flex items-start gap-3 text-sm text-gray-600 leading-relaxed"
                >
                  <span className="flex-shrink-0 w-7 h-7 rounded-full bg-[#16A34A]/10 flex items-center justify-center mt-0.5">
                    <CheckCircle2 className="h-4 w-4 text-[#16A34A]" />
                  </span>
                  {f}
                </li>
              ))}
            </motion.ul>

            <motion.div variants={fadeUp}>
              <a
                href={WHATSAPP_URL}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button className="bg-[#16A34A] hover:bg-[#0F7B35] text-white font-bold px-8 py-6 text-base shadow-lg shadow-[#16A34A]/35 rounded-xl">
                  Get Your Sample Chapter — $5
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </a>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section id="testimonials" className="py-20 sm:py-28 bg-gray-50 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto text-center">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
          >
            <motion.span
              variants={fadeUp}
              className="inline-flex items-center gap-2 text-[#16A34A] text-xs font-bold uppercase tracking-widest mb-4"
            >
              <span className="w-6 h-0.5 bg-[#16A34A]" />
              Success Stories
            </motion.span>
            <motion.h2
              variants={fadeUp}
              className="text-3xl sm:text-4xl font-extrabold text-[#0B1D3A] mb-5"
              style={{ fontFamily: '"Playfair Display", serif' }}
            >
              Real People. Real Results.
            </motion.h2>
            <motion.p
              variants={fadeUp}
              className="text-lg text-gray-500 max-w-2xl mx-auto mb-14"
            >
              Call center professionals who made the leap — and never
              looked back.
            </motion.p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-7">
            {TESTIMONIALS.map((t, i) => (
              <motion.div
                key={t.name}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={stagger}
                className="bg-white rounded-xl p-8 border border-gray-200 relative text-left"
              >
                <Quote className="absolute top-5 right-6 h-12 w-12 text-[#16A34A]/15" />
                <div className="flex items-center gap-1 text-[#F59E0B] mb-4 tracking-widest">
                  {Array.from({ length: t.stars }).map((_, idx) => (
                    <Star key={idx} className="h-4 w-4 fill-current" />
                  ))}
                </div>
                <p className="text-sm text-gray-600 italic leading-relaxed mb-5">
                  &ldquo;{t.text}&rdquo;
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[#0B1D3A] to-[#132D5E] text-white flex items-center justify-center font-bold">
                    {t.avatar}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-[#0B1D3A]">
                      {t.name}
                    </div>
                    <div className="text-xs text-gray-400">{t.role}</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section id="pricing" className="py-20 sm:py-28 px-4 sm:px-6 bg-white">
        <div className="max-w-2xl mx-auto text-center">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
          >
            <motion.span
              variants={fadeUp}
              className="inline-flex items-center gap-2 text-[#16A34A] text-xs font-bold uppercase tracking-widest mb-4"
            >
              <span className="w-6 h-0.5 bg-[#16A34A]" />
              Get Started Today
            </motion.span>
            <motion.h2
              variants={fadeUp}
              className="text-3xl sm:text-4xl font-extrabold text-[#0B1D3A] mb-5"
              style={{ fontFamily: '"Playfair Display", serif' }}
            >
              Your Future Self Will Thank You
            </motion.h2>
            <motion.p
              variants={fadeUp}
              className="text-lg text-gray-500 mb-14"
            >
              For the price of a coffee, get a full sample chapter and see why
              hundreds of call center professionals are making the switch.
            </motion.p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="relative bg-white border-2 border-gray-200 rounded-3xl p-10 sm:p-12 text-left overflow-hidden transition-all hover:-translate-y-1 hover:shadow-2xl"
          >
            {/* Best Value ribbon */}
            <div className="absolute top-6 -right-10 bg-[#16A34A] text-white text-xs font-bold px-10 py-1.5 transform rotate-45 uppercase tracking-widest">
              Best Value
            </div>

            <div className="text-center mb-6">
              <div className="text-xs font-bold text-[#16A34A] uppercase tracking-widest mb-4">
                Sample Chapter
              </div>
              <div className="text-6xl font-extrabold text-[#0B1D3A] leading-none">
                <sup className="text-2xl align-super font-bold">$</sup>5
                <span className="text-xl text-gray-400 font-medium ml-1">
                  .00 USD
                </span>
              </div>
              <p className="text-sm text-gray-500 mt-4 leading-relaxed">
                Get instant access to a complete sample chapter plus exclusive
                bonus materials to kickstart your translation career.
              </p>
            </div>

            <ul className="space-y-3 mb-8">
              {PRICING_FEATURES.map((f) => (
                <li
                  key={f}
                  className="flex items-center gap-3 text-sm text-gray-600"
                >
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#16A34A]/10 flex items-center justify-center">
                    <CheckCircle2 className="h-3.5 w-3.5 text-[#16A34A]" />
                  </span>
                  {f}
                </li>
              ))}
            </ul>

            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="block"
            >
              <Button className="w-full bg-[#16A34A] hover:bg-[#0F7B35] text-white font-bold py-5 text-base shadow-lg shadow-[#16A34A]/35 rounded-xl">
                <CheckCircle2 className="h-5 w-5" />
                Buy Now — $5.00
              </Button>
            </a>

            <p className="text-center mt-5 text-xs text-gray-400 flex items-center justify-center gap-1.5">
              <Lock className="h-3 w-3" />
              Secure payment · Instant delivery · 30-day money back
              guarantee
            </p>
          </motion.div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section id="faq" className="py-20 sm:py-28 bg-gray-50 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
          >
            <motion.span
              variants={fadeUp}
              className="inline-flex items-center gap-2 text-[#16A34A] text-xs font-bold uppercase tracking-widest mb-4"
            >
              <span className="w-6 h-0.5 bg-[#16A34A]" />
              FAQ
            </motion.span>
            <motion.h2
              variants={fadeUp}
              className="text-3xl sm:text-4xl font-extrabold text-[#0B1D3A] mb-12"
              style={{ fontFamily: '"Playfair Display", serif' }}
            >
              Got Questions?
            </motion.h2>
          </motion.div>

          <div className="flex flex-col gap-4 text-left">
            {FAQS.map((item, i) => {
              const isOpen = openFaq === i;
              return (
                <div
                  key={i}
                  className="bg-white rounded-xl border border-gray-200 overflow-hidden"
                >
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : i)}
                    className="w-full px-7 py-5 text-left flex items-center justify-between gap-4 font-semibold text-[#0B1D3A] hover:bg-gray-50 transition-colors"
                  >
                    <span>{item.q}</span>
                    <ChevronDown
                      className={`h-5 w-5 text-[#16A34A] flex-shrink-0 transition-transform ${
                        isOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </button>
                  <div
                    className="transition-all duration-300 ease-out"
                    style={{
                      maxHeight: isOpen ? '400px' : '0',
                      overflow: 'hidden',
                    }}
                  >
                    <div className="px-7 pb-5 text-sm text-gray-500 leading-relaxed">
                      {item.a}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section
        className="py-20 sm:py-28 px-4 sm:px-6 text-center relative overflow-hidden"
        style={{
          background:
            'linear-gradient(135deg, #060F1F 0%, #0B1D3A 50%, #132D5E 100%)',
        }}
      >
        <div
          className="absolute pointer-events-none"
          style={{
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '600px',
            height: '600px',
            background:
              'radial-gradient(circle, rgba(22,163,74,0.08) 0%, transparent 70%)',
          }}
        />
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={stagger}
          className="relative z-10 max-w-3xl mx-auto"
        >
          <motion.h2
            variants={fadeUp}
            className="text-3xl sm:text-4xl sm:text-5xl font-extrabold text-white mb-5"
            style={{ fontFamily: '"Playfair Display", serif' }}
          >
            Ready to Transform Your Career?
          </motion.h2>
          <motion.p
            variants={fadeUp}
            className="text-lg text-white/60 mb-10 max-w-2xl mx-auto"
          >
            Join 2,000+ call center professionals who are already building their
            translation career with Gig Solutions Academy.
          </motion.p>
          <motion.div variants={fadeUp}>
            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button className="bg-[#16A34A] hover:bg-[#0F7B35] text-white font-bold text-lg px-12 py-6 rounded-xl shadow-lg shadow-[#16A34A]/40">
                Get Your Sample for $5 — Start Today
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </a>
          </motion.div>
        </motion.div>
      </section>
    </div>
  );
}
