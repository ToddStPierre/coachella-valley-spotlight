/* Admin: "Monthly reports" panel on stats.html in admin mode. One row per business that should get its numbers
   every month: claimed owners (with their email) plus Premium and postcard listings. "Email report" opens a Gmail
   draft with last month's numbers and their Spotlight Report link. "Sent" marks are kept in this browser only. */
(function () {
  var API = "https://cvs-tracker.toddstpierre.workers.dev", SITE = "https://coachellavalleyspotlight.com/", FROM = "todd@coachellavalleyspotlight.com";
  var admin = (new URLSearchParams(location.search).get("admin") || (function () { try { return sessionStorage.getItem("cvs_admin"); } catch (e) { return null; } })()); if (!admin || window.CVS_IS_REPORT) return;
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function pl(x, one, many) { return x === 1 ? one : many; }
  function monthName(ym) { var p = ym.split("-"); return new Date(+p[0], +p[1] - 1, 1).toLocaleString("en-US", { month: "long" }); }

  var sent = {}; try { sent = JSON.parse(localStorage.getItem("cvs_reports_sent") || "{}"); } catch (e) {}
  function markSent(slug, ym) { sent[slug] = ym; try { localStorage.setItem("cvs_reports_sent", JSON.stringify(sent)); } catch (e) {} }

  var box = document.createElement("div"); box.id = "reports-admin"; box.style.marginBottom = "40px";
  var after = document.getElementById("cockpit-admin");
  if (after) after.after(box); else document.getElementById("st-out").before(box);

  function j(url) { return fetch(url).then(function (r) { return r.json(); }).catch(function () { return null; }); }
  Promise.all([j(API + "/admin/owners?key=" + encodeURIComponent(admin)), j(API + "/stats/all?key=" + encodeURIComponent(admin))]).then(function (r) {
    var owners = (r[0] && r[0].owners || []).filter(function (o) { return !o.revoked; }), stats = r[1] && r[1].businesses || [];
    if (!stats.length) return;
    var dir = (window.CVS && window.CVS.directory) || [], by = {}, info = {};
    stats.forEach(function (s) { by[s.slug] = s; });
    dir.forEach(function (b) { if (b.slug) info[b.slug] = b; });
    var ym = (function () { var d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - 1); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0"); })();
    var rows = {};
    owners.forEach(function (o) { rows[o.slug] = { slug: o.slug, who: o.name, email: o.email }; });
    dir.forEach(function (b) { if (b.slug && !b.sample && (b.premium || b.postcard || b.featured) && !rows[b.slug]) rows[b.slug] = { slug: b.slug, who: "", email: "" }; });
    var list = Object.keys(rows).map(function (k) { var x = rows[k]; x.b = info[k] || { name: k }; x.s = by[k]; return x; }).filter(function (x) { return x.s; });
    // Only businesses with some activity in the report month get a report (Todd, 2026-11-09). A report of all zeros helps no one.
    function active(x) { var m = x.s.lastMonth || {}; return Object.keys(m).some(function (k) { return m[k] > 0; }); }
    var quiet = list.filter(function (x) { return !active(x); });
    list = list.filter(active)
      .sort(function (a, z) { return (sent[a.slug] === ym) - (sent[z.slug] === ym) || a.b.name.localeCompare(z.b.name); });

    function draft(x) {
      var m = x.s.lastMonth, mon = monthName(ym), first = (x.who || "").split(" ")[0];
      var link = SITE + "stats?b=" + x.slug + "&key=" + x.s.key, acts = (m.call || 0) + (m.website || 0);
      var su = "Your " + mon + " Spotlight Report: " + x.b.name;
      var body = "Hi " + (first || "there") + ",\n\nHere's how " + x.b.name + " did on Coachella Valley Spotlight in " + mon + ":\n\n" +
        "- Seen " + m.impression + " " + pl(m.impression, "time", "times") + " in the directory and on town pages\n" +
        "- " + m.profile + " profile " + pl(m.profile, "visit", "visits") + "\n" +
        "- " + (m.call || 0) + " " + pl(m.call || 0, "call", "calls") + " and " + (m.website || 0) + " website " + pl(m.website || 0, "visit", "visits") + " straight from your listing\n" +
        (m.scan ? "- " + m.scan + " " + pl(m.scan, "person", "people") + " scanned the QR code on your postcard ad\n" : "") +
        (m.claim ? "- " + m.claim + " " + pl(m.claim, "person", "people") + " claimed your deal\n" : "") + "\n" +
        "Your full report, with the month-by-month chart, is here (it's private to you):\n" + link + "\n\n" +
        (acts ? "" : "Want more of those views to turn into calls? A fresh special on your listing gives people a reason to reach out. Reply with one and I'll put it up.\n\n") +
        "Thanks for being part of it.\n\nTodd\nCoachella Valley Spotlight\n(760) 422-5475";
      return { su: su, body: body, gmail: "https://mail.google.com/mail/?authuser=" + encodeURIComponent(FROM) + "&view=cm&fs=1" + (x.email ? "&to=" + encodeURIComponent(x.email) : "") + "&su=" + encodeURIComponent(su) + "&body=" + encodeURIComponent(body), link: link };
    }
    function draw() {
      var done = list.filter(function (x) { return sent[x.slug] === ym; }).length;
      box.innerHTML = '<h2 class="month-head"><span class="stripe-mini"></span>Monthly reports: ' + monthName(ym) + ' (' + done + ' of ' + list.length + ' sent)</h2>' +
        '<p class="risk" style="margin-bottom:16px">Owners and paying businesses get their numbers every month. Email report opens a ready Gmail draft from ' + FROM + '. Postcard and Premium listings without an owner account have no email on file, so fill in the To line.' +
        (quiet.length ? ' Only listings with activity in ' + monthName(ym) + ' are shown; ' + quiet.length + ' had none (' + quiet.map(function (x) { return esc(x.b.name); }).join(", ") + ').' : "") + '</p>' +
        '<div class="table-scroll"><table class="stats-table"><thead><tr><th>Business</th><th>' + monthName(ym) + '</th><th>Send to</th><th></th></tr></thead><tbody>' +
        list.map(function (x) {
          var m = x.s.lastMonth, d = draft(x), isSent = sent[x.slug] === ym;
          var tag = x.b.postcard ? '<span class="adm-tag">Postcard</span>' : (x.b.premium || x.b.featured) ? '<span class="adm-tag">Premium</span>' : '<span class="adm-tag adm-tag-c">Owner</span>';
          return '<tr' + (isSent ? ' style="opacity:.55"' : "") + '><td><strong>' + esc(x.b.name) + '</strong>' + tag + '</td><td>' + m.impression + ' seen &middot; ' + m.profile + ' profile &middot; ' + ((m.call || 0) + (m.website || 0)) + ' reached out</td>' +
            '<td>' + (x.email ? esc(x.who) + '<br>' + esc(x.email) : '<em>No email on file</em>') + '</td>' +
            '<td><a class="btn' + (isSent ? " btn-ghost" : "") + '" href="' + esc(d.gmail) + '" target="_blank" rel="noopener" data-sent="' + esc(x.slug) + '">' + (isSent ? "Sent &#10003; again?" : "Email report") + '</a> <a href="' + esc(d.link) + '" target="_blank" rel="noopener">Report</a></td></tr>';
        }).join("") + '</tbody></table></div>';
    }
    box.addEventListener("click", function (e) { var a = e.target.closest("[data-sent]"); if (a) { markSent(a.dataset.sent, ym); setTimeout(draw, 300); } });
    draw();
  });
})();
