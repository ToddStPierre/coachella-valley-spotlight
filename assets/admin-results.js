/* Admin: "Postcard results" panel on stats.html in admin mode (2026-11-21).
   For each paying business (postcard or Premium): QR scans, ads emailed, leads, shares and deals claimed, all time,
   plus a ready-to-paste results line for outreach emails and the Advertise page. Top row: totals across all of them,
   the size of our own deals list from opt-ins, and whether email sending (Resend) is switched on.
   Numbers come from the tracker (/stats/all and /admin/optins). Cards aren't linked to listings yet, so lines are per advertiser. */
(function () {
  var API = "https://cvs-tracker.toddstpierre.workers.dev";
  var admin = (new URLSearchParams(location.search).get("admin") || (function () { try { return sessionStorage.getItem("cvs_admin"); } catch (e) { return null; } })()); if (!admin || window.CVS_IS_REPORT) return;
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function pl(x, one, many) { return x === 1 ? one : many; }
  var box = document.createElement("div"); box.id = "results-admin"; box.style.marginBottom = "40px";
  var out = document.getElementById("st-out"); if (!out) return; out.before(box);
  box.innerHTML = '<div class="empty">Loading postcard results...</div>';

  // "Antex Exterminating: 42 people scanned their postcard ad, 11 asked for it by email and 6 asked to hear from them."
  function line(name, t) {
    var parts = [];
    if (t.scan) parts.push(t.scan + " " + pl(t.scan, "person", "people") + " scanned their postcard ad");
    if (t.emailed) parts.push(t.emailed + " asked us to email them the ad");
    if (t.lead) parts.push(t.lead + " said they want to hear from them");
    if (t.claim) parts.push(t.claim + " claimed their deal");
    if (t.share) parts.push(t.share + " passed it on to a neighbor");
    if (!parts.length) return "";
    var last = parts.pop();
    return name + ": " + (parts.length ? parts.join(", ") + " and " + last : last) + ".";
  }
  function j(url) { return fetch(url).then(function (r) { return r.json(); }).catch(function () { return null; }); }
  Promise.all([j(API + "/stats/all?key=" + encodeURIComponent(admin)), j(API + "/admin/optins?key=" + encodeURIComponent(admin))]).then(function (r) {
    var stats = r[0] && r[0].businesses || [], op = r[1] || {}, optins = op.optins || [];
    var dir = (window.CVS && window.CVS.directory) || [], by = {};
    stats.forEach(function (s) { by[s.slug] = s.allTime || {}; });
    var K = ["scan", "emailed", "lead", "share", "claim"], tot = { scan: 0, emailed: 0, lead: 0, share: 0, claim: 0 };
    var rows = dir.filter(function (b) { return b.slug && !b.sample && (b.postcard || b.premium || b.featured); }).map(function (b) {
      var t = by[b.slug] || {}; K.forEach(function (k) { tot[k] += t[k] || 0; }); return { b: b, t: t, line: line(b.name, t) };
    }).sort(function (a, z) { return (z.t.lead || 0) - (a.t.lead || 0) || (z.t.scan || 0) - (a.t.scan || 0) || a.b.name.localeCompare(z.b.name); });
    var listPeople = {}; optins.forEach(function (o) { if (o.list && !o.unsub_at) listPeople[o.email] = 1; });
    var listN = Object.keys(listPeople).length, totalLine = line("Across our postcard advertisers so far", tot);
    var copyBtn = function (txt) { return txt ? '<button type="button" class="btn btn-ghost" data-copy-line="' + esc(txt) + '" style="padding:6px 12px;font-size:13px">Copy line</button>' : '<span class="risk">No numbers yet</span>'; };
    box.innerHTML = '<h2 class="month-head"><span class="stripe-mini"></span>Postcard results (all time)</h2>' +
      '<p class="risk" style="margin-bottom:12px">' + (op.sending ? "Email sending is <b>on</b>: people who ask get the ad emailed, and businesses get each lead by email (you're BCC'd)." :
        "Email sending is <b>off</b> until the Resend key is added to the tracker. Opt-ins are still saved, and you get a Formspree email for each new lead to forward by hand.") +
      ' Our own deals list from opt-ins: <b>' + listN + ' ' + pl(listN, "person", "people") + '</b>.</p>' +
      (totalLine ? '<div class="card" style="padding:16px;margin-bottom:14px;display:flex;gap:12px;align-items:center;flex-wrap:wrap"><span style="flex:1;min-width:220px">' + esc(totalLine) + '</span>' + copyBtn(totalLine) + '</div>' : "") +
      '<div class="table-scroll"><table class="stats-table"><thead><tr><th>Business</th><th>QR scans</th><th>Ad emailed</th><th>Leads</th><th>Shared</th><th>Deals claimed</th><th>Results line</th></tr></thead><tbody>' +
      rows.map(function (x) { return '<tr><td><strong>' + esc(x.b.name) + '</strong></td>' + ["scan", "emailed", "lead", "share", "claim"].map(function (k) { return "<td>" + (x.t[k] || 0) + "</td>"; }).join("") + '<td>' + (x.line ? '<span style="display:block;max-width:360px;font-size:13px;margin-bottom:6px">' + esc(x.line) + '</span>' : "") + copyBtn(x.line) + '</td></tr>'; }).join("") +
      '</tbody></table></div>' +
      '<p class="risk" style="margin-top:10px">Lines are per advertiser, counted since tracking began. Postcard spots aren&rsquo;t linked to listings yet, so there&rsquo;s no per-card total.</p>';
  });
  box.addEventListener("click", function (e) {
    var b = e.target.closest("[data-copy-line]"); if (!b) return;
    var txt = b.getAttribute("data-copy-line"), done = function () { b.textContent = "Copied"; setTimeout(function () { b.textContent = "Copy line"; }, 1800); };
    if (navigator.clipboard) navigator.clipboard.writeText(txt).then(done, function () { window.prompt("Copy this:", txt); }); else window.prompt("Copy this:", txt);
  });
})();
