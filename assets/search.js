/* Spotlight search: one instant search box for the whole site (businesses, towns, categories, events, deals, guides).
   Opened from the header search button, the phone tab bar, the home hero search box, Cmd/Ctrl+K or "/".
   app.js loads this file the first time someone opens search. On pages that don't already carry the data
   (business profiles, guides), it loads data/directory.js, events.js, feed-events.js and deals.js on demand.
   Results are scored, so typing "tacos indio" or "pool" finds the right listings, with Premium listings
   and postcard advertisers lifted inside each match level. Every result row is a real link. */
(function () {
  var ROOT = (window.CVS_RENDER && window.CVS_RENDER.root) || document.documentElement.getAttribute("data-root") || "";
  var D = window.CVS = window.CVS || {};
  var today = new Date(); today.setHours(0, 0, 0, 0);
  var MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  var DOW = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  var TOWNS = ["Bermuda Dunes", "Cathedral City", "Coachella", "Desert Hot Springs", "Indian Wells", "Indio", "La Quinta", "Palm Desert", "Palm Springs", "Rancho Mirage", "Thousand Palms"];
  // Site guides and pages. "k" is extra words people might type for them.
  var GUIDES = [
    ["This weekend", "this-weekend/", "weekend saturday sunday things to do tonight"],
    ["All events", "events", "events calendar concerts shows things to do"],
    ["Deals and coupons", "deals", "deals coupons discounts specials offers"],
    ["Happy hours", "directory?category=Happy%20hours", "happy hour drinks bar"],
    ["Golf courses and clubs", "golf/", "golf course club tee"],
    ["Farmers markets", "farmers-markets", "farmers market produce"],
    ["New to the valley guide", "welcome", "new move moving welcome guide utilities dmv"],
    ["Halloween guide", "halloween", "halloween trick treat haunted costume"],
    ["Hiking trails", "local/hiking-trails/", "hike hiking trails outdoors"],
    ["Dog parks", "local/dog-parks/", "dog park pets"],
    ["Pickleball courts", "local/pickleball/", "pickleball courts"],
    ["Local news", "news", "news headlines"],
    ["Share a story", "story", "story tip share"],
    ["Advertise on the Spotlight postcard", "advertise", "advertise postcard marketing ad sponsor"],
    ["Add your business (free)", "submit", "add list business submit free listing claim"],
    ["My Spotlight account", "account", "account login sign saved favorites"]
  ];
  // A few words people type that don't appear in listings as-is.
  var SYN = { ac: "air conditioning", hvac: "air conditioning", aircon: "air conditioning", vet: "veterinar", vets: "veterinar", food: "restaurant", eat: "restaurant", dinner: "restaurant", lunch: "restaurant", breakfast: "breakfast", coffee: "caf", haircut: "hair", barber: "barber", nails: "nail", gym: "gym", workout: "fitness", exterminator: "pest", bugs: "pest", lawyer: "law", attorney: "law", dentist: "dentist", doctor: "medical", pool: "pool", tacos: "mexican", taco: "mexican", sushi: "sushi", pizza: "pizza", drinks: "happy hour", beer: "brew" };

  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function slugify(s) { return String(s).toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }
  function parse(d) { if (!d) return null; var p = d.split("-"); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function iso(d) { return d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2); }
  function norm(s) { return String(s || "").toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim(); }
  function ga(n, p) { if (window.CVS_GA) window.CVS_GA(n, p); }
  function store(k, v) { try { if (v === undefined) return JSON.parse(localStorage.getItem(k) || "null"); localStorage.setItem(k, JSON.stringify(v)); } catch (e) { return null; } }

  /* ---- Data: load whatever this page didn't ---- */
  function load(src) { return new Promise(function (ok) { var s = document.createElement("script"); s.src = ROOT + src; s.onload = s.onerror = function () { ok(); }; document.head.appendChild(s); }); }
  var ready = null;
  function ensureData() {
    if (ready) return ready;
    var need = [];
    if (!D.directory) need.push("data/directory.js");
    if (!D.events) need.push("data/events.js");
    if (!D.feedEvents) need.push("data/feed-events.js");
    if (!D.deals) need.push("data/deals.js");
    ready = Promise.all(need.map(load)).then(index);
    return ready;
  }

  var BIZ = [], CATS = [], EVENTS = [], DEALS = [], COUNT = {};
  function index() {
    var list = (D.directory || []).filter(function (b) { return !b.sample; });
    BIZ = list.map(function (b) {
      return { b: b, slug: b.slug || slugify(b.name), name: norm(b.name), kind: norm([b.category, b.service, b.happyHour ? "happy hour" : ""].join(" ")), body: norm([b.blurb, b.about, (b.features || []).join(" "), b.area].join(" ")), city: b.city };
    });
    // Category and service pages that exist under local/ (same rule as tools/lib.js landingPages: 2+ listings).
    var groups = {};
    list.forEach(function (b) {
      [b.category, b.service].forEach(function (c) { if (!c) return; (groups[c] = groups[c] || []).push(b); });
      COUNT[b.city] = (COUNT[b.city] || 0) + 1;
    });
    CATS = Object.keys(groups).filter(function (c) { return groups[c].length >= 2; }).map(function (c) {
      var by = {}; groups[c].forEach(function (b) { by[b.city] = (by[b.city] || 0) + 1; });
      return { label: c, n: groups[c].length, key: norm(c), byCity: by, multi: Object.keys(by).length > 1 };
    });
    var evs = [].concat(D.events || [], D.feedEvents || []).map(function (e) {
      if (e.sample) return null;
      if (e.weekly) {
        var dow = DOW.indexOf(e.weekly), d = new Date(Math.max(today, parse(e.from) || today)), until = parse(e.until);
        if (dow < 0) return null;
        while (d.getDay() !== dow) d.setDate(d.getDate() + 1);
        if (until && d > until) return null;
        var o = {}; for (var k in e) o[k] = e[k]; o.date = iso(d); o.recurring = "Every " + e.weekly; return o;
      }
      return (parse(e.endDate || e.date) || 0) >= today ? e : null;
    }).filter(Boolean);
    evs.sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : 0; });
    var seen = {};
    EVENTS = evs.filter(function (e) { var k = norm(e.title) + e.date; if (seen[k]) return false; seen[k] = 1; return true; })
      .map(function (e) { return { e: e, t: norm(e.title), body: norm([e.venue, e.category, e.description, (e.tags || []).join(" ")].join(" ")) }; });
    DEALS = (D.deals || []).filter(function (x) { var d = parse(x.expires); return !x.sample && (!d || d >= today); })
      .map(function (x) { return { x: x, t: norm(x.offer + " " + x.business), body: norm([x.details, x.category].join(" ")) }; });
  }

  /* ---- Matching ---- */
  // Each word must match somewhere. Score by where: name start > name word > category/service > description.
  function wordScore(w, name, kind, body) {
    var re = new RegExp("(^| )" + w.replace(/[^a-z0-9]/g, ""));
    if (name.indexOf(w) === 0) return 100;
    if (re.test(name)) return 70;
    if (name.indexOf(w) > -1) return 45;
    if (re.test(kind)) return 50;
    if (kind.indexOf(w) > -1) return 35;
    if (re.test(body)) return 14;
    if (w.length > 3 && body.indexOf(w) > -1) return 8;
    return 0;
  }
  function scoreAll(words, name, kind, body) {
    var total = 0;
    for (var i = 0; i < words.length; i++) {
      var w = words[i], s;
      // Short shorthand ("ac", "vet") means the synonym, not every name that starts with those letters.
      if (SYN[w] && w.length <= 4) s = wordScore(SYN[w], name, kind, body) || wordScore(w, name, kind, body) * 0.4;
      else s = wordScore(w, name, kind, body) || (SYN[w] ? wordScore(SYN[w], name, kind, body) * 0.9 : 0);
      if (!s && w.length > 3 && /s$/.test(w)) s = wordScore(w.slice(0, -1), name, kind, body);
      // Word stems: "plumber" finds Plumbing, "roofer" Roofing, "electrician" Electrical.
      for (var cut = 2; !s && cut <= 4 && w.length - cut >= 4; cut++) s = wordScore(w.slice(0, -cut), name, kind, body) * 0.85;
      if (!s) return 0;
      total += s;
    }
    return total;
  }
  function parseQuery(q) {
    var n = norm(q), town = null;
    TOWNS.forEach(function (t) { var k = norm(t); if (!town && (" " + n + " ").indexOf(" " + k + " ") > -1) { town = t; n = (" " + n + " ").replace(" " + k + " ", " ").trim(); } });
    n = n.replace(/\b(in|near|the|a|an|best|good|cheap|local|open|now)\b/g, " ").replace(/\s+/g, " ").trim();
    return { words: n ? n.split(" ") : [], town: town, raw: q.trim() };
  }

  function search(q) {
    var p = parseQuery(q), out = { q: p, towns: [], cats: [], biz: [], events: [], deals: [], guides: [], total: 0 };
    var raw = norm(q);
    // Towns: prefix match on the raw text, or the town found inside the query.
    TOWNS.forEach(function (t) { var k = norm(t); if ((raw.length >= 2 && k.indexOf(raw) === 0) || (p.town === t && !p.words.length)) out.towns.push(t); });
    if (!p.words.length && !p.town) return out;
    var words = p.words;
    if (words.length) {
      CATS.forEach(function (c) {
        var s = scoreAll(words, c.key, "", "");
        if (!s) return;
        if (p.town && !c.byCity[p.town]) return;
        out.cats.push({ c: c, s: s + (c.key.split(" ").length === 1 ? 5 : 0) });
      });
      out.cats.sort(function (a, b) { return b.s - a.s || b.c.n - a.c.n; });
      out.cats = out.cats.slice(0, 3);
    }
    var biz = [];
    BIZ.forEach(function (r) {
      if (p.town && r.city !== p.town) return;
      var s = words.length ? scoreAll(words, r.name, r.kind, r.body) : 20;
      if (!s) return;
      if (r.b.postcard) s += 12; else if (r.b.premium || r.b.featured) s += 9;
      if (r.b.claimed) s += 3;
      biz.push({ r: r, s: s });
    });
    biz.sort(function (a, b) { return b.s - a.s || (a.r.name < b.r.name ? -1 : 1); });
    out.total = biz.length;
    out.biz = biz.slice(0, p.town && !words.length ? 6 : 7).map(function (x) { return x.r.b; });
    EVENTS.forEach(function (r) {
      if (p.town && r.e.city !== p.town) return;
      var s = words.length ? scoreAll(words, r.t, "", r.body) : 20;
      if (s) out.events.push({ e: r.e, s: s });
    });
    // Events stay in date order (the list is already sorted), just the best few that match.
    out.events = out.events.filter(function (x) { return x.s >= 14 || !words.length; }).slice(0, 4).map(function (x) { return x.e; });
    DEALS.forEach(function (r) {
      if (p.town && r.x.city !== p.town) return;
      var s = words.length ? scoreAll(words, r.t, "", r.body) : 20;
      if (s) out.deals.push(r.x);
    });
    out.deals = out.deals.slice(0, 3);
    if (words.length) GUIDES.forEach(function (g) { if (scoreAll(words, norm(g[0]), norm(g[2]), "")) out.guides.push(g); });
    out.guides = out.guides.slice(0, 3);
    return out;
  }

  /* ---- Rendering ---- */
  var ICON = { town: "📍", cat: "🗂️", biz: "🏪", event: "🎉", deal: "🏷️", guide: "🧭", go: "↗" };
  function hi(text, words) {
    var s = esc(text);
    words.filter(function (w) { return w.length > 1; }).forEach(function (w) {
      s = s.replace(new RegExp("(^|[^a-z0-9&;])(" + w.replace(/[^a-z0-9]/g, "") + ")", "ig"), "$1<mark>$2</mark>");
    });
    return s;
  }
  function row(o) {
    // o: href, icon, title (html), sub (html), type, target, ext, side (html), cls
    return '<li role="none"><a role="option" class="ss-row' + (o.cls ? " " + o.cls : "") + '" href="' + esc(o.href) + '" data-type="' + o.type + '" data-target="' + esc(o.target) + '"' +
      (o.ext ? ' target="_blank" rel="noopener"' : "") + (o.biz ? ' data-biz="' + esc(o.biz) + '"' : "") + '>' +
      '<span class="ss-ico" aria-hidden="true">' + o.icon + '</span><span class="ss-txt"><b>' + o.title + '</b>' + (o.sub ? '<small>' + o.sub + '</small>' : "") + '</span>' +
      (o.side || "") + '</a></li>';
  }
  function group(label, rows) { return rows.length ? '<li class="ss-group" role="presentation">' + label + '</li>' + rows.join("") : ""; }
  function cityHref(t) { return ROOT + "city/" + slugify(t) + "/"; }
  function evDate(e) { var d = parse(e.date); return DOW[d.getDay()].slice(0, 3) + ", " + MON[d.getMonth()] + " " + d.getDate(); }
  function evHref(e) { return e.feed ? e.url : ROOT + "event/" + window.CVS_RENDER.eventSlug(e) + "/"; }

  function renderResults(res) {
    var w = res.q.words, html = "";
    html += group("Towns", res.towns.map(function (t) {
      return row({ href: cityHref(t), icon: ICON.town, title: hi(t, norm(res.q.raw).split(" ")), sub: (COUNT[t] || 0) + " local businesses, events and deals", type: "town", target: t });
    }));
    html += group("Categories", res.cats.map(function (x) {
      var c = x.c, t = res.q.town, inTown = t && c.multi && c.byCity[t] >= 2;
      var href = inTown ? ROOT + "local/" + slugify(t) + "/" + slugify(c.label) + "/" : t ? ROOT + "directory?category=" + encodeURIComponent(c.label) + "&city=" + encodeURIComponent(t) : ROOT + "local/" + slugify(c.label) + "/";
      // directory?category= only knows broad categories, so a service-only match in a town falls back to its valley page.
      if (t && !inTown && !CATS.some(function (k) { return k.label === c.label && (D.directory || []).some(function (b) { return b.category === c.label; }); })) href = ROOT + "local/" + slugify(c.label) + "/";
      return row({ href: href, icon: ICON.cat, title: hi(c.label, w) + (t ? " in " + esc(t) : ""), sub: (function (n) { return n + (n === 1 ? " business" : " businesses"); })(t ? (c.byCity[t] || 0) : c.n) + (t ? "" : " across the valley"), type: "category", target: c.label });
    }));
    html += group("Businesses", res.biz.map(function (b) {
      var slug = b.slug || slugify(b.name), prem = b.premium || b.featured;
      var badge = b.postcard ? '<span class="ss-badge is-card">On the postcard</span>' : prem ? '<span class="ss-badge">Premium</span>' : b.claimed ? '<span class="ss-badge is-ok">✓ Verified</span>' : "";
      var off = prem && b.offer && b.offer.title && (!b.offer.expires || parse(b.offer.expires) >= today) ? ' · <em>' + esc(b.offer.title) + '</em>' : "";
      return row({ href: ROOT + "business/" + slug + "/", icon: ICON.biz, title: hi(b.name, w) + badge, sub: esc(b.service || b.category) + " · " + esc(b.city) + off, type: "business", target: slug, biz: slug, cls: prem ? "is-prem" : "",
        side: b.phone ? '<span class="ss-call" data-tel="' + esc(b.phone.replace(/[^0-9+]/g, "")) + '" role="button" tabindex="-1" aria-label="Call ' + esc(b.name) + '">📞 Call</span>' : "" });
    }));
    html += group("Events", res.events.map(function (e) {
      return row({ href: evHref(e), ext: e.feed, icon: ICON.event, title: hi(e.title, w), sub: (e.recurring ? esc(e.recurring) + " · next " : "") + evDate(e) + " · " + esc(e.city), type: "event", target: e.title });
    }));
    html += group("Deals", res.deals.map(function (x) {
      return row({ href: /^https?:/.test(x.url) ? x.url : ROOT + (x.url || "deals"), ext: /^https?:/.test(x.url), icon: ICON.deal, title: hi(x.offer, w), sub: esc(x.business) + " · " + esc(x.city), type: "deal", target: x.business });
    }));
    html += group("Guides", res.guides.map(function (g) {
      return row({ href: ROOT + g[1], icon: ICON.guide, title: hi(g[0], w), sub: "", type: "guide", target: g[0] });
    }));
    var any = html !== "";
    var allHref = ROOT + "directory?q=" + encodeURIComponent(res.q.words.join(" ")) + (res.q.town ? "&city=" + encodeURIComponent(res.q.town) : "");
    if (res.total > res.biz.length) html += '<li role="none"><a role="option" class="ss-row ss-all" href="' + esc(allHref) + '" data-type="all" data-target="' + esc(res.q.raw) + '"><span class="ss-ico" aria-hidden="true">' + ICON.go + '</span><span class="ss-txt"><b>See all ' + res.total + ' matching businesses</b></span></a></li>';
    if (!any) html = '<li class="ss-empty" role="presentation"><b>Nothing for &ldquo;' + esc(res.q.raw) + '&rdquo; yet.</b><span>Try a type of business (&ldquo;plumber&rdquo;), a town, or something to do (&ldquo;this weekend&rdquo;).</span>' +
      '<a href="' + ROOT + 'submit">Know a business that should be here? Add it free &rarr;</a></li>';
    return html;
  }

  function renderHome() {
    var town = ""; try { town = localStorage.getItem("cvs_city") || ""; } catch (e) {}
    if (TOWNS.indexOf(town) < 0) town = "";
    var recent = store("cvs_recent_q") || [];
    var tries = ["Tacos", "Pool service", "Happy hour", "Plumber", "Dentist", "Pickleball", "Dog parks"];
    var html = "";
    if (recent.length) html += '<li class="ss-group" role="presentation">Recent</li><li class="ss-chips" role="presentation">' + recent.map(function (r) { return '<button type="button" class="ss-chip is-recent" data-q="' + esc(r) + '">↺ ' + esc(r) + '</button>'; }).join("") + '</li>';
    html += '<li class="ss-group" role="presentation">Try</li><li class="ss-chips" role="presentation">' + tries.map(function (r) { return '<button type="button" class="ss-chip" data-q="' + esc(r) + '">' + esc(r) + '</button>'; }).join("") +
      (town ? '<button type="button" class="ss-chip is-town" data-q="' + esc("Restaurants " + town) + '">📍 Restaurants in ' + esc(town) + '</button>' : "") + '</li>';
    var next = EVENTS.filter(function (r) { return !town || r.e.city === town; }).slice(0, 3);
    if (next.length < 3) next = EVENTS.slice(0, 3);
    html += group(town ? "Coming up in " + esc(town) : "Coming up", next.map(function (r) { var e = r.e; return row({ href: evHref(e), ext: e.feed, icon: ICON.event, title: esc(e.title), sub: (e.recurring ? esc(e.recurring) + " · next " : "") + evDate(e) + " · " + esc(e.city), type: "event", target: e.title }); }));
    html += group("Jump to", GUIDES.slice(0, 4).map(function (g) { return row({ href: ROOT + g[1], icon: ICON.guide, title: esc(g[0]), sub: "", type: "guide", target: g[0] }); }));
    return html;
  }

  /* ---- The overlay ---- */
  var el, input, list, status, lastFocus, active = -1, timer, gaTimer, lastQ = "";
  function build() {
    el = document.createElement("div");
    el.className = "ss-backdrop";
    el.hidden = true;
    el.innerHTML = '<div class="ss-panel" role="dialog" aria-modal="true" aria-label="Search Coachella Valley Spotlight">' +
      '<div class="ss-bar"><span class="ss-glass" aria-hidden="true"><svg viewBox="0 0 24 24" width="20" height="20"><circle cx="10.5" cy="10.5" r="6.5" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="m15.5 15.5 5 5" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg></span>' +
      '<input class="ss-input" type="search" autocomplete="off" spellcheck="false" enterkeyhint="search" role="combobox" aria-expanded="true" aria-controls="ss-list" aria-autocomplete="list" placeholder="Businesses, towns, events, deals…">' +
      '<button type="button" class="ss-close" aria-label="Close search">' + (window.matchMedia("(max-width: 640px)").matches ? "Cancel" : "Esc") + '</button></div>' +
      '<p class="ss-status sr-only" aria-live="polite"></p>' +
      '<ul class="ss-list" id="ss-list" role="listbox" aria-label="Search results"></ul>' +
      '<div class="ss-foot"><span><kbd>↑</kbd><kbd>↓</kbd> to move</span><span><kbd>Enter</kbd> to open</span><span class="ss-count"></span></div></div>';
    document.body.appendChild(el);
    input = el.querySelector(".ss-input"); list = el.querySelector(".ss-list"); status = el.querySelector(".ss-status");
    el.addEventListener("mousedown", function (ev) { if (ev.target === el) close(); });
    el.querySelector(".ss-close").addEventListener("click", close);
    input.addEventListener("input", function () { clearTimeout(timer); timer = setTimeout(draw, 60); });
    input.addEventListener("keydown", keys);
    list.addEventListener("click", function (ev) {
      var chip = ev.target.closest(".ss-chip");
      if (chip) { input.value = chip.getAttribute("data-q"); draw(); input.focus(); return; }
      var call = ev.target.closest(".ss-call");
      var a = ev.target.closest("a.ss-row"); if (!a) return;
      remember();
      if (call) { ev.preventDefault(); ga("call_click", { business: a.getAttribute("data-biz"), from: "search" }); location.href = "tel:" + call.getAttribute("data-tel"); return; }
      ga("search_select", { search_term: input.value.trim(), result_type: a.getAttribute("data-type"), result: a.getAttribute("data-target") });
    });
    list.addEventListener("mousemove", function (ev) { var a = ev.target.closest("a.ss-row"); if (a) setActive(rows().indexOf(a), true); });
  }
  function rows() { return Array.prototype.slice.call(list.querySelectorAll("a.ss-row")); }
  function setActive(i, quiet) {
    var r = rows(); if (!r.length) { active = -1; return; }
    active = (i + r.length) % r.length;
    r.forEach(function (a, j) { a.classList.toggle("is-active", j === active); a.setAttribute("aria-selected", j === active ? "true" : "false"); a.id = "ss-opt-" + j; });
    input.setAttribute("aria-activedescendant", "ss-opt-" + active);
    if (!quiet) r[active].scrollIntoView({ block: "nearest" });
  }
  function keys(ev) {
    if (ev.key === "ArrowDown") { ev.preventDefault(); setActive(active + 1); }
    else if (ev.key === "ArrowUp") { ev.preventDefault(); setActive(active - 1); }
    else if (ev.key === "Enter") {
      ev.preventDefault();
      var r = rows(), a = r[active] || r[0];
      if (!a) return;
      remember();
      ga("search_select", { search_term: input.value.trim(), result_type: a.getAttribute("data-type"), result: a.getAttribute("data-target") });
      if (a.target === "_blank") window.open(a.href, "_blank", "noopener"); else location.href = a.href;
    } else if (ev.key === "Escape") { ev.preventDefault(); close(); }
  }
  function remember() {
    var q = input.value.trim(); if (q.length < 2) return;
    var r = (store("cvs_recent_q") || []).filter(function (x) { return x.toLowerCase() !== q.toLowerCase(); });
    r.unshift(q); store("cvs_recent_q", r.slice(0, 4));
  }
  function draw() {
    var q = input.value.trim();
    if (q === lastQ && list.childElementCount) return;
    lastQ = q;
    if (!q) { list.innerHTML = renderHome(); el.querySelector(".ss-count").textContent = ""; active = -1; return; }
    var res = search(q);
    list.innerHTML = renderResults(res);
    var n = rows().length;
    el.querySelector(".ss-count").textContent = res.total ? res.total + " business" + (res.total === 1 ? "" : "es") + " match" : "";
    status.textContent = n ? n + " results" : "No results";
    setActive(0, true);
    list.scrollTop = 0;
    // One GA "search" event per pause in typing, not per keystroke.
    clearTimeout(gaTimer);
    gaTimer = setTimeout(function () { ga("search", { search_term: q, results: res.total }); }, 1200);
  }
  function open(q) {
    if (!el) build();
    lastFocus = document.activeElement;
    el.hidden = false;
    document.documentElement.classList.add("ss-lock");
    input.value = q || "";
    lastQ = null;
    list.innerHTML = '<li class="ss-group" role="presentation">Loading…</li>';
    input.focus();
    ensureData().then(function () { lastQ = null; draw(); });
  }
  function close() {
    if (!el || el.hidden) return;
    el.hidden = true;
    document.documentElement.classList.remove("ss-lock");
    if (lastFocus && lastFocus.focus && !lastFocus.closest(".ss-panel")) { try { lastFocus.focus({ preventScroll: true }); } catch (e) {} }
  }
  window.CVS_SEARCH = { open: open, close: close, search: function (q) { return ensureData().then(function () { return search(q); }); } };
})();
