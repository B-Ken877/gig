'use client';
import React, { useEffect, useRef, useState } from 'react';
import { useAppStore, authFetch } from '@/lib/store';
import type { PageType, Notification } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import {
  LayoutDashboard, User, FileText, Calendar, ArrowLeft, Bell, LogOut, Menu, X,
  Users, Briefcase, MessageCircle, ClipboardList, Headphones, GraduationCap,
  CalendarClock, Network, ShieldCheck, Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItem { label: string; page: PageType; icon: React.ElementType; }

const NAV_CONFIG: Record<string, NavItem[]> = {
  visitor: [],
  agent: [
    { label: 'Dashboard', page: 'agent-dashboard', icon: LayoutDashboard },
    { label: 'My Work', page: 'agent-my-work', icon: Briefcase },
    { label: 'My Applications', page: 'agent-applications', icon: ClipboardList },
    { label: 'Identity Verification', page: 'agent-verify-id', icon: ShieldCheck },
    { label: 'My Profile', page: 'agent-profile', icon: User },
    { label: 'Availability', page: 'agent-availability', icon: Calendar },
    { label: 'Academy', page: 'academy', icon: GraduationCap },
    { label: 'Customer Support', page: 'support', icon: Headphones },
    { label: 'Messages', page: 'messages', icon: MessageCircle },
  ],
  admin: [
    { label: 'Dashboard', page: 'admin-dashboard', icon: LayoutDashboard },
    { label: 'Job Posts', page: 'admin-job-posts', icon: ClipboardList },
    { label: 'Providers', page: 'admin-providers', icon: Network },
    { label: 'Applications', page: 'admin-placements', icon: Briefcase },
    { label: 'Salary Dates', page: 'admin-salary-dates', icon: CalendarClock },
    { label: 'Users', page: 'admin-users', icon: Users },
    { label: 'Support Tickets', page: 'tickets', icon: Headphones },
    { label: 'Messages', page: 'messages', icon: MessageCircle },
  ],
};

function getPageTitle(page: PageType): string {
  const map: Partial<Record<PageType, string>> = {
    home: 'Home', services: 'Services', careers: 'Careers', about: 'About', contact: 'Contact', academy: 'Academy',
    'agent-dashboard': 'Dashboard', 'agent-profile': 'My Profile', 'agent-documents': 'Documents',
    'agent-availability': 'Availability', 'agent-applications': 'My Applications', 'agent-my-work': 'My Work', 'agent-verify-id': 'Identity Verification',
    'admin-dashboard': 'Dashboard', 'admin-users': 'Users', 'admin-job-posts': 'Job Posts',
    'admin-providers': 'Providers', 'admin-placements': 'Applications',
    'admin-salary-dates': 'Salary Dates',
    'messages': 'Messages', 'support': 'Customer Support', 'tickets': 'Support Tickets',
  };
  return map[page] || 'Dashboard';
}

// Map a notification type to the page the user should be taken to when they
// click on the notification.
function getNotificationPage(notif: Notification, role: string): PageType {
  const t = notif.type || '';
  if (t === 'job_post') return role === 'admin' ? 'admin-job-posts' : 'agent-dashboard';
  if (t === 'job_application') return 'admin-placements';
  if (t === 'hired' || t === 'placement') return 'agent-my-work';
  if (t === 'rejected') return 'agent-applications';
  if (t === 'message') return 'messages';
  if (t === 'ticket' || t === 'support') return role === 'admin' ? 'tickets' : 'support';
  // Default: go to dashboard
  return role === 'admin' ? 'admin-dashboard' : 'agent-dashboard';
}

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const { currentUser, currentPage, sidebarOpen, setSidebarOpen, navigateTo, logout, notifications } = useAppStore();
  const role = (currentUser?.role || 'visitor') as string;
  const navItems = (NAV_CONFIG[role] || []) as NavItem[];
  const pageTitle = getPageTitle(currentPage);
  const unreadCount = (notifications || []).filter((n) => !n.isRead).length;
  const notifPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => { if (window.innerWidth < 1024) setSidebarOpen(false); }, [currentPage, setSidebarOpen]);

  useEffect(() => {
    if (!currentUser) return;
    const loadNotifs = async () => {
      try {
        const res = await authFetch('/api/notifications');
        if (res.ok) {
          const data = await res.json();
          useAppStore.getState().setData('notifications', data.notifications || []);
        }
      } catch { /* ignore */ }
    };
    loadNotifs();
    notifPollRef.current = setInterval(loadNotifs, 30000);
    return () => { if (notifPollRef.current) clearInterval(notifPollRef.current); };
  }, [currentUser]);

  // "Clear All" — deletes ALL notifications for this user (not just marks read).
  const handleClearAll = async () => {
    if (!currentUser) return;
    try {
      await authFetch('/api/notifications', { method: 'PATCH' });
      useAppStore.getState().setData('notifications', []);
    } catch { /* ignore */ }
  };

  // Click on a single notification → navigate to the right page + delete it.
  const handleNotificationClick = async (notif: Notification) => {
    if (!currentUser) return;
    const targetPage = getNotificationPage(notif, role);
    // Navigate first so the user sees the page immediately.
    navigateTo(targetPage);
    // Then delete the notification from the DB + local state.
    try {
      await authFetch('/api/notifications', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: notif.id }),
      });
      useAppStore.getState().setData('notifications', (notifications || []).filter(n => n.id !== notif.id));
    } catch { /* ignore */ }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <aside className={cn(
        'fixed top-0 left-0 z-50 h-full w-72 bg-[#0B1A2E] text-white transition-transform duration-300 lg:translate-x-0',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      )}>
        <div className="flex h-16 items-center gap-2 px-6 border-b border-white/10">
          <button onClick={() => navigateTo('home')} className="flex items-center gap-2">
            <img src="/logo-wide.png" alt="Gig Solutions" className="h-8 w-auto" onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/logo-wide-40.png'; }} />
          </button>
          <button className="ml-auto lg:hidden text-white/60" onClick={() => setSidebarOpen(false)}>
            <X className="h-5 w-5" />
          </button>
        </div>

        <ScrollArea className="h-[calc(100vh-4rem)]">
          <nav className="px-3 py-4 space-y-1">
            {navItems.map(item => {
              const Icon = item.icon;
              const active = currentPage === item.page;
              return (
                <button
                  key={item.page}
                  onClick={() => navigateTo(item.page)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                    active ? 'bg-[#16A34A] text-white shadow-sm' : 'text-gray-300 hover:bg-white/5 hover:text-white'
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </ScrollArea>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-white/10 bg-[#0B1A2E]">
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <ShieldCheck className="h-3.5 w-3.5 text-[#16A34A]" />
            <span>Gig Solutions</span>
            <span className="ml-auto px-2 py-0.5 rounded-full bg-white/10 text-[10px] uppercase tracking-wider">{role}</span>
          </div>
        </div>
      </aside>

      <div className="lg:pl-72">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-white/10 bg-[#122B4A] px-4 lg:px-6">
          <button className="lg:hidden text-white/70 hover:text-white" onClick={() => setSidebarOpen(true)}>
            <Menu className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-semibold text-white">{pageTitle}</h1>

          <div className="ml-auto flex items-center gap-2">
            {/* Notifications */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="relative p-2 rounded-full hover:bg-white/10 transition-colors">
                  <Bell className="h-5 w-5 text-white/70" />
                  {(notifications || []).length > 0 && (
                    <span className="absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                      {(notifications || []).length > 9 ? '9+' : (notifications || []).length}
                    </span>
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80 max-h-96 overflow-y-auto">
                <div className="flex items-center justify-between px-3 py-2">
                  <span className="text-sm font-semibold">Notifications</span>
                  {(notifications || []).length > 0 && (
                    <button onClick={handleClearAll} className="text-xs text-red-600 hover:underline flex items-center gap-1">
                      <Trash2 className="h-3 w-3" /> Clear All
                    </button>
                  )}
                </div>
                <DropdownMenuSeparator />
                {(notifications || []).slice(0, 20).map(n => (
                  <DropdownMenuItem
                    key={n.id}
                    className="flex flex-col items-start py-2 cursor-pointer hover:bg-gray-50"
                    onClick={() => handleNotificationClick(n)}
                  >
                    <span className="text-sm font-medium">{n.title}</span>
                    <span className="text-xs text-gray-500">{n.message}</span>
                    <span className="text-[10px] text-gray-400 mt-0.5">{new Date(n.createdAt).toLocaleString()}</span>
                  </DropdownMenuItem>
                ))}
                {(notifications || []).length === 0 && (
                  <div className="px-3 py-6 text-center text-sm text-gray-400">No notifications</div>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* User menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 p-1 rounded-full hover:bg-white/10 transition-colors">
                  <Avatar className="h-8 w-8">
                    {currentUser?.avatar && <AvatarImage src={currentUser.avatar} alt={currentUser?.name || 'User'} />}
                    <AvatarFallback className="bg-[#16A34A] text-white text-xs font-bold">
                      {(currentUser?.name || 'U').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-3 py-2">
                  <p className="text-sm font-semibold">{currentUser?.name}</p>
                  <p className="text-xs text-gray-500 truncate">{currentUser?.email}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigateTo(role === 'admin' ? 'admin-dashboard' : 'agent-dashboard')}>
                  <LayoutDashboard className="h-4 w-4 mr-2" /> Dashboard
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigateTo('home')}>
                  <ArrowLeft className="h-4 w-4 mr-2" /> Back to Site
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => { logout(); }} className="text-red-600 focus:text-red-600">
                  <LogOut className="h-4 w-4 mr-2" /> Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="px-4 md:px-6 py-6">
          {children}
        </main>
      </div>
    </div>
  );
}
