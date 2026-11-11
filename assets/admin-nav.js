/* Spotlight HQ shell (stats.html in admin mode; rebuilt 2026-11-09 from the sidebar version).
   Dark sidebar grouped by job, a sticky top bar with the ⌘K command bar and quick actions, and one section at a time.
   Each section is a list of panel ids built by the other admin-*.js files (found by id, never rebuilt). A panel can sit
   in more than one section (the sales cockpit shows its cards on Overview and Who to pitch on Sales; CSS picks the part).
   The open section lives in the URL hash (#overview, #board...). Old hashes (#today, #setup) and panel ids still work.
   Badges are read from the panels themselves (a MutationObserver). Under 980px the sidebar slides in from a menu button.
   Needs assets/admin-hq.js (window.HQ). If this script fails, every panel just shows in one column. */
(function () {
  var HQ = window.HQ; if (!HQ) return;
  var out = document.getElementById("st-out"); if (!out) return;
  var wrap = out.parentNode, ic = HQ.icons, esc = HQ.esc;

  function num(sel, re) { var el = document.querySelector(sel); if (!el) return 0; var m = re ? (el.textContent.match(re) || [])[1] : el.textContent; return +m || 0; }
  // id, group, label, icon, panels, title, description, badge, head actions
  var SECTIONS = [
    { id: "overview", group: "", label: "Overview", icon: ic.home, panels: ["ov-admin", "cockpit-admin"], title: "Overview", desc: "Where both cards stand, what needs you today, and how the directory is doing." },
    { id: "sales", group: "Sell", label: "Who to call", icon: ic.target, panels: ["cockpit-admin"], title: "Who to call next", desc: "Ranked call list, hot free listings and every follow-up. Log each email, call or text and it's saved for good.", badge: function () { return num("#ck-due-todo b"); } },
    { id: "leads", group: "Sell", label: "Leads", icon: ic.users, panels: ["leads-admin"], title: "Leads", desc: "Every business you or the reps have called, emailed or plan to pitch. The same list the reps sign in to.", actions: '<a class="hq-btn ghost" href="leads.html" target="_blank" rel="noopener">' + ic.ext + "<span>Open full screen</span></a>" },
    { id: "board", group: "Advertising", label: "Postcard board", icon: ic.card, panels: ["board-admin"], title: "Postcard board", desc: "Both cards, spot by spot. Click any spot to hold it for someone, mark it paid, or release it.", actions: '<button type="button" class="hq-btn accent" data-act="hold">' + ic.plus + "<span>Hold a spot</span></button>" },
    { id: "routes", group: "Advertising", label: "Mail routes", icon: ic.list, panels: ["routes-admin"], title: "Mail routes", desc: "The USPS carrier routes behind every card, live and waitlist. Copy a card's routes straight into the 9x12 planner or an order.", actions: '<a class="hq-btn ghost" href="https://9x12method.com/eddm-route-planner/" target="_blank" rel="noopener">' + ic.ext + "<span>9x12 planner</span></a>" },
    { id: "mailings", group: "Advertising", label: "Mailings & money", icon: ic.calendar, panels: ["mailings-admin", "money-admin"], title: "Mailings & money", desc: "Mail dates, artwork deadlines and minimums, plus what each card earns and costs." },
    { id: "listings", group: "Directory", label: "Listings", icon: ic.list, panels: ["st-out", "st-risk"], title: "Directory", desc: "Every business in the directory with its numbers. Edit any listing, switch on Premium or the postcard tag, or add a new one.", actions: '<button type="button" class="hq-btn accent" data-act="new">' + ic.plus + "<span>New listing</span></button>" },
    { id: "inbox", group: "Directory", label: "Inbox", icon: ic.inbox, panels: ["submissions-admin"], title: "Inbox", desc: "Listings, events, deals, story ideas and ad questions sent in from the site. Publish one in a click.", badge: function () { return num("#submissions-admin", /\((\d+) new\)/); } },
    { id: "reports", group: "Customers", label: "Monthly reports", icon: ic.chart, panels: ["reports-admin"], title: "Monthly reports", desc: "Send each paying business last month's numbers, with their private Spotlight Report link.", badge: function () { return document.querySelectorAll("#reports-admin a.btn[data-sent]:not(.btn-ghost)").length; } },
    { id: "people", group: "Customers", label: "Owners & members", icon: ic.star, panels: ["owners-admin", "own-msg", "signups-admin"], title: "Owners & members", desc: "Claim requests, owner dashboards, My Spotlight members and the email list.", badge: function () { return document.querySelectorAll("#owners-admin [data-claim]").length; } },
    { id: "system", group: "System", label: "Backups & traffic", icon: ic.shield, panels: ["admin-tools", "visitors-admin"], title: "Backups & site traffic", desc: "Back up the whole site to Google Drive from this Mac, and see today's visitors." }
  ];
  var OLD = { today: "overview", setup: "mailings", "ck-pitch": "sales" };

  // Leads: the Leads page in a frame, loaded the first time the section opens.
  var leads = document.createElement("div"); leads.id = "leads-admin"; out.before(leads);
  var risk = wrap.querySelector("p.risk:last-of-type"); if (risk && !risk.id) risk.id = "st-risk";

  // ---- Build the shell ----
  var side = document.createElement("aside"); side.className = "hq-side";
  var groups = [];
  SECTIONS.forEach(function (s) { if (groups.indexOf(s.group) < 0) groups.push(s.group); });
  side.innerHTML = '<a class="hq-brand" href="#overview"><svg viewBox="0 0 40 40" aria-hidden="true"><defs><clipPath id="hqsun"><circle cx="20" cy="22" r="13"/></clipPath></defs><g clip-path="url(#hqsun)"><rect x="0" y="9" width="40" height="5" fill="#f0a33a"/><rect x="0" y="15" width="40" height="4" fill="#d9552b"/><rect x="0" y="20" width="40" height="3" fill="#c9667a"/><rect x="0" y="24" width="40" height="2" fill="#5b4a7a"/></g><path d="M2 36 L13 24 L19 30 L26 21 L38 36 Z" fill="#f6efe6"/></svg><span><b>Spotlight HQ</b><small>Coachella Valley</small></span></a>' +
    '<nav class="hq-nav" aria-label="Admin sections">' + groups.map(function (g) {
      return (g ? '<div class="hq-group">' + g + "</div>" : "") + SECTIONS.filter(function (s) { return s.group === g; }).map(function (s) {
        return '<a href="#' + s.id + '" data-sec="' + s.id + '">' + s.icon + "<span>" + s.label + '</span><i class="adm-badge" hidden></i></a>';
      }).join("");
    }).join("") + "</nav>" +
    '<div class="hq-side-foot"><a href="./" target="_blank" rel="noopener">' + ic.globe + "View the live site</a>" +
    '<div class="hq-me"><i>T</i><div><b>Todd</b><small>Admin</small></div></div></div>';

  var main = document.createElement("div"); main.className = "hq-main";
  main.innerHTML = '<header class="hq-top"><button type="button" class="hq-burger" aria-label="Menu">' + ic.menu + '</button><div class="hq-crumb">Spotlight HQ / <b id="hq-crumb"></b></div>' +
    '<button type="button" class="hq-search" id="hq-search">' + ic.search + "<span>Search businesses, sections, actions</span><kbd>⌘K</kbd></button>" +
    '<div class="hq-actions"><button type="button" class="hq-btn ghost" data-act="hold">' + ic.card + '<span>Hold a spot</span></button><button type="button" class="hq-btn" data-act="new">' + ic.plus + "<span>New listing</span></button></div></header>" +
    '<div class="hq-content"><div class="hq-head"><div><div class="hq-eyebrow" id="hq-eyebrow"></div><h1 id="hq-h1"></h1><p id="hq-desc"></p></div><div class="hq-actions" id="hq-head-act"></div></div></div>';
  var content = main.querySelector(".hq-content");
  content.style.display = "flex"; content.style.flexDirection = "column";
  var head = content.querySelector(".hq-head"); head.style.order = -1;

  // Every panel (everything after the hero text) moves into the content column.
  var kids = [].slice.call(wrap.children).filter(function (el) { return !el.querySelector("#st-eyebrow") && el.id !== "st-sub" && el.id !== "st-title"; });
  wrap.appendChild(side); wrap.appendChild(main);
  kids.forEach(function (el) { content.appendChild(el); });

  function secOf(id) {
    var s = SECTIONS.filter(function (x) { return x.id === (OLD[id] || id); })[0]; if (s) return s;
    var el = document.getElementById(id); if (!el) return null;
    var panel = el; while (panel && panel.parentNode !== content) panel = panel.parentNode;
    return panel ? SECTIONS.filter(function (x) { return x.panels.indexOf(panel.id) > -1 && x.id !== "overview"; })[0] || SECTIONS.filter(function (x) { return x.panels.indexOf(panel.id) > -1; })[0] : null;
  }
  var current = null;
  function show(sec, scrollTo) {
    current = sec;
    document.body.dataset.sec = sec.id;
    [].forEach.call(content.children, function (el) {
      if (el === head) return;
      var i = sec.panels.indexOf(el.id);
      el.classList.toggle("adm-off", i < 0); el.style.order = i < 0 ? 99 : i;
    });
    var h = new Date().getHours();
    document.getElementById("hq-h1").textContent = sec.id === "overview" ? (h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening") + ", Todd" : sec.title;
    document.getElementById("hq-eyebrow").textContent = sec.id === "overview" ? new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }) : (sec.group || "Spotlight HQ");
    document.getElementById("hq-desc").textContent = sec.desc;
    document.getElementById("hq-head-act").innerHTML = sec.actions || "";
    document.getElementById("hq-crumb").textContent = sec.label;
    document.title = sec.label + " · Spotlight HQ";
    [].forEach.call(side.querySelectorAll("[data-sec]"), function (a) { var on = a.dataset.sec === sec.id; a.classList.toggle("active", on); if (on) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current"); });
    if (sec.id === "leads" && !leads.firstChild) leads.innerHTML = '<iframe src="leads.html" title="Leads"></iframe>';
    document.body.classList.remove("hq-nav-open");
    var target = scrollTo && document.getElementById(scrollTo);
    if (target) setTimeout(function () { target.scrollIntoView({ block: "start" }); window.scrollBy(0, -76); }, 30); else window.scrollTo(0, 0);
  }
  function route() {
    var h = location.hash.slice(1);
    if (!h) return show(SECTIONS[0]);
    var s = secOf(h); if (!s) return show(SECTIONS[0]);
    show(s, s.id === (OLD[h] || h) ? null : h);
  }
  window.addEventListener("hashchange", route);
  document.body.classList.add("is-admin");
  route();

  // ---- Quick actions (top bar, section heads, overview) ----
  document.addEventListener("click", function (e) {
    var a = e.target.closest(".hq-top [data-act], .hq-head [data-act]"); if (a) {
      if (a.dataset.act === "new" && HQ.newListing) HQ.newListing();
      if (a.dataset.act === "hold") { if (current.id !== "board") location.hash = "board"; setTimeout(function () { if (HQ.holdSpot) HQ.holdSpot(); }, 60); }
      return;
    }
    if (e.target.closest(".hq-burger")) { document.body.classList.toggle("hq-nav-open"); return; }
    if (document.body.classList.contains("hq-nav-open") && !e.target.closest(".hq-side")) document.body.classList.remove("hq-nav-open");
  });

  // ---- Badges: re-read whenever a panel changes ----
  function badges() {
    SECTIONS.forEach(function (s) {
      if (!s.badge) return;
      var n = s.badge(), b = side.querySelector('a[data-sec="' + s.id + '"] > .adm-badge');
      b.hidden = !n; b.textContent = n > 99 ? "99+" : n;
    });
  }
  var t = 0;
  if ("MutationObserver" in window) new MutationObserver(function () { clearTimeout(t); t = setTimeout(badges, 150); }).observe(content, { childList: true, subtree: true, characterData: true });
  badges();

  // ---- ⌘K command bar: sections, actions and every business ----
  var ACTIONS = [
    { label: "New listing", hint: "Directory", icon: ic.plus, run: function () { HQ.newListing && HQ.newListing(); } },
    { label: "Hold a postcard spot", hint: "Postcard board", icon: ic.card, run: function () { location.hash = "board"; setTimeout(function () { HQ.holdSpot && HQ.holdSpot(); }, 60); } },
    { label: "Open the live site", hint: "New tab", icon: ic.globe, run: function () { window.open("./", "_blank", "noopener"); } },
    { label: "Open Leads full screen", hint: "New tab", icon: ic.ext, run: function () { window.open("leads.html", "_blank", "noopener"); } }
  ];
  function openCmd() {
    if (document.querySelector(".hq-cmd-bg")) return;
    var bg = document.createElement("div"); bg.className = "hq-cmd-bg";
    bg.innerHTML = '<div class="hq-cmd" role="dialog" aria-modal="true" aria-label="Search"><div class="hq-cmd-in">' + ic.search + '<input type="text" placeholder="Search businesses, sections, actions…" autocomplete="off" spellcheck="false"><kbd>esc</kbd></div><div class="hq-cmd-list" role="listbox"></div>' +
      '<div class="hq-cmd-foot"><span><kbd>↑</kbd> <kbd>↓</kbd> to move</span><span><kbd>↵</kbd> to open</span><span>Businesses open in the listing editor</span></div></div>';
    document.body.appendChild(bg);
    var input = bg.querySelector("input"), listEl = bg.querySelector(".hq-cmd-list"), items = [], sel = 0;
    function close() { bg.remove(); document.removeEventListener("keydown", key, true); }
    function render() {
      var q = input.value.trim().toLowerCase();
      var m = function (s) { return !q || String(s).toLowerCase().indexOf(q) > -1; };
      var secs = SECTIONS.filter(function (s) { return m(s.label) || m(s.title); }).map(function (s) { return { grp: "Go to", label: s.label, hint: s.group || "Home", icon: s.icon, run: function () { location.hash = s.id; } }; });
      var acts = ACTIONS.filter(function (a) { return m(a.label); }).map(function (a) { a.grp = "Actions"; return a; });
      var biz = q.length < 2 ? [] : HQ.dir().filter(function (b) { return m(b.name) || m(b.service) || m(b.city); }).slice(0, 8).map(function (b) {
        return { grp: "Businesses", label: b.name, hint: [b.city, b.premium || b.featured ? "Premium" : "", b.postcard ? "Postcard" : ""].filter(Boolean).join(" · "), icon: ic.edit, run: function () { HQ.editListing && HQ.editListing(b.slug); } };
      });
      items = q ? biz.concat(acts, secs) : acts.concat(secs);
      sel = Math.min(sel, Math.max(0, items.length - 1));
      var last = "";
      listEl.innerHTML = items.map(function (x, i) {
        var g = x.grp !== last ? '<div class="hq-cmd-grp">' + x.grp + "</div>" : ""; last = x.grp;
        return g + '<button type="button" class="hq-cmd-item' + (i === sel ? " on" : "") + '" data-i="' + i + '" role="option">' + x.icon + "<span>" + esc(x.label) + "</span><small>" + esc(x.hint || "") + "</small></button>";
      }).join("") || '<div class="hq-cmd-grp" style="padding:18px 12px">Nothing matches &ldquo;' + esc(input.value) + "&rdquo;</div>";
      var on = listEl.querySelector(".on"); if (on) on.scrollIntoView({ block: "nearest" });
    }
    function pick(i) { var x = items[i]; if (!x) return; close(); x.run(); }
    function key(e) {
      if (e.key === "Escape") { e.preventDefault(); close(); }
      else if (e.key === "ArrowDown") { e.preventDefault(); sel = Math.min(items.length - 1, sel + 1); render(); }
      else if (e.key === "ArrowUp") { e.preventDefault(); sel = Math.max(0, sel - 1); render(); }
      else if (e.key === "Enter") { e.preventDefault(); pick(sel); }
    }
    input.addEventListener("input", function () { sel = 0; render(); });
    listEl.addEventListener("click", function (e) { var b = e.target.closest("[data-i]"); if (b) pick(+b.dataset.i); });
    listEl.addEventListener("mousemove", function (e) { var b = e.target.closest("[data-i]"); if (b && +b.dataset.i !== sel) { sel = +b.dataset.i; [].forEach.call(listEl.querySelectorAll(".hq-cmd-item"), function (x) { x.classList.toggle("on", x === b); }); } });
    bg.addEventListener("click", function (e) { if (e.target === bg) close(); });
    document.addEventListener("keydown", key, true);
    render(); input.focus();
  }
  document.getElementById("hq-search").addEventListener("click", openCmd);
  document.addEventListener("keydown", function (e) {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); openCmd(); }
    else if (e.key === "/" && !/input|textarea|select/i.test((document.activeElement || {}).tagName || "") && !document.querySelector(".hq-drawer")) { e.preventDefault(); openCmd(); }
  });
})();
