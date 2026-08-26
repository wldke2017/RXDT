// RXDT Exchange - Service Worker
// Handles: Web Push Notifications + PWA install

const CACHE_NAME = 'rxdt-v1';

// ── Push Notification Handler ──────────────────────────────────────────────
self.addEventListener('push', function (event) {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { title: 'RXDT Exchange', body: event.data ? event.data.text() : 'You have a new message' };
  }

  const title = data.title || 'RXDT Exchange';
  const options = {
    body: data.body || 'You have a new message from support',
    icon: '/assets/images/rxdt_logo.png',
    badge: '/assets/images/rxdt_logo.png',
    tag: data.tag || 'rxdt-chat',
    renotify: true,
    // If it's an admin alert, use an aggressive long vibration pattern and force interaction
    vibrate: data.isAdmin ? [500, 200, 500, 200, 500, 200, 1000] : [200, 100, 200],
    requireInteraction: data.isAdmin ? true : false,
    data: {
      url: data.url || '/#/home'
    }
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// ── Notification Click Handler ─────────────────────────────────────────────
self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
      // If app is already open, focus it and navigate
      for (const client of clientList) {
        if ('focus' in client) {
          client.focus();
          if ('navigate' in client) client.navigate(targetUrl);
          return;
        }
      }
      // Otherwise open a new window
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

// ── Basic Install/Activate (no aggressive caching) ────────────────────────
self.addEventListener('install', function (event) {
  self.skipWaiting();
});

self.addEventListener('activate', function (event) {
  event.waitUntil(clients.claim());
});
