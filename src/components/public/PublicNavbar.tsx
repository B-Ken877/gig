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
    <header className={`sticky top-0 z-40 transition-all ${scrolled ? 'bg-white/95 backdrop-blur shadow-sm' : 'bg-white'}`}>
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
                    ? 'text-[#16A34A]'
                    : 'text-gray-700 hover:text-[#16A34A] hover:bg-gray-50'
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
                <Button variant="ghost" size="sm" onClick={() => handleNav(currentUser.role === 'admin' ? 'admin-dashboard' : 'agent-dashboard')}>
                  Dashboard
                </Button>
                <Button variant="outline" size="sm" onClick={logout}>Sign Out</Button>
              </>
            ) : (
              <>
                <Button variant="ghost" size="sm" onClick={() => handleNav('login')}>Sign In</Button>
                <Button size="sm" className="bg-[#16A34A] text-white hover:bg-[#16A34A]/90" onClick={() => handleNav('register-agent')}>
                  Register Free <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                </Button>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <button className="md:hidden p-2" onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="md:hidden border-t bg-white">
          <nav className="px-4 py-3 space-y-1">
            {NAV_LINKS.map(link => (
              <button
                key={link.page}
                onClick={() => handleNav(link.page)}
                className={`block w-full text-left px-3 py-2 rounded-md text-sm font-medium ${
                  currentPage === link.page ? 'bg-[#16A34A]/10 text-[#16A34A]' : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                {link.label}
              </button>
            ))}
            <div className="pt-3 mt-3 border-t space-y-2">
              {isAuthenticated && currentUser ? (
                <>
                  <Button className="w-full bg-[#16A34A] text-white hover:bg-[#16A34A]/90" onClick={() => handleNav(currentUser.role === 'admin' ? 'admin-dashboard' : 'agent-dashboard')}>
                    Go to Dashboard
                  </Button>
                  <Button variant="outline" className="w-full" onClick={() => { logout(); setMobileOpen(false); }}>Sign Out</Button>
                </>
              ) : (
                <>
                  <Button variant="outline" className="w-full" onClick={() => handleNav('login')}>Sign In</Button>
                  <Button className="w-full bg-[#16A34A] text-white hover:bg-[#16A34A]/90" onClick={() => handleNav('register-agent')}>
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
