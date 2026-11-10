/* Admin: left sidebar on stats.html in admin mode (2026-11-09). Shows one section at a time instead of one long scroll.
   Each section is a group of the panels the other admin-*.js files build (found by id, never rebuilt).
   The open section lives in the URL hash (#today, #reports...), so reload and Back work. A link to a panel id
   (e.g. #owners-admin from "Do today") opens that panel's section and scrolls to it.
   Badges are read from the panels themselves (a MutationObserver), so the other scripts don't need to know about this.
   Under 900px the sidebar turns into a sticky tab bar across the top. If this script fails, every panel just shows. */
(function () {
  var admin = (new URLSearchParams(location.search).get("admin") || (function () { try { return sessionStorage.getItem("cvs_admin"); } catch (e) { return null; } })()); if (!admin || window.CVS_IS_REPORT) return;
  var main = document.getElementById("st-out"); if (!main) return;
  var wrap = main.parentNode;

  // [hash, label, panel ids, badge reader]
  function num(sel, re) { var el = document.querySelector(sel); if (!el) return 0; var m = re ? (el.textContent.match(re) || [])[1] : el.textContent; return +m || 0; }
  var SECTIONS = [
    ["today", "Today", ["cockpit-admin", "visitors-admin"], function () { return num("#ck-due-todo b"); }],
    ["reports", "Reports", ["reports-admin"], function () { return document.querySelectorAll("#reports-admin a.btn[data-sent]:not(.btn-ghost)").length; }],
    ["inbox", "Inbox", ["submissions-admin"], function () { return num("#submissions-admin", /\((\d+) new\)/); }],
    ["listings", "Listings", ["st-out", "st-risk"], null],
    ["people", "Owners & people", ["owners-admin", "own-msg", "signups-admin"], function () { return document.querySelectorAll("#owners-admin [data-claim]").length; }],
    ["setup", "Mailing & money", ["mailings-admin", "money-admin", "admin-tools"], null]
  ];
  var risk = wrap.querySelector("p.risk:last-of-type"); if (risk && !risk.id) risk.id = "st-risk";

  document.body.classList.add("is-admin");
  var side = document.createElement("nav"); side.className = "adm-side"; side.setAttribute("aria-label", "Admin sections");
  side.innerHTML = '<span class="adm-side-head">Site admin</span>' +
    SECTIONS.map(function (s) { return '<a href="#' + s[0] + '" data-sec="' + s[0] + '"><span>' + s[1] + '</span><i class="adm-badge" hidden></i></a>'; }).join("") +
    '<a class="adm-side-ext" href="leads.html" target="_blank" rel="noopener">Leads &#8599;</a>';
  var body = document.createElement("div"); body.className = "adm-main";
  var shell = document.createElement("div"); shell.className = "adm-shell";
  shell.appendChild(side); shell.appendChild(body);
  // Everything after the hero text moves into the main column, in its current order.
  var h1 = document.getElementById("st-title");
  var kids = [].slice.call(wrap.children).filter(function (el) { return el.id !== "st-eyebrow" && !el.querySelector("#st-eyebrow") && el.id !== "st-sub"; });
  wrap.appendChild(shell);
  kids.forEach(function (el) { body.appendChild(el); });

  function secOf(id) { return SECTIONS.filter(function (s) { return s[2].indexOf(id) > -1; })[0]; }
  function show(key, scrollTo) {
    var sec = SECTIONS.filter(function (s) { return s[0] === key; })[0] || SECTIONS[0];
    [].forEach.call(body.children, function (el) { el.classList.toggle("adm-off", el !== h1 && sec[2].indexOf(el.id) < 0); });
    if (h1) h1.textContent = sec[1];
    [].forEach.call(side.querySelectorAll("[data-sec]"), function (a) { var on = a.dataset.sec === sec[0]; a.classList.toggle("active", on); if (on) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current"); });
    var target = scrollTo && document.getElementById(scrollTo);
    if (target) target.scrollIntoView({ block: "start" }); else window.scrollTo(0, 0);
  }
  function route() {
    var h = location.hash.slice(1);
    if (!h) return show("today");
    if (SECTIONS.some(function (s) { return s[0] === h; })) return show(h);
    var s = secOf(h); if (s) show(s[0], h);
  }
  window.addEventListener("hashchange", route);
  route();

  // Badges: re-read whenever a panel changes.
  function badges() {
    SECTIONS.forEach(function (s) {
      if (!s[3]) return;
      var n = s[3](), b = side.querySelector('[data-sec="' + s[0] + '"] .adm-badge');
      b.hidden = !n; b.textContent = n > 99 ? "99+" : n;
    });
  }
  var t = 0;
  if ("MutationObserver" in window) new MutationObserver(function () { clearTimeout(t); t = setTimeout(badges, 150); }).observe(body, { childList: true, subtree: true, characterData: true });
  badges();
})();
