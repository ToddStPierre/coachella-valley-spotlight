/* Admin: the postcard QR code for any listing. "QR code" in the listings table (stats.html, admin mode) opens the
   code for https://coachellavalleyspotlight.com/s?b=<slug> with Download SVG (for print), Download PNG and Copy link.
   Same settings as 04-live/postcard-qr/make-qr.mjs: error correction Q, a 4-module white quiet zone, black on white.
   The QR library (assets/vendor/qrcode-generator-1.4.4.js, MIT) loads on the first click only. */
(function () {
  var BASE = "https://coachellavalleyspotlight.com/s?b=", QUIET = 4, lib = null;
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
  function close() { var o = document.querySelector(".qr-backdrop"); if (o) { o.remove(); document.removeEventListener("keydown", onKey); } }
  function onKey(e) { if (e.key === "Escape") close(); }

  function open(slug, name) {
    close();
    var url = BASE + slug, deal = dealFor(slug);
    var o = document.createElement("div"); o.className = "qr-backdrop";
    o.innerHTML = '<div class="qr-modal" role="dialog" aria-modal="true" aria-labelledby="qr-title"><button type="button" class="qr-x" aria-label="Close">&times;</button>' +
      '<h3 id="qr-title">' + esc(name) + '</h3><p class="qr-sub">Postcard QR code</p><div class="qr-img">Making the code&hellip;</div>' +
      '<p class="qr-link"><code>' + esc(url) + '</code></p>' +
      '<p class="qr-note">' + (deal ? "A scan opens their page with their deal ready to claim: <b>" + esc(deal) + "</b>." : "No deal yet, so a scan opens their page. Add an offer to their listing (or the deals list) and the scan opens a deal ticket.") +
      " Scans show on their dashboard and Spotlight Report as <b>QR scans</b>.</p>" +
      '<div class="qr-btns"><button type="button" class="btn" data-qr-svg disabled>Download SVG (print)</button><button type="button" class="btn btn-ghost" data-qr-png disabled>Download PNG</button><button type="button" class="btn btn-ghost" data-qr-copy>Copy link</button></div>' +
      '<p class="qr-tip">For the designer: at least 0.8 in square, keep the white border, black on white, nothing on top of it.</p></div>';
    document.body.appendChild(o);
    document.addEventListener("keydown", onKey);
    o.addEventListener("click", function (e) {
      if (e.target === o || e.target.closest(".qr-x")) return close();
      if (e.target.closest("[data-qr-copy]")) { navigator.clipboard.writeText(url); e.target.textContent = "Copied"; }
    });
    o.querySelector(".qr-x").focus();
    load().then(function (q) {
      var qr = matrix(q, url), svg = svgFor(qr);
      o.querySelector(".qr-img").innerHTML = svg;
      var sb = o.querySelector("[data-qr-svg]"), pb = o.querySelector("[data-qr-png]");
      sb.disabled = pb.disabled = false;
      sb.addEventListener("click", function () { save(new Blob([svg], { type: "image/svg+xml" }), slug + "-qr.svg"); });
      pb.addEventListener("click", function () { pngFor(qr, 1200).toBlob(function (b) { save(b, slug + "-qr.png"); }, "image/png"); });
    }).catch(function (err) { o.querySelector(".qr-img").textContent = err.message; });
  }

  document.addEventListener("click", function (e) {
    var a = e.target.closest("[data-qr]"); if (!a) return;
    e.preventDefault(); open(a.getAttribute("data-qr"), a.getAttribute("data-qr-name") || a.getAttribute("data-qr"));
  });
  window.CVS_QR = { svg: function (url) { return load().then(function (q) { return svgFor(matrix(q, url)); }); } }; // for testing
})();
