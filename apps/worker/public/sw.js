if (!self.define) {
  let e,
    s = {};
  const n = (n, a) => (
    (n = new URL(n + ".js", a).href),
    s[n] ||
      new Promise((s) => {
        if ("document" in self) {
          const e = document.createElement("script");
          ((e.src = n), (e.onload = s), document.head.appendChild(e));
        } else ((e = n), importScripts(n), s());
      }).then(() => {
        let e = s[n];
        if (!e) throw new Error(`Module ${n} didn’t register its module`);
        return e;
      })
  );
  self.define = (a, c) => {
    const i =
      e ||
      ("document" in self ? document.currentScript.src : "") ||
      location.href;
    if (s[i]) return;
    let t = {};
    const r = (e) => n(e, i),
      u = { module: { uri: i }, exports: t, require: r };
    s[i] = Promise.all(a.map((e) => u[e] || r(e))).then((e) => (c(...e), t));
  };
}
define(["./workbox-4a226231"], function (e) {
  "use strict";
  (importScripts(),
    self.skipWaiting(),
    e.clientsClaim(),
    e.precacheAndRoute(
      [
        {
          url: "/_next/app-build-manifest.json",
          revision: "b7f570fedfd932e65404dc917d210ad2",
        },
        {
          url: "/_next/static/RpcAnSfFj4_vaeG00GR00/_buildManifest.js",
          revision: "c155cce658e53418dec34664328b51ac",
        },
        {
          url: "/_next/static/RpcAnSfFj4_vaeG00GR00/_ssgManifest.js",
          revision: "b6652df95db52feb4daf4eca35380933",
        },
        {
          url: "/_next/static/chunks/117-3bb8b5f52faa523d.js",
          revision: "RpcAnSfFj4_vaeG00GR00",
        },
        {
          url: "/_next/static/chunks/145-09002b753a0f4a48.js",
          revision: "RpcAnSfFj4_vaeG00GR00",
        },
        {
          url: "/_next/static/chunks/266-84dac3a4d29b8fba.js",
          revision: "RpcAnSfFj4_vaeG00GR00",
        },
        {
          url: "/_next/static/chunks/343-61bb41550b0402d9.js",
          revision: "RpcAnSfFj4_vaeG00GR00",
        },
        {
          url: "/_next/static/chunks/389-6a5188ce1eb42c1d.js",
          revision: "RpcAnSfFj4_vaeG00GR00",
        },
        {
          url: "/_next/static/chunks/394-de6c1d3cb95df004.js",
          revision: "RpcAnSfFj4_vaeG00GR00",
        },
        {
          url: "/_next/static/chunks/405-4124cbde96dd1cc5.js",
          revision: "RpcAnSfFj4_vaeG00GR00",
        },
        {
          url: "/_next/static/chunks/469-1d78e4b072d8090c.js",
          revision: "RpcAnSfFj4_vaeG00GR00",
        },
        {
          url: "/_next/static/chunks/757.c22436d0466ffa60.js",
          revision: "c22436d0466ffa60",
        },
        {
          url: "/_next/static/chunks/874-6b1b50a060b1ab05.js",
          revision: "RpcAnSfFj4_vaeG00GR00",
        },
        {
          url: "/_next/static/chunks/94-779353ecd3f91b00.js",
          revision: "RpcAnSfFj4_vaeG00GR00",
        },
        {
          url: "/_next/static/chunks/993.ec628f100c80469c.js",
          revision: "ec628f100c80469c",
        },
        {
          url: "/_next/static/chunks/app/_not-found/page-a5cad56980e65cd6.js",
          revision: "RpcAnSfFj4_vaeG00GR00",
        },
        {
          url: "/_next/static/chunks/app/actions/page-c36ec58b8a1175d6.js",
          revision: "RpcAnSfFj4_vaeG00GR00",
        },
        {
          url: "/_next/static/chunks/app/actions/view/page-5363971025f48345.js",
          revision: "RpcAnSfFj4_vaeG00GR00",
        },
        {
          url: "/_next/static/chunks/app/announcements/page-5dd55178ab0393d7.js",
          revision: "RpcAnSfFj4_vaeG00GR00",
        },
        {
          url: "/_next/static/chunks/app/education/page-9c78af828c0599b1.js",
          revision: "RpcAnSfFj4_vaeG00GR00",
        },
        {
          url: "/_next/static/chunks/app/education/quiz-take/page-bed754c2bd512b61.js",
          revision: "RpcAnSfFj4_vaeG00GR00",
        },
        {
          url: "/_next/static/chunks/app/education/view/page-aab48f2737df4c8e.js",
          revision: "RpcAnSfFj4_vaeG00GR00",
        },
        {
          url: "/_next/static/chunks/app/home/page-8696e78666cd7bf4.js",
          revision: "RpcAnSfFj4_vaeG00GR00",
        },
        {
          url: "/_next/static/chunks/app/layout-4de70a2a3f488572.js",
          revision: "RpcAnSfFj4_vaeG00GR00",
        },
        {
          url: "/_next/static/chunks/app/login/page-2e7dd402b1683964.js",
          revision: "RpcAnSfFj4_vaeG00GR00",
        },
        {
          url: "/_next/static/chunks/app/page-a8244cd73926c010.js",
          revision: "RpcAnSfFj4_vaeG00GR00",
        },
        {
          url: "/_next/static/chunks/app/points/page-4e87dd0a6faa631d.js",
          revision: "RpcAnSfFj4_vaeG00GR00",
        },
        {
          url: "/_next/static/chunks/app/posts/new/page-1f9ac987539a874c.js",
          revision: "RpcAnSfFj4_vaeG00GR00",
        },
        {
          url: "/_next/static/chunks/app/posts/page-b1464d4666645637.js",
          revision: "RpcAnSfFj4_vaeG00GR00",
        },
        {
          url: "/_next/static/chunks/app/posts/view/page-09e881674c9eedf4.js",
          revision: "RpcAnSfFj4_vaeG00GR00",
        },
        {
          url: "/_next/static/chunks/app/profile/page-974bd9ad786d4dc6.js",
          revision: "RpcAnSfFj4_vaeG00GR00",
        },
        {
          url: "/_next/static/chunks/app/register/page-834ee743f8acf7e3.js",
          revision: "RpcAnSfFj4_vaeG00GR00",
        },
        {
          url: "/_next/static/chunks/app/votes/page-eef461faa9420341.js",
          revision: "RpcAnSfFj4_vaeG00GR00",
        },
        {
          url: "/_next/static/chunks/fd9d1056-6c3c5b1e091a7145.js",
          revision: "RpcAnSfFj4_vaeG00GR00",
        },
        {
          url: "/_next/static/chunks/framework-3664cab31236a9fa.js",
          revision: "RpcAnSfFj4_vaeG00GR00",
        },
        {
          url: "/_next/static/chunks/main-app-c20c533712067732.js",
          revision: "RpcAnSfFj4_vaeG00GR00",
        },
        {
          url: "/_next/static/chunks/main-f1acc7baa7654164.js",
          revision: "RpcAnSfFj4_vaeG00GR00",
        },
        {
          url: "/_next/static/chunks/pages/_app-72b849fbd24ac258.js",
          revision: "RpcAnSfFj4_vaeG00GR00",
        },
        {
          url: "/_next/static/chunks/pages/_error-7ba65e1336b92748.js",
          revision: "RpcAnSfFj4_vaeG00GR00",
        },
        {
          url: "/_next/static/chunks/polyfills-42372ed130431b0a.js",
          revision: "846118c33b2c0e922d7b3a7676f81f6f",
        },
        {
          url: "/_next/static/chunks/webpack-7b9be3a5e66cfb30.js",
          revision: "RpcAnSfFj4_vaeG00GR00",
        },
        {
          url: "/_next/static/css/f3d4c8557ae71ee9.css",
          revision: "f3d4c8557ae71ee9",
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
    e.cleanupOutdatedCaches(),
    e.registerRoute(
      "/",
      new e.NetworkFirst({
        cacheName: "start-url",
        plugins: [
          {
            cacheWillUpdate: async ({
              request: e,
              response: s,
              event: n,
              state: a,
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
    e.registerRoute(
      ({ url: e, request: s }) =>
        "GET" === s.method && e.pathname.startsWith("/api/"),
      new e.StaleWhileRevalidate({
        cacheName: "api-runtime-cache",
        plugins: [new e.ExpirationPlugin({ maxAgeSeconds: 300 })],
      }),
      "GET",
    ),
    e.registerRoute(
      ({ request: e }) => "image" === e.destination,
      new e.CacheFirst({
        cacheName: "image-runtime-cache",
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 2592e3 }),
        ],
      }),
      "GET",
    ),
    e.registerRoute(
      ({ request: e }) => "navigate" === e.mode,
      new e.NetworkFirst({
        cacheName: "navigation-runtime-cache",
        networkTimeoutSeconds: 3,
        plugins: [],
      }),
      "GET",
    ));
});
