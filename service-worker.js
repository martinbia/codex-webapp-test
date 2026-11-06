"use strict";

// Increment this cache name when changing the offline asset list or release.
const CACHE_NAME = "mockup-demo-v3";
const APP_ASSETS = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./video-library.js",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(APP_ASSETS);
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(
      names.filter((name) => name.startsWith("mockup-demo-") && name !== CACHE_NAME)
        .map((name) => caches.delete(name))
    );
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const requestUrl = new URL(request.url);
  const scopeUrl = new URL(self.registration.scope);

  // Never intercept Google Fonts, analytics, or other cross-origin requests.
  if (requestUrl.origin !== scopeUrl.origin ||
      !requestUrl.pathname.startsWith(scopeUrl.pathname)) return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);

    // Network-first keeps the demo up-to-date whenever online.
    try {
      const response = await fetch(request);
      if (response.ok) {
        // Navigation URLs may include paths; always retain the offline entry.
        const cacheKey = request.mode === "navigate" ? "./index.html" : request;
        await cache.put(cacheKey, response.clone());
      }
      return response;
    } catch {
      // GitHub Pages works offline when the content has been cached.
      const cacheKey = request.mode === "navigate" ? "./index.html" : request;
      return (await cache.match(cacheKey)) || Response.error();
    }
  })());
});
