/* Admin: site visitors, the email list (footer signups + My Spotlight members), the members list and the La Quinta / Indio route waitlist. Shown on stats.html?admin=KEY */
(function () {
  var API = "https://cvs-tracker.toddstpierre.workers.dev";
  var admin = (new URLSearchParams(location.search).get("admin") || (function () { try { return sessionStorage.getItem("cvs_admin"); } catch (e) { return null; } })()); if (!admin || window.CVS_IS_REPORT) return;
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function csv(rows, cols) {
    return [cols.join(",")].concat(rows.map(function (r) { return cols.map(function (c) { return '"' + String(r[c] == null ? "" : r[c]).replace(/"/g, '""') + '"'; }).join(","); })).join("\n");
  }
  // Admin tools: the Leads page (the CRM, now in the tracker; reps sign in to it too).
  var tools = document.createElement("div"); tools.id = "admin-tools";
  tools.style.cssText = "display:flex;gap:10px;flex-wrap:wrap;margin-bottom:32px";
  tools.innerHTML = '<a class="btn" href="leads.html" target="_blank">Leads &#8599;</a>';
  document.getElementById("st-out").before(tools);

  // Site visitors (counted by app.js on every page; no longer shown publicly)
  var vis = document.createElement("div"); vis.id = "visitors-admin"; vis.style.marginBottom = "40px";
  document.getElementById("st-out").before(vis);
  fetch(API + "/visitors?v=" + Date.now()).then(function (r) { return r.json(); }).then(function (v) {
    vis.innerHTML = '<h2 class="month-head"><span class="stripe-mini"></span>Site visitors</h2>' +
      '<div class="stats" style="grid-template-columns:repeat(2,1fr);max-width:600px"><div class="stat"><b>' + (v.today || 0).toLocaleString() + '</b><span>Visitors today</span></div>' +
      '<div class="stat"><b>' + (v.month || 0).toLocaleString() + '</b><span>Visits this month</span></div></div>' +
      '<p class="risk" style="margin-top:12px">Today counts each browser once. This month adds up each day&rsquo;s visitors, so someone who came on 3 days counts 3 times. Bots are not counted. Pacific time.</p>';
  }).catch(function () {});

  // Email signups + My Spotlight members (2026-11-06). Two separate sources:
  //   footer signups (tracker "signups" table, kind "news") and My Spotlight accounts (tracker "members" table,
  //   reported by the site when a member signs in or saves). One combined email list CSV covers both.
  var box = document.createElement("div"); box.id = "signups-admin"; box.style.marginTop = "48px";
  document.getElementById("st-out").after(box);
  function j(u) { return fetch(u).then(function (r) { return r.json(); }).catch(function () { return {}; }); }
  Promise.all([j(API + "/admin/signups?key=" + encodeURIComponent(admin)), j(API + "/admin/members?key=" + encodeURIComponent(admin)), j(API + "/admin/owners?key=" + encodeURIComponent(admin))]).then(function (res) {
    var d = res[0] || {}, mem = (res[1] && res[1].members) || [], owners = (res[2] && res[2].owners) || [];
    if (!d.signups) return;
    var news = d.signups.filter(function (s) { return s.kind === "news"; }), wait = d.signups.filter(function (s) { return s.kind === "waitlist"; });
    var dirName = {}; ((window.CVS && window.CVS.directory) || []).forEach(function (b) { dirName[b.slug] = b.name; });
    var ownerOf = {}; owners.forEach(function (o) { if (!o.revoked && o.email) { var e = o.email.toLowerCase(); (ownerOf[e] = ownerOf[e] || []).push(dirName[o.slug] || o.slug); } });
    var wants = function (m) { return m.news || m.deals || m.events; };
    // The combined email list: every footer signup, plus members with a confirmed email who want at least one email.
    var list = {}, add = function (row) { var e = String(row.email || "").toLowerCase(); if (e && !list[e]) list[e] = row; };
    mem.filter(function (m) { return m.verified && wants(m); }).forEach(function (m) {
      add({ email: m.email, source: "My Spotlight account", city: "", news: m.news ? "yes" : "", deals: m.deals ? "yes" : "", events: m.events ? "yes" : "", choices: m.prefs_saved ? "chosen" : "sign-up defaults", joined: (m.joined_at || m.last_seen || "").slice(0, 10) });
    });
    news.forEach(function (s) { add({ email: s.email, source: "Footer signup", city: s.city, news: "yes", deals: "", events: "", choices: "", joined: (s.created_at || "").slice(0, 10) }); });
    var listRows = Object.keys(list).map(function (e) { return list[e]; });
    var byCity = {}; news.forEach(function (s) { var c = s.city || "Not given"; byCity[c] = (byCity[c] || 0) + 1; });
    var cities = Object.keys(byCity).sort(function (a, b) { return byCity[b] - byCity[a]; });
    var choices = function (m) {
      var on = [m.news && "News", m.deals && "Deals", m.events && "Events"].filter(Boolean);
      return (on.length ? on.join(" &middot; ") : "None") + (m.prefs_saved ? "" : ' <span style="color:var(--ink-2)">(defaults)</span>');
    };
    box.innerHTML = '<h2 class="month-head"><span class="stripe-mini"></span>Email signups</h2>' +
      '<div class="stats" style="margin-bottom:16px"><div class="stat"><b>' + listRows.length + '</b><span>On the email list (both sources)</span></div>' +
      '<div class="stat"><b>' + news.length + '</b><span>Footer signups</span></div>' +
      cities.slice(0, 2).map(function (c) { return '<div class="stat"><b>' + byCity[c] + '</b><span>' + esc(c) + ' (footer)</span></div>'; }).join("") + '</div>' +
      '<p><button class="btn" data-dl="list"' + (listRows.length ? "" : " disabled") + '>Download email list (CSV)</button></p>' +
      '<p class="risk" style="margin-top:8px">The list joins the footer signup form with My Spotlight members who confirmed their email and want at least one kind of email. Each person appears once.</p>' +

      '<h2 class="month-head" style="margin-top:40px"><span class="stripe-mini"></span>My Spotlight members</h2>' +
      '<div class="stats" style="margin-bottom:16px"><div class="stat"><b>' + mem.length + '</b><span>Accounts</span></div>' +
      '<div class="stat"><b>' + mem.filter(function (m) { return m.verified; }).length + '</b><span>Email confirmed</span></div>' +
      '<div class="stat"><b>' + mem.filter(function (m) { return m.verified && wants(m); }).length + '</b><span>On the email list</span></div>' +
      '<div class="stat"><b>' + mem.reduce(function (n, m) { return n + (m.saves || 0); }, 0) + '</b><span>Places and events saved</span></div></div>' +
      '<div class="table-scroll"><table class="stats-table"><thead><tr><th>Member</th><th>Joined</th><th>Last seen</th><th>Email</th><th>Email choices</th><th>Saved</th></tr></thead><tbody>' +
      (mem.map(function (m) {
        var own = ownerOf[String(m.email).toLowerCase()];
        return '<tr><td><a href="mailto:' + esc(m.email) + '">' + esc(m.email) + '</a>' + (own ? '<br><span style="color:var(--ink-2)">Owner: ' + esc(own.join(", ")) + '</span>' : "") + '</td>' +
          '<td>' + esc((m.joined_at || "").slice(0, 10)) + '</td><td>' + esc((m.last_seen || "").slice(0, 10)) + '</td>' +
          '<td>' + (m.verified ? "Confirmed" : '<span style="color:var(--sun-deep)">Not confirmed</span>') + '</td><td>' + choices(m) + '</td><td>' + (m.saves || 0) + '</td></tr>';
      }).join("") || '<tr><td colspan="6">No members yet.</td></tr>') +
      '</tbody></table></div>' +
      '<p class="risk" style="margin-top:12px">"(defaults)" means they haven&rsquo;t opened their email preferences yet, so they have the sign-up choices (all three on). Last seen updates when a member visits signed in.</p>' +

      '<h2 class="month-head" style="margin-top:40px"><span class="stripe-mini"></span>La Quinta and Indio waitlist</h2>' +
      '<div class="table-scroll"><table class="stats-table"><thead><tr><th>Business</th><th>Contact</th><th>Route</th><th>Type</th><th>Joined</th></tr></thead><tbody>' +
      (wait.map(function (s) { return '<tr><td><strong>' + esc(s.business) + '</strong></td><td>' + esc(s.name) + '<br><a href="mailto:' + esc(s.email) + '">' + esc(s.email) + '</a><br>' + esc(s.phone) + '</td><td>' + esc(s.city) + '</td><td>' + esc(s.category) + '</td><td>' + esc(s.created_at.slice(0, 10)) + '</td></tr>'; }).join("") || '<tr><td colspan="5">No one on the waitlist yet.</td></tr>') +
      '</tbody></table></div>' + (wait.length ? '<p style="margin-top:12px"><button class="btn btn-ghost" data-dl="waitlist">Download waitlist (CSV)</button></p>' : "");
    box.addEventListener("click", function (e) {
      var b = e.target.closest("[data-dl]"); if (!b) return;
      var rows = b.dataset.dl === "list" ? listRows : wait;
      var cols = b.dataset.dl === "list" ? ["email", "source", "city", "news", "deals", "events", "choices", "joined"] : ["business", "name", "email", "phone", "city", "category", "created_at"];
      var a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([csv(rows, cols)], { type: "text/csv" }));
      a.download = "cv-spotlight-" + (b.dataset.dl === "list" ? "email-list" : "waitlist") + "-" + new Date().toISOString().slice(0, 10) + ".csv"; a.click();
    });
  });
})();
