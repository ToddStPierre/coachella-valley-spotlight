/* Admin: postcard campaign money. Income and expense lines per campaign ("<route>:<mail date>"), stored in the
   tracker (D1 campaign_lines), so they stay private. Every field saves when you leave it. Shown on stats.html in admin mode. */
(function () {
  var API = "https://cvs-tracker.toddstpierre.workers.dev";
  var admin = (new URLSearchParams(location.search).get("admin") || (function () { try { return sessionStorage.getItem("cvs_admin"); } catch (e) { return null; } })()); if (!admin || window.CVS_IS_REPORT) return;
  var ROUTES = { "el-paseo": "El Paseo", "sun-city-palm-desert": "Sun City Palm Desert" };
  (window.CVS_MAILINGS || []).forEach(function (m) { if (m.route && m.name) ROUTES[m.route] = m.name; });
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function money(c) { var n = (c || 0) / 100, s = Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); return (n < 0 ? "-$" : "$") + s; }
  function dateLabel(d) { var p = d.split("-"); return new Date(+p[0], +p[1] - 1, +p[2]).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); }

  var box = document.createElement("div"); box.id = "money-admin"; box.style.marginTop = "48px";
  (document.getElementById("mailings-admin") || document.getElementById("st-out")).after(box);
  var lines = [], tmp = 0;

  function campaigns() {
    var seen = {}, out = [];
    (window.CVS_MAILINGS || []).forEach(function (m) { var c = m.route + ":" + m.mail; if (!seen[c]) { seen[c] = 1; out.push(c); } });
    lines.forEach(function (l) { if (!seen[l.campaign]) { seen[l.campaign] = 1; out.push(l.campaign); } });
    return out.sort(function (a, b) { return b.split(":")[1].localeCompare(a.split(":")[1]) || a.localeCompare(b); });
  }
  function totals(list) {
    var t = { inc: 0, exp: 0, missing: 0 };
    list.forEach(function (l) { if (l.kind === "income") { t.inc += l.amount || 0; if (!l.amount) t.missing++; } else t.exp += l.amount || 0; });
    t.profit = t.inc - t.exp; return t;
  }
  function row(l) {
    return '<tr data-id="' + esc(l.id) + '"><td><select data-f="kind"><option value="income"' + (l.kind === "income" ? " selected" : "") + '>Income</option><option value="expense"' + (l.kind === "expense" ? " selected" : "") + '>Expense</option></select></td>' +
      '<td><input data-f="label" value="' + esc(l.label) + '" placeholder="e.g. Spot 3 · Business, or Printing" style="width:100%;min-width:300px"></td>' +
      '<td><input data-f="amount" inputmode="decimal" value="' + esc(((l.amount || 0) / 100).toFixed(2)) + '" style="width:8em;text-align:right' + (l.kind === "income" && !l.amount ? ';border-color:var(--sun)' : '') + '"></td>' +
      '<td><input data-f="note" value="' + esc(l.note) + '" placeholder="Optional note" style="width:100%;min-width:220px"></td>' +
      '<td style="white-space:nowrap"><span class="mny-st" style="font-size:13px;color:var(--ink-2);margin-right:8px"></span><button type="button" class="btn btn-ghost" data-del>Delete</button></td></tr>';
  }
  function render() {
    var cs = campaigns(), all = totals(lines);
    box.innerHTML = '<h2 class="month-head"><span class="stripe-mini"></span>Campaign money</h2>' +
      '<p class="risk">Income and expenses for each postcard mailing. Change any field and it saves when you click away. Amounts are in dollars. Only you can see this.</p>' +
      (cs.length > 1 ? '<div class="stats" style="margin:16px 0 8px"><div class="stat"><b>' + money(all.inc) + '</b><span>Income, all campaigns</span></div><div class="stat"><b>' + money(all.exp) + '</b><span>Expenses, all campaigns</span></div><div class="stat"><b style="color:' + (all.profit < 0 ? "var(--sun-deep)" : "var(--palm)") + '">' + money(all.profit) + '</b><span>Profit, all campaigns</span></div></div>' : "") +
      cs.map(function (c) {
        var p = c.split(":"), list = lines.filter(function (l) { return l.campaign === c; }), t = totals(list);
        list.sort(function (a, b) { return (a.kind === b.kind ? 0 : a.kind === "income" ? -1 : 1) || (a.id > b.id ? 1 : -1); });
        return '<div class="mny-camp" data-c="' + esc(c) + '" style="margin-top:28px">' +
          '<h3 style="margin:0 0 10px;font-size:20px">' + esc(ROUTES[p[0]] || p[0]) + ' <span style="font-weight:500;color:var(--ink-2);font-size:16px">&middot; mails ' + esc(dateLabel(p[1])) + '</span></h3>' +
          '<div class="stats" style="margin-bottom:12px"><div class="stat"><b>' + money(t.inc) + '</b><span>Income</span></div><div class="stat"><b>' + money(t.exp) + '</b><span>Expenses</span></div>' +
          '<div class="stat"><b style="color:' + (t.profit < 0 ? "var(--sun-deep)" : "var(--palm)") + '">' + money(t.profit) + '</b><span>Profit</span></div>' +
          (t.missing ? '<div class="stat"><b style="color:var(--sun-deep)">' + t.missing + '</b><span>Income line' + (t.missing === 1 ? "" : "s") + ' with no amount yet</span></div>' : "") + '</div>' +
          '<div class="table-scroll"><table class="stats-table"><thead><tr><th>Type</th><th>Description</th><th>Amount ($)</th><th>Note</th><th></th></tr></thead><tbody>' +
          (list.map(row).join("") || '<tr><td colspan="5">No lines yet. Add income or an expense below.</td></tr>') + '</tbody></table></div>' +
          '<div class="cta-row" style="margin-top:12px"><button type="button" class="btn btn-ghost" data-add="income">+ Income</button><button type="button" class="btn btn-ghost" data-add="expense">+ Expense</button></div></div>';
      }).join("") +
      '<p class="form-status" id="mny-msg" role="status" style="font-weight:600;margin-top:16px"></p>';
  }
  function load() {
    fetch(API + "/admin/campaigns?key=" + encodeURIComponent(admin)).then(function (r) { return r.json(); }).then(function (d) {
      if (d.error) { box.innerHTML = ""; return; }
      lines = d.lines || []; render();
    }).catch(function () {});
  }
  function msg(t) { var m = document.getElementById("mny-msg"); if (m) m.textContent = t; }
  function save(tr) {
    var c = tr.closest("[data-c]").getAttribute("data-c"), id = tr.getAttribute("data-id"), f = {};
    tr.querySelectorAll("[data-f]").forEach(function (el) { f[el.getAttribute("data-f")] = el.value.trim(); });
    if (!f.label) { msg("Add a description to save that line."); return; }
    var st = tr.querySelector(".mny-st"); st.textContent = "Saving…";
    fetch(API + "/admin/campaigns", { method: "POST", body: JSON.stringify({ key: admin, op: "save", line: { id: /^t/.test(id) ? 0 : +id, campaign: c, kind: f.kind, label: f.label, amount: f.amount, note: f.note } }) })
      .then(function (r) { return r.json().then(function (d) { if (!r.ok) throw new Error(d.error || "Couldn't save."); return d; }); })
      .then(function (d) {
        lines = lines.filter(function (l) { return String(l.id) !== String(id); }).concat(d.line);
        render(); msg("Saved " + d.line.label + ".");
      }).catch(function (err) { st.textContent = ""; msg(err.message); });
  }
  box.addEventListener("change", function (e) { var tr = e.target.closest("tr[data-id]"); if (tr) save(tr); });
  box.addEventListener("click", function (e) {
    var add = e.target.closest("[data-add]");
    if (add) {
      var c = add.closest("[data-c]").getAttribute("data-c");
      lines.push({ id: "t" + (++tmp), campaign: c, kind: add.getAttribute("data-add"), label: "", amount: 0, note: "" });
      render(); var inp = box.querySelector('tr[data-id="t' + tmp + '"] [data-f="label"]'); if (inp) inp.focus();
      return;
    }
    var del = e.target.closest("[data-del]"); if (!del) return;
    var tr = del.closest("tr[data-id]"), id = tr.getAttribute("data-id");
    if (/^t/.test(id)) { lines = lines.filter(function (l) { return String(l.id) !== id; }); render(); return; }
    if (del.textContent !== "Click again to delete") { del.textContent = "Click again to delete"; setTimeout(function () { if (del.isConnected) del.textContent = "Delete"; }, 4000); return; }
    fetch(API + "/admin/campaigns", { method: "POST", body: JSON.stringify({ key: admin, op: "delete", id: +id }) })
      .then(function (r) { if (!r.ok) throw 0; lines = lines.filter(function (l) { return String(l.id) !== id; }); render(); msg("Deleted."); })
      .catch(function () { msg("Couldn't delete. Try again."); });
  });
  load();
})();
