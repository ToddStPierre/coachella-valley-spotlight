/* Admin: pending claims and owner dashboard links. Shown on stats.html?admin=KEY */
(function () {
  var API = "https://cvs-tracker.toddstpierre.workers.dev";
  var admin = new URLSearchParams(location.search).get("admin"); if (!admin) return;
  var dir = (window.CVS && window.CVS.directory) || [];
  function nameOf(s) { var b = dir.filter(function (x) { return x.slug === s; })[0]; return b ? b.name : s; }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  var box = document.createElement("div"); box.id = "owners-admin"; box.style.marginTop = "48px";
  var status = document.createElement("p"); status.id = "own-msg"; status.className = "form-status"; status.setAttribute("role", "status"); status.style.cssText = "font-weight:600;margin-top:16px";
  document.getElementById("st-out").after(box); box.after(status);
  var base = location.origin + location.pathname.replace(/stats\.html$/, "");
  function link(o) { return base + "owner.html?b=" + o.slug + "&key=" + o.key; }
  function post(path, body) { body.key = admin; return fetch(API + path, { method: "POST", body: JSON.stringify(body) }).then(function (r) { return r.json().then(function (d) { if (!r.ok) throw new Error(d.error || "Failed"); return d; }); }); }

  function load() {
    fetch(API + "/admin/owners?key=" + encodeURIComponent(admin)).then(function (r) { return r.json(); }).then(function (d) {
      if (d.error) { box.innerHTML = ""; return; }
      var claims = d.claims.map(function (c) {
        return '<tr><td><strong>' + esc(nameOf(c.slug)) + '</strong></td><td>' + esc(c.name) + (c.role ? ' (' + esc(c.role) + ')' : '') + '<br><a href="mailto:' + esc(c.email) + '">' + esc(c.email) + '</a><br>' + esc(c.phone) + (c.note ? '<br><em>' + esc(c.note) + '</em>' : '') + '</td><td>' + esc(c.created_at.slice(0, 10)) +
          '</td><td><button class="btn" data-approve="' + esc(c.slug) + '" data-claim="' + c.id + '">Approve</button> <button class="btn btn-ghost" data-reject="' + c.id + '">Reject</button></td></tr>';
      }).join("");
      var owners = d.owners.map(function (o) {
        return '<tr><td><strong>' + esc(nameOf(o.slug)) + '</strong></td><td>' + esc(o.name) + '<br>' + esc(o.email) + '</td><td>' + (o.revoked ? 'Link cancelled' : '<a href="' + esc(link(o)) + '" target="_blank" rel="noopener">Open dashboard</a> &middot; <a href="#" data-copylink="' + esc(link(o)) + '">Copy link</a>') +
          '</td><td>' + (o.revoked ? '<button class="btn btn-ghost" data-approve="' + esc(o.slug) + '" data-name="' + esc(o.name) + '" data-email="' + esc(o.email) + '">Re-approve</button>' : '<button class="btn btn-ghost" data-revoke="' + esc(o.slug) + '">Cancel link</button>') + '</td></tr>';
      }).join("");
      box.innerHTML = '<h2 class="month-head"><span class="stripe-mini"></span>Claim requests</h2>' +
        '<p class="risk">Call the business to confirm the person really works there before approving.</p>' +
        '<div class="table-scroll"><table class="stats-table"><thead><tr><th>Listing</th><th>Who</th><th>Sent</th><th></th></tr></thead><tbody>' + (claims || '<tr><td colspan="4">No claims waiting.</td></tr>') + '</tbody></table></div>' +
        '<h2 class="month-head"><span class="stripe-mini"></span>Owners</h2>' +
        '<div class="table-scroll"><table class="stats-table"><thead><tr><th>Listing</th><th>Owner</th><th>Dashboard</th><th></th></tr></thead><tbody>' + (owners || '<tr><td colspan="4">No owners yet.</td></tr>') + '</tbody></table></div>' +

        '<details style="margin-top:16px"><summary style="cursor:pointer;font-weight:600">Give an owner access without a claim request</summary><form class="form" id="own-manual" style="margin-top:12px">' +
        '<label>Listing<select name="b">' + dir.filter(function (b) { return b.slug; }).map(function (b) { return '<option value="' + esc(b.slug) + '">' + esc(b.name) + '</option>'; }).join("") + '</select></label>' +
        '<label>Owner name<input name="name" required></label><label>Owner email<input name="email" type="email" required></label>' +
        '<div class="full"><button class="btn" type="submit">Create dashboard link</button></div></form></details>';
    }).catch(function () {});
  }
  var msg = function (t) { status.textContent = t; };
  box.addEventListener("click", function (e) {
    var a = e.target.closest("[data-approve],[data-reject],[data-revoke],[data-copylink]"); if (!a) return;
    e.preventDefault();
    if (a.dataset.copylink) { navigator.clipboard.writeText(a.dataset.copylink); a.textContent = "Copied"; return; }
    a.disabled = true; msg("Working…");
    var job = a.dataset.approve ? post("/admin/approve", { b: a.dataset.approve, claim: a.dataset.claim ? +a.dataset.claim : undefined, name: a.dataset.name, email: a.dataset.email })
      : a.dataset.reject ? post("/admin/reject", { claim: +a.dataset.reject })
      : post("/admin/revoke", { b: a.dataset.revoke });
    job.then(function (d) {
      msg(d.key ? "Approved. The dashboard link is in the Owners table below. Copy it and send it to the owner." : "Done.");
      load();
    }).catch(function (err) { msg(err.message); a.disabled = false; });
  });
  box.addEventListener("submit", function (e) {
    if (e.target.id !== "own-manual") return; e.preventDefault();
    var f = e.target; msg("Working…");
    post("/admin/approve", { b: f.b.value, name: f.name.value, email: f.email.value }).then(function () { msg("Dashboard link created. Copy it from the Owners table."); load(); }).catch(function (err) { msg(err.message); });
  });
  load();
})();
