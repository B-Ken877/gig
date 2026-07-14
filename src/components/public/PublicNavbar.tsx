'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Menu, X, LogOut, LayoutDashboard, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger,
} from '@/components/ui/sheet';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAppStore } from '@/lib/store';
import type { PageType, UserRole } from '@/lib/types';

const NAV_LINKS: { label: string; page: PageType }[] = [
  { label: 'Home', page: 'home' },
  { label: 'Services', page: 'services' },
  { label: 'For Clients', page: 'for-clients' },
  { label: 'Careers', page: 'careers' },
  { label: 'About', page: 'about' },
  { label: 'Contact', page: 'contact' },
];

// BUG FIX: Removed recruiter/ops entries, fixed admin mapping
const ROLE_DASHBOARD: Partial<Record<UserRole, PageType>> = {
  agent: 'agent-dashboard',
  client: 'client-dashboard',
  payment_taker: 'payment-taker-dashboard',
  admin: 'admin-dashboard',
};

export default function PublicNavbar() {
  const { currentPage, navigateTo, isAuthenticated, currentUser, logout } = useAppStore();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleNav = (page: PageType) => {
    navigateTo(page);
    setMobileOpen(false);
  };

  const handleLogout = () => {
    logout();
    setMobileOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-[#16A34A20]">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8" style={{ backgroundColor: '#0B1A2E' }}>
        {/* Logo */}
        <button onClick={() => handleNav('home')} className="transition-enterprise flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg green-gradient">
            <span className="text-sm font-bold" style={{ color: '#0B1A2E' }}>GS</span>
          </div>
          <span className="text-xl font-semibold tracking-[0.02em]" style={{ fontFamily: 'var(--font-playfair), Georgia, serif' }}>
            <span style={{ color: '#FFFFFF' }}>Gig </span>
            <span style={{ color: '#16A34A' }}>Solutions</span>
          </span>
        </button>

        {/* Desktop nav links */}
        <nav className="hidden items-center gap-1 lg:flex">
          {NAV_LINKS.map((link) => {
            const isActive = currentPage === link.page;
            return (
              <button key={link.page} onClick={() => handleNav(link.page)}
                className="transition-enterprise relative px-3 py-2 text-sm font-medium"
                style={{ color: isActive ? '#16A34A' : 'rgba(255,255,255,0.8)' }}>
                {link.label}
                {isActive && (
                  <motion.div layoutId="navbar-indicator" className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full"
                    style={{ backgroundColor: '#16A34A' }} transition={{ type: 'spring', stiffness: 380, damping: 30 }} />
                )}
              </button>
            );
          })}
        </nav>

        {/* Right side */}
        <div className="hidden items-center gap-3 lg:flex">
          {isAuthenticated && currentUser ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="gap-2 text-white/80 hover:text-white hover:bg-white/10">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full green-gradient text-xs font-bold text-[#0B1A2E]">
                    {currentUser.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="max-w-[120px] truncate text-sm">{currentUser.name}</span>
                  <ChevronDown className="size-3.5 opacity-60" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-2 py-1.5">
                  <p className="text-sm font-medium">{currentUser.name}</p>
                  <p className="text-xs text-muted-foreground">{currentUser.email}</p>
                  <p className="mt-1 text-xs font-medium capitalize" style={{ color: '#16A34A' }}>{currentUser.role.replace('_', ' ')}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleNav(ROLE_DASHBOARD[currentUser.role] || 'home')} className="cursor-pointer">
                  <LayoutDashboard className="mr-2 size-4" />Go to Dashboard
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-destructive focus:text-destructive">
                  <LogOut className="mr-2 size-4" />Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              <Button variant="outline" onClick={() => handleNav('login')}
                className="border-[#16A34A] bg-transparent text-[#16A34A] hover:bg-[#16A34A] hover:text-[#0B1A2E]">Login</Button>
              {/* BUG FIX: was navigateTo('register') which is a dead page */}
              <Button onClick={() => handleNav('register-agent')}
                className="green-gradient font-semibold text-[#0B1A2E] hover:opacity-90 border-0">Get Started</Button>
            </>
          )}
        </div>

        {/* Mobile hamburger */}
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild className="lg:hidden">
            <button className="inline-flex items-center justify-center rounded-md p-2 text-white/80 transition-enterprise hover:bg-white/10 hover:text-white" aria-label="Open menu">
              <Menu className="size-5" />
            </button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[320px] overflow-y-auto p-0" style={{ backgroundColor: '#0B1A2E', borderColor: '#16A34A20' }}>
            <SheetHeader className="border-b border-[#16A34A20] px-6 py-4">
              <SheetTitle className="flex items-center gap-2.5 text-left">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg green-gradient">
                  <span className="text-xs font-bold" style={{ color: '#0B1A2E' }}>GS</span>
                </div>
                <span className="text-lg font-semibold tracking-[0.02em]" style={{ fontFamily: 'var(--font-playfair), Georgia, serif' }}>
                  <span style={{ color: '#FFFFFF' }}>Gig </span><span style={{ color: '#16A34A' }}>Solutions</span>
                </span>
              </SheetTitle>
            </SheetHeader>
            <div className="flex flex-col px-4 py-4">
              {NAV_LINKS.map((link) => {
                const isActive = currentPage === link.page;
                return (
                  <button key={link.page} onClick={() => handleNav(link.page)}
                    className="transition-enterprise rounded-lg px-4 py-3 text-left text-sm font-medium"
                    style={{ color: isActive ? '#16A34A' : 'rgba(255,255,255,0.75)', backgroundColor: isActive ? 'rgba(22,163,74,0.1)' : 'transparent' }}>
                    {link.label}
                  </button>
                );
              })}
              <div className="my-3 h-px bg-[#16A34A20]" />
              {isAuthenticated && currentUser ? (
                <>
                  <button onClick={() => handleNav(ROLE_DASHBOARD[currentUser.role] || 'home')}
                    className="transition-enterprise rounded-lg px-4 py-3 text-left text-sm font-medium text-white/75 hover:bg-white/5">
                    <LayoutDashboard className="mr-2 inline size-4" />Go to Dashboard
                  </button>
                  <button onClick={handleLogout}
                    className="transition-enterprise rounded-lg px-4 py-3 text-left text-sm font-medium text-red-400 hover:bg-white/5">
                    <LogOut className="mr-2 inline size-4" />Sign Out
                  </button>
                </>
              ) : (
                <div className="flex flex-col gap-3 px-4">
                  <Button variant="outline" onClick={() => handleNav('login')}
                    className="w-full border-[#16A34A] bg-transparent text-[#16A34A] hover:bg-[#16A34A] hover:text-[#0B1A2E]">Login</Button>
                  <Button onClick={() => handleNav('register-agent')}
                    className="w-full green-gradient border-0 font-semibold text-[#0B1A2E] hover:opacity-90">Get Started</Button>
                </div>
              )}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}