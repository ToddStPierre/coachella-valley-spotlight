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
  function eventSlug(e) { return (String(e.title).toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").replace(/^(.{80}[^-]*).*$/, "$1")) + "-" + e.date; }
  function slugOf(b) { return b.slug || String(b.name).toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }
  function outbound(u) { try { var x = new URL(u); x.searchParams.set("utm_source", "coachellavalleyspotlight"); x.searchParams.set("utm_medium", "directory"); return x.toString(); } catch (e) { return u; } }
  function liveOffer(o) { if (!o || !o.title) return null; var d = parse(o.expires); return !d || d >= today ? o : null; }
  // One photo per city for home page headline cards (assets/img/cities/, credits on legal.html#photos)
  var CITY_PHOTOS = ["palm-springs", "desert-hot-springs", "cathedral-city", "rancho-mirage", "palm-desert", "indian-wells", "la-quinta", "indio", "coachella", "thousand-palms", "thermal", "mecca"];
  function cityPhoto(city) { var s = String(city || "").toLowerCase().replace(/[^a-z]+/g, "-"); return CITY_PHOTOS.indexOf(s) > -1 ? s : "valley-wide"; }
  function link(url, label) {
    if (!url) return "";
    var outside = /^https?:/i.test(url);
    return '<a class="card-link" href="' + esc(outside ? url : ROOT + url) + '"' + (outside ? ' target="_blank" rel="noopener"' : '') + '>' + label + ' &rarr;</a>';
  }

  var events = (D.events || []).concat(D.feedEvents || []).filter(function (e) { var d = parse(e.endDate || e.date); return d && d >= today; })
    .sort(function (a, b) { return parse(a.date) - parse(b.date); });
  var deals = (D.deals || []).filter(function (x) { var d = parse(x.expires); return !d || d >= today; });
  var news = (D.news || []).concat(D.headlines || []).sort(function (a, b) { return parse(b.date) - parse(a.date); });
  var directory = (D.directory || []).slice().sort(function (a, b) { return ((b.premium || b.featured) ? 1 : 0) - ((a.premium || a.featured) ? 1 : 0) || (a.sample ? 1 : 0) - (b.sample ? 1 : 0) || a.name.localeCompare(b.name); });

  var R = {
    event: function (e) {
      var d = parse(e.date);
      return '<article class="card event">' + sample(e) +
        '<div class="date-tile"><span>' + MONTHS[d.getMonth()] + '</span><b>' + d.getDate() + '</b><span>' + (e.endDate ? 'to ' + parse(e.endDate).getDate() : ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d.getDay()]) + '</span></div>' +
        '<div style="display:grid;gap:6px"><span class="meta">' + esc(e.city) + (e.time ? ' &middot; ' + esc(e.time) : '') + '</span>' +
        // Pulled events (feed: true) have no page here; they link to the source's own page.
        '<h3><a href="' + (e.feed ? esc(e.url) + '" target="_blank" rel="noopener' : ROOT + 'event/' + eventSlug(e) + '/') + '" style="color:inherit;text-decoration:none">' + esc(e.title) + '</a></h3><p>' + esc(e.venue) + (e.price ? ' &middot; ' + esc(e.price) : '') + '</p>' +
        (e.description ? '<p>' + esc(e.description) + '</p>' : '') +
        (e.category ? '<span class="tag">' + esc(e.category) + '</span>' : '') +
        (e.feed ? '<a class="card-link" href="' + esc(e.url) + '" target="_blank" rel="noopener">Details at ' + esc(e.source) + ' &rarr;</a>' : '<a class="card-link" href="' + ROOT + 'event/' + eventSlug(e) + '/">Event details &rarr;</a>') + '</div></article>';
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
      return '<article class="card' + (prem ? ' featured' : '') + '"' + (slug ? ' data-biz="' + slug + '"' : '') + '>' + sample(b) + '<span class="meta">' + esc(b.service || b.category) + ' &middot; ' + esc(b.city) + '</span>' +
        '<h3>' + name + '</h3><p>' + esc(b.blurb) + '</p>' + (b.happyHour ? '<p class="hh"><b>Happy hour:</b> ' + esc(b.happyHour) + '</p>' : '') +
        (b.postcard ? '<span class="tag">On the Spotlight postcard</span>' : prem ? '<span class="tag">Premium listing</span>' : '') +
        (off ? '<div class="offer-box"><b>' + esc(off.title) + '</b>' + (off.details ? '<span>' + esc(off.details) + '</span>' : '') + '</div>' : '') +
        (slug ? '<a class="card-link" href="' + ROOT + 'business/' + slug + '/">View profile &rarr;</a>' : '') + '</article>';
    }
  };

  /* PRERENDER-END: tools/build-seo.js runs everything above this line at build time to put the same cards in the HTML. */
  var SETS = { events: events, deals: deals, news: news, directory: directory };
  var TYPE = { events: "event", deals: "deal", news: "news", directory: "directory" };

  function text(item) { return Object.keys(item).map(function (k) { return typeof item[k] === "string" ? item[k] : ""; }).join(" ").toLowerCase(); }

  // Small blocks: <div data-list="events" data-limit="4"></div>
  document.querySelectorAll("[data-list]").forEach(function (el) {
    var key = el.getAttribute("data-list"), limit = +el.getAttribute("data-limit") || 999;
    var per = el.getAttribute("data-per"), seen = {};
    // data-per="city": only the newest item from each city (the lists are already newest first)
    var items = SETS[key].filter(function (x) { if (!per) return true; var v = x[per] || ""; if (seen[v]) return false; seen[v] = 1; return true; }).slice(0, limit);
    var opt = { img: el.hasAttribute("data-img") };
    el.innerHTML = items.length ? items.map(function (x) { return R[TYPE[key]](x, opt); }).join("") : '<div class="empty">Nothing here yet. Check back soon.</div>';
  });

  // Full list pages with filters: <div data-browse="events"></div>
  var browse = document.querySelector("[data-browse]");
  if (browse) {
    var key = browse.getAttribute("data-browse"), all = SETS[key];
    var q = document.getElementById("f-q"), city = document.getElementById("f-city"), cat = document.getElementById("f-cat");
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
    function draw() {
      var term = q ? q.value.trim().toLowerCase() : "";
      var items = all.filter(function (x) {
        return (!term || text(x).indexOf(term) > -1) && (!city || !city.value || x.city === city.value) && (!cat || !cat.value || x.category === cat.value || (cat.value === "Happy hours" && x.happyHour));
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
          names.map(function (c) { return head(anchor(c), c, groups[c].length) + '<div class="grid">' + groups[c].map(R.directory).join("") + '</div>'; }).join("");
      } else {
        browse.innerHTML = '<div class="' + (key === "news" ? "grid-2" : "grid") + '">' + items.map(R[TYPE[key]]).join("") + "</div>";
      }
    }
    [q, city, cat].forEach(function (el) { if (el) el.addEventListener("input", draw); });
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

  // Forms: saved by the tracker (shows on the admin page) and emailed to Todd. If the tracker can't be reached, send straight to Formspree.
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
  var SIGNUP_THANKS = { news: "You're on the list. Thanks, neighbor!", waitlist: "You're on the waitlist. We'll reach out before the first La Quinta or Indio card goes out." };
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
})();
