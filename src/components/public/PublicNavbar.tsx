'use client';
import { useState, useEffect } from 'react';
import { Menu, X, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/lib/store';
import type { PageType } from '@/lib/types';

const NAV_LINKS: { label: string; page: PageType }[] = [
  { label: 'Home', page: 'home' },
  { label: 'Careers', page: 'careers' },
  { label: 'Services', page: 'services' },
  { label: 'About', page: 'about' },
  { label: 'Contact', page: 'contact' },
];

export default function PublicNavbar() {
  const { currentPage, navigateTo, isAuthenticated, currentUser, logout } = useAppStore();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleNav = (page: PageType) => {
    navigateTo(page);
    setMobileOpen(false);
  };

  return (
    <header
      className={`sticky top-0 z-40 transition-all ${scrolled ? 'shadow-lg' : ''}`}
      style={{
        background: scrolled
          ? 'linear-gradient(to right, rgba(11,26,46,0.97), rgba(22,163,74,0.97))'
          : 'linear-gradient(to right, #0B1A2E, #16A34A)',
        backdropFilter: scrolled ? 'blur(8px)' : 'none',
      }}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <button onClick={() => handleNav('home')} className="flex items-center">
            <img src="/logo-wide.png" alt="Gig Solutions" className="h-9 w-auto" onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/logo-wide-40.png'; }} />
          </button>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map(link => (
              <button
                key={link.page}
                onClick={() => handleNav(link.page)}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  currentPage === link.page
                    ? 'bg-white/15 text-white'
                    : 'text-white/85 hover:text-white hover:bg-white/10'
                }`}
              >
                {link.label}
              </button>
            ))}
          </nav>

          {/* Desktop CTAs */}
          <div className="hidden md:flex items-center gap-2">
            {isAuthenticated && currentUser ? (
              <>
                <Button variant="ghost" size="sm" className="text-white hover:bg-white/15 hover:text-white" onClick={() => handleNav(currentUser.role === 'admin' ? 'admin-dashboard' : 'agent-dashboard')}>
                  Dashboard
                </Button>
                <Button size="sm" className="bg-white text-[#0B1A2E] hover:bg-white/90 font-semibold" onClick={logout}>
                  Sign Out
                </Button>
              </>
            ) : (
              <>
                <Button variant="ghost" size="sm" className="text-white hover:bg-white/15 hover:text-white" onClick={() => handleNav('login')}>Sign In</Button>
                <Button size="sm" className="bg-white text-[#0B1A2E] hover:bg-white/90 font-semibold" onClick={() => handleNav('register-agent')}>
                  Register Free <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                </Button>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <button className="md:hidden p-2 text-white" onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div
          className="md:hidden border-t border-white/15"
          style={{ background: 'linear-gradient(to right, #0B1A2E, #16A34A)' }}
        >
          <nav className="px-4 py-3 space-y-1">
            {NAV_LINKS.map(link => (
              <button
                key={link.page}
                onClick={() => handleNav(link.page)}
                className={`block w-full text-left px-3 py-2 rounded-md text-sm font-medium ${
                  currentPage === link.page ? 'bg-white/20 text-white' : 'text-white/85 hover:bg-white/10 hover:text-white'
                }`}
              >
                {link.label}
              </button>
            ))}
            <div className="pt-3 mt-3 border-t border-white/15 space-y-2">
              {isAuthenticated && currentUser ? (
                <>
                  <Button className="w-full bg-white text-[#0B1A2E] hover:bg-white/90 font-semibold" onClick={() => handleNav(currentUser.role === 'admin' ? 'admin-dashboard' : 'agent-dashboard')}>
                    Go to Dashboard
                  </Button>
                  <Button variant="ghost" className="w-full border border-white/40 text-white hover:bg-white/15 hover:text-white" onClick={() => { logout(); setMobileOpen(false); }}>Sign Out</Button>
                </>
              ) : (
                <>
                  <Button variant="ghost" className="w-full border border-white/40 text-white hover:bg-white/15 hover:text-white" onClick={() => handleNav('login')}>Sign In</Button>
                  <Button className="w-full bg-white text-[#0B1A2E] hover:bg-white/90 font-semibold" onClick={() => handleNav('register-agent')}>
                    Register Free <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                  </Button>
                </>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
