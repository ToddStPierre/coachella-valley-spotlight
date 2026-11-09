/* The Valley Calendar: subscribe once and the valley's events show up in your own calendar app.
   Draws the subscribe box into any <div data-cal-sub></div> (home and events pages) and nudges people
   who add a single event to subscribe instead. The feeds are built by tools/build-calendars.js
   (calendar/valley.ics and calendar/<town>.ics, refreshed every 3 hours).
   Needs assets/app.js loaded first (window.CVS_EVENTS, CVS_EVENT_SLUG, CVS_GA). */
(function () {
  var HOST = "coachellavalleyspotlight.com", BASE = "https://" + HOST + "/calendar/";
  var MIN_TOWN = 5; // towns with fewer events than this get the whole-valley feed instead
  var EV = window.CVS_EVENTS;
  if (!EV) { // an older cached app.js: fall back to the raw event lists (dated events only)
    var T0 = new Date(); T0.setHours(0, 0, 0, 0);
    EV = ((window.CVS && window.CVS.events) || []).concat((window.CVS && window.CVS.feedEvents) || []).filter(function (e) { var d = parse(e.endDate || e.date); return d && d >= T0; })
      .sort(function (a, b) { return parse(a.date) - parse(b.date); });
  }
  var TOWNS = ["Bermuda Dunes", "Cathedral City", "Coachella", "Desert Hot Springs", "Indian Wells", "Indio", "La Quinta", "Palm Desert", "Palm Springs", "Rancho Mirage", "Thousand Palms"];
  function slugify(s) { return String(s).toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function ga(n, p) { if (window.CVS_GA) window.CVS_GA(n, p); }
  function parse(s) { var p = String(s || "").split("-"); return p.length === 3 ? new Date(+p[0], p[1] - 1, +p[2]) : null; }
  var HORIZON = new Date(); HORIZON.setHours(0, 0, 0, 0); HORIZON.setDate(HORIZON.getDate() + 120); // same window as the feeds
  EV = EV.filter(function (e) { var d = parse(e.date); return d && d <= HORIZON; });
  function count(town) { return EV.filter(function (e) { return !town || e.city === town; }).length; }
  // Towns offered: those with enough events. The saved town (cvs_city) is preselected when it has a feed.
  var offered = TOWNS.filter(function (t) { return count(t) >= MIN_TOWN; });
  var saved = ""; try { saved = localStorage.getItem("cvs_city") || ""; } catch (e) {}
  function feedFor(town) { return town && offered.indexOf(town) > -1 ? slugify(town) : "valley"; }
  function links(town) {
    var f = feedFor(town), https = BASE + f + ".ics", webcal = "webcal://" + HOST + "/calendar/" + f + ".ics";
    var name = "Coachella Valley Spotlight: " + (f === "valley" ? "Valley events" : town);
    return { apple: webcal, google: "https://calendar.google.com/calendar/render?cid=" + encodeURIComponent(webcal),
      outlook: "https://outlook.live.com/calendar/0/addfromweb?url=" + encodeURIComponent(https) + "&name=" + encodeURIComponent(name), https: https, feed: f };
  }
  var ICON = {
    apple: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M16.4 12.6c0-2.4 2-3.5 2-3.6-1.1-1.6-2.8-1.8-3.4-1.8-1.4-.1-2.8.9-3.5.9s-1.8-.8-3-.8C7 7.3 5.6 8.2 4.8 9.6c-1.6 2.8-.4 6.9 1.2 9.1.8 1.1 1.7 2.3 2.8 2.3 1.1 0 1.6-.7 2.9-.7 1.4 0 1.8.7 3 .7s2-1.1 2.7-2.2c.9-1.3 1.2-2.5 1.2-2.6 0 0-2.3-.9-2.2-3.6zM14.2 5.7c.6-.8 1-1.8.9-2.8-.9 0-2 .6-2.6 1.4-.6.6-1.1 1.7-.9 2.7 1 .1 2-.5 2.6-1.3z"/></svg>',
    google: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12.24 10.29v3.43h5.68c-.23 1.47-1.71 4.3-5.68 4.3-3.42 0-6.21-2.83-6.21-6.32s2.79-6.32 6.21-6.32c1.95 0 3.25.83 4 1.54l2.72-2.62C17.21 2.67 14.94 1.6 12.24 1.6 6.66 1.6 2.14 6.12 2.14 11.7s4.52 10.1 10.1 10.1c5.83 0 9.7-4.1 9.7-9.87 0-.66-.07-1.17-.16-1.67h-9.54z"/></svg>',
    outlook: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="15" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M3 10h18M8 3v4M16 3v4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    link: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>'
  };

  // A pretend phone calendar showing what the subscription looks like, built from the real upcoming events.
  function preview(town) {
    var list = EV.filter(function (e) { return !town || offered.indexOf(town) < 0 || e.city === town; }).slice(0, 3);
    var fri = new Date(); fri.setHours(0, 0, 0, 0); while (fri.getDay() !== 5) fri.setDate(fri.getDate() + 1);
    var sun = new Date(fri); sun.setDate(sun.getDate() + 2);
    var wk = EV.filter(function (e) { var d = parse(e.date); return (!town || offered.indexOf(town) < 0 || e.city === town) && d && d >= fri && d <= sun; }).length;
    var where = town && offered.indexOf(town) > -1 ? town : "the valley";
    var fmt = function (d) { return d.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase() + "<br><em>" + d.getDate() + "</em>"; };
    var row = function (d, title, sub, cls) { return { d: d, html: '<li class="vc-ev ' + (cls || "") + '"><span class="vc-day">' + fmt(d) + '</span><span><b>' + esc(title) + '</b><i>' + esc(sub) + "</i></span></li>" }; };
    var t0 = new Date(); t0.setHours(0, 0, 0, 0);
    var rows = list.map(function (e) { var d = parse(e.date) || t0; if (d < t0) d = t0; return row(d, e.title, [e.time ? String(e.time).split(" ·")[0] : "", e.city].filter(Boolean).join(" · ")); });
    if (wk) rows.push(row(fri, "This weekend in " + where + ": " + wk + " things to do", "All day · tap for the list", "vc-fri"));
    rows.sort(function (a, b) { return a.d - b.d; });
    return '<div class="vc-phone" aria-hidden="true"><div class="vc-phone-top"><span>Calendar</span><span class="vc-dot"></span></div><ul>' + rows.map(function (r) { return r.html; }).join("") + "</ul></div>";
  }

  function draw(box) {
    var town = offered.indexOf(saved) > -1 ? saved : "";
    var compact = box.hasAttribute("data-compact"); // small version in the events page hero: no phone preview, shorter copy
    box.classList.add("vc");
    if (compact) box.classList.add("vc-compact");
    box.id = box.id || "valley-calendar";
    box.innerHTML =
      '<div class="vc-copy"><span class="eyebrow vc-eyebrow">New &middot; The Valley Calendar</span>' +
      '<h2>Put the valley in <span class="grad">your calendar.</span></h2>' +
      (compact ? '<p>Subscribe once and new events show up in the calendar app you already use, plus a Friday heads-up with the weekend&rsquo;s list. Free, no account.</p>'
        : '<p>Subscribe once and what&rsquo;s happening near you shows up in the calendar app you already use. New events appear on their own, and every Friday you get a heads-up with the weekend&rsquo;s list. Free, no account, no email.</p>') +
      '<label class="vc-town"><span>Show me events in</span><select>' + '<option value="">The whole valley</option>' +
      offered.map(function (t) { return "<option" + (t === town ? " selected" : "") + ">" + esc(t) + "</option>"; }).join("") + "</select></label>" +
      '<div class="vc-btns"><a class="vc-btn" data-app="apple">' + ICON.apple + '<span>iPhone &amp; Mac</span></a><a class="vc-btn" data-app="google" target="_blank" rel="noopener">' + ICON.google + '<span>Google Calendar</span></a>' +
      '<a class="vc-btn" data-app="outlook" target="_blank" rel="noopener">' + ICON.outlook + '<span>Outlook</span></a><button type="button" class="vc-btn vc-copy-btn" data-app="copy">' + ICON.link + '<span>Copy link</span></button></div>' +
      '<p class="vc-note" role="status"><span class="vc-count"></span> Unsubscribe any time from your calendar app.</p></div>' +
      (compact ? "" : '<div class="vc-visual"></div>');
    var sel = box.querySelector("select"), note = box.querySelector(".vc-note"), cnt = box.querySelector(".vc-count");
    function update() {
      var t = sel.value, L = links(t), n = count(offered.indexOf(t) > -1 ? t : "");
      box.querySelector('[data-app="apple"]').href = L.apple;
      box.querySelector('[data-app="google"]').href = L.google;
      box.querySelector('[data-app="outlook"]').href = L.outlook;
      cnt.textContent = n + " upcoming events" + (t ? " in " + t : " across the valley") + ", plus a weekend heads-up every Friday.";
      var vis = box.querySelector(".vc-visual"); if (vis) vis.innerHTML = preview(t);
    }
    sel.addEventListener("change", function () { update(); ga("cal_town", { city: sel.value || "valley" }); });
    box.addEventListener("click", function (e) {
      var b = e.target.closest && e.target.closest("[data-app]"); if (!b) return;
      var app = b.getAttribute("data-app"), L = links(sel.value);
      ga("cal_subscribe", { app: app, feed: L.feed });
      if (app === "copy") {
        e.preventDefault();
        var done = function () { note.innerHTML = "<b>Link copied.</b> In your calendar app, choose &ldquo;Add calendar from URL&rdquo; (or &ldquo;New calendar subscription&rdquo;) and paste it."; };
        if (navigator.clipboard) navigator.clipboard.writeText(L.https).then(done, function () { window.prompt("Copy this calendar link:", L.https); });
        else window.prompt("Copy this calendar link:", L.https);
        return;
      }
      setTimeout(function () { note.innerHTML = "<b>Almost there.</b> Tap <b>Subscribe</b> (or <b>Add</b>) in your calendar app. Look for &ldquo;Coachella Valley Spotlight&rdquo; in your calendar list."; }, 400);
    });
    update();
  }
  var boxes = document.querySelectorAll("[data-cal-sub]");
  boxes.forEach(draw);

  // Someone just added one event: offer the whole calendar instead (once per visit).
  document.addEventListener("click", function (ev) {
    var a = ev.target.closest && ev.target.closest(".cal-links .cal-btn"); if (!a) return;
    var shown = false; try { shown = sessionStorage.getItem("cvs_vc_nudge") === "1"; sessionStorage.setItem("cvs_vc_nudge", "1"); } catch (e) {}
    if (shown) return;
    var ics = a.closest(".cal-links").querySelector("[data-ics]"), slug = ics && ics.getAttribute("data-ics");
    var e = slug && window.CVS_EVENT_SLUG ? EV.filter(function (x) { return window.CVS_EVENT_SLUG(x) === slug; })[0] : null;
    var town = e && offered.indexOf(e.city) > -1 ? e.city : "";
    var target = boxes.length ? "#" + boxes[0].id : "events#valley-calendar";
    var t = document.createElement("div"); t.className = "vc-toast"; t.setAttribute("role", "status");
    t.innerHTML = '<span><b>Added.</b> Want every ' + esc(town || "valley") + ' event automatically?</span><a href="' + target + '">Subscribe</a><button type="button" aria-label="Close">&times;</button>';
    document.body.appendChild(t);
    t.querySelector("a").addEventListener("click", function () {
      ga("cal_nudge_click", { city: town || "valley" });
      if (boxes.length && town) { var s = boxes[0].querySelector("select"); s.value = town; s.dispatchEvent(new Event("change")); }
      t.remove();
    });
    t.querySelector("button").addEventListener("click", function () { t.remove(); });
    setTimeout(function () { if (t.parentNode) t.classList.add("vc-toast-out"); setTimeout(function () { t.remove(); }, 400); }, 9000);
  });
})();
