/**
 * Service Worker for Image Locker App
 * Provides offline functionality and intelligent caching
 */

const CACHE_NAME = 'image-locker-v1.0.0';
const STATIC_CACHE_NAME = 'image-locker-static-v1.0.0';

// Resources to cache for offline functionality
const STATIC_ASSETS = [
    './',
    './index.html',
    './main.js',
    './cryptoWorker.js',
    './sw.js',
    'https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap',
    'https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Mu72xKOzY.woff2'
];

// Install event - cache static assets
self.addEventListener('install', event => {
    console.log('[SW] Installing service worker');
    
    event.waitUntil(
        caches.open(STATIC_CACHE_NAME)
            .then(cache => {
                console.log('[SW] Caching static assets');
                return cache.addAll(STATIC_ASSETS);
            })
            .catch(error => {
                console.error('[SW] Failed to cache static assets:', error);
            })
    );
    
    // Take control immediately
    self.skipWaiting();
});

// Activate event - cleanup old caches
self.addEventListener('activate', event => {
    console.log('[SW] Activating service worker');
    
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== STATIC_CACHE_NAME && cacheName !== CACHE_NAME) {
                        console.log('[SW] Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    
    // Take control of all clients immediately
    return self.clients.claim();
});

// Fetch event - handle requests with cache-first strategy for static assets
self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);
    
    // Only handle same-origin requests and font requests
    if (url.origin !== location.origin && !url.hostname.includes('googleapis.com') && !url.hostname.includes('gstatic.com')) {
        return;
    }
    
    // Skip requests for dynamic content that shouldn't be cached
    if (event.request.method !== 'GET') {
        return;
    }
    
    event.respondWith(
        handleFetch(event.request)
    );
});

/**
 * Handle fetch requests with intelligent caching strategy
 */
async function handleFetch(request) {
    try {
        // Check if request is for static assets
        const isStaticAsset = STATIC_ASSETS.some(asset => 
            request.url.includes(asset) || request.url.endsWith(asset)
        );
        
        if (isStaticAsset) {
            // Cache-first strategy for static assets
            return await cacheFirst(request);
        } else {
            // Network-first strategy for dynamic content
            return await networkFirst(request);
        }
    } catch (error) {
        console.error('[SW] Fetch error:', error);
        return new Response('Offline', { status: 503 });
    }
}

/**
 * Cache-first strategy: Check cache first, fallback to network
 */
async function cacheFirst(request) {
    const cached = await caches.match(request);
    if (cached) {
        return cached;
    }
    
    try {
        const response = await fetch(request);
        if (response.ok) {
            const cache = await caches.open(STATIC_CACHE_NAME);
            cache.put(request, response.clone());
        }
        return response;
    } catch (error) {
        console.error('[SW] Network request failed:', error);
        throw error;
    }
}

/**
 * Network-first strategy: Try network first, fallback to cache
 */
async function networkFirst(request) {
    try {
        const response = await fetch(request);
        if (response.ok) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, response.clone());
        }
        return response;
    } catch (error) {
        console.error('[SW] Network failed, trying cache:', error);
        const cached = await caches.match(request);
        if (cached) {
            return cached;
        }
        throw error;
    }
}

// Background sync for failed uploads/downloads (if needed in future)
self.addEventListener('sync', event => {
    console.log('[SW] Background sync event:', event.tag);
    
    if (event.tag === 'background-encryption') {
        event.waitUntil(handleBackgroundEncryption());
    }
});

/**
 * Handle background encryption tasks (placeholder for future enhancement)
 */
async function handleBackgroundEncryption() {
    console.log('[SW] Processing background encryption tasks');
    // Future: Handle queued encryption tasks when online
}

// Push notifications (placeholder for future enhancement)
self.addEventListener('push', event => {
    console.log('[SW] Push event received:', event);
    
    const options = {
        body: 'Image processing completed',
        icon: './icon-192x192.png',
        badge: './icon-72x72.png',
        data: {
            url: './'
        }
    };
    
    event.waitUntil(
        self.registration.showNotification('Image Locker', options)
    );
});

// Handle notification clicks
self.addEventListener('notificationclick', event => {
    console.log('[SW] Notification clicked:', event);
    
    event.notification.close();
    
    event.waitUntil(
        clients.openWindow(event.notification.data.url || './')
    );
});

// Handle messages from main thread
self.addEventListener('message', event => {
    // Verify origin for security
    if (event.origin !== self.location.origin && event.origin !== 'null') {
        console.warn('[SW] Message rejected from unauthorized origin:', event.origin);
        return;
    }
    
    console.log('[SW] Message received:', event.data);
    
    if (event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
    
    if (event.data.type === 'GET_VERSION') {
        event.source.postMessage({
            type: 'VERSION',
            version: CACHE_NAME
        });
    }
});
