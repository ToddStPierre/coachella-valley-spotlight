/* Admin: site visitors, resident email signups and the La Quinta / Indio route waitlist. Shown on stats.html?admin=KEY */
(function () {
  var API = "https://cvs-tracker.toddstpierre.workers.dev";
  var admin = new URLSearchParams(location.search).get("admin"); if (!admin) return;
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function csv(rows, cols) {
    return [cols.join(",")].concat(rows.map(function (r) { return cols.map(function (c) { return '"' + String(r[c] == null ? "" : r[c]).replace(/"/g, '""') + '"'; }).join(","); })).join("\n");
  }
  // Site visitors (counted by app.js on every page; no longer shown publicly)
  var vis = document.createElement("div"); vis.id = "visitors-admin"; vis.style.marginBottom = "40px";
  document.getElementById("st-out").before(vis);
  fetch(API + "/visitors?v=" + Date.now()).then(function (r) { return r.json(); }).then(function (v) {
    vis.innerHTML = '<h2 class="month-head"><span class="stripe-mini"></span>Site visitors</h2>' +
      '<div class="stats"><div class="stat"><b>' + (v.today || 0).toLocaleString() + '</b><span>Visitors today</span></div>' +
      '<div class="stat"><b>' + (v.month || 0).toLocaleString() + '</b><span>Visits this month</span></div></div>' +
      '<p class="risk" style="margin-top:12px">Today counts each browser once. This month adds up each day&rsquo;s visitors, so someone who came on 3 days counts 3 times. Bots are not counted. Pacific time.</p>';
  }).catch(function () {});

  var box = document.createElement("div"); box.id = "signups-admin"; box.style.marginTop = "48px";
  document.getElementById("st-out").after(box);
  fetch(API + "/admin/signups?key=" + encodeURIComponent(admin)).then(function (r) { return r.json(); }).then(function (d) {
    if (d.error) return;
    var news = d.signups.filter(function (s) { return s.kind === "news"; }), wait = d.signups.filter(function (s) { return s.kind === "waitlist"; });
    var byCity = {}; news.forEach(function (s) { var c = s.city || "Not given"; byCity[c] = (byCity[c] || 0) + 1; });
    var cities = Object.keys(byCity).sort(function (a, b) { return byCity[b] - byCity[a]; });
    box.innerHTML = '<h2 class="month-head"><span class="stripe-mini"></span>Email signups</h2>' +
      '<div class="stats" style="margin-bottom:16px"><div class="stat"><b>' + news.length + '</b><span>Residents on the list</span></div>' +
      cities.slice(0, 3).map(function (c) { return '<div class="stat"><b>' + byCity[c] + '</b><span>' + esc(c) + '</span></div>'; }).join("") + '</div>' +
      '<p><button class="btn" data-dl="news"' + (news.length ? "" : " disabled") + '>Download email list (CSV)</button></p>' +
      '<h2 class="month-head"><span class="stripe-mini"></span>La Quinta and Indio waitlist</h2>' +
      '<div class="table-scroll"><table class="stats-table"><thead><tr><th>Business</th><th>Contact</th><th>Route</th><th>Type</th><th>Joined</th></tr></thead><tbody>' +
      (wait.map(function (s) { return '<tr><td><strong>' + esc(s.business) + '</strong></td><td>' + esc(s.name) + '<br><a href="mailto:' + esc(s.email) + '">' + esc(s.email) + '</a><br>' + esc(s.phone) + '</td><td>' + esc(s.city) + '</td><td>' + esc(s.category) + '</td><td>' + esc(s.created_at.slice(0, 10)) + '</td></tr>'; }).join("") || '<tr><td colspan="5">No one on the waitlist yet.</td></tr>') +
      '</tbody></table></div>' + (wait.length ? '<p style="margin-top:12px"><button class="btn btn-ghost" data-dl="waitlist">Download waitlist (CSV)</button></p>' : "");
    box.addEventListener("click", function (e) {
      var b = e.target.closest("[data-dl]"); if (!b) return;
      var rows = b.dataset.dl === "news" ? news : wait;
      var cols = b.dataset.dl === "news" ? ["email", "city", "created_at", "page"] : ["business", "name", "email", "phone", "city", "category", "created_at"];
      var a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([csv(rows, cols)], { type: "text/csv" }));
      a.download = "cv-spotlight-" + b.dataset.dl + "-" + new Date().toISOString().slice(0, 10) + ".csv"; a.click();
    });
  }).catch(function () {});
})();
