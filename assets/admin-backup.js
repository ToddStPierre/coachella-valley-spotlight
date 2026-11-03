/* Admin: "Site backup" panel at the top of stats.html in admin mode.
   "Back up now" opens cvsbackup://run, which only Todd's Mac understands: CVS Backup Launcher.app starts
   CVS Backup.app, which runs 04-live/backup/backup.py (the full backup to Google Drive). The script writes its own
   status row to the tracker (GET /admin/backups), so this panel shows "Running…" and then the result. */
(function () {
  var API = "https://cvs-tracker.toddstpierre.workers.dev";
  var admin = (new URLSearchParams(location.search).get("admin") || (function () { try { return sessionStorage.getItem("cvs_admin"); } catch (e) { return null; } })()); if (!admin) return;
  var STALE_MIN = 45; // a "running" row older than this never finished (the Mac slept or quit)
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function when(iso) { var d = new Date(iso); return isNaN(d) ? iso : d.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }); }
  function ago(iso) { return (Date.now() - new Date(iso).getTime()) / 60000; }

  var box = document.createElement("div"); box.id = "admin-backup"; box.className = "adm-backup";
  box.innerHTML = '<div class="adm-backup-text"><b>Site backup</b><span id="bk-status">Loading&hellip;</span>' +
    '<small>Runs on Todd&rsquo;s Mac and saves everything (site, database, ad bookings, member accounts) to Google Drive &rsaquo; Coachella Valley Spotlight Backups. Takes a few minutes.</small></div>' +
    '<a class="btn" href="cvsbackup://run" id="bk-run">Back up now</a>';
  var tools = document.getElementById("admin-tools"), out = document.getElementById("st-out");
  // Inside the Leads buttons row (full width, its own line), so the sales cockpit, which also inserts itself
  // right after that row, can't push it down the page.
  if (tools) tools.appendChild(box); else if (out) out.before(box); else return;
  var status = document.getElementById("bk-status"), last = null, poll = null, clickedAt = 0;

  function paint(rows) {
    var b = rows[0];
    if (!b) { status.innerHTML = "No backups recorded yet."; return; }
    var s = (function () { try { return JSON.parse(b.summary || "{}"); } catch (e) { return {}; } })();
    if (b.status === "running" && ago(b.started_at) < STALE_MIN) { status.innerHTML = '<span class="bk-run">Running&hellip;</span> started ' + esc(when(b.started_at)); return; }
    if (b.status === "running") { status.innerHTML = '<span class="bk-bad">The backup started ' + esc(when(b.started_at)) + " didn&rsquo;t finish.</span> Try again."; return; }
    var ok = b.status === "ok";
    status.innerHTML = "Last backup " + esc(when(b.finished_at || b.started_at)) + " &middot; " + (ok ? '<span class="bk-ok">OK</span>' : '<span class="bk-bad">Problems: ' + esc(b.problems) + "</span>") +
      (s.folder ? ' &middot; folder <code>' + esc(s.folder) + "</code>" : "") +
      (s.members != null ? " &middot; " + s.members + " member accounts" : "") + (s.ad_spots != null ? ", " + s.ad_spots + " ad spots" : "");
  }
  function load() {
    return fetch(API + "/admin/backups?key=" + encodeURIComponent(admin)).then(function (r) { return r.json(); }).then(function (d) {
      if (d.error) { status.textContent = "Couldn't load backup status."; return null; }
      paint(d.backups || []); return d.backups || [];
    }).catch(function () { status.textContent = "Couldn't load backup status."; return null; });
  }
  load().then(function (rows) { last = rows && rows[0] ? rows[0].id : 0; });

  document.getElementById("bk-run").addEventListener("click", function () {
    clickedAt = Date.now();
    status.innerHTML = '<span class="bk-run">Starting&hellip;</span> If your Mac asks, allow it to open CVS Backup Launcher.';
    clearInterval(poll);
    poll = setInterval(function () {
      load().then(function (rows) {
        var b = rows && rows[0], mins = (Date.now() - clickedAt) / 60000;
        var started = b && b.id !== last;
        if (started && b.status !== "running") { clearInterval(poll); last = b.id; return; }
        if (!started && mins > 1.5) { clearInterval(poll); status.innerHTML = '<span class="bk-bad">Nothing started.</span> This button only works on Todd&rsquo;s Mac, with CVS Backup Launcher installed (04-live/backup/install-schedule.sh).'; }
        if (mins > 30) clearInterval(poll);
      });
    }, 10000);
  });
})();
