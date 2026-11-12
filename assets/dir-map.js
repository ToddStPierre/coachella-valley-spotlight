/* Directory map view (directory.html only).
   Desktop (1024px+): split screen, cards on the left, a sticky map on the right.
   Phones: a floating "Map" button opens the map full screen; "List" closes it.
   - Pins come from data/geo.js (window.CVS_GEO, built by tools/geocode.js) for whatever cards are showing.
   - Sponsors (postcard advertisers) get labeled gold pins on top; Premium a larger orange dot; everyone else a small
     rose dot. Dots cluster when zoomed out.
   - Hover a card: its pin lights up. Click a pin: preview card, and on desktop the matching card is highlighted.
   - After the visitor pans or zooms, "Search this area" narrows the list to what's on the map.
   It follows app.js's own filters by watching the list re-render, so app.js knows nothing about it.
   MapLibre is loaded from cdnjs only when the map is needed (right away on desktop, on first tap on phones).
   If the map library or tiles fail, the list works exactly as before. */
(function () {
  var browse = document.querySelector('[data-browse="directory"]');
  if (!browse || !window.CVS_GEO || !window.CVS || !window.CVS.directory) return;
  var GEO = window.CVS_GEO, LIB = "https://cdnjs.cloudflare.com/ajax/libs/maplibre-gl/4.7.1/";
  var STYLE = "https://tiles.openfreemap.org/styles/positron";
  var VALLEY = [[-116.62, 33.62], [-116.12, 33.97]];
  var wide = window.matchMedia("(min-width: 1024px)");
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  function track(name, p) { if (!window.CVS_NOTRACK && window.gtag) try { window.gtag("event", name, p || {}); } catch (e) {} }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function slugOf(b) { return b.slug || String(b.name).toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }
  var BY = {}; window.CVS.directory.forEach(function (b) { if (!b.sample) BY[slugOf(b)] = b; });
  function tierOf(b) { return b.postcard ? "spon" : (b.premium || b.featured) ? "prem" : "basic"; }
  function shortName(n) { n = String(n).replace(/\s*\((.*?)\)\s*$/, ""); return n.length > 22 ? n.slice(0, 21).replace(/\s+\S*$/, "") + "…" : n; }

  /* ---------- Layout: wrap the list and add the map pane ---------- */
  var split = document.createElement("div"); split.className = "dir-split";
  var listCol = document.createElement("div"); listCol.className = "dir-list";
  browse.parentNode.insertBefore(split, browse);
  listCol.appendChild(browse); split.appendChild(listCol);
  var pane = document.createElement("div"); pane.className = "dir-map-pane"; pane.setAttribute("aria-label", "Map of these businesses");
  pane.innerHTML = '<div class="dm-canvas" id="dir-map"></div>' +
    '<div class="dm-top"><span class="dm-count" role="status"></span><button type="button" class="dm-area" hidden>Search this area</button><button type="button" class="dm-clear" hidden>Show all &times;</button></div>' +
    '<div class="dm-legend" aria-hidden="true"><span><i class="spon"></i>Sponsor</span><span><i class="prem"></i>Premium</span><span><i class="basic"></i>Listed free</span></div>' +
    '<div class="dm-loading">Loading the map&hellip;</div>';
  split.appendChild(pane);
  var wrap = split.closest(".wrap"); if (wrap) wrap.classList.add("has-map");
  var fab = document.createElement("button"); fab.type = "button"; fab.className = "dm-fab";
  fab.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M9 4 3 6.5v13.5l6-2.5 6 2.5 6-2.5V4l-6 2.5L9 4Zm0 0v13.5m6-11v13.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg><span>Map</span>';
  document.body.appendChild(fab);
  var countEl = pane.querySelector(".dm-count"), areaBtn = pane.querySelector(".dm-area"), clearBtn = pane.querySelector(".dm-clear");

  /* ---------- What's showing in the list ---------- */
  var pts = [], areaOn = false;
  function collect() {
    var seen = {}; pts = [];
    browse.querySelectorAll(".card[data-biz]").forEach(function (c) {
      var s = c.getAttribute("data-biz"), g = GEO[s], b = BY[s];
      if (seen[s] || !b || !g || g[0] == null) return; seen[s] = 1;
      pts.push({ slug: s, b: b, lat: g[0], lng: g[1], tier: tierOf(b) });
    });
  }
  function setCount() {
    if (areaOn) return;
    countEl.innerHTML = pts.length ? "<b>" + pts.length + "</b> " + (pts.length === 1 ? "place" : "places") + " on the map" : "No street addresses to map here";
  }

  /* ---------- Map ---------- */
  var map = null, ready = false, loading = false, sponsorMarkers = [], hotMarker = null, popup = null, programmatic = false;
  function loadLib(cb) {
    if (window.maplibregl) return cb();
    if (loading) return; loading = true;
    var css = document.createElement("link"); css.rel = "stylesheet"; css.href = LIB + "maplibre-gl.css"; document.head.appendChild(css);
    var js = document.createElement("script"); js.src = LIB + "maplibre-gl.js"; js.onload = cb;
    js.onerror = function () { pane.classList.add("dm-failed"); fab.hidden = true; };
    document.head.appendChild(js);
  }
  function recolor() {
    var set = function (id, prop, val) { if (map.getLayer(id)) try { map.setPaintProperty(id, prop, val); } catch (e) {} };
    set("background", "background-color", "#f3eadb");
    set("park", "fill-color", "#e6dcc0"); set("landcover_wood", "fill-color", "#e3d8bd");
    set("landuse_residential", "fill-color", "#efe4d2"); set("building", "fill-color", "#e9dcc8");
    set("water", "fill-color", "#b7d1d3"); set("waterway", "line-color", "#a9c6c9");
    set("highway_minor", "line-color", "#fbf5ec");
    ["highway_major_casing", "highway_motorway_casing", "highway_motorway_bridge_casing"].forEach(function (id) { set(id, "line-color", "#e8c79c"); });
    ["highway_major_inner", "highway_motorway_inner", "highway_motorway_bridge_inner"].forEach(function (id) { set(id, "line-color", "#f7dcb4"); });
    ["highway_major_subtle", "highway_motorway_subtle"].forEach(function (id) { set(id, "line-color", "#ecd3ad"); });
    ["highway-name-minor", "highway-name-major", "highway-name-path", "label_other", "airport"].forEach(function (id) { set(id, "text-color", "#8a7868"); set(id, "text-halo-color", "#f6efe3"); });
    ["label_village", "label_town", "label_city", "label_city_capital"].forEach(function (id) { set(id, "text-color", "#4a3d34"); set(id, "text-halo-color", "#f6efe3"); });
  }
  function geojson() {
    return { type: "FeatureCollection", features: pts.filter(function (p) { return p.tier !== "spon"; }).map(function (p) {
      return { type: "Feature", properties: { slug: p.slug, tier: p.tier }, geometry: { type: "Point", coordinates: [p.lng, p.lat] } };
    }) };
  }
  function init() {
    if (map) return;
    map = new maplibregl.Map({ container: "dir-map", style: STYLE, bounds: VALLEY, fitBoundsOptions: { padding: 30 }, attributionControl: { compact: true }, dragRotate: false, pitchWithRotate: false, cooperativeGestures: false });
    window.CVS_MAP = map; // handy for checking the map from the browser console
    map.touchZoomRotate.disableRotation();
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    map.on("error", function (e) { if (window.console && e && e.error) console.warn("Spotlight map:", e.error.message || e.error); });
    map.on("load", function () {
      recolor();
      map.addSource("biz", { type: "geojson", data: geojson(), cluster: true, clusterRadius: 40, clusterMaxZoom: 12 });
      map.addLayer({ id: "dm-cluster", type: "circle", source: "biz", filter: ["has", "point_count"], paint: {
        "circle-color": "#221c18", "circle-opacity": .9, "circle-stroke-color": "#fbf3e6", "circle-stroke-width": 3,
        "circle-radius": ["step", ["get", "point_count"], 15, 10, 19, 30, 24, 80, 30] } });
      map.addLayer({ id: "dm-cluster-n", type: "symbol", source: "biz", filter: ["has", "point_count"], layout: {
        "text-field": ["get", "point_count_abbreviated"], "text-font": ["Noto Sans Bold"], "text-size": 13, "text-allow-overlap": true }, paint: { "text-color": "#fbf3e6" } });
      map.addLayer({ id: "dm-pt", type: "circle", source: "biz", filter: ["!", ["has", "point_count"]], paint: {
        "circle-color": ["match", ["get", "tier"], "prem", "#d9552b", "#c9667a"],
        "circle-radius": ["match", ["get", "tier"], "prem", 8, 6],
        "circle-stroke-color": "#ffffff", "circle-stroke-width": 2.5 } });
      map.on("click", "dm-cluster", function (e) {
        var f = e.features[0];
        Promise.resolve(map.getSource("biz").getClusterExpansionZoom(f.properties.cluster_id)).then(function (z) { map.easeTo({ center: f.geometry.coordinates, zoom: z + .3, duration: reduce ? 0 : 500 }); });
      });
      map.on("click", "dm-pt", function (e) { openPin(e.features[0].properties.slug, true); });
      ["dm-cluster", "dm-pt"].forEach(function (l) {
        map.on("mouseenter", l, function () { map.getCanvas().style.cursor = "pointer"; });
        map.on("mouseleave", l, function () { map.getCanvas().style.cursor = ""; });
      });
      ready = true; pane.classList.add("dm-ready");
      refresh(true);
    });
    // The visitor moved the map themselves (drag, wheel, pinch, double-click or the +/- buttons): offer "Search this area".
    var touched = false, touch = function () { touched = true; };
    ["dragstart", "wheel", "touchstart", "dblclick"].forEach(function (ev) { map.on(ev, touch); });
    pane.querySelector(".maplibregl-ctrl-top-right").addEventListener("click", touch);
    map.on("moveend", function () { if (touched && !programmatic) areaBtn.hidden = false; touched = false; });
  }
  function fit() {
    map.resize();
    if (!pts.length) { programmatic = true; map.fitBounds(VALLEY, { padding: 30, duration: 0 }); programmatic = false; return; }
    // Fit the bulk of the results, so one far-off listing doesn't zoom everything out.
    var num = function (a, b) { return a - b; };
    var la = pts.map(function (p) { return p.lat; }).sort(num), lo = pts.map(function (p) { return p.lng; }).sort(num);
    var cut = pts.length > 20 ? Math.floor(pts.length * .03) : 0, n = pts.length - 1;
    var b = [[lo[cut], la[cut]], [lo[n - cut], la[n - cut]]];
    if (b[0][0] === b[1][0] && b[0][1] === b[1][1]) { b[0][0] -= .01; b[0][1] -= .008; b[1][0] += .01; b[1][1] += .008; }
    programmatic = true;
    map.fitBounds(b, { padding: { top: 76, bottom: 76, left: 48, right: 48 }, maxZoom: 14.5, duration: 0 });
    programmatic = false;
  }
  function drawSponsors() {
    sponsorMarkers.forEach(function (m) { m.remove(); }); sponsorMarkers = [];
    pts.filter(function (p) { return p.tier === "spon"; }).forEach(function (p) {
      var el = document.createElement("button"); el.type = "button"; el.className = "dm-spon";
      el.innerHTML = '<span aria-hidden="true">&#9733;</span> ' + esc(shortName(p.b.name));
      el.setAttribute("aria-label", p.b.name + ", sponsor");
      el.addEventListener("click", function (ev) { ev.stopPropagation(); openPin(p.slug, true); });
      sponsorMarkers.push(new maplibregl.Marker({ element: el, anchor: "bottom" }).setLngLat([p.lng, p.lat]).addTo(map));
    });
  }
  function refresh(refit) {
    collect(); setCount();
    if (!ready) return;
    map.getSource("biz").setData(geojson());
    drawSponsors();
    if (popup) { popup.remove(); popup = null; }
    if (refit) fit();
    areaBtn.hidden = true;
  }

  /* ---------- Pins <-> cards ---------- */
  function cardFor(slug) { return browse.querySelector('.card[data-biz="' + slug + '"]:not([hidden])'); }
  function setHot(slug) {
    if (!ready) return;
    var p = slug && pts.filter(function (x) { return x.slug === slug; })[0];
    if (!p) { if (hotMarker) hotMarker.getElement().hidden = true; return; }
    if (!hotMarker) { var el = document.createElement("div"); el.className = "dm-hot"; hotMarker = new maplibregl.Marker({ element: el }).setLngLat([p.lng, p.lat]).addTo(map); }
    hotMarker.setLngLat([p.lng, p.lat]); hotMarker.getElement().hidden = false;
  }
  function openPin(slug, fromMap) {
    var p = pts.filter(function (x) { return x.slug === slug; })[0]; if (!p) return;
    var b = p.b, url = "business/" + slug + "/";
    var tag = p.tier === "spon" ? '<span class="dm-pop-tag">Sponsor &middot; On the Spotlight postcard</span>' : p.tier === "prem" ? '<span class="dm-pop-tag prem">Premium listing</span>' : "";
    var html = '<div class="dm-pop-in"><span class="dm-pop-meta">' + esc(b.service || b.category) + " &middot; " + esc(b.city) + '</span>' +
      '<h4><a href="' + url + '">' + esc(b.name) + '</a></h4>' + (b.blurb ? '<p>' + esc(b.blurb.length > 110 ? b.blurb.slice(0, 108).replace(/\s+\S*$/, "") + "…" : b.blurb) + '</p>' : "") + tag +
      '<a class="dm-pop-go" href="' + url + '" data-track="profile-link">View profile &rarr;</a></div>';
    if (popup) popup.remove();
    popup = new maplibregl.Popup({ className: "dm-pop", closeButton: true, maxWidth: "280px", offset: p.tier === "spon" ? [0, -34] : 12, focusAfterOpen: false })
      .setLngLat([p.lng, p.lat]).setHTML(html).addTo(map);
    setHot(slug);
    if (fromMap) {
      track("map_pin_click", { slug: slug, tier: p.tier });
      var c = cardFor(slug);
      if (c && wide.matches) {
        browse.querySelectorAll(".card.dm-is-hot").forEach(function (x) { x.classList.remove("dm-is-hot"); });
        c.classList.add("dm-is-hot"); c.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
        setTimeout(function () { c.classList.remove("dm-is-hot"); }, 2600);
      }
    }
  }
  browse.addEventListener("mouseover", function (e) { var c = e.target.closest && e.target.closest(".card[data-biz]"); if (c && wide.matches) setHot(c.getAttribute("data-biz")); });
  browse.addEventListener("mouseleave", function () { setHot(null); });

  /* ---------- Search this area ---------- */
  function showAll() {
    areaOn = false; clearBtn.hidden = true;
    browse.querySelectorAll("[data-dm-hide]").forEach(function (el) { el.hidden = false; el.removeAttribute("data-dm-hide"); });
    setCount();
  }
  function hide(el) { if (!el.hidden) { el.hidden = true; el.setAttribute("data-dm-hide", ""); } }
  areaBtn.addEventListener("click", function () {
    showAll();
    var bounds = map.getBounds(), n = 0, seen = {};
    browse.querySelectorAll(".card[data-biz]").forEach(function (c) {
      var g = GEO[c.getAttribute("data-biz")];
      if (g && g[0] != null && bounds.contains([g[1], g[0]])) { if (!seen[c.getAttribute("data-biz")]) { seen[c.getAttribute("data-biz")] = 1; n++; } } else hide(c);
    });
    // Drop the section headings and bands whose cards are all outside the map.
    browse.querySelectorAll(".grid").forEach(function (g) {
      if (g.querySelector(".card:not([hidden])")) return;
      hide(g); var h = g.previousElementSibling; if (h && h.tagName === "H2") hide(h);
    });
    browse.querySelectorAll(".featured-band").forEach(function (s) { if (!s.querySelector(".card:not([hidden])")) hide(s); });
    browse.querySelectorAll(".cat-jump, .list-band, .biz-band").forEach(hide);
    areaOn = true; areaBtn.hidden = true; clearBtn.hidden = false;
    countEl.innerHTML = "<b>" + n + "</b> in this area";
    track("map_search_area", { results: n });
    if (wide.matches) { var top = split.getBoundingClientRect().top + window.scrollY - 90; if (window.scrollY > top) window.scrollTo({ top: top, behavior: reduce ? "auto" : "smooth" }); }
  });
  clearBtn.addEventListener("click", function () { showAll(); });

  /* ---------- Follow app.js's filters ---------- */
  var t = null;
  new MutationObserver(function () { clearTimeout(t); t = setTimeout(function () { areaOn = false; clearBtn.hidden = true; refresh(true); }, 60); })
    .observe(browse, { childList: true });

  /* ---------- Open: desktop now, phones on tap ---------- */
  function openMobile(open) {
    document.body.classList.toggle("dm-open", open);
    fab.querySelector("span").textContent = open ? "List" : "Map";
    fab.setAttribute("aria-expanded", open ? "true" : "false");
    if (open) { track("map_open", {}); loadLib(function () { init(); if (map) setTimeout(function () { map.resize(); if (ready) fit(); }, 30); }); }
  }
  fab.addEventListener("click", function () { openMobile(!document.body.classList.contains("dm-open")); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && document.body.classList.contains("dm-open")) openMobile(false); });
  function start() { if (wide.matches) { if (document.body.classList.contains("dm-open")) openMobile(false); loadLib(function () { init(); if (map) map.resize(); }); } }
  (wide.addEventListener ? wide.addEventListener("change", start) : wide.addListener(start));
  collect(); setCount();
  if ("requestIdleCallback" in window) requestIdleCallback(start, { timeout: 1200 }); else setTimeout(start, 300);
  // directory#map (or any directory link ending in #map) opens straight to the map on phones.
  if (location.hash === "#map" && !wide.matches) openMobile(true);
})();
