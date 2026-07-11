/* Analytics tracker. Usage:
 *   <script defer src="https://YOUR_HOST/tracker.js" data-site-id="SITE_ID"></script>
 * Custom events: window.nano.track("signup", ...)
 */
(function () {
  var script = document.currentScript;
  var siteId = script && script.getAttribute("data-site-id");
  if (!siteId) return;
  var endpoint = new URL("/api/collect", script.src).href;

  function send(payload) {
    payload.siteId = siteId;
    payload.url = location.href;
    fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      credentials: "omit",
      keepalive: true,
    });
  }

  var lastPath = null;
  function pageview() {
    if (location.pathname === lastPath) return;
    lastPath = location.pathname;
    send({ type: "pageview", referrer: document.referrer });
  }

  // SPA support: fire on history navigation too.
  var push = history.pushState;
  history.pushState = function () {
    push.apply(this, arguments);
    pageview();
  };
  window.addEventListener("popstate", pageview);

  window.nano = {
    track: function (name) {
      send({ type: "event", name: String(name) });
    },
  };

  pageview();
})();
