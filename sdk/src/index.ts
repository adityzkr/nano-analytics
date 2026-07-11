export interface InitOptions {
  /** Site ID from your Nano Analytics dashboard. */
  siteId: string;
  /** Origin of your analytics server, e.g. "https://analytics.example.com". */
  host: string;
  /**
   * Automatically track pageviews, including SPA route changes via the
   * History API. Default: true. Set false to call page() yourself
   * (e.g. from your router's navigation hook).
   */
  autoTrack?: boolean;
}

let endpoint: string | null = null;
let siteId: string | null = null;
let lastPath: string | null = null;

const inBrowser = typeof window !== "undefined" && typeof document !== "undefined";

function send(payload: Record<string, unknown>) {
  if (!inBrowser || !endpoint || !siteId) return;
  try {
    fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...payload, siteId, url: location.href }),
      credentials: "omit",
      keepalive: true,
    }).catch(() => {});
  } catch {
    /* never let analytics break the host app */
  }
}

/**
 * Track a pageview for the current URL. Called automatically when
 * autoTrack is on; call manually after navigation otherwise.
 */
export function page() {
  if (!inBrowser || location.pathname === lastPath) return;
  lastPath = location.pathname;
  send({ type: "pageview", referrer: document.referrer });
}

/** Track a custom event, e.g. track("signup"). */
export function track(name: string) {
  send({ type: "event", name: String(name) });
}

/**
 * Initialize the SDK. Call once, as early as possible (safe to call in
 * SSR code — it becomes a no-op outside the browser).
 */
export function init(options: InitOptions) {
  if (!inBrowser || endpoint) return; // idempotent, SSR-safe
  siteId = options.siteId;
  endpoint = new URL("/api/collect", options.host).href;

  if (options.autoTrack === false) return;

  const hook = (method: "pushState" | "replaceState") => {
    const original = history[method].bind(history);
    history[method] = (...args: Parameters<History["pushState"]>) => {
      original(...args);
      page();
    };
  };
  hook("pushState");
  hook("replaceState");
  window.addEventListener("popstate", page);

  page();
}
