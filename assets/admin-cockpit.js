/* Admin: sales cockpit at the top of stats.html in admin mode.
   1) Each upcoming card's progress toward its sold minimum (live from the reservations Worker),
   2) "Do today": new submissions, claims, the booking deadline, offers and deals about to expire,
   3) "Who to pitch": free listings with recent traffic whose category is still open on a card, each with a
      ready Gmail draft (no price, per the cold rule) that carries their Spotlight Report link.
   Every email, call or text is logged to the tracker (GET /admin/pitches, POST /admin/pitch): status, follow-up date
   and a dated contact history per business. Due follow-ups show up in "Do today". */
(function () {
  var API = "https://cvs-tracker.toddstpierre.workers.dev", SPOTS = "https://local-spotlight-reservations.toddstpierre.workers.dev";
  var SITE = "https://coachellavalleyspotlight.com/", FROM = "todd@coachellavalleyspotlight.com";
  var admin = (new URLSearchParams(location.search).get("admin") || (function () { try { return sessionStorage.getItem("cvs_admin"); } catch (e) { return null; } })()); if (!admin || window.CVS_IS_REPORT) return;
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

  var STATUSES = ["New", "Contacted", "Waiting on reply", "Interested", "Spot Held", "Sold", "Not Interested", "Bad Contact Info", "Do Not Contact"];
  var CLOSED = ["Sold", "Not Interested", "Bad Contact Info", "Do Not Contact"];
  var CHANNELS = [["Email", "Emailed"], ["Call", "Called"], ["Text", "Texted"], ["Voicemail", "Left voicemail"], ["In person", "In person"], ["Note", "Note only"]];
  function addDays(n) { var d = new Date(today() + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }

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
    j(API + "/stats/all?key=" + encodeURIComponent(admin)),
    j(API + "/admin/pitches?key=" + encodeURIComponent(admin))
  ]).then(function (r) {
    dir = (window.CVS && window.CVS.directory) || dir;
    var spots = r[0], subs = r[1], owners = r[2], stats = r[3];
    var rec = {}; // slug -> {status, follow_up, log: [newest first]}
    var contacts = (r[4] && r[4].contacts) || {}; // slug -> {email, phone} from the leads list (2026-11-02)
    ((r[4] && r[4].pitches) || []).forEach(function (p) { rec[p.slug] = { status: p.status, follow_up: p.follow_up, log: [] }; });
    ((r[4] && r[4].log) || []).forEach(function (l) { (rec[l.slug] = rec[l.slug] || { status: "Contacted", follow_up: null, log: [] }).log.push(l); });
    var pitchErr = !r[4] || r[4].error;
    function isOpen(x) { return x && CLOSED.indexOf(x.status) < 0; }
    function isDue(x) { return isOpen(x) && x.follow_up && x.follow_up <= today(); }

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
    var info = {}; dir.forEach(function (b) { if (b.slug && !b.sample) info[b.slug] = b; });
    function lead(b) {
      var s = by[b.slug] || { key: "", last30: {} }, c = catFor(b), routes = c ? cards.filter(function (m) { return (open[m.route] || []).indexOf(c) > -1; }) : [];
      return { b: b, s: s, cat: c, routes: routes, pv: s.last30.profile || 0, seen: s.last30.impression || 0, acts: (s.last30.call || 0) + (s.last30.website || 0) };
    }
    var leads = dir.filter(function (b) { return b.slug && !b.sample && !b.public && !b.postcard && by[b.slug]; }).map(lead)
      .filter(function (x) { return (x.routes.length && (x.pv || x.seen >= 5)) || rec[x.b.slug]; });
    // Anyone with a pitch record stays on the list, even after their traffic drops or their category fills.
    Object.keys(rec).forEach(function (slug) { if (info[slug] && !leads.some(function (x) { return x.b.slug === slug; })) leads.push(lead(info[slug])); });
    leads.sort(function (a, z) { return (NEAR.indexOf(z.b.city) > -1) - (NEAR.indexOf(a.b.city) > -1) || (z.pv * 10 + z.acts * 20 + z.seen) - (a.pv * 10 + a.acts * 20 + a.seen); });

    var FILTERS = [
      ["new", "To pitch", function (x) { return !rec[x.b.slug] && x.routes.length; }],
      ["due", "Follow-ups due", function (x) { return isDue(rec[x.b.slug]); }],
      ["open", "In progress", function (x) { return isOpen(rec[x.b.slug]); }],
      ["closed", "Closed", function (x) { return rec[x.b.slug] && !isOpen(rec[x.b.slug]); }],
      ["all", "All", function () { return true; }]
    ];
    var st = { filter: "new", shown: 8, openRow: "", channel: "" };

    function draft(x) {
      var m = x.routes[0]; if (!m || !x.s.key) return null;
      var report = SITE + "stats?b=" + x.b.slug + "&key=" + x.s.key;
      var su = x.b.name + " was seen " + x.seen + " " + pl(x.seen, "time", "times") + " on Coachella Valley Spotlight";
      var body = "Hi there,\n\nTodd here, from Coachella Valley Spotlight, the local guide and directory for the valley. " + x.b.name + " has a free listing with us. In the last 30 days your listing showed up " + x.seen + " " + pl(x.seen, "time", "times") +
        (x.pv ? " and your page was opened " + x.pv + " " + pl(x.pv, "time", "times") : "") + ". Here's your report:\n" + report +
        "\n\nThose are neighbors looking for " + (x.b.service || "local businesses").toLowerCase() + " in the valley. If you'd like to be the name they already know before they search, the " + x.cat.replace(/\//g, " and ").toLowerCase() + " spot on our " + m.name + " postcard is still open. It goes to " + m.homes + " on " + niceLong(m.mail) + ", one business per category, and booking closes " + niceLong(m.deadline) + "." +
        "\n\nWant me to hold it for you? Just reply \"hold it.\"\n\nTodd\nCoachella Valley Spotlight\n(760) 422-5475\n\nIf you'd rather not hear from me, just say so and I won't email again.";
      var to = (contacts[x.b.slug] || {}).email || "";
      return { su: su, body: body, gmail: "https://mail.google.com/mail/?authuser=" + encodeURIComponent(FROM) + "&view=cm&fs=1" + (to ? "&to=" + encodeURIComponent(to) : "") + "&su=" + encodeURIComponent(su) + "&body=" + encodeURIComponent(body), report: report };
    }
    function when(iso) { return new Date(iso).toLocaleString("en-US", { timeZone: "America/Los_Angeles", month: "short", day: "numeric" }); }
    function chanLabel(c) { var f = CHANNELS.filter(function (k) { return k[0] === c; })[0]; return f ? f[1] : c; }
    function statusPill(r) {
      if (!r) return "";
      var cls = r.status === "Sold" || r.status === "Spot Held" ? "ck-pill-win" : r.status === "Interested" ? "ck-pill-hot" : CLOSED.indexOf(r.status) > -1 ? "ck-pill-lost" : "";
      var fu = isOpen(r) && r.follow_up ? (r.follow_up < today() ? '<span class="ck-due ck-late">Follow up ' + nice(r.follow_up) + ' (overdue)</span>' : r.follow_up === today() ? '<span class="ck-due ck-late">Follow up today</span>' : '<span class="ck-due">Follow up ' + nice(r.follow_up) + '</span>') : "";
      return '<span class="ck-pill ' + cls + '">' + esc(r.status) + '</span>' + fu;
    }
    function logForm(x) {
      var r = rec[x.b.slug] || {}, ch = st.channel;
      var def = r.status || (ch === "Email" || ch === "Voicemail" || ch === "Text" ? "Waiting on reply" : "Contacted");
      if (ch && r.status === "New") def = "Contacted";
      var fu = r.follow_up || (ch && ch !== "Note" ? addDays(3) : "");
      return '<form class="ck-log" data-log="' + esc(x.b.slug) + '">' +
        '<div class="ck-chan" role="radiogroup" aria-label="What did you do?">' + CHANNELS.map(function (c) { return '<button type="button" role="radio" aria-checked="' + (c[0] === ch) + '" class="chip' + (c[0] === ch ? " active" : "") + '" data-chan="' + c[0] + '">' + c[1] + '</button>'; }).join("") + '</div>' +
        '<div class="ck-log-row"><label>Status<select name="status">' + STATUSES.map(function (o) { return "<option" + (o === def ? " selected" : "") + ">" + o + "</option>"; }).join("") + '</select></label>' +
        '<label>Follow up on<input type="date" name="follow_up" value="' + esc(fu) + '"></label>' +
        '<div class="ck-quick"><button type="button" data-fu="1">Tomorrow</button><button type="button" data-fu="3">+3 days</button><button type="button" data-fu="7">+1 week</button><button type="button" data-fu="0">None</button></div></div>' +
        '<label class="ck-note">Notes<textarea name="note" rows="2" placeholder="Who you talked to, what they said, what&rsquo;s next"></textarea></label>' +
        '<div class="ck-log-actions"><button class="btn" type="submit">Save</button><button class="btn btn-ghost" type="button" data-close>Cancel</button><span class="ck-msg" role="status"></span></div>' +
        (r.log && r.log.length ? '<ol class="ck-hist">' + r.log.map(function (l) { return '<li><b>' + esc(chanLabel(l.channel)) + '</b> ' + when(l.created_at) + (l.status ? ' &middot; ' + esc(l.status) : "") + (l.note ? '<br>' + esc(l.note) : "") + ' <button type="button" class="ck-del" data-del="' + l.id + '" aria-label="Delete this entry">&times;</button></li>'; }).join("") + '</ol>' : "") +
        '</form>';
    }
    function leadRow(x) {
      var d = draft(x), r = rec[x.b.slug], last = r && r.log[0];
      return '<div class="ck-lead" data-row="' + esc(x.b.slug) + '"><div class="ck-lead-main"><b>' + esc(x.b.name) + '</b><span class="ck-sub">' + esc(x.b.service || x.b.category) + " &middot; " + esc(x.b.city || "") + (x.b.claimed ? " &middot; claimed" : "") + (x.b.premium ? " &middot; Premium" : "") + (x.b.postcard ? " &middot; on the postcard" : "") + '</span>' +
        '<span class="ck-nums"><b>' + x.pv + '</b> profile ' + pl(x.pv, "visit", "visits") + ' &middot; <b>' + x.seen + '</b> seen' + (x.acts ? ' &middot; <b>' + x.acts + '</b> reached out' : "") + ' <em>(30 days)</em></span>' +
        '<span class="ck-sub">' + (x.routes.length ? esc(x.cat) + ' open on ' + x.routes.map(function (m) { return esc(m.name); }).join(" and ") : x.cat ? esc(x.cat) + ' is taken on the cards' : 'No card category') + '</span>' +
        (r ? '<span class="ck-status">' + statusPill(r) + '</span>' : "") +
        (last ? '<span class="ck-last">Last: ' + esc(chanLabel(last.channel)) + ' ' + when(last.created_at) + (last.note ? ': ' + esc(last.note.length > 90 ? last.note.slice(0, 90) + "…" : last.note) : "") + '</span>' : "") + '</div>' +
        '<div class="ck-lead-cta">' + (d ? '<a class="btn' + (r ? " btn-ghost" : "") + '" href="' + esc(d.gmail) + '" target="_blank" rel="noopener" data-pitch="' + esc(x.b.slug) + '">Email in Gmail</a>' : "") +
        (x.b.phone ? '<a class="btn btn-ghost" href="tel:' + esc(x.b.phone.replace(/[^\d+]/g, "")) + '" data-tel="' + esc(x.b.slug) + '">' + esc(x.b.phone) + '</a>' : "") +
        '<button type="button" class="btn btn-ghost" data-open="' + esc(x.b.slug) + '">' + (r ? "Update" : "Log contact") + '</button>' +
        '<span class="ck-links">' + (d ? '<a href="#" data-copy-pitch="' + esc(x.b.slug) + '">Copy email</a> &middot; ' : "") + (x.s.key ? '<a href="' + esc(SITE + "stats?b=" + x.b.slug + "&key=" + x.s.key) + '" target="_blank" rel="noopener">Their report</a>' : "") + '</span></div>' +
        (st.openRow === x.b.slug ? logForm(x) : "") + '</div>';
    }
    function list() {
      var f = FILTERS.filter(function (k) { return k[0] === st.filter; })[0][2], out = leads.filter(f);
      if (st.filter !== "new") out.sort(function (a, z) { var fa = (rec[a.b.slug] || {}).follow_up || "9999", fz = (rec[z.b.slug] || {}).follow_up || "9999"; return fa < fz ? -1 : fa > fz ? 1 : 0; });
      return out;
    }
    function drawLeads() {
      var l = list(), dt = document.getElementById("ck-due-todo");
      if (dt) { dt.innerHTML = dueTodo(); dt.parentNode.hidden = !dt.innerHTML; var none = box.querySelector(".ck-none"); if (none) none.hidden = !!box.querySelector(".ck-todo li:not([hidden])"); }
      document.getElementById("ck-chips").innerHTML = FILTERS.map(function (k) { return '<button type="button" class="chip' + (st.filter === k[0] ? " active" : "") + '" data-filter="' + k[0] + '">' + k[1] + " (" + leads.filter(k[2]).length + ")</button>"; }).join("");
      document.getElementById("ck-leads").innerHTML = (l.slice(0, st.shown).map(leadRow).join("") || '<p class="ck-sub" style="padding:14px 0">' + (st.filter === "due" ? "No follow-ups due. Nice." : "Nothing here.") + '</p>') +
        (l.length > st.shown ? '<p><button type="button" class="btn btn-ghost" data-more>Show ' + Math.min(8, l.length - st.shown) + ' more (' + (l.length - st.shown) + ' left)</button></p>' : "");
    }
    function openLog(slug, channel) { st.openRow = slug; st.channel = channel || ""; drawLeads(); var f = box.querySelector('[data-log="' + slug + '"]'); if (f) { f.scrollIntoView({ block: "nearest" }); } }

    function dueTodo() {
      var due = leads.filter(function (x) { return isDue(rec[x.b.slug]); });
      return due.length ? '<a href="#cockpit-admin" data-filter="due"><b>' + due.length + '</b> follow-' + pl(due.length, "up", "ups") + ' due: ' + due.slice(0, 4).map(function (x) { return esc(x.b.name); }).join(", ") + (due.length > 4 ? " and " + (due.length - 4) + " more" : "") + '</a>' : "";
    }
    todo.unshift('<span id="ck-due-todo"></span>');

    box.innerHTML = '<h2 class="month-head"><span class="stripe-mini"></span>Sales cockpit</h2>' +
      (cards.length ? '<div class="ck-cards">' + cardHtml + '</div>' : '<div class="empty">No upcoming cards. Add the next dates under Mailing dates.</div>') +
      '<div class="ck-grid"><div class="ck-panel"><h3>Do today</h3>' + '<ul class="ck-todo">' + todo.map(function (t) { return "<li>" + t + "</li>"; }).join("") + '</ul><p class="ck-sub ck-none">Nothing waiting. Go pitch.</p>'  + '</div>' +
      '<div class="ck-panel ck-pitch" id="ck-pitch"><h3>Who to pitch</h3>' +
      '<p class="ck-sub">Free listings with traffic in a category still open on a card. Businesses near the routes come first. The email has no price (cold rule) and links their own Spotlight Report. Log every email, call or text with <b>Log contact</b>: status, follow-up date and notes are saved for good.' + (pitchErr ? ' <strong style="color:var(--sun-deep)">The contact log could not load, so saving won&rsquo;t work until it does.</strong>' : "") + '</p>' +
      '<div class="chips ck-chips" id="ck-chips"></div><div id="ck-leads"></div></div></div>';
    drawLeads();

    box.addEventListener("click", function (e) {
      var t = e.target;
      var fl = t.closest("[data-filter]"); if (fl) { e.preventDefault(); st.filter = fl.dataset.filter; st.shown = 8; st.openRow = ""; drawLeads(); if (fl.closest(".ck-todo")) document.getElementById("ck-pitch").scrollIntoView({ behavior: "smooth" }); return; }
      var p = t.closest("[data-pitch]"); if (p) { var slug = p.dataset.pitch; setTimeout(function () { openLog(slug, "Email"); }, 300); return; }
      var tel = t.closest("[data-tel]"); if (tel) { var ts = tel.dataset.tel; setTimeout(function () { openLog(ts, "Call"); }, 300); return; }
      var c = t.closest("[data-copy-pitch]");
      if (c) {
        e.preventDefault();
        var x = leads.filter(function (l) { return l.b.slug === c.dataset.copyPitch; })[0], d = draft(x);
        navigator.clipboard.writeText("Subject: " + d.su + "\n\n" + d.body); openLog(x.b.slug, "Email");
        return;
      }
      var o = t.closest("[data-open]"); if (o) { if (st.openRow === o.dataset.open) { st.openRow = ""; drawLeads(); } else openLog(o.dataset.open, ""); return; }
      if (t.closest("[data-close]")) { st.openRow = ""; drawLeads(); return; }
      var ch = t.closest("[data-chan]");
      if (ch) {
        var form = ch.closest("form");
        [].forEach.call(form.querySelectorAll("[data-chan]"), function (b) { var on = b === ch; b.classList.toggle("active", on); b.setAttribute("aria-checked", on); });
        st.channel = ch.dataset.chan; return;
      }
      var q = t.closest("[data-fu]"); if (q) { var n = +q.dataset.fu; q.closest("form").follow_up.value = n ? addDays(n) : ""; return; }
      var del = t.closest("[data-del]");
      if (del && confirm("Delete this log entry?")) {
        var fs = del.closest("form").dataset.log;
        fetch(API + "/admin/pitch/log/delete", { method: "POST", body: JSON.stringify({ key: admin, id: +del.dataset.del }) }).then(function (res) { if (!res.ok) throw 0;
          rec[fs].log = rec[fs].log.filter(function (l) { return l.id !== +del.dataset.del; }); openLog(fs, st.channel);
        }).catch(function () { alert("Could not delete. Try again."); });
        return;
      }
      if (t.closest("[data-more]")) { st.shown += 8; drawLeads(); }
    });
    box.addEventListener("submit", function (e) {
      var f = e.target.closest("[data-log]"); if (!f) return;
      e.preventDefault();
      var slug = f.dataset.log, btn = f.querySelector("[type=submit]"), msg = f.querySelector(".ck-msg");
      var lb = info[slug] || {};
      // name, category, phone and url start a new lead when this listing isn't on the leads list yet
      var body = { key: admin, b: slug, status: f.status.value, follow_up: f.follow_up.value, channel: st.channel, note: f.note.value.trim(), name: lb.name, category: lb.service || lb.category, phone: lb.phone, url: lb.url };
      btn.disabled = true; msg.textContent = "Saving…";
      fetch(API + "/admin/pitch", { method: "POST", body: JSON.stringify(body) }).then(function (res) { return res.json().then(function (d) { if (!res.ok) throw new Error(d.error || "Failed"); return d; }); }).then(function (d) {
        var r = rec[slug] = rec[slug] || { log: [] };
        r.status = d.pitch.status; r.follow_up = d.pitch.follow_up;
        r.log.unshift({ id: Date.now(), slug: slug, channel: body.channel, note: body.note, status: body.status, created_at: d.pitch.updated_at });
        st.openRow = ""; drawLeads();
        // the new log line has a temporary id; reload ids so delete works on it
        j(API + "/admin/pitches?key=" + encodeURIComponent(admin)).then(function (p) { if (p && p.log) rec[slug].log = p.log.filter(function (l) { return l.slug === slug; }); });
      }).catch(function (err) { btn.disabled = false; msg.textContent = "Not saved: " + err.message; });
    });
  });
})();
