// GPS Financeiro Service Worker v2 - Performance Optimized
const CACHE_NAME = 'gps-financeiro-v2';
const OFFLINE_URL = '/offline.html';

// Critical resources to cache immediately
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
    '/js/notifications.js',
    '/shared/tailwind-config.js',
    '/shared/theme.js',
    '/shared/styles.css',
    '/manifest.json',
    '/offline.html',
    '/icons/icon-192x192.png',
    '/icons/icon-512x512.png'
];

// Fonts and CDN resources to cache
const CDN_CACHE_URLS = [
    'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
    'https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap',
    'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap'
];

// Install event - cache essential files
self.addEventListener('install', (event) => {
    console.log('[SW] Installing v2...');

    event.waitUntil(
        caches.open(CACHE_NAME).then(async (cache) => {
            console.log('[SW] Pre-caching local files');

            // Cache local files first
            try {
                await cache.addAll(PRECACHE_URLS);
            } catch (err) {
                console.log('[SW] Some local files failed to cache:', err);
            }

            // Cache CDN resources (fonts) - don't fail if these don't work
            for (const url of CDN_CACHE_URLS) {
                try {
                    const response = await fetch(url, { mode: 'cors' });
                    if (response.ok) {
                        await cache.put(url, response);
                    }
                } catch (err) {
                    console.log('[SW] CDN cache failed for:', url);
                }
            }
        })
    );

    self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
    console.log('[SW] Activating v2...');

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

    self.clients.claim();
});

// Fetch event with optimized caching strategies
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Skip non-GET requests
    if (request.method !== 'GET') return;

    // Skip Firebase API requests (need fresh data)
    if (url.hostname.includes('firebaseio.com') ||
        url.hostname.includes('firestore.googleapis.com') ||
        url.hostname.includes('identitytoolkit.googleapis.com') ||
        url.hostname.includes('securetoken.googleapis.com')) {
        return;
    }

    // Stale-while-revalidate for CDN resources (Tailwind, fonts)
    if (url.hostname === 'cdn.tailwindcss.com' ||
        url.hostname === 'fonts.googleapis.com' ||
        url.hostname === 'fonts.gstatic.com') {
        event.respondWith(
            caches.open(CACHE_NAME).then(async (cache) => {
                const cachedResponse = await cache.match(request);

                const fetchPromise = fetch(request).then((networkResponse) => {
                    if (networkResponse.ok) {
                        cache.put(request, networkResponse.clone());
                    }
                    return networkResponse;
                }).catch(() => cachedResponse);

                return cachedResponse || fetchPromise;
            })
        );
        return;
    }

    // Network-first for HTML pages
    if (request.headers.get('Accept')?.includes('text/html')) {
        event.respondWith(
            fetch(request)
                .then((response) => {
                    if (response.ok) {
                        const clone = response.clone();
                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put(request, clone);
                        });
                    }
                    return response;
                })
                .catch(() => {
                    return caches.match(request).then((cached) => {
                        return cached || caches.match(OFFLINE_URL);
                    });
                })
        );
        return;
    }

    // Cache-first for static assets (JS, CSS, images)
    event.respondWith(
        caches.match(request).then((cachedResponse) => {
            if (cachedResponse) {
                return cachedResponse;
            }

            return fetch(request).then((response) => {
                if (response.ok && response.type === 'basic') {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(request, clone);
                    });
                }
                return response;
            }).catch(() => {
                // Return placeholder for images
                if (request.destination === 'image') {
                    return new Response(
                        '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect fill="#18181b" width="100" height="100"/></svg>',
                        { headers: { 'Content-Type': 'image/svg+xml' } }
                    );
                }
            });
        })
    );
});

// Push notifications
self.addEventListener('push', (event) => {
    console.log('[SW] Push received');

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

// Notification click handler
self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    const url = event.notification.data?.url || '/user/Dashboard/dash.html';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            for (const client of clientList) {
                if (client.url.includes(self.registration.scope) && 'focus' in client) {
                    client.navigate(url);
                    return client.focus();
                }
            }
            if (clients.openWindow) {
                return clients.openWindow(url);
            }
        })
    );
});

// Background sync
self.addEventListener('sync', (event) => {
    console.log('[SW] Sync event:', event.tag);

    if (event.tag === 'sync-transactions') {
        event.waitUntil(syncOfflineTransactions());
    }
});

async function syncOfflineTransactions() {
    console.log('[SW] Syncing offline transactions...');
}

// Periodic sync for goal checks
self.addEventListener('periodicsync', (event) => {
    if (event.tag === 'check-goals') {
        event.waitUntil(checkGoalsReset());
    }
});

async function checkGoalsReset() {
    console.log('[SW] Checking goals for reset...');
}

// Message handler
self.addEventListener('message', (event) => {
    if (event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }

    if (event.data.type === 'CACHE_URLS') {
        caches.open(CACHE_NAME).then((cache) => {
            cache.addAll(event.data.urls);
        });
    }
});
