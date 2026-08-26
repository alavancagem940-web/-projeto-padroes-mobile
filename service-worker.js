const CACHE = "esportes-virtuais-mobile-v14-fix3x0-cache";

const ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./scripts/backup/backup.js",
  "./scripts/dados/armazenamento.js",
  "./scripts/dados/sincronizacao.js?v=20260826-fix3x0-2",
  "./scripts/historico/historico.js",
  "./scripts/analise/calculos.js",
  "./scripts/mercados/resultado-1x2.js",
  "./scripts/mercados/ambos-marcam.js",
  "./scripts/mercados/over-under-0.5.js",
  "./scripts/mercados/over-under-1.5.js",
  "./scripts/mercados/over-under-2.5.js",
  "./scripts/mercados/over-under-3.5.js",
  "./scripts/mercados/over-3.5.js",
  "./scripts/mercados/placar-exato.js",
  "./scripts/mercados/gols-exatos.js",
  "./scripts/analise/padroes.js",
  "./scripts/analise/relogio-partidas.js",
  "./scripts/analise/temporal.js",
  "./scripts/analise/previsoes.js",
  "./scripts/desempenho/green-red.js",
  "./scripts/desempenho/palpites-registrados.js",
  "./scripts/aprendizado/aprendizado.js",
  "./scripts/interface/interface.js?v=20260826-fix3x0-2",
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
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);
  const ehArquivoAtualizavel =
    event.request.mode === "navigate" ||
    url.pathname.endsWith("/index.html") ||
    url.pathname.endsWith(".js");

  if (ehArquivoAtualizavel) {
    event.respondWith(
      fetch(event.request, { cache: "no-store" })
        .then(response => {
          if (response && response.ok) {
            const copia = response.clone();
            caches.open(CACHE).then(cache => cache.put(event.request, copia));
          }
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request))
  );
});
