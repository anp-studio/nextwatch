self.addEventListener('install', () => self.skipWaiting())

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

// A fetch handler is required for the app to be installable (beforeinstallprompt).
self.addEventListener('fetch', () => {
  // Pass-through: let the network handle every request (no offline caching for now).
})
