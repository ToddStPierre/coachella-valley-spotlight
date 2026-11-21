/* Spotlight HQ: Mailings & money as campaign cards (2026-11-21).
   One card per mailing (data/mailings.js): spots filled (a bar, one segment per spot), dollars sold, income/expenses/profit,
   and the in-homes date. Click a card to edit it in a drawer: card details and dates (saved through the tracker's
   POST /admin/mailings, which commits data/mailings.js), and its income and expense lines (POST /admin/campaigns).
   Spot data comes from the Postcard board (admin-board.js, via HQ_BOARD_CHANGED). Replaces the two old tables in this section. */
(function () {
  var HQ = window.HQ; if (!HQ) return;
  var esc = HQ.esc, API = HQ.TRACKER, KEY = HQ.key, FX = window.CVS_FMT || {}, F9 = (window.CVS_FORMATS || {})["9x12"];
  var PRINT = 967, POSTAGE = 0.33; // Todd's campaign costs, 2026-11-21: printing 5,000 cards, postage + handling per piece
  var ROUTES = {}; Object.keys(HQ.ROUTES).forEach(function (r) { ROUTES[r] = HQ.ROUTES[r]; });
  var list = JSON.parse(JSON.stringify(window.CVS_MAILINGS || []));
  list.forEach(function (m) { if (m.route && m.name) ROUTES[m.route] = ROUTES[m.route] || m.name; });
  var lines = [], linesOk = false, board = null, view = "upcoming", tmp = 0, openKey = null;

  var box = document.createElement("div"); box.id = "campaigns-admin";
  (document.getElementById("mailings-admin") || document.getElementById("st-out")).before(box);

  // ---- helpers ----
  function ymd(s) { var p = String(s || "").split("-"); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function today() { var t = new Date(); t.setHours(0, 0, 0, 0); return t; }
  function days(s) { return Math.round((ymd(s) - today()) / 864e5); }
  function short(s) { return s ? ymd(s).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—"; }
  function long(s) { return s ? ymd(s).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"; }
  function usd(cents) { return HQ.money(cents); }
  function ck(m) { return m.route + ":" + m.mail; }
  function zip(m) { return (String(m.area || "").match(/\b9\d{4}\b/) || [""])[0]; }
  function city(m) { return String(m.area || "").replace(/\s*\b9\d{4}\b.*$/, "").replace(/,.*$/, "").trim() || m.name; }
  function homesN(m) { return parseInt(String(m.homes || "").replace(/[^0-9]/g, ""), 10) || 5000; }
  function nine(m) { return m.format === "9x12"; }
  function spotsOf(m) {
    var c = board && (board.cards || []).filter(function (x) { return x.route === m.route && x.mail === m.mail; })[0];
    if (c) return c.spots;
    // The board has loaded but doesn't know this card yet (a new card shows up there within ~15 minutes): nothing is booked.
    return board ? Array.from({ length: nine(m) ? 20 : 16 }, function (_, k) { return { position: k + 1, status: "open" }; }) : null;
  }
  function stOf(r) { var s = String((r && r.status) || "open").toLowerCase(); return s === "sold" ? "sold" : s === "open" ? "open" : "held"; }
  function linesOf(m) { var k = ck(m); return lines.filter(function (l) { return l.campaign === k; }); }
  function totals(ls) { var t = { inc: 0, exp: 0 }; ls.forEach(function (l) { if (l.kind === "income") t.inc += l.amount || 0; else t.exp += l.amount || 0; }); t.profit = t.inc - t.exp; return t; }
  function fullValue(m) { return nine(m) ? FX.blockPrice("9x12", F9.map.map(function (s) { return s.pos; })) : 16 * 300; }
  function soldValue(m, sp) {
    if (!sp) return null;
    if (nine(m)) return FX.soldDollars("9x12", sp);
    return sp.reduce(function (n, r) { return n + (stOf(r) === "sold" ? 300 : 0); }, 0);
  }
  // ---- projection (2026-11-21) ----
  // A card only prints and mails once it reaches its minimum, so a card below it projects $0 income and $0 cost.
  // booked = sold + held ads at list price (9x12) or $300 a spot (11x6), or the recorded income if that's higher.
  // cost = recorded expenses, or the standard cost (printing $967 + $0.33 a home) if that's higher, for 9x12 cards.
  // In dollars. A sold spot counts what was actually paid when the board has it (a joined ad's amount sits on its first spot).
  function bookedValue(m, sp) {
    if (!sp) return 0;
    return sp.reduce(function (n, r) {
      var s = stOf(r); if (s === "open") return n;
      if (s === "sold" && r.paid && r.paid.amount != null) return n + r.paid.amount / 100;
      return n + (nine(m) ? FX.spotPrice("9x12", r.position) || 0 : 300);
    }, 0);
  }
  function stdCost(m) { return nine(m) ? Math.round((PRINT + POSTAGE * homesN(m)) * 100) : 0; }
  function proj(m) {
    var sp = spotsOf(m), t = totals(linesOf(m)), bk = bookedValue(m, sp) * 100, inc = Math.max(bk, t.inc);
    var need = nine(m) ? (m.minDollars || 2625) * 100 : (m.minSold || 8) * 30000;
    var cnt = sp ? sp.filter(function (r) { return stOf(r) !== "open"; }).length : 0;
    var on = days(m.mail) < 0 || confirmed(m, sp) || (nine(m) ? bk >= need : cnt >= (m.minSold || 8));
    var exp = on ? Math.max(t.exp, stdCost(m)) : 0;
    return { on: on, inc: on ? inc : 0, exp: exp, profit: (on ? inc : 0) - exp, rec: t, toGo: on ? 0 : (nine(m) ? need - bk : ((m.minSold || 8) - cnt) * 30000), booked: inc };
  }
  // Tentative cards (below their minimum) are projected as if they mail at the minimum:
  // income = what's booked or the minimum, whichever is more; costs = standard cost (or recorded, if more).
  function tent(m) {
    var p = proj(m), need = nine(m) ? (m.minDollars || 2625) * 100 : (m.minSold || 8) * 30000;
    var inc = Math.max(p.booked, need), exp = Math.max(p.rec.exp, stdCost(m));
    return { inc: inc, exp: exp, profit: inc - exp };
  }
  function sumProj(ms) {
    var s = { c: { inc: 0, exp: 0, profit: 0, n: 0 }, t: { inc: 0, exp: 0, profit: 0, n: 0, booked: 0, toGo: 0 }, n: 0, recInc: 0, recExp: 0 };
    ms.forEach(function (m) {
      var p = proj(m); s.n++; s.recInc += p.rec.inc; s.recExp += p.rec.exp;
      if (p.on) { s.c.n++; s.c.inc += p.inc; s.c.exp += p.exp; s.c.profit += p.profit; }
      else { var t = tent(m); s.t.n++; s.t.inc += t.inc; s.t.exp += t.exp; s.t.profit += t.profit; s.t.booked += p.booked; s.t.toGo += p.toGo; }
    });
    return s;
  }
  function trio(label, sub, x, cls) {
    return '<div class="cp-trio ' + cls + '"><div class="cp-trio-h"><b>' + label + "</b><span>" + sub + "</span></div>" +
      "<div><span>Income</span><b>" + usd(x.inc) + "</b></div><div><span>Costs</span><b>" + usd(x.exp) + '</b></div><div><span>Profit</span><b class="' + (x.profit < 0 ? "neg" : "pos") + '">' + usd(x.profit) + "</b></div></div>";
  }
  function projHtml(s, big) {
    var all = { inc: s.c.inc + s.t.inc, exp: s.c.exp + s.t.exp, profit: s.c.profit + s.t.profit };
    return '<div class="cp-proj2' + (big ? " big" : "") + '">' +
      trio("Confirmed", s.c.n + (s.c.n === 1 ? " card" : " cards") + " at or over the minimum", s.c, "conf") +
      trio("Tentative", s.t.n + (s.t.n === 1 ? " card" : " cards") + (s.t.n ? " &middot; if each mails at its minimum &middot; " + usd(s.t.booked) + " booked, " + usd(s.t.toGo) + " to go" : ""), s.t, "tent") +
      '<p class="cp-both">Both: income <b>' + usd(all.inc) + "</b> &middot; costs <b>" + usd(all.exp) + '</b> &middot; profit <b class="' + (all.profit < 0 ? "neg" : "pos") + '">' + usd(all.profit) + "</b>" +
      ' <span>&middot; Recorded so far: income ' + usd(s.recInc) + ", costs " + usd(s.recExp) + "</span></p></div>";
  }
  function minTxt(m) { return nine(m) ? "$" + (m.minDollars || 2625).toLocaleString("en-US") + " sold" : (m.minSold || 8) + " of 16 sold"; }
  function confirmed(m, sp) { return sp && FX.isConfirmed ? FX.isConfirmed(m, sp) : false; }
  function status(m, sp) {
    if (days(m.mail) < 0) return { k: "mailed", t: "Mailed" };
    if (confirmed(m, sp)) return { k: "ok", t: "Confirmed" };
    if (days(m.deadline) < 0) return { k: "late", t: "Artwork closed" };
    return { k: "tent", t: "Tentative" };
  }

  // ---- the grid ----
  function card(m, i) {
    var sp = spotsOf(m), st = status(m, sp), t = totals(linesOf(m)), n = nine(m) ? 20 : 16, pj = proj(m);
    var sold = sp ? sp.filter(function (r) { return stOf(r) === "sold"; }).length : 0, held = sp ? sp.filter(function (r) { return stOf(r) === "held"; }).length : 0;
    var segs = ""; for (var p = 1; p <= n; p++) { var r = sp && sp[p - 1]; segs += '<i class="' + (r ? stOf(r) : "open") + '"></i>'; }
    var dl = days(m.deadline), dm = days(m.mail), sv = soldValue(m, sp);
    var hot = st.k === "tent" && dl >= 0 && dl <= 14; // artwork due within 2 weeks and not confirmed yet
    return '<button type="button" class="cp-card cp-' + st.k + (hot ? " cp-hot" : "") + '" data-i="' + i + '">' +
      '<span class="cp-top"><span class="cp-title">' + esc((zip(m) ? zip(m) + ", " : "") + city(m)) + " &middot; " + esc(short(m.mail)) + '</span><span class="cp-badge">' + st.t + "</span></span>" +
      '<span class="cp-sub">' + esc(m.name) + " &middot; " + (nine(m) ? "9x12" : "11x6") + " &middot; " + esc(m.homes || "") + "</span>" +
      '<span class="cp-bar" aria-hidden="true">' + segs + "</span>" +
      '<span class="cp-row"><span>' + (sp ? sold + " of " + n + " spots sold" + (held ? " &middot; " + held + " held" : "") : "Loading spots&hellip;") + "</span><span>" + (sv == null ? "" : "$" + sv.toLocaleString("en-US") + " of $" + fullValue(m).toLocaleString("en-US")) + "</span></span>" +
      '<span class="cp-money"><span>Recorded: income <b>' + usd(t.inc) + "</b></span><span>costs <b>" + usd(t.exp) + "</b></span></span>" +
      '<span class="cp-pline ' + (pj.on ? "on" : "off") + '">' + (pj.on ? "On track &middot; projected profit <b>" + usd(pj.profit) + "</b>" : usd(pj.toGo) + " more to sell to mail") + "</span>" +
      '<span class="cp-foot"><span>In homes ' + esc(long(m.mail)) + ' <em>&middot; ' + (dm < 0 ? Math.abs(dm) + " days ago" : dm === 0 ? "today" : "in " + dm + (dm === 1 ? " day" : " days")) + "</em></span>" +
      '<span class="cp-art">Artwork ' + esc(short(m.deadline)) + (dl >= 0 && dm >= 0 ? " &middot; " + (dl === 0 ? "today" : dl + "d") : "") + "</span></span></button>";
  }
  function draw() {
    var idx = list.map(function (m, i) { return i; }).filter(function (i) { var d = days(list[i].mail); return view === "all" || (view === "past" ? d < 0 : d >= 0); });
    idx.sort(function (a, b) { var x = list[a], y = list[b]; return view === "past" ? (y.mail.localeCompare(x.mail) || x.name.localeCompare(y.name)) : (x.mail.localeCompare(y.mail) || x.name.localeCompare(y.name)); });
    var shown = idx.map(function (i) { return list[i]; });
    var groups = {}, order = [];
    idx.forEach(function (i) { var g = ymd(list[i].mail).toLocaleDateString("en-US", { month: "long", year: "numeric" }); if (!groups[g]) { groups[g] = []; order.push(g); } groups[g].push(i); });
    box.innerHTML = '<div class="cp-tools"><div class="hq-seg cp-view" role="group" aria-label="Which campaigns">' +
      [["upcoming", "Upcoming"], ["past", "Past"], ["all", "All"]].map(function (v) { return '<button type="button" data-view="' + v[0] + '"' + (view === v[0] ? ' class="on"' : "") + ">" + v[1] + "</button>"; }).join("") + "</div>" +
      '<button type="button" class="hq-btn" data-new>' + HQ.icons.plus + "<span>New campaign</span></button></div>" +
      (shown.length ? '<h3 class="cp-month">' + (view === "past" ? "All past campaigns" : view === "all" ? "All campaigns" : "All upcoming campaigns") + "</h3>" + projHtml(sumProj(shown), true) : "") +
      '<p class="bd-note cp-how">Confirmed = held + sold have reached the card&rsquo;s minimum (or it already mailed): income is those ads (sold at what was paid, held at list price, or what&rsquo;s recorded, if more). Tentative = still below the minimum, shown as if it mails at the minimum. Costs are printing $' + PRINT + " + $" + POSTAGE.toFixed(2) + " a home (or what&rsquo;s recorded, if more).</p>" +
      (linesOk ? "" : '<p class="bd-note" style="margin:0 0 12px">Loading income and expenses&hellip;</p>') +
      (order.length ? order.map(function (g) { return '<h3 class="cp-month">' + esc(g) + "</h3>" + projHtml(sumProj(groups[g].map(function (i) { return list[i]; }))) + '<div class="cp-grid">' + groups[g].map(function (i) { return card(list[i], i); }).join("") + "</div>"; }).join("")
        : '<p class="bd-note">No ' + (view === "past" ? "past" : "upcoming") + " campaigns.</p>");
  }

  // ---- the drawer ----
  function routeOpts(cur) { return Object.keys(ROUTES).map(function (r) { return '<option value="' + r + '"' + (r === cur ? " selected" : "") + ">" + esc(ROUTES[r]) + "</option>"; }).join(""); }
  function lineRow(l) {
    return '<tr data-id="' + esc(l.id) + '"><td><select data-f="kind"><option value="income"' + (l.kind === "income" ? " selected" : "") + '>Income</option><option value="expense"' + (l.kind === "expense" ? " selected" : "") + ">Expense</option></select></td>" +
      '<td><input data-f="label" value="' + esc(l.label) + '" placeholder="e.g. A3 · Business, or Printing"></td>' +
      '<td><input data-f="amount" inputmode="decimal" value="' + esc(((l.amount || 0) / 100).toFixed(2)) + '" class="cp-amt"></td>' +
      '<td><input data-f="note" value="' + esc(l.note) + '" placeholder="Note"></td>' +
      '<td><button type="button" class="hq-btn ghost sm" data-del title="Delete line">&times;</button></td></tr>';
  }
  function moneyHtml(m) {
    var ls = linesOf(m).slice().sort(function (a, b) { return (a.kind === b.kind ? 0 : a.kind === "income" ? -1 : 1) || (String(a.id) > String(b.id) ? 1 : -1); }), t = totals(ls);
    return '<div class="cp-sum cp-sum-dr"><span>Income <b>' + usd(t.inc) + "</b></span><span>Costs <b>" + usd(t.exp) + '</b></span><span>Profit <b class="' + (t.profit < 0 ? "neg" : "pos") + '">' + usd(t.profit) + "</b></span></div>" +
      '<div class="table-scroll"><table class="cp-lines"><thead><tr><th>Type</th><th>Description</th><th>Amount ($)</th><th>Note</th><th></th></tr></thead><tbody>' +
      (ls.map(lineRow).join("") || '<tr><td colspan="5" class="bd-note">No income or expenses yet.</td></tr>') + "</tbody></table></div>" +
      '<div class="cp-add"><button type="button" class="hq-btn ghost sm" data-add="income">+ Income</button><button type="button" class="hq-btn ghost sm" data-add="expense">+ Expense</button>' +
      '<button type="button" class="hq-btn ghost sm" data-costs>+ Printing &amp; postage</button><button type="button" class="hq-btn ghost sm" data-fromspots>+ Income from sold spots</button></div>' +
      '<p class="bd-note">Changes save when you click away from a field. Printing &amp; postage adds $' + PRINT + " printing and $" + POSTAGE.toFixed(2) + " a home for " + homesN(m).toLocaleString("en-US") + " homes.</p>";
  }
  function spotsHtml(m) {
    var sp = spotsOf(m); if (!sp) return '<p class="bd-note">Spot data is still loading from the Postcard board.</p>';
    var seen = {}, ads = [];
    sp.forEach(function (r) {
      if (stOf(r) === "open" || seen[r.position]) return;
      var blk = Array.isArray(r.block) && r.block.length ? r.block : [r.position]; blk.forEach(function (p) { seen[p] = 1; });
      var lbl = blk.map(function (p) { return nine(m) && FX.spotLabel ? FX.spotLabel("9x12", p) : String(p); }).join("+");
      ads.push('<li><span class="cp-dot ' + stOf(r) + '"></span><b>' + esc(lbl) + "</b> " + esc(r.business || r.category || "Taken") + (r.category && r.business ? ' <span class="bd-note">' + esc(r.category) + "</span>" : "") + '<span class="cp-st">' + (stOf(r) === "sold" ? "Paid" + (r.paid && r.paid.amount ? " " + usd(r.paid.amount) : "") : "Held") + "</span></li>");
    });
    var sv = soldValue(m, sp);
    return '<p class="cp-spot-sum">' + (nine(m) ? "$" + sv.toLocaleString("en-US") + " sold of $" + (m.minDollars || 2625).toLocaleString("en-US") + " needed to mail" : sp.filter(function (r) { return stOf(r) === "sold"; }).length + " of " + (m.minSold || 8) + " sold needed to mail") + "</p>" +
      (ads.length ? '<ul class="cp-ads">' + ads.join("") + "</ul>" : '<p class="bd-note">No spots held or sold yet.</p>') +
      '<a class="hq-btn ghost sm" href="#board" data-board>Open on the Postcard board</a>';
  }
  function detailsHtml(m) {
    var f9 = nine(m);
    return '<div class="hq-row"><label class="hq-f">Route<select name="route">' + routeOpts(m.route) + '</select></label><label class="hq-f">Card name<input name="name" value="' + esc(m.name) + '"></label></div>' +
      '<div class="hq-row"><label class="hq-f">In homes (mail date)<input type="date" name="mail" value="' + esc(m.mail) + '"></label><label class="hq-f">Artwork due<input type="date" name="deadline" value="' + esc(m.deadline) + '"></label></div>' +
      '<div class="hq-row"><label class="hq-f">Area<input name="area" value="' + esc(m.area) + '" placeholder="Palm Desert 92260"></label><label class="hq-f">Homes<input name="homes" value="' + esc(m.homes) + '" placeholder="4,968 homes"></label></div>' +
      '<div class="hq-row"><label class="hq-f">Card<select name="format"><option value="9x12"' + (f9 ? " selected" : "") + '>9 x 12, 20 spots (Full/Half)</option><option value="11x6"' + (f9 ? "" : " selected") + ">11 x 6, 16 spots</option></select></label>" +
      '<label class="hq-f">Mails once<span class="cp-min">' + (f9 ? '$ <input type="number" name="minDollars" min="100" max="100000" step="25" value="' + esc(m.minDollars || 2625) + '"> sold' : '<input type="number" name="minSold" min="1" max="16" value="' + esc(m.minSold || 8) + '"> of 16 sold') + "</span></label></div>" +
      '<div class="cp-save-row"><button type="button" class="hq-btn" data-save>Save card details</button><span class="hq-msg" id="cp-msg"></span></div>';
  }
  function open(i, isNew) {
    var m = isNew ? i : list[i]; openKey = isNew ? null : ck(m);
    var body = '<fieldset class="hq-fs"><legend>Card and dates</legend>' + detailsHtml(m) + "</fieldset>" +
      (isNew ? '<p class="bd-note">Save the card first, then you can add its income and expenses.</p>' :
        '<fieldset class="hq-fs"><legend>Spots</legend><div id="cp-spots">' + spotsHtml(m) + "</div></fieldset>" +
        '<fieldset class="hq-fs"><legend>Income &amp; expenses</legend><div id="cp-money">' + moneyHtml(m) + "</div></fieldset>");
    var sp = isNew ? null : spotsOf(m), taken = sp ? sp.some(function (r) { return stOf(r) !== "open"; }) : false;
    var foot = isNew ? '<span class="sp"></span><button type="button" class="hq-btn ghost" data-x>Cancel</button>'
      : (taken ? '<span class="bd-note">Spots are booked on this card, so it can&rsquo;t be deleted.</span>' : '<button type="button" class="hq-btn danger" data-delcard>Delete campaign</button>') + '<span class="sp"></span><button type="button" class="hq-btn ghost" data-x>Close</button>';
    HQ.drawer({ eyebrow: isNew ? "New campaign" : esc(minTxt(m)) + " to mail", title: isNew ? "New campaign" : (zip(m) ? zip(m) + ", " : "") + city(m) + " · " + short(m.mail), sub: isNew ? "" : esc(m.name) + " &middot; in homes " + esc(long(m.mail)), body: body, foot: foot,
      onOpen: function (d, api) { wire(d, api, m, isNew ? -1 : i, taken); } });
  }
  function fval(d, n) { var el = d.querySelector('[name="' + n + '"]'); return el ? el.value.trim() : ""; }
  function wire(d, api, m, i, taken) {
    var msg = function (t) { var p = d.querySelector("#cp-msg"); if (p) p.textContent = t; };
    d.querySelector("[data-x]").onclick = function () { api.close(); };
    d.querySelector('[name="format"]').onchange = function (e) {
      var draft = read(d, m); draft.format = e.target.value === "9x12" ? "9x12" : undefined;
      d.querySelector(".hq-fs").innerHTML = "<legend>Card and dates</legend>" + detailsHtml(draft); wire(d, api, draft, i, taken);
    };
    d.querySelector('[name="route"]').onchange = function (e) { var n = d.querySelector('[name="name"]'); if (!n.value || n.value === ROUTES[m.route]) n.value = ROUTES[e.target.value] || ""; };
    d.querySelector("[data-save]").onclick = function (e) {
      var nm = read(d, m), err = check(nm, i); if (err) return msg(err);
      if (i >= 0 && taken && (nm.route !== m.route || nm.mail !== m.mail)) return msg("Spots are booked on this card. Move them on the Postcard board first (Move to another card), then change the route or mail date.");
      var next = list.slice(); if (i >= 0) next[i] = nm; else next.push(nm);
      e.target.disabled = true; msg("Saving…");
      saveList(next).then(function () {
        var oldK = i >= 0 ? ck(m) : null, newK = ck(nm), moves = oldK && oldK !== newK ? lines.filter(function (l) { return l.campaign === oldK; }) : [];
        return Promise.all(moves.map(function (l) { return saveLine({ id: l.id, campaign: newK, kind: l.kind, label: l.label, amount: (l.amount / 100).toFixed(2), note: l.note }); })).then(function () {
          draw(); HQ.toast("Saved. The site shows the new details in about a minute.");
          var ni = -1; list.forEach(function (x, k) { if (ck(x) === newK) ni = k; });
          if (ni >= 0) open(ni); else api.close();
        });
      }).catch(function (er) { e.target.disabled = false; msg("Couldn’t save: " + er.message); });
    };
    var dc = d.querySelector("[data-delcard]");
    if (dc) dc.onclick = function () {
      if (linesOf(m).length) return HQ.toast("Delete its income and expense lines first.");
      if (dc.textContent !== "Click again to delete") { dc.textContent = "Click again to delete"; setTimeout(function () { if (dc.isConnected) dc.textContent = "Delete campaign"; }, 4000); return; }
      var next = list.filter(function (x, k) { return k !== i; });
      saveList(next).then(function () { api.close(); draw(); HQ.toast("Campaign deleted."); }).catch(function (er) { HQ.toast("Couldn’t delete: " + er.message); });
    };
    var bl = d.querySelector("[data-board]"); if (bl) bl.onclick = function () { api.close(); if (window.HQ.board) { var b = window.HQ.board(); if (b) b.view = m.mail; } };
    var mb = d.querySelector("#cp-money"); if (mb) wireMoney(mb, m);
  }
  function read(d, m) {
    var nm = { route: fval(d, "route"), name: fval(d, "name") || ROUTES[fval(d, "route")], area: fval(d, "area"), homes: fval(d, "homes"), mail: fval(d, "mail"), deadline: fval(d, "deadline"), minSold: m.minSold || 8 };
    if (fval(d, "format") === "9x12") { nm.format = "9x12"; nm.minDollars = parseInt(fval(d, "minDollars"), 10) || m.minDollars || 2625; }
    else if (d.querySelector('[name="minSold"]')) nm.minSold = parseInt(fval(d, "minSold"), 10) || 8;
    return nm;
  }
  function check(m, i) {
    if (!m.route || !m.mail || !m.deadline) return "Pick a route and fill in both dates.";
    if (m.deadline > m.mail) return "The artwork date has to be on or before the mail date.";
    if (m.format === "9x12" && !(m.minDollars >= 100 && m.minDollars <= 100000)) return "The minimum must be $100 to $100,000.";
    if (!(m.minSold >= 1 && m.minSold <= 16)) return "The minimum must be 1 to 16 spots.";
    if (list.some(function (x, k) { return k !== i && x.route === m.route && x.mail === m.mail; })) return "There's already a " + ROUTES[m.route] + " card on " + long(m.mail) + ".";
    return "";
  }
  function saveList(next) {
    return fetch(API + "/admin/mailings", { method: "POST", body: JSON.stringify({ key: KEY, mailings: next }) })
      .then(function (r) { return r.json().then(function (d) { if (!r.ok) throw new Error(d.detail || d.error || "Save failed"); return d; }); })
      .then(function (d) { list = d.mailings || next; window.CVS_MAILINGS = JSON.parse(JSON.stringify(list)); });
  }
  function saveLine(l) {
    return fetch(API + "/admin/campaigns", { method: "POST", body: JSON.stringify({ key: KEY, op: "save", line: l }) })
      .then(function (r) { return r.json().then(function (d) { if (!r.ok) throw new Error(d.error || "Couldn't save."); return d; }); })
      .then(function (d) { lines = lines.filter(function (x) { return String(x.id) !== String(l.id || "") && String(x.id) !== String(d.line.id); }).concat(d.line); return d.line; });
  }
  function redrawMoney(mb, m) { mb.innerHTML = moneyHtml(m); draw(); }
  function wireMoney(mb, m) {
    mb.addEventListener("change", function (e) {
      var tr = e.target.closest("tr[data-id]"); if (!tr) return;
      var id = tr.getAttribute("data-id"), f = {}; tr.querySelectorAll("[data-f]").forEach(function (el) { f[el.getAttribute("data-f")] = el.value.trim(); });
      if (!f.label) return HQ.toast("Add a description to save that line.");
      saveLine({ id: /^t/.test(id) ? 0 : +id, campaign: ck(m), kind: f.kind, label: f.label, amount: f.amount, note: f.note })
        .then(function (l) { if (/^t/.test(id)) lines = lines.filter(function (x) { return String(x.id) !== id; }); redrawMoney(mb, m); HQ.toast("Saved " + l.label + "."); })
        .catch(function (er) { HQ.toast(er.message); });
    });
    mb.addEventListener("click", function (e) {
      var add = e.target.closest("[data-add]");
      if (add) { lines.push({ id: "t" + (++tmp), campaign: ck(m), kind: add.getAttribute("data-add"), label: "", amount: 0, note: "" }); mb.innerHTML = moneyHtml(m); var inp = mb.querySelector('tr[data-id="t' + tmp + '"] [data-f="label"]'); if (inp) inp.focus(); return; }
      if (e.target.closest("[data-costs]")) {
        var have = linesOf(m).map(function (l) { return l.label.toLowerCase(); }), todo = [];
        if (!have.some(function (x) { return /print/.test(x); })) todo.push({ kind: "expense", label: "Printing", amount: PRINT.toFixed(2), note: "5,000 cards" });
        if (!have.some(function (x) { return /postage/.test(x); })) todo.push({ kind: "expense", label: "Postage & handling", amount: (POSTAGE * homesN(m)).toFixed(2), note: homesN(m).toLocaleString("en-US") + " homes x $" + POSTAGE.toFixed(2) });
        if (!todo.length) return HQ.toast("Printing and postage are already on this campaign.");
        return chain(todo, m).then(function () { redrawMoney(mb, m); HQ.toast("Added printing and postage."); });
      }
      if (e.target.closest("[data-fromspots]")) {
        var sp = spotsOf(m); if (!sp) return HQ.toast("Spot data is still loading.");
        var inc = linesOf(m).filter(function (l) { return l.kind === "income"; }).map(function (l) { return l.label.toLowerCase(); }), seen = {}, add2 = [];
        sp.forEach(function (r) {
          if (stOf(r) !== "sold" || seen[r.position]) return;
          var blk = Array.isArray(r.block) && r.block.length ? r.block : [r.position]; blk.forEach(function (p) { seen[p] = 1; });
          var biz = r.business || r.category || "Spot " + r.position; if (inc.some(function (x) { return x.indexOf(biz.toLowerCase()) > -1; })) return;
          var lbl = blk.map(function (p) { return nine(m) && FX.spotLabel ? FX.spotLabel("9x12", p) : "Spot " + p; }).join("+");
          var paid = blk.reduce(function (n, p) { var x = sp[p - 1]; return n + (x && x.paid && x.paid.amount ? x.paid.amount : 0); }, 0);
          var list$ = nine(m) ? FX.blockPrice("9x12", blk) * 100 : 30000 * blk.length;
          add2.push({ kind: "income", label: lbl + " · " + biz, amount: ((paid || list$) / 100).toFixed(2), note: paid ? "paid (from the board)" : "list price, check what they paid" });
        });
        if (!add2.length) return HQ.toast("Every sold spot is already in income.");
        return chain(add2, m).then(function () { redrawMoney(mb, m); HQ.toast("Added " + add2.length + " income line" + (add2.length === 1 ? "" : "s") + "."); });
      }
      var del = e.target.closest("[data-del]"); if (!del) return;
      var tr = del.closest("tr[data-id]"), id = tr.getAttribute("data-id");
      if (/^t/.test(id)) { lines = lines.filter(function (l) { return String(l.id) !== id; }); mb.innerHTML = moneyHtml(m); return; }
      if (!del.classList.contains("arm")) { del.classList.add("arm"); del.textContent = "Delete?"; setTimeout(function () { if (del.isConnected) { del.classList.remove("arm"); del.innerHTML = "&times;"; } }, 4000); return; }
      fetch(API + "/admin/campaigns", { method: "POST", body: JSON.stringify({ key: KEY, op: "delete", id: +id }) })
        .then(function (r) { if (!r.ok) throw 0; lines = lines.filter(function (l) { return String(l.id) !== id; }); redrawMoney(mb, m); HQ.toast("Deleted."); })
        .catch(function () { HQ.toast("Couldn't delete. Try again."); });
    });
  }
  function chain(todo, m) { return todo.reduce(function (p, l) { return p.then(function () { return saveLine({ id: 0, campaign: ck(m), kind: l.kind, label: l.label, amount: l.amount, note: l.note }); }); }, Promise.resolve()).catch(function (er) { HQ.toast(er.message); }); }

  // ---- events and data ----
  box.addEventListener("click", function (e) {
    var v = e.target.closest("[data-view]"); if (v) { view = v.getAttribute("data-view"); draw(); return; }
    if (e.target.closest("[data-new]")) {
      var last = list.filter(function (m) { return days(m.mail) >= 0; }).slice(-1)[0] || list[list.length - 1] || { route: "el-paseo", name: "El Paseo", area: "Palm Desert 92260", homes: "4,968 homes" };
      return open({ route: last.route, name: last.name, area: last.area, homes: last.homes, mail: "", deadline: "", minSold: 8, format: "9x12", minDollars: 2625 }, true);
    }
    var c = e.target.closest(".cp-card"); if (c) open(+c.getAttribute("data-i"));
  });
  var prev = window.HQ_BOARD_CHANGED;
  window.HQ_BOARD_CHANGED = function (b) {
    board = b; draw();
    var sb = document.querySelector(".hq-drawer #cp-spots"); if (sb && openKey) { var m = list.filter(function (x) { return ck(x) === openKey; })[0]; if (m) sb.innerHTML = spotsHtml(m); }
    if (prev) prev(b);
  };
  if (window.HQ.board && window.HQ.board() && window.HQ.board().cards && window.HQ.board().cards.length) board = window.HQ.board();
  fetch(API + "/admin/campaigns?key=" + encodeURIComponent(KEY)).then(function (r) { return r.json(); }).then(function (d) { if (!d.error) { lines = d.lines || []; linesOk = true; draw(); } }).catch(function () {});
  draw();
})();
