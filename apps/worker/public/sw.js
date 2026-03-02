if (!self.define) {
  let s,
    e = {};
  const a = (a, c) => (
    (a = new URL(a + ".js", c).href),
    e[a] ||
      new Promise((e) => {
        if ("document" in self) {
          const s = document.createElement("script");
          ((s.src = a), (s.onload = e), document.head.appendChild(s));
        } else ((s = a), importScripts(a), e());
      }).then(() => {
        let s = e[a];
        if (!s) throw new Error(`Module ${a} didn’t register its module`);
        return s;
      })
  );
  self.define = (c, n) => {
    const i =
      s ||
      ("document" in self ? document.currentScript.src : "") ||
      location.href;
    if (e[i]) return;
    let t = {};
    const f = (s) => a(s, i),
      r = { module: { uri: i }, exports: t, require: f };
    e[i] = Promise.all(c.map((s) => r[s] || f(s))).then((s) => (n(...s), t));
  };
}
define(["./workbox-4a226231"], function (s) {
  "use strict";
  (importScripts(),
    self.skipWaiting(),
    s.clientsClaim(),
    s.precacheAndRoute(
      [
        {
          url: "/_next/app-build-manifest.json",
          revision: "06f19f83af8477b9d43ee498b88d81ea",
        },
        {
          url: "/_next/static/-1aJMajfwf9y7WvZ3Xsc8/_buildManifest.js",
          revision: "c155cce658e53418dec34664328b51ac",
        },
        {
          url: "/_next/static/-1aJMajfwf9y7WvZ3Xsc8/_ssgManifest.js",
          revision: "b6652df95db52feb4daf4eca35380933",
        },
        {
          url: "/_next/static/chunks/117-3bb8b5f52faa523d.js",
          revision: "-1aJMajfwf9y7WvZ3Xsc8",
        },
        {
          url: "/_next/static/chunks/145-09002b753a0f4a48.js",
          revision: "-1aJMajfwf9y7WvZ3Xsc8",
        },
        {
          url: "/_next/static/chunks/266-84dac3a4d29b8fba.js",
          revision: "-1aJMajfwf9y7WvZ3Xsc8",
        },
        {
          url: "/_next/static/chunks/343-0d15a0d3c9486fff.js",
          revision: "-1aJMajfwf9y7WvZ3Xsc8",
        },
        {
          url: "/_next/static/chunks/389-6dc0ce5ff605ff90.js",
          revision: "-1aJMajfwf9y7WvZ3Xsc8",
        },
        {
          url: "/_next/static/chunks/394-de6c1d3cb95df004.js",
          revision: "-1aJMajfwf9y7WvZ3Xsc8",
        },
        {
          url: "/_next/static/chunks/405-4124cbde96dd1cc5.js",
          revision: "-1aJMajfwf9y7WvZ3Xsc8",
        },
        {
          url: "/_next/static/chunks/477-c05d423470619f45.js",
          revision: "-1aJMajfwf9y7WvZ3Xsc8",
        },
        {
          url: "/_next/static/chunks/757.c22436d0466ffa60.js",
          revision: "c22436d0466ffa60",
        },
        {
          url: "/_next/static/chunks/874-6b1b50a060b1ab05.js",
          revision: "-1aJMajfwf9y7WvZ3Xsc8",
        },
        {
          url: "/_next/static/chunks/94-779353ecd3f91b00.js",
          revision: "-1aJMajfwf9y7WvZ3Xsc8",
        },
        {
          url: "/_next/static/chunks/993.ec628f100c80469c.js",
          revision: "ec628f100c80469c",
        },
        {
          url: "/_next/static/chunks/app/_not-found/page-a5cad56980e65cd6.js",
          revision: "-1aJMajfwf9y7WvZ3Xsc8",
        },
        {
          url: "/_next/static/chunks/app/actions/page-274f96c9c68b5fac.js",
          revision: "-1aJMajfwf9y7WvZ3Xsc8",
        },
        {
          url: "/_next/static/chunks/app/actions/view/page-e77fcabc337677e5.js",
          revision: "-1aJMajfwf9y7WvZ3Xsc8",
        },
        {
          url: "/_next/static/chunks/app/announcements/page-5cb855d5556b02f6.js",
          revision: "-1aJMajfwf9y7WvZ3Xsc8",
        },
        {
          url: "/_next/static/chunks/app/education/page-4d674cbf56fa170d.js",
          revision: "-1aJMajfwf9y7WvZ3Xsc8",
        },
        {
          url: "/_next/static/chunks/app/education/quiz-take/page-4e0b41d5ceb96b64.js",
          revision: "-1aJMajfwf9y7WvZ3Xsc8",
        },
        {
          url: "/_next/static/chunks/app/education/view/page-bd32f39b787815e5.js",
          revision: "-1aJMajfwf9y7WvZ3Xsc8",
        },
        {
          url: "/_next/static/chunks/app/home/page-1491c93252da47f2.js",
          revision: "-1aJMajfwf9y7WvZ3Xsc8",
        },
        {
          url: "/_next/static/chunks/app/layout-31d01b01b64ff329.js",
          revision: "-1aJMajfwf9y7WvZ3Xsc8",
        },
        {
          url: "/_next/static/chunks/app/login/page-2e7dd402b1683964.js",
          revision: "-1aJMajfwf9y7WvZ3Xsc8",
        },
        {
          url: "/_next/static/chunks/app/page-7a25af6cd5b60ce4.js",
          revision: "-1aJMajfwf9y7WvZ3Xsc8",
        },
        {
          url: "/_next/static/chunks/app/points/page-7fe2bda5b9ef1a8d.js",
          revision: "-1aJMajfwf9y7WvZ3Xsc8",
        },
        {
          url: "/_next/static/chunks/app/posts/new/page-92cf0e9d10c1250c.js",
          revision: "-1aJMajfwf9y7WvZ3Xsc8",
        },
        {
          url: "/_next/static/chunks/app/posts/page-a63c8dfe3f83f7bd.js",
          revision: "-1aJMajfwf9y7WvZ3Xsc8",
        },
        {
          url: "/_next/static/chunks/app/posts/view/page-5ef7688e9003dd50.js",
          revision: "-1aJMajfwf9y7WvZ3Xsc8",
        },
        {
          url: "/_next/static/chunks/app/profile/page-e76a44618a1415a0.js",
          revision: "-1aJMajfwf9y7WvZ3Xsc8",
        },
        {
          url: "/_next/static/chunks/app/register/page-834ee743f8acf7e3.js",
          revision: "-1aJMajfwf9y7WvZ3Xsc8",
        },
        {
          url: "/_next/static/chunks/app/votes/page-37c103c1804b2b7f.js",
          revision: "-1aJMajfwf9y7WvZ3Xsc8",
        },
        {
          url: "/_next/static/chunks/fd9d1056-6c3c5b1e091a7145.js",
          revision: "-1aJMajfwf9y7WvZ3Xsc8",
        },
        {
          url: "/_next/static/chunks/framework-3664cab31236a9fa.js",
          revision: "-1aJMajfwf9y7WvZ3Xsc8",
        },
        {
          url: "/_next/static/chunks/main-app-c20c533712067732.js",
          revision: "-1aJMajfwf9y7WvZ3Xsc8",
        },
        {
          url: "/_next/static/chunks/main-f1acc7baa7654164.js",
          revision: "-1aJMajfwf9y7WvZ3Xsc8",
        },
        {
          url: "/_next/static/chunks/pages/_app-72b849fbd24ac258.js",
          revision: "-1aJMajfwf9y7WvZ3Xsc8",
        },
        {
          url: "/_next/static/chunks/pages/_error-7ba65e1336b92748.js",
          revision: "-1aJMajfwf9y7WvZ3Xsc8",
        },
        {
          url: "/_next/static/chunks/polyfills-42372ed130431b0a.js",
          revision: "846118c33b2c0e922d7b3a7676f81f6f",
        },
        {
          url: "/_next/static/chunks/webpack-7b9be3a5e66cfb30.js",
          revision: "-1aJMajfwf9y7WvZ3Xsc8",
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
    s.cleanupOutdatedCaches(),
    s.registerRoute(
      "/",
      new s.NetworkFirst({
        cacheName: "start-url",
        plugins: [
          {
            cacheWillUpdate: async ({
              request: s,
              response: e,
              event: a,
              state: c,
            }) =>
              e && "opaqueredirect" === e.type
                ? new Response(e.body, {
                    status: 200,
                    statusText: "OK",
                    headers: e.headers,
                  })
                : e,
          },
        ],
      }),
      "GET",
    ),
    s.registerRoute(
      ({ url: s, request: e }) =>
        "GET" === e.method && s.pathname.startsWith("/api/"),
      new s.StaleWhileRevalidate({
        cacheName: "api-runtime-cache",
        plugins: [new s.ExpirationPlugin({ maxAgeSeconds: 300 })],
      }),
      "GET",
    ),
    s.registerRoute(
      ({ request: s }) => "image" === s.destination,
      new s.CacheFirst({
        cacheName: "image-runtime-cache",
        plugins: [
          new s.ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 2592e3 }),
        ],
      }),
      "GET",
    ),
    s.registerRoute(
      ({ request: s }) => "navigate" === s.mode,
      new s.NetworkFirst({
        cacheName: "navigation-runtime-cache",
        networkTimeoutSeconds: 3,
        plugins: [],
      }),
      "GET",
    ));
});
