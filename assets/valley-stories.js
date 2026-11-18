/* Valley Stories: Instagram-style story bubbles at the top of the home hero (2026-11-17).
   Stories: Tonight (or Today), This weekend, Deals, Happy hour, Local favorites (postcard advertisers' real ads).
   Each is built from the data files on every visit, so nothing here needs updating by hand.
   Tap a bubble: full-screen viewer, 6 s per slide, tap right/left, hold to pause, swipe down or Esc to close,
   swipe sideways for the next/previous story. Deep link: /?story=tonight|weekend|deals|happy-hour|favorites.
   Needs assets/app.js first (CVS_EVENTS, CVS_EVENT_SLUG, CVS_RENDER, CVS_GA, the [data-ics] and [data-track] click handlers).
   GA: story_open, story_slide, story_cta, story_complete. Seen rings: localStorage "cvs_stories_seen". */
(function () {
  var row = document.getElementById("valley-stories"); if (!row) return;
  var D = window.CVS || {}, RND = window.CVS_RENDER || {}, ROOT = RND.root || "";
  var EV = window.CVS_EVENTS || [], SLUG = window.CVS_EVENT_SLUG || function (e) { return e.title; };
  var slugOf = RND.slugOf || function (b) { return b.slug || ""; };
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var DUR = 6000;
  var now = new Date(), today = new Date(now); today.setHours(0, 0, 0, 0);
  var DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  var CITY_PHOTOS = ["bermuda-dunes", "palm-springs", "desert-hot-springs", "cathedral-city", "rancho-mirage", "palm-desert", "indian-wells", "la-quinta", "indio", "coachella", "thousand-palms", "thermal", "mecca"];

  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function iso(d) { return d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2); }
  function parse(s) { if (!s) return null; var p = s.split("-"); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function ga(n, p) { if (window.CVS_GA) window.CVS_GA(n, p || {}); }
  function cityImg(c) { var s = String(c || "").toLowerCase().replace(/[^a-z]+/g, "-"); return ROOT + "assets/img/cities/" + (CITY_PHOTOS.indexOf(s) > -1 ? s : "valley-wide") + ".jpg"; }
  function href(u) { return /^https?:|^tel:/i.test(u) ? u : ROOT + u; }
  function ext(u) { return /^https?:/i.test(u); }
  function minutes(t) { var m = String(t || "").match(/(\d{1,2})(?::(\d\d))?\s*([AP])\.?M/i); return m ? (+m[1] % 12 + (/p/i.test(m[3]) ? 12 : 0)) * 60 + (+m[2] || 0) : 0; }
  // Same order every visit on a given day, a different order tomorrow (so every advertiser gets turns up front).
  function daily(list) { var seed = +iso(today).replace(/-/g, ""); return list.map(function (x, i) { seed = (seed * 9301 + 49297) % 233280; return { x: x, k: seed + i }; }).sort(function (a, b) { return a.k - b.k; }).map(function (o) { return o.x; }); }
  function onDay(e, day) { var d = iso(day); if (e.date === d || (e.dates || []).indexOf(d) > -1) return true; var a = parse(e.date), z = parse(e.endDate); return !!(z && a <= day && day <= z); }
  var dir = (D.directory || []).filter(function (b) { return !b.sample && !b.public; });
  var bySlug = {}; dir.forEach(function (b) { bySlug[slugOf(b)] = b; });
  function dirs(b) { return "https://www.google.com/maps/dir/?api=1&destination=" + encodeURIComponent(b.address || (b.name + ", " + b.city + ", CA")); }
  function tel(p) { return "tel:" + String(p || "").replace(/[^0-9+]/g, ""); }

  // ---- Build the stories ----
  var CAT_TONE = { Music: "dusk", Nightlife: "dusk", Theater: "rose", Arts: "rose", Sports: "palm", Family: "gold", Community: "gold", Food: "sun" };
  function eventSlide(e, day) {
    var s = SLUG(e), d = day || parse(e.date);
    return { key: "e:" + s, tone: CAT_TONE[e.category] || "sun", bg: cityImg(e.city), kicker: (e.category || "Event") + " · " + (e.city || "The valley"),
      chip: (day ? DAYS[d.getDay()] + " · " : "") + (e.time ? String(e.time).split(" · ")[0] : "All day"), title: e.title, sub: e.venue || "", desc: e.description || "",
      actions: [{ label: "Add to calendar", ics: s, act: "calendar", primary: true }, { label: e.feed ? "Details at " + (e.source || "source") : "Event details", href: e.feed ? e.url : "event/" + s + "/", act: "details" }] };
  }
  function evList(day) { return EV.filter(function (e) { return !e.sample && onDay(e, day); }).sort(function (a, b) { return minutes(a.time) - minutes(b.time); }); }

  var S = [];
  // Tonight / Today: what's on today (after 4 PM it's "Tonight").
  var todays = evList(today).slice(0, 10);
  if (todays.length) S.push({ id: "tonight", label: now.getHours() >= 16 ? "Tonight" : "Today", icon: "🌙", thumb: cityImg(todays[0].city), slides: todays.map(function (e) { return eventSlide(e); }) });
  // This weekend: the coming Fri to Sun (or today to Sun, on a weekend).
  var wk = [], dow = today.getDay(), start = new Date(today);
  if (dow >= 1 && dow <= 4) start.setDate(start.getDate() + (5 - dow));
  for (var d = new Date(start); wk.length < 14 && (d.getDay() === 5 || d.getDay() === 6 || d.getDay() === 0) && d - start < 4 * 864e5; d.setDate(d.getDate() + 1)) {
    var day = new Date(d), seenT = {};
    wk.forEach(function (x) { seenT[x.e.title] = 1; });
    evList(day).forEach(function (e) { if (!seenT[e.title] && wk.length < 14) wk.push({ e: e, day: day }); });
    if (d.getDay() === 0) break;
  }
  if (wk.length) S.push({ id: "weekend", label: "Weekend", icon: "🎟️", thumb: ROOT + "assets/img/activities/events.jpg", slides: wk.map(function (x) { return eventSlide(x.e, x.day); }) });
  // Deals.
  var deals = (D.deals || []).filter(function (x) { var z = parse(x.expires); return !x.sample && (!z || z >= today); }).slice(0, 10);
  if (deals.length) S.push({ id: "deals", label: "Deals", icon: "🏷️", thumb: (bySlug[deals[0].slug] && bySlug[deals[0].slug].image) ? ROOT + bySlug[deals[0].slug].image : cityImg(deals[0].city), slides: deals.map(function (x) {
    var b = bySlug[x.slug] || {}, z = parse(x.expires);
    return { key: "d:" + x.business + x.offer, tone: "gold", bg: cityImg(x.city), art: b.image ? ROOT + b.image : "", biz: x.slug, kicker: "Deal · " + x.business, chip: z ? "Good through " + z.toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "Ongoing",
      title: x.offer, sub: x.city || "", desc: x.details || "",
      actions: [{ label: "Get this deal", href: x.url || ("business/" + x.slug + "/"), act: "deal", primary: true }].concat(b.phone ? [{ label: "Call", href: tel(b.phone), act: "call", track: "call" }] : []) };
  }) });
  // Happy hour.
  var hh = daily(dir.filter(function (b) { return b.happyHour; })).slice(0, 8);
  if (hh.length) S.push({ id: "happy-hour", label: "Happy hour", icon: "🍹", thumb: cityImg(hh[0].city), slides: hh.map(function (b) {
    return { key: "h:" + slugOf(b), tone: "sun", bg: cityImg(b.city), biz: slugOf(b), kicker: "Happy hour · " + b.city, chip: "🍹 " + b.happyHour, title: b.name, sub: b.service || b.category || "", desc: b.blurb || "",
      actions: [{ label: "Directions", href: dirs(b), act: "directions", primary: true }, { label: "See profile", href: "business/" + slugOf(b) + "/", act: "profile" }] };
  }) });
  // Local favorites: postcard advertisers, their real ad artwork full screen.
  var fav = daily(dir.filter(function (b) { return b.postcard && b.image; }));
  if (fav.length) S.push({ id: "favorites", label: "Local faves", icon: "★", thumb: ROOT + fav[0].image, slides: fav.map(function (b) {
    return { key: "f:" + slugOf(b), ad: ROOT + b.image, adAlt: b.imageAlt || b.name + " ad", biz: slugOf(b), kicker: "On the Spotlight postcard", title: b.name, sub: (b.service || b.category || "") + " · " + b.city,
      actions: (b.phone ? [{ label: "Call " + b.phone, href: tel(b.phone), act: "call", track: "call", primary: true }] : []).concat([{ label: "See profile", href: "business/" + slugOf(b) + "/", act: "profile", primary: !b.phone }]) };
  }) });
  if (!S.length) return;

  // ---- Seen rings ----
  function hash(st) { var s = st.slides.map(function (x) { return x.key; }).join("|"), h = 0; for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h.toString(36); }
  function getSeen() { try { return JSON.parse(localStorage.getItem("cvs_stories_seen") || "{}") || {}; } catch (e) { return {}; } }
  function markSeen(st) { try { var s = getSeen(); s[st.id] = hash(st); localStorage.setItem("cvs_stories_seen", JSON.stringify(s)); } catch (e) {} drawRow(); }

  // ---- The bubble row ----
  function drawRow() {
    var seen = getSeen();
    row.innerHTML = '<ul class="vs-bubbles" aria-label="Valley Stories">' + S.map(function (st, i) {
      var isSeen = seen[st.id] === hash(st);
      return '<li><button type="button" class="vs-bubble' + (isSeen ? " seen" : "") + '" data-i="' + i + '" aria-label="' + esc(st.label) + ": " + st.slides.length + (st.slides.length === 1 ? " story" : " stories") + (isSeen ? ", seen" : "") + '">' +
        '<span class="vs-ring"><span class="vs-thumb" style="background-image:url(\'' + esc(st.thumb) + '\')"><span class="vs-emoji" aria-hidden="true">' + st.icon + "</span></span></span>" +
        '<span class="vs-label">' + esc(st.label) + (st.slides.length > 1 ? ' <small>' + st.slides.length + "</small>" : "") + "</span></button></li>";
    }).join("") + "</ul>";
    row.querySelectorAll(".vs-bubble").forEach(function (b) { b.addEventListener("click", function () { open(+b.getAttribute("data-i"), 0, "bubble", +b.getAttribute("data-i")); }); });
  }
  drawRow(); row.hidden = false;

  // ---- The viewer ----
  var V = null, cur = 0, idx = 0, t0 = 0, elapsed = 0, raf = 0, paused = false, held = false, pushed = false, opener = null, bars = [];
  function build() {
    V = document.createElement("div");
    V.className = "vs-viewer"; V.setAttribute("role", "dialog"); V.setAttribute("aria-modal", "true"); V.hidden = true;
    V.innerHTML = '<div class="vs-backdrop" data-close></div>' +
      '<button type="button" class="vs-arrow vs-arrow-prev" data-story="-1" aria-label="Previous story">&lsaquo;</button>' +
      '<div class="vs-stage"><div class="vs-bars" aria-hidden="true"></div>' +
      '<div class="vs-top"><span class="vs-who"><span class="vs-avatar" aria-hidden="true"></span><b class="vs-name"></b><small class="vs-count"></small></span>' +
      '<button type="button" class="vs-btn vs-pause" aria-label="Pause">❚❚</button><button type="button" class="vs-btn vs-close" data-close aria-label="Close stories">✕</button></div>' +
      '<div class="vs-slide" aria-live="polite"></div>' +
      '<button type="button" class="vs-tap vs-tap-prev" tabindex="-1" aria-hidden="true"></button><button type="button" class="vs-tap vs-tap-next" tabindex="-1" aria-hidden="true"></button>' +
      '<p class="vs-next-up" aria-hidden="true"></p></div>' +
      '<button type="button" class="vs-arrow vs-arrow-next" data-story="1" aria-label="Next story">&rsaquo;</button>';
    document.body.appendChild(V);
    V.querySelectorAll("[data-close]").forEach(function (b) { b.addEventListener("click", function () { close(); }); });
    V.querySelector(".vs-pause").addEventListener("click", function () { setPause(!paused); });
    V.querySelectorAll("[data-story]").forEach(function (b) { b.addEventListener("click", function () { jumpStory(+b.getAttribute("data-story")); }); });
    var tp = V.querySelector(".vs-tap-prev"), tn = V.querySelector(".vs-tap-next");
    tp.addEventListener("click", function () { if (!held) prev(); });
    tn.addEventListener("click", function () { if (!held) next(); });
    // Hold to pause, swipe down to close, swipe sideways to change story.
    var stage = V.querySelector(".vs-stage"), sx = 0, sy = 0, down = false, holdT = 0;
    stage.addEventListener("pointerdown", function (e) {
      if (e.target.closest(".vs-actions, .vs-top")) return;
      down = true; held = false; sx = e.clientX; sy = e.clientY;
      holdT = setTimeout(function () { held = true; stage.classList.add("vs-holding"); stopClock(); }, 220);
    });
    function up(e) {
      if (!down) return; down = false; clearTimeout(holdT); stage.classList.remove("vs-holding");
      var dx = e.clientX - sx, dy = e.clientY - sy;
      if (dy > 90 && Math.abs(dy) > Math.abs(dx)) { held = true; close(); return; }
      if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy)) { held = true; jumpStory(dx < 0 ? 1 : -1); return; }
      if (held) { if (!paused) startClock(); setTimeout(function () { held = false; }, 0); }
    }
    stage.addEventListener("pointerup", up); stage.addEventListener("pointercancel", up);
    V.addEventListener("keydown", function (e) {
      if (e.key === "Escape") { e.preventDefault(); close(); }
      else if (e.key === "ArrowRight") { e.preventDefault(); next(); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); prev(); }
      else if (e.key === " " && !e.target.closest("a, button:not(.vs-tap)")) { e.preventDefault(); setPause(!paused); }
      else if (e.key === "Tab") { // keep focus inside the dialog
        var f = [].filter.call(V.querySelectorAll("a[href], button:not([tabindex='-1'])"), function (x) { return x.offsetParent !== null; });
        if (!f.length) return; var a = f[0], z = f[f.length - 1];
        if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); } else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
      }
    });
    V.addEventListener("click", function (e) {
      var a = e.target.closest("[data-act]"); if (!a) return;
      ga("story_cta", { story: S[cur].id, action: a.getAttribute("data-act"), business: S[cur].slides[idx].biz || "" });
      if (a.hasAttribute("data-ics")) setPause(true);
    });
    document.addEventListener("visibilitychange", function () { if (!V.hidden) { if (document.hidden) stopClock(); else if (!paused) startClock(); } });
    window.addEventListener("popstate", function () { if (V && !V.hidden && pushed && !(history.state && history.state.vs)) { pushed = false; close(true); } });
  }

  function open(i, j, source, from) {
    if (!V) build();
    opener = from == null ? null : from; cur = i; idx = j || 0; paused = false;
    V.hidden = false; document.documentElement.classList.add("vs-lock");
    requestAnimationFrame(function () { V.classList.add("vs-in"); });
    if (!pushed) { try { history.pushState({ vs: 1 }, ""); pushed = true; } catch (e) {} }
    ga("story_open", { story: S[cur].id, source: source || "bubble" });
    show();
    setTimeout(function () { var c = V.querySelector(".vs-close"); if (c) c.focus({ preventScroll: true }); }, 30);
  }
  function close(fromPop) {
    if (!V || V.hidden) return;
    stopClock(); V.classList.remove("vs-in"); V.hidden = true; document.documentElement.classList.remove("vs-lock");
    if (!fromPop && pushed) { pushed = false; try { history.back(); } catch (e) {} }
    var ob = opener == null ? null : row.querySelector('.vs-bubble[data-i="' + opener + '"]'); if (ob) try { ob.focus({ preventScroll: true }); } catch (e) {}
  }
  function setPause(p) {
    paused = p; var b = V.querySelector(".vs-pause"); b.textContent = p ? "▶" : "❚❚"; b.setAttribute("aria-label", p ? "Play" : "Pause");
    V.classList.toggle("vs-paused", p); if (p) stopClock(); else startClock();
  }
  function startClock() {
    cancelAnimationFrame(raf); if (reduce) return;
    t0 = performance.now() - elapsed;
    (function tick(t) {
      elapsed = t - t0; var p = Math.min(1, elapsed / DUR);
      if (bars[idx]) bars[idx].style.transform = "scaleX(" + p + ")";
      if (p >= 1) { next(); return; }
      raf = requestAnimationFrame(tick);
    })(performance.now());
  }
  function stopClock() { cancelAnimationFrame(raf); elapsed = Math.max(0, performance.now() - t0); }
  function nextStory(dirn) { var k = cur + dirn; return k >= 0 && k < S.length ? k : -1; }
  function next() {
    if (idx < S[cur].slides.length - 1) { idx++; show(); return; }
    ga("story_complete", { story: S[cur].id }); markSeen(S[cur]);
    var k = nextStory(1); if (k < 0) { close(); return; }
    cur = k; idx = 0; ga("story_open", { story: S[cur].id, source: "next" }); show();
  }
  function prev() {
    if (idx > 0) { idx--; show(); return; }
    var k = nextStory(-1); if (k < 0) { elapsed = 0; show(); return; }
    cur = k; idx = S[cur].slides.length - 1; show();
  }
  function jumpStory(dirn) {
    if (dirn > 0) markSeen(S[cur]);
    var k = nextStory(dirn);
    if (k < 0) { if (dirn > 0) close(); else { idx = 0; show(); } return; }
    cur = k; idx = 0; ga("story_open", { story: S[cur].id, source: "swipe" }); show();
  }

  function act(a) {
    var h = a.href ? href(a.href) : "#", out = a.href && ext(a.href) && !/google\.com\/maps/.test(a.href);
    return '<a class="vs-cta' + (a.primary ? " primary" : "") + '" href="' + esc(h) + '" data-act="' + a.act + '"' + (a.ics ? ' data-ics="' + esc(a.ics) + '"' : "") + (a.track ? ' data-track="' + a.track + '"' : "") +
      (out || /google\.com\/maps/.test(a.href || "") ? ' target="_blank" rel="noopener"' : "") + ">" + esc(a.label) + "</a>";
  }
  function show() {
    var st = S[cur], sl = st.slides[idx];
    stopClock(); elapsed = 0;
    V.setAttribute("aria-label", "Valley Stories: " + st.label);
    V.querySelector(".vs-bars").innerHTML = st.slides.map(function (_, i) { return '<span><i style="transform:scaleX(' + (i < idx || (reduce && i === idx) ? 1 : 0) + ')"></i></span>'; }).join("");
    bars = [].slice.call(V.querySelectorAll(".vs-bars i"));
    V.querySelector(".vs-name").textContent = st.label;
    V.querySelector(".vs-avatar").textContent = st.icon;
    V.querySelector(".vs-count").textContent = (idx + 1) + " of " + st.slides.length;
    var nk = nextStory(1);
    V.querySelector(".vs-next-up").textContent = idx === st.slides.length - 1 && nk > -1 ? "Up next: " + S[nk].label + " →" : "";
    V.querySelector(".vs-arrow-prev").disabled = cur === 0 && idx === 0;
    var box = V.querySelector(".vs-slide");
    var html;
    if (sl.ad) {
      html = '<div class="vs-card vs-adcard" data-biz="' + esc(sl.biz) + '"><div class="vs-bg vs-bg-blur" style="background-image:url(\'' + esc(sl.ad) + '\')"></div>' +
        '<div class="vs-body"><span class="vs-kicker">' + esc(sl.kicker) + '</span><img class="vs-ad" src="' + esc(sl.ad) + '" alt="' + esc(sl.adAlt) + '">' +
        '<h2 class="vs-h vs-h-sm">' + esc(sl.title) + '</h2><p class="vs-sub">' + esc(sl.sub) + '</p>' +
        '<div class="vs-actions">' + sl.actions.map(act).join("") + "</div></div></div>";
    } else {
      html = '<div class="vs-card tone-' + (sl.tone || "sun") + '"' + (sl.biz ? ' data-biz="' + esc(sl.biz) + '"' : "") + '><div class="vs-bg" style="background-image:url(\'' + esc(sl.bg) + '\')"></div><div class="vs-shade"></div>' +
        (sl.art ? '<img class="vs-art" src="' + esc(sl.art) + '" alt="">' : "") +
        '<div class="vs-body"><span class="vs-kicker">' + esc(sl.kicker) + "</span>" + (sl.chip ? '<span class="vs-chip">' + esc(sl.chip) + "</span>" : "") +
        '<h2 class="vs-h' + (sl.title.length > 48 ? " vs-h-sm" : "") + '">' + esc(sl.title) + "</h2>" + (sl.sub ? '<p class="vs-sub">' + esc(sl.sub) + "</p>" : "") +
        (sl.desc ? '<p class="vs-desc">' + esc(sl.desc) + "</p>" : "") +
        '<div class="vs-actions">' + sl.actions.map(act).join("") + "</div></div></div>";
    }
    box.innerHTML = html;
    var c = box.firstChild; c.classList.add("vs-enter"); requestAnimationFrame(function () { c.classList.remove("vs-enter"); });
    // Preload the next slide's picture so the swap is instant.
    var nx = st.slides[idx + 1]; if (nx) { var im = new Image(); im.src = nx.ad || nx.bg; }
    ga("story_slide", { story: st.id, index: idx });
    if (idx === st.slides.length - 1 && reduce) markSeen(st);
    if (!paused) startClock();
  }

  // Deep link: /?story=deals opens straight into that story.
  var want = (location.search.match(/[?&]story=([a-z-]+)/) || [])[1];
  if (want) { for (var i = 0; i < S.length; i++) if (S[i].id === want) { open(i, 0, "link"); break; } }
  window.CVS_STORIES = { stories: S, open: function (id) { for (var i = 0; i < S.length; i++) if (S[i].id === id) return open(i, 0, "api"); } };
})();
