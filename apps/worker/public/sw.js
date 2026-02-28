if (!self.define) {
  let a,
    s = {};
  const e = (e, i) => (
    (e = new URL(e + ".js", i).href),
    s[e] ||
      new Promise((s) => {
        if ("document" in self) {
          const a = document.createElement("script");
          ((a.src = e), (a.onload = s), document.head.appendChild(a));
        } else ((a = e), importScripts(e), s());
      }).then(() => {
        let a = s[e];
        if (!a) throw new Error(`Module ${e} didn’t register its module`);
        return a;
      })
  );
  self.define = (i, n) => {
    const t =
      a ||
      ("document" in self ? document.currentScript.src : "") ||
      location.href;
    if (s[t]) return;
    let c = {};
    const r = (a) => e(a, t),
      o = { module: { uri: t }, exports: c, require: r };
    s[t] = Promise.all(i.map((a) => o[a] || r(a))).then((a) => (n(...a), c));
  };
}
define(["./workbox-4a226231"], function (a) {
  "use strict";
  (importScripts(),
    self.skipWaiting(),
    a.clientsClaim(),
    a.precacheAndRoute(
      [
        {
          url: "/_next/app-build-manifest.json",
          revision: "725401c2dec43c1f79e0ab5d83dd40f8",
        },
        {
          url: "/_next/static/IJaC1mhiHmosrKbinaaqx/_buildManifest.js",
          revision: "c155cce658e53418dec34664328b51ac",
        },
        {
          url: "/_next/static/IJaC1mhiHmosrKbinaaqx/_ssgManifest.js",
          revision: "b6652df95db52feb4daf4eca35380933",
        },
        {
          url: "/_next/static/chunks/117-3bb8b5f52faa523d.js",
          revision: "IJaC1mhiHmosrKbinaaqx",
        },
        {
          url: "/_next/static/chunks/145-09002b753a0f4a48.js",
          revision: "IJaC1mhiHmosrKbinaaqx",
        },
        {
          url: "/_next/static/chunks/266-84dac3a4d29b8fba.js",
          revision: "IJaC1mhiHmosrKbinaaqx",
        },
        {
          url: "/_next/static/chunks/343-61bb41550b0402d9.js",
          revision: "IJaC1mhiHmosrKbinaaqx",
        },
        {
          url: "/_next/static/chunks/389-6a5188ce1eb42c1d.js",
          revision: "IJaC1mhiHmosrKbinaaqx",
        },
        {
          url: "/_next/static/chunks/394-de6c1d3cb95df004.js",
          revision: "IJaC1mhiHmosrKbinaaqx",
        },
        {
          url: "/_next/static/chunks/405-4124cbde96dd1cc5.js",
          revision: "IJaC1mhiHmosrKbinaaqx",
        },
        {
          url: "/_next/static/chunks/469-1d78e4b072d8090c.js",
          revision: "IJaC1mhiHmosrKbinaaqx",
        },
        {
          url: "/_next/static/chunks/757.c22436d0466ffa60.js",
          revision: "c22436d0466ffa60",
        },
        {
          url: "/_next/static/chunks/874-6b1b50a060b1ab05.js",
          revision: "IJaC1mhiHmosrKbinaaqx",
        },
        {
          url: "/_next/static/chunks/94-779353ecd3f91b00.js",
          revision: "IJaC1mhiHmosrKbinaaqx",
        },
        {
          url: "/_next/static/chunks/993.ec628f100c80469c.js",
          revision: "ec628f100c80469c",
        },
        {
          url: "/_next/static/chunks/app/_not-found/page-a5cad56980e65cd6.js",
          revision: "IJaC1mhiHmosrKbinaaqx",
        },
        {
          url: "/_next/static/chunks/app/actions/page-c36ec58b8a1175d6.js",
          revision: "IJaC1mhiHmosrKbinaaqx",
        },
        {
          url: "/_next/static/chunks/app/actions/view/page-5363971025f48345.js",
          revision: "IJaC1mhiHmosrKbinaaqx",
        },
        {
          url: "/_next/static/chunks/app/announcements/page-5dd55178ab0393d7.js",
          revision: "IJaC1mhiHmosrKbinaaqx",
        },
        {
          url: "/_next/static/chunks/app/education/page-9c78af828c0599b1.js",
          revision: "IJaC1mhiHmosrKbinaaqx",
        },
        {
          url: "/_next/static/chunks/app/education/quiz-take/page-bed754c2bd512b61.js",
          revision: "IJaC1mhiHmosrKbinaaqx",
        },
        {
          url: "/_next/static/chunks/app/education/view/page-aab48f2737df4c8e.js",
          revision: "IJaC1mhiHmosrKbinaaqx",
        },
        {
          url: "/_next/static/chunks/app/home/page-8696e78666cd7bf4.js",
          revision: "IJaC1mhiHmosrKbinaaqx",
        },
        {
          url: "/_next/static/chunks/app/layout-4de70a2a3f488572.js",
          revision: "IJaC1mhiHmosrKbinaaqx",
        },
        {
          url: "/_next/static/chunks/app/login/page-2e7dd402b1683964.js",
          revision: "IJaC1mhiHmosrKbinaaqx",
        },
        {
          url: "/_next/static/chunks/app/page-a8244cd73926c010.js",
          revision: "IJaC1mhiHmosrKbinaaqx",
        },
        {
          url: "/_next/static/chunks/app/points/page-4e87dd0a6faa631d.js",
          revision: "IJaC1mhiHmosrKbinaaqx",
        },
        {
          url: "/_next/static/chunks/app/posts/new/page-1f9ac987539a874c.js",
          revision: "IJaC1mhiHmosrKbinaaqx",
        },
        {
          url: "/_next/static/chunks/app/posts/page-b1464d4666645637.js",
          revision: "IJaC1mhiHmosrKbinaaqx",
        },
        {
          url: "/_next/static/chunks/app/posts/view/page-09e881674c9eedf4.js",
          revision: "IJaC1mhiHmosrKbinaaqx",
        },
        {
          url: "/_next/static/chunks/app/profile/page-974bd9ad786d4dc6.js",
          revision: "IJaC1mhiHmosrKbinaaqx",
        },
        {
          url: "/_next/static/chunks/app/register/page-834ee743f8acf7e3.js",
          revision: "IJaC1mhiHmosrKbinaaqx",
        },
        {
          url: "/_next/static/chunks/app/votes/page-eef461faa9420341.js",
          revision: "IJaC1mhiHmosrKbinaaqx",
        },
        {
          url: "/_next/static/chunks/fd9d1056-6c3c5b1e091a7145.js",
          revision: "IJaC1mhiHmosrKbinaaqx",
        },
        {
          url: "/_next/static/chunks/framework-3664cab31236a9fa.js",
          revision: "IJaC1mhiHmosrKbinaaqx",
        },
        {
          url: "/_next/static/chunks/main-app-c20c533712067732.js",
          revision: "IJaC1mhiHmosrKbinaaqx",
        },
        {
          url: "/_next/static/chunks/main-f1acc7baa7654164.js",
          revision: "IJaC1mhiHmosrKbinaaqx",
        },
        {
          url: "/_next/static/chunks/pages/_app-72b849fbd24ac258.js",
          revision: "IJaC1mhiHmosrKbinaaqx",
        },
        {
          url: "/_next/static/chunks/pages/_error-7ba65e1336b92748.js",
          revision: "IJaC1mhiHmosrKbinaaqx",
        },
        {
          url: "/_next/static/chunks/polyfills-42372ed130431b0a.js",
          revision: "846118c33b2c0e922d7b3a7676f81f6f",
        },
        {
          url: "/_next/static/chunks/webpack-7b9be3a5e66cfb30.js",
          revision: "IJaC1mhiHmosrKbinaaqx",
        },
        {
          url: "/_next/static/css/79f68f6b9e44a8ec.css",
          revision: "79f68f6b9e44a8ec",
        },
        {
          url: "/icons/icon-192.png",
          revision: "e5e771fba9593a2d51204424b5e1bcf0",
        },
        {
          url: "/icons/icon-512.png",
          revision: "e903933ad601cd320e2657307a901fad",
        },
        { url: "/manifest.json", revision: "97790521e546ac4979514a45a6b65f59" },
        { url: "/robots.txt", revision: "997e9e192dee05ea7dfa93255c04edb9" },
        { url: "/sw-push.js", revision: "031192e2f41962a83f7e1bf35acd906d" },
      ],
      { ignoreURLParametersMatching: [] },
    ),
    a.cleanupOutdatedCaches(),
    a.registerRoute(
      "/",
      new a.NetworkFirst({
        cacheName: "start-url",
        plugins: [
          {
            cacheWillUpdate: async ({
              request: a,
              response: s,
              event: e,
              state: i,
            }) =>
              s && "opaqueredirect" === s.type
                ? new Response(s.body, {
                    status: 200,
                    statusText: "OK",
                    headers: s.headers,
                  })
                : s,
          },
        ],
      }),
      "GET",
    ),
    a.registerRoute(
      ({ url: a, request: s }) =>
        "GET" === s.method && a.pathname.startsWith("/api/"),
      new a.StaleWhileRevalidate({
        cacheName: "api-runtime-cache",
        plugins: [new a.ExpirationPlugin({ maxAgeSeconds: 300 })],
      }),
      "GET",
    ),
    a.registerRoute(
      ({ request: a }) => "image" === a.destination,
      new a.CacheFirst({
        cacheName: "image-runtime-cache",
        plugins: [
          new a.ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 2592e3 }),
        ],
      }),
      "GET",
    ),
    a.registerRoute(
      ({ request: a }) => "navigate" === a.mode,
      new a.NetworkFirst({
        cacheName: "navigation-runtime-cache",
        networkTimeoutSeconds: 3,
        plugins: [],
      }),
      "GET",
    ));
});
