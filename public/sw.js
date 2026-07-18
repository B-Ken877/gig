// Service Worker for Gig Solutions Push Notifications

const NOTIFICATION_ICON = '/favicon.ico';
const NOTIFICATION_SOUND = '/sounds/notification.mp3';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

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
    icon: NOTIFICATION_ICON,
    badge: NOTIFICATION_ICON,
    vibrate: [200, 100, 200],
    data: data.url || '/',
    actions: data.actions || [],
    // silent: false is the default; we explicitly set it so browsers
    // that auto-silence SW notifications don't suppress the system chime.
    silent: false,
    // Tag groups related notifications so a flood of pushes doesn't pile
    // up in the user's system tray — newest rewrites oldest.
    tag: data.tag || 'gig-solutions-default',
    renotify: true,
  };

  event.waitUntil((async () => {
    // Ask open client windows to play the in-app chime (if not muted).
    await notifyClientsPlaySound();
    // Show the system notification.
    await self.registration.showNotification(data.title || 'Gig Solutions', options);
  })());
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const urlToOpen = event.notification.data || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Focus existing tab if open
      for (const client of clientList) {
        if (client.url.includes('167.86.124.101') && 'focus' in client) {
          client.navigate(urlToOpen);
          return client.focus();
        }
      }
      // Open new tab
      return self.clients.openWindow(urlToOpen);
    })
  );
});

// When a new SW takes over, pre-cache the notification sound so the
// first push doesn't have to do a network round-trip before playing.
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
