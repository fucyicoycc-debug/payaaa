const V="owner-panel-v1";
const CACHE=[
  "./",
  "./owner-panel.html",
  "./owner-panel-manifest.json",
  "https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&display=swap",
  "https://cdnjs.cloudflare.com/ajax/libs/react/18.2.0/umd/react.production.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/react-dom/18.2.0/umd/react-dom.production.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/babel-standalone/7.23.2/babel.min.js"
];

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(V).then(c => Promise.all(CACHE.map(u => c.add(u).catch(() => {}))))
  );
  self.skipWaiting();
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.hostname.includes("googleapis.com") || url.hostname.includes("firebaseio.com") ||
      url.hostname.includes("firestore.googleapis.com") || url.hostname.includes("gstatic.com")) {
    return;
  }
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req).then(res => {
        const copy = res.clone();
        caches.open(V).then(c => c.put("./owner-panel.html", copy));
        return res;
      }).catch(() => caches.match("./owner-panel.html"))
    );
    return;
  }
  e.respondWith(
    caches.match(req).then(cached => {
      const network = fetch(req).then(res => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(V).then(c => c.put(req, copy));
        }
        return res;
      }).catch(() => cached);
      return cached || network;
    })
  );
});
