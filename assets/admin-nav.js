/* Admin: sticky section tabs on stats.html in admin mode. Jumps to each admin panel and highlights the one in view. */
(function () {
  var admin = (new URLSearchParams(location.search).get("admin") || (function () { try { return sessionStorage.getItem("cvs_admin"); } catch (e) { return null; } })()); if (!admin || window.CVS_IS_REPORT) return;
  var TABS = [["cockpit-admin", "Sales"], ["reports-admin", "Reports"], ["submissions-admin", "Inbox"], ["st-out", "Listings"], ["owners-admin", "Owners"], ["mailings-admin", "Mailing dates"], ["signups-admin", "Signups"], ["visitors-admin", "Visitors"]];
  var nav = document.createElement("nav"); nav.className = "adm-nav"; nav.setAttribute("aria-label", "Admin sections");
  var tabs = TABS.filter(function (t) { return document.getElementById(t[0]); }).sort(function (a, b) { return document.getElementById(a[0]).compareDocumentPosition(document.getElementById(b[0])) & 4 ? -1 : 1; });
  nav.innerHTML = tabs.map(function (t) { return '<a href="#' + t[0] + '" data-tab="' + t[0] + '">' + t[1] + '</a>'; }).join("");
  var first = document.getElementById("admin-tools") || document.getElementById("cockpit-admin");
  first.before(nav);
  tabs.forEach(function (t) { document.getElementById(t[0]).classList.add("adm-section"); });
  if (!("IntersectionObserver" in window)) return;
  var io = new IntersectionObserver(function (es) {
    es.forEach(function (e) {
      if (!e.isIntersecting) return;
      [].forEach.call(nav.querySelectorAll("a"), function (a) { a.classList.toggle("active", a.dataset.tab === e.target.id); });
    });
  }, { rootMargin: "-140px 0px -60% 0px" });
  tabs.forEach(function (t) { io.observe(document.getElementById(t[0])); });
})();
