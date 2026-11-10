/* Quick hold: the 3-step "get on the next card" form at the top of reserve.html.
   Step 1 business + category, step 2 which homes, step 3 name/email, then hold or pay.
   The spot is picked for the owner (first open spot on the route) and it's always a 1-spot ad;
   the full spot picker below the form handles bigger ads and specific spots.
   Uses the same reservations Worker, Formspree form and Stripe link as assets/picker.js.
   Needs data/directory.js, data/mailings.js and assets/app.js loaded first. */
(function () {
  var box = document.getElementById("qh"); if (!box) return;
  var API = "https://local-spotlight-reservations.toddstpierre.workers.dev";
  var NOTIFY = "https://formspree.io/f/myezyype";
  var PAY_1 = "https://pay.coachellavalleyspotlight.com/b/aFaaEX6E01cW1Mkg6S9MY0B";
  var PRICE = "$300", SIZE = "1 spot", DIMS = "2.7″ x 2.6″";
  var MAIL = window.CVS_MAILINGS || [];
  var ROUTES = [
    { id: "el-paseo", name: "El Paseo", area: "Palm Desert 92260", homes: "4,972 homes" },
    { id: "sun-city-palm-desert", name: "Sun City Palm Desert", area: "Sun City, 92211", homes: "4,826 homes" }
  ];
  ROUTES.forEach(function (r) { var m = mailing(r.id); if (m) { r.homes = m.homes || r.homes; r.area = m.area || r.area; } });
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
  var data = {}, listing = null, route = null, started = false, step = 1;
  var want = (location.search.match(/[?&]route=([a-z-]+)/) || [])[1]; if (want === "sun-city") want = "sun-city-palm-desert";

  function mailing(r) { for (var i = 0; i < MAIL.length; i++) if (MAIL[i].route === r) return MAIL[i]; return null; }
  function ymd(s) { var p = s.split("-"); return new Date(+p[0], p[1] - 1, +p[2]); }
  function daysLeft(s) { var t = new Date(); t.setHours(0, 0, 0, 0); return Math.round((ymd(s) - t) / 864e5); }
  function shortDate(s) { return ymd(s).toLocaleDateString("en-US", { month: "short", day: "numeric" }); }
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

  // Live spots for both routes.
  function loadRoute(id) {
    return fetch(API + "/api/spots?route=" + id).then(function (x) { if (!x.ok) throw 0; return x.json(); }).then(function (d) {
      data[id] = { open: d.positions.filter(function (p) { return (p.status || "").toLowerCase() === "open"; }).map(function (p) { return p.position; }), cats: d.categories, taken: d.takenCategories || [] };
    });
  }
  Promise.all(ROUTES.map(function (r) { return loadRoute(r.id).catch(function () {}); })).then(function () {
    var all = [];
    ROUTES.forEach(function (r) { (data[r.id] ? data[r.id].cats : []).forEach(function (c) { if (all.indexOf(c) < 0) all.push(c); }); });
    if (!all.length) { box.classList.add("qh-down"); $("#qh-load").textContent = "Live spots won’t load right now. Call (760) 422-5475 and we’ll hold one for you."; return; }
    catSel.innerHTML = '<option value="">Pick your category…</option>' + all.map(function (c) { return "<option>" + esc(c) + "</option>"; }).join("");
    box.classList.remove("qh-loading");
    refresh();
  });

  function closed(id) { var m = mailing(id); return !!(m && daysLeft(m.deadline) < 0); }
  function openFor(id, cat) { var d = data[id]; if (!d || closed(id) || !d.open.length) return false; return !cat || (d.cats.indexOf(cat) > -1 && d.taken.indexOf(cat) < 0); }

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
      var d = data[r.id], ok = openFor(r.id, cat);
      var why = !d ? "couldn’t check" : closed(r.id) ? "closed for booking" : !d.open.length ? "card is full" : d.taken.indexOf(cat) > -1 ? cat + " is taken" : d.open.length + (d.open.length === 1 ? " spot" : " spots") + " left";
      return '<li class="' + (ok ? "ok" : "no") + '">' + (ok ? "✓ " : "✕ ") + "<b>" + esc(r.name) + "</b>: " + esc(why) + "</li>";
    });
    var any = ROUTES.some(function (r) { return openFor(r.id, cat); });
    avail.innerHTML = '<ul>' + lines.join("") + "</ul>" + (any ? "" : '<p>' + esc(cat) + ' is spoken for on this mailing. <a href="#not-sure">Tell us and we’ll save you a spot on the next card</a>.</p>');
    next1.disabled = !(any && name.length >= 2);
  }

  // Step 2: which homes.
  function drawRoutes() {
    var cat = catSel.value, okList = ROUTES.filter(function (r) { return openFor(r.id, cat); });
    if (!route || !openFor(route, cat)) {
      route = want && openFor(want, cat) ? want : (okList.sort(function (a, b) { return data[b.id].open.length - data[a.id].open.length; })[0] || {}).id || null;
    }
    routesEl.innerHTML = ROUTES.map(function (r) {
      var ok = openFor(r.id, cat), d = data[r.id];
      var note = ok ? d.open.length + (d.open.length === 1 ? " spot" : " spots") + " left" : (d && d.taken.indexOf(cat) > -1 ? cat + " already taken" : "Not available");
      return '<button type="button" class="qh-route' + (r.id === route ? " on" : "") + '" data-r="' + r.id + '"' + (ok ? "" : " disabled") + ' aria-pressed="' + (r.id === route) + '"><b>' + esc(r.name) + "</b><span>" + esc(r.homes) + " · " + esc(r.area) + '</span><em>' + esc(note) + "</em></button>";
    }).join("");
    routesEl.querySelectorAll(".qh-route").forEach(function (b) { b.addEventListener("click", function () { route = b.getAttribute("data-r"); drawRoutes(); }); });
    next2.disabled = !route;
  }

  function go(n, first) {
    step = n;
    steps.forEach(function (s) { s.hidden = +s.getAttribute("data-step") !== n; });
    dots.forEach(function (d, i) { d.classList.toggle("on", i < n); });
    $("#qh-count").textContent = "Step " + n + " of 3";
    if (n === 2) drawRoutes();
    if (n === 3) {
      var r = route0(route);
      summary.innerHTML = "<b>" + esc(bizIn.value.trim()) + "</b> · " + esc(catSel.value) + "<br>" + esc(r.name) + " card, " + esc(r.homes) + " · " + SIZE + " (" + DIMS + ") · " + PRICE;
      $("#qh-pay").textContent = "Pay " + PRICE + " and lock it in";
    }
    var f = steps[n - 1].querySelector("input:not([type=hidden]), button.qh-route.on, button");
    if (!first) box.scrollIntoView({ behavior: "smooth", block: "start" });
    if (f && n > 1) setTimeout(function () { try { f.focus({ preventScroll: true }); } catch (e) {} }, 250);
  }
  next1.addEventListener("click", function () { go(2); });
  next2.addEventListener("click", function () { go(3); });
  box.querySelectorAll("[data-back]").forEach(function (b) { b.addEventListener("click", function () { go(step - 1); }); });
  $("#qh-step1").addEventListener("submit", function (e) { e.preventDefault(); if (!next1.disabled) go(2); });

  // Step 3: hold or pay. The first open spot on the route; if it was just taken, reload and try the next once.
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var payNow = !!(e.submitter && e.submitter.id === "qh-pay"), btns = form.querySelectorAll("button[type=submit]");
    btns.forEach(function (b) { b.disabled = true; });
    msg.textContent = payNow ? "Holding your spot, then taking you to secure checkout…" : "Holding your spot…";
    var ref = (window.CVS_REF && window.CVS_REF()) || "";
    var base = { route: route, size: SIZE, price: PRICE, category: catSel.value, name: form.name.value.trim(), business: bizIn.value.trim(), email: form.email.value.trim(), phone: form.phone.value.trim(),
      notes: "Quick hold" + (listing ? " (directory listing: " + (listing.slug || listing.name) + ")" : "") + (ref ? " [Referred by: " + ref + "]" : "") };
    function attempt(tries) {
      var pos = data[route].open[0];
      if (!pos) { fail("That card just filled up. Call (760) 422-5475 and we’ll find you a spot."); return; }
      var p = Object.assign({}, base, { position: pos, positions: [pos] });
      fetch(API + "/api/reserve", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(p) })
        .then(function (res) { return res.json().then(function (d) { return { ok: res.ok, status: res.status, d: d }; }); })
        .then(function (r) {
          if (r.ok) return held(p, payNow);
          if (r.status === 409 && tries > 0) return loadRoute(route).then(function () { data[route].open = data[route].open.filter(function (x) { return x !== pos; }); if (!openFor(route, catSel.value)) return fail((r.d && r.d.error) || "That just got taken. Go back and pick the other card."); attempt(tries - 1); });
          fail((r.d && r.d.error) || "Something went wrong. Please try again, or call (760) 422-5475.");
        })
        .catch(function () { fail("Something went wrong. Please try again in a moment, or call (760) 422-5475."); });
    }
    function fail(t) { msg.textContent = t; btns.forEach(function (b) { b.disabled = false; }); }
    attempt(1);
  });

  function held(p, payNow) {
    var r = route0(p.route), m = mailing(p.route);
    fetch(NOTIFY, { method: "POST", headers: { Accept: "application/json", "Content-Type": "application/json" }, body: JSON.stringify({
      _subject: "Coachella Valley Spotlight: " + p.business + (payNow ? " is paying online for " : " wants ") + "Spot " + p.position + " (" + p.category + ") on " + r.name + " [quick hold]",
      name: p.name, business: p.business, email: p.email, phone: p.phone, notes: p.notes, referred_by: (window.CVS_REF && window.CVS_REF()) || "", route: r.name, spot: String(p.position), size: p.size, price: p.price + " per mailing", category: p.category,
      source: "coachellavalleyspotlight.com / reserve quick hold" }) }).catch(function () {});
    ga(payNow ? "spot_pay_now" : "spot_hold", { route: p.route, spots: 1, category: p.category, mode: "quick", ref: (window.CVS_REF && window.CVS_REF()) || "" });
    if (payNow) {
      msg.textContent = "Spot held. Taking you to secure checkout…";
      setTimeout(function () { location.href = PAY_1 + "?client_reference_id=" + encodeURIComponent(p.route + "__" + p.position); }, 600);
      return;
    }
    steps.forEach(function (s) { s.hidden = true; }); box.querySelector(".qh-progress").hidden = true;
    done.innerHTML = '<p class="qh-check" aria-hidden="true">✓</p><h3>Spot ' + p.position + " on " + esc(r.name) + " is yours.</h3>" +
      "<p>We’re holding it" + (m ? " until " + shortDate(m.deadline) + ", the artwork date" : "") + ". No payment yet.</p>" +
      '<ol><li><b>Today:</b> we email ' + esc(p.email) + " to confirm.</li><li><b>Within a day:</b> send us your logo and offer. We design the ad.</li><li><b>You approve it</b>, pay the invoice, and it mails" + (m ? " " + shortDate(m.mail) : "") + ".</li></ol>" +
      '<p><a class="btn" href="' + PAY_1 + "?client_reference_id=" + encodeURIComponent(p.route + "__" + p.position) + '">Pay ' + PRICE + " now instead</a></p>";
    done.hidden = false; done.setAttribute("tabindex", "-1"); done.focus();
    loadRoute(p.route);
  }

  go(1, true);
})();
