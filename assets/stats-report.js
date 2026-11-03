/* Spotlight Report: the business view of stats.html (?b=<slug>&key=<key>).
   Leads with the last 30 days (a fresh month is nearly empty and looks bad), shows the seen → opened → reached out
   funnel, a month-by-month chart, one plain-English takeaway, and the next step that fits the listing:
   claim it, go Premium, get on the postcard, or keep the postcard spot. Needs data/directory.js and
   data/mailings.js. Called from stats.html as CVS_REPORT(out, d, slug, LABELS) once the page has loaded. */
(function () {
  var SPOTS = "https://local-spotlight-reservations.toddstpierre.workers.dev";

  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function n(x) { return (x || 0).toLocaleString(); }
  function pl(x, one, many) { return x === 1 ? one : many; }
  function slugOf(b) { return b.slug || String(b.name).toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }
  function monthShort(ym) { var p = ym.split("-"); return new Date(+p[0], +p[1] - 1, 1).toLocaleString("en-US", { month: "short" }); }
  function monthLong(ym) { var p = ym.split("-"); return new Date(+p[0], +p[1] - 1, 1).toLocaleString("en-US", { month: "long" }); }
  function pacificToday() { return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Los_Angeles" }).format(new Date()); }
  function daysUntil(ymd) { return Math.round((new Date(ymd + "T12:00:00Z") - new Date(pacificToday() + "T12:00:00Z")) / 86400000); }
  function niceDate(ymd) { return new Date(ymd + "T12:00:00Z").toLocaleString("en-US", { month: "long", day: "numeric", timeZone: "UTC" }); }
  function ga(name, p) { if (window.CVS_GA) window.CVS_GA(name, p); }

  // The next card still open for booking (soonest deadline that hasn't passed).
  function nextCard() {
    return (window.CVS_MAILINGS || []).filter(function (m) { return daysUntil(m.deadline) >= 0; })
      .sort(function (a, b) { return a.deadline < b.deadline ? -1 : 1; })[0] || null;
  }

  function funnel(p, b) {
    var acts = (p.call || 0) + (p.website || 0), top = Math.max(p.impression || 0, 1);
    function row(cls, label, val, note) {
      var w = val ? Math.max(4, Math.round(val / top * 100)) : 0;
      return '<div class="rp-row ' + cls + '"><div class="rp-row-label"><span>' + label + '</span><b>' + n(val) + '</b></div>' +
        '<div class="rp-track"><i style="width:' + w + '%"></i></div>' + (note ? '<p class="rp-note">' + note + '</p>' : "") + '</div>';
    }
    var rate = p.impression ? Math.round((p.profile || 0) / p.impression * 1000) / 10 : 0;
    return '<div class="rp-funnel">' +
      row("rp-seen", "Saw your listing", p.impression, "In the directory, search results, town pages and the home page.") +
      row("rp-open", "Opened your profile", p.profile, p.impression && p.profile ? rate + "% of the times you were seen" : "") +
      row("rp-act", "Called or visited your website", acts, n(p.call) + " " + pl(p.call, "call", "calls") + " tapped &middot; " + n(p.website) + " website " + pl(p.website, "visit", "visits")) +
      '</div>' +
      // Postcard advertisers (or anyone with scans or claims): the QR code and deal numbers.
      ((b && b.postcard) || p.scan || p.claim ? '<div class="rp-qr"><div><b>' + n(p.scan) + '</b><span>' + pl(p.scan || 0, "person", "people") + ' scanned your postcard QR code</span></div><div><b>' + n(p.claim) + '</b><span>' + pl(p.claim || 0, "deal", "deals") + ' claimed</span></div></div>' : "");
  }

  function chart(months, thisMonth) {
    var keys = Object.keys(months).sort().slice(-6);
    if (!keys.length) return "";
    var max = Math.max.apply(null, keys.map(function (k) { return months[k].impression || 0; }).concat(1));
    return '<div class="rp-chart" role="img" aria-label="Times seen by month: ' + keys.map(function (k) { return monthLong(k) + " " + (months[k].impression || 0); }).join(", ") + '">' +
      keys.map(function (k) {
        var m = months[k], h = Math.max(2, Math.round((m.impression || 0) / max * 100));
        return '<div class="rp-col' + (k === thisMonth ? " rp-now" : "") + '"><span class="rp-col-n">' + n(m.impression) + '</span>' +
          '<div class="rp-bar" style="height:' + h + '%"></div><span class="rp-col-m">' + monthShort(k) + (k === thisMonth ? " <em>so far</em>" : "") + '</span>' +
          '<span class="rp-col-p">' + n(m.profile) + ' ' + pl(m.profile, "visit", "visits") + '</span></div>';
      }).join("") + '</div>';
  }

  function takeaway(p, b) {
    var acts = (p.call || 0) + (p.website || 0), paid = b.premium || b.postcard || b.featured;
    if (acts) return "<b>" + n(acts) + " " + pl(acts, "person", "people") + " reached out straight from your listing.</b> Every one of those started with someone browsing local businesses and picking you.";
    if (p.profile) return "<b>People are looking, but nobody has reached out yet.</b> " + (paid
      ? "Your listing already has room for photos and an offer. A fresh special gives the next visitor a reason to call today."
      : "Right now your profile shows a phone number and a short blurb. Photos, hours and a special offer give them a reason to call.");
    if (p.impression) return "<b>Neighbors are seeing you, but scrolling past.</b> " + (paid
      ? "A strong photo and a clear offer are what make a listing worth opening."
      : "Premium listings sit above the free ones and show photos and your special, which is what gets them opened.");
    return "<b>Your listing is live.</b> Numbers show up here as neighbors browse the directory, so check back in a few days.";
  }

  function next(p, b, slug) {
    var card = nextCard(), d = card ? daysUntil(card.deadline) : null;
    var deadline = card ? (d === 0 ? "Today is the last day to book" : "Booking closes " + niceDate(card.deadline) + ", " + d + " " + pl(d, "day", "days") + " from now") : "";
    var seen = p.impression || 0, claimed = b.claimed || b.premium || b.postcard || b.featured;
    var head, body, cta, alt = "";
    if (b.postcard) {
      head = "Thank you for being on the postcard.";
      body = card ? "The next cards mail " + niceDate(card.mail) + ". Keep your spot, and your category, on the next one. " + deadline + "." : "Want to stay on the next card? Call or text Todd and your category stays yours.";
      cta = '<a class="btn" href="pricing?from=stats" data-rp="renew">Keep my spot</a>';
      alt = '<a class="btn btn-ghost rp-ghost" href="tel:+17604225475" data-rp="call">Call (760) 422-5475</a>';
    } else if (!claimed) {
      head = "This listing is yours to claim, free.";
      body = "Claim it to fix your details, add your description and photos, and get these numbers every month. It takes about a minute.";
      cta = '<a class="btn" href="claim?b=' + esc(slug) + '" data-rp="claim">Claim my listing</a>';
      alt = '<a class="btn btn-ghost rp-ghost" href="advertise#plans" data-rp="premium">See Premium</a>';
    } else if (!(b.premium || b.featured)) {
      head = p.profile ? "Turn those " + n(p.profile) + " profile " + pl(p.profile, "visit", "visits") + " into calls." : "Get opened, not scrolled past.";
      body = "Premium adds photos, hours and your special offer to your listing, and places you above the free listings. $49 a month, or free while you&rsquo;re on a Spotlight postcard.";
      cta = '<a class="btn" href="advertise#plans" data-rp="premium">See Premium</a>';
      alt = '<a class="btn btn-ghost rp-ghost" href="coverage-map?from=stats" data-rp="postcard">Or get on the postcard</a>';
    } else {
      head = card && seen ? "Seen " + n(seen) + " " + pl(seen, "time", "times") + " online. One postcard reaches " + esc(card.homes) + "." : "Take your business to the mailbox.";
      body = "Your ad on the shared Spotlight postcard, in every mailbox on the " + (card ? esc(card.name) : "route") + " route in a single day. One business per category, from $300, design and postage included." + (card ? " " + deadline + "." : "");
      cta = '<a class="btn" href="pricing?from=stats" data-rp="postcard">See open spots</a>';
      alt = '<a class="btn btn-ghost rp-ghost" href="coverage-map?from=stats" data-rp="map">See the routes</a>';
    }
    return '<div class="rp-next"><div><p class="rp-next-k">Your next step</p><h2>' + head + '</h2><p>' + body + '</p>' +
      (b.postcard ? "" : '<p class="rp-spots" data-rp-spots></p>') + '</div><div class="rp-next-cta">' + cta + alt + '</div></div>';
  }

  window.CVS_REPORT = function (out, d, slug, LABELS) {
    var dir = (window.CVS && window.CVS.directory) || [];
    var b = dir.filter(function (x) { return !x.sample && slugOf(x) === slug; })[0] || { name: slug };
    var sum = function (s) { return LABELS.reduce(function (t, l) { return t + (s[l[0]] || 0); }, 0); };
    var p = d.last30, when = "in the last 30 days";
    if (!sum(p) && sum(d.allTime)) { p = d.allTime; when = "since your listing went live"; }
    var day = +pacificToday().slice(8), tm = d.thisMonth;

    document.getElementById("st-title").textContent = b.name;
    document.title = b.name + " | Spotlight Report";
    document.getElementById("st-eyebrow").textContent = "Your Spotlight Report";
    var sub = document.getElementById("st-sub");
    sub.innerHTML = p.impression
      ? 'Your listing was seen <b class="rp-hl">' + n(p.impression) + " " + pl(p.impression, "time", "times") + "</b> " + when + " on Coachella Valley Spotlight."
      : "Your Spotlight Report: how neighbors find you on Coachella Valley Spotlight.";

    out.innerHTML =
      '<div class="rp">' +
        '<div class="rp-card"><div class="rp-card-head"><h2>From seen to called</h2><span class="rp-period">' + (when === "in the last 30 days" ? "Last 30 days" : "All time") + '</span></div>' + funnel(p, b) +
          '<p class="rp-take">' + takeaway(p, b) + '</p></div>' +
        next(p, b, slug) +
        (Object.keys(d.months).length ? '<div class="rp-card"><div class="rp-card-head"><h2>Month by month</h2><span class="rp-period">Times seen</span></div>' + chart(d.months, d.labels.thisMonth) +
          '<p class="rp-pace">' + monthLong(d.labels.thisMonth) + " so far (" + day + " " + pl(day, "day", "days") + " in): " + n(tm.impression) + " seen, " + n(tm.profile) + " profile " + pl(tm.profile, "visit", "visits") + ", " + n((tm.call || 0) + (tm.website || 0)) + " reached out.</p></div>" : "") +
        '<details class="rp-all"><summary>All the numbers</summary>' +
          '<div class="table-scroll"><table class="stats-table"><thead><tr><th>Period</th>' + LABELS.map(function (l) { return "<th>" + l[1] + "</th>"; }).join("") + '</tr></thead><tbody>' +
          [["Last 30 days", d.last30], [monthLong(d.labels.thisMonth) + " so far", d.thisMonth], [monthLong(d.labels.lastMonth), d.lastMonth], ["All time", d.allTime]].map(function (r) {
            return "<tr><td>" + r[0] + "</td>" + LABELS.map(function (l) { return "<td>" + n(r[1][l[0]]) + "</td>"; }).join("") + "</tr>";
          }).join("") + '</tbody></table></div>' +
          '<dl class="facts" style="margin-top:24px">' + LABELS.map(function (l) { return "<dt>" + l[1] + "</dt><dd>" + l[2] + "</dd>"; }).join("") + "</dl></details>" +
        '<div class="rp-tools"><button type="button" class="btn btn-ghost" data-rp="print">Save as PDF</button>' +
          '<a class="btn btn-ghost" href="business/' + esc(slug) + '/" data-rp="profile">See your public page</a></div>' +
      '</div>';

    out.addEventListener("click", function (e) {
      var a = e.target.closest("[data-rp]"); if (!a) return;
      var what = a.getAttribute("data-rp");
      if (what === "print") { e.preventDefault(); window.print(); }
      ga("report_click", { business: slug, action: what });
    });

    var sp = out.querySelector("[data-rp-spots]");
    if (sp) {
      var routes = (window.CVS_MAILINGS || []).map(function (m) { return [m.route, m.name]; }), got = [], left = routes.length;
      routes.forEach(function (r) {
        fetch(SPOTS + "/api/spots?route=" + r[0]).then(function (x) { if (!x.ok) throw 0; return x.json(); }).then(function (j) {
          var open = j.positions.filter(function (q) { return (q.status || "").toLowerCase() === "open"; }).length;
          got.push("<b>" + open + "</b> " + pl(open, "spot", "spots") + " open on " + esc(r[1]));
        }).catch(function () {}).then(function () { if (!--left && got.length) sp.innerHTML = "Live right now: " + got.join(" &middot; ") + "."; });
      });
    }
  };
})();
