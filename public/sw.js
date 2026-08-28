// Service Worker for Gig Solutions Push Notifications + PWA shell

const NOTIFICATION_ICON = '/notification-icon.png';     // 192x192 PNG
const NOTIFICATION_BADGE = '/notification-badge.png';   // 72x72 monochrome PNG (Android status bar)

// Bump on every behavior change so existing clients re-activate the SW.
// v3: ensures push events fire for installed PWAs even when no client tab is open.
const SW_CACHE = 'gig-sw-v4';

// --- Lifecycle --------------------------------------------------------------
self.addEventListener('install', (event) => {
  // Pre-cache the notification icon + badge + chime so the first push
  // doesn't have to do a network round-trip before showing/sounding.
  event.waitUntil((async () => {
    const cache = await caches.open(SW_CACHE);
    try { await cache.addAll([NOTIFICATION_ICON, NOTIFICATION_BADGE, '/sounds/notification.mp3']); } catch (_) {}
    self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  // Claim all open clients immediately so the new SW controls the page on
  // first load (no "refresh to activate" needed).
  event.waitUntil((async () => {
    // Purge old caches from previous SW versions.
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== SW_CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

// --- Push -------------------------------------------------------------------
// Helper: ask all open client windows to play the notification sound.
// Service workers can't play <audio> directly (no DOM access), so we
// postMessage the client and let it own the Audio element. Each client
// checks the user's mute preference (persisted in localStorage) before
// actually playing — so muting still works.
async function notifyClientsPlaySound() {
  try {
    const clientList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of clientList) {
      client.postMessage({ type: 'PLAY_NOTIF_SOUND' });
    }
  } catch (_) { /* best-effort */ }
}

self.addEventListener('push', (event) => {
  let data = { title: 'Gig Solutions', body: 'You have a new notification' };

  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body || 'You have a new notification',
    icon: NOTIFICATION_ICON,       // large icon shown in the notification body
    badge: NOTIFICATION_BADGE,     // monochrome badge in the status bar (Android)
    vibrate: [200, 100, 200],
    data: {
      url: data.url || '/',
      notifId: data.id || null,
    },
    actions: data.actions || [],
    // silent: false is the default; we explicitly set it so browsers
    // that auto-silence SW notifications don't suppress the system chime.
    silent: false,
    // Tag groups related notifications so a flood of pushes doesn't pile
    // up in the user's system tray — newest rewrites oldest.
    tag: data.tag || 'gig-solutions-default',
    renotify: true,
    // Android-only: notification channel importance. Most browsers ignore
    // this, but Chrome on Android respects it for high-priority channels.
    requireInteraction: false,
  };

  event.waitUntil((async () => {
    // Ask open client windows to play the in-app chime (if not muted).
    await notifyClientsPlaySound();
    // Show the system notification. This is what makes the notification
    // appear in the mobile phone's notification tray / shade.
    await self.registration.showNotification(data.title || 'Gig Solutions', options);
  })());
});

// --- Notification click -----------------------------------------------------
// Tapping the notification in the mobile tray should open/foreground the
// website and navigate to the notification's target URL.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const urlToOpen = (event.notification.data && event.notification.data.url) || '/';
  const targetUrl = new URL(urlToOpen, self.location.origin).href;

  event.waitUntil((async () => {
    const clientList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });

    // 1) If a tab is already open on our origin, navigate it to the target URL + focus.
    for (const client of clientList) {
      if (client.url.startsWith(self.location.origin) && 'focus' in client) {
        try { await client.navigate(targetUrl); } catch (_) { /* navigate may fail if cross-origin */ }
        return client.focus();
      }
    }

    // 2) Otherwise, open a fresh window pointing at the target URL.
    try {
      const newClient = await self.clients.openWindow(targetUrl);
      if (newClient && 'focus' in newClient) return newClient.focus();
    } catch (_) { /* openWindow may be blocked; fall through */ }

    // 3) Last-resort: focus any client we can find.
    for (const client of clientList) {
      if ('focus' in client) return client.focus();
    }
  })());
});

// --- Message channel (page → SW) --------------------------------------------
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
