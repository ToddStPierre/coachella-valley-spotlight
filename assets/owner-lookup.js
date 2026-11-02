/* "Find your business" lookup for owners (home page band and for-business.html).
   An owner types their business name, sees their listing the way customers see it, and gets the
   next steps: claim it free, go Premium, get on the postcard. Not listed: add it free.
   Needs data/directory.js and assets/app.js (CVS_RENDER) loaded first. Markup: <div data-owner-lookup></div> */
(function () {
  var boxes = document.querySelectorAll("[data-owner-lookup]");
  if (!boxes.length) return;
  var D = (window.CVS && window.CVS.directory) || [], RENDER = window.CVS_RENDER || {}, ROOT = RENDER.root || "";
  var API = "https://local-spotlight-reservations.toddstpierre.workers.dev";
  var ROUTES = [["el-paseo", "El Paseo"], ["sun-city-palm-desert", "Sun City Palm Desert"]];
  var biz = D.filter(function (b) { return !b.public; });

  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function norm(s) { return String(s || "").toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim(); }
  function slug(b) { return b.slug || (RENDER.slugOf ? RENDER.slugOf(b) : ""); }
  function ga(n, p) { if (window.CVS_GA) window.CVS_GA(n, p); }

  // Name matches first (whole name, then word starts), then phone digits.
  function find(q) {
    var n = norm(q), digits = q.replace(/\D/g, "");
    if (n.length < 2 && digits.length < 4) return [];
    var words = n.split(" ");
    return biz.map(function (b) {
      var name = norm(b.name), s = 0;
      if (name === n) s = 100;
      else if (name.indexOf(n) === 0) s = 80;
      else if (name.indexOf(n) > -1) s = 60;
      else if (words.every(function (w) { return name.split(" ").some(function (x) { return x.indexOf(w) === 0; }); })) s = 50;
      else if (digits.length >= 4 && String(b.phone || "").replace(/\D/g, "").indexOf(digits) > -1) s = 40;
      return { b: b, s: s };
    }).filter(function (x) { return x.s; }).sort(function (a, z) { return z.s - a.s || a.b.name.length - z.b.name.length; }).slice(0, 6).map(function (x) { return x.b; });
  }

  function status(b) {
    if (b.postcard) return '<span class="ol-tag ol-gold">On the postcard</span>';
    if (b.premium) return '<span class="ol-tag ol-gold">Premium</span>';
    if (b.claimed) return '<span class="ol-tag ol-green">Claimed &#10003;</span>';
    return '<span class="ol-tag">Not claimed yet</span>';
  }

  var spots = null;
  function loadSpots(cb) {
    if (spots) return cb(spots);
    var out = {}, left = ROUTES.length;
    ROUTES.forEach(function (r) {
      fetch(API + "/api/spots?route=" + r[0]).then(function (x) { if (!x.ok) throw 0; return x.json(); }).then(function (d) {
        out[r[0]] = d.positions.filter(function (p) { return (p.status || "").toLowerCase() === "open"; }).length;
      }).catch(function () {}).then(function () { if (!--left) { spots = out; cb(out); } });
    });
  }

  function steps(b) {
    var s = slug(b), claimed = b.claimed || b.premium || b.postcard;
    var one = claimed
      ? '<li class="ol-step ol-done"><b>1. Claimed</b><span>This listing is managed by its owner. Is that you? Sign in to edit it.</span><a class="btn btn-ghost" href="' + ROOT + 'account" data-ol="signin">Sign in</a></li>'
      : '<li class="ol-step"><b>1. Claim it, free</b><span>Fix anything we got wrong, add your description and see how many people view and call you.</span><a class="btn" href="' + ROOT + 'claim?b=' + esc(s) + '" data-ol="claim">Claim my listing</a></li>';
    var two = b.premium || b.postcard
      ? '<li class="ol-step ol-done"><b>2. Premium</b><span>Already Premium: photos, hours, your offer and placement above Basic listings.</span></li>'
      : '<li class="ol-step"><b>2. Stand out with Premium</b><span>Photos, hours and your special right on the listing, placed above the free listings, plus monthly stats. $49 a month.</span><a class="btn btn-ghost" href="' + ROOT + 'advertise#plans" data-ol="premium">See Premium</a></li>';
    var three = b.postcard
      ? '<li class="ol-step ol-done"><b>3. On the postcard</b><span>You&rsquo;re on the current Spotlight postcard. Thank you!</span></li>'
      : '<li class="ol-step"><b>3. Land in nearly 5,000 mailboxes</b><span data-ol-spots>One business per category on the shared postcard, from $300, with Premium free while it runs. Checking open spots&hellip;</span><a class="btn btn-ghost" href="' + ROOT + 'coverage-map" data-ol="postcard">See routes and spots</a></li>';
    return '<ol class="ol-steps">' + one + two + three + '</ol>';
  }

  boxes.forEach(function (box, n) {
    var id = "ol-" + n;
    box.classList.add("ol");
    box.innerHTML =
      '<label class="ol-label" for="' + id + '">Your business name or phone number</label>' +
      '<div class="ol-field"><svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" stroke-width="2"/><path d="m20 20-4-4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>' +
      '<input id="' + id + '" type="search" autocomplete="off" placeholder="e.g. Reliable Roofing or 760-555-0100" aria-controls="' + id + '-list"></div>' +
      '<ul class="ol-list" id="' + id + '-list" role="listbox" hidden></ul>' +
      '<div class="ol-result" aria-live="polite"></div>';
    var input = box.querySelector("input"), list = box.querySelector(".ol-list"), result = box.querySelector(".ol-result"), timer, tracked = false;

    function pick(b) {
      list.hidden = true; input.value = b.name;
      var card = RENDER.R && RENDER.R.directory ? RENDER.R.directory(b) : "";
      result.innerHTML = '<div class="ol-found"><div class="ol-preview"><p class="ol-kicker">&#10003; You&rsquo;re listed. Here&rsquo;s what customers see:</p>' + card +
        '<a class="ol-view" href="' + ROOT + 'business/' + esc(slug(b)) + '/" data-ol="profile">Open your public page &rarr;</a></div>' + steps(b) + '</div>';
      ga("owner_lookup_select", { business: slug(b), claimed: !!b.claimed });
      var sp = result.querySelector("[data-ol-spots]");
      if (sp) loadSpots(function (o) {
        var bits = ROUTES.filter(function (r) { return o[r[0]] != null; }).map(function (r) { return "<b>" + o[r[0]] + "</b> open on " + r[1]; });
        if (bits.length) sp.innerHTML = "One business per category on the shared postcard, from $300, with Premium free while it runs. Right now: " + bits.join(" &middot; ") + ".";
      });
    }

    function notFound(q) {
      result.innerHTML = '<div class="ol-missing"><p><b>&ldquo;' + esc(q) + '&rdquo; isn&rsquo;t listed yet.</b> Add it free in about a minute: name, category, phone and website. Free for good, no trial.</p>' +
        '<a class="btn" href="' + ROOT + 'submit?plan=basic&business=' + encodeURIComponent(q) + '#form" data-ol="add">Add my business free</a></div>';
    }

    function search() {
      var q = input.value.trim(), hits = find(q);
      result.innerHTML = "";
      if (!q || (norm(q).length < 2 && q.replace(/\D/g, "").length < 4)) { list.hidden = true; return; }
      if (!tracked) { tracked = true; ga("owner_lookup_search", {}); }
      list.innerHTML = hits.map(function (b, i) {
        return '<li role="option" tabindex="-1" data-i="' + i + '"><span class="ol-name">' + esc(b.name) + '</span><span class="ol-meta">' + esc([b.service || b.category, b.city].filter(Boolean).join(" · ")) + '</span>' + status(b) + '</li>';
      }).join("") + '<li role="option" tabindex="-1" data-add class="ol-addrow">Not here? <b>Add &ldquo;' + esc(q) + '&rdquo; free</b></li>';
      list.hidden = false;
      list._hits = hits;
    }

    input.addEventListener("input", function () { clearTimeout(timer); timer = setTimeout(search, 120); });
    input.addEventListener("keydown", function (e) {
      var items = [].slice.call(list.querySelectorAll("li"));
      var cur = items.indexOf(document.activeElement);
      if (e.key === "ArrowDown" && items.length) { e.preventDefault(); items[Math.min(cur + 1, items.length - 1)].focus(); }
      if (e.key === "Enter") { e.preventDefault(); if (list._hits && list._hits[0] && !list.hidden) pick(list._hits[0]); else if (input.value.trim()) notFound(input.value.trim()); }
    });
    list.addEventListener("keydown", function (e) {
      var items = [].slice.call(list.querySelectorAll("li")), cur = items.indexOf(document.activeElement);
      if (e.key === "ArrowDown") { e.preventDefault(); items[Math.min(cur + 1, items.length - 1)].focus(); }
      if (e.key === "ArrowUp") { e.preventDefault(); if (cur <= 0) input.focus(); else items[cur - 1].focus(); }
      if (e.key === "Enter") { e.preventDefault(); document.activeElement.click(); }
      if (e.key === "Escape") { list.hidden = true; input.focus(); }
    });
    list.addEventListener("click", function (e) {
      var li = e.target.closest("li"); if (!li) return;
      if (li.hasAttribute("data-add")) { list.hidden = true; notFound(input.value.trim()); return; }
      pick(list._hits[+li.getAttribute("data-i")]);
    });
    result.addEventListener("click", function (e) { var a = e.target.closest("[data-ol]"); if (a) ga("owner_lookup_cta", { action: a.getAttribute("data-ol") }); });
    document.addEventListener("click", function (e) { if (!box.contains(e.target)) list.hidden = true; });

    // ?b=<slug> opens straight to that business (handy in emails); ?find=<text> pre-fills the search.
    var want = (location.search.match(/[?&]b=([a-z0-9-]+)/) || [])[1], pre = (location.search.match(/[?&]find=([^&#]+)/) || [])[1];
    var direct = want && biz.filter(function (b) { return slug(b) === want; })[0];
    if (n === 0 && direct) pick(direct);
    else if (n === 0 && pre) { input.value = decodeURIComponent(pre.replace(/\+/g, " ")); search(); }
  });
})();
