/* Spotlight HQ: edit any directory listing from the admin page (2026-11-09).
   Opened by any [data-edit="<slug>"] button (the Listings table), HQ.editListing(slug), or HQ.newListing().
   Saves through the tracker's POST /admin/listing (op save / create / remove), which commits data/directory.js
   the same way owner edits do. The site rebuilds itself, so changes are live in about a minute. */
(function () {
  var HQ = window.HQ; if (!HQ) return;
  var esc = HQ.esc;
  var CITIES = ["Bermuda Dunes", "Cathedral City", "Coachella", "Desert Hot Springs", "Indian Wells", "Indio", "La Quinta", "Palm Desert", "Palm Springs", "Rancho Mirage", "Thousand Palms"];
  function all() { return (window.CVS && window.CVS.directory) || []; }
  function uniq(key, filter) { var s = {}; all().forEach(function (b) { if (b[key] && (!filter || filter(b))) s[b[key]] = 1; }); return Object.keys(s).sort(); }
  function field(label, name, val, o) {
    o = o || {};
    var input = o.area ? '<textarea name="' + name + '" rows="' + (o.rows || 3) + '" maxlength="' + (o.max || 900) + '">' + esc(val) + "</textarea>"
      : o.options ? '<select name="' + name + '">' + o.options.map(function (x) { return "<option" + (x === val ? " selected" : "") + ">" + esc(x) + "</option>"; }).join("") + "</select>"
      : '<input name="' + name + '" type="' + (o.type || "text") + '" value="' + esc(val) + '"' + (o.list ? ' list="' + o.list + '"' : "") + (o.ph ? ' placeholder="' + esc(o.ph) + '"' : "") + (o.max ? ' maxlength="' + o.max + '"' : "") + ">";
    return '<label class="hq-f">' + label + input + (o.hint ? "<small>" + o.hint + "</small>" : "") + "</label>";
  }
  function toggle(name, title, hint, on) {
    return '<label class="hq-tg"><div><b>' + title + "</b><small>" + hint + '</small></div><input type="checkbox" name="' + name + '"' + (on ? " checked" : "") + "></label>";
  }

  function open(slug) {
    var isNew = !slug, b = isNew ? {} : all().filter(function (x) { return x.slug === slug; })[0];
    if (!b) { HQ.toast("That listing isn't in the directory file."); return; }
    var cats = uniq("category"), offer = b.offer || {};
    if (isNew) b = { category: cats.indexOf("Home services") > -1 ? "Home services" : cats[0], city: "Palm Desert" };
    var body =
      '<fieldset class="hq-fs"><legend>Advertising</legend><div class="hq-toggles">' +
        toggle("premium", "Premium listing", "Gold border, sits above Basic, shows about, hours, offer and photos. Turn on after they pay.", b.premium || b.featured) +
        toggle("postcard", "On the postcard", "Shows the “On the Spotlight postcard” tag and gives them stats and a QR code.", b.postcard) +
      "</div>" +
      '<div class="hq-row" id="le-adsize"' + (b.postcard ? "" : " hidden") + ">" + field("Ad size on the card", "adSize", String(b.adSize || 1), { options: ["1", "2", "4", "8"], hint: "Spots their ad takes up." }) + "</div></fieldset>" +
      '<fieldset class="hq-fs"><legend>Basics</legend>' +
        field("Business name", "name", b.name || "", { max: 100 }) +
        '<div class="hq-row">' + field("Category", "category", b.category || "", { options: cats }) + field("Service", "service", b.service || "", { list: "le-services", hint: "What shows on the card, e.g. Plumbers." }) + "</div>" +
        '<datalist id="le-services">' + uniq("service").map(function (s) { return '<option value="' + esc(s) + '">'; }).join("") + "</datalist>" +
        '<div class="hq-row">' + field("City", "city", b.city || "", { options: CITIES.indexOf(b.city) > -1 || !b.city ? CITIES : CITIES.concat(b.city) }) + field("Phone", "phone", b.phone || "", { type: "tel", ph: "(760) 555-0123" }) + "</div>" +
        field("Website", "url", b.url || "", { ph: "https://" }) +
        field("Address", "address", b.address || "", { max: 160 }) +
        field("Short description", "blurb", b.blurb || "", { area: true, rows: 3, max: 400, hint: "One or two sentences. Shows on the directory card." }) +
      "</fieldset>" +
      '<fieldset class="hq-fs"><legend>Premium details</legend>' +
        field("About", "about", b.about || "", { area: true, rows: 4, max: 900 }) +
        '<div class="hq-row">' + field("Hours", "hours", b.hours || "", { max: 160 }) + field("Happy hour", "happyHour", b.happyHour || "", { ph: "Every day, 3 to 6 PM", hint: "Puts them in the Happy hours group." }) + "</div>" +
        field("Offer headline", "offerTitle", offer.title || "", { max: 60, ph: "10% off your first visit" }) +
        '<div class="hq-row">' + field("Offer fine print", "offerDetails", offer.details || "", { max: 220 }) + field("Offer ends", "offerExpires", offer.expires || "", { type: "date" }) + "</div>" +
      "</fieldset>";
    var links = isNew ? "" : '<div style="display:flex;gap:8px;flex-wrap:wrap"><a class="hq-btn ghost sm" href="business/' + esc(b.slug) + '/" target="_blank" rel="noopener">' + HQ.icons.ext + "View live page</a>" +
      '<button type="button" class="hq-btn ghost sm" data-qr="' + esc(b.slug) + '" data-qr-name="' + esc(b.name) + '">' + HQ.icons.qr + "QR code</button></div>";
    var foot = (isNew ? "" : '<button type="button" class="hq-btn danger" data-remove>Remove</button>') + '<span class="hq-msg" id="le-msg"></span><span class="sp"></span>' +
      '<button type="button" class="hq-btn ghost" data-cancel>Cancel</button><button type="button" class="hq-btn accent" data-save>' + (isNew ? "Add listing" : "Save changes") + "</button>";
    HQ.drawer({
      eyebrow: isNew ? "Directory" : esc(b.city + " · " + (b.service || b.category)), title: isNew ? "New listing" : b.name,
      sub: isNew ? "Goes live as a free Basic listing unless you turn on Premium. Live in about a minute." : "Web address: business/" + esc(b.slug) + "/ (never changes)",
      body: links + body, foot: foot,
      onOpen: function (d, api) {
        var msg = d.querySelector("#le-msg");
        d.querySelector("[name=postcard]").addEventListener("change", function (e) { d.querySelector("#le-adsize").hidden = !e.target.checked; });
        d.querySelector("[data-cancel]").onclick = function () { api.close(); };
        var rm = d.querySelector("[data-remove]");
        if (rm) rm.onclick = function () {
          if (!rm.dataset.sure) { rm.dataset.sure = 1; rm.textContent = "Click again to remove"; return; }
          busy(true); msg.className = "hq-msg"; msg.textContent = "Removing…";
          HQ.post(HQ.TRACKER, "/admin/listing", { op: "remove", slug: b.slug }).then(function () {
            var list = all(), i = list.indexOf(b); if (i > -1) list.splice(i, 1);
            api.close(); HQ.toast(b.name + " removed. Gone from the site in about a minute."); changed();
          }).catch(fail);
        };
        function busy(on) { [].forEach.call(d.querySelectorAll(".hq-dr-foot button"), function (x) { x.disabled = on; }); }
        function fail(err) { busy(false); msg.className = "hq-msg err"; msg.textContent = err.message; }
        d.querySelector("[data-save]").onclick = function () {
          var v = function (n) { return d.querySelector("[name=" + n + "]").value.trim(); };
          var f = { name: v("name"), category: v("category"), service: v("service"), city: v("city"), phone: v("phone"), url: v("url"), address: v("address"), blurb: v("blurb"),
            about: v("about"), hours: v("hours"), happyHour: v("happyHour"),
            offer: { title: v("offerTitle"), details: v("offerDetails"), expires: v("offerExpires") },
            premium: d.querySelector("[name=premium]").checked, postcard: d.querySelector("[name=postcard]").checked };
          if (f.postcard) f.adSize = v("adSize"); else f.adSize = "";
          if (!isNew && (b.featured && !f.premium)) f.featured = false;
          if (!f.name || !f.service) { msg.className = "hq-msg err"; msg.textContent = "Name and service are required."; return; }
          busy(true); msg.className = "hq-msg"; msg.textContent = "Saving…";
          HQ.post(HQ.TRACKER, "/admin/listing", isNew ? { op: "create", fields: f } : { op: "save", slug: b.slug, fields: f }).then(function (res) {
            var entry = res.listing || {};
            if (isNew) all().push(entry); else { Object.keys(b).forEach(function (k) { if (k !== "slug") delete b[k]; }); Object.assign(b, entry); }
            api.close();
            HQ.toast(isNew ? (entry.name || f.name) + " added. Live in about a minute." : (res.changed && !res.changed.length ? "No changes to save." : b.name + " saved. Live in about a minute."));
            changed(entry.slug || b.slug);
          }).catch(fail);
        };
      }
    });
  }
  function changed(slug) { if (window.HQ_LISTINGS_CHANGED) window.HQ_LISTINGS_CHANGED(slug); }
  document.addEventListener("click", function (e) {
    var b = e.target.closest("[data-edit]"); if (!b) return;
    e.preventDefault(); open(b.getAttribute("data-edit"));
  });
  HQ.editListing = open;
  HQ.newListing = function () { open(null); };
})();
