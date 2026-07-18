'use client';
import React, { useEffect, useRef, useCallback, useState } from 'react';
import { toast } from 'sonner';
import { useAppStore } from '@/lib/store';
import type { PageType } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { VerifiedBadge, VerifiedBadgeStyles, topVerificationTier, type VerificationTier } from '@/components/ui/verified-badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { LayoutDashboard, User, FileText, Calendar, ArrowLeft, Bell, LogOut, Menu, X, Users, Briefcase, DollarSign, MessageCircle, ClipboardList, Globe, Check, Building2, Headphones, Star, Volume2, VolumeX, Download, BellRing, BellOff, FlaskConical } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItem { label: string; page: PageType; icon: React.ElementType; }

const NAV_CONFIG: Record<string, NavItem[]> = {
  visitor: [],
  agent: [
    { label: 'Dashboard', page: 'agent-dashboard', icon: LayoutDashboard },
    { label: 'My Profile', page: 'agent-profile', icon: User },
    { label: 'Documents', page: 'agent-documents', icon: FileText },
    { label: 'Availability', page: 'agent-availability', icon: Calendar },
    { label: 'My Applications', page: 'agent-applications', icon: ClipboardList },
    { label: 'Reviews', page: 'reviews', icon: Star },
    { label: 'Customer Support', page: 'support', icon: Headphones },
    { label: 'Messages', page: 'messages', icon: MessageCircle },
  ],
  client: [
    { label: 'Dashboard', page: 'client-dashboard', icon: LayoutDashboard },
    { label: 'Company Profile', page: 'client-profile', icon: Building2 },
    { label: 'Job Postings', page: 'client-jobs', icon: Globe },
    { label: 'My Needs', page: 'client-needs', icon: Briefcase },
    { label: 'Agent Bank', page: 'client-agents', icon: Users },
    { label: 'Applications', page: 'client-applications', icon: ClipboardList },
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
    { label: 'Job Postings', page: 'admin-job-posts', icon: ClipboardList },
    { label: 'Users', page: 'admin-users', icon: Users },
    { label: 'Reviews', page: 'reviews', icon: Star },
    { label: 'Messages', page: 'messages', icon: MessageCircle },
  ],
};

