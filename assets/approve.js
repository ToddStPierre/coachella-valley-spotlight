/* Ad proof approval (2026-11-21). Link = approve.html?a=<ad id>&k=<signed key>[&mode=upload]
   The advertiser sees their ad, then approves it (types their name, ticks "OK to print") or asks for changes.
   With no proof yet (or mode=upload), they can upload their own artwork. Talks to the reservations Worker
   (/api/ad, /api/ad/file, /api/ad/respond, /api/ad/upload); Todd hears about it through Formspree (mailTodd). */
(function () {
  var API = "https://local-spotlight-reservations.toddstpierre.workers.dev";
  // Some mail apps rewrite "?a=" as "?a%3D"; read both.
  var raw = location.search.indexOf("%3D") > -1 ? decodeURIComponent(location.search) : location.search;
  var q = new URLSearchParams(raw), id = q.get("a") || "", k = q.get("k") || "", mode = q.get("mode") || "";
  var out = document.getElementById("ap-out"), title = document.getElementById("ap-title"), sub = document.getElementById("ap-sub");
  var st = null;
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function ymd(s) { var p = String(s || "").split("-"); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function long(s) { return s ? ymd(s).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }) : ""; }
  function when(iso) { var d = new Date(iso); return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) + " at " + d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }); }
  function fail(m) { out.innerHTML = '<div class="empty">' + m + "</div>"; }
  function mailTodd(n) { if (!n) return; var fd = new FormData(); Object.keys(n).forEach(function (x) { if (n[x] != null) fd.append(x, String(n[x])); }); fetch("https://formspree.io/f/myezyype", { method: "POST", headers: { Accept: "application/json" }, body: fd }).catch(function () {}); }
  function post(path, body) {
    body.a = id; body.k = k;
    return fetch(API + path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
      .then(function (r) { return r.json().then(function (d) { if (!r.ok || d.error) throw new Error(d.error || "That didn't go through. Please call Todd at (760) 422-5475."); mailTodd(d.notice); return d; }); });
  }
  if (!id || !k) return fail("This link is missing a piece. Please use the link from Todd's email, or call (760) 422-5475.");

  function fileUrl(n) { return API + "/api/ad/file?a=" + encodeURIComponent(id) + "&k=" + encodeURIComponent(k) + "&v=" + n; }
  function where() { var c = st.card; return esc(c.name) + " postcard · mails " + long(c.mail) + (c.homes ? " · " + esc(c.homes) : ""); }
  function spotTxt() { return (st.card.format === "9x12" ? "Spot " : st.labels.length > 1 ? "Spots " : "Spot ") + st.labels.join(" + "); }
  function proof() {
    var v = st.latest;
    if (v.mime === "application/pdf") return '<p><a class="btn" href="' + fileUrl(v.n) + '" target="_blank" rel="noopener">Open your ad (PDF)</a></p>';
    return '<a class="ap-proof" href="' + fileUrl(v.n) + '" target="_blank" rel="noopener"><img src="' + fileUrl(v.n) + '" alt="Proof of the ad for ' + esc(st.business) + '"></a><p class="ap-small">Tap the ad to see it full size. It prints at ' + esc(st.spec.text) + ".</p>";
  }
  function uploadForm(lead) {
    return '<form class="ap-box" id="ap-up"><h2>' + lead + "</h2>" +
      "<p>Your ad is <b>" + esc(st.spec.text) + "</b>. That&rsquo;s <b>" + st.spec.pxW + " x " + st.spec.pxH + " pixels</b> at 300 dpi, the resolution the printer needs. A PNG, JPG or PDF works, up to 20 MB.</p>" +
      '<label class="ap-f"><span>Your artwork</span><input type="file" name="file" accept=".png,.jpg,.jpeg,.pdf,image/png,image/jpeg,application/pdf" required></label>' +
      '<label class="ap-f"><span>Your name</span><input name="name" autocomplete="name"></label>' +
      '<label class="ap-f"><span>Anything Todd should know? (optional)</span><textarea name="note" rows="3"></textarea></label>' +
      '<button class="btn" type="submit">Send my artwork</button><p class="form-status" aria-live="polite"></p>' +
      '<p class="ap-small">No artwork? Just reply to Todd&rsquo;s email with your logo and the offer you want, and he&rsquo;ll design it for you.</p></form>';
  }
  function draw() {
    title.textContent = st.business ? "Your ad for " + st.business : "Your ad";
    sub.innerHTML = where() + "<br>" + esc(spotTxt()) + " · " + esc(st.spec.text);
    var due = st.card.deadline ? '<p class="ap-small">Todd needs your OK by <b>' + long(st.card.deadline) + "</b> so it makes it to the printer.</p>" : "";
    if (st.approved) {
      out.innerHTML = '<div class="ap-box ap-done"><h2>Approved. Thank you!</h2><p>Approved by ' + esc(st.approved.by) + " on " + when(st.approved.at) + ". It goes to the printer as you see it below.</p></div>" + (st.latest ? proof() : "") +
        '<p class="ap-small">Need a change after all? Call or text Todd at (760) 422-5475.</p>';
      return;
    }
    if (!st.latest || mode === "upload") {
      out.innerHTML = (st.latest && mode === "upload" ? '<p class="ap-small">Todd already has a proof for you. <a href="?a=' + encodeURIComponent(id) + "&k=" + encodeURIComponent(k) + '">See the proof</a> instead.</p>' : "") +
        uploadForm(st.status === "art-received" ? "Thanks, we have your artwork. Send a new file?" : "Send your ad artwork") + due;
      wireUpload(); return;
    }
    if (st.status === "art-received") {
      out.innerHTML = '<div class="ap-box ap-done"><h2>Got it, thanks!</h2><p>Todd will check your artwork and send you a proof to approve.</p></div>' + proof() +
        '<p class="ap-small"><a href="?a=' + encodeURIComponent(id) + "&k=" + encodeURIComponent(k) + '&mode=upload">Send a different file</a></p>';
      return;
    }
    var ch = st.status === "changes" && st.changes && st.changes.v === st.latest.n ? '<div class="ap-box ap-note"><p><b>Your change request is in:</b> ' + esc(st.changes.note) + "</p><p>Todd will send a new proof. You can still approve this one if you&rsquo;ve changed your mind.</p></div>" : "";
    out.innerHTML = ch + proof() + due +
      '<form class="ap-box" id="ap-yes"><h2>Looks good?</h2>' +
      '<label class="ap-f"><span>Your name</span><input name="name" autocomplete="name" required></label>' +
      '<label class="ap-check"><input type="checkbox" name="ok" required> I checked the spelling, phone number, offer and details, and it&rsquo;s OK to print.</label>' +
      '<button class="btn" type="submit">Approve my ad</button><p class="form-status" aria-live="polite"></p></form>' +
      '<form class="ap-box" id="ap-no"><h2>Need a change?</h2>' +
      '<label class="ap-f"><span>What should Todd fix?</span><textarea name="note" rows="4" required></textarea></label>' +
      '<label class="ap-f"><span>Your name (optional)</span><input name="name" autocomplete="name"></label>' +
      '<button class="btn btn-ghost" type="submit">Request changes</button><p class="form-status" aria-live="polite"></p></form>' +
      '<p class="ap-small">Would rather send your own artwork? <a href="?a=' + encodeURIComponent(id) + "&k=" + encodeURIComponent(k) + '&mode=upload">Upload it here</a>.</p>';
    wire("ap-yes", function (f) { return { decision: "approved", name: f.name.value, ok: f.ok.checked, v: st.latest.n }; });
    wire("ap-no", function (f) { return { decision: "changes", name: f.name.value, note: f.note.value, v: st.latest.n }; });
  }
  function wire(fid, build) {
    var f = document.getElementById(fid); if (!f) return;
    f.addEventListener("submit", function (e) {
      e.preventDefault();
      var s = f.querySelector(".form-status"), b = f.querySelector("button"); b.disabled = true; s.textContent = "Sending…";
      post("/api/ad/respond", build(f)).then(function (d) { st = d; draw(); window.scrollTo({ top: 0, behavior: "smooth" }); }).catch(function (er) { s.textContent = er.message; b.disabled = false; });
    });
  }
  function wireUpload() {
    var f = document.getElementById("ap-up"); if (!f) return;
    f.addEventListener("submit", function (e) {
      e.preventDefault();
      var s = f.querySelector(".form-status"), b = f.querySelector("button"), file = f.file.files[0];
      if (!file) { s.textContent = "Pick your artwork file first."; return; }
      if (file.size > 20 * 1024 * 1024) { s.textContent = "That file is over 20 MB. Please send a smaller one."; return; }
      b.disabled = true; s.textContent = "Uploading…";
      var rd = new FileReader();
      rd.onload = function () {
        post("/api/ad/upload", { data: String(rd.result), filename: file.name, name: f.name.value, note: f.note.value })
          .then(function (d) { st = d; mode = ""; draw(); if (d.warn) out.insertAdjacentHTML("afterbegin", '<div class="ap-box ap-note"><p><b>Heads up:</b> ' + esc(d.warn) + " Todd will check it with you.</p></div>"); window.scrollTo({ top: 0, behavior: "smooth" }); })
          .catch(function (er) { s.textContent = er.message; b.disabled = false; });
      };
      rd.onerror = function () { s.textContent = "Couldn't read that file. Try again."; b.disabled = false; };
      rd.readAsDataURL(file);
    });
  }
  fetch(API + "/api/ad?a=" + encodeURIComponent(id) + "&k=" + encodeURIComponent(k))
    .then(function (r) { return r.json().then(function (d) { if (!r.ok || d.error) throw new Error(d.error || "Couldn't load your ad."); return d; }); })
    .then(function (d) { st = d; draw(); })
    .catch(function (e) { fail(esc(e.message)); });
})();
