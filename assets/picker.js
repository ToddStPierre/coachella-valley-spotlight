/* Postcard spot picker: live availability from the reservations Worker. */
(function () {
  var API = "https://local-spotlight-reservations.toddstpierre.workers.dev";
  var NOTIFY = "https://formspree.io/f/myezyype";
  var LABELS = { "el-paseo": "El Paseo", "sun-city-palm-desert": "Sun City Palm Desert" };
  var root = document.getElementById("picker"); if (!root) return;
  var tabs = root.querySelectorAll(".picker-tab"), statusEl = document.getElementById("picker-status"), countEl = document.getElementById("picker-count");
  var front = document.getElementById("picker-front"), back = document.getElementById("picker-back");
  var shell = document.getElementById("picker-form-shell"), title = document.getElementById("picker-form-title");
  var form = document.getElementById("picker-form"), cat = document.getElementById("pf-category"), msg = document.getElementById("picker-msg");
  var route = "el-paseo", pending = null, size = 1, openNow = {};
  // Ad sizes: blocks of spots on one side of the card (4 across, 2 down).
  var SIZES = { 1: { name: "1-spot", label: "1 spot", dims: "2.7\u2033 x 2.6\u2033", price: 300 }, 2: { name: "2-spot", label: "2 spots", dims: "5.4\u2033 x 2.6\u2033", price: 550 }, 4: { name: "4-spot", label: "4 spots", dims: "5.4\u2033 x 5.2\u2033", price: 1000 }, 8: { name: "full-side", label: "Full side", dims: "all 8 spots on one side", price: 2000 } };
  // Stripe Payment Links, one per ad size. Leave a size "" to hide its Pay button (hold-only).
  // Each link's "after payment" setting should redirect to https://coachellavalleyspotlight.com/advertise?paid=1#reserve
  var PAY_LINKS = { 1: "https://pay.coachellavalleyspotlight.com/b/aFaaEX6E01cW1Mkg6S9MY0B", 2: "https://pay.coachellavalleyspotlight.com/b/4gM00jaUg3l462AdYK9MY0C", 4: "https://pay.coachellavalleyspotlight.com/b/bJebJ15zW3l4bmU8Eq9MY0D", 8: "https://pay.coachellavalleyspotlight.com/b/eVq4gz0fCdZIbmUcUG9MY0E" };
  var payBtn = root.querySelector("[data-pay]");
  function money(n) { return "$" + n.toLocaleString("en-US"); }
  function blockFor(pos, n) {
    var base = pos <= 8 ? 0 : 8, i = (pos - 1) % 8, c = i % 4, r = Math.floor(i / 4), tries = [];
    if (n === 1) tries = [[pos]];
    if (n === 2) [c, c - 1].forEach(function (s) { if (s >= 0 && s <= 2) tries.push([base + r * 4 + s + 1, base + r * 4 + s + 2]); });
    if (n === 4) [c, c - 1].forEach(function (s) { if (s >= 0 && s <= 2) tries.push([base + s + 1, base + s + 2, base + s + 5, base + s + 6]); });
    if (n === 8) tries = [[1, 2, 3, 4, 5, 6, 7, 8].map(function (k) { return base + k; })];
    for (var t = 0; t < tries.length; t++) if (tries[t].every(function (k) { return openNow[k]; })) return tries[t];
    return null;
  }
  function mark(list) { root.querySelectorAll(".spot").forEach(function (el) { el.classList.toggle("picked", !!list && list.indexOf(+el.getAttribute("data-pos")) > -1); }); }
  var dateEl = root.querySelector(".picker-date"), MAIL = window.CVS_MAILINGS || [];
  function mailing(r) { for (var i = 0; i < MAIL.length; i++) if (MAIL[i].route === r) return MAIL[i]; return null; }
  function ymd(s) { var p = s.split("-"); return new Date(+p[0], p[1] - 1, +p[2]); }
  function nice(s) { return ymd(s).toLocaleDateString("en-US", { weekday: "short", month: "long", day: "numeric" }); }
  function daysLeft(s) { var t = new Date(); t.setHours(0, 0, 0, 0); return Math.round((ymd(s) - t) / 864e5); }
  function closed(r) { var m = mailing(r); return !!(m && daysLeft(m.deadline) < 0); }
  function showDate(r) {
    var m = mailing(r); if (!dateEl) return;
    if (!m) { dateEl.textContent = "Mailing date coming soon"; return; }
    var d = daysLeft(m.deadline);
    dateEl.innerHTML = "Mails " + nice(m.mail) + " &middot; Artwork due " + nice(m.deadline) +
      (d < 0 ? '<span class="picker-left">Booking for this card is closed. The next date is coming soon.</span>' : '<span class="picker-left">' + (d === 0 ? "Last day to book" : d + (d === 1 ? " day" : " days") + " left to book") + (m.minSold ? " &middot; This card mails once " + m.minSold + " spots are sold" : "") + '</span>');
  }

  function state(s) { s = (s || "").toLowerCase(); return s === "open" ? "open" : s === "pending" ? "pending" : "sold"; }
  function word(k) { return k === "open" ? "Open" : k === "pending" ? "Pending" : "Sold"; }

  function load(r, keepForm) {
    showDate(r);
    statusEl.textContent = "Loading spots…"; countEl.textContent = "Loading availability…";
    front.innerHTML = ""; back.innerHTML = ""; openNow = {}; if (!keepForm) { shell.hidden = true; pending = null; }
    fetch(API + "/api/spots?route=" + encodeURIComponent(r)).then(function (res) { if (!res.ok) throw 0; return res.json(); }).then(function (d) {
      d.positions.forEach(function (p) {
        var k = state(p.status), el = document.createElement(k === "open" ? "button" : "div");
        el.className = "spot " + k; el.setAttribute("data-pos", p.position); openNow[p.position] = k === "open";
        el.innerHTML = '<span class="spot-n">Spot ' + p.position + '</span><span class="spot-cat">' + (p.category ? p.category.replace(/</g, "&lt;") : (k === "open" ? "Tap to hold" : "")) + '</span><span class="spot-state">' + word(k) + '</span>';
        el.setAttribute("aria-label", "Spot " + p.position + (p.category ? ", " + p.category : "") + ", " + word(k));
        if (k === "open" && closed(r)) { el.disabled = true; el.title = "Booking for this card is closed"; }
        else if (k === "open") { el.type = "button"; el.addEventListener("click", function () { open(r, p.position); }); }
        (p.position <= 8 ? front : back).appendChild(el);
      });
      var taken = d.categories.filter(function (c) { return d.takenCategories.indexOf(c) === -1; });
      cat.innerHTML = '<option value="" disabled selected>Select your category…</option>' + taken.map(function (c) { return '<option>' + c.replace(/</g, "&lt;") + '</option>'; }).join("") + (taken.length ? "" : '<option value="" disabled>No categories left on this route</option>');
      var n = d.positions.filter(function (p) { return state(p.status) !== "open"; }).length;
      countEl.innerHTML = '<b>' + n + ' of ' + d.positions.length + '</b> spots taken on ' + LABELS[r];
      statusEl.textContent = LABELS[r] + ": tap an open spot to place your " + SIZES[size].name + " ad.";
    }).catch(function () {
      statusEl.textContent = "Couldn’t load live spot availability right now. Refresh to try again, or call (760) 422-5475.";
      countEl.textContent = "";
    });
  }

  function open(r, pos) {
    var list = blockFor(pos, size), S = SIZES[size];
    if (!list) { mark(null); shell.hidden = true; pending = null; statusEl.textContent = "There's no open " + S.name + " block that includes Spot " + pos + ". Tap another spot or pick a smaller size."; return; }
    pending = { route: r, position: list[0], positions: list };
    mark(list);
    title.textContent = "Hold " + (list.length === 1 ? "Spot " + list[0] : "Spots " + list.join(", ")) + " on " + LABELS[r] + " (" + S.label + ", " + money(S.price) + ")";
    if (payBtn) { payBtn.hidden = !PAY_LINKS[size]; payBtn.textContent = "Pay " + money(S.price) + " now and lock it in"; }
    msg.textContent = ""; shell.hidden = false;
    shell.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  document.getElementById("picker-cancel").addEventListener("click", function () { shell.hidden = true; pending = null; mark(null); });
  root.querySelectorAll("[data-size]").forEach(function (b) {
    b.addEventListener("click", function () {
      size = +b.getAttribute("data-size");
      root.querySelectorAll("[data-size]").forEach(function (x) { x.setAttribute("aria-pressed", x === b ? "true" : "false"); });
      shell.hidden = true; pending = null; mark(null);
      statusEl.textContent = LABELS[route] + ": tap an open spot to place your " + SIZES[size].name + " ad.";
    });
  });
  tabs.forEach(function (t) {
    t.addEventListener("click", function () {
      tabs.forEach(function (x) { x.classList.remove("active"); x.setAttribute("aria-selected", "false"); });
      t.classList.add("active"); t.setAttribute("aria-selected", "true");
      route = t.getAttribute("data-route"); load(route);
    });
  });

  form.addEventListener("submit", function (e) {
    e.preventDefault(); if (!pending) return;
    var payNow = !!(e.submitter && e.submitter.hasAttribute("data-pay")) && !!PAY_LINKS[pending.positions.length];
    var btn = e.submitter || form.querySelector('button[type="submit"]'); btn.disabled = true; msg.textContent = payNow ? "Holding your spot, then taking you to secure checkout…" : "Holding your spot…";
    var p = { route: pending.route, position: pending.position, positions: pending.positions, size: SIZES[pending.positions.length].label, price: money(SIZES[pending.positions.length].price), category: form.category.value, name: form.name.value, business: form.business.value, email: form.email.value, phone: form.phone.value, notes: form.notes.value + (window.CVS_REF && window.CVS_REF() ? " [Referred by: " + window.CVS_REF() + "]" : "") };
    fetch(API + "/api/reserve", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(p) })
      .then(function (res) { return res.json().then(function (d) { return { ok: res.ok, d: d }; }); })
      .then(function (r) {
        if (!r.ok) { msg.textContent = r.d.error || "That spot just got taken. Pick another one."; btn.disabled = false; load(route, true); return; }
        fetch(NOTIFY, { method: "POST", headers: { Accept: "application/json", "Content-Type": "application/json" }, body: JSON.stringify({
          _subject: "Coachella Valley Spotlight: " + p.business + (payNow ? " is paying online for " : " wants ") + (p.positions.length === 1 ? "Spot " + p.position : p.size + " (Spots " + p.positions.join(", ") + ")") + " (" + p.category + ") on " + LABELS[p.route],
          name: p.name, business: p.business, email: p.email, phone: p.phone, notes: p.notes, referred_by: (window.CVS_REF && window.CVS_REF()) || "", route: LABELS[p.route], spot: p.positions.join(", "), size: p.size, price: p.price + " per mailing", category: p.category,
          source: "coachellavalleyspotlight.com / advertise spot picker" }) }).catch(function () {});
        if (window.CVS_GA) window.CVS_GA(payNow ? "spot_pay_now" : "spot_hold", { route: p.route, spots: p.positions.length, category: p.category, ref: (window.CVS_REF && window.CVS_REF()) || "" });
        if (payNow) {
          var ref = pending.route + "__" + pending.positions.join("-"), go = PAY_LINKS[pending.positions.length] + (PAY_LINKS[pending.positions.length].indexOf("?") > -1 ? "&" : "?") + "client_reference_id=" + encodeURIComponent(ref);
          msg.textContent = "Spot held. Taking you to secure checkout…";
          setTimeout(function () { location.href = go; }, 600);
          return;
        }
        msg.textContent = "Spot held! We’ll email you shortly to confirm payment and lock it in.";
        btn.disabled = false; form.reset();
        setTimeout(function () { shell.hidden = true; }, 2500);
        load(route, true);
      })
      .catch(function () { msg.textContent = "Something went wrong. Please try again in a moment, or call (760) 422-5475."; btn.disabled = false; });
  });

  if (/[?&]paid=1\b/.test(location.search)) {
    var note = document.createElement("p"); note.className = "picker-paid"; note.setAttribute("role", "status");
    note.innerHTML = "<b>Payment received. Your spot is locked in.</b> We&rsquo;ll email you within a day to get your logo and offer and start your ad.";
    root.insertBefore(note, root.firstChild);
  }
  var wantSize = (location.search.match(/[?&]size=([1248])\b/) || [])[1];
  if (wantSize) root.querySelectorAll("[data-size]").forEach(function (b) { if (b.getAttribute("data-size") === wantSize) b.click(); });
  var want = (location.search.match(/[?&]route=([a-z-]+)/) || [])[1];
  tabs.forEach(function (t) { if (want && t.getAttribute("data-route") === want) t.click(); });
  if (!want || !mailing(want)) load(route);
})();
