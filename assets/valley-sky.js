/* Living Valley hero: the home page sky follows the real sun over the Coachella Valley.
   - Sun position from the NOAA solar formulas at the valley's center (no API).
   - Colors ease between keyframes by sun altitude; data-phase on .hero drives text contrast.
   - A live line (time, temperature from Open-Meteo, sunrise/sunset) and a CTA picked for the hour.
   Preview any phase with ?sky=dawn|day|golden|dusk|night. */
(function () {
  var hero = document.querySelector(".hero.living");
  if (!hero) return;
  var LAT = 33.72, LON = -116.37, TZ = "America/Los_Angeles", RAD = Math.PI / 180;
  var forced = (location.search.match(/[?&]sky=(dawn|day|golden|dusk|night)\b/) || [])[1] || "";

  // Keyframes by sun altitude (degrees). Colors: sky top, sky mid, horizon, far ridge, mid ridge, near ridge, sun.
  var K = [
    { a: -90, c: ["#070a1f", "#141537", "#2a2450", "#1d1b3b", "#141229", "#0e0b1c", "#f4ecd8"] },
    { a: -12, c: ["#0b0f2a", "#1b1c45", "#352d5c", "#25234a", "#18162f", "#100c1e", "#f4ecd8"] },
    { a: -4,  c: ["#1f1d4a", "#5b3f75", "#c76a5a", "#4a3a68", "#2e2446", "#1a1222", "#ff8a4c"] },
    { a: 4,   c: ["#2b2f63", "#86507a", "#e98a5a", "#7a4f74", "#4a3354", "#22161f", "#ff9a52"] },
    { a: 6,   c: ["#f3cf9a", "#f6b578", "#f08a55", "#c9867f", "#8a5a6e", "#3a2420", "#ffb347"] },
    { a: 15,  c: ["#f6dcb0", "#f7c58e", "#f3a46c", "#d29a8a", "#9a6f80", "#3e2a24", "#ffc861"] },
    { a: 25,  c: ["#bcdbe8", "#e9e6d8", "#f6e2c6", "#d8b3a2", "#a88896", "#5b4a7a", "#fff4d6"] },
    { a: 90,  c: ["#a9d2e6", "#e3e8df", "#f6e6cf", "#d8b3a2", "#a88896", "#5b4a7a", "#fff8e6"] }
  ];
  var VARS = ["--sky-top", "--sky-mid", "--sky-low", "--ridge-far", "--ridge-mid", "--ridge-near", "--sun-c"];
  var PRESET = { night: -30, dawn: 0, dusk: 0, golden: 10, day: 45 };

  function hex(h) { var n = parseInt(h.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; }
  function mix(a, b, t) { var x = hex(a), y = hex(b); return "rgb(" + [0, 1, 2].map(function (i) { return Math.round(x[i] + (y[i] - x[i]) * t); }).join(",") + ")"; }

  // NOAA general solar position: altitude now, plus sunrise / sunset (as Date objects) for today.
  function solar(now) {
    var start = Date.UTC(now.getUTCFullYear(), 0, 1), doy = Math.floor((now - start) / 864e5) + 1;
    var hrs = now.getUTCHours() + now.getUTCMinutes() / 60;
    var g = 2 * Math.PI / 365 * (doy - 1 + (hrs - 12) / 24);
    var eq = 229.18 * (0.000075 + 0.001868 * Math.cos(g) - 0.032077 * Math.sin(g) - 0.014615 * Math.cos(2 * g) - 0.040849 * Math.sin(2 * g));
    var dec = 0.006918 - 0.399912 * Math.cos(g) + 0.070257 * Math.sin(g) - 0.006758 * Math.cos(2 * g) + 0.000907 * Math.sin(2 * g) - 0.002697 * Math.cos(3 * g) + 0.00148 * Math.sin(3 * g);
    var tst = hrs * 60 + eq + 4 * LON, ha = (tst / 4 - 180) * RAD, lat = LAT * RAD;
    var alt = 90 - Math.acos(Math.max(-1, Math.min(1, Math.sin(lat) * Math.sin(dec) + Math.cos(lat) * Math.cos(dec) * Math.cos(ha)))) / RAD;
    var ha0 = Math.acos(Math.cos(90.833 * RAD) / (Math.cos(lat) * Math.cos(dec)) - Math.tan(lat) * Math.tan(dec)) / RAD;
    // Use the valley's calendar day, so the evening (after UTC midnight) still gets today's times.
    var p = parts(now), midnight = Date.UTC(+p.year, +p.month - 1, +p.day);
    return { alt: alt, rise: new Date(midnight + (720 - 4 * (LON + ha0) - eq) * 6e4), set: new Date(midnight + (720 - 4 * (LON - ha0) - eq) * 6e4) };
  }
  function parts(d) {
    var o = {};
    new Intl.DateTimeFormat("en-US", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit", hour: "numeric", hourCycle: "h23", minute: "2-digit" })
      .formatToParts(d).forEach(function (x) { o[x.type] = x.value; });
    return o;
  }
  function clock(d) { return new Intl.DateTimeFormat("en-US", { timeZone: TZ, hour: "numeric", minute: "2-digit" }).format(d); }

  function phaseOf(alt, pm) {
    if (forced) return forced;
    if (alt < -6) return "night";
    if (alt < 5) return pm ? "dusk" : "dawn";
    if (alt < 15) return "golden";
    return "day";
  }

  var stars = hero.querySelector(".sky-stars");
  function drawStars() { // deterministic star field in the upper sky, in px (box-shadow can't use %)
    if (!stars) return;
    var w = hero.clientWidth, h = hero.clientHeight * 0.7, seed = 7, sh = [];
    function rnd() { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }
    for (var i = 0; i < 120; i++) sh.push(Math.round(rnd() * w) + "px " + Math.round(rnd() * h) + "px 0 " + (rnd() < .12 ? "1px" : "0") + " rgba(255,248,230," + (0.35 + rnd() * 0.6).toFixed(2) + ")");
    stars.style.boxShadow = sh.join(",");
  }
  drawStars();
  var rz; window.addEventListener("resize", function () { clearTimeout(rz); rz = setTimeout(drawStars, 200); });

  var sun = solar(new Date());
  function paint() {
    var now = new Date(), sv = solar(now), alt = forced ? PRESET[forced] : sv.alt;
    var hour = +parts(now).hour, pm = forced ? forced === "dusk" : hour >= 12;
    sun = sv;
    var i = 0; while (i < K.length - 2 && alt > K[i + 1].a) i++;
    var a = K[i], b = K[i + 1], t = Math.max(0, Math.min(1, (alt - a.a) / (b.a - a.a)));
    VARS.forEach(function (v, j) { hero.style.setProperty(v, mix(a.c[j], b.c[j], t)); });
    var phase = phaseOf(sv.alt, pm);
    hero.setAttribute("data-phase", phase);
    hero.style.setProperty("--star-o", alt < -10 ? 1 : alt < 2 ? ((2 - alt) / 12).toFixed(2) : 0);
    // Sun (or moon) path: across the sky by day fraction, height by altitude.
    var x, y, isMoon = phase === "night";
    if (forced) { x = { dawn: 14, day: 62, golden: 80, dusk: 86, night: 47 }[forced]; y = { dawn: 74, day: 16, golden: 52, dusk: 76, night: 10 }[forced]; }
    else if (!isMoon) {
      var f = (now - sv.rise) / (sv.set - sv.rise); f = Math.max(-0.05, Math.min(1.05, f));
      x = 6 + f * 88; y = Math.max(8, 78 - Math.max(0, sv.alt) / 40 * 66);
    } else {
      var n0 = sv.set < now ? sv.set : new Date(sv.set - 864e5), nf = Math.max(0, Math.min(1, (now - n0) / (12 * 36e5)));
      x = 10 + nf * 80; y = 20 + Math.abs(nf - 0.5) * 40;
    }
    hero.style.setProperty("--sun-x", x.toFixed(1) + "%");
    hero.style.setProperty("--sun-y", y.toFixed(1) + "%");
    hero.classList.toggle("is-moon", isMoon);
    nowLine(now);
    if (!cta.done) pickCta(hour, phase);
  }

  // ---------- live "now" line ----------
  var nowEl = document.getElementById("hero-now"), wx = null;
  var WX = { 0: "clear", 1: "mostly clear", 2: "partly cloudy", 3: "cloudy", 45: "foggy", 48: "foggy" };
  function wxText(code) {
    if (WX[code]) return WX[code];
    if (code >= 51 && code <= 67) return "rain";
    if (code >= 71 && code <= 77) return "snow";
    if (code >= 80 && code <= 82) return "showers";
    if (code >= 95) return "storms";
    return "";
  }
  function nowLine(now) {
    if (!nowEl) return;
    var bits = ["<b>" + clock(now) + "</b> in the valley"];
    if (wx) bits.push(Math.round(wx.t) + "&deg;" + (wxText(wx.c) ? " and " + wxText(wx.c) : ""));
    if (now < sun.rise) bits.push("Sunrise " + clock(sun.rise));
    else if (now < sun.set) bits.push("Sunset " + clock(sun.set));
    else bits.push("Sunrise " + clock(new Date(+sun.rise + 864e5)));
    nowEl.innerHTML = '<span class="hn-dot" aria-hidden="true"></span>' + bits.join('<span class="hn-sep" aria-hidden="true"> &middot; </span>');
    nowEl.hidden = false;
  }
  function loadWx() {
    try { var c = JSON.parse(sessionStorage.getItem("cvs_wx") || "null"); if (c && Date.now() - c.at < 9e5) { wx = c; return; } } catch (e) {}
    if (!window.fetch) return;
    fetch("https://api.open-meteo.com/v1/forecast?latitude=" + LAT + "&longitude=" + LON + "&current=temperature_2m,weather_code&temperature_unit=fahrenheit&timezone=America%2FLos_Angeles")
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) {
        if (!j || !j.current || typeof j.current.temperature_2m !== "number") return;
        wx = { t: j.current.temperature_2m, c: j.current.weather_code, at: Date.now() };
        try { sessionStorage.setItem("cvs_wx", JSON.stringify(wx)); } catch (e) {}
        nowLine(new Date());
      }).catch(function () {});
  }

  // ---------- the CTA for this hour ----------
  var cta = document.getElementById("now-cta");
  function town() { try { return localStorage.getItem("cvs_city") || ""; } catch (e) { return ""; } }
  function todayIso() { var p = parts(new Date()); return p.year + "-" + p.month + "-" + p.day; }
  function pickCta(hour, phase) {
    if (!cta) return;
    var dir = (window.CVS && window.CVS.directory) || [], R = window.CVS_RENDER || {}, evs = R.events || window.CVS_EVENTS || [];
    var my = town(), d = todayIso(), o;
    function inTown(list) { return my ? list.filter(function (x) { return x.city === my; }) : []; }
    function withCity(url, list) { return inTown(list).length >= 3 ? url + (url.indexOf("?") > -1 ? "&" : "?") + "city=" + encodeURIComponent(my) : url; }
    var today = evs.filter(function (e) { return e.dates ? e.dates.indexOf(d) > -1 : e.date <= d && (e.endDate || e.date) >= d; });
    var hh = dir.filter(function (x) { return x.happyHour; }), rest = dir.filter(function (x) { return x.category === "Restaurants"; });
    var bfast = dir.filter(function (x) { return /breakfast|brunch|coffee|cafe/i.test((x.service || "") + " " + (x.blurb || "") + " " + (x.name || "")); });
    var hhMine = inTown(hh).length >= 2, restMine = inTown(rest).length >= 3, evMine = inTown(today).length >= 3;
    if (hour >= 5 && hour < 11 && bfast.length >= 3) o = { k: "morning", i: "&#9749;", t: "Good morning. Coffee &amp; breakfast spots" + (my && inTown(bfast).length >= 3 ? " in " + my : " near you"), u: withCity("directory?q=breakfast", bfast) };
    else if (hour >= 11 && hour < 15 && rest.length) o = { k: "lunch", i: "&#127790;", t: "Lunch time. " + (restMine ? inTown(rest).length + " restaurants in " + my : rest.length + " local restaurants"), u: withCity("directory?category=Restaurants", rest) };
    else if (hour >= 15 && hour < 19 && hh.length) o = { k: "happy-hour", i: "&#127865;", t: "It&rsquo;s happy hour. " + (hhMine ? inTown(hh).length + " spots in " + my : hh.length + " spots pouring now"), u: withCity("directory?category=Happy%20hours", hh) };
    else if (hour >= 15 && hour < 23 && today.length) o = { k: "tonight", i: "&#10024;", t: "Tonight: " + (evMine ? inTown(today).length + " things happening in " + my : today.length + " things happening in the valley"), u: withCity("events?when=today", today) };
    else o = { k: "weekend", i: "&#127748;", t: "Up late? Plan this weekend", u: "this-weekend/" };
    cta.innerHTML = '<span class="nc-i" aria-hidden="true">' + o.i + '</span><span class="nc-t">' + o.t + '</span><span class="nc-go" aria-hidden="true">&rarr;</span>';
    cta.href = o.u; cta.hidden = false; cta.done = true;
    cta.addEventListener("click", function () { if (window.CVS_GA) window.CVS_GA("now_cta", { phase: phase, target: o.k }); });
  }

  paint();
  loadWx();
  setInterval(paint, 60000);
})();
