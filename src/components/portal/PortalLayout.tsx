'use client';
import React, { useEffect, useRef, useCallback, useState } from 'react';
import { useAppStore } from '@/lib/store';
import type { PageType } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { LayoutDashboard, User, FileText, Calendar, ArrowLeft, Bell, LogOut, Menu, X, Users, Briefcase, DollarSign, MessageCircle, ClipboardList, Globe, Check, Building2, Headphones, UsersRound, Star, GraduationCap, ShoppingBag, Package } from 'lucide-react';
import { cn } from '@/lib/utils';
import { VerifiedBadge, VerifiedBadgeStyles, topVerificationTier, type VerificationTier } from '@/components/ui/verified-badge';

interface NavItem { label: string; page: PageType; icon: React.ElementType; }

const NAV_CONFIG: Record<string, NavItem[]> = {
  visitor: [],
  agent: [
    { label: 'Dashboard', page: 'agent-dashboard', icon: LayoutDashboard },
    { label: 'My Profile', page: 'agent-profile', icon: User },
    { label: 'Documents', page: 'agent-documents', icon: FileText },
    { label: 'Availability', page: 'agent-availability', icon: Calendar },
    { label: 'My Applications', page: 'agent-applications', icon: ClipboardList },
    { label: 'Academy', page: 'academy', icon: GraduationCap },
    { label: 'Marketplace', page: 'marketplace', icon: ShoppingBag },
    { label: 'Team Chat', page: 'group-chat', icon: UsersRound },
    { label: 'Reviews', page: 'reviews', icon: Star },
    { label: 'Customer Support', page: 'support', icon: Headphones },
    { label: 'Messages', page: 'messages', icon: MessageCircle },
  ],
  client: [
    { label: 'Dashboard', page: 'client-dashboard', icon: LayoutDashboard },
    { label: 'Company Profile', page: 'client-profile', icon: Building2 },
    { label: 'Job Links', page: 'client-jobs', icon: Globe },
    { label: 'My Jobs', page: 'client-needs', icon: Briefcase },
    { label: 'Agent Bank', page: 'client-agents', icon: Users },
    { label: 'Applications', page: 'client-applications', icon: ClipboardList },
    { label: 'Academy', page: 'academy', icon: GraduationCap },
    { label: 'Marketplace', page: 'marketplace', icon: ShoppingBag },
    { label: 'Team Chat', page: 'group-chat', icon: UsersRound },
    { label: 'Reviews', page: 'reviews', icon: Star },
    { label: 'Customer Support', page: 'support', icon: Headphones },
    { label: 'Messages', page: 'messages', icon: MessageCircle },
  ],
  payment_taker: [
    { label: 'Payment Requests', page: 'payment-taker-dashboard', icon: DollarSign },
    { label: 'Reviews', page: 'reviews', icon: Star },
    { label: 'Messages', page: 'messages', icon: MessageCircle },
  ],
  admin: [
    { label: 'Dashboard', page: 'admin-dashboard', icon: LayoutDashboard },
    { label: 'Payment Requests', page: 'payment-taker-dashboard', icon: DollarSign },
    { label: 'Job Links', page: 'admin-job-posts', icon: ClipboardList },
    { label: 'Users', page: 'admin-users', icon: Users },
    { label: 'Products', page: 'admin-products', icon: Package },
    { label: 'Academy', page: 'academy', icon: GraduationCap },
    { label: 'Team Chat', page: 'group-chat', icon: UsersRound },
    { label: 'Reviews', page: 'reviews', icon: Star },
    { label: 'Support Tickets', page: 'tickets', icon: ClipboardList },
    { label: 'Messages', page: 'messages', icon: MessageCircle },
  ],
};

