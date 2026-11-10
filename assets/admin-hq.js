/* Spotlight HQ core (admin mode on stats.html, 2026-11-09). Loads before the other new admin files.
   window.HQ gives them: the admin key, the two Worker addresses, esc(), money(), toast(), drawer(), api() and icons.
   Does nothing on a business's report link or without an admin key. */
(function () {
  var admin = (new URLSearchParams(location.search).get("admin") || (function () { try { return sessionStorage.getItem("cvs_admin"); } catch (e) { return null; } })());
  if (!admin || window.CVS_IS_REPORT) return;
  document.body.classList.add("is-admin");

  var I = function (d) { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d + "</svg>"; };
  var ICONS = {
    home: I('<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V20h14V9.5"/><path d="M10 20v-6h4v6"/>'),
    target: I('<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.2" fill="currentColor"/>'),
    users: I('<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.6-3.6 3.3-5.5 6.5-5.5s5.9 1.9 6.5 5.5"/><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8"/><path d="M18 14.8c2 .7 3.2 2.4 3.5 5.2"/>'),
    card: I('<rect x="2.5" y="5" width="19" height="14" rx="2"/><path d="M2.5 12h19"/><path d="M12 5v14"/>'),
    calendar: I('<rect x="3" y="4.5" width="18" height="16" rx="2"/><path d="M3 9.5h18M8 2.5v4M16 2.5v4"/>'),
    list: I('<path d="M8 6h13M8 12h13M8 18h13"/><circle cx="3.5" cy="6" r="1"/><circle cx="3.5" cy="12" r="1"/><circle cx="3.5" cy="18" r="1"/>'),
    inbox: I('<path d="M3 13h5l1.5 3h5L16 13h5"/><path d="M5.5 5h13L21 13v6H3v-6z"/>'),
    chart: I('<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>'),
    shield: I('<path d="M12 3 4.5 6v5.5c0 4.6 3.2 8.2 7.5 9.5 4.3-1.3 7.5-4.9 7.5-9.5V6z"/><path d="m9 12 2 2 4-4"/>'),
    search: I('<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>'),
    plus: I('<path d="M12 5v14M5 12h14"/>'),
    ext: I('<path d="M14 4h6v6"/><path d="M20 4 10 14"/><path d="M19 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5"/>'),
    money: I('<rect x="2.5" y="6" width="19" height="12" rx="2"/><circle cx="12" cy="12" r="2.6"/><path d="M6 9.5v5M18 9.5v5"/>'),
    eye: I('<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>'),
    star: I('<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>'),
    mail: I('<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3.5 6 8.5 7 8.5-7"/>'),
    edit: I('<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>'),
    menu: I('<path d="M4 7h16M4 12h16M4 17h16"/>'),
    globe: I('<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z"/>'),
    bolt: I('<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>'),
    qr: I('<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3h-3zM20 14v.01M14 20h.01M17 17h4v4h-4"/>')
  };

  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function money(cents, opts) {
    var n = (cents || 0) / 100, neg = n < 0; n = Math.abs(n);
    var s = "$" + n.toLocaleString("en-US", { minimumFractionDigits: opts && opts.cents ? 2 : 0, maximumFractionDigits: opts && opts.cents ? 2 : 0 });
    return neg ? "−" + s : s;
  }
  var toastEl, toastT;
  function toast(msg) {
    if (!toastEl) { toastEl = document.createElement("div"); toastEl.className = "hq-toast"; toastEl.setAttribute("role", "status"); document.body.appendChild(toastEl); }
    toastEl.textContent = msg; toastEl.classList.add("on"); clearTimeout(toastT); toastT = setTimeout(function () { toastEl.classList.remove("on"); }, 3200);
  }
  // One right-side drawer at a time. drawer({title, sub, body, foot, onOpen}) → {el, close}
  var cur = null;
  function drawer(o) {
    if (cur) cur.close(true);
    var bg = document.createElement("div"); bg.className = "hq-drawer-bg";
    var d = document.createElement("aside"); d.className = "hq-drawer"; d.setAttribute("role", "dialog"); d.setAttribute("aria-modal", "true"); d.setAttribute("aria-label", o.title);
    d.innerHTML = '<div class="hq-dr-head"><div>' + (o.eyebrow ? '<div class="hq-eyebrow">' + o.eyebrow + "</div>" : "") + "<h2>" + esc(o.title) + "</h2>" + (o.sub ? "<p>" + o.sub + "</p>" : "") +
      '</div><button type="button" class="hq-dr-x" aria-label="Close">&times;</button></div><div class="hq-dr-body">' + o.body + '</div><div class="hq-dr-foot">' + (o.foot || "") + "</div>";
    document.body.appendChild(bg); document.body.appendChild(d);
    var prev = document.activeElement;
    requestAnimationFrame(function () { bg.classList.add("on"); d.classList.add("on"); var f = d.querySelector(".hq-dr-body input:not([type=checkbox]),.hq-dr-body select,.hq-dr-body textarea"); if (f) f.focus({ preventScroll: true }); });
    function key(e) { if (e.key === "Escape") api.close(); }
    var api = {
      el: d,
      close: function (now) {
        document.removeEventListener("keydown", key); bg.classList.remove("on"); d.classList.remove("on");
        setTimeout(function () { bg.remove(); d.remove(); }, now ? 0 : 260); if (cur === api) cur = null; if (prev && prev.focus) prev.focus({ preventScroll: true });
      }
    };
    bg.addEventListener("click", function () { api.close(); });
    d.querySelector(".hq-dr-x").addEventListener("click", function () { api.close(); });
    document.addEventListener("keydown", key);
    cur = api; if (o.onOpen) o.onOpen(d, api);
    return api;
  }
  function post(base, path, body) {
    body.key = admin;
    return fetch(base + path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (d) { if (!r.ok || d.error) throw new Error(d.error || ("Error " + r.status)); return d; }); });
  }
  window.HQ = {
    key: admin,
    TRACKER: "https://cvs-tracker.toddstpierre.workers.dev",
    SPOTS: "https://local-spotlight-reservations.toddstpierre.workers.dev",
    ROUTES: { "el-paseo": "El Paseo", "sun-city-palm-desert": "Sun City Palm Desert" },
    icons: ICONS, esc: esc, money: money, toast: toast, drawer: drawer, post: post,
    dir: function () { return ((window.CVS && window.CVS.directory) || []).filter(function (b) { return !b.sample && b.slug; }); },
    go: function (sec) { location.hash = sec; }
  };
})();