function getPageTitle(page: PageType): string {
  const map: Partial<Record<PageType, string>> = {
    home: 'Home', services: 'Services', 'for-clients': 'For Call Centers', careers: 'Careers',
    about: 'About Us', contact: 'Contact', login: 'Login',
    'agent-dashboard': 'Dashboard', 'agent-profile': 'My Profile', 'agent-documents': 'Documents', 'agent-availability': 'Availability', 'agent-applications': 'My Applications',
    'client-dashboard': 'Dashboard', 'client-agents': 'Agent Bank', 'client-needs': 'My Staffing Needs', 'client-jobs': 'Job Postings', 'client-applications': 'Applications', 'client-profile': 'Company Profile',
    'admin-dashboard': 'Admin Dashboard', 'admin-users': 'Users', 'admin-job-posts': 'Job Postings',
    'payment-taker-dashboard': 'Payment Requests', 'messages': 'Messages', 'pending-payment': 'Complete Payment', 'support': 'Customer Support', 'tickets': 'Support Tickets', 'reviews': 'Reviews',
  };
  return map[page] || 'Dashboard';
}

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const [displayName, setDisplayName] = useState<string | null>(null);
  const { currentUser, currentPage, sidebarOpen, setSidebarOpen, navigateTo, logout, notifications, updateCurrentUser, notifSoundPref, setNotifSoundPref } = useAppStore();
  const role = (currentUser?.role || 'visitor') as string;
  const navItems = (NAV_CONFIG[role] || []) as NavItem[];
  const pageTitle = getPageTitle(currentPage);
  const unreadCount = (notifications || []).filter((n) => !n.isRead).length;
  const notifPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const dismissedRef = useRef<Set<string>>(new Set());
  // Tracks IDs we've already seen during notification polling. Initialized to
  // `null` so the FIRST poll seeds the set silently (we don't want to blast the
  // chime the moment the user opens the app for notifications that arrived
  // while they were away — that's a separate "unread banner" concern).
  const seenNotifIdsRef = useRef<Set<string> | null>(null);
  // Single reused Audio element — reusing avoids re-fetching the MP3 on every
  // chime and lets the browser pre-buffer it.
  const audioRef = useRef<HTMLAudioElement | null>(null);
  // PWA install prompt event. Captured from `beforeinstallprompt` so we can
  // show our own "Install App" button (Chrome/Edge/Android). iOS Safari does
  // NOT fire this event — users there must use Share → Add to Home Screen,
  // so we show them a hint instead.
  const [installPromptEvent, setInstallPromptEvent] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showIosHint, setShowIosHint] = useState(false);
  // Push subscription state — drives the bell toggle button in the sidebar.
  // 'activating' covers the brief window between user-click and the server
  // confirming the subscription is saved.
  type PushState = 'checking' | 'unsupported' | 'permission_denied' | 'inactive' | 'activating' | 'active';
  const [pushState, setPushState] = useState<PushState>('checking');
  // Coarse-grained check for whether the origin is served over HTTPS or localhost.
  // Push API + Service Workers require a secure context — on plain HTTP the
  // buttons below would just spin forever, so we surface a clear error instead.
  const isSecureContext = typeof window !== 'undefined'
    ? (window.isSecureContext || location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')
    : true;

  // ─────────────────────────────────────────────────────────────────────────
  // IN-APP NOTIFICATION FALLBACK
  // ─────────────────────────────────────────────────────────────────────────
  // Browser OS-level push (Notification.permission) can be permanently Blocked
  // by the user, and we cannot flip that from JS — it's a browser security
  // boundary. To keep notifications working even when push is blocked, we
  // surface new arrivals through THREE additional channels that need NO
  // permission:
  //   (a) A sticky sonner toast at the top-center of the screen (visible even
  //       when the user is in another tab, as long as the page is open).
  //   (b) Device vibration on Android Chrome (no permission required).
  //   (c) Tab-title flashing when the tab is NOT focused — alternates
  //       between the original title and "(N) new — click to view".
  // The polling effect below fires all three whenever new notifications arrive.
  const originalTitleRef = useRef<string | null>(null);
  const titleFlashRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const shownToastIdsRef = useRef<Set<string>>(new Set());

  // Helper: fire the in-app fallback (toast + vibrate). Called by the polling
  // loop and by the "Test Notification" button.
  const fireInAppNotif = useCallback((opts: { title: string; body: string; notifId?: string; onClickPage?: PageType }) => {
    const { title, body, notifId, onClickPage } = opts;
    // Dedup by notifId so polling re-fires don't spam toasts.
    if (notifId) {
      if (shownToastIdsRef.current.has(notifId)) return;
      shownToastIdsRef.current.add(notifId);
    }
    // (a) Sticky toast — stays until the user clicks it or dismisses it.
    // duration: Infinity = sticky. action button jumps to the relevant page.
    toast(title, {
      description: body,
      duration: 8000,
      position: 'top-center',
      className: 'gig-in-app-notif',
      style: {
        background: 'linear-gradient(135deg, #16A34A 0%, #0B1A2E 100%)',
        color: '#fff',
        border: '2px solid #16A34A',
        fontWeight: 600,
        fontSize: '15px',
        boxShadow: '0 10px 40px rgba(22,163,74,0.4)',
      },
      action: onClickPage ? {
        label: 'View',
        onClick: () => navigateTo(onClickPage),
      } : undefined,
    });
    // (b) Vibrate (Android Chrome — silently ignored on iOS / desktop).
    try {
      if (typeof navigator !== 'undefined' && typeof (navigator as any).vibrate === 'function') {
        (navigator as any).vibrate([180, 80, 180]);
      }
    } catch (_) { /* ignore */ }
  }, [navigateTo]);

  // Tab-title flashing: start when there are unread notifications AND the tab
  // is hidden; stop when the user focuses the tab or marks all read.
  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (originalTitleRef.current === null) {
      originalTitleRef.current = document.title;
    }
    const hasUnread = unreadCount > 0;
    const isHidden = document.hidden;

    if (hasUnread && isHidden) {
      if (titleFlashRef.current) return; // already flashing
      let toggle = false;
      titleFlashRef.current = setInterval(() => {
        toggle = !toggle;
        document.title = toggle
          ? `(${unreadCount}) ${unreadCount === 1 ? 'new message' : 'new messages'} 💬`
          : (originalTitleRef.current || 'Gig Solutions');
      }, 1200);
    } else {
      if (titleFlashRef.current) {
        clearInterval(titleFlashRef.current);
        titleFlashRef.current = null;
      }
      if (originalTitleRef.current) {
        document.title = originalTitleRef.current;
      }
    }
    return () => {
      if (titleFlashRef.current) {
        clearInterval(titleFlashRef.current);
        titleFlashRef.current = null;
      }
    };
  }, [unreadCount]);

  // When the tab regains focus, restore the original title immediately.
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const onVis = () => {
      if (!document.hidden && originalTitleRef.current) {
        document.title = originalTitleRef.current;
        if (titleFlashRef.current) {
          clearInterval(titleFlashRef.current);
          titleFlashRef.current = null;
        }
      }
    };
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('focus', onVis);
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('focus', onVis);
    };
  }, []);

  useEffect(() => { if (window.innerWidth < 1024) setSidebarOpen(false); }, [currentPage, setSidebarOpen]);

  // Pre-load the notification chime once on mount so the first play is instant
  // (no network round-trip after a push arrives).
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const a = new Audio('/sounds/notification.mp3');
      a.preload = 'auto';
      a.volume = 0.55;
      audioRef.current = a;
    } catch (_) { /* ignore */ }
    return () => { audioRef.current = null; };
  }, []);

  // Play the notification chime — but only if the user hasn't muted it.
  // Wrapped in useCallback so it can be a stable dependency for other effects.
  const playNotifSound = useCallback(() => {
    if (notifSoundPref !== 'on') return;
    try {
      const a = audioRef.current;
      if (!a) return;
      // Reset to start in case the previous play is still fading out.
      a.currentTime = 0;
      a.volume = 0.55;
      const p = a.play();
      if (p && typeof p.catch === 'function') p.catch(() => {}); // ignore autoplay rejection
    } catch (_) { /* best-effort */ }
  }, [notifSoundPref]);

  // Listen for messages from the service worker. The SW fires this whenever a
  // real web-push arrives so the page can play the chime (SW itself can't play
  // <audio> — no DOM access).
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
    const handler = (event: MessageEvent) => {
      if (event?.data?.type === 'PLAY_NOTIF_SOUND') playNotifSound();
    };
    navigator.serviceWorker.addEventListener('message', handler);
    return () => navigator.serviceWorker.removeEventListener('message', handler);
  }, [playNotifSound]);

  // PWA install handling:
  // - `beforeinstallprompt` fires on Chrome/Edge/Android when the browser has
  //   decided the site is installable. We capture it, prevent the default
  //   mini-infobar, and show our own "Install App" button instead.
  // - `appinstalled` fires once the user accepts any install prompt.
  //   At this exact moment Chrome shows the friendliest possible notification
  //   permission prompt (the user just demonstrated trust by installing), so
  //   we AUTO-request permission + auto-subscribe. This is the key flow that
  //   makes push work for installed PWA users — they get system-tray
  //   notifications + chime + vibration even when the app is closed.
  // - iOS Safari never fires `beforeinstallprompt` — for iOS users we show a
  //   hint button that explains how to use Share → Add to Home Screen.
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Detect if already running as installed PWA (display-mode: standalone)
    // or iOS Safari standalone mode.
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      // iOS Safari uses navigator.standalone (deprecated but still set)
      (window.navigator as any).standalone === true;
    if (isStandalone) setIsInstalled(true);

    const onBeforeInstall = (e: any) => {
      e.preventDefault();
      setInstallPromptEvent(e);
    };
    const onInstalled = async () => {
      setIsInstalled(true);
      setInstallPromptEvent(null);
      // ── AUTO-ENABLE PUSH RIGHT AFTER INSTALL ──────────────────────────
      // The user just installed the PWA — Chrome will show the friendliest
      // possible permission prompt at this moment. Request + subscribe
      // automatically. Skip if already granted/denied (idempotent).
      try {
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
        if (!window.isSecureContext) return;
        let perm = Notification.permission;
        if (perm === 'default') {
          // requestPermission() called from a user-gesture-adjacent event
          // (appinstalled fires synchronously after the install acceptance
          // gesture) — Chrome accepts this.
          perm = await Notification.requestPermission();
        }
        if (perm !== 'granted') {
          toast('PWA installed. To get notifications when the app is closed, allow notifications in Chrome settings.', { duration: 6000 });
          return;
        }
        // Permission granted → register SW + subscribe + POST to server.
        const reg = await navigator.serviceWorker.register('/sw.js');
        await navigator.serviceWorker.ready;
        const existing = await reg.pushManager.getSubscription();
        if (!existing) {
          const res = await fetch('/api/push/subscribe');
          const { vapidPublicKey } = await res.json();
          const keyBytes = urlBase64ToUint8Array(vapidPublicKey);
          const sub = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: keyBytes,
          });
          if (currentUser) {
            await fetch('/api/push/subscribe', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'X-User-Id': currentUser.id, 'X-User-Role': currentUser.role },
              body: JSON.stringify({ subscription: sub }),
            });
          }
        }
        setPushState('active');
        toast('App installed. You will now receive notifications even when the app is closed.', {
          duration: 5000,
          style: { background: '#16A34A', color: '#fff', fontWeight: 600 },
        });
        // Play the chime once so the user knows what to expect.
        playNotifSound();
      } catch (e) {
        console.warn('[push] post-install enable failed:', e);
      }
    };
    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, [currentUser, playNotifSound]);

  // Detect iOS Safari so we can show the "Add to Home Screen" hint button.
  // iOS Safari never fires `beforeinstallprompt`, so without this hint iOS
  // users would have no obvious way to install the PWA.
  const isIosSafari = (() => {
    if (typeof window === 'undefined' || !navigator) return false;
    const ua = navigator.userAgent || '';
    const isIos = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const isWebkit = /WebKit/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
    return isIos && isWebkit;
  })();

  const handleInstallClick = async () => {
    if (!installPromptEvent) return;
    installPromptEvent.prompt();
    const choice = await installPromptEvent.userChoice;
    if (choice && choice.outcome === 'accepted') {
      setIsInstalled(true);
    }
    setInstallPromptEvent(null);
  };

  // Browser push notification subscription — proper explicit-permission flow.
  //
  // Previous bug: we called pushManager.subscribe() WITHOUT first asking
  // Notification.requestPermission(). On most browsers that silently fails
  // (subscription never created), so the PushSubscription table stayed empty
  // and real system-tray notifications never fired — only the in-app poll
  // chime played.
  //
  // New flow:
  //   1. On mount: register SW, check existing subscription + permission state
  //      → if permission already granted AND no subscription → silently subscribe
  //      → if permission default or denied → show 'Enable Push' button
  //   2. User clicks 'Enable Push' → requestPermission() → subscribe → POST to /api/push/subscribe
  //   3. State transitions: 'inactive' → 'activating' → 'active' (or 'permission_denied' on reject)
  const registerAndCheckPush = useCallback(async () => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setPushState('unsupported');
      return;
    }
    if (!window.isSecureContext) {
      // Browsers refuse to register a SW on insecure origins. We still let the
      // UI render so the user understands why push is disabled.
      setPushState('unsupported');
      return;
    }
    try {
      const reg = await navigator.serviceWorker.register('/sw.js');
      // Claim the active SW immediately so messages flow.
      await navigator.serviceWorker.ready;

      const existing = await reg.pushManager.getSubscription();
      const perm = Notification.permission;

      if (existing) {
        // We have a subscription object — make sure the server knows about it.
        // (Idempotent — server upserts by userId.)
        if (currentUser) {
          try {
            await fetch('/api/push/subscribe', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'X-User-Id': currentUser.id, 'X-User-Role': currentUser.role },
              body: JSON.stringify({ subscription: existing }),
            });
          } catch (_) { /* best-effort */ }
        }
        setPushState('active');
      } else if (perm === 'granted') {
        // Permission already granted but no subscription on this browser.
        // Silently try to subscribe (no user prompt needed).
        if (currentUser) {
          await trySubscribe();
        }
      } else if (perm === 'denied') {
        setPushState('permission_denied');
      } else {
        // 'default' — user hasn't been asked. Show the Enable Push button.
        setPushState('inactive');
      }
    } catch (e) {
      // SW registration failed (network, parse error, etc.)
      console.warn('[push] SW registration failed:', e);
      setPushState('inactive');
    }
  }, [currentUser]);

  // Internal: actually call pushManager.subscribe() + POST to server.
  // Precondition: Notification.permission must be 'granted' before calling.
  const trySubscribe = useCallback(async () => {
    if (!currentUser) return;
    try {
      setPushState('activating');
      const reg = await navigator.serviceWorker.ready;
      const res = await fetch('/api/push/subscribe');
      const { vapidPublicKey } = await res.json();
      // Convert VAPID public key from base64url to Uint8Array for subscribe().
      // Without this conversion, Chrome throws 'The provided applicationServerKey is not valid'.
      const keyBytes = urlBase64ToUint8Array(vapidPublicKey);
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: keyBytes,
      });
      const postRes = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-User-Id': currentUser.id, 'X-User-Role': currentUser.role },
        body: JSON.stringify({ subscription: sub }),
      });
      if (!postRes.ok) throw new Error('Server rejected subscription');
      setPushState('active');
    } catch (e: any) {
      console.warn('[push] subscribe failed:', e);
      // If the user explicitly denied, reflect that. Otherwise fall back to inactive.
      if (Notification.permission === 'denied') setPushState('permission_denied');
      else setPushState('inactive');
    }
  }, [currentUser]);

  // User-clicked handler for the "Enable Push" button.
  const handleEnablePush = useCallback(async () => {
    if (!currentUser) return;
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setPushState('unsupported');
      return;
    }
    try {
      setPushState('activating');
      // 1. Ask permission. iOS Safari 16.4+ REQUIRES this to be called from a
      //    user-gesture handler (click) — calling it from a useEffect is rejected.
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') {
        setPushState('permission_denied');
        return;
      }
      // 2. Permission granted → subscribe + save to server.
      await trySubscribe();
    } catch (e) {
      console.warn('[push] enable flow failed:', e);
      setPushState('inactive');
    }
  }, [currentUser, trySubscribe]);

  // On mount + when user changes, (re)check push state.
  useEffect(() => {
    registerAndCheckPush();
  }, [registerAndCheckPush]);

  // Helper: base64url → Uint8Array (VAPID key conversion for subscribe()).
  function urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const out = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) out[i] = rawData.charCodeAt(i);
    return out;
  }

  // Fetch in-app notifications (immediate + poll every 15s)
  // Dismissed notifications are tracked in dismissedRef and filtered out on each poll.
  // New notifications (IDs we haven't seen before across polls) trigger the chime —
  // EXCEPT on the very first poll after mount, which seeds the seen-set silently
  // so we don't blast sound for unread notifications that arrived while the user
  // was away from the app.
  useEffect(() => {
    if (!currentUser) return;
    // Reset the seen-set whenever the user changes (login/logout switch).
    seenNotifIdsRef.current = null;
    const fetchNotifs = () => {
      fetch('/api/notifications?userId=' + currentUser.id)
        .then(r => r.json())
        .then(data => {
          if (Array.isArray(data)) {
            const filtered = data.filter((n: any) => !dismissedRef.current.has(n.id));
            // Detect brand-new IDs vs. previously-seen ones.
            const seen = seenNotifIdsRef.current;
            if (seen === null) {
              // First poll — seed silently.
              seenNotifIdsRef.current = new Set(filtered.map((n: any) => n.id));
            } else {
              const newOnes = filtered.filter((n: any) => !seen.has(n.id));
              if (newOnes.length > 0) {
                newOnes.forEach((n: any) => seen.add(n.id));
                playNotifSound();
                // ── IN-APP FALLBACK ──────────────────────────────────────────
                // OS push may be blocked, but we still surface every new
                // notification through a sticky toast + vibration. This is
                // what makes the app actually notify you even when the browser
                // permission is denied.
                newOnes.forEach((n: any) => {
                  // Heuristic: pick the destination page based on the
                  // notification type so the toast's "View" button jumps
                  // somewhere useful.
                  const title = String(n.title || 'New notification');
                  const body = String(n.message || '');
                  const lower = (title + ' ' + body).toLowerCase();
                  let targetPage: PageType | undefined;
                  if (/message|reply|chat/.test(lower)) targetPage = 'messages';
                  else if (/review/.test(lower)) targetPage = 'reviews';
                  else if (/application|apply/.test(lower)) {
                    targetPage = role === 'agent' ? 'agent-applications' : 'client-applications';
                  } else if (/payment/.test(lower)) targetPage = 'payment-taker-dashboard';
                  else if (/support|ticket/.test(lower)) targetPage = 'support';
                  fireInAppNotif({ title, body, notifId: n.id, onClickPage: targetPage });
                });
              }
            }
            useAppStore.getState().setData('notifications', filtered);
          }
        })
        .catch(() => {});
    };
    fetchNotifs();
    notifPollRef.current = setInterval(fetchNotifs, 15000);
    return () => { if (notifPollRef.current) clearInterval(notifPollRef.current); };
  }, [currentUser, playNotifSound]);

  const markSingleRead = useCallback(async (notifId: string) => {
    if (!currentUser) return;
    // Track as dismissed so polling won't bring it back
    dismissedRef.current.add(notifId);
    // Mark as read on server
    fetch('/api/notifications/' + notifId, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'X-User-Id': currentUser.id, 'X-User-Role': currentUser.role }, body: JSON.stringify({ isRead: true }) }).catch(() => {});
    // Remove from local store immediately
    const updated = (notifications || []).filter(n => n.id !== notifId);
    useAppStore.getState().setData('notifications', updated);
  }, [currentUser, notifications]);

  const markAllRead = async () => {
    if (!currentUser || !notifications) return;
    const unread = notifications.filter(n => !n.isRead);
    for (const n of unread) {
      dismissedRef.current.add(n.id);
      fetch('/api/notifications/' + n.id, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'X-User-Id': currentUser.id, 'X-User-Role': currentUser.role }, body: JSON.stringify({ isRead: true }) }).catch(() => {});
    }
    useAppStore.getState().setData('notifications', notifications.map(n => ({ ...n, isRead: true })));
  };

  // Fetch company name + avatar for call center users (and refresh avatar for everyone).
  // This runs on every mount so a freshly uploaded picture shows up in the sidebar
  // without requiring a full page reload.
  useEffect(() => {
    if (!currentUser) return;
    if (currentUser.role === 'client') {
      fetch('/api/users/company-name', { headers: { 'X-User-Id': currentUser.id, 'X-User-Role': currentUser.role } })
        .then(r => r.ok ? r.json() : null)
        .then(d => {
          if (d?.companyName) setDisplayName(d.companyName);
          // Best-effort: also refresh avatar if returned
          // (the /api/users/company-name endpoint currently only returns companyName,
          //  so we leave avatar alone — it is refreshed via updateCurrentUser on upload)
        })
        .catch(() => {});
    } else {
      // For non-clients, the personal name is the display name
      setDisplayName(currentUser.name || null);
    }
  }, [currentUser, updateCurrentUser]);

  const effectiveName = displayName || currentUser?.name || 'User';
  const initials = effectiveName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  const avatarUrl = currentUser?.avatar || null;

  // Parse the current user's verification tiers (from the store / login response)
  const myTiers: VerificationTier[] = Array.isArray(currentUser?.verificationTiers)
    ? (currentUser.verificationTiers as VerificationTier[])
    : [];
  const myTopTier = topVerificationTier(myTiers);

  return (
    <div className="min-h-screen flex bg-gray-50">
      <VerifiedBadgeStyles />
      {sidebarOpen && <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />}
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
          {/* PWA install button — shown when: (a) browser has fired beforeinstallprompt
              (Chrome/Edge/Android), OR (b) we're on iOS Safari so the user needs
              a hint to use Share → Add to Home Screen. Hidden once installed. */}
          {!isInstalled && (installPromptEvent || isIosSafari) && (
            <button
              onClick={() => installPromptEvent ? handleInstallClick() : setShowIosHint(true)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-[#16A34A] bg-[#16A34A]/10 hover:bg-[#16A34A]/20 transition-colors w-full text-left mb-1 border border-[#16A34A]/30"
              title="Install Gig Solutions as an app"
            >
              <Download className="h-4 w-4 shrink-0" />
              <span>Install App</span>
            </button>
          )}
          {isInstalled && (
            <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-green-400/70 w-full text-left mb-1">
              <Check className="h-4 w-4 shrink-0" />
              <span>App Installed</span>
            </div>
          )}
          {/* ── Test Notification button ──────────────────────────────────────
              This is the simplest, most reliable feedback path: it fires a
              sticky on-screen toast + chime + vibration. It needs NO browser
              permission, so it works regardless of whether OS push is granted
              or blocked. Use it to verify the in-app fallback works on this
              device. */}
          <button
            onClick={() => {
              playNotifSound();
              fireInAppNotif({
                title: 'Test notification ✓',
                body: 'If you can see this banner and hear the chime, in-app notifications are working. You will get one of these every time a new message arrives.',
                onClickPage: 'messages',
              });
            }}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-[#16A34A] bg-[#16A34A]/10 hover:bg-[#16A34A]/20 transition-colors w-full text-left mb-1 border border-[#16A34A]/30"
            title="Fire a test in-app notification (toast + sound + vibration)"
          >
            <FlaskConical className="h-4 w-4 shrink-0" />
            <span>Test Notification</span>
          </button>
          {/* ── OS push status button ───────────────────────────────────────────
              Secondary, low-emphasis. OS-level push (system tray notifications
              when the app is fully closed) is OPTIONAL — in-app notifications
              above work regardless. We intentionally do NOT show a scary red
              'Push Blocked' button anymore — if permission is denied we show
              a neutral 'OS Push Off' badge instead, and clicking it just
              tries to enable (which will silently no-op if the browser has
              the permission hard-blocked). */}
          {pushState !== 'unsupported' && pushState !== 'permission_denied' && (
            <button
              onClick={() => { if (pushState === 'inactive') handleEnablePush(); }}
              disabled={pushState === 'activating' || pushState === 'active' || pushState === 'checking'}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors w-full text-left mb-1 border',
                pushState === 'active' && 'text-green-400 bg-green-500/5 border-green-500/20',
                pushState === 'activating' && 'text-yellow-400 bg-yellow-500/5 border-yellow-500/20 animate-pulse',
                pushState === 'inactive' && 'text-gray-400 hover:bg-white/8 hover:text-white border-transparent',
                pushState === 'checking' && 'text-gray-500 border-transparent'
              )}
              title={
                pushState === 'active' ? 'OS push is ON. You will receive system-tray notifications even when the app is closed.'
                : pushState === 'activating' ? 'Enabling OS push notifications…'
                : pushState === 'inactive' ? 'Tap to enable system-tray notifications (optional — in-app notifications above already work without this)'
                : 'Checking OS push status…'
              }
            >
              {pushState === 'active' || pushState === 'activating'
                ? <BellRing className="h-4 w-4 shrink-0" />
                : <BellOff className="h-4 w-4 shrink-0" />}
              <span>
                {pushState === 'active' ? 'OS Push Active'
                  : pushState === 'activating' ? 'Enabling…'
                  : pushState === 'inactive' ? 'Enable OS Push'
                  : 'Checking…'}
              </span>
            </button>
          )}
          {pushState === 'permission_denied' && (
            <div
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-400 border border-white/5 w-full text-left mb-1"
              title="System-tray push is blocked in Chrome. In-app notifications (toast + sound + vibration) still work — just keep this site open in a tab. To re-enable OS push: Chrome → lock icon → Site settings → Notifications → Allow."
            >
              <BellOff className="h-4 w-4 shrink-0" />
              <span>OS Push off (in-app still works)</span>
            </div>
          )}
          {pushState === 'unsupported' && !isSecureContext && (
            <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-500 w-full text-left mb-1" title="System-tray push requires HTTPS. In-app notifications above still work — they just need the tab to be open.">
              <BellOff className="h-4 w-4 shrink-0" />
              <span>OS Push needs HTTPS</span>
            </div>
          )}
          <button
            onClick={() => setNotifSoundPref(notifSoundPref === 'on' ? 'off' : 'on')}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-400 hover:bg-white/8 hover:text-white transition-colors w-full text-left mb-1"
            title={notifSoundPref === 'on' ? 'Mute notification sounds' : 'Unmute notification sounds'}
          >
            {notifSoundPref === 'on'
              ? <Volume2 className="h-4 w-4 shrink-0" />
              : <VolumeX className="h-4 w-4 shrink-0" />}
            <span>{notifSoundPref === 'on' ? 'Sound On' : 'Sound Muted'}</span>
          </button>
          <button onClick={() => navigateTo('home')} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-400 hover:bg-white/8 hover:text-white transition-colors w-full text-left">
            <ArrowLeft className="h-4 w-4 shrink-0" /><span>Back to Website</span>
          </button>
        </div>
        {/* iOS hint modal — simple inline prompt explaining Share → Add to Home Screen. */}
        {showIosHint && (
          <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4" onClick={() => setShowIosHint(false)}>
            <div className="bg-white rounded-xl shadow-2xl p-6 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Install on iPhone</h3>
              <p className="text-sm text-gray-600 mb-4">
                iOS doesn’t support our one-tap install button. To add Gig Solutions to your Home Screen:
              </p>
              <ol className="text-sm text-gray-700 space-y-2 mb-4 list-decimal list-inside">
                <li>Tap the <span className="font-semibold">Share</span> icon at the bottom of Safari.</li>
                <li>Scroll and tap <span className="font-semibold">Add to Home Screen</span>.</li>
                <li>Tap <span className="font-semibold">Add</span> in the top-right corner.</li>
              </ol>
              <p className="text-xs text-gray-500 mb-4">Once installed, push notifications will appear in your phone’s notification tray.</p>
              <Button onClick={() => setShowIosHint(false)} className="w-full bg-[#16A34A] hover:bg-[#16A34A]/90 text-white">Got it</Button>
            </div>
          </div>
        )}
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
                <Button variant="ghost" className="gap-2 px-2 h-9 relative">
                  <div className="relative">
                    <Avatar className="h-7 w-7">
                      {avatarUrl && <AvatarImage src={avatarUrl} alt={effectiveName} />}
                      <AvatarFallback className="bg-[#16A34A] text-white text-xs font-semibold">{initials}</AvatarFallback>
                    </Avatar>
                    {myTopTier && (
                      <span className="absolute -bottom-1 -right-1">
                        <VerifiedBadge tier={myTopTier} iconOnly size="xs" verifiedAt={currentUser?.verifiedAt} />
                      </span>
                    )}
                  </div>
                  <span className="hidden sm:inline text-sm font-medium text-gray-700 max-w-[120px] truncate">{effectiveName}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <div className="px-2 py-1.5"><p className="text-sm font-medium">{effectiveName}</p><p className="text-xs text-muted-foreground">{currentUser?.email}</p><p className="text-xs text-[#16A34A] capitalize">{currentUser?.role?.replace('_', ' ')}</p></div>
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