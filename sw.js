// GPS Financeiro Service Worker
const CACHE_NAME = 'gps-financeiro-v1';
const OFFLINE_URL = '/offline.html';

// Files to cache immediately
const PRECACHE_URLS = [
    '/',
    '/user/login/login.html',
    '/user/Dashboard/dash.html',
    '/user/sessao/sessao.html',
    '/user/Lancamento/lancamento.html',
    '/user/transacao/transacao.html',
    '/user/metas/meta.html',
    '/user/configuracoes/config.html',
    '/js/firebase-config.js',
    '/js/auth.js',
    '/js/db.js',
    '/js/utils.js',
    '/manifest.json',
    '/offline.html'
];

// External resources to cache (CDN)
const CDN_CACHE = [
    'https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap',
    'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap'
];

// Install event - cache essential files
self.addEventListener('install', (event) => {
    console.log('[SW] Installing...');

    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('[SW] Pre-caching files');
            // Cache local files
            return cache.addAll(PRECACHE_URLS).catch(err => {
                console.log('[SW] Pre-cache failed:', err);
            });
        })
    );

    // Skip waiting to activate immediately
    self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
    console.log('[SW] Activating...');

    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames
                    .filter((name) => name !== CACHE_NAME)
                    .map((name) => {
                        console.log('[SW] Deleting old cache:', name);
                        return caches.delete(name);
                    })
            );
        })
    );

    // Take control of all pages immediately
    self.clients.claim();
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Skip non-GET requests
    if (request.method !== 'GET') return;

    // Skip Firebase API requests (they need fresh data)
    if (url.hostname.includes('firebaseio.com') ||
        url.hostname.includes('googleapis.com') ||
        url.hostname.includes('gstatic.com')) {
        return;
    }

    // Network-first strategy for HTML pages
    if (request.headers.get('Accept').includes('text/html')) {
        event.respondWith(
            fetch(request)
                .then((response) => {
                    // Cache successful responses
                    if (response.ok) {
                        const clone = response.clone();
                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put(request, clone);
                        });
                    }
                    return response;
                })
                .catch(() => {
                    // Return cached version or offline page
                    return caches.match(request).then((cached) => {
                        return cached || caches.match(OFFLINE_URL);
                    });
                })
        );
        return;
    }

    // Cache-first strategy for static assets
    event.respondWith(
        caches.match(request).then((cachedResponse) => {
            if (cachedResponse) {
                // Return cached version
                return cachedResponse;
            }

            // Fetch from network and cache
            return fetch(request).then((response) => {
                if (response.ok) {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(request, clone);
                    });
                }
                return response;
            }).catch(() => {
                // For images, return a placeholder if offline
                if (request.destination === 'image') {
                    return new Response(
                        '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect fill="#1a2c20" width="100" height="100"/></svg>',
                        { headers: { 'Content-Type': 'image/svg+xml' } }
                    );
                }
            });
        })
    );
});

// Firebase Cloud Messaging - Background messages
self.addEventListener('push', (event) => {
    console.log('[SW] Push received:', event);

    if (!event.data) return;

    const data = event.data.json();
    const { title, body, icon, badge, url, tag } = data.notification || data;

    const options = {
        body: body || 'Nova notificação',
        icon: icon || '/icons/icon-192x192.png',
        badge: badge || '/icons/icon-72x72.png',
        vibrate: [200, 100, 200],
        tag: tag || 'gps-financeiro',
        requireInteraction: false,
        data: { url: url || '/user/Dashboard/dash.html' }
    };

    event.waitUntil(
        self.registration.showNotification(title || 'GPS Financeiro', options)
    );
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
    console.log('[SW] Notification clicked:', event);

    event.notification.close();

    const url = event.notification.data?.url || '/user/Dashboard/dash.html';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            // Check if there's already a window open
            for (const client of clientList) {
                if (client.url.includes(self.registration.scope) && 'focus' in client) {
                    client.navigate(url);
                    return client.focus();
                }
            }
            // Open new window
            if (clients.openWindow) {
                return clients.openWindow(url);
            }
        })
    );
});

// Background sync for offline transactions
self.addEventListener('sync', (event) => {
    console.log('[SW] Sync event:', event.tag);

    if (event.tag === 'sync-transactions') {
        event.waitUntil(syncOfflineTransactions());
    }
});

// Sync offline transactions when back online
async function syncOfflineTransactions() {
    // Get offline transactions from IndexedDB
    // This would be implemented with actual IndexedDB operations
    console.log('[SW] Syncing offline transactions...');
}

// Periodic background sync for goal reset checks
self.addEventListener('periodicsync', (event) => {
    console.log('[SW] Periodic sync:', event.tag);

    if (event.tag === 'check-goals') {
        event.waitUntil(checkGoalsReset());
    }
});

// Check if goals need to be reset
async function checkGoalsReset() {
    // This would check goals and send notifications
    console.log('[SW] Checking goals for reset...');
}

// Message handler for communication with main thread
self.addEventListener('message', (event) => {
    console.log('[SW] Message received:', event.data);

    if (event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }

    if (event.data.type === 'CACHE_URLS') {
        caches.open(CACHE_NAME).then((cache) => {
            cache.addAll(event.data.urls);
        });
    }
});
