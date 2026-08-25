const CACHE = "esportes-virtuais-mobile-v1";
const ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./scripts/backup/backup.js",
  "./scripts/dados/armazenamento.js",
  "./scripts/historico/historico.js",
  "./scripts/analise/calculos.js",
  "./scripts/mercados/resultado-1x2.js",
  "./scripts/mercados/ambos-marcam.js",
  "./scripts/mercados/over-under-0.5.js",
  "./scripts/mercados/over-under-1.5.js",
  "./scripts/mercados/over-under-2.5.js",
  "./scripts/mercados/over-under-3.5.js",
  "./scripts/mercados/placar-exato.js",
  "./scripts/mercados/gols-exatos.js",
  "./scripts/analise/padroes.js",
  "./scripts/analise/previsoes.js",
  "./scripts/desempenho/green-red.js",
  "./scripts/aprendizado/aprendizado.js",
  "./scripts/interface/interface.js",
  "./scripts/js/iniciador.js"
];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    caches.match(event.request).then(cached =>
      cached || fetch(event.request).catch(() => caches.match("./index.html"))
    )
  );
});
