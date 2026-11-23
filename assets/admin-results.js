/* Admin: "Postcard results" panel on stats.html in admin mode (2026-11-21).
   For each paying business (postcard or Premium): QR scans, ads emailed, leads, shares and deals claimed, all time,
   plus a ready-to-paste results line for outreach emails and the Advertise page. Top row: totals across all of them,
   the size of our own deals list from opt-ins, and whether email sending (Resend) is switched on.
   Numbers come from the tracker (/stats/all and /admin/optins).
   By postcard (2026-11-22): each ad on each card has its own QR code (s?b=<slug>&m=<route>:<mail date>), so there's also a
   table per mailing with a results line per advertiser and a total for the card.
   Our own QR codes (2026-11-23): scans per card for our home-page and postcard-page codes (tracker returns them as `house`). */
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
  // Our own QR codes (2026-11-23): the home page and the postcard advertising page, one code per mailing.
  // Scans per card for each, plus buttons that open the QR maker (pick the card there).
  function houseHtml(house, label) {
    var by = {}, all = { "cvs-home": 0, "cvs-postcard": 0 };
    house.forEach(function (h) { all[h.slug] = (h.allTime || {}).scan || 0; (h.byMailing || []).forEach(function (m) { (by[m.mailing] = by[m.mailing] || { "cvs-home": 0, "cvs-postcard": 0 })[h.slug] = m.scan || 0; }); });
    var keys = Object.keys(by).sort(function (a, z) { return z.split(":")[1].localeCompare(a.split(":")[1]) || a.localeCompare(z); });
    return '<h2 class="month-head" style="margin-top:28px"><span class="stripe-mini"></span>Our own QR codes</h2>' +
      '<p class="risk" style="margin-bottom:12px">A code for the home page and one for the postcard advertising page, made for each card so you can see which mailing brought people in. ' +
      '<button type="button" class="btn" data-house-qr="cvs-home" style="padding:6px 12px;font-size:13px">Home page QR</button> ' +
      '<button type="button" class="btn btn-ghost" data-house-qr="cvs-postcard" style="padding:6px 12px;font-size:13px">Postcard page QR</button></p>' +
      '<div class="table-scroll"><table class="stats-table"><thead><tr><th>Postcard</th><th>Home page scans</th><th>Postcard page scans</th></tr></thead><tbody>' +
      (keys.length ? keys.map(function (k) { return '<tr><td><strong>' + esc(label(k)) + '</strong></td><td>' + by[k]["cvs-home"] + '</td><td>' + by[k]["cvs-postcard"] + '</td></tr>'; }).join("") :
        '<tr><td colspan="3" class="risk">No scans yet.</td></tr>') +
      '<tr><td>All time</td><td>' + all["cvs-home"] + '</td><td>' + all["cvs-postcard"] + '</td></tr></tbody></table></div>';
  }
  function j(url) { return fetch(url).then(function (r) { return r.json(); }).catch(function () { return null; }); }
  Promise.all([j(API + "/stats/all?key=" + encodeURIComponent(admin)), j(API + "/admin/optins?key=" + encodeURIComponent(admin))]).then(function (r) {
    var stats = r[0] && r[0].businesses || [], op = r[1] || {}, optins = op.optins || [];
    var dir = (window.CVS && window.CVS.directory) || [], by = {};
    var cards = {};
    stats.forEach(function (s) { by[s.slug] = s.allTime || {}; (s.byMailing || []).forEach(function (m) { (cards[m.mailing] = cards[m.mailing] || []).push({ slug: s.slug, t: m }); }); });
    var nameOf = function (slug) { var b = dir.filter(function (x) { return x.slug === slug; })[0]; return b ? b.name : slug; };
    var label = function (m) { return window.CVS_MAILING_LABEL ? window.CVS_MAILING_LABEL(m) : m; };
    var cardKeys = Object.keys(cards).sort(function (a, z) { return z.split(":")[1].localeCompare(a.split(":")[1]) || a.localeCompare(z); });
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
      '<p class="risk" style="margin-top:10px">Lines are per advertiser, counted since tracking began.</p>' +
      '<h2 class="month-head" style="margin-top:28px"><span class="stripe-mini"></span>By postcard</h2>' +
      (cardKeys.length ? cardKeys.map(function (k) {
        var ct = { scan: 0, emailed: 0, lead: 0, share: 0, claim: 0 }, rs = cards[k].map(function (r) { K.forEach(function (x) { ct[x] += r.t[x] || 0; }); return { name: nameOf(r.slug), t: r.t, line: line(nameOf(r.slug) + " (" + label(k) + ")", r.t) }; })
          .sort(function (a, z) { return (z.t.lead || 0) - (a.t.lead || 0) || (z.t.scan || 0) - (a.t.scan || 0) || a.name.localeCompare(z.name); });
        var cl = line("Ads on the " + label(k) + " card", ct);
        return '<h3 style="margin:18px 0 8px">' + esc(label(k)) + '</h3>' +
          (cl ? '<div class="card" style="padding:12px 16px;margin-bottom:10px;display:flex;gap:12px;align-items:center;flex-wrap:wrap"><span style="flex:1;min-width:220px">' + esc(cl) + '</span>' + copyBtn(cl) + '</div>' : "") +
          '<div class="table-scroll"><table class="stats-table"><thead><tr><th>Business</th><th>QR scans</th><th>Ad emailed</th><th>Leads</th><th>Shared</th><th>Deals claimed</th><th>Results line</th></tr></thead><tbody>' +
          rs.map(function (x) { return '<tr><td><strong>' + esc(x.name) + '</strong></td>' + K.map(function (q) { return "<td>" + (x.t[q] || 0) + "</td>"; }).join("") + '<td>' + copyBtn(x.line) + '</td></tr>'; }).join("") + '</tbody></table></div>';
      }).join("") : '<p class="risk">No scans from a postcard yet. Each ad&rsquo;s code for a card is under Listings &rarr; QR code (pick the mailing).</p>') +
      houseHtml(r[0] && r[0].house || [], label) +
      '<p class="risk" style="margin-top:10px">Codes printed before 2026-11-22 (the El Paseo Nov 27 card) have no mailing in them; s.html credits them to that card. Shares and deal claims count for a card only when they came from its scan.</p>';
  });
  box.addEventListener("click", function (e) {
    var h = e.target.closest("[data-house-qr]");
    if (h && window.CVS_QR) return window.CVS_QR.open(h.getAttribute("data-house-qr"), h.getAttribute("data-house-qr") === "cvs-home" ? "Home page" : "Postcard advertising page");
    var b = e.target.closest("[data-copy-line]"); if (!b) return;
    var txt = b.getAttribute("data-copy-line"), done = function () { b.textContent = "Copied"; setTimeout(function () { b.textContent = "Copy line"; }, 1800); };
    if (navigator.clipboard) navigator.clipboard.writeText(txt).then(done, function () { window.prompt("Copy this:", txt); }); else window.prompt("Copy this:", txt);
  });
})();
