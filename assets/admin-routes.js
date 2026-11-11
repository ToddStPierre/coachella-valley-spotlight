/* Admin: the USPS carrier routes behind every postcard (Spotlight HQ > Mail routes, stats.html in admin mode).
   Reads data/routes.js. Each card has "Copy routes" (one per line, the ZIP-route format the 9x12 planner and print team use),
   and there is a CSV of every route. Routes are not secret (the city report pages list them), but this view is admin only. */
(function () {
  var admin = (new URLSearchParams(location.search).get("admin") || (function () { try { return sessionStorage.getItem("cvs_admin"); } catch (e) { return null; } })());
  if (!admin || window.CVS_IS_REPORT) return;
  var C = window.CVS_ROUTES || [], out = document.getElementById("st-out"); if (!out || !C.length) return;
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function n(x) { return Number(x).toLocaleString(); }
  function copy(text, btn) {
    var done = function () { var t = btn.textContent; btn.textContent = "Copied"; setTimeout(function () { btn.textContent = t; }, 1500); };
    if (navigator.clipboard) navigator.clipboard.writeText(text).then(done, function () { fallback(); }); else fallback();
    function fallback() { var a = document.createElement("textarea"); a.value = text; document.body.appendChild(a); a.select(); try { document.execCommand("copy"); done(); } catch (e) {} a.remove(); }
  }
  var box = document.createElement("div"); box.id = "routes-admin";
  var live = C.filter(function (c) { return c.status === "live"; }), wait = C.filter(function (c) { return c.status !== "live"; });
  function card(c) {
    return '<div class="card" style="padding:20px;margin-bottom:16px">' +
      '<div style="display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;align-items:baseline">' +
      '<div><h3 style="margin:0">' + esc(c.name) + '</h3><p class="risk" style="margin:4px 0 0">' + (c.status === "live" ? "Live card" : "Waitlist (planned)") + " &middot; " + n(c.homes) + " homes &middot; " + n(c.doors) + " every door &middot; " + c.routes.length + " routes &middot; drops at " + esc(c.postOffices.join(" + ")) + (c.postOffices.length > 1 ? " Post Offices ($25 extra drop)" : " Post Office") + "</p></div>" +
      '<div style="display:flex;gap:8px;flex-wrap:wrap"><button type="button" class="btn" data-copy="' + esc(c.id) + '">Copy routes</button>' +
      (c.status !== "live" ? '<a class="btn btn-ghost" href="mailing-area-' + esc(c.id) + '" target="_blank" rel="noopener">Report page &#8599;</a>' : "") + "</div></div>" +
      '<table class="stats-table" style="margin-top:12px"><thead><tr><th style="text-align:left">Route</th><th>Homes</th><th>Every door</th><th style="text-align:left">Post Office</th></tr></thead><tbody>' +
      c.routes.map(function (r) { return '<tr><td style="font-family:var(--mono,monospace)">' + esc(r.r) + '</td><td style="text-align:center">' + n(r.homes) + '</td><td style="text-align:center">' + n(r.doors) + "</td><td>" + esc(r.po) + "</td></tr>"; }).join("") +
      "</tbody></table></div>";
  }
  box.innerHTML = '<div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:20px"><a class="btn btn-ghost" href="https://9x12method.com/eddm-route-planner/" target="_blank" rel="noopener">Open the 9x12 route planner &#8599;</a><button type="button" class="btn btn-ghost" data-csv>Download all routes (CSV)</button></div>' +
    '<p class="risk" style="margin-bottom:24px">Order every card as <b>Homes only</b>. Counts are from USPS on Nov 11, 2026 and drift a little over time, so paste the routes into the planner to see today&rsquo;s numbers before you order.</p>' +
    '<h2 class="month-head"><span class="stripe-mini"></span>Live cards</h2>' + live.map(card).join("") +
    '<h2 class="month-head" style="margin-top:32px"><span class="stripe-mini"></span>Waitlist cities</h2>' + wait.map(card).join("");
  out.before(box);
  box.addEventListener("click", function (e) {
    var b = e.target.closest("[data-copy]");
    if (b) { var c = C.filter(function (x) { return x.id === b.getAttribute("data-copy"); })[0]; if (c) copy(c.routes.map(function (r) { return r.r; }).join("\n"), b); return; }
    if (e.target.closest("[data-csv]")) {
      var rows = [["card", "status", "route", "homes", "every_door", "post_office"]];
      C.forEach(function (c) { c.routes.forEach(function (r) { rows.push([c.name, c.status, r.r, r.homes, r.doors, r.po]); }); });
      var blob = new Blob([rows.map(function (r) { return r.map(function (v) { return '"' + String(v).replace(/"/g, '""') + '"'; }).join(","); }).join("\n")], { type: "text/csv" });
      var a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "spotlight-mail-routes.csv"; document.body.appendChild(a); a.click(); a.remove();
    }
  });
})();
