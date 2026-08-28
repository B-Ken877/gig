'use client';

import {
  Mail,
  MapPin,
  Facebook,
  Twitter,
  Linkedin,
  Instagram,
} from 'lucide-react';
import { useAppStore } from '@/lib/store';
import type { PageType } from '@/lib/types';

const QUICK_LINKS: { label: string; page: PageType }[] = [
  { label: 'Home', page: 'home' },
  { label: 'About Us', page: 'about' },
  { label: 'Services', page: 'services' },
  { label: 'Careers', page: 'careers' },
  { label: 'Contact', page: 'contact' },
];

const SERVICES_LIST = [
  'Customer Support',
  'Technical Support',
  'Sales & Lead Gen',
  'Live Chat Support',
  'Email Support',
  'Virtual Assistance',
  'Appointment Setting',
];

const SOCIAL_LINKS = [
  { icon: Facebook, href: '#', label: 'Facebook' },
  { icon: Twitter, href: '#', label: 'Twitter' },
  { icon: Linkedin, href: '#', label: 'LinkedIn' },
  { icon: Instagram, href: '#', label: 'Instagram' },
];

export default function PublicFooter() {
  const { navigateTo } = useAppStore();

  return (
    <footer
      className="border-t border-[#16A34A15]"
      style={{ backgroundColor: '#0B1A2E' }}
    >
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {/* Company Info */}
          <div className="sm:col-span-2 lg:col-span-1">
            <div className="mb-4 flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg green-gradient">
                <span
                  className="text-sm font-bold"
                  style={{ color: '#0B1A2E' }}
                >
                  GS
                </span>
              </div>
              <div className="flex flex-col items-start">
                <span className="text-[15px] font-bold tracking-wide text-white leading-tight">Gig</span>
                <span className="text-[15px] font-bold tracking-wide leading-tight" style={{ color: '#16A34A' }}>Solutions</span>
              </div>
            </div>
            <p className="mb-6 max-w-xs text-sm leading-relaxed text-white/60">
              The premier platform connecting skilled remote agents with
              job opportunities across the Caribbean and beyond. Browse
              jobs, pass a quick assessment, and start working from home.
            </p>
            <div className="flex gap-3">
              {SOCIAL_LINKS.map(({ icon: Icon, href, label }) => (
                <a
                  key={label}
                  href={href}
                  aria-label={label}
                  className="transition-enterprise flex h-9 w-9 items-center justify-center rounded-lg border border-[#16A34A25] text-white/50 hover:border-[#16A34A] hover:text-[#16A34A]"
                >
                  <Icon className="size-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4
              className="mb-4 text-sm font-semibold tracking-wider uppercase"
              style={{ color: '#16A34A' }}
            >
              Quick Links
            </h4>
            <ul className="space-y-2.5">
              {QUICK_LINKS.map((link) => (
                <li key={link.page}>
                  <button
                    onClick={() => navigateTo(link.page)}
                    className="transition-enterprise text-left text-sm text-white/60 hover:text-[#16A34A]"
                  >
                    {link.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Services */}
          <div>
            <h4
              className="mb-4 text-sm font-semibold tracking-wider uppercase"
              style={{ color: '#16A34A' }}
            >
              Services
            </h4>
            <ul className="space-y-2.5">
              {SERVICES_LIST.map((service) => (
                <li key={service}>
                  <button
                    onClick={() => navigateTo('services')}
                    className="transition-enterprise text-left text-sm text-white/60 hover:text-[#16A34A]"
                  >
                    {service}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h4
              className="mb-4 text-sm font-semibold tracking-wider uppercase"
              style={{ color: '#16A34A' }}
            >
              Contact Us
            </h4>
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <MapPin className="mt-0.5 size-4 shrink-0 text-[#16A34A]" />
                <span className="text-sm text-white/60">
                  Petion-ville,
                  <br />
                  Port-au-Prince, Haiti
                </span>
              </li>
              <li className="flex items-center gap-3">
                <Mail className="size-4 shrink-0 text-[#16A34A]" />
                <a
                  href="mailto:contact.gigsolutions@gmail.com"
                  className="transition-enterprise text-sm text-white/60 hover:text-[#16A34A]"
                >
                  contact.gigsolutions@gmail.com
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 border-t border-[#16A34A15] pt-8">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <p className="text-xs text-white/40">
              &copy; {new Date().getFullYear()} Gig Solutions. All rights
              reserved.
            </p>
            <p className="text-xs text-white/40">
              Powered by{' '}
              <span className="text-[#16A34A]">Gig Solutions</span>
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
