/* Quick hold: the 3-step "get on the next card" form at the top of reserve.html.
   Step 1 business + category, step 2 which homes and which card (or a Season Pass), step 3 name/email, then hold or pay.
   The spot is picked for the owner (first open spot on that card) and it's always a 1-spot ad;
   the full spot picker below the form handles bigger ads and specific spots.
   Several cards per route can be open at once (2026-11-11). A Season Pass holds the same spot on the chosen card and the
   next two on that route, for $825 (3 x $275). With a pass, the owner can add any second route for the same 3 dates
   ("Season Pass, 1 spot 2 cards, 3 mailings", $1,650), paid in one checkout.
   Uses the same reservations Worker, Formspree form and Stripe links as assets/picker.js.
   Needs data/directory.js, data/mailings.js and assets/app.js loaded first. */
(function () {
  var box = document.getElementById("qh"); if (!box) return;
  var API = "https://local-spotlight-reservations.toddstpierre.workers.dev";
  var NOTIFY = "https://formspree.io/f/myezyype";
  var PAY_1 = "https://pay.coachellavalleyspotlight.com/b/aFaaEX6E01cW1Mkg6S9MY0B";
  // Season Pass Payment Links. Leave one "" to make that option hold-and-invoice only.
  var PAY_PASS = "https://pay.coachellavalleyspotlight.com/b/5kQdR98M8cVE4Yw8Eq9MY0I";   // 1 spot, 1 card, 3 mailings: $825
  var PAY_PASS2 = "https://pay.coachellavalleyspotlight.com/b/8x29ATbYk4p80IgaMy9MY0J";  // 1 spot, 2 cards, 3 mailings: $1,650
  var PRICE = "$300", PASS_PRICE = "$825", PASS2_PRICE = "$1,650", PASS_N = 3, SIZE = "1 spot", DIMS = "2.7″ x 2.6″";
  var MAIL = window.CVS_MAILINGS || [];
  // Every route on the calendar, in calendar order (El Paseo and Sun City first, then the cities opened 2026-11-11).
  // town: the city a directory listing has to match for its route to be preselected.
  var ROUTES = [];
  MAIL.forEach(function (m) {
    if (ROUTES.some(function (r) { return r.id === m.route; })) return;
    ROUTES.push({ id: m.route, name: m.name || m.route, area: m.area || "", homes: m.homes || "nearly 5,000 homes", town: m.route === "el-paseo" || m.route === "sun-city-palm-desert" ? "Palm Desert" : String(m.area || m.name || "").replace(/\s*[0-9·,].*$/, "").trim() });
  });
  var D = ((window.CVS && window.CVS.directory) || []).filter(function (b) { return !b.public; });

  // Directory service -> postcard category (the Worker's list). Anything not here: the owner picks.
  var GUESS = {
    "auto repair": "Auto Repair", "golf cars": "Golf Cart Sales & Service", "golf shops": "Golf Shop & Club Fitting",
    "gyms": "Fitness/Gym", "crossfit gyms": "Fitness/Gym", "personal training": "Fitness/Gym", "boxing and martial arts": "Fitness/Gym", "yoga and pilates": "Fitness/Gym",
    "chiropractors": "Chiropractic", "dentists": "Dental", "orthodontists": "Dental",
    "hair salons and barbers": "Salon/Spa", "nail salons": "Salon/Spa", "lashes and brows": "Salon/Spa", "massage and day spas": "Salon/Spa", "facials and skin care": "Salon/Spa",
    "med spas": "Med Spa", "dermatology": "Med Spa", "weight loss": "Weight Loss",
    "blinds and shutters": "Window Coverings", "cleaning services": "House Cleaning", "electrical": "Electrical", "garage doors": "Garage Doors",
    "handyman": "Handyman Services", "heating and air conditioning": "HVAC", "insulation": "Insulation", "landscaping": "Landscaping", "tree care": "Landscaping",
    "painting": "Painting", "pest control": "Pest Control", "plumbing": "Plumbing", "pool service": "Pool Service", "pool builders": "Pool Service",
    "roofing": "Roofing", "flooring": "Remodeling", "estate planning": "Estate Attorney", "real estate and mortgage": "Real Estate Agent",
    "veterinarians": "Veterinary/Pet Care", "pet sitting": "Veterinary/Pet Care", "pet stores": "Veterinary/Pet Care", "art classes": "Arts & Classes",
    "american restaurants": "Restaurant - American", "asian restaurants": "Restaurant - Other", "latin american restaurants": "Restaurant - Other", "vegan restaurants": "Restaurant - Other",
    "bakeries": "Bakery & Desserts", "candy and sweets": "Bakery & Desserts", "date shakes": "Bakery & Desserts", "cafes and delis": "Restaurant - Cafe & Deli",
    "italian restaurants": "Restaurant - Italian", "mediterranean and european restaurants": "Restaurant - Mediterranean", "mexican restaurants": "Restaurant - Mexican",
    "pizza and burgers": "Restaurant - Pizza", "seafood restaurants": "Restaurant - Seafood", "steakhouses": "Restaurant - Steakhouse",
    "cannabis dispensaries": "Cannabis", "gift shops": "Boutique/Retail", "flea & vintage markets": "Boutique/Retail"
  };

  var $ = function (s) { return box.querySelector(s); };
  var steps = box.querySelectorAll(".qh-step"), dots = box.querySelectorAll(".qh-dots i");
  var bizIn = $("#qh-biz"), sugg = $("#qh-sugg"), catWrap = $("#qh-cat-wrap"), catSel = $("#qh-cat"), catPicked = $("#qh-cat-picked"), avail = $("#qh-avail");
  var next1 = $("#qh-next1"), next2 = $("#qh-next2"), routesEl = $("#qh-routes"), summary = $("#qh-summary"), form = $("#qh-form"), msg = $("#qh-msg"), done = $("#qh-done");
  // Step 2's card chooser lives right under the route cards.
  var mailsEl = document.createElement("div"); mailsEl.className = "qh-mails"; mailsEl.id = "qh-mails"; routesEl.after(mailsEl);
  var data = {}, listing = null, route = null, mail = null, passOn = false, route2 = null, started = false, step = 1;
  var want = (location.search.match(/[?&]route=([a-z-]+)/) || [])[1]; if (want === "sun-city") want = "sun-city-palm-desert";
  var wantMail = (location.search.match(/[?&]mail=(\d{4}-\d{2}-\d{2})/) || [])[1];
  if (/[?&]pass=1\b/.test(location.search)) passOn = true;

  function ymd(s) { var p = s.split("-"); return new Date(+p[0], p[1] - 1, +p[2]); }
  function daysLeft(s) { var t = new Date(); t.setHours(0, 0, 0, 0); return Math.round((ymd(s) - t) / 864e5); }
  function shortDate(s) { return ymd(s).toLocaleDateString("en-US", { month: "short", day: "numeric" }); }
  // Bookable cards on a route (artwork date today or later), soonest first.
  function cards(id) { return MAIL.filter(function (m) { return m.route === id && daysLeft(m.deadline) >= 0; }).sort(function (a, b) { return a.mail < b.mail ? -1 : 1; }); }
  function card(id, ml) { var c = cards(id); for (var i = 0; i < c.length; i++) if (c[i].mail === ml) return c[i]; return null; }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function norm(s) { return String(s || "").toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim(); }
  function ga(n, p) { if (window.CVS_GA) window.CVS_GA(n, p); }
  function start() { if (!started) { started = true; ga("quick_hold_start", {}); } }
  function route0(id) { for (var i = 0; i < ROUTES.length; i++) if (ROUTES[i].id === id) return ROUTES[i]; return null; }

  // Headline: the next card's mail date and days left to book.
  (function () {
    var m = MAIL.filter(function (x) { return daysLeft(x.deadline) >= 0; }).sort(function (a, b) { return a.mail < b.mail ? -1 : 1; })[0];
    if (!m) return;
    var d = daysLeft(m.deadline);
    $("#qh-title").textContent = "Get on the " + shortDate(m.mail) + " card";
    $("#qh-when").textContent = d === 0 ? "Last day to book" : d + (d === 1 ? " day" : " days") + " left to book";
  })();

  // Live spots for every bookable card on both routes. data[route][mail] = { open: [spots], cats, taken }.
  function loadCard(id, ml) {
    return fetch(API + "/api/spots?route=" + id + "&mail=" + ml).then(function (x) { if (!x.ok) throw 0; return x.json(); }).then(function (d) {
      (data[id] = data[id] || {})[ml] = { open: d.positions.filter(function (p) { return (p.status || "").toLowerCase() === "open"; }).map(function (p) { return p.position; }), cats: d.categories, taken: d.takenCategories || [] };
    });
  }
  var jobs = [];
  ROUTES.forEach(function (r) { cards(r.id).forEach(function (m) { jobs.push(loadCard(r.id, m.mail).catch(function () {})); }); });
  Promise.all(jobs).then(function () {
    var all = [];
    ROUTES.forEach(function (r) { Object.keys(data[r.id] || {}).forEach(function (ml) { data[r.id][ml].cats.forEach(function (c) { if (all.indexOf(c) < 0) all.push(c); }); }); });
    if (!all.length) { box.classList.add("qh-down"); $("#qh-load").textContent = "Live spots won’t load right now. Call (760) 422-5475 and we’ll hold one for you."; return; }
    catSel.innerHTML = '<option value="">Pick your category…</option>' + all.map(function (c) { return "<option>" + esc(c) + "</option>"; }).join("");
    box.classList.remove("qh-loading");
    refresh();
  });

  function cardData(id, ml) { return data[id] && data[id][ml]; }
  function openOn(id, ml, cat) { var d = cardData(id, ml); if (!d || !card(id, ml) || !d.open.length) return false; return !cat || (d.cats.indexOf(cat) > -1 && d.taken.indexOf(cat) < 0); }
  // The cards on a route where this category can still go, soonest first.
  function okCards(id, cat) { return cards(id).filter(function (m) { return openOn(id, m.mail, cat); }); }
  function openFor(id, cat) { return okCards(id, cat).length > 0; }
  // A Season Pass starting at card ml: that card and the next PASS_N - 1, all open for the category, with one spot open on all.
  function passCards(id, ml) { var c = cards(id), i = c.map(function (m) { return m.mail; }).indexOf(ml); return i < 0 || i + PASS_N > c.length ? null : c.slice(i, i + PASS_N); }
  function passSpot(id, ml, cat) {
    var pc = passCards(id, ml); if (!pc || !pc.every(function (m) { return openOn(id, m.mail, cat); })) return null;
    var first = cardData(id, pc[0].mail).open;
    for (var i = 0; i < first.length; i++) if (pc.every(function (m) { return cardData(id, m.mail).open.indexOf(first[i]) > -1; })) return first[i];
    return null;
  }

  // Step 1: business lookup.
  function find(q) {
    var n = norm(q); if (n.length < 2) return [];
    var words = n.split(" ");
    return D.map(function (b) {
      var name = norm(b.name), s = 0;
      if (name === n) s = 100; else if (name.indexOf(n) === 0) s = 80; else if (name.indexOf(n) > -1) s = 60;
      else if (words.every(function (w) { return name.split(" ").some(function (x) { return x.indexOf(w) === 0; }); })) s = 50;
      return { b: b, s: s };
    }).filter(function (x) { return x.s; }).sort(function (a, z) { return z.s - a.s || a.b.name.length - z.b.name.length; }).slice(0, 5).map(function (x) { return x.b; });
  }
  bizIn.addEventListener("input", function () {
    start();
    if (listing && bizIn.value !== listing.name) listing = null;
    var hits = listing ? [] : find(bizIn.value);
    sugg.innerHTML = hits.map(function (b, i) { return '<li><button type="button" data-i="' + i + '"><b>' + esc(b.name) + "</b><span>" + esc([b.service, b.city].filter(Boolean).join(" · ")) + "</span></button></li>"; }).join("");
    sugg.hidden = !hits.length;
    sugg.querySelectorAll("button").forEach(function (btn) { btn.addEventListener("click", function () { pick(hits[+btn.getAttribute("data-i")]); }); });
    refresh();
  });
  bizIn.addEventListener("keydown", function (e) { if (e.key === "Escape") sugg.hidden = true; });
  function pick(b) {
    listing = b; bizIn.value = b.name; sugg.hidden = true; sugg.innerHTML = "";
    var g = GUESS[norm(b.service).replace(/ and /g, " and ")] || GUESS[String(b.service || "").toLowerCase()];
    if (g && [].some.call(catSel.options, function (o) { return o.value === g; })) { catSel.value = g; catWrap.classList.add("qh-guessed"); }
    if (b.phone && form.phone && !form.phone.value) form.phone.value = b.phone;
    refresh();
  }
  $("#qh-cat-change").addEventListener("click", function () { catWrap.classList.remove("qh-guessed"); catSel.focus(); });
  catSel.addEventListener("change", function () { start(); catWrap.classList.add("qh-guessed"); refresh(); });

  function refresh() {
    var cat = catSel.value, name = bizIn.value.trim();
    catPicked.textContent = cat;
    if (!cat) { catWrap.classList.remove("qh-guessed"); avail.innerHTML = ""; next1.disabled = true; return; }
    var lines = ROUTES.map(function (r) {
      var ok = okCards(r.id, cat), c = cards(r.id), first = c[0], fd = first && cardData(r.id, first.mail);
      var why;
      if (!c.length) why = "no card open for booking";
      else if (!fd) why = "couldn’t check";
      else if (ok.length && ok[0].mail === first.mail) why = shortDate(first.mail) + " card, " + fd.open.length + (fd.open.length === 1 ? " spot" : " spots") + " left";
      else if (ok.length) why = (fd.taken.indexOf(cat) > -1 ? cat + " is taken on " + shortDate(first.mail) : shortDate(first.mail) + " is full") + ", open on " + shortDate(ok[0].mail);
      else why = fd.taken.indexOf(cat) > -1 ? cat + " is taken" : "cards are full";
      return '<li class="' + (ok.length ? "ok" : "no") + '">' + (ok.length ? "✓ " : "✕ ") + "<b>" + esc(r.name) + "</b>: " + esc(why) + "</li>";
    });
    var any = ROUTES.some(function (r) { return openFor(r.id, cat); });
    if (ROUTES.length > 2) {
      // Many routes: list the open ones, and fold the rest into one line.
      var no = ROUTES.filter(function (r) { return !openFor(r.id, cat); });
      lines = lines.filter(function (l, i) { return openFor(ROUTES[i].id, cat); });
      if (no.length) lines.push('<li class="no">✕ Not open for ' + esc(cat) + ": " + esc(no.map(function (r) { return r.name; }).join(", ")) + "</li>");
    }
    avail.innerHTML = '<ul>' + lines.join("") + "</ul>" + (any ? "" : '<p>' + esc(cat) + ' is spoken for on every open card. <a href="#not-sure">Tell us and we’ll save you a spot on the next one</a>.</p>');
    next1.disabled = !(any && name.length >= 2);
  }

  // Step 2: which homes, then which card.
  function drawRoutes() {
    var cat = catSel.value, okList = ROUTES.filter(function (r) { return openFor(r.id, cat); });
    if (!route || !openFor(route, cat)) {
      var home = listing && ROUTES.filter(function (r) { return r.town && r.town === listing.city && openFor(r.id, cat); })[0];
      route = want && openFor(want, cat) ? want : home ? home.id : (okList.sort(function (a, b) { var x = okCards(a.id, cat)[0], y = okCards(b.id, cat)[0]; return (x.mail < y.mail ? -1 : x.mail > y.mail ? 1 : 0) || cardData(b.id, y.mail).open.length - cardData(a.id, x.mail).open.length; })[0] || {}).id || null;
    }
    routesEl.classList.toggle("qh-routes-many", ROUTES.length > 2);
    routesEl.innerHTML = ROUTES.map(function (r) {
      var ok = okCards(r.id, cat), d = ok[0] && cardData(r.id, ok[0].mail);
      var note = ok.length ? (ok.length > 1 ? ok.length + " cards open" : shortDate(ok[0].mail) + " · " + d.open.length + (d.open.length === 1 ? " spot" : " spots") + " left") : "Not available";
      return '<button type="button" class="qh-route' + (r.id === route ? " on" : "") + '" data-r="' + r.id + '"' + (ok.length ? "" : " disabled") + ' aria-pressed="' + (r.id === route) + '"><b>' + esc(r.name) + "</b><span>" + esc(r.homes) + " · " + esc(r.area) + '</span><em>' + esc(note) + "</em></button>";
    }).join("");
    routesEl.querySelectorAll(".qh-route").forEach(function (b) { b.addEventListener("click", function () { route = b.getAttribute("data-r"); mail = null; drawRoutes(); }); });
    drawMails();
    next2.disabled = !(route && mail);
  }
  function drawMails() {
    var cat = catSel.value;
    if (!route) { mailsEl.innerHTML = ""; return; }
    var ok = okCards(route, cat);
    if (!mail || !openOn(route, mail, cat)) mail = (wantMail && openOn(route, wantMail, cat) ? wantMail : (ok[0] || {}).mail) || null;
    var c = cards(route);
    var html = c.length > 1 ? '<p class="qh-mails-h">Which card?</p><div class="qh-mail-row">' + c.map(function (m) {
      var on = openOn(route, m.mail, cat), d = cardData(route, m.mail);
      var note = on ? d.open.length + (d.open.length === 1 ? " spot" : " spots") + " left" : d && d.taken.indexOf(cat) > -1 ? "taken" : "full";
      return '<button type="button" class="qh-mail' + (m.mail === mail ? " on" : "") + '" data-m="' + m.mail + '"' + (on ? "" : " disabled") + ' aria-pressed="' + (m.mail === mail) + '"><b>' + shortDate(m.mail) + "</b><span>" + esc(note) + "</span></button>";
    }).join("") + "</div>" : "";
    var ps = mail && passSpot(route, mail, cat), pc = mail && passCards(route, mail);
    if (ps) {
      html += '<label class="qh-pass"><input type="checkbox" id="qh-pass-on"' + (passOn ? " checked" : "") + '><span><b>Season Pass: ' + PASS_PRICE + ' for 3 mailings</b> (save $75). The same spot and your category locked on ' +
        pc.map(function (m) { return shortDate(m.mail); }).join(", ") + ".</span></label>";
      // A second card for the same 3 dates: any other route where the category and a spot are open on all three.
      var others = passOn ? ROUTES.filter(function (r) { return r.id !== route && sameDates(r.id) && passSpot(r.id, mail, cat); }) : [];
      if (route2 && others.every(function (r) { return r.id !== route2; })) route2 = null;
      if (others.length) html += '<div class="qh-pass2"><p><b>Add a second card</b> for ' + PASS2_PRICE + ' total (both cards, all 3 mailings):</p>' +
        others.map(function (r) { return '<label><input type="checkbox" name="qh-r2" value="' + r.id + '"' + (route2 === r.id ? " checked" : "") + "><span>" + esc(r.name) + " · " + esc(r.homes) + "</span></label>"; }).join("") + "</div>";
    } else { passOn = false; route2 = null; }
    if (!passOn) route2 = null;
    mailsEl.innerHTML = html;
    mailsEl.querySelectorAll(".qh-mail").forEach(function (b) { b.addEventListener("click", function () { mail = b.getAttribute("data-m"); drawRoutes(); }); });
    var cb = mailsEl.querySelector("#qh-pass-on"); if (cb) cb.addEventListener("change", function () { passOn = cb.checked; ga("season_pass_toggle", { on: passOn, route: route }); drawMails(); });
    // Only one extra card ("1 spot 2 cards"): ticking one unticks the others.
    mailsEl.querySelectorAll("[name=qh-r2]").forEach(function (x) { x.addEventListener("change", function () { route2 = x.checked ? x.value : null; ga("season_pass_2card", { on: !!route2, route: route, route2: route2 || "" }); drawMails(); }); });
  }
  // The second route's pass uses the same 3 dates, so both cards share one checkout.
  function sameDates(id) { var a = passCards(route, mail), b = passCards(id, mail); return !!(a && b) && a.every(function (m, i) { return b[i].mail === m.mail; }); }
  function chosen() {
    var cat = catSel.value, pc = passOn && passCards(route, mail), ps = pc && passSpot(route, mail, cat);
    if (!ps) return { pass: false, mails: [mail], price: PRICE, pos: null, extra: null };
    var mails = pc.map(function (m) { return m.mail; }), ps2 = route2 && sameDates(route2) && passSpot(route2, mail, cat);
    return { pass: true, mails: mails, price: ps2 ? PASS2_PRICE : PASS_PRICE, pos: ps, extra: ps2 ? { route: route2, pos: ps2 } : null };
  }

  function go(n, first) {
    step = n;
    steps.forEach(function (s) { s.hidden = +s.getAttribute("data-step") !== n; });
    dots.forEach(function (d, i) { d.classList.toggle("on", i < n); });
    $("#qh-count").textContent = "Step " + n + " of 3";
    if (n === 2) drawRoutes();
    if (n === 3) {
      var r = route0(route), c = chosen();
      summary.innerHTML = "<b>" + esc(bizIn.value.trim()) + "</b> · " + esc(catSel.value) + "<br>" + esc(r.name) + (c.extra ? " + " + esc(route0(c.extra.route).name) : ", " + esc(r.homes)) + " · " +
        (c.pass ? "Season Pass: " + c.mails.map(shortDate).join(", ") + " mailings" : shortDate(mail) + " card") + " · " + SIZE + " (" + DIMS + ") · " + c.price;
      var payBtn = $("#qh-pay"), canPay = c.extra ? !!PAY_PASS2 : c.pass ? !!PAY_PASS : !!PAY_1;
      payBtn.hidden = !canPay; payBtn.textContent = "Pay " + c.price + " and lock it in";
      $("#qh-hold").textContent = c.pass ? "Hold my Season Pass free, invoice me" : "Hold my spot free, invoice me";
    }
    var f = steps[n - 1].querySelector("input:not([type=hidden]), button.qh-route.on, button");
    if (!first) box.scrollIntoView({ behavior: "smooth", block: "start" });
    if (f && n > 1) setTimeout(function () { try { f.focus({ preventScroll: true }); } catch (e) {} }, 250);
  }
  next1.addEventListener("click", function () { go(2); });
  next2.addEventListener("click", function () { go(3); });
  box.querySelectorAll("[data-back]").forEach(function (b) { b.addEventListener("click", function () { go(step - 1); }); });
  $("#qh-step1").addEventListener("submit", function (e) { e.preventDefault(); if (!next1.disabled) go(2); });

  // Step 3: hold or pay. The first open spot on the card (for a pass, the first spot open on all 3); if it was just taken, reload and try once more.
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var payNow = !!(e.submitter && e.submitter.id === "qh-pay"), btns = form.querySelectorAll("button[type=submit]");
    btns.forEach(function (b) { b.disabled = true; });
    msg.textContent = payNow ? "Holding your spot, then taking you to secure checkout…" : "Holding your spot…";
    var ref = (window.CVS_REF && window.CVS_REF()) || "";
    var base = { route: route, size: SIZE, category: catSel.value, name: form.name.value.trim(), business: bizIn.value.trim(), email: form.email.value.trim(), phone: form.phone.value.trim() };
    function attempt(tries) {
      var c = chosen(), pos = c.pass ? c.pos : (cardData(route, mail) || { open: [] }).open[0];
      if (!pos) { fail("That card just filled up. Call (760) 422-5475 and we’ll find you a spot."); return; }
      var p = Object.assign({}, base, { position: pos, positions: [pos], price: c.price, pass: c.pass, mails: c.mails, mail: c.mails[0], extra: c.extra,
        notes: (c.pass ? "Quick hold, SEASON PASS " + (c.extra ? "2 cards (" + route + " + " + c.extra.route + ") " : "") + c.mails.join(" + ") + " (" + c.price + ")" : "Quick hold") + (listing ? " (directory listing: " + (listing.slug || listing.name) + ")" : "") + (ref ? " [Referred by: " + ref + "]" : "") });
      var body = Object.assign({}, p); delete body.extra; if (!c.pass) delete body.mails;
      fetch(API + "/api/reserve", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
        .then(function (res) { return res.json().then(function (d) { return { ok: res.ok, status: res.status, d: d }; }); })
        .then(function (r) {
          if (r.ok && c.extra) {
            // Second card: the same pass on the other route. If it was just taken there, keep the first and say so.
            var b2 = Object.assign({}, body, { route: c.extra.route, position: c.extra.pos, positions: [c.extra.pos] });
            return fetch(API + "/api/reserve", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(b2) })
              .then(function (res) { return res.json().then(function (d) { return { ok: res.ok, d: d }; }); })
              .then(function (r2) {
                if (r2.ok) return held(p, payNow);
                p.extra = null; p.price = PASS_PRICE;
                held(p, false);
                msg.textContent = ""; done.insertAdjacentHTML("afterbegin", '<p class="qh-warn"><b>Heads up:</b> ' + esc(route0(c.extra.route).name) + " just filled for " + esc(catSel.value) + ", so we held your Season Pass on " + esc(route0(route).name) + " only (" + PASS_PRICE + "). We’ll email you about the other card.</p>");
              });
          }
          if (r.ok) return held(p, payNow);
          if (r.status === 409 && tries > 0) return Promise.all(c.mails.map(function (ml) { return loadCard(route, ml); })).then(function () {
            if (!c.pass) cardData(route, mail).open = cardData(route, mail).open.filter(function (x) { return x !== pos; });
            if (!openOn(route, mail, catSel.value) || (c.pass && !passSpot(route, mail, catSel.value))) return fail((r.d && r.d.error) || "That just got taken. Go back and pick another card.");
            attempt(tries - 1);
          });
          fail((r.d && r.d.error) || "Something went wrong. Please try again, or call (760) 422-5475.");
        })
        .catch(function () { fail("Something went wrong. Please try again in a moment, or call (760) 422-5475."); });
    }
    function fail(t) { msg.textContent = t; btns.forEach(function (b) { b.disabled = false; }); }
    attempt(1);
  });

  // Stripe client_reference_id (letters, digits, - and _ only). Two cards: two segments joined by "__AND__".
  function payUrl(p) {
    var link = p.extra ? PAY_PASS2 : p.pass ? PAY_PASS : PAY_1; if (!link) return "";
    var ref = p.route + "__" + p.mails.join("_") + "__" + p.position;
    if (p.extra) ref += "__AND__" + p.extra.route + "__" + p.mails.join("_") + "__" + p.extra.pos;
    return link + "?client_reference_id=" + encodeURIComponent(ref);
  }
  function held(p, payNow) {
    var r = route0(p.route), m = card(p.route, p.mails[0]), when = p.pass ? p.mails.map(shortDate).join(", ") + " mailings" : shortDate(p.mails[0]) + " card";
    var where = p.extra ? r.name + " (Spot " + p.position + ") and " + route0(p.extra.route).name + " (Spot " + p.extra.pos + ")" : r.name;
    fetch(NOTIFY, { method: "POST", headers: { Accept: "application/json", "Content-Type": "application/json" }, body: JSON.stringify({
      _subject: "Coachella Valley Spotlight: " + p.business + (payNow ? " is paying online for " : " wants ") + (p.pass ? (p.extra ? "a 2-CARD SEASON PASS, " : "a SEASON PASS, ") : "") + (p.extra ? "" : "Spot " + p.position + " ") + "(" + p.category + ") on " + where + ", " + when + " [quick hold]",
      name: p.name, business: p.business, email: p.email, phone: p.phone, notes: p.notes, referred_by: (window.CVS_REF && window.CVS_REF()) || "", route: where, mailing: p.mails.join(", "), spot: String(p.position), size: p.size, price: p.pass ? p.price + " for " + p.mails.length + " mailings" + (p.extra ? " on 2 cards" : "") : p.price + " per mailing", category: p.category,
      source: "coachellavalleyspotlight.com / reserve quick hold" }) }).catch(function () {});
    ga(payNow ? "spot_pay_now" : "spot_hold", { route: p.route, mail: p.mails[0], pass: p.pass, cards: p.extra ? 2 : 1, spots: 1, category: p.category, mode: "quick", ref: (window.CVS_REF && window.CVS_REF()) || "" });
    var pay = payUrl(p);
    if (payNow && pay) {
      msg.textContent = "Spot held. Taking you to secure checkout…";
      setTimeout(function () { location.href = pay; }, 600);
      return;
    }
    steps.forEach(function (s) { s.hidden = true; }); box.querySelector(".qh-progress").hidden = true;
    done.innerHTML = '<p class="qh-check" aria-hidden="true">✓</p><h3>' + (p.extra ? "Your Season Pass on both cards is held." : "Spot " + p.position + " on " + esc(r.name) + (p.pass ? " is yours for all 3 mailings." : " is yours.")) + "</h3>" +
      (p.extra ? "<p>" + esc(where) + ".</p>" : "") +
      "<p>We’re holding it" + (p.pass ? " on the " + esc(when) + ". Your category is locked on all three" : m ? " until " + shortDate(m.deadline) + ", the artwork date" : "") + ". No payment yet.</p>" +
      '<ol><li><b>Today:</b> we email ' + esc(p.email) + " to confirm.</li><li><b>Within a day:</b> send us your logo and offer. We design the ad.</li><li><b>You approve it</b>, pay the invoice" + (p.pass ? " (" + PASS_PRICE + ")" : "") + ", and it mails " + (p.pass ? "on each date" : m ? shortDate(m.mail) : "") + ".</li></ol>" +
      (pay ? '<p><a class="btn" href="' + pay + '">Pay ' + esc(p.price) + " now instead</a></p>" : "");
    done.hidden = false; done.setAttribute("tabindex", "-1"); done.focus();
    p.mails.forEach(function (ml) { loadCard(p.route, ml); if (p.extra) loadCard(p.extra.route, ml); });
  }

  go(1, true);
})();
