/* Admin: every form submission (business listings, stories, ad holds), saved by the tracker. Shown on stats.html?admin=KEY */
(function () {
  var API = "https://cvs-tracker.toddstpierre.workers.dev";
  var admin = (new URLSearchParams(location.search).get("admin") || (function () { try { return sessionStorage.getItem("cvs_admin"); } catch (e) { return null; } })()); if (!admin) return;
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
      '<p style="margin:8px 0 0"><button class="btn btn-ghost" data-done="' + s.id + '" data-to="' + (s.done ? 0 : 1) + '">' + (s.done ? "Mark not done" : "Mark done") + "</button></p></div>";
  }
  function load() {
    fetch(API + "/admin/submissions?key=" + encodeURIComponent(admin)).then(function (r) { return r.json(); }).then(function (d) {
      if (d.error) return;
      var open = d.submissions.filter(function (s) { return !s.done; }), done = d.submissions.filter(function (s) { return s.done; });
      box.innerHTML = '<h2 class="month-head"><span class="stripe-mini"></span>Form submissions (' + open.length + " new)</h2>" +
        (open.map(row).join("") || '<div class="empty">Nothing new. Listings, story ideas and ad inquiries show up here.</div>') +
        (done.length ? '<details style="margin-top:12px"><summary style="cursor:pointer;font-weight:600">Done (' + done.length + ")</summary>" + done.map(row).join("") + "</details>" : "");
    }).catch(function () {});
  }
  box.addEventListener("click", function (e) {
    var b = e.target.closest("[data-done]"); if (!b) return;
    b.disabled = true;
    fetch(API + "/admin/submissions/done", { method: "POST", body: JSON.stringify({ key: admin, id: +b.dataset.done, done: b.dataset.to === "1" }) }).then(load, function () { b.disabled = false; });
  });
  load();
})();
