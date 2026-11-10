/* Spotlight HQ: Postcard board (2026-11-09). Both cards drawn spot by spot (front 1–8, back 9–16, 4 across, 2 down).
   Click a spot to see who has it, then Mark paid / Move to pending / Release, or hold an open spot for someone.
   Reads GET /api/admin/board and writes POST /api/admin/spot on the reservations Worker (admin key).
   Until that Worker update is deployed, it falls back to the public /api/spots (status + category only) and is read-only. */
(function () {
  var HQ = window.HQ; if (!HQ) return;
  var esc = HQ.esc;
  var box = document.createElement("div"); box.id = "board-admin";
  box.innerHTML = '<div class="empty">Loading the postcard board&hellip;</div>';
  document.getElementById("st-out").before(box);

  var PRICES = { 1: 30000, 2: 55000, 4: 100000, 8: 200000 };
  var SIZE_NAME = { 1: "1 spot", 2: "2 spots, side by side", 4: "4 spots (2×2 block)", 8: "Full side (8 spots)" };
  var st = { routes: null, cats: [], live: false, sel: null };
  var mailings = window.CVS_MAILINGS || [];
  function mailingOf(route) { return mailings.filter(function (m) { return m.route === route; })[0] || { name: HQ.ROUTES[route] || route, minSold: 8 }; }
  function fmtDay(s) { if (!s) return ""; var d = new Date(s + (s.length === 10 ? "T12:00:00" : "")); return d.toLocaleDateString("en-US", { month: "short", day: "numeric" }); }
  function daysTo(s) { if (!s) return null; return Math.ceil((new Date(s + "T23:59:59") - new Date()) / 864e5); }
  function isSold(r) { return r && r.status === "Sold"; }
  function isPend(r) { return r && r.status && r.status !== "open" && r.status !== "Sold"; }

  function load() {
    return fetch(HQ.SPOTS + "/api/admin/board?key=" + encodeURIComponent(HQ.key)).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }).then(function (d) {
      st.routes = d.routes; st.cats = d.categories || []; st.live = true;
    }).catch(function () {
      // Public fallback: no names, read-only.
      return Promise.all(Object.keys(HQ.ROUTES).map(function (rt) {
        return fetch(HQ.SPOTS + "/api/spots?route=" + rt).then(function (r) { return r.json(); }).then(function (d) { return [rt, d]; });
      })).then(function (res) {
        st.routes = {}; st.live = false;
        res.forEach(function (x) { st.cats = x[1].categories || st.cats; st.routes[x[0]] = (x[1].positions || []).map(function (p) { return { position: p.position, status: p.status || "open", category: p.category }; }); });
      });
    }).then(draw).catch(function () { box.innerHTML = '<div class="empty">Could not load the postcard board. Try again in a minute.</div>'; });
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
  function tileHtml(route, t) {
    var r = t.r, cls = isSold(r) ? "sold" : isPend(r) ? "pending" : "open";
    var label = t.block.length > 1 ? "Spots " + t.block[0] + "–" + t.block[t.block.length - 1] : "Spot " + r.position;
    var biz = cls === "open" ? "Open" : (r.business || (st.live ? "(no name)" : r.category || "Taken"));
    return '<button type="button" class="bd-spot ' + cls + (st.sel === route + ":" + t.block[0] ? " sel" : "") + '" style="grid-column:' + (t.col + 1) + " / span " + t.cols + ";grid-row:" + (t.row + 1) + " / span " + t.rows + '" data-route="' + route + '" data-pos="' + t.block[0] + '">' +
      '<span class="n">' + label + '</span><i class="st"></i><span class="biz">' + esc(biz) + "</span>" + (cls !== "open" && r.category ? '<span class="cat">' + esc(r.category) + "</span>" : '<span class="cat">' + (cls === "open" ? "Click to hold" : "") + "</span>") + "</button>";
  }
  function draw() {
    var html = '<div class="bd-tools"><div class="bd-legend"><span><i style="background:var(--hq-green)"></i>Sold (paid)</span><span><i style="background:var(--hq-gold)"></i>Held, waiting on payment</span><span><i style="background:#ddd2c3"></i>Open</span></div>' +
      '<span class="bd-note">Prices: 1 spot $300 · 2 spots $550 · 2×2 block $1,000 · full side $2,000</span></div>' +
      (st.live ? "" : '<div class="bd-warn"><b>Read-only for now.</b> Names and spot editing turn on once the reservations Worker update is deployed. Until then this shows what the public board shows.</div>');
    html += '<div class="bd-wrap">' + Object.keys(st.routes).map(function (route) {
      var list = st.routes[route], m = mailingOf(route);
      var sold = list.filter(isSold).length, pend = list.filter(isPend).length, open = list.length - sold - pend;
      var income = list.reduce(function (n, r) { return n + (isSold(r) && r.paid && r.paid.amount ? r.paid.amount : 0); }, 0);
      var left = daysTo(m.deadline);
      return '<section class="bd-route"><div class="bd-head"><div><h2>' + esc(m.name) + "</h2><p>" + esc(m.homes || "") + (m.mail ? " · mails " + fmtDay(m.mail) : "") + (m.deadline ? " · artwork due " + fmtDay(m.deadline) + (left != null && left >= 0 ? " (" + left + (left === 1 ? " day" : " days") + ")" : " (closed)") : "") + "</p></div>" +
        '<div class="bd-stats"><div><b>' + sold + '<span style="font-size:14px;color:var(--hq-ink-3);text-transform:none;letter-spacing:0"> / ' + (m.minSold || 8) + "</span></b><span>Sold</span></div><div><b>" + pend + "</b><span>Held</span></div><div><b>" + open + "</b><span>Open</span></div>" +
        (st.live ? "<div><b>" + HQ.money(income) + "</b><span>Paid on board</span></div>" : "") + "</div></div>" +
        '<div class="bd-sides">' + [0, 1].map(function (side) {
          return '<div class="bd-side"><div class="bd-side-label"><span>' + (side ? "Back" : "Front") + "</span><span>Spots " + (side ? "9–16" : "1–8") + '</span></div><div class="bd-grid">' + tiles(list, side).map(function (t) { return tileHtml(route, t); }).join("") + "</div></div>";
        }).join("") + "</div></section>";
    }).join("") + "</div>";
    box.innerHTML = html;
    if (window.HQ_BOARD_CHANGED) window.HQ_BOARD_CHANGED(st);
  }
  window.HQ.board = function () { return st; };

  box.addEventListener("click", function (e) {
    var b = e.target.closest(".bd-spot"); if (!b) return;
    openSpot(b.dataset.route, +b.dataset.pos);
  });

  function catOptions(route, current, positions) {
    var taken = {}; st.routes[route].forEach(function (r) { if (r.status !== "open" && r.category && positions.indexOf(r.position) < 0) taken[r.category] = r.position; });
    return '<option value="">Pick a category</option>' + st.cats.map(function (c) {
      return '<option value="' + esc(c) + '"' + (c === current ? " selected" : "") + (taken[c] && c !== current ? " disabled" : "") + ">" + esc(c) + (taken[c] && c !== current ? " (taken, Spot " + taken[c] + ")" : "") + "</option>";
    }).join("");
  }
  // Shapes an open spot can grow into, given what's free around it.
  function shapesFor(route, pos) {
    var list = st.routes[route], free = function (p) { var r = list[p - 1]; return r && r.status === "open"; };
    var side = pos <= 8 ? 0 : 8, i = pos - 1 - side, col = i % 4, row = Math.floor(i / 4), out = [[pos]];
    if (col < 3 && free(pos + 1)) out.push([pos, pos + 1]);
    var top = row === 0 ? pos : pos - 4, c0 = col < 3 ? 0 : -1, a = top + c0;
    var sq = [a, a + 1, a + 4, a + 5];
    if (sq.every(free) && sq.indexOf(pos) > -1) out.push(sq);
    var all = []; for (var k = 1; k <= 8; k++) all.push(side + k);
    if (all.every(free)) out.push(all);
    return out;
  }

  function openSpot(route, pos) {
    var list = st.routes[route], r = list[pos - 1] || { position: pos, status: "open" }, m = mailingOf(route);
    var block = (r.status !== "open" && Array.isArray(r.block) && r.block.length > 1) ? r.block.slice().sort(function (a, b) { return a - b; }) : [pos];
    var open = r.status === "open", cls = isSold(r) ? "sold" : isPend(r) ? "pending" : "open";
    st.sel = route + ":" + block[0]; draw();
    var label = block.length > 1 ? "Spots " + block.join(", ") : "Spot " + pos;
    var shapes = open ? shapesFor(route, pos) : [block];
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
      '<label class="hq-f">Category<select name="category">' + catOptions(route, r.category, block) + "</select><small>One business per category on each card.</small></label>" +
      '<div class="hq-row"><label class="hq-f">Contact name<input name="name" value="' + esc(r.name || "") + '"></label><label class="hq-f">Phone<input name="phone" type="tel" value="' + esc(r.phone || "") + '"></label></div>' +
      '<label class="hq-f">Email<input name="email" type="email" value="' + esc(r.email || "") + '"></label>' +
      '<label class="hq-f">Amount paid ($)<input name="amount" inputmode="decimal" value="' + esc(paidAmt) + '" placeholder="' + (PRICES[block.length] / 100) + '"><small>Only saved when the spot is Sold. Use what they really paid (e.g. 250 for the intro rate).</small></label>' +
      '<label class="hq-f">Note<textarea name="note" rows="2" placeholder="Artwork status, how they paid, anything to remember">' + esc(r.note || "") + "</textarea></label></fieldset>";
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
          d.querySelector("[name=category]").innerHTML = catOptions(route, d.querySelector("[name=category]").value, positions);
        });
        d.querySelector(".hq-dr-foot").addEventListener("click", function (e) {
          var b = e.target.closest("[data-op]"); if (!b) return;
          var op = b.dataset.op;
          if (op === "release" && !b.dataset.sure) { b.dataset.sure = 1; b.textContent = "Click again to release"; msg.textContent = ""; return; }
          var f = {}; ["business", "category", "name", "phone", "email", "amount", "note"].forEach(function (k) { f[k] = d.querySelector("[name=" + k + "]").value.trim(); });
          if (op !== "release" && !f.business) { msg.className = "hq-msg err"; msg.textContent = "Add the business name."; return; }
          if (op !== "release" && !f.category) { msg.className = "hq-msg err"; msg.textContent = "Pick a category."; return; }
          if (op === "sold" && f.amount === "") f.amount = String(PRICES[positions.length] / 100);
          [].forEach.call(d.querySelectorAll(".hq-dr-foot button"), function (x) { x.disabled = true; });
          msg.className = "hq-msg"; msg.textContent = "Saving…";
          HQ.post(HQ.SPOTS, "/api/admin/spot", { route: route, positions: positions, op: op, fields: op === "release" ? {} : f }).then(function () {
            api.close();
            HQ.toast(op === "release" ? label + " released. It's open on the live board." : op === "sold" ? (f.business + " marked sold on " + m.name + ".") : op === "pending" ? (f.business + " is holding " + (positions.length > 1 ? "Spots " + positions.join(", ") : "Spot " + positions[0]) + ".") : "Saved.");
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
    if (!st.routes) return;
    var route = Object.keys(st.routes).filter(function (rt) { return st.routes[rt].some(function (r) { return r.status === "open"; }); }).sort(function (a, b) {
      return st.routes[a].filter(isSold).length - st.routes[b].filter(isSold).length; // the card that needs it most
    })[0];
    var r = route && st.routes[route].filter(function (x) { return x.status === "open"; })[0];
    if (r) openSpot(route, r.position); else HQ.toast("Both cards are full.");
  };
  load();
})();
