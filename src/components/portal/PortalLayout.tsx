'use client';
import React, { useEffect } from 'react';
import { useAppStore } from '@/lib/store';
import type { PageType } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { LayoutDashboard, User, FileText, Calendar, ArrowLeft, Bell, LogOut, Menu, X, Users, Briefcase, DollarSign, MessageCircle, ClipboardList, Globe, Check, Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItem { label: string; page: PageType; icon: React.ElementType; }

const NAV_CONFIG: Record<string, NavItem[]> = {
  visitor: [],
  agent: [
    { label: 'Dashboard', page: 'agent-dashboard', icon: LayoutDashboard },
    { label: 'My Profile', page: 'agent-profile', icon: User },
    { label: 'Documents', page: 'agent-documents', icon: FileText },
    { label: 'Availability', page: 'agent-availability', icon: Calendar },
    { label: 'Messages', page: 'messages', icon: MessageCircle },
  ],
  client: [
    { label: 'Dashboard', page: 'client-dashboard', icon: LayoutDashboard },
    { label: 'Company Profile', page: 'client-profile', icon: Building2 },
    { label: 'Job Postings', page: 'client-jobs', icon: Globe },
    { label: 'My Needs', page: 'client-needs', icon: Briefcase },
    { label: 'Agent Bank', page: 'client-agents', icon: Users },
    { label: 'Messages', page: 'messages', icon: MessageCircle },
  ],
  payment_taker: [
    { label: 'Payment Requests', page: 'payment-taker-dashboard', icon: DollarSign },
    { label: 'Messages', page: 'messages', icon: MessageCircle },
  ],
  admin: [
    { label: 'Dashboard', page: 'admin-dashboard', icon: LayoutDashboard },
    { label: 'Job Postings', page: 'admin-job-posts', icon: ClipboardList },
    { label: 'Users', page: 'admin-users', icon: Users },
    { label: 'Messages', page: 'messages', icon: MessageCircle },
  ],
};

function getPageTitle(page: PageType): string {
  const map: Partial<Record<PageType, string>> = {
    home: 'Home', services: 'Services', 'for-clients': 'For Call Centers', careers: 'Careers',
    about: 'About Us', contact: 'Contact', login: 'Login',
    'agent-dashboard': 'Dashboard', 'agent-profile': 'My Profile', 'agent-documents': 'Documents', 'agent-availability': 'Availability',
    'client-dashboard': 'Dashboard', 'client-agents': 'Agent Bank', 'client-needs': 'My Staffing Needs', 'client-jobs': 'Job Postings', 'client-profile': 'Company Profile',
    'admin-dashboard': 'Admin Dashboard', 'admin-users': 'Users', 'admin-job-posts': 'Job Postings',
    'payment-taker-dashboard': 'Payment Requests', 'messages': 'Messages', 'pending-payment': 'Complete Payment',
  };
  return map[page] || 'Dashboard';
}

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const { currentUser, currentPage, sidebarOpen, setSidebarOpen, navigateTo, logout, notifications } = useAppStore();
  const role = (currentUser?.role || 'visitor') as string;
  const navItems = (NAV_CONFIG[role] || []) as NavItem[];
  const pageTitle = getPageTitle(currentPage);
  const unreadCount = (notifications || []).filter((n) => !n.isRead).length;

  useEffect(() => { if (window.innerWidth < 1024) setSidebarOpen(false); }, [currentPage, setSidebarOpen]);
  useEffect(() => {
    if (!currentUser) return;
    fetch('/api/notifications?userId=' + currentUser.id).then(r => r.json()).then(data => { if (Array.isArray(data)) useAppStore.getState().setData('notifications', data); }).catch(() => {});
  }, [currentUser]);

  const markAllRead = async () => {
    if (!currentUser || !notifications) return;
    const unread = notifications.filter(n => !n.isRead);
    for (const n of unread) {
      fetch('/api/notifications/' + n.id, { method: 'PATCH', headers: { 'Content-Type': 'application/json', 'X-User-Id': currentUser.id, 'X-User-Role': currentUser.role }, body: JSON.stringify({ isRead: true }) }).catch(() => {});
    }
    useAppStore.getState().setData('notifications', notifications.map(n => ({ ...n, isRead: true })));
  };

  const initials = currentUser?.name ? currentUser.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) : 'U';

  return (
    <div className="min-h-screen flex bg-gray-50">
      {sidebarOpen && <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />}
      {/* REDESIGN: Brand navy color + green active indicator with left border */}
      <aside className={cn('fixed lg:sticky top-0 left-0 z-50 h-screen w-[280px] text-white flex flex-col transition-transform duration-300', sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0')} style={{ backgroundColor: '#0B1A2E' }}>
        <div className="flex items-center justify-between px-6 py-5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#16A34A] flex items-center justify-center font-bold text-white text-sm">GS</div>
            <span className="text-base font-semibold" style={{ fontFamily: 'var(--font-playfair), Georgia, serif' }}>
              <span className="text-white">Gig </span><span className="text-[#16A34A]">Solutions</span>
            </span>
          </div>
          <Button variant="ghost" size="icon" className="lg:hidden text-white hover:bg-white/10 h-8 w-8" onClick={() => setSidebarOpen(false)}><X className="h-4 w-4" /></Button>
        </div>
        <Separator className="bg-white/10" />
        <ScrollArea className="flex-1 px-3 py-4">
          <nav className="flex flex-col gap-1">
            {navItems.map(item => {
              const Icon = item.icon;
              const isActive = currentPage === item.page;
              return (
                <button key={item.page} onClick={() => navigateTo(item.page)}
                  className={cn('flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors w-full text-left',
                    isActive ? 'text-[#16A34A]' : 'text-gray-300 hover:bg-white/8 hover:text-white')}
                  style={isActive ? { backgroundColor: 'rgba(22,163,74,0.12)', borderLeft: '3px solid #16A34A' } : { borderLeft: '3px solid transparent' }}>
                  <Icon className="h-4.5 w-4.5 shrink-0" /><span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </ScrollArea>
        <div className="px-3 pb-3">
          <Separator className="bg-white/10 mb-3" />
          <button onClick={() => navigateTo('home')} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-400 hover:bg-white/8 hover:text-white transition-colors w-full text-left">
            <ArrowLeft className="h-4 w-4 shrink-0" /><span>Back to Website</span>
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-30 bg-white border-b border-gray-200 h-16 flex items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="lg:hidden h-9 w-9" onClick={() => setSidebarOpen(true)}><Menu className="h-5 w-5" /></Button>
            <h1 className="text-lg font-semibold text-gray-900">{pageTitle}</h1>
          </div>
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative h-9 w-9">
                  <Bell className="h-4.5 w-4.5 text-gray-600" />
                  {unreadCount > 0 && <span className="absolute -top-0.5 -right-0.5 h-4.5 w-4.5 rounded-full bg-[#16A34A] text-[10px] font-bold text-white flex items-center justify-center">{unreadCount > 9 ? '9+' : unreadCount}</span>}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-72">
                <div className="flex items-center justify-between px-3 py-2">
                  <span className="text-sm font-semibold">Notifications</span>
                  {unreadCount > 0 && (<button onClick={markAllRead} className="text-xs text-[#16A34A] hover:underline flex items-center gap-1"><Check className="h-3 w-3" />Mark all read</button>)}
                </div>
                <DropdownMenuSeparator />
                {(!notifications || notifications.length === 0) ? (
                  <div className="px-3 py-4 text-sm text-muted-foreground text-center">No notifications</div>
                ) : notifications.slice(0, 5).map(n => (
                  <DropdownMenuItem key={n.id} className="flex flex-col items-start gap-1 py-2.5 px-3">
                    <div className="flex items-center gap-2 w-full">
                      {!n.isRead && <span className="h-2 w-2 rounded-full bg-[#16A34A] shrink-0" />}
                      <span className={cn('text-sm', !n.isRead ? 'font-semibold' : 'font-medium text-gray-600')}>{n.title}</span>
                    </div>
                    <span className="text-xs text-muted-foreground line-clamp-1 pl-4">{n.message}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="gap-2 px-2 h-9">
                  <Avatar className="h-7 w-7"><AvatarFallback className="bg-[#16A34A] text-white text-xs font-semibold">{initials}</AvatarFallback></Avatar>
                  <span className="hidden sm:inline text-sm font-medium text-gray-700 max-w-[120px] truncate">{currentUser?.name || 'User'}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <div className="px-2 py-1.5"><p className="text-sm font-medium">{currentUser?.name}</p><p className="text-xs text-muted-foreground">{currentUser?.email}</p><p className="text-xs text-[#16A34A] capitalize">{currentUser?.role?.replace('_', ' ')}</p></div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigateTo('messages')}><MessageCircle className="mr-2 h-4 w-4" />Messages</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout} className="text-red-600"><LogOut className="mr-2 h-4 w-4" />Sign Out</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}