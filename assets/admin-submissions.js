/* Admin: every form submission (business listings, stories, ad holds), saved by the tracker. Shown on stats.html?admin=KEY
   "Publish" turns a submission into a live listing, event or deal: the tracker adds it to data/directory.js, events.js
   or deals.js on GitHub (POST /admin/submissions/publish), marks the submission done, and the site rebuilds in about a minute. */
(function () {
  var API = "https://cvs-tracker.toddstpierre.workers.dev";
  var admin = (new URLSearchParams(location.search).get("admin") || (function () { try { return sessionStorage.getItem("cvs_admin"); } catch (e) { return null; } })()); if (!admin || window.CVS_IS_REPORT) return;
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  var LABEL = { submit: "Listing / event / deal", story: "Story idea", advertise: "Ad inquiry", contact: "Contact / suggestion" };
  var SKIP = ["source"];
  var box = document.createElement("div"); box.id = "submissions-admin"; box.style.marginBottom = "40px";
  document.getElementById("st-out").before(box);
  function row(s) {
    var d = s.data, when = new Date(s.created_at).toLocaleString("en-US", { timeZone: "America/Los_Angeles", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
    var title = d.business || d.title || (d.topic && d.about ? d.topic + ": " + d.about : d.topic) || d.name || "(no name)";
    var fields = Object.keys(d).filter(function (k) { return SKIP.indexOf(k) < 0 && d[k]; }).map(function (k) {
      return "<dt>" + esc(k.replace(/_/g, " ")) + "</dt><dd>" + (k === "email" ? '<a href="mailto:' + esc(d[k]) + '">' + esc(d[k]) + "</a>" : esc(d[k])) + "</dd>";
    }).join("");
    return '<div class="card" style="margin-bottom:12px;' + (s.done ? "opacity:.55" : "") + '"><span class="meta">' + esc(LABEL[s.form] || s.form) + " &middot; " + esc(when) + (s.done ? " &middot; DONE" : "") + "</span>" +
      "<h3>" + esc(title) + "</h3><details><summary style=\"cursor:pointer;font-weight:600\">All details</summary><dl class=\"facts\" style=\"margin-top:10px\">" + fields + "</dl></details>" +
      (d.published ? '<p class="pub-done">&#10003; Published as ' + esc(d.published) + '</p>' : "") +
      '<p style="margin:8px 0 0;display:flex;gap:8px;flex-wrap:wrap">' + (s.form === "submit" && !d.published ? '<button class="btn" data-pub="' + s.id + '">Publish&hellip;</button>' : "") +
      '<button class="btn btn-ghost" data-done="' + s.id + '" data-to="' + (s.done ? 0 : 1) + '">' + (s.done ? "Mark not done" : "Mark done") + "</button></p>" +
      (openPub === s.id ? pubForm(s) : "") + "</div>";
  }
  // ---- Publish as a listing, event or deal ----
  var TOWNS = ["Bermuda Dunes", "Cathedral City", "Coachella", "Desert Hot Springs", "Indian Wells", "Indio", "La Quinta", "Palm Desert", "Palm Springs", "Rancho Mirage", "Thousand Palms"];
  var EVENT_CATS = ["Community", "Music", "Theater", "Arts", "Family", "Nightlife", "Sports", "Outdoors"];
  var all = [], openPub = 0, pubKind = {};
  function dir() { return ((window.CVS && window.CVS.directory) || []).filter(function (b) { return !b.sample; }); }
  function cats() { var c = {}; dir().forEach(function (b) { (c[b.category] = c[b.category] || {})[b.service] = 1; }); return c; }
  function norm(t) { return String(t || "").toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, " ").trim(); }
  function guessService(t) {
    var n = norm(t), c = cats(), best = null;
    Object.keys(c).forEach(function (cat) { Object.keys(c[cat]).forEach(function (sv) { var m = norm(sv); if (!best && (m === n || m.replace(/s$/, "") === n.replace(/s$/, "") || (n.length > 3 && m.indexOf(n) > -1))) best = [cat, sv]; }); });
    return best;
  }
  function findBiz(name) { var n = norm(name); return dir().filter(function (b) { return n && norm(b.name) === n; })[0]; }
  function kindOf(d) { return /event/i.test(d.type) ? "event" : /deal/i.test(d.type) ? "deal" : "listing"; }
  function town(c) { return TOWNS.indexOf(c) > -1 ? c : ""; }
  function opt(list, sel) { return list.map(function (o) { return "<option" + (o === sel ? " selected" : "") + ">" + esc(o) + "</option>"; }).join(""); }
  function field(label, name, value, extra) { return '<label>' + label + '<input name="' + name + '" value="' + esc(value || "") + '"' + (extra || "") + '></label>'; }
  function pubForm(s) {
    var d = s.data, k = pubKind[s.id] || kindOf(d), c = cats(), html;
    if (k === "listing") {
      var g = guessService(d.business_type) || ["", ""], cat = g[0] || Object.keys(c).sort()[0], dup = findBiz(d.business || d.title);
      html = (dup ? '<p class="pub-warn">Heads up: <b>' + esc(dup.name) + '</b> is already listed (' + esc(dup.city) + '). Publishing adds a second listing.</p>' : "") +
        field("Business name", "name", d.business || d.title, " required") +
        '<label>Category<select name="category">' + opt(Object.keys(c).sort(), cat) + '</select></label>' +
        '<label>Service<input name="service" list="pub-services" value="' + esc(g[1] || d.business_type || "") + '" required></label>' +
        '<datalist id="pub-services">' + Object.keys(c).sort().map(function (x) { return Object.keys(c[x]).sort().map(function (sv) { return '<option value="' + esc(sv) + '">' + esc(x) + '</option>'; }).join(""); }).join("") + '</datalist>' +
        '<label>City<select name="city" required><option value="">Pick a city</option>' + opt(TOWNS, town(d.city)) + '</select></label>' +
        field("Phone", "phone", d.business_phone) + field("Website", "url", d.website_url) + field("Street address", "address", d.address) +
        '<label class="full">Short description (shows on the card)<textarea name="blurb" rows="3" maxlength="400">' + esc(d.description || d.details || "") + '</textarea></label>' +
        (/premium/i.test(d.plan || "") ? '<p class="pub-warn full">They asked for <b>Premium</b>. This publishes a Basic listing. Turn on Premium after they pay.</p>' : "") +
        (g[1] ? "" : '<p class="pub-warn full">&ldquo;' + esc(d.business_type || "") + '&rdquo; isn&rsquo;t a service yet. Pick one from the list, or keep it to start a new one.</p>');
    } else if (k === "event") {
      html = field("Event name", "title", d.title, " required") + field("Venue", "venue", d.address || d.business) +
        '<label>City<select name="city" required><option value="">Pick a city</option>' + opt(TOWNS, town(d.city)) + '</select></label>' +
        '<label>Category<select name="category">' + opt(EVENT_CATS, "Community") + '</select></label>' +
        field("Date", "date", d.date, ' type="date" required') + field("Last day (multi-day only)", "endDate", "", ' type="date"') +
        field("Time", "time", "", ' placeholder="7:00 PM, or 10 AM to 4 PM"') + field("Link for details or tickets", "url", d.website_url) +
        '<label class="full">Description<textarea name="description" rows="3" maxlength="600">' + esc(d.details || "") + '</textarea></label>';
    } else {
      var b = findBiz(d.business);
      html = field("Offer headline", "offer", d.title, " required") + field("Business", "business", b ? b.name : d.business, " required") +
        '<label>City<select name="city" required><option value="">Pick a city</option>' + opt(TOWNS, town(d.city) || (b && b.city)) + '</select></label>' +
        '<label>Category<select name="category">' + opt(Object.keys(c).sort(), b ? b.category : "") + '</select></label>' +
        field("Expires (leave blank for no end)", "expires", d.date, ' type="date"') +
        field("Link (their listing if they have one)", "url", b ? "business/" + b.slug + "/" : d.website_url) +
        '<label class="full">Fine print<textarea name="details" rows="3" maxlength="600">' + esc(d.details || "") + '</textarea></label>' +
        (b ? "" : '<p class="pub-warn full">This business isn&rsquo;t in the directory, so the deal links to their website. Publish them as a listing too to link it to a profile.</p>');
    }
    return '<form class="form pub-form" data-pubform="' + s.id + '"><div class="full pub-kinds" role="radiogroup" aria-label="Publish as">' +
      [["listing", "Listing"], ["event", "Event"], ["deal", "Deal"]].map(function (o) { return '<button type="button" role="radio" aria-checked="' + (o[0] === k) + '" class="chip' + (o[0] === k ? " active" : "") + '" data-kind="' + o[0] + '">' + o[1] + '</button>'; }).join("") + '</div>' +
      html + '<div class="full pub-actions"><button class="btn" type="submit">Publish ' + k + ' now</button><button class="btn btn-ghost" type="button" data-pubclose>Cancel</button><span class="pub-msg" role="status"></span></div></form>';
  }
  function draw() {
    var open = all.filter(function (s) { return !s.done; }), done = all.filter(function (s) { return s.done; });
    box.innerHTML = '<h2 class="month-head"><span class="stripe-mini"></span>Form submissions (' + open.length + " new)</h2>" +
      (open.map(row).join("") || '<div class="empty">Nothing new. Listings, story ideas and ad inquiries show up here.</div>') +
      (done.length ? '<details style="margin-top:12px"' + (done.some(function (s) { return s.id === openPub; }) ? " open" : "") + '><summary style="cursor:pointer;font-weight:600">Done (' + done.length + ")</summary>" + done.map(row).join("") + "</details>" : "");
  }

  function load() {
    fetch(API + "/admin/submissions?key=" + encodeURIComponent(admin)).then(function (r) { return r.json(); }).then(function (d) {
      if (d.error) return;
      all = d.submissions; draw();
    }).catch(function () {});
  }
  box.addEventListener("click", function (e) {
    var pb = e.target.closest("[data-pub]"); if (pb) { openPub = openPub === +pb.dataset.pub ? 0 : +pb.dataset.pub; draw(); return; }
    var kd = e.target.closest("[data-kind]"); if (kd) { pubKind[openPub] = kd.dataset.kind; draw(); return; }
    if (e.target.closest("[data-pubclose]")) { openPub = 0; draw(); return; }
    var b = e.target.closest("[data-done]"); if (!b) return;
    b.disabled = true;
    fetch(API + "/admin/submissions/done", { method: "POST", body: JSON.stringify({ key: admin, id: +b.dataset.done, done: b.dataset.to === "1" }) }).then(load, function () { b.disabled = false; });
  });
  box.addEventListener("submit", function (e) {
    var f = e.target.closest("[data-pubform]"); if (!f) return;
    e.preventDefault();
    var id = +f.dataset.pubform, kind = pubKind[id] || kindOf(all.filter(function (s) { return s.id === id; })[0].data), item = {};
    [].forEach.call(f.elements, function (el) { if (el.name) item[el.name] = el.value.trim(); });
    var btn = f.querySelector("[type=submit]"), msg = f.querySelector(".pub-msg");
    btn.disabled = true; msg.textContent = "Publishing…";
    fetch(API + "/admin/submissions/publish", { method: "POST", body: JSON.stringify({ key: admin, id: id, kind: kind, item: item }) })
      .then(function (r) { return r.json().then(function (d) { if (!r.ok) throw new Error(d.error || "Failed"); return d; }); })
      .then(function (d) {
        openPub = 0; load();
        var note = document.createElement("p"); note.className = "pub-ok";
        note.innerHTML = "&#10003; Published. It&rsquo;s live in about a minute: <a href=\"" + d.url + "\" target=\"_blank\" rel=\"noopener\">" + (d.slug ? "open the listing" : "see " + d.url) + "</a>" + (d.slug ? " &middot; Web address: business/" + esc(d.slug) + "/" : "");
        var old = box.parentNode.querySelector(".pub-ok"); if (old) old.remove(); box.before(note); setTimeout(function () { note.remove(); }, 20000);
      })
      .catch(function (err) { btn.disabled = false; msg.textContent = "Not published: " + err.message; });
  });
  load();
})();
