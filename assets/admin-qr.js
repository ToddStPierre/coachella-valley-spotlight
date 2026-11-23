/* Admin: the postcard QR code for any listing. "QR code" in the listings table (stats.html, admin mode) opens the
   code for https://coachellavalleyspotlight.com/s?b=<slug> with Download SVG (for print), Download PNG and Copy link.
   Same settings as 04-live/postcard-qr/make-qr.mjs: error correction Q, a 4-module white quiet zone, black on white.
   The QR library (assets/vendor/qrcode-generator-1.4.4.js, MIT) loads on the first click only.
   Per mailing (2026-11-22): pick the card and you get that ad's short code for that card, s?c=<5 characters>, from
   data/qr-codes.js, or a new one made by the tracker (POST /admin/qrcode commits it to that file). Short codes keep the
   printed QR small (33 x 33). Scans and leads then show per mailing. The old s?b=<slug> codes printed on the El Paseo
   Nov 27, 2026 card keep working unchanged; "Not for a postcard" still makes that kind of code.
   Our own codes (2026-11-23): CVS_QR.open("cvs-home" | "cvs-postcard") makes the home-page / postcard-page code for a card
   (buttons in Postcard results). The tracker allows those two reserved slugs without a listing. */
(function () {
  var BASE = "https://coachellavalleyspotlight.com/s?b=", SHORT = "https://coachellavalleyspotlight.com/s?c=", QUIET = 4, lib = null;
  var TRACKER = "https://cvs-tracker.toddstpierre.workers.dev";
  function adminKey() { var k = new URLSearchParams(location.search).get("admin"); if (!k) try { k = sessionStorage.getItem("cvs_admin"); } catch (e) {} return k || ""; }
  // The short code for this business on this card: from data/qr-codes.js, else the tracker makes one (and commits it).
  function codeFor(slug, mailing) {
    var list = window.CVS_QR_CODES = window.CVS_QR_CODES || [];
    var hit = list.filter(function (x) { return x.b === slug && x.m === mailing; })[0];
    if (hit) return Promise.resolve({ code: hit.c, created: false });
    return fetch(TRACKER + "/admin/qrcode", { method: "POST", body: JSON.stringify({ key: adminKey(), b: slug, m: mailing }) })
      .then(function (r) { return r.json().then(function (d) { if (!r.ok) throw new Error(d.error || "Couldn't make the code."); return d; }); })
      .then(function (d) { list.push({ c: d.code, b: slug, m: mailing }); return d; });
  }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function load() {
    return lib || (lib = new Promise(function (res, rej) {
      if (window.qrcode) return res(window.qrcode);
      var s = document.createElement("script"); s.src = "assets/vendor/qrcode-generator-1.4.4.js";
      s.onload = function () { res(window.qrcode); }; s.onerror = function () { lib = null; rej(new Error("The QR maker didn't load. Try again.")); };
      document.head.appendChild(s);
    }));
  }
  function matrix(q, url) { var qr = q(0, "Q"); qr.addData(url); qr.make(); return qr; }
  function svgFor(qr) {
    var n = qr.getModuleCount(), w = n + QUIET * 2, d = "";
    for (var r = 0; r < n; r++) for (var c = 0; c < n; c++) if (qr.isDark(r, c)) d += "M" + (c + QUIET) + " " + (r + QUIET) + "h1v1h-1z";
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + w + " " + w + '" width="' + w * 10 + '" height="' + w * 10 + '" shape-rendering="crispEdges"><rect width="' + w + '" height="' + w + '" fill="#fff"/><path d="' + d + '" fill="#000"/></svg>';
  }
  function pngFor(qr, size) {
    var n = qr.getModuleCount(), w = n + QUIET * 2, px = Math.floor(size / w), cv = document.createElement("canvas"), g = cv.getContext("2d");
    cv.width = cv.height = px * w; g.fillStyle = "#fff"; g.fillRect(0, 0, cv.width, cv.height); g.fillStyle = "#000";
    for (var r = 0; r < n; r++) for (var c = 0; c < n; c++) if (qr.isDark(r, c)) g.fillRect((c + QUIET) * px, (r + QUIET) * px, px, px);
    return cv;
  }
  function save(blob, name) { var a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000); }
  // What a scan will open: their deal ticket (listing offer, or a deals.js deal for them) or just their page.
  function dealFor(slug) {
    var b = ((window.CVS && window.CVS.directory) || []).filter(function (x) { return x.slug === slug; })[0] || {};
    var today = new Date().toISOString().slice(0, 10), live = function (e) { return !e || e >= today; };
    if ((b.premium || b.featured) && b.offer && b.offer.title && live(b.offer.expires)) return b.offer.title;
    var d = ((window.CVS && window.CVS.deals) || []).filter(function (x) { return (x.slug ? x.slug === slug : x.business === b.name) && live(x.expires); })[0];
    return d ? d.offer : "";
  }
  // Cards to choose from: every card in data/mailings.js. Nothing is picked for you (spots aren't linked to listings),
  // so a code for the wrong card can't be downloaded by accident.
  function cardList() {
    var today = new Date().toISOString().slice(0, 10);
    return ((window.CVS_MAILINGS) || []).slice().sort(function (a, z) { return a.mail.localeCompare(z.mail) || a.name.localeCompare(z.name); })
      .map(function (m) { return { key: m.route + ":" + m.mail, label: (window.CVS_MAILING_LABEL ? window.CVS_MAILING_LABEL(m.route + ":" + m.mail) : m.name + " " + m.mail), open: m.deadline >= today }; });
  }
  // Our own codes (2026-11-23): the home page and the postcard advertising page, one code per mailing, same as an ad.
  var HOUSE = { "cvs-home": "the home page", "cvs-postcard": "the postcard advertising section (advertise#postcard)" };
  function close() { var o = document.querySelector(".qr-backdrop"); if (o) { o.remove(); document.removeEventListener("keydown", onKey); } }
  function onKey(e) { if (e.key === "Escape") close(); }

  function open(slug, name, pick) {
    close();
    var cards = cardList(), chosen = pick != null;
    if (!chosen) pick = "";
    var house = HOUSE[slug], url = BASE + slug, deal = house ? "" : dealFor(slug), file = slug + (pick ? "-" + pick.replace(":", "-") : "") + "-qr";
    var o = document.createElement("div"); o.className = "qr-backdrop";
    o.innerHTML = '<div class="qr-modal" role="dialog" aria-modal="true" aria-labelledby="qr-title"><button type="button" class="qr-x" aria-label="Close">&times;</button>' +
      '<h3 id="qr-title">' + esc(name) + '</h3><p class="qr-sub">Postcard QR code</p>' +
      '<label class="qr-sub" style="display:block;margin:6px 0 10px">For which postcard? <select data-qr-card style="font:inherit;margin-left:4px;max-width:100%">' + (chosen ? "" : '<option value="" selected disabled>Choose the card&hellip;</option>') +
      cards.map(function (c) { return '<option value="' + esc(c.key) + '"' + (c.key === pick ? " selected" : "") + '>' + esc(c.label) + (c.open ? "" : " (artwork closed)") + '</option>'; }).join("") +
      '<option value="-"' + (chosen && !pick ? " selected" : "") + '>Not for a postcard (no mailing)</option></select></label>' +
      '<div class="qr-img">' + (chosen ? "Making the code&hellip;" : "Pick the postcard this ad is going on. Each card gets its own code.") + '</div>' +
      '<p class="qr-link"><code>' + esc(url) + '</code></p>' +
      '<p class="qr-note">' + (house ? "A scan opens " + house + ". Scans show in <b>Postcard results &rarr; Our own QR codes</b>" + (pick ? ", under this card only. Make a new code for each card." : ".") + "</p>" : (deal ? "A scan opens their page with their deal ready to claim: <b>" + esc(deal) + "</b>." : "No deal yet, so a scan opens their page. Add an offer to their listing (or the deals list) and the scan opens a deal ticket.") +
      " Scans show on their dashboard and Spotlight Report as <b>QR scans</b>" + (pick ? ", and under <b>By postcard mailing</b> for this card only. Make a new code for each card they&rsquo;re on." : ", not tied to any card.") + "</p>") +
      '<div class="qr-btns"><button type="button" class="btn" data-qr-svg disabled>Download SVG (print)</button><button type="button" class="btn btn-ghost" data-qr-png disabled>Download PNG</button><button type="button" class="btn btn-ghost" data-qr-copy>Copy link</button></div>' +
      '<p class="qr-tip">For the designer: at least 0.75 in square, keep the white border, black on white, nothing on top of it.</p></div>';
    document.body.appendChild(o);
    document.addEventListener("keydown", onKey);
    o.addEventListener("click", function (e) {
      if (e.target === o || e.target.closest(".qr-x")) return close();
      if (e.target.closest("[data-qr-copy]")) { navigator.clipboard.writeText(url); e.target.textContent = "Copied"; }
    });
    o.querySelector(".qr-x").focus();
    o.querySelector("[data-qr-card]").addEventListener("change", function (e) { open(slug, name, e.target.value === "-" ? "" : e.target.value); });
    if (!chosen) { o.querySelector(".qr-link").style.display = "none"; o.querySelector("[data-qr-copy]").disabled = true; return; }
    var made = pick ? codeFor(slug, pick) : Promise.resolve(null);
    Promise.all([load(), made]).then(function (r) {
      var q = r[0], d = r[1];
      if (d) {
        url = SHORT + d.code;
        o.querySelector(".qr-link code").textContent = url;
        if (d.created) o.querySelector(".qr-note").insertAdjacentHTML("afterbegin", "<b>New code " + esc(d.code) + ".</b> It starts working on scans in about a minute, once the site updates. ");
      }
      var qr = matrix(q, url), svg = svgFor(qr);
      o.querySelector(".qr-img").innerHTML = svg;
      var sb = o.querySelector("[data-qr-svg]"), pb = o.querySelector("[data-qr-png]");
      sb.disabled = pb.disabled = false;
      sb.addEventListener("click", function () { save(new Blob([svg], { type: "image/svg+xml" }), file + ".svg"); });
      pb.addEventListener("click", function () { pngFor(qr, 1200).toBlob(function (b) { save(b, file + ".png"); }, "image/png"); });
    }).catch(function (err) { o.querySelector(".qr-img").textContent = err.message; });
  }

  document.addEventListener("click", function (e) {
    var a = e.target.closest("[data-qr]"); if (!a) return;
    e.preventDefault(); open(a.getAttribute("data-qr"), a.getAttribute("data-qr-name") || a.getAttribute("data-qr"));
  });
  window.CVS_QR = { open: function (slug, name) { open(slug, name); }, svg: function (url) { return load().then(function (q) { return svgFor(matrix(q, url)); }); } }; // for testing
})();
