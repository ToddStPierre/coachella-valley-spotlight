/* Spotlight HQ: Postcard board (2026-11-09). Both cards drawn spot by spot (front 1–8, back 9–16, 4 across, 2 down).
   Click a spot to see who has it, then Mark paid / Move to pending / Release, or hold an open spot for someone.
   Reads GET /api/admin/board and writes POST /api/admin/spot on the reservations Worker (admin key).
   Until that Worker update is deployed, it falls back to the public /api/spots (status + category only) and is read-only.
   2026-11-11: several cards per route. The date tabs pick which mailing you're looking at; "Move to another card"
   moves a held or sold ad to a later mailing on the same route (for example if a card doesn't reach its minimum). */
(function () {
  var HQ = window.HQ; if (!HQ) return;
  var esc = HQ.esc;
  var box = document.createElement("div"); box.id = "board-admin";
  box.innerHTML = '<div class="empty">Loading the postcard board&hellip;</div>';
  document.getElementById("st-out").before(box);

  var PRICES = { 1: 30000, 2: 55000, 4: 100000, 8: 200000 };
  var SIZE_NAME = { 1: "1 spot", 2: "2 spots, side by side", 4: "4 spots (2×2 block)", 8: "Full side (8 spots)" };
  var st = { routes: null, cards: [], view: null, cats: [], live: false, sel: null };
  var mailings = window.CVS_MAILINGS || [];
  function mailingOf(route, mail) { return mailings.filter(function (m) { return m.route === route && (!mail || m.mail === mail); })[0] || { name: HQ.ROUTES[route] || route, minSold: 8, mail: mail }; }
  function cardOf(route, mail) { return st.cards.filter(function (c) { return c.route === route && c.mail === mail; })[0] || null; }
  function listOf(route, mail) { var c = cardOf(route, mail); return c ? c.spots : []; }
  function dates() { var d = []; st.cards.forEach(function (c) { if (d.indexOf(c.mail) < 0) d.push(c.mail); }); return d.sort(); }
  function fmtDay(s) { if (!s) return ""; var d = new Date(s + (s.length === 10 ? "T12:00:00" : "")); return d.toLocaleDateString("en-US", { month: "short", day: "numeric" }); }
  function daysTo(s) { if (!s) return null; return Math.ceil((new Date(s + "T23:59:59") - new Date()) / 864e5); }
  function isSold(r) { return r && r.status === "Sold"; }
  function isPend(r) { return r && r.status && r.status !== "open" && r.status !== "Sold"; }

  function load() {
    return fetch(HQ.SPOTS + "/api/admin/board?key=" + encodeURIComponent(HQ.key)).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }).then(function (d) {
      st.routes = d.routes; st.cats = d.categories || []; st.live = true;
      // Older Worker (no "cards"): one card per route, dated from the calendar.
      st.cards = d.cards || Object.keys(d.routes).map(function (rt) { var m = mailingOf(rt); return { route: rt, mail: m.mail, deadline: m.deadline, spots: d.routes[rt] }; });
    }).catch(function () {
      // Public fallback: no names, read-only. One request per card on the calendar.
      var cal = mailings.filter(function (m) { return HQ.ROUTES[m.route]; });
      return Promise.all(cal.map(function (m) {
        return fetch(HQ.SPOTS + "/api/spots?route=" + m.route + "&mail=" + m.mail).then(function (r) { return r.json(); }).then(function (d) { return [m, d]; });
      })).then(function (res) {
        st.routes = {}; st.cards = []; st.live = false;
        res.forEach(function (x) {
          st.cats = x[1].categories || st.cats;
          var spots = (x[1].positions || []).map(function (p) { return { position: p.position, status: p.status || "open", category: p.category }; });
          st.cards.push({ route: x[0].route, mail: x[1].mail || x[0].mail, deadline: x[0].deadline, spots: spots });
          if (!st.routes[x[0].route]) st.routes[x[0].route] = spots;
        });
      });
    }).then(function () {
      var ds = dates(), t = new Date().toISOString().slice(0, 10);
      if (!st.view || ds.indexOf(st.view) < 0) st.view = ds.filter(function (d) { return d >= t; })[0] || ds[0] || null;
      draw();
    }).catch(function () { box.innerHTML = '<div class="empty">Could not load the postcard board. Try again in a minute.</div>'; });
  }

  // Group spots into ads: a block (2, 4 or 8 spots) is one tile, placed at its top-left spot.
  function tiles(list, side) {
    var out = [], seen = {};
    list.filter(function (r) { return (r.position <= 8 ? 0 : 1) === side; }).forEach(function (r) {
      if (seen[r.position]) return;
      var block = (r.status !== "open" && Array.isArray(r.block) && r.block.length > 1) ? r.block.slice().sort(function (a, b) { return a - b; }) : [r.position];
      block.forEach(function (p) { seen[p] = 1; });
      var first = block[0], col = (first - 1) % 4, row = Math.floor(((first - 1) % 8) / 4);
      var cols = block.length === 8 ? 4 : block.length === 4 ? 2 : block.length, rows = block.length >= 4 ? 2 : 1;
      out.push({ r: r, block: block, col: col, row: row, cols: cols, rows: rows });
    });
    return out;
  }
  function tileHtml(route, mail, t) {
    var r = t.r, cls = isSold(r) ? "sold" : isPend(r) ? "pending" : "open";
    var label = t.block.length > 1 ? "Spots " + t.block[0] + "–" + t.block[t.block.length - 1] : "Spot " + r.position;
    var biz = cls === "open" ? "Open" : (r.business || (st.live ? "(no name)" : r.category || "Taken"));
    return '<button type="button" class="bd-spot ' + cls + (st.sel === route + ":" + mail + ":" + t.block[0] ? " sel" : "") + '" style="grid-column:' + (t.col + 1) + " / span " + t.cols + ";grid-row:" + (t.row + 1) + " / span " + t.rows + '" data-route="' + route + '" data-mail="' + mail + '" data-pos="' + t.block[0] + '">' +
      '<span class="n">' + label + '</span><i class="st"></i><span class="biz">' + esc(biz) + "</span>" + (cls !== "open" && r.category ? '<span class="cat">' + esc(r.category) + "</span>" : '<span class="cat">' + (cls === "open" ? "Click to hold" : "") + "</span>") + "</button>";
  }
  function draw() {
    var html = '<div class="bd-tools"><div class="bd-legend"><span><i style="background:var(--hq-green)"></i>Sold (paid)</span><span><i style="background:var(--hq-gold)"></i>Held, waiting on payment</span><span><i style="background:#ddd2c3"></i>Open</span></div>' +
      '<span class="bd-note">Prices: 1 spot $300 · 2 spots $550 · 2×2 block $1,000 · full side $2,000</span></div>' +
      (st.live ? "" : '<div class="bd-warn"><b>Read-only for now.</b> Names and spot editing turn on once the reservations Worker update is deployed. Until then this shows what the public board shows.</div>');
    var ds = dates();
    if (ds.length > 1) html += '<div class="bd-mails" role="tablist" aria-label="Which mailing">' + ds.map(function (d) {
      var sold = st.cards.filter(function (c) { return c.mail === d; }).reduce(function (n, c) { return n + c.spots.filter(isSold).length; }, 0);
      return '<button type="button" role="tab" class="hq-btn ' + (d === st.view ? "" : "ghost ") + 'sm" data-view="' + d + '" aria-selected="' + (d === st.view) + '">Mails ' + fmtDay(d) + ' <span style="opacity:.75">· ' + sold + " sold</span></button>";
    }).join("") + "</div>";
    html += '<div class="bd-wrap">' + st.cards.filter(function (c) { return c.mail === st.view; }).map(function (c) {
      var route = c.route, list = c.spots, m = mailingOf(route, c.mail);
      var sold = list.filter(isSold).length, pend = list.filter(isPend).length, open = list.length - sold - pend;
      var income = list.reduce(function (n, r) { return n + (isSold(r) && r.paid && r.paid.amount ? r.paid.amount : 0); }, 0);
      var left = daysTo(m.deadline);
      return '<section class="bd-route"><div class="bd-head"><div><h2>' + esc(m.name) + "</h2><p>" + esc(m.homes || "") + (m.mail ? " · mails " + fmtDay(m.mail) : "") + (m.deadline ? " · artwork due " + fmtDay(m.deadline) + (left != null && left >= 0 ? " (" + left + (left === 1 ? " day" : " days") + ")" : " (closed)") : "") + "</p></div>" +
        '<div class="bd-stats"><div><b>' + sold + '<span style="font-size:14px;color:var(--hq-ink-3);text-transform:none;letter-spacing:0"> / ' + (m.minSold || 8) + "</span></b><span>Sold</span></div><div><b>" + pend + "</b><span>Held</span></div><div><b>" + open + "</b><span>Open</span></div>" +
        (st.live ? "<div><b>" + HQ.money(income) + "</b><span>Paid on board</span></div>" : "") + "</div></div>" +
        '<div class="bd-sides">' + [0, 1].map(function (side) {
          return '<div class="bd-side"><div class="bd-side-label"><span>' + (side ? "Back" : "Front") + "</span><span>Spots " + (side ? "9–16" : "1–8") + '</span></div><div class="bd-grid">' + tiles(list, side).map(function (t) { return tileHtml(route, c.mail, t); }).join("") + "</div></div>";
        }).join("") + "</div></section>";
    }).join("") + "</div>";
    box.innerHTML = html;
    if (window.HQ_BOARD_CHANGED) window.HQ_BOARD_CHANGED(st);
  }
  window.HQ.board = function () { return st; };

  box.addEventListener("click", function (e) {
    var v = e.target.closest("[data-view]"); if (v) { st.view = v.dataset.view; st.sel = null; draw(); return; }
    var b = e.target.closest(".bd-spot"); if (!b) return;
    openSpot(b.dataset.route, b.dataset.mail, +b.dataset.pos);
  });

  function catOptions(route, mail, current, positions) {
    var taken = {}; listOf(route, mail).forEach(function (r) { if (r.status !== "open" && r.category && positions.indexOf(r.position) < 0) taken[r.category] = r.position; });
    return '<option value="">Pick a category</option>' + st.cats.map(function (c) {
      return '<option value="' + esc(c) + '"' + (c === current ? " selected" : "") + (taken[c] && c !== current ? " disabled" : "") + ">" + esc(c) + (taken[c] && c !== current ? " (taken, Spot " + taken[c] + ")" : "") + "</option>";
    }).join("");
  }
  // Shapes an open spot can grow into, given what's free around it.
  function shapesFor(route, mail, pos) {
    var list = listOf(route, mail), free = function (p) { var r = list[p - 1]; return r && r.status === "open"; };
    var side = pos <= 8 ? 0 : 8, i = pos - 1 - side, col = i % 4, row = Math.floor(i / 4), out = [[pos]];
    if (col < 3 && free(pos + 1)) out.push([pos, pos + 1]);
    var top = row === 0 ? pos : pos - 4, c0 = col < 3 ? 0 : -1, a = top + c0;
    var sq = [a, a + 1, a + 4, a + 5];
    if (sq.every(free) && sq.indexOf(pos) > -1) out.push(sq);
    var all = []; for (var k = 1; k <= 8; k++) all.push(side + k);
    if (all.every(free)) out.push(all);
    return out;
  }

  function openSpot(route, mail, pos) {
    var list = listOf(route, mail), r = list[pos - 1] || { position: pos, status: "open" }, m = mailingOf(route, mail);
    var block = (r.status !== "open" && Array.isArray(r.block) && r.block.length > 1) ? r.block.slice().sort(function (a, b) { return a - b; }) : [pos];
    var open = r.status === "open", cls = isSold(r) ? "sold" : isPend(r) ? "pending" : "open";
    st.sel = route + ":" + mail + ":" + block[0]; draw();
    var label = block.length > 1 ? "Spots " + block.join(", ") : "Spot " + pos;
    var shapes = open ? shapesFor(route, mail, pos) : [block];
    var paidAmt = r.paid && r.paid.amount != null ? (r.paid.amount / 100) : "";
    var body = "";
    if (!open) {
      body += '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"><span class="hq-status ' + cls + '">' + (cls === "sold" ? "Sold, paid" : "Held, not paid yet") + "</span>" +
        (r.reservedAt ? '<span class="bd-note">Held ' + fmtDay(r.reservedAt) + "</span>" : "") + (r.paid && r.paid.at ? '<span class="bd-note">· Paid ' + fmtDay(r.paid.at) + (r.paid.session ? " (Stripe)" : "") + "</span>" : "") + "</div>";
    }
    if (!st.live) {
      body += '<div class="bd-warn" style="margin:0">This board is read-only until the reservations Worker update is deployed.</div><dl class="hq-kv"><dt>Status</dt><dd>' + esc(r.status) + "</dd><dt>Category</dt><dd>" + esc(r.category || "—") + "</dd></dl>";
      HQ.drawer({ eyebrow: esc(m.name), title: label, body: body, foot: '<span class="sp"></span><button type="button" class="hq-btn ghost" data-x>Close</button>', onOpen: function (d, api) { d.querySelector("[data-x]").onclick = function () { api.close(); }; } });
      return;
    }
    if (open && shapes.length > 1) {
      body += '<fieldset class="hq-fs"><legend>Ad size</legend><div class="hq-seg" id="bd-shape">' + shapes.map(function (s, i) { return '<button type="button" data-i="' + i + '"' + (i === 0 ? ' class="on"' : "") + ">" + (s.length === 1 ? "1 spot" : s.length === 2 ? "2 wide" : s.length === 4 ? "2×2" : "Full side") + "</button>"; }).join("") + '</div><small class="bd-note" id="bd-shape-note">' + SIZE_NAME[1] + " · list price " + HQ.money(PRICES[1]) + "</small></fieldset>";
    }
    body += '<fieldset class="hq-fs"><legend>Advertiser</legend>' +
      '<label class="hq-f">Business<input name="business" value="' + esc(r.business || "") + '" placeholder="Business name" list="bd-dir"></label>' +
      '<datalist id="bd-dir">' + HQ.dir().slice(0, 1500).map(function (b) { return '<option value="' + esc(b.name) + '">'; }).join("") + "</datalist>" +
      '<label class="hq-f">Category<select name="category">' + catOptions(route, mail, r.category, block) + "</select><small>One business per category on each card.</small></label>" +
      '<div class="hq-row"><label class="hq-f">Contact name<input name="name" value="' + esc(r.name || "") + '"></label><label class="hq-f">Phone<input name="phone" type="tel" value="' + esc(r.phone || "") + '"></label></div>' +
      '<label class="hq-f">Email<input name="email" type="email" value="' + esc(r.email || "") + '"></label>' +
      '<label class="hq-f">Amount paid ($)<input name="amount" inputmode="decimal" value="' + esc(paidAmt) + '" placeholder="' + (PRICES[block.length] / 100) + '"><small>Only saved when the spot is Sold. Use what they really paid (e.g. 250 for the intro rate).</small></label>' +
      '<label class="hq-f">Note<textarea name="note" rows="2" placeholder="Artwork status, how they paid, anything to remember">' + esc(r.note || "") + "</textarea></label></fieldset>";
    var later = st.cards.filter(function (c) { return c.route === route && c.mail !== mail; }).map(function (c) { return c.mail; }).sort();
    if (!open && later.length) body += '<fieldset class="hq-fs"><legend>Move to another card</legend><div class="hq-row"><label class="hq-f">Card<select name="moveto">' +
      later.map(function (d) { return '<option value="' + d + '">Mails ' + fmtDay(d) + "</option>"; }).join("") + '</select><small>Same spot number and category on that card. The old record is kept as a backup.</small></label>' +
      '<div class="hq-f" style="align-self:end"><button type="button" class="hq-btn ghost" data-op="move">Move it</button></div></div></fieldset>';
    if (r.email || r.phone) body += '<div style="display:flex;gap:8px;flex-wrap:wrap">' + (r.email ? '<a class="hq-btn ghost sm" href="mailto:' + esc(r.email) + '">' + HQ.icons.mail + "Email " + esc((r.name || "").split(" ")[0] || "them") + "</a>" : "") + (r.phone ? '<a class="hq-btn ghost sm" href="tel:' + esc(r.phone) + '">Call ' + esc(r.phone) + "</a>" : "") + "</div>";
    var foot = open
      ? '<span class="hq-msg" id="bd-msg"></span><span class="sp"></span><button type="button" class="hq-btn ghost" data-op="pending">Hold it</button><button type="button" class="hq-btn green" data-op="sold">Mark sold (paid)</button>'
      : '<button type="button" class="hq-btn danger" data-op="release">Release</button><span class="hq-msg" id="bd-msg"></span><span class="sp"></span>' +
        (isSold(r) ? '<button type="button" class="hq-btn ghost" data-op="pending">Move back to held</button><button type="button" class="hq-btn" data-op="save">Save</button>'
                   : '<button type="button" class="hq-btn ghost" data-op="save">Save</button><button type="button" class="hq-btn green" data-op="sold">Mark sold (paid)</button>');
    HQ.drawer({
      eyebrow: esc(m.name) + (m.mail ? " · mails " + fmtDay(m.mail) : ""), title: open ? "Hold " + label : (r.business || label), sub: open ? "Open. Hold it for someone, or mark it sold if they've already paid." : label + " · " + esc(r.category || ""),
      body: body, foot: foot,
      onOpen: function (d, api) {
        var positions = shapes[0], msg = d.querySelector("#bd-msg");
        var seg = d.querySelector("#bd-shape");
        if (seg) seg.addEventListener("click", function (e) {
          var b = e.target.closest("[data-i]"); if (!b) return;
          [].forEach.call(seg.children, function (x) { x.classList.toggle("on", x === b); });
          positions = shapes[+b.dataset.i];
          d.querySelector("#bd-shape-note").textContent = SIZE_NAME[positions.length] + " · list price " + HQ.money(PRICES[positions.length]) + " · Spots " + positions.join(", ");
          d.querySelector("[name=amount]").placeholder = PRICES[positions.length] / 100;
          d.querySelector("[name=category]").innerHTML = catOptions(route, mail, d.querySelector("[name=category]").value, positions);
        });
        d.addEventListener("click", function (e) {
          var b = e.target.closest("[data-op]"); if (!b) return;
          var op = b.dataset.op;
          if (op === "move") {
            var to = d.querySelector("[name=moveto]").value;
            if (!b.dataset.sure) { b.dataset.sure = 1; b.textContent = "Click again to move to " + fmtDay(to); return; }
            [].forEach.call(d.querySelectorAll("button[data-op]"), function (x) { x.disabled = true; });
            msg.className = "hq-msg"; msg.textContent = "Moving…";
            HQ.post(HQ.SPOTS, "/api/admin/spot", { route: route, mail: mail, positions: block, op: "move", to: to }).then(function () {
              api.close(); HQ.toast((r.business || label) + " moved to the " + fmtDay(to) + " card."); st.sel = null; st.view = to; return load();
            }).catch(function (err) { msg.className = "hq-msg err"; msg.textContent = err.message; [].forEach.call(d.querySelectorAll("button[data-op]"), function (x) { x.disabled = false; }); });
            return;
          }
          if (op === "release" && !b.dataset.sure) { b.dataset.sure = 1; b.textContent = "Click again to release"; msg.textContent = ""; return; }
          var f = {}; ["business", "category", "name", "phone", "email", "amount", "note"].forEach(function (k) { f[k] = d.querySelector("[name=" + k + "]").value.trim(); });
          if (op !== "release" && !f.business) { msg.className = "hq-msg err"; msg.textContent = "Add the business name."; return; }
          if (op !== "release" && !f.category) { msg.className = "hq-msg err"; msg.textContent = "Pick a category."; return; }
          if (op === "sold" && f.amount === "") f.amount = String(PRICES[positions.length] / 100);
          [].forEach.call(d.querySelectorAll(".hq-dr-foot button"), function (x) { x.disabled = true; });
          msg.className = "hq-msg"; msg.textContent = "Saving…";
          HQ.post(HQ.SPOTS, "/api/admin/spot", { route: route, mail: mail, positions: positions, op: op, fields: op === "release" ? {} : f }).then(function () {
            api.close();
            HQ.toast(op === "release" ? label + " released. It's open on the live board." : op === "sold" ? (f.business + " marked sold on " + m.name + ", " + fmtDay(mail) + ".") : op === "pending" ? (f.business + " is holding " + (positions.length > 1 ? "Spots " + positions.join(", ") : "Spot " + positions[0]) + ".") : "Saved.");
            st.sel = null; return load();
          }).catch(function (err) {
            msg.className = "hq-msg err"; msg.textContent = err.message;
            [].forEach.call(d.querySelectorAll(".hq-dr-foot button"), function (x) { x.disabled = false; });
          });
        });
      }
    });
    // Clear the selection outline when the drawer closes.
    var obs = setInterval(function () { if (!document.querySelector(".hq-drawer")) { clearInterval(obs); if (st.sel) { st.sel = null; draw(); } } }, 400);
  }

  window.HQ.holdSpot = function () {
    if (!st.cards.length) return;
    var c = st.cards.filter(function (x) { return x.mail === st.view && x.spots.some(function (r) { return r.status === "open"; }); }).sort(function (a, b) {
      return a.spots.filter(isSold).length - b.spots.filter(isSold).length; // the card that needs it most
    })[0];
    var r = c && c.spots.filter(function (x) { return x.status === "open"; })[0];
    if (r) openSpot(c.route, c.mail, r.position); else HQ.toast("Both cards for " + fmtDay(st.view) + " are full.");
  };
  load();
})();
