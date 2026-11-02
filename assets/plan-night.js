/* Plan My Night: three taps (where, who, when) build a timed night out from the site's own events,
   happy hours, deals and restaurants. Lives in the home hero's first slide (any element with id="plan-night").
   Premium and postcard businesses are picked first for their slot and carry a "Spotlight pick" badge.
   Plans are shareable: ?plan=<town>~<who>~<YYYY-MM-DD>~<start, minutes after midnight>~<stop ids> rebuilds the exact same night.
   Needs app.js first (reuses CVS_RENDER: upcoming events with weekly dates filled in, the sorted directory). */
(function () {
  var root = document.getElementById("plan-night");
  if (!root) return;
  var R = window.CVS_RENDER || {}, D = window.CVS || {}, ROOT = R.root || "";
  var form = root.querySelector(".pn-form"), out = root.querySelector(".pn-out");
  var biz = (R.directory || D.directory || []).filter(function (b) { return !b.sample; });
  var events = R.events || [];
  var today = new Date(); today.setHours(0, 0, 0, 0);
  var T0 = iso(today);

  function iso(d) { return d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2); }
  function parse(s) { var p = s.split("-"); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function gtag(name, p) { if (!window.CVS_NOTRACK && window.gtag) window.gtag("event", name, p || {}); }
  function slugOf(b) { return R.slugOf ? R.slugOf(b) : b.slug; }
  function evId(e) { return "e:" + (R.eventSlug ? R.eventSlug(e) : e.title); }

  // Town centers (same as the home page's location finder), for "close by" when the town is thin.
  var CITIES = {
    "Palm Springs": [33.8303, -116.5453], "Desert Hot Springs": [33.9611, -116.5017],
    "Cathedral City": [33.7797, -116.4653], "Rancho Mirage": [33.7397, -116.4128],
    "Thousand Palms": [33.8225, -116.3800], "Palm Desert": [33.7222, -116.3744],
    "Indian Wells": [33.7172, -116.3400], "La Quinta": [33.6634, -116.3100],
    "Bermuda Dunes": [33.7392, -116.2967], "Indio": [33.7206, -116.2156], "Coachella": [33.6803, -116.1739]
  };
  function km(a, b) {
    var p = CITIES[a], q = CITIES[b]; if (!p || !q) return 99;
    var dy = (p[0] - q[0]) * 111, dx = (p[1] - q[1]) * 111 * Math.cos(p[0] * Math.PI / 180);
    return Math.sqrt(dx * dx + dy * dy);
  }

  // The day each "when" means. "This weekend" is today on a Saturday or Sunday, otherwise the coming Saturday.
  function dayFor(when) {
    var d = new Date(today);
    if (when === "tomorrow") d.setDate(d.getDate() + 1);
    if (when === "weekend") { var w = d.getDay(); if (w !== 0 && w !== 6) d.setDate(d.getDate() + (6 - w)); }
    return iso(d);
  }
  function dayLabel(day) {
    if (day === T0) return "Tonight";
    var d = parse(day), t = new Date(today); t.setDate(t.getDate() + 1);
    var name = d.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
    return iso(t) === day ? "Tomorrow, " + name.replace(/^\w+, /, "") : name;
  }

  function mins(t) { var m = String(t || "").match(/(\d{1,2})(?::(\d\d))?\s*([AP])M/i); if (!m) return null; var h = +m[1] % 12 + (m[3].toUpperCase() === "P" ? 12 : 0); return h * 60 + (+m[2] || 0); }
  function clock(m) { m = Math.round(m / 15) * 15; var h = Math.floor(m / 60) % 24, mm = m % 60; return (h % 12 || 12) + ":" + ("0" + mm).slice(-2) + " " + (h < 12 ? "AM" : "PM"); }
  function on(e, day) {
    if (e.dates && e.dates.length) return e.dates.indexOf(day) > -1;
    return e.date && e.date <= day && day <= (e.endDate || e.date);
  }

  // What each kind of night looks for. Order of services = preference.
  var EAT = {
    date: ["Italian restaurants", "Steakhouses", "Mediterranean and European restaurants", "Seafood restaurants", "American restaurants", "Asian restaurants"],
    friends: ["Mexican restaurants", "American restaurants", "Pizza and burgers", "Asian restaurants", "Breweries", "Latin American restaurants"],
    family: ["Pizza and burgers", "Mexican restaurants", "American restaurants", "Italian restaurants", "Asian restaurants"],
    solo: ["American restaurants", "Asian restaurants", "Mexican restaurants", "Mediterranean and European restaurants", "Vegan restaurants"]
  };
  var SHOWS = {
    date: ["Theater", "Music", "Arts"], friends: ["Music", "Nightlife", "Sports"],
    family: ["Family", "Sports", "Arts"], solo: ["Music", "Theater", "Arts", "Nightlife"]
  };
  var WHO = { date: "Date night", friends: "With friends", family: "Family", solo: "Just me" };
  function isDrinks(b) { return !!b.happyHour || b.service === "Bars and nightclubs" || b.service === "Breweries"; }
  // Happy hours that name days ("Thursdays", "Sun to Thu") only count on those days.
  var DAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
  function hhOn(text, day) {
    var t = String(text || "").toLowerCase(), dow = parse(day).getDay(), ok = {}, any = false, W = "(sun|mon|tue|wed|thu|fri|sat)[a-z]*";
    if (/every day|daily|nightly/.test(t)) return true;
    t = t.replace(new RegExp("\\b" + W + "\\s*(?:to|-|–|through)\\s*" + W, "g"), function (m, a, z) {
      a = DAYS.indexOf(a); z = DAYS.indexOf(z); any = true;
      for (var k = a; ; k = (k + 1) % 7) { ok[k] = 1; if (k === z) break; }
      return " ";
    });
    t.replace(new RegExp("\\b" + W, "g"), function (m, a) { ok[DAYS.indexOf(a)] = 1; any = true; return m; });
    return !any || !!ok[dow];
  }

  function isTreat(b) { return b.service === "Bakeries" || b.service === "Cafes and delis"; }
  function isDo(b) { return b.category === "Attractions" || (b.category === "Recreation" && !b.courts) ; }
  function isEat(who) { return function (b) { return b.category === "Restaurants" && EAT[who].indexOf(b.service) > -1; }; }

  // Same town first, then close by (under ~12 km), then the rest of the valley.
  // Inside each band: Spotlight advertisers first, then the night's preferred kinds, then a daily shuffle.
  function rank(list, town, pref, day) {
    function band(c) { return !town ? 0 : c === town ? 0 : km(town, c) < 12 ? 1 : 2; }
    function seed(s) { var h = 0; s = s + day; for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h; }
    return list.map(function (x) {
      var p = pref ? pref.indexOf(x.service || x.category) : 0;
      return { x: x, k: [band(x.city), x.premium || x.postcard ? 0 : 1, p < 0 ? 9 : p, seed(x.slug || x.title || x.name)] };
    }).sort(function (a, b) { for (var i = 0; i < 4; i++) if (a.k[i] !== b.k[i]) return a.k[i] - b.k[i]; return 0; })
      .map(function (o) { return o.x; });
  }

  function dealFor(b) {
    var o = b.offer && b.offer.title && (!b.offer.expires || b.offer.expires >= T0) ? b.offer.title : "";
    if (!o) (D.deals || []).some(function (x) { if (x.business === b.name && (!x.expires || x.expires >= T0)) { o = x.offer; return true; } });
    return o;
  }

  // A plan is a list of slots; each slot keeps its whole ranked pool so "Swap" can step through it.
  function build(town, who, day, start, ids) {
    // Only shows that start at or after the visitor's start time.
    var shows = rank(events.filter(function (e) {
      if (!on(e, day) || SHOWS[who].indexOf(e.category) < 0) return false;
      var m = mins(e.time); return m === null || m >= start;
    }), town, SHOWS[who], day);
    // "Anywhere": build the night around the best show's town so the stops aren't across the valley.
    // Shows with a real start time first, and best of all ones late enough for drinks and dinner before.
    function near(e) { return !town ? 0 : e.city === town ? 0 : km(town, e.city) < 12 ? 1 : 2; }
    function fit(e) { var m = mins(e.time); return m === null ? 2 : who !== "family" && m < start + 150 ? 1 : 0; }
    shows.sort(function (a, b) { return near(a) - near(b) || fit(a) - fit(b); });
    if (!town && shows.length) town = shows[0].city;
    var drinks = rank(biz.filter(function (b) { return isDrinks(b) && (!b.happyHour || hhOn(b.happyHour, day)); }), town, null, day);
    var eat = rank(biz.filter(isEat(who)), town, EAT[who], day);
    var slots = [];
    function slot(role, pool, kind) { if (pool.length) slots.push({ role: role, pool: pool, i: 0, kind: kind }); }
    if (who === "family") {
      var famShows = shows.filter(function (e) { var m = mins(e.time); return m === null || m < Math.max(18 * 60, start + 60); });
      // An evening family plan is just dinner, then dessert (attractions are closed by then).
      if (start < 17 * 60) slot("Something to do", famShows.length ? famShows : rank(biz.filter(isDo), town, null, day), famShows.length ? "event" : "biz");
      slot("A sweet stop", rank(biz.filter(isTreat), town, null, day), "biz");
      slot("Dinner", eat, "biz");
    } else {
      slot(who === "date" ? "Drinks first" : "Happy hour", drinks, "biz");
      slot("Dinner", eat, "biz");
      if (shows.length) slot(who === "friends" ? "The main event" : "The show", shows, "event");
      else slot("Nightcap", drinks.slice(1).concat(drinks.slice(0, 1)), "biz");
    }
    // Rebuilding a shared plan: point each slot at the stop that was shared, if it's still around.
    if (ids) slots.forEach(function (s, n) {
      var want = ids[n]; if (!want) return;
      for (var j = 0; j < s.pool.length; j++) if ((s.kind === "event" ? evId(s.pool[j]) : slugOf(s.pool[j])) === want) { s.i = j; break; }
    });
    slots.forEach(function (s, n) { unique(slots.slice(0, n), s); });
    slots.town = town;
    return slots;
  }

  // No business twice in one night: step a slot past any pick the other slots are already using.
  function unique(slots, s) {
    for (var tries = 0; tries < s.pool.length; tries++) {
      var x = s.pool[s.i], taken = slots.some(function (o) { return o !== s && o.pool[o.i] === x; });
      if (!taken) return;
      s.i = (s.i + 1) % s.pool.length;
    }
  }

  // Times: nothing before the visitor's start time, and on a night out dinner is never before 5 PM.
  // Base order is [drinks, dinner, show or nightcap] (family: [activity, sweet stop, dinner]).
  function times(slots, who) {
    var ev = null; slots.forEach(function (s) { if (s.kind === "event") ev = s; });
    var T = ev ? mins(ev.pool[ev.i].time) : null, S = state.start, D0 = 17 * 60, base;
    if (who === "family" && S >= 17 * 60) base = [S + 90, S];
    else if (who === "family") base = T !== null ? [T, Math.max(T, S) + 120, Math.max(T, S) + 210] : [S, S + 120, S + 210];
    // Room for drinks and dinner before the show.
    else if (T !== null && T - S >= 150 && T - 90 >= D0) base = [Math.max(S, T - 165), T - 90, T];
    // Room for drinks only: drinks, the show, then dinner after.
    else if (T !== null && T - S >= 60) base = [Math.max(S, T - 90), Math.max(T + 120, D0), T];
    // Show right away: the show, dinner, then drinks.
    else if (T !== null) base = [Math.max(T + 120, D0) + 75, Math.max(T + 120, D0), T];
    // No show, late start: dinner first, then drinks and a nightcap.
    else if (S >= 20 * 60) base = [S + 75, S, S + 150];
    else if (S >= 19 * 60) base = [S + 105, S, S + 195];
    else base = [Math.max(S, 15 * 60), Math.max(S + 90, D0), Math.max(S + 90, D0) + 120];
    slots.forEach(function (s, n) { s.at = s.kind === "event" && mins(s.pool[s.i].time) !== null ? mins(s.pool[s.i].time) : base[n]; });
    return slots.slice().sort(function (a, b) { return a.at - b.at; });
  }

  var state = null;

  // Labels follow the actual order: drinks after dinner are "After dinner", a daytime dinner is "Lunch".
  function roleOf(s) {
    var din = null; state.slots.forEach(function (o) { if (o.role === "Dinner") din = o; });
    if (s.role === "Dinner" && s.at < 16 * 60) return "Lunch";
    if ((s.role === "Drinks first" || s.role === "Happy hour") && din && din.at < s.at) return "After dinner";
    return s.role;
  }

  function stopHtml(s, n) {
    var x = s.pool[s.i], html, role = roleOf(s);
    if (s.kind === "event") {
      var href = !x.feed ? ROOT + "event/" + (R.eventSlug ? R.eventSlug(x) : "") + "/" : (x.url || ROOT + "events");
      var ext = x.feed && x.url ? ' target="_blank" rel="noopener"' : "";
      html = '<a class="pn-name" href="' + esc(href) + '"' + ext + '>' + esc(x.title) + '</a><small>' + esc(x.venue + (x.city ? " · " + x.city : "")) + '</small>' +
        (x.price ? '<small class="pn-note">' + esc(x.price) + '</small>' : "");
    } else {
      var deal = dealFor(x), pick = x.premium || x.postcard;
      html = '<a class="pn-name" href="' + ROOT + 'business/' + esc(slugOf(x)) + '/" data-pn-biz="' + esc(slugOf(x)) + '">' + esc(x.name) + '</a>' +
        '<small>' + esc(x.service.replace(/ restaurants$/, "") + " · " + x.city) + '</small>' +
        (deal ? '<small class="pn-note pn-deal">&#9733; ' + esc(deal) + '</small>' : x.happyHour && s.role !== "Dinner" ? '<small class="pn-note">Happy hour: ' + esc(x.happyHour) + '</small>' : "") +
        (pick ? '<span class="pn-pick">Spotlight pick</span>' : "");
    }
    var more = s.pool.length > 2 ? '<button type="button" class="pn-swap" data-swap="' + n + '" aria-label="Swap ' + esc(role) + ' for another pick" title="Swap this stop">&#8635;</button>' : "";
    var when = s.kind === "event" && mins(x.time) === null ? "See times" : clock(s.at);
    return '<li class="pn-stop"><span class="pn-time">' + when + '</span><div class="pn-body"><span class="pn-role">' + esc(role) + '</span>' + html + '</div>' + more + '</li>';
  }

  function paint() {
    var ordered = times(state.slots, state.who);
    var where = state.slots.town || state.town || "the valley";
    out.innerHTML = '<p class="pn-head"><b>' + esc(dayLabel(state.day)) + ' in ' + esc(where) + '</b><span>' + esc(WHO[state.who]) + '</span></p>' +
      (ordered.length ? '<ol class="pn-stops">' + ordered.map(function (s) { return stopHtml(s, state.slots.indexOf(s)); }).join("") + '</ol>' :
        '<p class="empty">Nothing lined up for that night yet. Try another town or day.</p>') +
      '<div class="pn-actions"><button type="button" class="btn pn-share">Share this plan</button>' +
      '<button type="button" class="btn btn-ghost pn-cal">Add to calendar</button>' +
      '<button type="button" class="pn-reset">Start over</button></div>';
    form.hidden = true; out.hidden = false;
  }

  function pauseCarousel() {
    var box = root.closest(".hero-panel"); if (!box) return;
    var d0 = box.querySelector(".hp-dot"); if (d0 && d0.getAttribute("aria-current") !== "true") d0.click();
    var pb = box.querySelector(".hp-pause"); if (pb && pb.textContent === "Pause") pb.click();
  }

  function shareUrl() {
    var ids = state.slots.map(function (s) { var x = s.pool[s.i]; return s.kind === "event" ? evId(x) : slugOf(x); });
    var u = new URL(location.href); u.search = ""; u.hash = "";
    u.searchParams.set("plan", [state.town, state.who, state.day, state.start].concat(ids).join("~"));
    return u.toString();
  }

  function ics() {
    var day = state.day.replace(/-/g, "");
    function t(m) { m = Math.round(m / 15) * 15; return day + "T" + ("0" + Math.floor(m / 60) % 24).slice(-2) + ("0" + m % 60).slice(-2) + "00"; }
    var lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Coachella Valley Spotlight//Plan My Night//EN"];
    times(state.slots, state.who).forEach(function (s, n) {
      var x = s.pool[s.i], name = s.kind === "event" ? x.title : x.name, place = s.kind === "event" ? x.venue + ", " + x.city : (x.address || x.city);
      lines.push("BEGIN:VEVENT", "UID:" + day + "-" + n + "-" + Date.now() + "@coachellavalleyspotlight.com", "DTSTAMP:" + new Date().toISOString().replace(/[-:]|\.\d+/g, ""),
        "DTSTART:" + t(s.at), "DTEND:" + t(s.at + 90), "SUMMARY:" + (roleOf(s) + ": " + name).replace(/[,;]/g, "\\$&"),
        "LOCATION:" + String(place).replace(/[,;]/g, "\\$&"), "DESCRIPTION:Planned on Coachella Valley Spotlight. " + shareUrl().replace(/[,;]/g, "\\$&"), "END:VEVENT");
    });
    lines.push("END:VCALENDAR");
    return lines.join("\r\n");
  }

  function run(town, who, day, start, ids) {
    // Tonight can't start in the past: move the start to half an hour from now if it already went by.
    if (day === T0) { var n = new Date(), soon = Math.ceil((n.getHours() * 60 + n.getMinutes() + 30) / 15) * 15; if (soon > start) start = soon; }
    state = { town: town, who: who, day: day, start: start, slots: build(town, who, day, start, ids) };
    paint();
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var f = new FormData(form), when = f.get("when") || "tonight", who = f.get("who") || "date", town = f.get("town") || "";
    var start = +f.get("start") || DEFAULT_START[who];
    run(town, who, dayFor(when), start, null);
    pauseCarousel();
    gtag("plan_build", { town: town || "anywhere", who: who, when: when, start: clock(start) });
  });
  // Start time follows the kind of night (5 PM, or 2 PM for family) until the visitor picks one themselves.
  var DEFAULT_START = { date: 17 * 60, friends: 17 * 60, solo: 17 * 60, family: 14 * 60 };
  var startSel = form.querySelector("select[name=start]"), startPicked = false;
  form.addEventListener("change", function (e) {
    pauseCarousel();
    if (e.target === startSel) startPicked = true;
    else if (e.target.name === "who" && startSel && !startPicked) startSel.value = DEFAULT_START[e.target.value];
  });

  out.addEventListener("click", function (e) {
    var sw = e.target.closest("[data-swap]");
    if (sw) {
      var s = state.slots[+sw.getAttribute("data-swap")]; s.i = (s.i + 1) % s.pool.length; unique(state.slots, s);
      paint(); var again = out.querySelector('[data-swap="' + sw.getAttribute("data-swap") + '"]'); if (again) again.focus();
      gtag("plan_swap", { role: s.role }); return;
    }
    if (e.target.closest(".pn-reset")) { out.hidden = true; form.hidden = false; var b = form.querySelector(".pn-go"); if (b) b.focus(); return; }
    var share = e.target.closest(".pn-share");
    if (share) {
      var url = shareUrl(), title = "My night out: " + dayLabel(state.day) + " in " + (state.town || "the Coachella Valley");
      gtag("plan_share", { who: state.who });
      if (navigator.share) { navigator.share({ title: title, text: title, url: url }).catch(function () {}); return; }
      var done = function () { share.textContent = "Link copied ✓"; setTimeout(function () { share.textContent = "Share this plan"; }, 2500); };
      if (navigator.clipboard) navigator.clipboard.writeText(url).then(done, function () { prompt("Copy this link:", url); });
      else prompt("Copy this link:", url);
      return;
    }
    if (e.target.closest(".pn-cal")) {
      var a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob([ics()], { type: "text/calendar" }));
      a.download = "my-night-out.ics"; document.body.appendChild(a); a.click(); a.remove();
      gtag("plan_calendar", { who: state.who }); return;
    }
    var link = e.target.closest(".pn-name");
    if (link) gtag("plan_click", { business: link.getAttribute("data-pn-biz") || link.textContent });
  });

  // Default town: the visitor's saved town if they set one.
  var mine = ""; try { mine = localStorage.getItem("cvs_city") || ""; } catch (e) {}
  var sel = form.querySelector("select[name=town]");
  if (sel && mine && CITIES[mine]) sel.value = mine;

  // A shared plan link opens straight to that plan, if its night hasn't passed.
  var shared = new URLSearchParams(location.search).get("plan");
  if (shared) {
    var p = shared.split("~"), who0 = WHO[p[1]] ? p[1] : "date", town0 = CITIES[p[0]] ? p[0] : "";
    if (sel) sel.value = town0;
    var r = form.querySelector('input[name=who][value="' + who0 + '"]'); if (r) r.checked = true;
    // Links from before the start time was added have the stops right after the date.
    var hasStart = /^\d+$/.test(p[3] || ""), start0 = hasStart ? +p[3] : DEFAULT_START[who0];
    if (startSel && startSel.querySelector('option[value="' + start0 + '"]')) { startSel.value = start0; startPicked = true; }
    if (/^\d{4}-\d\d-\d\d$/.test(p[2] || "") && p[2] >= T0) {
      run(town0, who0, p[2], start0, p.slice(hasStart ? 4 : 3));
      gtag("plan_open_shared", { who: who0 });
      setTimeout(pauseCarousel, 0);
      var hero = root.closest(".hero"); if (hero && window.innerWidth < 900) setTimeout(function () { root.scrollIntoView({ block: "start", behavior: "smooth" }); }, 300);
    }
  }
})();