function getPageTitle(page: PageType): string {
  const map: Partial<Record<PageType, string>> = {
    home: 'Home', services: 'Services', 'for-clients': 'For Call Centers', careers: 'Careers',
    'agent-dashboard': 'Dashboard', 'agent-profile': 'My Profile', 'agent-documents': 'Documents', 'agent-availability': 'Availability', 'agent-applications': 'My Applications',
    'client-dashboard': 'Dashboard', 'client-agents': 'Agent Bank', 'client-needs': 'My Jobs', 'client-jobs': 'Job Links', 'client-applications': 'Applications', 'client-profile': 'Company Profile',
    'admin-dashboard': 'Admin Dashboard', 'admin-users': 'Users', 'admin-job-posts': 'Job Links',
    'payment-taker-dashboard': 'Payment Requests', 'messages': 'Messages', 'group-chat': 'Team Chat', 'pending-payment': 'Complete Payment', 'support': 'Customer Support', 'tickets': 'Support Tickets', 'reviews': 'Reviews',
  };
  return map[page] || 'Dashboard';
}

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const [displayName, setDisplayName] = useState<string | null>(null);
  const { currentUser, currentPage, sidebarOpen, setSidebarOpen, navigateTo, logout, notifications } = useAppStore();
  const role = (currentUser?.role || 'visitor') as string;
  // Treat payment_taker as admin (merged role — admin handles both jobs now)
  const effectiveRole = role === 'payment_taker' ? 'admin' : role;
  const navItems = (NAV_CONFIG[effectiveRole] || NAV_CONFIG[role] || []) as NavItem[];
  const pageTitle = getPageTitle(currentPage);
  const unreadCount = (notifications || []).filter((n) => !n.isRead).length;
  const notifPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const dismissedRef = useRef<Set<string>>(new Set());

  useEffect(() => { if (window.innerWidth < 1024) setSidebarOpen(false); }, [currentPage, setSidebarOpen]);

  // Browser push notification subscription
  useEffect(() => {
    if (typeof window === 'undefined' || !currentUser || !('serviceWorker' in navigator) || !('PushManager' in window)) return;
    (async () => {
      try {
        const reg = await navigator.serviceWorker.register('/sw.js');
        const existing = await reg.pushManager.getSubscription();
        if (!existing) {
          const res = await fetch('/api/push/subscribe');
          const { vapidPublicKey } = await res.json();
          const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: vapidPublicKey });
          await fetch('/api/push/subscribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-User-Id': currentUser!.id, 'X-User-Role': currentUser!.role },
            body: JSON.stringify({ subscription: sub }),
          });
        }
      } catch (e) { /* push not supported or user declined */ }
    })();
  }, [currentUser]);

  // Listen for PLAY_NOTIF_SOUND messages from the service worker and play
  // the in-app chime. The SW can't play <audio> directly (no DOM), so it
  // posts a message to all open client windows. We respect the user's mute
  // preference (stored in localStorage as 'notif-muted').
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
    const handler = (event: MessageEvent) => {
      if (event.data && event.data.type === 'PLAY_NOTIF_SOUND') {
        try {
          const muted = localStorage.getItem('notif-muted') === '1';
          if (muted) return;
          const audio = new Audio('/sounds/notification.mp3');
          audio.volume = 0.6;
          audio.play().catch(() => { /* autoplay may be blocked until user interacts */ });
        } catch (_) { /* best-effort */ }
      }
    };
    navigator.serviceWorker.addEventListener('message', handler);
    return () => navigator.serviceWorker.removeEventListener('message', handler);
  }, []);

  // Fetch in-app notifications (immediate + poll every 15s)
  // Dismissed notifications are tracked in dismissedRef and filtered out on each poll.
  // When a NEW notification appears (compared to the previous poll), play the chime.
  const prevNotifIdsRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!currentUser) return;
    const fetchNotifs = () => {
      fetch('/api/notifications?userId=' + currentUser.id)
        .then(r => r.json())
        .then(data => {
          if (Array.isArray(data)) {
            const filtered = data.filter((n: any) => !dismissedRef.current.has(n.id));
            // Detect newly-arrived notifications (IDs not in the previous set)
            const newIds = filtered.filter((n: any) => !prevNotifIdsRef.current.has(n.id));
            if (newIds.length > 0 && prevNotifIdsRef.current.size > 0) {
              // Play chime for the newest one (respect mute preference)
              try {
                const muted = localStorage.getItem('notif-muted') === '1';
                if (!muted) {
                  const audio = new Audio('/sounds/notification.mp3');
                  audio.volume = 0.6;
                  audio.play().catch(() => { /* autoplay may be blocked */ });
                }
              } catch (_) { /* best-effort */ }
            }
            // Update the prev-IDs set for the next poll
            prevNotifIdsRef.current = new Set(filtered.map((n: any) => n.id));
            useAppStore.getState().setData('notifications', filtered);
          }
        })
        .catch(() => {});
    };
    fetchNotifs();
    notifPollRef.current = setInterval(fetchNotifs, 15000);
    return () => { if (notifPollRef.current) clearInterval(notifPollRef.current); };
  }, [currentUser]);

  // Map a notification type to the page the user should be taken to
  // when they click on the notification.
  const pageForNotification = (n: { type?: string | null }): PageType | null => {
    switch (n.type) {
      case 'payment_request':
        // Agents/clients → payment chat; admin/payment_taker → dashboard
        return effectiveRole === 'admin' ? 'payment-taker-dashboard' : 'pending-payment';
      case 'message':
        return 'messages';
      case 'need':
      case 'staffing_request':
        return effectiveRole === 'admin' ? 'admin-job-posts' : 'client-needs';
      case 'application':
        return effectiveRole === 'admin' ? 'admin-job-posts' : 'client-applications';
      case 'review':
        return 'reviews';
      case 'ticket':
      case 'support':
      case 'support_ticket':
      case 'product_order':
        return effectiveRole === 'admin' ? 'tickets' : 'support';
      case 'verification':
        return effectiveRole === 'admin' ? 'admin-users' : 'agent-profile';
      default:
        return null;
    }
  };

  const markSingleRead = useCallback(async (notifId: string) => {
    if (!currentUser) return;
    // Look up the notification so we can navigate based on its type
    const target = (notifications || []).find(n => n.id === notifId);
    // Track as dismissed so polling won't bring it back
    dismissedRef.current.add(notifId);
    // Mark as read on server
    fetch('/api/notifications/' + notifId, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'X-User-Id': currentUser.id, 'X-User-Role': currentUser.role }, body: JSON.stringify({ isRead: true }) }).catch(() => {});
    // Remove from local store immediately
    const updated = (notifications || []).filter(n => n.id !== notifId);
    useAppStore.getState().setData('notifications', updated);
    // Navigate to the related page based on notification type
    if (target) {
      const page = pageForNotification(target);
      if (page) navigateTo(page);
    }
  }, [currentUser, notifications, navigateTo, effectiveRole]);

  const markAllRead = async () => {
    if (!currentUser || !notifications) return;
    const unread = notifications.filter(n => !n.isRead);
    for (const n of unread) {
      dismissedRef.current.add(n.id);
      fetch('/api/notifications/' + n.id, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'X-User-Id': currentUser.id, 'X-User-Role': currentUser.role }, body: JSON.stringify({ isRead: true }) }).catch(() => {});
    }
    useAppStore.getState().setData('notifications', notifications.map(n => ({ ...n, isRead: true })));
  };

  // Fetch company name for call center users
  useEffect(() => {
    if (currentUser?.role === 'client') {
      fetch('/api/users/company-name', { headers: { 'X-User-Id': currentUser.id, 'X-User-Role': currentUser.role } })
        .then(r => r.ok ? r.json() : null)
        .then(d => { if (d?.companyName) setDisplayName(d.companyName); })
        .catch(() => {});
    }
  }, [currentUser]);

  const effectiveName = displayName || currentUser?.name || 'User'; const initials = effectiveName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  // Verification tiers for the current user — drives the badge seal on the header avatar.
  const myTiers: VerificationTier[] = Array.isArray((currentUser as any)?.verificationTiers)
    ? (currentUser!.verificationTiers as VerificationTier[])
    : [];
  const myTopTier = topVerificationTier(myTiers);

  return (
    <div className="min-h-screen flex bg-gray-50 max-w-[100vw]" style={{ overflowX: 'clip' }}>
      <VerifiedBadgeStyles />
      {sidebarOpen && <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />}
      <aside className={cn('fixed lg:sticky top-0 left-0 z-50 h-screen w-[280px] text-white flex flex-col transition-transform duration-300', sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0')} style={{ backgroundColor: '#0B1A2E' }}>
        <div className="flex items-center justify-between px-6 py-5">
          <div className="flex items-center gap-2.5">
            <img
              src="/logo-wide-40.png"
              alt="Gig Solutions"
              className="h-9 w-auto"
              style={{ objectFit: 'contain' }}
            />
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
        <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-gray-200 h-16 flex items-center justify-between px-4 md:px-6 shadow-sm">
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
                  <DropdownMenuItem key={n.id} className="flex flex-col items-start gap-1 py-2.5 px-3 cursor-pointer" onClick={() => markSingleRead(n.id)}>
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
                  <div className="relative shrink-0">
                    <Avatar className="h-7 w-7">
                      {currentUser?.avatar && <AvatarImage src={currentUser.avatar} alt={effectiveName} />}
                      <AvatarFallback className="bg-[#16A34A] text-white text-xs font-semibold">{initials}</AvatarFallback>
                    </Avatar>
                    {myTopTier && (
                      <span className="absolute -bottom-1 -right-1">
                        <VerifiedBadge tier={myTopTier} iconOnly size="xs" verifiedAt={(currentUser as any)?.verifiedAt} />
                      </span>
                    )}
                  </div>
                  <span className="hidden sm:inline text-sm font-medium text-gray-700 max-w-[120px] truncate">{effectiveName}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <div className="px-2 py-1.5"><p className="text-sm font-medium">{effectiveName}</p><p className="text-xs text-muted-foreground">{currentUser?.email}</p><p className="text-xs text-[#16A34A] capitalize">{effectiveRole.replace('_', ' ')}</p></div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigateTo('messages')}><MessageCircle className="mr-2 h-4 w-4" />Messages</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout} className="text-red-600"><LogOut className="mr-2 h-4 w-4" />Sign Out</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        <main
          className="flex-1 min-w-0 overflow-x-hidden px-4 md:px-6 py-6"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
