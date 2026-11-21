/* Spotlight HQ: Advertisers (2026-11-21). Artwork and approvals for every paid ad on a card, replacing my.9x12ads.net.
   Pick a card, then for each ad: upload a proof (or email the advertiser an upload link), email the approval link from
   Zoho, and watch it come back approved or with changes. When every paid ad is approved, download one zip for the
   printer (each ad named by spot, plus spots.csv). Data and files live in the reservations Worker:
   GET /api/admin/ads/summary, GET /api/admin/ads?route&mail, POST /api/admin/ads {id, op}, GET /api/admin/ads/file,
   GET /api/admin/ads/zip. Advertisers use approve.html (signed link). */
(function () {
  var HQ = window.HQ; if (!HQ) return;
  var esc = HQ.esc, API = HQ.SPOTS, KEY = HQ.key, FROM = "todd@coachellavalleyspotlight.com";
  var ST = {
    "needs-art": { t: "Needs artwork", c: "av-red", todo: 1 },
    "art-requested": { t: "Waiting on their art", c: "av-gold" },
    "art-received": { t: "Their art came in", c: "av-blue", todo: 1 },
    "proof-ready": { t: "Proof ready to send", c: "av-blue", todo: 1 },
    "proof-sent": { t: "Waiting on approval", c: "av-gold" },
    "changes": { t: "Changes requested", c: "av-red", todo: 1 },
    "approved": { t: "Approved", c: "av-green" }
  };
  var cards = [], cur = null, data = null, showHeld = false, busy = {};

  var box = document.createElement("div"); box.id = "advertisers-admin";
  (document.getElementById("st-out")).before(box);

  function ymd(s) { var p = String(s || "").split("-"); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function days(s) { var t = new Date(); t.setHours(0, 0, 0, 0); return Math.round((ymd(s) - t) / 864e5); }
  function short(s) { return s ? ymd(s).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : ""; }
  function long(s) { return s ? ymd(s).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }) : ""; }
  function when(iso) { if (!iso) return ""; var d = new Date(iso); return d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) + ", " + d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }); }
  function ck(c) { return c.route + "|" + c.mail; }
  function fileUrl(id, n, dl) { return API + "/api/admin/ads/file?id=" + encodeURIComponent(id) + "&v=" + n + "&key=" + encodeURIComponent(KEY) + (dl ? "&dl=1" : ""); }
  function latest(a) { return a.versions && a.versions.length ? a.versions[a.versions.length - 1] : null; }
  function spotTxt(a) { return (data.card.format === "9x12" ? "" : a.labels.length > 1 ? "Spots " : "Spot ") + a.labels.join(" + "); }
  function first(n) { return String(n || "").trim().split(/\s+/)[0] || "there"; }
  function zoho(to, su, body) { return "https://mail.zoho.com/zm/comp.do?ct=" + encodeURIComponent("mailto:" + (to ? encodeURIComponent(to) : "") + "?subject=" + encodeURIComponent(su) + "&body=" + encodeURIComponent(body)); }
  function sig() { return "\n\nThanks,\nTodd\nCoachella Valley Spotlight\n(760) 422-5475"; }
  function proofMail(a) {
    var c = data.card, su = "Your ad proof: " + a.business + " on the " + c.name + " postcard";
    var body = "Hi " + first(a.name) + ",\n\nHere's the proof of your ad for the " + c.name + " postcard. It mails " + long(c.mail) + (c.homes ? " to " + c.homes : "") + ".\n\n" + a.link +
      "\n\nTake a look. If it's right, click Approve. If anything needs to change, click Request changes and tell me what to fix.\n\nI need your OK by " + long(c.deadline) + " so it makes it to the printer." + sig();
    return zoho(a.email, su, body);
  }
  function artMail(a) {
    var c = data.card, su = "Artwork for your ad on the " + c.name + " postcard";
    var body = "Hi " + first(a.name) + ",\n\nThanks again for your spot on the " + c.name + " postcard (mails " + long(c.mail) + ").\n\nIf you have your own ad ready, you can upload it here:\n" + a.uploadLink +
      "\n\nYour ad is " + a.spec.text + ", which is " + a.spec.pxW + " x " + a.spec.pxH + " pixels at 300 dpi. A PNG, JPG or PDF works.\n\nNo artwork? No problem. Reply with your logo and the offer you want to run, and I'll design it for you.\n\nPlease send it by " + long(c.deadline) + "." + sig();
    return zoho(a.email, su, body);
  }

  // ---- loading ----
  function loadSummary() {
    return fetch(API + "/api/admin/ads/summary?key=" + encodeURIComponent(KEY)).then(function (r) { return r.json(); }).then(function (d) {
      if (d.error) throw new Error(d.error);
      cards = d.cards || [];
      // Default: the next card whose artwork deadline hasn't passed and has a paid ad (a card already at the printer isn't the one to work on).
      var open = cards.filter(function (c) { return c.paid && days(c.deadline) >= 0; });
      if (!cur || !cards.some(function (c) { return ck(c) === ck(cur); })) cur = open[0] || cards.filter(function (c) { return c.paid; })[0] || cards[0] || null;
    });
  }
  function loadCard() {
    if (!cur) { data = null; draw(); return Promise.resolve(); }
    return fetch(API + "/api/admin/ads?route=" + encodeURIComponent(cur.route) + "&mail=" + encodeURIComponent(cur.mail) + "&key=" + encodeURIComponent(KEY))
      .then(function (r) { return r.json(); }).then(function (d) { if (d.error) throw new Error(d.error); data = d; draw(); });
  }
  function refresh() {
    box.innerHTML = box.innerHTML || '<div class="empty">Loading advertisers&hellip;</div>';
    return loadSummary().then(loadCard).catch(function (e) { box.innerHTML = '<p class="risk">Couldn&rsquo;t load advertisers: ' + esc(e.message) + "</p>"; });
  }
  function act(id, op, extra) {
    busy[id] = 1; draw();
    var body = { id: id, op: op }; Object.keys(extra || {}).forEach(function (k) { body[k] = extra[k]; });
    return HQ.post(API, "/api/admin/ads", body).then(function (d) {
      delete busy[id];
      data.ads = data.ads.map(function (a) { return a.id === id ? d.ad : a; });
      var c = cards.filter(function (x) { return ck(x) === ck(cur); })[0];
      if (c) { c.counts = {}; data.ads.forEach(function (a) { if (a.paid) c.counts[a.status] = (c.counts[a.status] || 0) + 1; }); }
      draw(); return d.ad;
    }).catch(function (e) { delete busy[id]; draw(); HQ.toast(e.message); throw e; });
  }

  // ---- drawing ----
  function todoOf(counts) { var n = 0; Object.keys(counts || {}).forEach(function (s) { if (ST[s] && ST[s].todo) n += counts[s]; }); return n; }
  function draw() {
    // The badge counts only cards still taking artwork (deadline today or later).
    var todo = cards.reduce(function (n, c) { return n + (days(c.deadline) >= 0 ? todoOf(c.counts) : 0); }, 0);
    if (!cards.length) { box.innerHTML = '<p class="risk">No card that hasn&rsquo;t mailed has a sold or held spot yet. Paid ads show up here as soon as a spot is marked Sold on the Postcard board.</p><span data-todo hidden>0</span>'; return; }
    var pick = '<label class="av-pick"><span>Card</span><select data-av="card">' + cards.map(function (c) {
      var ap = (c.counts && c.counts.approved) || 0;
      return '<option value="' + esc(ck(c)) + '"' + (cur && ck(c) === ck(cur) ? " selected" : "") + ">" + esc(c.name) + " · mails " + short(c.mail) + " · " + ap + " of " + c.paid + " approved" + (days(c.deadline) < 0 ? " (artwork deadline passed)" : "") + "</option>";
    }).join("") + "</select></label>";
    if (!data) { box.innerHTML = pick + '<div class="empty">Loading&hellip;</div><span data-todo hidden>' + todo + "</span>"; return; }
    var c = data.card, paid = data.ads.filter(function (a) { return a.paid; }), held = data.ads.filter(function (a) { return !a.paid; });
    var ap = paid.filter(function (a) { return a.status === "approved"; }).length, dl = days(c.deadline), allOk = paid.length && ap === paid.length;
    var due = dl < 0 ? '<b class="neg">artwork was due ' + long(c.deadline) + "</b>" : dl === 0 ? '<b class="neg">artwork due today</b>' : "artwork due " + long(c.deadline) + " (" + dl + " day" + (dl === 1 ? "" : "s") + ")";
    var rows = paid.concat(showHeld ? held : []);
    box.innerHTML = '<div class="av-tools">' + pick +
      (held.length ? '<label class="av-held"><input type="checkbox" data-av="held"' + (showHeld ? " checked" : "") + "> Show " + held.length + " held (not paid)</label>" : "") +
      '<button type="button" class="hq-btn ' + (allOk ? "green" : "ghost") + '" data-av="zip">Download print files</button></div>' +
      '<p class="av-sum"><b>' + ap + " of " + paid.length + "</b> paid ads approved · " + due + " · mails " + long(c.mail) + (c.homes ? " · " + esc(c.homes) : "") + "</p>" +
      (rows.length ? '<div class="av-list">' + rows.map(row).join("") + "</div>" : '<p class="risk">No paid ads on this card yet.</p>') +
      '<span data-todo hidden>' + todo + "</span>";
  }
  function row(a) {
    var s = ST[a.status] || ST["needs-art"], v = latest(a), b = busy[a.id];
    var last = (a.events && a.events.length) ? a.events[a.events.length - 1] : null;
    var thumb = v ? (v.mime === "application/pdf" ? '<a class="av-thumb av-pdf" href="' + fileUrl(a.id, v.n) + '" target="_blank" rel="noopener">PDF</a>' : '<a class="av-thumb" href="' + fileUrl(a.id, v.n) + '" target="_blank" rel="noopener"><img src="' + fileUrl(a.id, v.n) + '" alt="" loading="lazy"></a>') : '<div class="av-thumb av-none">No art</div>';
    var warn = v && v.warn ? '<p class="av-warn">' + esc(v.warn) + "</p>" : "";
    var ch = a.status === "changes" && a.changes ? '<p class="av-changes"><b>They asked:</b> ' + esc(a.changes.note) + "</p>" : "";
    var appr = a.status === "approved" && a.approved ? '<p class="av-ok">Approved by ' + esc(a.approved.by) + " · " + when(a.approved.at) + " · v" + a.approved.v + "</p>" : "";
    var btn = function (op, label, cls) { return '<button type="button" class="hq-btn sm ' + (cls || "ghost") + '" data-op="' + op + '" data-id="' + esc(a.id) + '"' + (b ? " disabled" : "") + ">" + label + "</button>"; };
    var main = !v ? btn("upload", "Upload proof", "accent") + btn("ask", "Ask for their artwork") :
      a.status === "approved" ? btn("upload", "Upload new version") :
      btn("send", a.status === "proof-sent" ? "Email proof again" : "Email proof", a.status === "proof-sent" ? "ghost" : "accent") + btn("upload", "Upload new version");
    return '<div class="av-row' + (a.paid ? "" : " av-heldrow") + '">' + thumb +
      '<div class="av-main"><div class="av-top"><strong>' + esc(a.business || "(no name)") + '</strong><span class="av-chip ' + s.c + '">' + s.t + "</span>" + (a.paid ? "" : '<span class="av-chip av-grey">Held, not paid</span>') + "</div>" +
      '<p class="av-meta">' + esc(spotTxt(a)) + (a.category ? " · " + esc(a.category) : "") + " · " + esc(a.spec.text) + " (" + a.spec.pxW + " × " + a.spec.pxH + " px)" + (a.email ? " · " + esc(a.email) : ' · <span class="neg">no email on file</span>') + "</p>" +
      warn + ch + appr + (last ? '<p class="av-last">' + esc(last.what) + " · " + when(last.at) + "</p>" : "") +
      '<div class="av-btns">' + main + btn("copy", "Copy link") + (v && a.status !== "approved" ? btn("approve", "Mark approved") : "") + btn("history", "History") + "</div></div></div>";
  }

  // ---- actions ----
  var picker = document.createElement("input"); picker.type = "file"; picker.accept = ".png,.jpg,.jpeg,.pdf,image/png,image/jpeg,application/pdf"; picker.hidden = true; document.body.appendChild(picker);
  var pickFor = null;
  picker.addEventListener("change", function () {
    var f = picker.files && picker.files[0], id = pickFor; picker.value = ""; if (!f || !id) return;
    if (f.size > 20 * 1024 * 1024) { HQ.toast("That file is over 20 MB."); return; }
    var rd = new FileReader();
    rd.onload = function () {
      HQ.toast("Uploading " + f.name + "…");
      act(id, "upload", { data: String(rd.result), filename: f.name }).then(function (ad) { var v = latest(ad); HQ.toast(v && v.warn ? "Uploaded, but check it: " + v.warn : "Uploaded v" + v.n + ". Now email the proof."); });
    };
    rd.readAsDataURL(f);
  });
  function adOf(id) { return data.ads.filter(function (a) { return a.id === id; })[0]; }
  function needEmail(a) { if (a.email) return true; HQ.toast("No email on file for " + a.business + ". Add it on the Postcard board (click the spot)."); return false; }
  box.addEventListener("change", function (e) {
    var t = e.target;
    if (t.dataset.av === "card") { cur = cards.filter(function (c) { return ck(c) === t.value; })[0]; data = null; draw(); loadCard().catch(function (er) { HQ.toast(er.message); }); }
    if (t.dataset.av === "held") { showHeld = t.checked; draw(); }
  });
  box.addEventListener("click", function (e) {
    var z = e.target.closest('[data-av="zip"]');
    if (z) {
      var paid = data.ads.filter(function (a) { return a.paid; }), notOk = paid.filter(function (a) { return a.status !== "approved"; });
      if (notOk.length && !confirm(notOk.length + " paid ad" + (notOk.length === 1 ? " isn't" : "s aren't") + " approved yet (" + notOk.map(function (a) { return a.business; }).join(", ") + "). Download the approved ones anyway? The zip lists what's missing in MISSING.txt.")) return;
      location.href = API + "/api/admin/ads/zip?route=" + encodeURIComponent(data.card.route) + "&mail=" + encodeURIComponent(data.card.mail) + "&key=" + encodeURIComponent(KEY);
      return;
    }
    var b = e.target.closest("[data-op]"); if (!b) return;
    var a = adOf(b.dataset.id), op = b.dataset.op; if (!a) return;
    if (op === "upload") { pickFor = a.id; picker.click(); }
    if (op === "send") { if (!needEmail(a)) return; window.open(proofMail(a), "_blank", "noopener"); act(a.id, "sent").then(function () { HQ.toast("Marked as emailed. Send the draft in Zoho."); }); }
    if (op === "ask") { if (!needEmail(a)) return; window.open(artMail(a), "_blank", "noopener"); act(a.id, "asked").then(function () { HQ.toast("Marked as asked. Send the draft in Zoho."); }); }
    if (op === "copy") { var l = a.latest || latest(a) ? a.link : a.uploadLink; (navigator.clipboard ? navigator.clipboard.writeText(l) : Promise.reject()).then(function () { HQ.toast("Link copied" + (latest(a) ? " (approval page)" : " (upload page)")); }, function () { prompt("Copy this link:", l); }); }
    if (op === "approve") approveDrawer(a);
    if (op === "history") history(a);
  });
  function approveDrawer(a) {
    var v = latest(a);
    HQ.drawer({ eyebrow: "Mark approved", title: a.business, sub: "Use this when they approved by phone, text or email instead of the link. It approves v" + v.n + ".",
      body: '<label class="hq-f"><span>How did they approve?</span><input data-k="note" placeholder="e.g. by text, Nov 22"></label>',
      foot: '<button type="button" class="hq-btn green" data-go>Mark v' + v.n + " approved</button>",
      onOpen: function (d, api) { d.querySelector("[data-go]").onclick = function () { act(a.id, "approve", { note: d.querySelector('[data-k="note"]').value }).then(function () { api.close(); HQ.toast("Approved."); }); }; } });
  }
  function history(a) {
    var vs = (a.versions || []).slice().reverse(), evs = (a.events || []).slice().reverse();
    var vh = vs.length ? vs.map(function (v) {
      var tag = a.approved && a.approved.v === v.n ? ' <span class="av-chip av-green">Approved</span>' : "";
      var size = v.w ? v.w + " × " + v.h + " px" : v.wIn ? v.wIn + "″ × " + v.hIn + "″" : "";
      return '<div class="av-ver">' + (v.mime === "application/pdf" ? '<span class="av-thumb av-pdf">PDF</span>' : '<img class="av-thumb" src="' + fileUrl(a.id, v.n) + '" alt="">') +
        "<div><b>v" + v.n + "</b>" + tag + '<p class="av-meta">' + (v.by === "advertiser" ? "From the advertiser" : "Uploaded by Todd") + " · " + when(v.at) + " · " + esc(size) + " · " + Math.round(v.bytes / 1024) + " KB" + (v.file ? " · " + esc(v.file) : "") + "</p>" +
        (v.warn ? '<p class="av-warn">' + esc(v.warn) + "</p>" : "") + (v.note ? '<p class="av-meta">' + esc(v.note) + "</p>" : "") +
        '<p><a href="' + fileUrl(a.id, v.n, 1) + '">Download</a> · <a href="#" data-del="' + v.n + '">Delete</a></p></div></div>';
    }).join("") : '<p class="av-meta">No artwork yet.</p>';
    var eh = evs.length ? "<ul class=\"av-evs\">" + evs.map(function (x) { return "<li><b>" + esc(x.what) + "</b> · " + when(x.at) + (x.note ? "<br><span>" + esc(x.note) + "</span>" : "") + "</li>"; }).join("") + "</ul>" : '<p class="av-meta">Nothing yet.</p>';
    HQ.drawer({ eyebrow: "Artwork history", title: a.business, sub: esc(spotTxt(a)) + " · " + esc(a.spec.text),
      body: '<h3 class="av-h">Versions</h3>' + vh + '<h3 class="av-h">What happened</h3>' + eh +
        '<h3 class="av-h">Links</h3><p class="av-meta">Approval page: <a href="' + esc(a.link) + '" target="_blank" rel="noopener">open</a> · Upload page: <a href="' + esc(a.uploadLink) + '" target="_blank" rel="noopener">open</a></p>',
      foot: (a.status === "approved" ? '<button type="button" class="hq-btn ghost" data-x="reopen">Clear approval</button>' : "") + '<button type="button" class="hq-btn ghost" data-x="newlink">New link (old ones stop working)</button>',
      onOpen: function (d, api) {
        d.addEventListener("click", function (e) {
          var del = e.target.closest("[data-del]");
          if (del) { e.preventDefault(); if (!confirm("Delete v" + del.dataset.del + "? This can't be undone.")) return; act(a.id, "delversion", { v: +del.dataset.del }).then(function (ad) { api.close(); history(ad); }); return; }
          var x = e.target.closest("[data-x]"); if (!x) return;
          if (x.dataset.x === "newlink" && !confirm("Make a new link? Any link you already emailed will stop working.")) return;
          act(a.id, x.dataset.x).then(function (ad) { api.close(); HQ.toast(x.dataset.x === "newlink" ? "New link made. Copy it or email the proof again." : "Approval cleared."); history(ad); });
        });
      } });
  }

  // Load when the section is first opened (or right away if the page opens on it), and again each time it's opened.
  var loaded = false;
  function onHash() { if (location.hash === "#advertisers") { if (!loaded) { loaded = true; refresh(); } else refresh(); } }
  window.addEventListener("hashchange", onHash);
  // The nav badge needs the summary, so fetch it once at load without the card details.
  loadSummary().then(function () { if (location.hash === "#advertisers") { loaded = true; return loadCard(); } draw(); }).catch(function () {});
  HQ.advertisers = { refresh: refresh };
})();
