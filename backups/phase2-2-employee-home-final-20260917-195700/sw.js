const CACHE_NAME = 'basma-pwa-cache-v2.1.0';
const ASSETS_TO_CACHE = [
  '/',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // للطلبات النمطية عبر شبكة الأونلاين
  if (event.request.method !== 'GET' || event.request.url.includes('/api/')) {
    return;
  }

  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return caches.match('/');
      });
    })
  );
});

// ====================================================
// WEB PUSH NOTIFICATIONS HANDLER (Phase 10.8)
// ====================================================

self.addEventListener('push', (event) => {
  if (!event.data) {
    console.log('[SW] Push event received with no data.');
    return;
  }

  try {
    const payload = event.data.json();
    const title = payload.title || 'تطبيق بصمة';
    const options = {
      body: payload.body || 'لديك تنبيه جديد من تطبيق بصمة',
      icon: payload.icon || '/icons/icon-192x192.png',
      badge: payload.badge || '/icons/badge-72x72.png',
      tag: payload.tag || payload.data?.notificationId || 'basma-push-notification',
      data: payload.data || { url: '/' },
      renotify: true,
      vibrate: [100, 50, 100],
    };

    event.waitUntil(
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
        // Foreground Deduplication Policy:
        // If an active PWA window is open and visible (foreground),
        // we allow client SSE to handle UI Toast notifications to avoid duplicate noise.
        const isAppVisibleInForeground = clientList.some(
          (client) => client.visibilityState === 'visible'
        );

        if (isAppVisibleInForeground) {
          console.log('[SW] App is currently visible in foreground. Suppressing system push banner to prevent duplicate noise with SSE.');
          return;
        }

        // App is in background, closed, or phone locked -> Show OS Notification
        return self.registration.showNotification(title, options);
      })
    );
  } catch (err) {
    console.error('[SW] Error parsing push notification payload:', err);
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          if ('navigate' in client) {
            client.navigate(targetUrl);
          }
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});

