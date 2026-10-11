/**
 * Service Worker - PWA with Workbox
 * Offline-first, background sync, push notifications
 */

import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { registerRoute, setDefaultHandler, setCatchHandler } from 'workbox-routing';
import { NetworkFirst, CacheFirst, StaleWhileRevalidate, NetworkOnly } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';
import { BackgroundSyncPlugin } from 'workbox-background-sync';

// Precache all static assets
precacheAndRoute(self.__WB_MANIFEST || []);
cleanupOutdatedCaches();

// Skip waiting and claim clients immediately
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data && event.data.type === 'CLAIM_CLIENTS') {
    self.clients.claim();
  }
});

// Background sync for mutations
const bgSyncPlugin = new BackgroundSyncPlugin('offline-mutations', {
  maxRetentionTime: 24 * 60, // 24 hours
  onSync: async (queue) => {
    let entry;
    while ((entry = await queue.shiftRequest())) {
      try {
        const response = await fetch(entry.request);
        if (!response.ok) throw new Error(`Sync failed: ${response.status}`);
      } catch (error) {
        await queue.unshiftRequest(entry);
        throw error;
      }
    }
  },
});

// API routes - Network First with background sync for mutations
registerRoute(
  ({ url }) => url.pathname.startsWith('/api/'),
  new NetworkFirst({
    cacheName: 'api-cache',
    networkTimeoutSeconds: 10,
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 200, maxAgeSeconds: 5 * 60 }),
      bgSyncPlugin, // Only applies to non-GET requests
    ],
  }),
  'GET'
);

// API mutations - Network Only with background sync
registerRoute(
  ({ request, url }) => url.pathname.startsWith('/api/') && request.method !== 'GET',
  new NetworkOnly({
    plugins: [bgSyncPlugin],
  })
);

// Static assets - Cache First
registerRoute(
  ({ request }) => request.destination === 'image',
  new CacheFirst({
    cacheName: 'images',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 500, maxAgeSeconds: 30 * 24 * 60 * 60 }),
    ],
  })
);

// Fonts - Cache First
registerRoute(
  ({ request }) => request.destination === 'font',
  new CacheFirst({
    cacheName: 'fonts',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 50, maxAgeSeconds: 365 * 24 * 60 * 60 }),
    ],
  })
);

// JS/CSS - Stale While Revalidate
registerRoute(
  ({ request }) => request.destination === 'script' || request.destination === 'style',
  new StaleWhileRevalidate({
    cacheName: 'static-resources',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 7 * 24 * 60 * 60 }),
    ],
  })
);

// HTML pages - Network First
registerRoute(
  ({ request }) => request.destination === 'document',
  new NetworkFirst({
    cacheName: 'pages',
    networkTimeoutSeconds: 5,
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 50, maxAgeSeconds: 60 * 60 }),
    ],
  })
);

// Default handler for unmatched routes
setDefaultHandler(new NetworkFirst({
  cacheName: 'default',
  plugins: [
    new CacheableResponsePlugin({ statuses: [0, 200] }),
    new ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 60 * 60 }),
  ],
}));

// Catch handler for offline
setCatchHandler(async ({ event }) => {
  // Return offline page for navigation requests
  if (event.request.destination === 'document') {
    return caches.match('/offline.html');
  }
  // Return placeholder for images
  if (event.request.destination === 'image') {
    return caches.match('/assets/img/placeholder.svg');
  }
  return Response.error();
});

// Push notification handling
self.addEventListener('push', (event) => {
  if (!event.data) return;

  const data = event.data.json();
  const options = {
    body: data.body || 'Nova obaveštenje',
    icon: data.icon || '/assets/img/pwa-192.png',
    badge: data.badge || '/assets/img/badge-72.png',
    image: data.image,
    vibrate: data.vibrate || [200, 100, 200],
    data: data.data || {},
    actions: data.actions || [
      { action: 'view', title: 'Pogledaj' },
      { action: 'dismiss', title: 'Zatvori' },
    ],
    requireInteraction: data.requireInteraction || false,
    silent: data.silent || false,
    timestamp: data.timestamp || Date.now(),
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'DALLI Admin', options)
  );
});

// Notification click handling
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const action = event.action;
  const data = event.notification.data || {};
  const url = data.url || '/';

  if (action === 'dismiss') return;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Check if already open
        for (const client of clientList) {
          if (client.url.includes(url) && 'focus' in client) {
            return client.focus();
          }
        }
        // Open new window
        return clients.openWindow(url);
      })
  );
});

// Notification close handling
self.addEventListener('notificationclose', (event) => {
  // Track dismissal if needed
  const data = event.notification.data || {};
  if (data.trackDismissal) {
    fetch('/api/notifications/dismiss', {
      method: 'POST',
      body: JSON.stringify({ notificationId: data.id }),
    }).catch(() => {});
  }
});

// Background fetch for large downloads
self.addEventListener('backgroundfetch', (event) => {
  // Handle background fetch if needed
});

// Periodic sync for data updates
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'sync-data') {
    event.waitUntil(syncData());
  }
});

async function syncData() {
  try {
    // Sync critical data
    await fetch('/api/sync', { method: 'POST' });
  } catch (error) {
    console.error('[SW] Periodic sync failed:', error);
  }
}

// Install event
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open('imperium-offline').then((cache) => {
      return cache.addAll([
        '/offline.html',
        '/assets/img/placeholder.svg',
      ]);
    })
  );
  self.skipWaiting();
});

// Activate event
self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Sync event for background sync
self.addEventListener('sync', (event) => {
  if (event.tag === 'offline-mutations') {
    event.waitUntil(syncMutations());
  }
});

async function syncMutations() {
  const cache = await caches.open('offline-mutations');
  const requests = await cache.keys();

  for (const request of requests) {
    try {
      const response = await fetch(request);
      if (response.ok) {
        await cache.delete(request);
      }
    } catch (error) {
      console.error('[SW] Sync failed for:', request.url, error);
    }
  }
}

// Message handling for cache updates
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(clearAllCaches());
  }
  if (event.data && event.data.type === 'UPDATE_CACHE') {
    event.waitUntil(updateCache(event.data.urls));
  }
});

async function clearAllCaches() {
  const cacheNames = await caches.keys();
  await Promise.all(cacheNames.map(name => caches.delete(name)));
}

async function updateCache(urls) {
  const cache = await caches.open('manual-cache');
  await cache.addAll(urls);
}

console.log('[SW] Service Worker loaded');