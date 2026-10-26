/* Coachella Valley Spotlight: renders listings from the files in /data. */
(function () {
  var D = window.CVS || {};
  var today = new Date(); today.setHours(0, 0, 0, 0);
  var MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  var MONTHS_LONG = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  function parse(d) { if (!d) return null; var p = d.split("-"); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function fmt(d) { return MONTHS[d.getMonth()] + " " + d.getDate() + ", " + d.getFullYear(); }
  function sample(x) { return x.sample ? '<span class="sample">SAMPLE</span>' : ""; }
  var ROOT = document.documentElement.getAttribute("data-root") || "";
  function eventSlug(e) { return (String(e.title).toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").replace(/^(.{80}[^-]*).*$/, "$1")) + "-" + (e.weekly ? "weekly" : e.date); }
  function iso(d) { return d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2); }
  var WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  // Weekly events (weekly: "Saturday", optional from/until): show the next date, plus the next few for the date filter.
  function nextWeekly(e) {
    if (!e.weekly) return e;
    var dow = WEEKDAYS.indexOf(e.weekly), d = new Date(Math.max(today, parse(e.from) || today)), until = parse(e.until);
    if (dow < 0) return null;
    while (d.getDay() !== dow) d.setDate(d.getDate() + 1);
    if (until && d > until) return null;
    var dates = [];
    for (var x = new Date(d), i = 0; i < 10 && (!until || x <= until); i++, x.setDate(x.getDate() + 7)) dates.push(iso(x));
    var out = {}; for (var k in e) out[k] = e[k];
    out.date = iso(d); out.dates = dates; out.recurring = "Every " + e.weekly;
    return out;
  }
  // Add to calendar. Times like "7:00 PM", "8 AM to 1 PM", "Doors 7PM"; no time = all-day.
  function calTimes(e) {
    var m = String(e.time || "").match(/(\d{1,2})(?::(\d\d))?\s*([AP])\.?M\b(?:[^0-9]{1,6}(\d{1,2})(?::(\d\d))?\s*([AP])\.?M\b)?/i);
    if (!m || e.endDate) return null;
    var h = function (hh, ap) { return (+hh % 12) + (/p/i.test(ap) ? 12 : 0); };
    var s = h(m[1], m[3]) * 60 + (+m[2] || 0), en = m[4] ? h(m[4], m[6]) * 60 + (+m[5] || 0) : s + 120;
    if (en <= s) en = s + 120;
    var f = function (t) { return ("0" + Math.floor(t / 60) % 24).slice(-2) + ("0" + t % 60).slice(-2) + "00"; };
    return { start: f(s), end: en >= 1440 ? "235900" : f(en) };
  }
  function calInfo(e) {
    var t = calTimes(e), d = e.date.replace(/-/g, ""), last = parse(e.endDate || e.date); last.setDate(last.getDate() + 1);
    return { t: t, start: t ? d + "T" + t.start : d, end: t ? d + "T" + t.end : iso(last).replace(/-/g, ""),
      where: [e.venue, e.city ? e.city + ", CA" : ""].filter(Boolean).join(", "),
      more: e.feed ? e.url : "https://coachellavalleyspotlight.com/event/" + eventSlug(e) + "/",
      rule: e.weekly ? "RRULE:FREQ=WEEKLY" + (e.until ? ";UNTIL=" + e.until.replace(/-/g, "") + "T235959Z" : "") : "" };
  }
  function googleCal(e) {
    var c = calInfo(e);
    return "https://calendar.google.com/calendar/render?action=TEMPLATE&text=" + encodeURIComponent(e.title) + "&dates=" + c.start + "/" + c.end +
      (c.t ? "&ctz=America/Los_Angeles" : "") + "&location=" + encodeURIComponent(c.where) + "&details=" + encodeURIComponent("Details: " + c.more) + (c.rule ? "&recur=" + encodeURIComponent(c.rule) : "");
  }
  function icsText(e) {
    var c = calInfo(e), x = function (s) { return String(s).replace(/[\\;,]/g, "\\$&").replace(/\n/g, "\\n"); };
    var tz = c.t ? ";TZID=America/Los_Angeles:" : ";VALUE=DATE:";
    return ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Coachella Valley Spotlight//Events//EN", "CALSCALE:GREGORIAN",
      c.t ? "BEGIN:VTIMEZONE\r\nTZID:America/Los_Angeles\r\nBEGIN:DAYLIGHT\r\nTZOFFSETFROM:-0800\r\nTZOFFSETTO:-0700\r\nTZNAME:PDT\r\nDTSTART:19700308T020000\r\nRRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=2SU\r\nEND:DAYLIGHT\r\nBEGIN:STANDARD\r\nTZOFFSETFROM:-0700\r\nTZOFFSETTO:-0800\r\nTZNAME:PST\r\nDTSTART:19701101T020000\r\nRRULE:FREQ=YEARLY;BYMONTH=11;BYDAY=1SU\r\nEND:STANDARD\r\nEND:VTIMEZONE" : "",
      "BEGIN:VEVENT", "UID:" + eventSlug(e) + "@coachellavalleyspotlight.com", "DTSTAMP:" + new Date().toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z",
      "DTSTART" + tz + c.start, "DTEND" + tz + c.end, c.rule, "SUMMARY:" + x(e.title), "LOCATION:" + x(c.where), "DESCRIPTION:" + x("Details: " + c.more), "URL:" + c.more,
      "END:VEVENT", "END:VCALENDAR"].filter(Boolean).join("\r\n");
  }
  // Icons for add-to-calendar (Google "G" mark from Simple Icons, CC0; the others are drawn here).
  var ICON = {
    cal: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M3 10h18M8 3v4M16 3v4M12 13v5M9.5 15.5h5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    google: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"/></svg>',
    ics: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M3 10h18M8 3v4M16 3v4M12 12.5v6M9.5 16l2.5 2.5 2.5-2.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>'
  };
  function calLinks(e) {
    return '<span class="cal-links"><span class="cal-label" title="Add to calendar">' + ICON.cal + '<span class="sr-only">Add to calendar:</span></span>' +
      '<a class="cal-btn" href="' + esc(googleCal(e)) + '" target="_blank" rel="noopener" title="Add to Google Calendar" aria-label="Add to Google Calendar">' + ICON.google + '</a>' +
      '<a class="cal-btn" href="#" data-ics="' + esc(eventSlug(e)) + '" title="Add to Apple Calendar or Outlook (.ics file)" aria-label="Add to Apple Calendar or Outlook">' + ICON.ics + '</a></span>';
  }
  function slugOf(b) { return b.slug || String(b.name).toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }
  function outbound(u) { try { var x = new URL(u); x.searchParams.set("utm_source", "coachellavalleyspotlight"); x.searchParams.set("utm_medium", "directory"); return x.toString(); } catch (e) { return u; } }
  function liveOffer(o) { if (!o || !o.title) return null; var d = parse(o.expires); return !d || d >= today ? o : null; }
  // One photo per city for home page headline cards (assets/img/cities/, credits on legal.html#photos)
  var CITY_PHOTOS = ["bermuda-dunes", "palm-springs", "desert-hot-springs", "cathedral-city", "rancho-mirage", "palm-desert", "indian-wells", "la-quinta", "indio", "coachella", "thousand-palms", "thermal", "mecca"];
  function cityPhoto(city) { var s = String(city || "").toLowerCase().replace(/[^a-z]+/g, "-"); return CITY_PHOTOS.indexOf(s) > -1 ? s : "valley-wide"; }
  function link(url, label) {
    if (!url) return "";
    var outside = /^https?:/i.test(url);
    return '<a class="card-link" href="' + esc(outside ? url : ROOT + url) + '"' + (outside ? ' target="_blank" rel="noopener"' : '') + '>' + label + ' &rarr;</a>';
  }

  var events = (D.events || []).concat(D.feedEvents || []).map(nextWeekly).filter(function (e) { var d = e && parse(e.endDate || e.date); return d && d >= today; })
    .sort(function (a, b) { return parse(a.date) - parse(b.date); });
  var deals = (D.deals || []).filter(function (x) { var d = parse(x.expires); return !d || d >= today; });
  var news = (D.news || []).concat(D.headlines || []).sort(function (a, b) { return parse(b.date) - parse(a.date); });
  var directory = (D.directory || []).slice().sort(function (a, b) { return ((b.premium || b.featured) ? 1 : 0) - ((a.premium || a.featured) ? 1 : 0) || (a.sample ? 1 : 0) - (b.sample ? 1 : 0) || a.name.localeCompare(b.name); });

  // Card art: Premium listings show their own photo or ad; everyone else gets a category icon (Lucide-style strokes).
  var ICONS = {
    "Restaurants": '<path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/>',
    "Home services": '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M10 21v-6h4v6"/>',
    "Health and beauty": '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>',
    "Fitness": '<path d="M6.5 6.5v11M17.5 6.5v11M3 9v6M21 9v6M6.5 12h11"/>',
    "Legal": '<path d="M12 3v18M7 21h10M5 7h14M5 7l-3 7a3 3 0 0 0 6 0L5 7Zm14 0-3 7a3 3 0 0 0 6 0l-3-7Z"/>',
    "Pets": '<circle cx="11" cy="4" r="2"/><circle cx="18" cy="8" r="2"/><circle cx="20" cy="16" r="2"/><path d="M9 10a5 5 0 0 1 5 5v3.5a3.5 3.5 0 0 1-6.84 1.045Q6.52 17.48 4.46 16.84A3.5 3.5 0 0 1 5.5 10Z"/>',
    "Outdoors": '<path d="m8 3 4 8 5-5 5 15H2L8 3Z"/>',
    "Recreation": '<circle cx="12" cy="12" r="9"/><path d="M5.6 5.6a9 9 0 0 1 0 12.8M18.4 5.6a9 9 0 0 0 0 12.8"/>',
    "Attractions": '<path d="M3 21h18M5 21V10M9.5 21V10M14.5 21V10M19 21V10M2 10l10-6 10 6Z"/>',
    "Shopping": '<path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/>',
    "Automotive": '<path d="M5 17H3v-5l2-5h14l2 5v5h-2"/><path d="M9 17h6"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/>'
  };
  // Service-level icons win over the category icon.
  var SERVICE_ICONS = {
    "Bowling": '<circle cx="9" cy="14" r="7"/><circle cx="7" cy="11.5" r=".8"/><circle cx="10" cy="11" r=".8"/><circle cx="8.8" cy="13.6" r=".8"/><path d="M18 3c1.3 0 2 1 2 2.2 0 .8-.6 1.4-.6 2.3 0 1.1 1.6 2.4 1.6 5.5 0 3.5-1.2 8-3 8s-3-4.5-3-8c0-3.1 1.6-4.4 1.6-5.5 0-.9-.6-1.5-.6-2.3C16 4 16.7 3 18 3Z"/>',
    "Skate parks": '<path d="M3 9.5h18M4.5 9.5c0 1.5 1 2.5 2.5 2.5h10c1.5 0 2.5-1 2.5-2.5"/><circle cx="7.5" cy="16" r="2"/><circle cx="16.5" cy="16" r="2"/>',
    "Disc golf": '<path d="M5 6h14M6 6l1.5 6h9L18 6M12 12v9M8 21h8M7.5 9h9"/>',
    "Swimming & water parks": '<path d="M2 20c2 0 2.5-1.5 5-1.5S10 20 12 20s2.5-1.5 5-1.5 3 1.5 5 1.5"/><path d="M3 15.5C3 9 7.5 4 13.5 4 17.6 4 20 6.4 20 9c0 2.3-1.8 4-4 4-1.9 0-3.2-1.3-3.2-2.9 0-1.2.8-2.1 1.9-2.1"/>'
  };
  var STORE = '<path d="M3 9l1.5-5h15L21 9"/><path d="M4 9v12h16V9"/><path d="M3 9h18"/><path d="M9 21v-6h6v6"/>';
  // Feature pills (dog parks and other public places): ["Fenced", "Shade", ...]
  function featPills(list) {
    return list && list.length ? '<ul class="feat-pills" aria-label="Features">' + list.map(function (f) { return '<li>' + esc(f) + '</li>'; }).join("") + '</ul>' : '';
  }
  // Save (heart) button; assets/auth.js wires it to the visitor's account.
  function favBtn(key, label) {
    return '<button type="button" class="fav" data-fav="' + esc(key) + '" aria-pressed="false" aria-label="Save ' + esc(label) + '"><svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M12 20.5s-7.5-4.6-9.4-9.3C1.4 8.3 3.2 4.8 6.6 4.5c2-.2 3.7.9 5.4 2.9 1.7-2 3.4-3.1 5.4-2.9 3.4.3 5.2 3.8 4 6.7-1.9 4.7-9.4 9.3-9.4 9.3Z"/></svg></button>';
  }
  function cardArt(b, prem) {
    var img = prem && (b.image || (b.gallery || [])[0]);
    if (img) return '<img class="card-img" src="' + ROOT + esc(img) + '" alt="" loading="lazy" width="640" height="360">';
    return '<span class="cat-ico" aria-hidden="true"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + (SERVICE_ICONS[b.service] || ICONS[b.category] || STORE) + '</svg></span>';
  }

  // "List your business" reminder after every 3rd category group on the full directory (not after the last; the page already ends with one).
  function listBand(i, n) {
    return (i + 1) % 3 === 0 && i < n - 1 ? '<div class="biz-band list-band"><p><strong>Got a business to list?</strong><br>Send it in. Listing it here is free.</p><a class="btn" href="' + ROOT + 'submit?plan=basic#form">Submit it</a></div>' : '';
  }

  var R = {
    event: function (e) {
      var d = parse(e.date);
      return '<article class="card event">' + sample(e) + favBtn("event:" + eventSlug(e), e.title) +
        '<div class="date-tile"><span>' + MONTHS[d.getMonth()] + '</span><b>' + d.getDate() + '</b><span>' + (e.endDate ? 'to ' + parse(e.endDate).getDate() : ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d.getDay()]) + '</span></div>' +
        '<div style="display:grid;gap:6px"><span class="meta">' + esc(e.city) + (e.recurring ? ' &middot; ' + esc(e.recurring) : '') + (e.time ? ' &middot; ' + esc(e.time) : '') + '</span>' +
        // Pulled events (feed: true) have no page here; they link to the source's own page.
        '<h3><a href="' + (e.feed ? esc(e.url) + '" target="_blank" rel="noopener' : ROOT + 'event/' + eventSlug(e) + '/') + '" style="color:inherit;text-decoration:none">' + esc(e.title) + '</a></h3><p>' + esc(e.venue) + (e.price ? ' &middot; ' + esc(e.price) : '') + '</p>' +
        (e.description ? '<p class="ev-desc">' + esc(e.description) + '</p>' : '') +
        (e.category ? '<span class="tag">' + esc(e.category) + '</span>' : '') +
        (e.feed ? '<a class="card-link" href="' + esc(e.url) + '" target="_blank" rel="noopener">Details at ' + esc(e.source) + ' &rarr;</a>' : '<a class="card-link" href="' + ROOT + 'event/' + eventSlug(e) + '/">Event details &rarr;</a>') + calLinks(e) + '</div></article>';
    },
    eventRow: function (e) {
      var d = parse(e.date), href = e.feed ? esc(e.url) + '" target="_blank" rel="noopener' : ROOT + 'event/' + eventSlug(e) + '/';
      return '<li><a href="' + href + '"><span class="hp-date"><small>' + ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d.getDay()] + '</small><b>' + d.getDate() + '</b></span>' +
        '<span class="hp-txt"><b>' + esc(e.title) + '</b><small>' + esc(e.city) + (e.time ? ' &middot; ' + esc(e.time) : '') + '</small></span></a></li>';
    },
    deal: function (x) {
      var d = parse(x.expires);
      return '<article class="card deal">' + sample(x) + '<span class="meta">' + esc(x.business) + ' &middot; ' + esc(x.city) + '</span>' +
        '<div class="offer">' + esc(x.offer) + '</div><p>' + esc(x.details) + '</p>' +
        '<span class="meta">' + (d ? 'Good through ' + fmt(d) : 'Ongoing') + '</span>' + link(x.url, "Get this deal") + '</article>';
    },
    news: function (n, opt) {
      var d = parse(n.date);
      if (n.feed) return '<article class="card story headline">' + (opt && opt.img ? '<img class="headline-img" src="' + ROOT + 'assets/img/cities/' + cityPhoto(n.city) + '.jpg" alt="" loading="lazy" width="800" height="450">' : '') + '<span class="meta">' + esc(n.city) + (d ? ' &middot; ' + fmt(d) : '') + '</span>' +
        '<h3><a href="' + esc(n.url) + '" target="_blank" rel="noopener nofollow">' + esc(n.title) + '</a></h3>' +
        '<a class="card-link" href="' + esc(n.url) + '" target="_blank" rel="noopener nofollow">Read it at ' + esc(n.source) + ' &rarr;</a></article>';
      return '<article class="card story">' + sample(n) + '<span class="meta">' + esc(n.city) + (d ? ' &middot; ' + fmt(d) : '') + '</span>' +
        '<h3>' + esc(n.title) + '</h3><p>' + esc(n.summary) + '</p>' +
        (n.source ? '<span class="meta">Source: ' + esc(n.source) + '</span>' : '') + link(n.url, "Read more") + '</article>';
    },
    directory: function (b) {
      var slug = !b.sample && slugOf(b);
      var name = slug ? '<a href="' + ROOT + 'business/' + slug + '/" data-track="profile-link" style="color:inherit;text-decoration:none">' + esc(b.name) + '</a>' : esc(b.name);
      var prem = b.premium || b.featured, off = prem && liveOffer(b.offer);
      return '<article class="card' + (prem ? ' featured' : '') + '"' + (slug ? ' data-biz="' + slug + '"' : '') + '>' + sample(b) + (slug ? favBtn("biz:" + slug, b.name) : '') + cardArt(b, prem) + '<span class="meta">' + esc(b.service || b.category) + ' &middot; ' + esc(b.city) + '</span>' +
        '<h3>' + name + '</h3>' + (b.claimed && !b.public ? '<span class="verified" title="The owner has claimed this listing and keeps it up to date">&#10003; Verified by owner</span>' : '') + '<p>' + esc(b.blurb) + '</p>' + (b.courts && b.size ? '<p class="hh"><b>Courts:</b> ' + esc(b.size) + '</p>' : '') + (b.trail && b.trail.summary ? '<p class="hh"><b>Trail:</b> ' + esc(b.trail.summary) + '</p>' : '') + featPills(b.features) + (b.happyHour ? '<p class="hh"><b>Happy hour:</b> ' + esc(b.happyHour) + '</p>' : '') +
        (b.postcard ? '<span class="tag">On the Spotlight postcard</span>' : prem ? '<span class="tag">Premium listing</span>' : '') +
        (off ? '<div class="offer-box"><b>' + esc(off.title) + '</b>' + (off.details ? '<span>' + esc(off.details) + '</span>' : '') + '</div>' : '') +
        (slug ? '<a class="card-link" href="' + ROOT + 'business/' + slug + '/">View profile &rarr;</a>' : '') + '</article>';
    }
  };

  /* PRERENDER-END: tools/build-seo.js runs everything above this line at build time to put the same cards in the HTML. */
  // Shared with assets/auth.js (favorites page) and used to load it on every page.
  window.CVS_RENDER = { R: R, events: events, directory: directory, slugOf: slugOf, eventSlug: eventSlug, root: ROOT };
  (function () { var m = document.createElement("script"); m.type = "module"; m.src = ROOT + "assets/auth.js"; document.head.appendChild(m); })();
  var SETS = { events: events, deals: deals, news: news, directory: directory };
  var TYPE = { events: "event", deals: "deal", news: "news", directory: "directory" };

  function text(item) { return Object.keys(item).map(function (k) { return typeof item[k] === "string" ? item[k] : ""; }).join(" ").toLowerCase(); }

  // Date window for the events "When" filter: [from, to] as YYYY-MM-DD, or null for any date.
  function windowFor(v) {
    if (!v) return null;
    var a = new Date(today), b = new Date(today), dow = today.getDay();
    if (v === "weekend") { if (dow >= 1 && dow <= 4) a.setDate(a.getDate() + (5 - dow)); b = new Date(a); b.setDate(a.getDate() + (7 - a.getDay()) % 7); }
    else if (v === "week") b.setDate(b.getDate() + 6);
    else if (v === "month") b = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    else if (v === "after-weekend") { var wk = windowFor("weekend"); a = parse(wk[1]); a.setDate(a.getDate() + 1); return [iso(a), "9999-12-31"]; }
    return [iso(a), iso(b)];
  }
  function inWindow(e, w) {
    if (!w) return true;
    if (e.dates) return e.dates.some(function (d) { return d >= w[0] && d <= w[1]; });
    return e.date <= w[1] && (e.endDate || e.date) >= w[0];
  }

  // Small blocks: <div data-list="events" data-limit="4"></div>. Optional data-when="weekend" (events only; falls back to upcoming if empty).
  document.querySelectorAll("[data-list]").forEach(function (el) {
    var key = el.getAttribute("data-list"), limit = +el.getAttribute("data-limit") || 999;
    var per = el.getAttribute("data-per"), seen = {}, inCity = el.getAttribute("data-city");
    // data-per="city": only the newest item from each city (the lists are already newest first)
    var items = SETS[key].filter(function (x) { if (inCity && x.city !== inCity) return false; if (!per) return true; var v = x[per] || ""; if (seen[v]) return false; seen[v] = 1; return true; });
    var w = windowFor(el.getAttribute("data-when"));
    // "after-weekend" goes by each event's next date, so a weekly market showing this Saturday isn't repeated under "Coming up".
    var after = el.getAttribute("data-when") === "after-weekend";
    if (w) { var inW = items.filter(function (x) { return after ? x.date >= w[0] : inWindow(x, w); }); if (inW.length) items = inW; }
    items = items.slice(0, limit);
    var opt = { img: el.hasAttribute("data-img") }, view = el.getAttribute("data-view") === "row" ? TYPE[key] + "Row" : TYPE[key];
    el.innerHTML = items.length ? items.map(function (x) { return R[view](x, opt); }).join("") : '<div class="empty">Nothing here yet. Check back soon.</div>';
    // data-hide-empty: drop the whole section when there's nothing to show (city pages).
    if (!items.length && el.hasAttribute("data-hide-empty")) { var sec = el.closest("section"); if (sec) sec.hidden = true; }
  });

  // Full list pages with filters: <div data-browse="events"></div>
  var browse = document.querySelector("[data-browse]");
  if (browse) {
    var key = browse.getAttribute("data-browse"), all = SETS[key];
    var q = document.getElementById("f-q"), city = document.getElementById("f-city"), cat = document.getElementById("f-cat"), when = document.getElementById("f-when");
    function fill(sel, field) {
      if (!sel) return;
      var vals = all.map(function (x) { return x[field]; }).filter(Boolean);
      vals.filter(function (v, i) { return vals.indexOf(v) === i; }).sort().forEach(function (v) {
        var o = document.createElement("option"); o.value = v; o.textContent = v; sel.appendChild(o);
      });
    }
    fill(city, "city"); fill(cat, "category");
    // Happy hours is an extra group: any listing with a happyHour shows there as well as in its own category.
    if (cat && key === "directory" && all.some(function (x) { return x.happyHour; })) { var hho = document.createElement("option"); hho.value = hho.textContent = "Happy hours"; cat.appendChild(hho); }
    var params = new URLSearchParams(location.search);
    if (q && params.get("q")) q.value = params.get("q");
    if (cat && params.get("category")) cat.value = params.get("category");
    if (city && params.get("city")) city.value = params.get("city");
    if (when && params.get("when")) when.value = params.get("when");
    function draw() {
      var term = q ? q.value.trim().toLowerCase() : "", w = when ? windowFor(when.value) : null;
      var items = all.filter(function (x) {
        return (!term || text(x).indexOf(term) > -1) && (!city || !city.value || x.city === city.value) && (!cat || !cat.value || x.category === cat.value || (cat.value === "Happy hours" && x.happyHour)) && inWindow(x, w);
      });
      if (!items.length) { browse.innerHTML = '<div class="empty">No matches. Try a different city or search word.</div>'; return; }
      if (key === "events") {
        var html = "", last = "";
        items.forEach(function (e) {
          var d = parse(e.date), m = MONTHS_LONG[d.getMonth()] + " " + d.getFullYear();
          if (m !== last) { html += (last ? "</div>" : "") + '<h2 class="month-head"><span class="stripe-mini"></span>' + m + '</h2><div class="grid-2">'; last = m; }
          html += R.event(e);
        });
        browse.innerHTML = html + "</div>";
      } else if (key === "directory") {
        // With "All categories": postcard advertisers get their own Featured section on top,
        // then everyone else grouped by category, A to Z (each group keeps the usual order).
        var allCats = !cat || !cat.value;
        var feat = allCats ? items.filter(function (b) { return b.postcard; }) : [];
        var groups = {}, names = [];
        items.forEach(function (b) { if (allCats && b.postcard) return; var c = b.category || "Other"; if (!groups[c]) { groups[c] = []; names.push(c); } groups[c].push(b); });
        var hhList = items.filter(function (b) { return b.happyHour; });
        if (allCats && hhList.length) { groups["Happy hours"] = hhList; names.push("Happy hours"); }
        if (cat && cat.value === "Happy hours") { groups = { "Happy hours": hhList }; names = ["Happy hours"]; }
        names.sort();
        var anchor = function (c) { return "cat-" + c.toLowerCase().replace(/[^a-z0-9]+/g, "-"); };
        var head = function (id, label, n) { return '<h2 class="month-head" id="' + id + '"><span class="stripe-mini"></span>' + esc(label) + ' <span class="cat-count">' + n + '</span></h2>'; };
        var jumps = (feat.length ? ['<a href="#cat-featured">Featured (' + feat.length + ')</a>'] : []).concat(names.map(function (c) { return '<a href="#' + anchor(c) + '">' + esc(c) + ' (' + groups[c].length + ')</a>'; }));
        browse.innerHTML = (jumps.length > 1 ? '<p class="cat-jump">' + jumps.join("") + '</p>' : '') +
          (feat.length ? '<section class="featured-band">' + head("cat-featured", "Featured Listings", feat.length) + '<p class="featured-note">Local businesses on the current Spotlight postcard.</p><div class="grid">' + feat.map(R.directory).join("") + '</div></section>' : '') +
          names.map(function (c, i) { return head(anchor(c), c, groups[c].length) + '<div class="grid">' + groups[c].map(R.directory).join("") + '</div>' + listBand(i, names.length); }).join("");
      } else {
        browse.innerHTML = '<div class="' + (key === "news" ? "grid-2" : "grid") + '">' + items.map(R[TYPE[key]]).join("") + "</div>";
      }
    }
    [q, city, cat, when].forEach(function (el) { if (el) el.addEventListener("input", draw); });
    draw();
  }

  // Home page search: searches everything at once
  var hs = document.getElementById("home-search");
  if (hs) {
    var out = document.getElementById("search-results");
    hs.addEventListener("submit", function (ev) {
      ev.preventDefault();
      var term = hs.q.value.trim().toLowerCase();
      if (!term) { out.hidden = true; return; }
      var html = "", total = 0;
      [["events", "Events"], ["deals", "Deals"], ["news", "Local news"], ["directory", "Businesses"]].forEach(function (pair) {
        var hits = SETS[pair[0]].filter(function (x) { return text(x).indexOf(term) > -1; });
        total += hits.length;
        if (hits.length) html += '<h3 class="month-head"><span class="stripe-mini"></span>' + pair[1] + '</h3><div class="grid">' + hits.slice(0, 6).map(R[TYPE[pair[0]]]).join("") + '</div>';
      });
      out.innerHTML = '<p class="meta" style="font-family:var(--mono)">' + total + ' result' + (total === 1 ? '' : 's') + ' for &ldquo;' + esc(term) + '&rdquo;</p>' + (html || '<div class="empty">Nothing matched. Try a city name or a word like &ldquo;pool&rdquo; or &ldquo;tacos&rdquo;.</div>');
      out.hidden = false;
      out.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  // Listing tracking: counts views, profile views, calls and website clicks per business.
  var TRACK = "https://cvs-tracker.toddstpierre.workers.dev/t";
  function track(slug, type) {
    if (!slug || /localhost|127\.0\.0\.1|^file/.test(location.href)) return;
    var body = JSON.stringify({ b: slug, e: type });
    try { if (navigator.sendBeacon && navigator.sendBeacon(TRACK, body)) return; } catch (e) {}
    try { fetch(TRACK, { method: "POST", body: body, keepalive: true, mode: "no-cors" }); } catch (e) {}
  }
  var seen = {};
  var io = "IntersectionObserver" in window && new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      var slug = en.target.getAttribute("data-biz");
      if (en.isIntersecting && !seen[slug]) { seen[slug] = 1; track(slug, "impression"); io.unobserve(en.target); }
    });
  }, { threshold: 0.5 });
  function watch() { if (io) document.querySelectorAll("[data-biz]:not([data-noimp])").forEach(function (el) { io.observe(el); }); }
  watch();
  new MutationObserver(watch).observe(document.body, { childList: true, subtree: true });
  document.addEventListener("click", function (ev) {
    var a = ev.target.closest("[data-track]"); if (!a) return;
    var host = a.closest("[data-biz]"), type = a.getAttribute("data-track");
    if (host && (type === "call" || type === "website")) track(host.getAttribute("data-biz"), type);
  });
  // Google reviews on Premium profiles: fetched live from the tracker each visit (never stored, per Google's terms).
  var grBox = document.querySelector("[data-reviews]");
  if (grBox) {
    var stars = function (n) { var w = Math.max(0, Math.min(5, n)) / 5 * 100; return '<span class="gr-stars" role="img" aria-label="' + n + ' out of 5 stars"><span style="width:' + w + '%"></span></span>'; };
    fetch("https://cvs-tracker.toddstpierre.workers.dev/reviews?b=" + encodeURIComponent(grBox.getAttribute("data-reviews"))).then(function (r) { return r.json(); }).then(function (g) {
      if (!g || !g.ok) return;
      var ext = ' target="_blank" rel="noopener"';
      var html = '<h2 class="month-head" style="margin-top:48px"><span class="stripe-mini"></span>Google reviews</h2>' +
        '<p class="gr-summary"><b>' + g.rating.toFixed(1) + '</b>' + stars(g.rating) + '<span>' + g.count.toLocaleString() + ' review' + (g.count === 1 ? '' : 's') + ' on Google</span></p>';
      if (g.reviews.length) html += '<div class="gr-list">' + g.reviews.map(function (r) {
        var who = r.authorUrl ? '<a href="' + esc(r.authorUrl) + '"' + ext + '>' + esc(r.author) + '</a>' : esc(r.author);
        return '<article class="gr-card"><div class="gr-head">' + (r.photo ? '<img src="' + esc(r.photo) + '" alt="" width="36" height="36" loading="lazy" referrerpolicy="no-referrer">' : '') +
          '<div><b>' + who + '</b><span>' + stars(r.rating) + ' ' + esc(r.when) + '</span></div></div>' +
          '<p>' + esc(r.text) + '</p>' + (r.url ? '<a class="gr-more" href="' + esc(r.url) + '"' + ext + '>Read on Google &rarr;</a>' : '') + '</article>';
      }).join("") + '</div>';
      html += '<p class="gr-foot">Reviews from <b>Google Maps</b>' + (g.mapsUrl ? ' &middot; <a href="' + esc(g.mapsUrl) + '"' + ext + '>See all reviews &rarr;</a>' : '') + '</p>';
      grBox.innerHTML = html; grBox.hidden = false;
    }).catch(function () {});
  }
  // Home hero panel: rotate "This weekend" with the ads on the current Spotlight postcard.
  // Pauses on hover/focus and with the pause button; no auto-rotate for prefers-reduced-motion.
  var panel = document.querySelector(".hero-panel .hp-slides");
  var ads = directory.filter(function (b) { return b.postcard && b.image && !b.sample; });
  if (panel && ads.length) {
    ads.forEach(function (b) {
      var slug = slugOf(b), d = document.createElement("div");
      d.className = "hp-slide hp-ad"; d.setAttribute("role", "group"); d.setAttribute("aria-roledescription", "slide"); d.setAttribute("aria-label", b.name);
      d.setAttribute("data-biz", slug); d.setAttribute("data-noimp", ""); d.hidden = true;
      d.innerHTML = '<span class="eyebrow"><span class="stripe-mini"></span>On the Spotlight postcard</span>' +
        '<a class="hp-ad-img" href="' + ROOT + 'business/' + slug + '/"><img src="' + ROOT + esc(b.image) + '" alt="' + esc(b.imageAlt || b.name + " ad") + '" loading="lazy"></a>' +
        '<a class="more" href="' + ROOT + 'business/' + slug + '/">' + esc(b.name) + ' &rarr;</a>';
      panel.appendChild(d);
    });
    var slides = panel.querySelectorAll(".hp-slide"), cur = 0, timer = null, paused = false;
    var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
    var bar = document.createElement("div"); bar.className = "hp-controls";
    var dots = [].map.call(slides, function (sl, i) {
      var b = document.createElement("button"); b.type = "button"; b.className = "hp-dot";
      b.setAttribute("aria-label", "Show " + sl.getAttribute("aria-label")); b.addEventListener("click", function () { show(i); stop(); });
      bar.appendChild(b); return b;
    });
    var pb = document.createElement("button"); pb.type = "button"; pb.className = "hp-pause"; bar.appendChild(pb);
    panel.parentNode.appendChild(bar);
    function show(i) {
      slides[cur].hidden = true; slides[cur].classList.remove("is-on"); dots[cur].removeAttribute("aria-current");
      cur = (i + slides.length) % slides.length;
      slides[cur].hidden = false; slides[cur].classList.add("is-on"); dots[cur].setAttribute("aria-current", "true");
      var slug = slides[cur].getAttribute("data-biz");
      if (slug && !seen[slug]) { seen[slug] = 1; track(slug, "impression"); }
    }
    function start() { if (reduce || paused) return; clearInterval(timer); timer = setInterval(function () { show(cur + 1); }, 6000); }
    function stop() { clearInterval(timer); timer = null; }
    function label() { pb.textContent = paused || reduce ? "Play" : "Pause"; pb.setAttribute("aria-label", (paused || reduce ? "Play" : "Pause") + " slideshow"); }
    pb.addEventListener("click", function () { if (paused || reduce) { paused = false; reduce = false; start(); } else { paused = true; stop(); } label(); });
    var box = panel.parentNode;
    box.addEventListener("mouseenter", stop); box.addEventListener("mouseleave", start);
    box.addEventListener("focusin", stop); box.addEventListener("focusout", function (e) { if (!box.contains(e.relatedTarget)) start(); });
    dots[0].setAttribute("aria-current", "true"); label(); start();
  }

  // Site visitors: count each browser once per day, then show today's and this month's totals.
  var VAPI = "https://cvs-tracker.toddstpierre.workers.dev";
  var pDay = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Los_Angeles" }).format(new Date());
  var lastDay = null;
  try { lastDay = localStorage.getItem("cvs_visit_day"); } catch (e) {}
  if (lastDay !== pDay) { track("cvs-site", "visit"); try { localStorage.setItem("cvs_visit_day", pDay); } catch (e) {} }
  var pills = document.querySelectorAll("[data-visitors]");
  if (pills.length) setTimeout(function () {
    fetch(VAPI + "/visitors").then(function (r) { return r.json(); }).then(function (v) {
      pills.forEach(function (p) {
        p.querySelector('[data-v="today"]').textContent = (v.today || 0).toLocaleString();
        p.querySelector('[data-v="month"]').textContent = (v.month || 0).toLocaleString();
        p.hidden = false;
      });
    }).catch(function () {});
  }, 600);

  var prof = document.body.getAttribute("data-profile");
  if (prof) track(prof, "profile");

  // Pre-pick the listing type on the submit form from ?plan=
  var plan = new URLSearchParams(location.search).get("plan"), planSel = document.getElementById("plan");
  if (plan && planSel) { planSel.value = plan === "premium" ? "Premium listing" : "Basic listing (free)"; var ty = document.getElementById("type"); if (ty) ty.value = "A business listing"; }
  // Golf: submit?type=golf&name=<course> pre-picks "A golf course" (and the course name when sending an update)
  var sp = new URLSearchParams(location.search), tySel = document.getElementById("type");
  if (sp.get("type") === "golf" && tySel) {
    tySel.value = "A golf course";
    var bz = document.querySelector('#form input[name="business"]'), tt = document.querySelector('#form input[name="title"]');
    if (sp.get("name")) { if (bz) bz.value = sp.get("name"); if (tt) tt.value = "Update for " + sp.get("name"); }
    else if (tt) tt.placeholder = "Course name";
  }

  // Mobile menu
  var t = document.querySelector(".menu-toggle");
  if (t) t.addEventListener("click", function () {
    var nav = t.closest(".nav"); var open = nav.classList.toggle("open"); t.setAttribute("aria-expanded", open);
  });

  // Cities dropdown in the main menu: click/tap to open, Escape or a click outside closes it.
  document.querySelectorAll(".sub-toggle").forEach(function (btn) {
    var li = btn.parentNode;
    function set(open) { li.classList.toggle("open", open); btn.setAttribute("aria-expanded", open); }
    btn.addEventListener("click", function (ev) { ev.stopPropagation(); set(!li.classList.contains("open")); });
    document.addEventListener("click", function (ev) { if (!li.contains(ev.target)) set(false); });
    li.addEventListener("keydown", function (ev) { if (ev.key === "Escape" && li.classList.contains("open")) { set(false); btn.focus(); } });
    // Mark the current page inside the dropdown (city pages, events, golf and its course pages, dog parks) and light up its button.
    var path = location.pathname.replace(/\.html$/, "").replace(/\/index$/, "/");
    li.querySelectorAll(".sub-menu a").forEach(function (a) {
      var u = new URL(a.href, location.href), p = u.pathname;
      // Links with a query (like directory?category=Happy hours) only match when the query matches too.
      if (u.search && u.search !== location.search) return;
      if (path === p || (p.slice(-1) === "/" && path.indexOf(p) === 0)) a.setAttribute("aria-current", "page");
    });
    if (li.querySelector('.sub-menu a[aria-current="page"]')) btn.classList.add("current");
  });

  // Forms: saved by the tracker (shows on the admin page) and emailed to Todd. If the tracker can't be reached, send straight to Formspree.
  // Contact form: fill in from links like contact?topic=Fix%20or%20update%20a%20listing&about=Name&city=Indio&page=business/x/
  document.querySelectorAll("form[data-prefill]").forEach(function (f) {
    var sp = new URLSearchParams(location.search);
    ["topic", "about", "city", "page"].forEach(function (k) {
      var el = f.elements[k], v = sp.get(k);
      if (!el || !v) return;
      if (el.tagName === "SELECT" && ![].some.call(el.options, function (o) { return o.value === v || o.text === v; })) return;
      el.value = v;
    });
  });
  document.querySelectorAll("form[data-ajax]").forEach(function (f) {
    f.addEventListener("submit", function (ev) {
      ev.preventDefault();
      var status = f.querySelector(".form-status"), btn = f.querySelector("button[type=submit]");
      var body = {}; new FormData(f).forEach(function (v, k) { if (typeof v === "string") body[k] = v; });
      function direct() { return fetch(f.action, { method: "POST", body: new FormData(f), headers: { Accept: "application/json" } }).then(function (r) { if (!r.ok) throw new Error(""); }); }
      btn.disabled = true; status.textContent = "Sending...";
      fetch(VAPI + "/submission", { method: "POST", body: JSON.stringify(body) })
        .then(function (r) {
          if (r.ok) return r.json().then(function (d) { mailTodd(d.notice); }, function () {});
          if (r.status === 400 || r.status === 429) return r.json().then(function (d) { throw new Error(d.error || ""); });
          return direct();
        }, direct)
        .then(function () { f.reset(); status.textContent = f.getAttribute("data-thanks") || "Got it. Thank you!"; })
        .catch(function (err) { status.textContent = err.message || "That did not go through. Please call or text (760) 422-5475."; })
        .finally(function () { btn.disabled = false; });
    });
  });

  // Formspree drops emails sent from the tracker's servers, so the browser sends the tracker's email notice.
  function mailTodd(n) { if (!n) return; var fd = new FormData(); Object.keys(n).forEach(function (k) { if (n[k] != null) fd.append(k, String(n[k])); }); fetch("https://formspree.io/f/myezyype", { method: "POST", headers: { Accept: "application/json" }, body: fd }).catch(function () {}); }

  // Email signups (footer) and the La Quinta / Indio route waitlist: saved by the tracker
  var SIGNUP_THANKS = { news: "You're on the list. Thanks, neighbor!", waitlist: "You're on the waitlist. We'll reach out before the first card for your city goes out." };
  document.querySelectorAll("form[data-signup]").forEach(function (f) {
    f.addEventListener("submit", function (ev) {
      ev.preventDefault();
      var kind = f.getAttribute("data-signup"), status = f.querySelector(".form-status"), btn = f.querySelector("button[type=submit]");
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.email.value.trim())) { status.textContent = "Please add a valid email."; f.email.focus(); return; }
      if (f.business && !f.business.value.trim()) { status.textContent = "Please add your business name."; f.business.focus(); return; }
      var body = { kind: kind, page: location.pathname };
      Array.prototype.forEach.call(f.elements, function (el) { if (el.name) body[el.name] = el.value; });
      btn.disabled = true; status.textContent = "Sending...";
      fetch(VAPI + "/signup", { method: "POST", body: JSON.stringify(body) })
        .then(function (r) { return r.json().then(function (d) { if (!r.ok) throw new Error(d.error || ""); mailTodd(d.notice); }); })
        .then(function () { f.reset(); status.textContent = SIGNUP_THANKS[kind]; })
        .catch(function (err) { status.textContent = err.message || "That did not go through. Please call or text (760) 422-5475."; })
        .finally(function () { btn.disabled = false; });
    });
  });
  // "Apple / Outlook" calendar links: build the .ics file on click.
  document.addEventListener("click", function (ev) {
    var a = ev.target.closest && ev.target.closest("[data-ics]"); if (!a) return;
    ev.preventDefault();
    var slug = a.getAttribute("data-ics"), e = events.filter(function (x) { return eventSlug(x) === slug; })[0];
    if (!e) return;
    var url = URL.createObjectURL(new Blob([icsText(e)], { type: "text/calendar;charset=utf-8" })), dl = document.createElement("a");
    dl.href = url; dl.download = slug.slice(0, 60) + ".ics"; document.body.appendChild(dl); dl.click();
    setTimeout(function () { URL.revokeObjectURL(url); dl.remove(); }, 1000);
  });
})();
