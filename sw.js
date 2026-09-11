/* بيّاع — Service Worker v5 */
const VERSION = "bayyaa-v5";
const CACHE_NAME = VERSION;

// الملفات الأساسية للتخزين المؤقت
const CORE_ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&display=swap",
  "https://cdnjs.cloudflare.com/ajax/libs/react/18.2.0/umd/react.production.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/react-dom/18.2.0/umd/react-dom.production.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/babel-standalone/7.23.2/babel.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/jsQR/1.4.0/jsQR.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/quagga/0.12.1/quagga.min.js",
  "https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js",
  "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore-compat.js",
];

// ── Install: خزّن الملفات الأساسية ──
self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      Promise.allSettled(CORE_ASSETS.map(url =>
        cache.add(url).catch(() => console.warn("Cache miss:", url))
      ))
    ).then(() => self.skipWaiting())
  );
});

// ── Activate: احذف الكاش القديم ──
self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// ── Fetch ──
self.addEventListener("fetch", e => {
  // تجاهل Firebase وطلبات POST
  if (e.request.method !== "GET") return;
  if (e.request.url.includes("firestore.googleapis.com")) return;
  if (e.request.url.includes("firebase")) return;

  // الصفحة الرئيسية (index.html): دائمًا Network First — حتى تظهر آخر نسخة
  // مرفوعة فورًا لكل المستخدمين دون انتظار مسح الكاش يدويًا. تُستخدم النسخة
  // المخزّنة فقط عند انقطاع الاتصال بالإنترنت
  if (e.request.mode === "navigate" || e.request.destination === "document") {
    e.respondWith(
      fetch(e.request).then(response => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
        }
        return response;
      }).catch(() =>
        caches.match(e.request).then(cached => cached || caches.match("./index.html"))
      )
    );
    return;
  }

  // بقية الملفات الثابتة (مكتبات، خطوط...): Cache First كما كانت — لا تتغيّر
  // غالبًا، فيبقى هذا أسرع ويوفّر بيانات الإنترنت
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(response => {
        if (response.ok && response.type !== "opaque") {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
        }
        return response;
      }).catch(() => {
        // إذا فشل الاتصال أعد الصفحة الرئيسية
        if (e.request.destination === "document") {
          return caches.match("./index.html");
        }
      });
    })
  );
});

// ── Background Sync ──
self.addEventListener("sync", e => {
  if (e.tag === "sync-data") {
    console.log("Background sync triggered");
  }
});

// ── Push Notifications (للمستقبل) ──
self.addEventListener("push", e => {
  const data = e.data?.json() || {};
  e.waitUntil(
    self.registration.showNotification(data.title || "بيّاع", {
      body: data.body || "",
      icon: "./manifest.json",
      dir: "rtl",
      lang: "ar",
      badge: "./manifest.json",
    })
  );
});
