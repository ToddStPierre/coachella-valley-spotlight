/* Admin: postcard mailing dates (data/mailings.js). Shown on stats.html in admin mode.
   Saving posts to the tracker, which commits data/mailings.js; the site rebuilds in about a minute. */
(function () {
  var API = "https://cvs-tracker.toddstpierre.workers.dev";
  var admin = (new URLSearchParams(location.search).get("admin") || (function () { try { return sessionStorage.getItem("cvs_admin"); } catch (e) { return null; } })()); if (!admin) return;
  var ROUTES = { "el-paseo": "El Paseo", "sun-city-palm-desert": "Sun City Palm Desert" };
  var list = JSON.parse(JSON.stringify(window.CVS_MAILINGS || []));
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  var box = document.createElement("div"); box.id = "mailings-admin"; box.style.marginTop = "48px";
  document.getElementById("st-out").after(box);

  function row(m, i) {
    return '<tr data-i="' + i + '">' +
      '<td><select data-f="route">' + Object.keys(ROUTES).map(function (r) { return '<option value="' + r + '"' + (r === m.route ? " selected" : "") + '>' + ROUTES[r] + '</option>'; }).join("") + '</select>' +
      '<input data-f="name" value="' + esc(m.name) + '" placeholder="Card name" style="margin-top:6px"></td>' +
      '<td><input type="date" data-f="mail" value="' + esc(m.mail) + '" required></td>' +
      '<td><input type="date" data-f="deadline" value="' + esc(m.deadline) + '" required></td>' +
      '<td><input type="number" data-f="minSold" min="1" max="16" value="' + esc(m.minSold || 8) + '" style="width:5em"></td>' +
      '<td><input data-f="area" value="' + esc(m.area) + '" placeholder="Area"><input data-f="homes" value="' + esc(m.homes) + '" placeholder="4,972 homes" style="margin-top:6px"></td>' +
      '<td><button type="button" class="btn btn-ghost" data-remove="' + i + '">Remove</button></td></tr>';
  }
  function render(note) {
    box.innerHTML = '<h2 class="month-head"><span class="stripe-mini"></span>Mailing dates</h2>' +
      '<p class="risk">These show on the spot picker and the <a href="mailing-calendar" target="_blank" rel="noopener">mailing calendar</a>. After the artwork deadline, a card closes for booking. Saving republishes the site in about a minute.</p>' +
      '<div class="table-scroll"><table class="stats-table adm-mail"><thead><tr><th>Card</th><th>Mails</th><th>Artwork due</th><th>Min. sold</th><th>Area and homes</th><th></th></tr></thead><tbody>' +
      (list.length ? list.map(row).join("") : '<tr><td colspan="6">No cards scheduled. Add one below.</td></tr>') + '</tbody></table></div>' +
      '<div class="cta-row" style="margin-top:16px"><button type="button" class="btn btn-ghost" id="mail-add">Add a card</button><button type="button" class="btn" id="mail-save">Save mailing dates</button></div>' +
      '<p class="form-status" id="mail-msg" role="status" style="font-weight:600;margin-top:12px">' + esc(note || "") + '</p>';
  }
  function read() {
    box.querySelectorAll("tr[data-i]").forEach(function (tr) {
      var m = list[+tr.getAttribute("data-i")];
      tr.querySelectorAll("[data-f]").forEach(function (el) { var f = el.getAttribute("data-f"); m[f] = f === "minSold" ? parseInt(el.value, 10) : el.value.trim(); });
      if (!m.name) m.name = ROUTES[m.route];
    });
  }
  box.addEventListener("click", function (e) {
    var msg = function (t) { var p = document.getElementById("mail-msg"); if (p) p.textContent = t; };
    if (e.target.id === "mail-add") {
      read(); var last = list[list.length - 1] || { route: "el-paseo", name: "El Paseo", area: "Palm Desert 92260, around El Paseo", homes: "4,972 homes", minSold: 8 };
      list.push({ route: last.route, name: last.name, area: last.area, homes: last.homes, mail: "", deadline: "", minSold: last.minSold || 8 });
      render("New card added. Fill in its dates, then save.");
    } else if (e.target.hasAttribute("data-remove")) {
      read(); list.splice(+e.target.getAttribute("data-remove"), 1); render("Card removed. Save to make it stick.");
    } else if (e.target.id === "mail-save") {
      read();
      for (var i = 0; i < list.length; i++) {
        var m = list[i];
        if (!m.mail || !m.deadline) return msg("Every card needs a mail date and an artwork deadline.");
        if (m.deadline > m.mail) return msg(m.name + ": the artwork deadline must be on or before the mail date.");
        if (!(m.minSold >= 1 && m.minSold <= 16)) return msg(m.name + ": minimum sold must be 1 to 16.");
      }
      e.target.disabled = true; msg("Saving…");
      fetch(API + "/admin/mailings", { method: "POST", body: JSON.stringify({ key: admin, mailings: list }) })
        .then(function (r) { return r.json().then(function (d) { if (!r.ok) throw new Error(d.detail || d.error || "Save failed"); return d; }); })
        .then(function (d) { list = d.mailings; render("Saved. The site will show the new dates in about a minute."); })
        .catch(function (err) { e.target.disabled = false; msg("Couldn’t save: " + err.message); });
    }
  });
  render();
})();
