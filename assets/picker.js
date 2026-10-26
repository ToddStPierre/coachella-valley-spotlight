/* Postcard spot picker: live availability from the reservations Worker. */
(function () {
  var API = "https://local-spotlight-reservations.toddstpierre.workers.dev";
  var NOTIFY = "https://formspree.io/f/myezyype";
  var LABELS = { "el-paseo": "El Paseo", "sun-city-palm-desert": "Sun City Palm Desert" };
  var root = document.getElementById("picker"); if (!root) return;
  var tabs = root.querySelectorAll(".picker-tab"), statusEl = document.getElementById("picker-status"), countEl = document.getElementById("picker-count");
  var front = document.getElementById("picker-front"), back = document.getElementById("picker-back");
  var shell = document.getElementById("picker-form-shell"), title = document.getElementById("picker-form-title");
  var form = document.getElementById("picker-form"), cat = document.getElementById("pf-category"), msg = document.getElementById("picker-msg");
  var route = "el-paseo", pending = null;
  var dateEl = root.querySelector(".picker-date"), MAIL = window.CVS_MAILINGS || [];
  function mailing(r) { for (var i = 0; i < MAIL.length; i++) if (MAIL[i].route === r) return MAIL[i]; return null; }
  function ymd(s) { var p = s.split("-"); return new Date(+p[0], p[1] - 1, +p[2]); }
  function nice(s) { return ymd(s).toLocaleDateString("en-US", { weekday: "short", month: "long", day: "numeric" }); }
  function daysLeft(s) { var t = new Date(); t.setHours(0, 0, 0, 0); return Math.round((ymd(s) - t) / 864e5); }
  function closed(r) { var m = mailing(r); return !!(m && daysLeft(m.deadline) < 0); }
  function showDate(r) {
    var m = mailing(r); if (!dateEl) return;
    if (!m) { dateEl.textContent = "Mailing date coming soon"; return; }
    var d = daysLeft(m.deadline);
    dateEl.innerHTML = "Mails " + nice(m.mail) + " &middot; Artwork due " + nice(m.deadline) +
      (d < 0 ? '<span class="picker-left">Booking for this card is closed. The next date is coming soon.</span>' : '<span class="picker-left">' + (d === 0 ? "Last day to book" : d + (d === 1 ? " day" : " days") + " left to book") + '</span>');
  }

  function state(s) { s = (s || "").toLowerCase(); return s === "open" ? "open" : s === "pending" ? "pending" : "sold"; }
  function word(k) { return k === "open" ? "Open" : k === "pending" ? "Pending" : "Sold"; }

  function load(r, keepForm) {
    showDate(r);
    statusEl.textContent = "Loading spots…"; countEl.textContent = "Loading availability…";
    front.innerHTML = ""; back.innerHTML = ""; if (!keepForm) shell.hidden = true;
    fetch(API + "/api/spots?route=" + encodeURIComponent(r)).then(function (res) { if (!res.ok) throw 0; return res.json(); }).then(function (d) {
      d.positions.forEach(function (p) {
        var k = state(p.status), el = document.createElement(k === "open" ? "button" : "div");
        el.className = "spot " + k;
        el.innerHTML = '<span class="spot-n">Spot ' + p.position + '</span><span class="spot-cat">' + (p.category ? p.category.replace(/</g, "&lt;") : (k === "open" ? "Tap to hold" : "")) + '</span><span class="spot-state">' + word(k) + '</span>';
        el.setAttribute("aria-label", "Spot " + p.position + (p.category ? ", " + p.category : "") + ", " + word(k));
        if (k === "open" && closed(r)) { el.disabled = true; el.title = "Booking for this card is closed"; }
        else if (k === "open") { el.type = "button"; el.addEventListener("click", function () { open(r, p.position); }); }
        (p.position <= 8 ? front : back).appendChild(el);
      });
      var taken = d.categories.filter(function (c) { return d.takenCategories.indexOf(c) === -1; });
      cat.innerHTML = '<option value="" disabled selected>Select your category…</option>' + taken.map(function (c) { return '<option>' + c.replace(/</g, "&lt;") + '</option>'; }).join("") + (taken.length ? "" : '<option value="" disabled>No categories left on this route</option>');
      var n = d.positions.filter(function (p) { return state(p.status) !== "open"; }).length;
      countEl.innerHTML = '<b>' + n + ' of ' + d.positions.length + '</b> spots taken on ' + LABELS[r];
      statusEl.textContent = LABELS[r] + ": tap an open spot to hold it.";
    }).catch(function () {
      statusEl.textContent = "Couldn’t load live spot availability right now. Refresh to try again, or call (760) 422-5475.";
      countEl.textContent = "";
    });
  }

  function open(r, pos) {
    pending = { route: r, position: pos };
    title.textContent = "Hold Spot " + pos + " on " + LABELS[r];
    msg.textContent = ""; shell.hidden = false;
    shell.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  document.getElementById("picker-cancel").addEventListener("click", function () { shell.hidden = true; pending = null; });
  tabs.forEach(function (t) {
    t.addEventListener("click", function () {
      tabs.forEach(function (x) { x.classList.remove("active"); x.setAttribute("aria-selected", "false"); });
      t.classList.add("active"); t.setAttribute("aria-selected", "true");
      route = t.getAttribute("data-route"); load(route);
    });
  });

  form.addEventListener("submit", function (e) {
    e.preventDefault(); if (!pending) return;
    var btn = form.querySelector('button[type="submit"]'); btn.disabled = true; msg.textContent = "Holding your spot…";
    var p = { route: pending.route, position: pending.position, category: form.category.value, name: form.name.value, business: form.business.value, email: form.email.value, phone: form.phone.value, notes: form.notes.value };
    fetch(API + "/api/reserve", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(p) })
      .then(function (res) { return res.json().then(function (d) { return { ok: res.ok, d: d }; }); })
      .then(function (r) {
        if (!r.ok) { msg.textContent = r.d.error || "That spot just got taken. Pick another one."; btn.disabled = false; load(route, true); return; }
        fetch(NOTIFY, { method: "POST", headers: { Accept: "application/json", "Content-Type": "application/json" }, body: JSON.stringify({
          _subject: "Coachella Valley Spotlight: " + p.business + " wants Spot " + p.position + " (" + p.category + ") on " + LABELS[p.route],
          name: p.name, business: p.business, email: p.email, phone: p.phone, notes: p.notes, route: LABELS[p.route], spot: p.position, category: p.category,
          source: "coachellavalleyspotlight.com / advertise spot picker" }) }).catch(function () {});
        msg.textContent = "Spot held! We’ll email you shortly to confirm payment and lock it in.";
        btn.disabled = false; form.reset();
        setTimeout(function () { shell.hidden = true; }, 2500);
        load(route, true);
      })
      .catch(function () { msg.textContent = "Something went wrong. Please try again in a moment, or call (760) 422-5475."; btn.disabled = false; });
  });

  var want = (location.search.match(/[?&]route=([a-z-]+)/) || [])[1];
  tabs.forEach(function (t) { if (want && t.getAttribute("data-route") === want) t.click(); });
  if (!want || !mailing(want)) load(route);
})();
