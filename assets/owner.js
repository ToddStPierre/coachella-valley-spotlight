/* Owner dashboard: edit your own listing. Link = owner.html?b=<slug>&key=<dashboard key> */
(function () {
  var API = "https://cvs-tracker.toddstpierre.workers.dev";
  var q = new URLSearchParams(location.search), slug = q.get("b") || "", key = q.get("key") || "";
  var out = document.getElementById("ow-out");
  var flash = "";
  var LABELS = [["impression", "Listing seen", "Times your listing showed up on someone's screen"], ["profile", "Profile views", "Visits to your profile page"], ["call", "Calls tapped", "Taps on your phone number"], ["website", "Website visits", "Clicks through to your website"]];
  function monthName(ym) { var p = ym.split("-"); return new Date(+p[0], +p[1] - 1, 1).toLocaleString("en-US", { month: "long", year: "numeric" }); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function fail(m) { out.innerHTML = '<div class="empty">' + m + '</div>'; }
  if (!slug || !key) return fail("This page needs the private dashboard link we sent you.");

  // Formspree drops emails sent from the tracker's servers, so the browser sends the tracker's email notice.
  function mailTodd(n) { if (!n) return; var fd = new FormData(); Object.keys(n).forEach(function (k) { if (n[k] != null) fd.append(k, String(n[k])); }); fetch("https://formspree.io/f/myezyype", { method: "POST", headers: { Accept: "application/json" }, body: fd }).catch(function () {}); }
  function post(path, body) {
    body.b = slug; body.key = key;
    return fetch(API + path, { method: "POST", body: JSON.stringify(body) })
      .then(function (r) { return r.json().then(function (d) { if (!r.ok) throw new Error(d.error || "Something went wrong."); mailTodd(d.notice); return d; }); });
  }

  function tiles(set) {
    return '<div class="stats" style="margin-bottom:12px">' + LABELS.map(function (l) { return '<div class="stat"><b>' + (set[l[0]] || 0).toLocaleString() + '</b><span>' + l[1] + '</span></div>'; }).join("") + '</div>';
  }

  function field(name, label, value, opts) {
    opts = opts || {};
    var input = opts.area
      ? '<textarea name="' + name + '" maxlength="' + opts.max + '" rows="' + (opts.rows || 3) + '">' + esc(value) + '</textarea>'
      : '<input name="' + name + '" type="' + (opts.type || "text") + '" maxlength="' + opts.max + '" value="' + esc(value) + '"' + (opts.ph ? ' placeholder="' + esc(opts.ph) + '"' : '') + '>';
    return '<label class="' + (opts.full ? "full" : "") + '">' + label + input + (opts.help ? '<small class="ow-help">' + opts.help + '</small>' : '') + '</label>';
  }

  function render(d) {
    var L = d.listing;
    document.getElementById("ow-title").textContent = L.name;
    document.getElementById("ow-sub").innerHTML = "Hi " + esc(d.owner.name || "there") + ". Update your listing below. Changes go live on the site in about a minute. <a href=\"business/" + esc(L.slug) + "/\" target=\"_blank\" rel=\"noopener\">View your public page &rarr;</a>";
    var html = '';
    html += '<p class="meta" style="font-family:var(--mono);font-size:13px;margin:0 0 8px">' + esc(L.category) + ' &middot; ' + esc(L.city) + ' &middot; ' + (L.premium ? '<span style="color:#7a4a00">PREMIUM LISTING</span>' : 'BASIC LISTING') + '</p>';

    if (L.premium && d.stats) {
      var S = d.stats, months = Object.keys(S.months || {}).sort().reverse();
      html += '<h2 class="month-head"><span class="stripe-mini"></span>Your numbers: ' + monthName(S.labels.thisMonth) + ' so far</h2>' + tiles(S.thisMonth);
      html += '<h2 class="month-head"><span class="stripe-mini"></span>' + monthName(S.labels.lastMonth) + '</h2>' + tiles(S.lastMonth);
      html += '<h2 class="month-head"><span class="stripe-mini"></span>Last 30 days</h2>' + tiles(S.last30);
      if (months.length) html += '<details style="margin:8px 0 16px"><summary style="cursor:pointer;font-weight:600">Month by month</summary><div class="table-scroll" style="margin-top:12px"><table class="stats-table"><thead><tr><th>Month</th>' + LABELS.map(function (l) { return "<th>" + l[1] + "</th>"; }).join("") + '</tr></thead><tbody>' +
        months.map(function (m) { return "<tr><td>" + monthName(m) + "</td>" + LABELS.map(function (l) { return "<td>" + (S.months[m][l[0]] || 0) + "</td>"; }).join("") + "</tr>"; }).join("") + '</tbody></table></div></details>';
      html += '<details style="margin:0 0 8px"><summary style="cursor:pointer;font-weight:600">What these numbers mean</summary><dl class="facts" style="margin-top:12px">' + LABELS.map(function (l) { return "<dt>" + l[1] + "</dt><dd>" + l[2] + "</dd>"; }).join("") + '</dl>' +
        '<p class="risk">Counts come from this site only. Bots and people who block tracking are not counted, so real numbers run a little higher. Times are Pacific.</p></details>';
    }

    html += '<h2 class="month-head"><span class="stripe-mini"></span>Your details</h2><div class="card" style="padding:28px"><form class="form" id="ow-form">';
    html += field("blurb", "Short description (shows on the directory card)", L.blurb, { full: true, area: true, max: 220, rows: 2, help: "Up to 220 characters." });
    html += field("phone", "Phone", L.phone, { type: "tel", max: 25 });
    html += field("url", "Website", L.url, { max: 200, ph: "yourbusiness.com" });
    html += field("address", "Address (optional)", L.address, { full: true, max: 150 });
    if (L.premium) {
      html += field("about", "About your business (shows on your profile page)", L.about, { full: true, area: true, max: 900, rows: 5, help: "Up to 900 characters." });
      html += field("hours", "Hours", L.hours, { full: true, max: 160, ph: "Mon to Fri 8 AM to 5 PM, Sat 9 AM to 1 PM" });
      html += '<fieldset class="full ow-offer"><legend>Special offer (shows on your listing and the Deals page)</legend>' +
        field("offer_title", "Offer headline", L.offer.title, { max: 60, ph: "10% off your first visit" }) +
        field("offer_expires", "Ends on (optional)", L.offer.expires, { type: "date", max: 10 }) +
        field("offer_details", "Fine print", L.offer.details, { full: true, max: 220, ph: "New customers only. Mention Coachella Valley Spotlight." }) +
        '<small class="ow-help full">Clear the headline to remove the offer.</small></fieldset>';
    }
    html += '<div class="full"><button class="btn" type="submit">Save changes</button></div><p class="form-status" id="ow-msg" role="status"></p></form></div>';

    if (L.premium) {
      html += '<h2 class="month-head"><span class="stripe-mini"></span>Photos</h2><div class="card" style="padding:28px">' +
        '<p style="margin-top:0">Up to 8 photos for your profile page. Big photos are resized automatically.</p>' +
        '<div class="ow-photos" id="ow-photos">' + (L.gallery.length ? L.gallery.map(function (g) {
          return '<figure><img src="' + esc(g) + '" alt="" onerror="this.closest(\'figure\').classList.add(\'ow-pending\')"><button type="button" class="btn btn-ghost" data-del="' + esc(g) + '">Remove</button></figure>';
        }).join("") : '<p class="risk">No photos yet.</p>') + '</div>' +
        (L.gallery.length < 8 ? '<label class="btn btn-ghost" style="margin-top:12px">Add a photo<input type="file" id="ow-file" accept="image/jpeg,image/png,image/webp" hidden></label>' : '') +
        '<p class="form-status" id="ow-photo-msg" role="status">' + esc(flash) + '</p></div>';
      flash = "";
    } else {
      html += '<div class="biz-band" style="margin-top:32px"><p style="color:#fff"><strong>Want photos, hours, a special offer and monthly stats?</strong><br>Founding Premium is $19 a month (regularly $29), or free while you&rsquo;re on a Spotlight postcard.</p><a class="btn" href="advertise.html#plans">See Premium</a></div>';
    }
    out.innerHTML = html;
    wire(L);
  }

  function wire(L) {
    var form = document.getElementById("ow-form"), msg = document.getElementById("ow-msg");
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var btn = form.querySelector("button[type=submit]"); btn.disabled = true; msg.textContent = "Saving…";
      var f = { blurb: form.blurb.value, phone: form.phone.value, url: form.url.value, address: form.address.value };
      if (L.premium) { f.about = form.about.value; f.hours = form.hours.value; f.offer = { title: form.offer_title.value, details: form.offer_details.value, expires: form.offer_expires.value }; }
      post("/owner/update", { fields: f }).then(function (d) {
        msg.textContent = d.changed.length ? "Saved! Your page updates in about a minute." : "No changes to save.";
        btn.disabled = false;
      }).catch(function (err) { msg.textContent = err.message; btn.disabled = false; });
    });

    var photoMsg = document.getElementById("ow-photo-msg");
    document.querySelectorAll("[data-del]").forEach(function (b) {
      b.addEventListener("click", function () {
        b.disabled = true; photoMsg.textContent = "Removing…";
        post("/owner/photo/delete", { path: b.getAttribute("data-del") }).then(function () { flash = "Removed."; reload(); }).catch(function (err) { photoMsg.textContent = err.message; b.disabled = false; });
      });
    });
    var file = document.getElementById("ow-file");
    if (file) file.addEventListener("change", function () {
      var f = file.files[0]; if (!f) return;
      photoMsg.textContent = "Uploading…";
      shrink(f).then(function (b64) { return post("/owner/photo", { data: b64 }); })
        .then(function () { flash = "Added! It shows on your page in about a minute."; reload(); })
        .catch(function (err) { photoMsg.textContent = err.message || "That photo didn’t upload."; });
    });
  }

  // Resize to at most 1600px wide/tall and re-encode as JPEG, so uploads stay small.
  function shrink(file) {
    return new Promise(function (resolve, reject) {
      var img = new Image(), url = URL.createObjectURL(file);
      img.onload = function () {
        var s = Math.min(1, 1600 / Math.max(img.width, img.height)), c = document.createElement("canvas");
        c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        resolve(c.toDataURL("image/jpeg", 0.82).split(",")[1]);
      };
      img.onerror = function () { reject(new Error("That file isn’t a photo we can read. Try a JPG or PNG.")); };
      img.src = url;
    });
  }

  function reload() {
    fetch(API + "/owner?b=" + encodeURIComponent(slug) + "&key=" + encodeURIComponent(key))
      .then(function (r) { return r.json().then(function (d) { if (!r.ok) throw new Error(d.error); return d; }); })
      .then(render).catch(function (err) { fail(err.message || "Could not load your listing. Try again in a minute."); });
  }
  reload();
})();
