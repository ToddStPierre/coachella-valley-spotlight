/* Real estate agent monthly events flyer (agents.html).
   A signed-in My Spotlight member with an agent profile (assets/auth.js, users/{uid}.agent) picks a month and
   the events they want, and downloads a US Letter PDF of valley events with their photo, contact info, logo and
   a QR code to their website on a one-page flyer, plus a QR beside each event (to that event on our site)
   through the short e.html links. Built in the browser with jsPDF (assets/vendor, MIT), which loads
   on the first download only, like the QR library. Events: data/events.js + data/feed-events.js, the same lists
   the Events page uses. Weekly events go in an "Every week" box instead of being repeated. */
(function () {
  var D = window.CVS || {};
  var R = window.CVS_RENDER || {}, ROOT = R.root || "";
  var app = document.getElementById("agent-app");
  var MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  var DOW = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  var today = new Date(); today.setHours(0, 0, 0, 0);
  function parse(d) { if (!d) return null; var p = d.split("-"); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function ga(n, p) { if (window.CVS_GA) window.CVS_GA(n, p || {}); }

  /* ---------- events for a month ---------- */
  // Returns { dated: [{e, day, key}], weekly: [{e, key}] } for month m (0-11) of year y, from today on.
  function monthEvents(y, m, cities) {
    var first = new Date(y, m, 1), last = new Date(y, m + 1, 0), from = first < today ? today : first;
    var inCity = function (e) { return !cities || !cities.length || !e.city || cities.indexOf(e.city) > -1; };
    var dated = [], weekly = [];
    (D.events || []).concat(D.feedEvents || []).forEach(function (e, i) {
      if (!e || e.sample || !e.title || !inCity(e)) return;
      var key = (e.feed ? "f" : "h") + i + "-" + String(e.title).slice(0, 20);
      if (e.weekly) {
        var dow = DOW.indexOf(e.weekly); if (dow < 0) return;
        var s = parse(e.from), u = parse(e.until), a = s && s > from ? new Date(s) : new Date(from), b = u && u < last ? u : last;
        while (a.getDay() !== dow) a.setDate(a.getDate() + 1);
        if (a <= b) weekly.push({ e: e, key: key, dow: dow });
        return;
      }
      var s2 = parse(e.date), e2 = parse(e.endDate || e.date);
      if (!s2 || e2 < from || s2 > last) return;
      dated.push({ e: e, key: key, day: s2 < from ? from : s2, end: e.endDate ? e2 : null });
    });
    dated.sort(function (a, b) { return a.day - b.day || String(a.e.time || "").localeCompare(String(b.e.time || "")); });
    weekly.sort(function (a, b) { return ((a.dow + 6) % 7) - ((b.dow + 6) % 7) || a.e.title.localeCompare(b.e.title); });
    return { dated: dated, weekly: weekly };
  }

  /* ---------- PDF ---------- */
  var libs = null;
  function loadScript(src) { return new Promise(function (res, rej) { var s = document.createElement("script"); s.src = src; s.onload = res; s.onerror = function () { rej(new Error("The PDF maker didn't load. Check your connection and try again.")); }; document.head.appendChild(s); }); }
  function loadLibs() {
    if (!libs) libs = Promise.all([window.jspdf ? 0 : loadScript(ROOT + "assets/vendor/jspdf-2.5.2.umd.min.js"), window.qrcode ? 0 : loadScript(ROOT + "assets/vendor/qrcode-generator-1.4.4.js")])
      .catch(function (e) { libs = null; throw e; });
    return libs;
  }
  // The PDF's built-in fonts only print Latin-1: straighten quotes and dashes, drop emoji and the rest.
  function clean(s) {
    return String(s == null ? "" : s).replace(/[‘’‛′]/g, "'").replace(/[“”″]/g, '"').replace(/[–—−]/g, "-")
      .replace(/…/g, "...").replace(/•/g, "·").replace(/ /g, " ").replace(/[^\x20-\x7e\xa0-\xff]/g, "").replace(/\s+/g, " ").trim();
  }
  var C = { ink: [34, 28, 24], ink2: [93, 80, 72], line: [228, 214, 195], sand: [245, 237, 225], sun: [217, 85, 43], sunDeep: [184, 64, 28], gold: [240, 163, 58], rose: [201, 102, 122], dusk: [91, 74, 122], palm: [46, 92, 79] };
  function shortDay(d) { return DOW[d.getDay()].slice(0, 3).toUpperCase() + "  " + MONTHS[d.getMonth()].slice(0, 3).toUpperCase() + " " + d.getDate(); }
  function imgType(u) { return /^data:image\/png/.test(u) ? "PNG" : "JPEG"; }
  // Short QR links: coachellavalleyspotlight.com/e?k=<key>. e.html looks the key up in the same event lists and
  // opens the event's page (or the Events page searched for it), tagged utm_source=agent-flyer. The key is a hash
  // of the event's slug, so it's short enough to scan at 0.6 in. e.html has the same hash: change both together.
  var SHORT = "https://coachellavalleyspotlight.com/e?k=";
  function evKey(e) {
    var s = (R.eventSlug ? R.eventSlug(e) : String(e.title)), h = 2166136261;
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
    return h.toString(36);
  }
  function imgSize(u) { return new Promise(function (res) { var i = new Image(); i.onload = function () { res({ w: i.naturalWidth, h: i.naturalHeight }); }; i.onerror = function () { res(null); }; i.src = u; }); }

  // agent: the profile; y, m: month; list: monthEvents() result already filtered to the chosen events.
  function buildPDF(agent, y, m, list) {
    return loadLibs().then(function () {
      return Promise.all([agent.photo ? imgSize(agent.photo) : null, agent.logo ? imgSize(agent.logo) : null]);
    }).then(function (sizes) {
      // Always one page, at full text size. If the events don't all fit, keep the ones that do (in date order) and
      // say how many more are on the website; the page tells the agent to untick some to choose which ones make it.
      var r = make(sizes, 2, 1, false);
      return r.shown === r.total ? r : make(sizes, 2, 1, true);
    });
    // descLines: description lines per event; k: text scale; cut: stop when the page is full and add a "more" line.
    function make(sizes, descLines, k, cut) {
      var doc = new window.jspdf.jsPDF({ unit: "pt", format: "letter" });
      var W = 612, H = 792, M = 36, GAP = 20, COLW = (W - 2 * M - GAP) / 2;
      var FOOT_H = 112, FINE_H = 26, EQ = 42, EQ_GAP = 8, bodyBottom = H - M - FOOT_H - FINE_H - 12;
      var month = MONTHS[m] + " " + y, name = clean(agent.name);
      doc.setProperties({ title: "Coachella Valley events, " + month, author: name, subject: "Things to do in the Coachella Valley", creator: "Coachella Valley Spotlight" });
      var fill = function (c) { doc.setFillColor(c[0], c[1], c[2]); }, color = function (c) { doc.setTextColor(c[0], c[1], c[2]); }, stroke = function (c) { doc.setDrawColor(c[0], c[1], c[2]); };
      // A QR code drawn as vector squares (sharp at any print size). level: L for the small event codes, M otherwise.
      function drawQR(text, x, y, size, level) {
        var qr = window.qrcode(0, level || "M"); qr.addData(text); qr.make();
        var n = qr.getModuleCount(), cell = size / n;
        doc.setFillColor(255, 255, 255); doc.rect(x - 4, y - 4, size + 8, size + 8, "F"); fill(C.ink);
        for (var r = 0; r < n; r++) for (var c = 0; c < n; c++) if (qr.isDark(r, c)) doc.rect(x + c * cell, y + r * cell, cell + 0.15, cell + 0.15, "F");
      }

      function header() {
        // Sunset stripes, the site's mark
        [[C.gold, 7], [C.sun, 5], [C.rose, 4], [C.dusk, 3]].reduce(function (yy, s) { fill(s[0]); doc.rect(0, yy, W, s[1], "F"); return yy + s[1] + 1.5; }, 0);
        doc.setFont("helvetica", "bold"); doc.setFontSize(8.5); doc.setCharSpace(1.6); color(C.sunDeep);
        doc.text("THINGS TO DO IN THE COACHELLA VALLEY", M, 50); doc.setCharSpace(0);
        doc.setFont("times", "bold"); doc.setFontSize(30); color(C.ink);
        doc.text(month + " Events", M, 82);
        doc.setFont("helvetica", "normal"); doc.setFontSize(10.5); color(C.ink2);
        doc.text(doc.splitTextToSize("Concerts, festivals, markets and community events around the valley, picked for you by " + name + ".", W - 2 * M), M, 100);
        stroke(C.line); doc.setLineWidth(0.75); doc.line(M, 112, W - M, 112);
        return 128;
      }

      function footer() {
        var top = H - M - FINE_H - FOOT_H, x = M + 14, right = W - M - 14;
        fill(C.sand); doc.roundedRect(M, top, W - 2 * M, FOOT_H, 10, 10, "F");
        fill(C.sun); doc.rect(M + 10, top, W - 2 * M - 20, 3, "F");
        // Photo, round
        if (agent.photo && sizes[0]) {
          var d = 80, cx = x + d / 2, cy = top + FOOT_H / 2, s = sizes[0], k = Math.max(d / s.w, d / s.h);
          doc.saveGraphicsState(); doc.circle(cx, cy, d / 2, null); doc.clip(); doc.discardPath();
          doc.addImage(agent.photo, imgType(agent.photo), cx - s.w * k / 2, cy - s.h * k / 2, s.w * k, s.h * k, "photo");
          doc.restoreGraphicsState();
          doc.setLineWidth(2); doc.setDrawColor(255, 255, 255); doc.circle(cx, cy, d / 2, "S");
          x += d + 16;
        }
        // QR to their website, then the logo, from the right edge
        var site = clean(agent.website);
        if (site && window.qrcode) {
          var q = 70, qx = right - q, qy = top + (FOOT_H - q) / 2 - 5;
          drawQR("https://" + site.replace(/^https?:\/\//i, ""), qx, qy, q, "M");
          doc.setFont("helvetica", "normal"); doc.setFontSize(6.5); color(C.ink2); doc.text("Scan for my website", qx + q / 2, qy + q + 11, { align: "center" });
          right = qx - 16;
        }
        if (agent.logo && sizes[1]) {
          var L = sizes[1], lk = Math.min(96 / L.w, 52 / L.h), lw = L.w * lk, lh = L.h * lk;
          doc.addImage(agent.logo, imgType(agent.logo), right - lw, top + (FOOT_H - lh) / 2, lw, lh, "logo");
          right -= lw + 16;
        }
        // Contact text
        var tw = right - x, yy = top + 28;
        doc.setFont("times", "bold"); doc.setFontSize(17); color(C.ink); doc.text(doc.splitTextToSize(name, tw)[0], x, yy);
        var sub = clean([agent.title, agent.brokerage].filter(Boolean).join(" | "));
        doc.setFont("helvetica", "normal"); doc.setFontSize(9.5); color(C.ink2);
        if (sub) { yy += 14; doc.text(doc.splitTextToSize(sub, tw)[0], x, yy); }
        doc.setFont("helvetica", "bold"); doc.setFontSize(10.5); color(C.sunDeep);
        var contact = [agent.phone, agent.email].map(clean).filter(Boolean).join("   ");
        if (contact) { yy += 16; doc.text(doc.splitTextToSize(contact, tw)[0], x, yy); }
        doc.setFont("helvetica", "normal"); doc.setFontSize(9); color(C.ink2);
        var more = [site, agent.dre ? "DRE# " + clean(agent.dre).replace(/^dre\s*#?\s*/i, "") : ""].filter(Boolean).join("   ");
        if (more) { yy += 13; doc.text(doc.splitTextToSize(more, tw)[0], x, yy); }
        if (agent.note) { doc.setFont("helvetica", "italic"); doc.setFontSize(8.5); color(C.ink); doc.splitTextToSize(clean(agent.note), tw).slice(0, top + FOOT_H - yy > 32 ? 2 : 1).forEach(function (l) { yy += 11; doc.text(l, x, yy); }); }
        // Fine print
        doc.setFont("helvetica", "normal"); doc.setFontSize(6.5); color(C.ink2);
        doc.text(doc.splitTextToSize("Equal Housing Opportunity. Event listings courtesy of Coachella Valley Spotlight, coachellavalleyspotlight.com. Dates, times and details can change, so please check with the organizer before you go. If your property is currently listed for sale, this is not a solicitation.", W - 2 * M), M, H - M - FINE_H + 10);
      }

      // Flow: blocks laid down in two columns on one page. full: the page ran out of room.
      var col = 0, top0 = header(), yy = top0, full = false, shown = 0, total = list.dated.length + list.weekly.length;
      var limit = bodyBottom - (cut ? 16 : 0); // room for the "more events" line
      footer();
      function colX() { return M + col * (COLW + GAP); }
      function room(h) {
        if (yy + h <= limit) return true;
        if (col === 0) { col = 1; yy = top0; return yy + h <= limit; }
        return false;
      }
      // Venue without its street address ("Palm Canyon Theatre, 538 N Palm Canyon Dr" -> "Palm Canyon Theatre").
      function venue(e) { var v = String(e.venue || "").replace(/,\s*\d.*$/, "").replace(/^\d+[^,]*$/, ""); return [v, v.indexOf(e.city || "~") > -1 ? "" : e.city].filter(Boolean).join(", "); }
      // compact: title and one line, no description (the "Every week" list).
      // Dated events get a small QR on the right that opens that event on the site. Weekly ones don't, to keep the
      // "Every week" box compact.
      function eventBlock(e, sub, compact) {
        var qr = !compact && window.qrcode, TW = qr ? COLW - EQ - EQ_GAP : COLW;
        var t = doc.setFont("helvetica", "bold").setFontSize(10.5 * k) && doc.splitTextToSize(clean(e.title), TW);
        var meta = clean([sub, e.time, venue(e), e.price].filter(Boolean).join("  ·  "));
        doc.setFont("helvetica", "normal"); doc.setFontSize(8.5 * k);
        var mm = doc.splitTextToSize(meta, TW).slice(0, compact ? 1 : 2);
        var full = e.description && !compact ? doc.splitTextToSize(clean(e.description), TW) : [], dd = full.slice(0, descLines);
        if (dd.length && full.length > dd.length) dd[dd.length - 1] = dd[dd.length - 1].replace(/\s*\S*$/, "") + "...";
        var textH = (t.length * 12.5 + mm.length * 10.5 + dd.length * 10.5 + 9) * k;
        return { h: qr ? Math.max(textH, EQ + 12) : textH, draw: function () {
          var x = colX(), y0 = yy;
          if (qr) drawQR(SHORT + evKey(e), x + COLW - EQ, y0 + 3, EQ, "L");
          doc.setFont("helvetica", "bold"); doc.setFontSize(10.5 * k); color(C.ink); t.forEach(function (l) { yy += 12.5 * k; doc.text(l, x, yy - 3 * k); });
          doc.setFont("helvetica", "normal"); doc.setFontSize(8.5 * k); color(C.palm); mm.forEach(function (l) { yy += 10.5 * k; doc.text(l, x, yy - 2 * k); });
          color(C.ink2); dd.forEach(function (l) { yy += 10.5 * k; doc.text(l, x, yy - 2 * k); });
          yy += 9 * k; if (qr) yy = Math.max(yy, y0 + EQ + 12); shown++;
        } };
      }
      function heading(label, c) {
        return { h: 20 * k, label: label, color: c, draw: function () {
          var x = colX();
          doc.setFont("helvetica", "bold"); doc.setFontSize(8.5); doc.setCharSpace(1.2); color(c || C.sunDeep); doc.text(label, x, yy + 10); doc.setCharSpace(0);
          stroke(C.line); doc.setLineWidth(0.6); doc.line(x + doc.getTextWidth(label) + label.length * 1.2 + 6, yy + 7, x + COLW, yy + 7);
          yy += 20 * k;
        } };
      }
      function place(blocks) { // a heading stays with its first event
        if (full) return;
        if (!room(blocks[0].h + (blocks[1] ? blocks[1].h : 0))) { full = true; return; }
        for (var i = 0; i < blocks.length; i++) {
          if (i > 1) {
            var was = col;
            if (!room(blocks[i].h)) { full = true; return; }
            if (was !== col) { var hd = heading(blocks[0].label + " (CONT.)", blocks[0].color); if (!room(hd.h + blocks[i].h)) { full = true; return; } hd.draw(); }
          }
          blocks[i].draw();
        }
      }
      var byDay = [];
      list.dated.forEach(function (x) { var last = byDay[byDay.length - 1]; if (last && +last.day === +x.day) last.items.push(x); else byDay.push({ day: x.day, items: [x] }); });
      byDay.forEach(function (g) {
        place([heading(shortDay(g.day))].concat(g.items.map(function (x) {
          return eventBlock(x.e, x.end ? "Through " + MONTHS[x.end.getMonth()].slice(0, 3) + " " + x.end.getDate() : "");
        })));
      });
      if (list.weekly.length) place([heading("EVERY WEEK", C.palm)].concat(list.weekly.map(function (x) { return eventBlock(x.e, x.e.weekly + "s", true); })));
      if (!list.dated.length && !list.weekly.length) { doc.setFont("helvetica", "italic"); doc.setFontSize(11); color(C.ink2); doc.text("No events picked for this month.", M, yy + 14); }
      if (cut && shown < total) {
        doc.setFont("helvetica", "bold"); doc.setFontSize(9); color(C.sunDeep);
        doc.text("+ " + (total - shown) + " more event" + (total - shown > 1 ? "s" : "") + " this month at coachellavalleyspotlight.com/events", W - M, bodyBottom + 4, { align: "right" });
      }
      return { doc: doc, pages: 1, shown: shown, total: total, file: "valley-events-" + MONTHS[m].toLowerCase() + "-" + y + ".pdf" };
    }
  }
  window.CVS_AGENT_FLYER = { monthEvents: monthEvents, buildPDF: buildPDF, evKey: evKey };

  /* ---------- page ---------- */
  if (!app) return;
  var state = { y: 0, m: 0, cities: null, off: {} };
  var CITIES = ["Bermuda Dunes", "Cathedral City", "Coachella", "Desert Hot Springs", "Indian Wells", "Indio", "La Quinta", "Palm Desert", "Palm Springs", "Rancho Mirage", "Thousand Palms"];
  function months() { var out = []; for (var i = 0; i < 3; i++) { var d = new Date(today.getFullYear(), today.getMonth() + i, 1); out.push({ y: d.getFullYear(), m: d.getMonth() }); } return out; }
  // Agents usually want a family-friendly flyer: nightlife starts unticked (they can tick it back on).
  function defaultOff(e) { return /nightlife/i.test(e.category || "") || /\b(drag|bingo|karaoke|burlesque|21\+|adults? only)\b/i.test(e.title + " " + (e.description || "")); }

  function render() {
    var A = window.CVS_AUTH;
    if (!A || !A.loaded()) { app.innerHTML = '<div class="card acct-card"><p>' + (state.slow ? 'Sign-in is taking a while to load. Check your connection and <a href="">refresh the page</a>.' : "Loading&hellip;") + '</p></div>'; return; }
    var user = A.user(), agent = A.agent();
    // Agents who are set up skip the sales pitch at the top (remembered so it doesn't flash on the next visit).
    var ready = !!(user && agent);
    document.documentElement.classList.toggle("agent-ready", ready);
    try { ready ? localStorage.setItem("cvs_agent", "1") : localStorage.removeItem("cvs_agent"); } catch (e) {}
    if (!user) {
      app.innerHTML = '<div class="card acct-card agent-cta"><h2>Start with a free My Spotlight account</h2><p>Create your account, add your photo and contact info once, and download a fresh events flyer every month.</p>' +
        '<a class="btn" href="' + ROOT + 'account?mode=up&next=' + encodeURIComponent(location.pathname) + '">Create my free account</a> ' +
        '<a class="btn btn-ghost" href="' + ROOT + 'account?next=' + encodeURIComponent(location.pathname) + '">Sign in</a></div>';
      return;
    }
    if (!agent) { var c = document.createElement("div"); c.className = "card acct-card"; app.innerHTML = ""; app.appendChild(c); A.agentForm(c, render); return; }
    if (!state.y) { var mm = months()[today.getDate() > 20 ? 1 : 0]; state.y = mm.y; state.m = mm.m; }
    // Cities: one, several, or none ticked = the whole valley. Starts from the farm cities in their profile.
    if (!state.cities) state.cities = (agent.cities || []).filter(function (c) { return CITIES.indexOf(c) > -1; });
    var picks = state.cities, whole = !picks.length;
    var list = monthEvents(state.y, state.m, whole ? null : picks);
    var valley = monthEvents(state.y, state.m, null), perCity = {};
    valley.dated.concat(valley.weekly).forEach(function (x) { if (x.e.city) perCity[x.e.city] = (perCity[x.e.city] || 0) + 1; });
    var all = list.dated.concat(list.weekly);
    all.forEach(function (x) { if (!(x.key in state.off)) state.off[x.key] = defaultOff(x.e); });
    var on = all.filter(function (x) { return !state.off[x.key]; }).length;
    var row = function (x, when) {
      return '<label class="agent-ev"><input type="checkbox" data-key="' + esc(x.key) + '"' + (state.off[x.key] ? "" : " checked") + '><span><b>' + esc(x.e.title) + '</b><small>' + esc([when, x.e.time, [x.e.venue, x.e.city].filter(Boolean).join(", ")].filter(Boolean).join(" · ")) + '</small></span></label>';
    };
    app.innerHTML =
      '<div class="agent-builder">' +
      '<div class="card acct-card agent-me">' + (agent.photo ? '<img src="' + esc(agent.photo) + '" alt="">' : "") + '<div><b>' + esc(agent.name) + '</b><br><span>' + esc([agent.title, agent.brokerage].filter(Boolean).join(", ")) + '</span><br><span>' + esc([agent.phone, agent.email].filter(Boolean).join(" · ")) + '</span></div>' +
      '<button type="button" class="linklike" data-act="edit">Edit my info</button></div>' +
      '<div class="card acct-card"><form class="form agent-opts" onsubmit="return false">' +
      '<label>Month<select name="month">' + months().map(function (o) { return '<option value="' + o.y + "-" + o.m + '"' + (o.y === state.y && o.m === state.m ? " selected" : "") + '>' + MONTHS[o.m] + " " + o.y + '</option>'; }).join("") + '</select></label>' +
      '<fieldset class="full agent-where"><legend>Events from <span class="opt">(pick one city or several)</span></legend>' +
      '<label class="agent-city agent-city-all"><input type="checkbox" data-city=""' + (whole ? " checked" : "") + '> The whole valley</label>' +
      CITIES.map(function (c) { return '<label class="agent-city"><input type="checkbox" data-city="' + esc(c) + '"' + (picks.indexOf(c) > -1 ? " checked" : "") + '> <span>' + esc(c) + ' <span class="opt">(' + (perCity[c] || 0) + ')</span></span></label>'; }).join("") +
      '</fieldset>' +
      '</form>' +
      '<div class="agent-list-head"><b>' + on + ' of ' + all.length + ' events picked</b><span><button type="button" class="linklike" data-all="1">All</button> &middot; <button type="button" class="linklike" data-all="0">None</button></span></div>' +
      (all.length ? '<div class="agent-list">' +
        list.dated.map(function (x) { return row(x, DOW[x.day.getDay()].slice(0, 3) + " " + MONTHS[x.day.getMonth()].slice(0, 3) + " " + x.day.getDate()); }).join("") +
        (list.weekly.length ? '<p class="agent-list-sub">Every week</p>' + list.weekly.map(function (x) { return row(x, x.e.weekly + "s"); }).join("") : "") + '</div>'
        : '<div class="empty">No events are listed for ' + MONTHS[state.m] + ' yet' + (!whole ? " in " + (picks.length > 1 ? "these cities" : picks[0]) + ". Try adding cities or the whole valley." : ". More get added every week, so check back soon.") + '</div>') +
      '<p class="agent-fit" aria-live="polite"></p>' +
      (!whole && all.length && all.length < 6 ? '<p class="acct-hint" style="margin-top:10px">Only a few events in ' + (picks.length > 1 ? "these cities" : esc(picks[0])) + ' so far. Add more cities or pick the whole valley for a fuller flyer.</p>' : "") +
      '<div class="agent-go"><button type="button" class="btn" data-act="pdf"' + (on ? "" : " disabled") + '>Download my PDF &darr;</button><p class="form-status" role="status" aria-live="polite"></p></div>' +
      '</div></div>';
    var f = app.querySelector(".agent-opts");
    f.month.addEventListener("change", function () { var p = f.month.value.split("-"); state.y = +p[0]; state.m = +p[1]; render(); });
    f.querySelectorAll("[data-city]").forEach(function (cb) { cb.addEventListener("change", function () {
      var c = cb.getAttribute("data-city");
      if (!c) state.cities = []; // "The whole valley" clears the cities
      else state.cities = cb.checked ? state.cities.concat(c) : state.cities.filter(function (x) { return x !== c; });
      render();
      var again = app.querySelector('[data-city="' + c + '"]'); if (again) again.focus();
    }); });
    // Ticking an event only updates the count (no re-render, so the list keeps its scroll position).
    app.querySelectorAll("[data-key]").forEach(function (cb) { cb.addEventListener("change", function () {
      state.off[cb.getAttribute("data-key")] = !cb.checked;
      var n = all.filter(function (x) { return !state.off[x.key]; }).length;
      app.querySelector(".agent-list-head b").textContent = n + " of " + all.length + " events picked";
      app.querySelector('[data-act="pdf"]').disabled = !n;
      checkFit();
    }); });
    app.querySelectorAll("[data-all]").forEach(function (b) { b.addEventListener("click", function () { var v = b.getAttribute("data-all") === "1"; all.forEach(function (x) { state.off[x.key] = !v; }); render(); }); });
    app.querySelector('[data-act="edit"]').addEventListener("click", function () { var c = app.querySelector(".agent-me"); c.classList.remove("agent-me"); A.agentForm(c, render); });
    function picked() { return { dated: list.dated.filter(function (x) { return !state.off[x.key]; }), weekly: list.weekly.filter(function (x) { return !state.off[x.key]; }) }; }
    // The flyer is one page: show how many of the picked events fit, before they download. Events are cut in date
    // order with the weekly box last, so this tells the agent to untick some to choose which ones make it.
    var fitEl = app.querySelector(".agent-fit"), fitTimer, fitRun = 0;
    function checkFit() {
      clearTimeout(fitTimer);
      fitTimer = setTimeout(function () {
        var run = ++fitRun, pk = picked();
        if (!pk.dated.length && !pk.weekly.length) { fitEl.textContent = ""; fitEl.className = "agent-fit"; return; }
        buildPDF(agent, state.y, state.m, pk).then(function (r) {
          if (run !== fitRun) return;
          var over = r.total - r.shown;
          fitEl.className = "agent-fit" + (over ? " over" : "");
          fitEl.textContent = over
            ? "The flyer is one page: " + r.shown + " of these " + r.total + " fit. The last " + over + " (by date, with the weekly list last) will be left off, and the flyer will point readers to the website for more. Untick " + over + " to choose which ones make it."
            : "All " + r.total + " fit on your one-page flyer.";
        }).catch(function () {});
      }, 200);
    }
    checkFit();
    var go = app.querySelector('[data-act="pdf"]'), st = app.querySelector(".agent-go .form-status");
    go.addEventListener("click", function () {
      var pick = picked();
      go.disabled = true; st.textContent = "Making your PDF…";
      buildPDF(agent, state.y, state.m, pick).then(function (r) {
        r.doc.save(r.file);
        st.textContent = r.shown < r.total
          ? "Downloaded: " + r.file + " (one page, " + r.shown + " of your " + r.total + " events; the flyer points readers to the website for the rest)."
          : "Downloaded: " + r.file + " (one page, all " + r.total + " events). Come back next month for a fresh one.";
        ga("agent_flyer_download", { month: MONTHS[state.m] + " " + state.y, events: r.total, shown: r.shown });
      }).catch(function (e) { console.warn(e); st.textContent = e.message || "Something went wrong making the PDF. Please try again."; })
        .then(function () { go.disabled = false; });
    });
  }
  render();
  document.addEventListener("cvs:user", render);
  setTimeout(function () { state.slow = true; if (!window.CVS_AUTH || !window.CVS_AUTH.loaded()) render(); }, 12000);
})();
