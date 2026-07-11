// src/index.ts
var endpoint = null;
var siteId = null;
var lastPath = null;
var inBrowser = typeof window !== "undefined" && typeof document !== "undefined";
function send(payload) {
  if (!inBrowser || !endpoint || !siteId) return;
  try {
    fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...payload, siteId, url: location.href }),
      credentials: "omit",
      keepalive: true
    }).catch(() => {
    });
  } catch {
  }
}
function page() {
  if (!inBrowser || location.pathname === lastPath) return;
  lastPath = location.pathname;
  send({ type: "pageview", referrer: document.referrer });
}
function track(name) {
  send({ type: "event", name: String(name) });
}
function init(options) {
  if (!inBrowser || endpoint) return;
  siteId = options.siteId;
  endpoint = new URL("/api/collect", options.host).href;
  if (options.autoTrack === false) return;
  const hook = (method) => {
    const original = history[method].bind(history);
    history[method] = (...args) => {
      original(...args);
      page();
    };
  };
  hook("pushState");
  hook("replaceState");
  window.addEventListener("popstate", page);
  page();
}
export {
  init,
  page,
  track
};
