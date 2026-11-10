/* Spotlight HQ: Overview headline numbers (2026-11-09). Sits above the sales cockpit's card progress and Do today.
   Postcard money comes from Campaign money (/admin/campaigns) for the current mailings; spots from the postcard board
   (admin-board.js, via HQ_BOARD_CHANGED); the directory from data/directory.js; visitors from /visitors. */
(function () {
  var HQ = window.HQ; if (!HQ) return;
  var esc = HQ.esc, ic = HQ.icons;
  var box = document.createElement("div"); box.id = "ov-admin";
  document.getElementById("st-out").before(box);
  var mailings = window.CVS_MAILINGS || [];
  var st = { lines: null, vis: null, board: null };

  function j(u) { return fetch(u).then(function (r) { return r.ok ? r.json() : {}; }).catch(function () { return {}; }); }
  j(HQ.TRACKER + "/admin/campaigns?key=" + encodeURIComponent(HQ.key)).then(function (d) { st.lines = d.lines || []; draw(); });
  j(HQ.TRACKER + "/visitors?v=" + Date.now()).then(function (d) { st.vis = d; draw(); });
  var prev = window.HQ_BOARD_CHANGED;
  window.HQ_BOARD_CHANGED = function (b) { st.board = b; draw(); if (prev) prev(b); };
  window.HQ_OV_REDRAW = function () { draw(); };

  function kpi(o) {
    return "<" + (o.href ? 'a href="' + o.href + '"' : "div") + ' class="ov-kpi' + (o.dark ? " dark" : "") + '"><small><i>' + o.icon + "</i>" + o.label + "</small><b>" + o.value + "</b><em>" + o.sub + "</em>" + (o.extra || "") + "</" + (o.href ? "a" : "div") + ">";
  }
  function draw() {
    var dir = HQ.dir();
    var premium = dir.filter(function (b) { return b.premium || b.featured; }).length, postcard = dir.filter(function (b) { return b.postcard; }).length, claimed = dir.filter(function (b) { return b.claimed; }).length;
    var places = dir.filter(function (b) { return b.public; }).length;

    // Postcard money for the cards that are mailing now
    var camps = mailings.map(function (m) { return m.route + ":" + m.mail; });
    var inc = 0, exp = 0, missing = 0;
    (st.lines || []).forEach(function (l) { if (camps.indexOf(l.campaign) < 0) return; if (l.kind === "income") { inc += l.amount; if (!l.amount) missing++; } else exp += l.amount; });
    var profit = inc - exp;

    // Spots
    var sold = 0, min = 0, split = "", routes = st.board && st.board.routes;
    mailings.forEach(function (m, i) {
      var list = routes && routes[m.route]; min += m.minSold || 8;
      var s = list ? list.filter(function (r) { return r.status === "Sold"; }).length : 0; sold += s;
      split += '<span title="' + esc(m.name) + ": " + s + ' sold" style="width:' + (100 / Math.max(1, mailings.length)) * Math.min(1, s / (m.minSold || 8)) + "%;background:" + (i ? "var(--hq-gold)" : "var(--hq-green)") + '"></span>';
    });
    var cardsLine = mailings.map(function (m) { var list = routes && routes[m.route]; return esc(m.name.replace(" Palm Desert", "")) + " " + (list ? list.filter(function (r) { return r.status === "Sold"; }).length : "–") + "/" + (m.minSold || 8); }).join(" · ");

    var h = new Date().getHours(), hi = h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
    var greet = document.querySelector(".hq-head h1"); if (greet && document.body.dataset.sec === "overview") greet.textContent = hi + ", Todd";

    // Directory mix: listings per category
    var byCat = {}; dir.forEach(function (b) { if (!b.public) byCat[b.category] = (byCat[b.category] || 0) + 1; });
    var cats = Object.keys(byCat).sort(function (a, b) { return byCat[b] - byCat[a]; }).slice(0, 7), top = cats.length ? byCat[cats[0]] : 1;

    box.innerHTML = '<div class="ov-kpis">' +
      kpi({ dark: true, icon: ic.money, label: "Postcard income · this mailing", href: "#mailings",
        value: st.lines ? HQ.money(inc) : "—",
        sub: st.lines ? "Costs " + HQ.money(exp) + " · " + (profit >= 0 ? '<span class="pos">+' + HQ.money(profit) + " profit</span>" : '<span class="neg">' + HQ.money(profit) + " to break even</span>") + (missing ? " · " + missing + " amount" + (missing > 1 ? "s" : "") + " missing" : "") : "Loading…" }) +
      kpi({ icon: ic.card, label: "Spots sold", href: "#board", value: routes ? sold + '<span style="font-size:18px;color:var(--hq-ink-3)"> / ' + min + "</span>" : "—", sub: routes ? cardsLine : "Loading…", extra: '<div class="ov-split">' + split + "</div>" }) +
      kpi({ icon: ic.list, label: "Directory listings", href: "#listings", value: (dir.length - places).toLocaleString(), sub: premium + " Premium · " + postcard + " on the postcard · " + claimed + " claimed" + (places ? " · plus " + places + " public places" : "") }) +
      kpi({ icon: ic.eye, label: "Visitors today", value: st.vis ? (st.vis.today || 0).toLocaleString() : "—", sub: st.vis ? (st.vis.month || 0).toLocaleString() + " visits this month" : "Loading…" }) +
      "</div>" +
      '<div class="ov-grid"><div class="ov-card"><h3>Directory by category <a href="#listings">Open directory &rarr;</a></h3><div class="ov-mix">' +
      cats.map(function (c) { return '<div class="ov-mix-row"><span>' + esc(c) + '</span><div class="bar"><i style="width:' + Math.round(byCat[c] / top * 100) + '%"></i></div><b>' + byCat[c] + "</b></div>"; }).join("") +
      '</div></div><div class="ov-card"><h3>Quick actions</h3><div class="ov-quick">' +
      '<button type="button" data-act="new">' + ic.plus + "New listing</button>" +
      '<button type="button" data-act="hold">' + ic.card + "Hold a spot</button>" +
      '<a href="#inbox">' + ic.inbox + "Review the inbox</a>" +
      '<a href="#reports">' + ic.mail + "Send monthly reports</a>" +
      '<a href="#sales">' + ic.target + "Who to call next</a>" +
      '<a href="./" target="_blank" rel="noopener">' + ic.globe + "Open the live site</a>" +
      "</div></div></div>";
  }
  box.addEventListener("click", function (e) {
    var a = e.target.closest("[data-act]"); if (!a) return;
    if (a.dataset.act === "new" && HQ.newListing) HQ.newListing();
    if (a.dataset.act === "hold" && HQ.holdSpot) { location.hash = "board"; setTimeout(HQ.holdSpot, 50); }
  });
  draw();
})();
