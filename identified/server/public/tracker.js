/* Nano Analytics tracker — IDENTIFIED variant.
 * Stores a persistent device id in localStorage, so the same visitor is
 * recognized across days and visits (NOT anonymous — disclose in your
 * privacy policy; consent may be required, e.g. under GDPR/ePrivacy).
 *
 * Usage:
 *   <script defer src="https://YOUR_HOST/tracker.js" data-site-id="SITE_ID"></script>
 * Custom events:  window.nano.track("signup")
 * Attach identity: window.nano.identify({ email: "a@b.com", name: "Ada", plan: "pro" })
 */
(function () {
  var script = document.currentScript;
  var siteId = script && script.getAttribute("data-site-id");
  if (!siteId) return;
  var endpoint = new URL("/api/collect", script.src).href;

  var KEY = "nano_vid";
  function visitorId() {
    try {
      var v = localStorage.getItem(KEY);
      if (!v) {
        v =
          window.crypto && crypto.randomUUID
            ? crypto.randomUUID().replace(/-/g, "")
            : Date.now().toString(36) + Math.random().toString(36).slice(2, 14);
        localStorage.setItem(KEY, v);
      }
      return v;
    } catch (e) {
      return null; // storage blocked → server falls back to an anonymous daily hash
    }
  }
  var vid = visitorId();

  function post(url, payload) {
    payload.siteId = siteId;
    if (vid) payload.visitorId = vid;
    fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      credentials: "omit",
      keepalive: true,
    });
  }

  function send(payload) {
    payload.url = location.href;
    post(endpoint, payload);
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
    identify: function (props) {
      props = props || {};
      var traits = {};
      for (var k in props) {
        if (k !== "email" && k !== "name") traits[k] = props[k];
      }
      post(endpoint + "/identify", {
        email: props.email,
        name: props.name,
        traits: traits,
      });
    },
    reset: function () {
      // e.g. on logout: forget this device's identity going forward
      try {
        localStorage.removeItem(KEY);
      } catch (e) {}
      vid = visitorId();
    },
  };

  pageview();
})();
