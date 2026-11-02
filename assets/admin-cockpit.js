/* Admin: sales cockpit at the top of stats.html in admin mode.
   1) Each upcoming card's progress toward its sold minimum (live from the reservations Worker),
   2) "Do today": new submissions, claims, the booking deadline, offers and deals about to expire,
   3) "Who to pitch": free listings with recent traffic whose category is still open on a card, each with a
      ready Gmail draft (no price, per the cold rule) that carries their Spotlight Report link.
   "Pitched" marks are kept in this browser only (localStorage). Log real outreach in the Leads sheet. */
(function () {
  var API = "https://cvs-tracker.toddstpierre.workers.dev", SPOTS = "https://local-spotlight-reservations.toddstpierre.workers.dev";
  var SITE = "https://coachellavalleyspotlight.com/", FROM = "todd@coachellavalleyspotlight.com";
  var admin = (new URLSearchParams(location.search).get("admin") || (function () { try { return sessionStorage.getItem("cvs_admin"); } catch (e) { return null; } })()); if (!admin) return;
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function pl(x, one, many) { return x === 1 ? one : many; }
  function today() { return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Los_Angeles" }).format(new Date()); }
  function days(ymd) { return Math.round((new Date(ymd + "T12:00:00Z") - new Date(today() + "T12:00:00Z")) / 86400000); }
  function nice(ymd) { return new Date(ymd + "T12:00:00Z").toLocaleString("en-US", { month: "short", day: "numeric", timeZone: "UTC" }); }
  function niceLong(ymd) { return new Date(ymd + "T12:00:00Z").toLocaleString("en-US", { month: "long", day: "numeric", timeZone: "UTC" }); }

  // Directory service -> postcard picker category. Services not listed here have no category on the card yet.
  var CAT = {
    "Plumbing": "Plumbing", "Heating and air conditioning": "HVAC", "Electrical": "Electrical", "Pest control": "Pest Control",
    "Painting": "Painting", "Garage doors": "Garage Doors", "Handyman": "Handyman Services", "Blinds and shutters": "Window Coverings",
    "Pool service": "Pool Service", "Pool builders": "Pool Service", "Landscaping": "Landscaping", "Tree care": "Landscaping",
    "Carpet cleaning": "House Cleaning", "Window cleaning": "House Cleaning", "Flooring": "Remodeling", "Roofing": "Roofing", "Insulation": "Insulation",
    "Golf cars": "Golf Cart Sales & Service", "Golf shops": "Golf Shop & Club Fitting", "Auto repair": "Auto Repair",
    "Dentists": "Dental", "Orthodontists": "Dental", "Chiropractors": "Chiropractic", "Med spas": "Med Spa", "Dermatology": "Med Spa",
    "Nail salons": "Salon/Spa", "Hair salons and barbers": "Salon/Spa", "Massage and day spas": "Salon/Spa",
    "Gyms": "Fitness/Gym", "CrossFit gyms": "Fitness/Gym", "Personal training": "Fitness/Gym", "Boxing and martial arts": "Fitness/Gym", "Yoga and pilates": "Fitness/Gym",
    "Veterinarians": "Veterinary/Pet Care", "Pet stores": "Veterinary/Pet Care", "Pet sitting": "Veterinary/Pet Care",
    "Bakeries": "Bakery & Desserts", "Candy and sweets": "Bakery & Desserts", "Art classes": "Arts & Classes",
    "Gift shops": "Boutique/Retail", "Plant nurseries": "Boutique/Retail", "Custom printing": "Boutique/Retail",
    "Real estate and mortgage": "Real Estate Agent", "Estate planning": "Estate Attorney", "Hearing aids": "Hearing Aids", "Jewelers": "Jewelers"
  };
  // Both routes are in Palm Desert, so businesses from these towns are ranked first.
  var NEAR = ["Palm Desert", "Indian Wells", "Rancho Mirage", "La Quinta", "Bermuda Dunes", "Thousand Palms", "Cathedral City"];
  function catFor(b) { return CAT[b.service] || (b.category === "Restaurants" && b.service !== "Bakeries" ? "Restaurant" : ""); }

  var pitched = {}; try { pitched = JSON.parse(localStorage.getItem("cvs_pitched") || "{}"); } catch (e) {}
  function markPitched(slug) { pitched[slug] = today(); try { localStorage.setItem("cvs_pitched", JSON.stringify(pitched)); } catch (e) {} }

  var box = document.createElement("div"); box.id = "cockpit-admin"; box.className = "ck";
  var anchor = document.getElementById("admin-tools") || document.getElementById("st-out");
  if (anchor.id === "admin-tools") anchor.after(box); else anchor.before(box);
  box.innerHTML = '<div class="empty">Loading the sales cockpit&hellip;</div>';

  var cards = (window.CVS_MAILINGS || []).filter(function (m) { return days(m.mail) >= 0; });
  var dir = (window.CVS && window.CVS.directory) || [];

  function j(url) { return fetch(url).then(function (r) { return r.json(); }).catch(function () { return null; }); }
  Promise.all([
    Promise.all(cards.map(function (m) { return j(SPOTS + "/api/spots?route=" + m.route); })),
    j(API + "/admin/submissions?key=" + encodeURIComponent(admin)),
    j(API + "/admin/owners?key=" + encodeURIComponent(admin)),
    j(API + "/stats/all?key=" + encodeURIComponent(admin))
  ]).then(function (r) {
    dir = (window.CVS && window.CVS.directory) || dir;
    var spots = r[0], subs = r[1], owners = r[2], stats = r[3];

    // 1) Card progress
    var open = {}; // route -> list of open categories
    var cardHtml = cards.map(function (m, i) {
      var d = spots[i]; if (!d || !d.positions) return '<div class="ck-card"><b>' + esc(m.name) + '</b><p>Could not load spots.</p></div>';
      var st = function (p) { return (p.status || "").toLowerCase(); };
      var sold = d.positions.filter(function (p) { return st(p) === "sold"; }).length, pend = d.positions.filter(function (p) { return st(p) === "pending"; }).length;
      var need = Math.max(0, (m.minSold || 0) - sold), total = d.positions.length, left = days(m.deadline);
      var taken = d.positions.filter(function (p) { return p.category && st(p) !== "open"; }).map(function (p) { return p.category; });
      open[m.route] = (d.categories || []).filter(function (c) { return taken.indexOf(c) < 0; });
      var mark = m.minSold ? '<i class="ck-min" style="left:' + (m.minSold / total * 100) + '%" title="Needed to mail"></i>' : "";
      return '<div class="ck-card' + (need ? "" : " ck-ok") + '"><div class="ck-card-top"><b>' + esc(m.name) + '</b><span>' + (left < 0 ? "Booking closed" : left === 0 ? "Last day to book" : left + " " + pl(left, "day", "days") + " to book") + '</span></div>' +
        '<div class="ck-meter" role="img" aria-label="' + sold + ' sold, ' + pend + ' pending, ' + total + ' spots"><i class="ck-sold" style="width:' + (sold / total * 100) + '%"></i><i class="ck-pend" style="width:' + (pend / total * 100) + '%"></i>' + mark + '</div>' +
        '<p class="ck-line"><b>' + sold + '</b> sold &middot; <b>' + pend + '</b> pending &middot; ' + (total - sold - pend) + ' open of ' + total + '</p>' +
        '<p class="ck-need">' + (need ? "Needs <b>" + need + " more sold</b> to mail on " + nice(m.mail) + (pend ? " (" + pend + " pending would get it to " + (sold + pend) + ")" : "") : "&#10003; Minimum met. Mails " + nice(m.mail)) + '</p>' +
        '<details class="ck-open"><summary>' + open[m.route].length + ' categories still open</summary><p>' + open[m.route].map(esc).join(" &middot; ") + '</p></details></div>';
    }).join("");

    // 2) Do today
    var todo = [];
    var newSubs = subs && subs.submissions ? subs.submissions.filter(function (s) { return !s.done; }).length : 0;
    var claims = owners && owners.claims ? owners.claims.length : 0;
    if (claims) todo.push('<a href="#owners-admin"><b>' + claims + '</b> claim ' + pl(claims, "request", "requests") + ' to approve (call first)</a>');
    if (newSubs) todo.push('<a href="#submissions-admin"><b>' + newSubs + '</b> new form ' + pl(newSubs, "submission", "submissions") + '</a>');
    cards.forEach(function (m) { var l = days(m.deadline); if (l >= 0 && l <= 7) todo.push("<span><b>" + esc(m.name) + "</b> booking closes " + (l ? "in " + l + " " + pl(l, "day", "days") : "today") + "</span>"); });
    dir.forEach(function (b) {
      if (b.offer && b.offer.expires) { var l = days(b.offer.expires); if (l >= 0 && l <= 14) todo.push('<span><b>' + esc(b.name) + '</b> offer ends ' + nice(b.offer.expires) + ' (' + l + ' ' + pl(l, "day", "days") + '). Ask for a new one.</span>'); }
    });
    ((window.CVS && window.CVS.deals) || []).forEach(function (d) {
      if (d.expires && !d.sample) { var l = days(d.expires); if (l >= 0 && l <= 7) todo.push('<span>Deal <b>' + esc(d.offer) + '</b> (' + esc(d.business) + ') ends ' + nice(d.expires) + '</span>'); }
    });

    // 3) Who to pitch
    var by = {}; (stats && stats.businesses || []).forEach(function (s) { by[s.slug] = s; });
    var leads = dir.filter(function (b) { return b.slug && !b.sample && !b.public && !b.postcard && by[b.slug]; }).map(function (b) {
      var s = by[b.slug], c = catFor(b), routes = c ? cards.filter(function (m) { return (open[m.route] || []).indexOf(c) > -1; }) : [];
      return { b: b, s: s, cat: c, routes: routes, pv: s.last30.profile || 0, seen: s.last30.impression || 0, acts: (s.last30.call || 0) + (s.last30.website || 0) };
    }).filter(function (x) { return x.routes.length && (x.pv || x.seen >= 5); })
      .sort(function (a, z) { return (NEAR.indexOf(z.b.city) > -1) - (NEAR.indexOf(a.b.city) > -1) || (z.pv * 10 + z.acts * 20 + z.seen) - (a.pv * 10 + a.acts * 20 + a.seen); });

    function draft(x) {
      var m = x.routes[0], report = SITE + "stats?b=" + x.b.slug + "&key=" + x.s.key;
      var su = x.b.name + " was seen " + x.seen + " " + pl(x.seen, "time", "times") + " on Coachella Valley Spotlight";
      var body = "Hi there,\n\nTodd here, from Coachella Valley Spotlight, the local guide and directory for the valley. " + x.b.name + " has a free listing with us. In the last 30 days your listing showed up " + x.seen + " " + pl(x.seen, "time", "times") +
        (x.pv ? " and your page was opened " + x.pv + " " + pl(x.pv, "time", "times") : "") + ". Here's your report:\n" + report +
        "\n\nThose are neighbors looking for " + (x.b.service || "local businesses").toLowerCase() + " in the valley. If you'd like to be the name they already know before they search, the " + x.cat.replace(/\//g, " and ").toLowerCase() + " spot on our " + m.name + " postcard is still open. It goes to " + m.homes + " on " + niceLong(m.mail) + ", one business per category, and booking closes " + niceLong(m.deadline) + "." +
        "\n\nWant me to hold it for you? Just reply \"hold it.\"\n\nTodd\nCoachella Valley Spotlight\n(760) 422-5475\n\nIf you'd rather not hear from me, just say so and I won't email again.";
      return { su: su, body: body, gmail: "https://mail.google.com/mail/?authuser=" + encodeURIComponent(FROM) + "&view=cm&fs=1&su=" + encodeURIComponent(su) + "&body=" + encodeURIComponent(body), report: report };
    }
    var shown = 8;
    function leadRows() {
      return leads.slice(0, shown).map(function (x) {
        var d = draft(x), done = pitched[x.b.slug];
        return '<div class="ck-lead' + (done ? " ck-done" : "") + '"><div class="ck-lead-main"><b>' + esc(x.b.name) + '</b><span class="ck-sub">' + esc(x.b.service || x.b.category) + " &middot; " + esc(x.b.city || "") + (x.b.claimed ? " &middot; claimed" : "") + (x.b.premium ? " &middot; Premium" : "") + '</span>' +
          '<span class="ck-nums"><b>' + x.pv + '</b> profile ' + pl(x.pv, "visit", "visits") + ' &middot; <b>' + x.seen + '</b> seen' + (x.acts ? ' &middot; <b>' + x.acts + '</b> reached out' : "") + ' <em>(30 days)</em></span>' +
          '<span class="ck-sub">' + esc(x.cat) + ' open on ' + x.routes.map(function (m) { return esc(m.name); }).join(" and ") + (done ? ' &middot; <strong>pitched ' + nice(done) + '</strong>' : "") + '</span></div>' +
          '<div class="ck-lead-cta"><a class="btn" href="' + esc(d.gmail) + '" target="_blank" rel="noopener" data-pitch="' + esc(x.b.slug) + '">Email in Gmail</a>' +
          (x.b.phone ? '<a class="btn btn-ghost" href="tel:' + esc(x.b.phone.replace(/[^\d+]/g, "")) + '">' + esc(x.b.phone) + '</a>' : "") +
          '<a href="#" data-copy-pitch="' + esc(x.b.slug) + '">Copy email</a> &middot; <a href="' + esc(d.report) + '" target="_blank" rel="noopener">Their report</a></div></div>';
      }).join("") + (leads.length > shown ? '<p><button type="button" class="btn btn-ghost" data-more>Show ' + Math.min(8, leads.length - shown) + ' more (' + (leads.length - shown) + ' left)</button></p>' : "");
    }

    box.innerHTML = '<h2 class="month-head"><span class="stripe-mini"></span>Sales cockpit</h2>' +
      (cards.length ? '<div class="ck-cards">' + cardHtml + '</div>' : '<div class="empty">No upcoming cards. Add the next dates under Mailing dates.</div>') +
      '<div class="ck-grid"><div class="ck-panel"><h3>Do today</h3>' + (todo.length ? '<ul class="ck-todo">' + todo.map(function (t) { return "<li>" + t + "</li>"; }).join("") + '</ul>' : '<p class="ck-sub">Nothing waiting. Go pitch.</p>') + '</div>' +
      '<div class="ck-panel ck-pitch"><h3>Who to pitch <span class="ck-sub">' + leads.length + ' free ' + pl(leads.length, "listing", "listings") + ' with traffic in an open category</span></h3>' +
      '<p class="ck-sub">Businesses near the routes (Palm Desert and the towns next to it) come first, then ranked by the last 30 days. The email has no price (cold rule) and links their own Spotlight Report. Check the Leads sheet before sending, and log it there after.</p>' +
      '<div id="ck-leads">' + (leadRows() || '<p class="ck-sub">No matches right now.</p>') + '</div></div></div>';

    box.addEventListener("click", function (e) {
      var p = e.target.closest("[data-pitch]"); if (p) { markPitched(p.dataset.pitch); setTimeout(function () { document.getElementById("ck-leads").innerHTML = leadRows(); }, 300); return; }
      var c = e.target.closest("[data-copy-pitch]");
      if (c) {
        e.preventDefault();
        var x = leads.filter(function (l) { return l.b.slug === c.dataset.copyPitch; })[0], d = draft(x);
        navigator.clipboard.writeText("Subject: " + d.su + "\n\n" + d.body); markPitched(x.b.slug); c.textContent = "Copied";
        return;
      }
      if (e.target.closest("[data-more]")) { shown += 8; document.getElementById("ck-leads").innerHTML = leadRows(); }
    });
  });
})();
