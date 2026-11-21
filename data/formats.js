/* POSTCARD CARD FORMATS
   A card's format comes from data/mailings.js ("format"). No format = the old 11 x 6 card (16 equal spots).
   "9x12" = the 9 x 12 card (Dec 17, 2026 cards on). Layout from Todd's mockups, 2026-11-21:
     each side has the "Coachella Valley Spotlight" banner, 6 Full spots (4.4 x 2.6 in, $350) in 3 rows of 2,
     then 4 Half spots (2.1 x 2.6 in, $175) across the bottom. Side A = spots A1-A10 (pos 1-10, carries the
     address panel), side B = B1-B10 (pos 11-20). 20 spots, $5,600 full.
   An ad can be one spot, or several spots on the same side that make a rectangle (A1+A2, A7+A8, A1+A3, a whole
   side...). Its price is the sum of its spots.
   The reservations Worker (03-build-reservations/worker.js) keeps a copy of this table. Keep the two the same.
   map: pos = spot number. Drawn on a 4-column grid; Full spans 2 columns. Row 0 is the banner. */
(function (root) {
  function side(letter, base) {
    var m = [], i = 0;
    [[1, 1], [3, 1], [1, 2], [3, 2], [1, 3], [3, 3]].forEach(function (c) { i++; m.push({ pos: base + i, label: letter + i, size: "full", side: letter === "A" ? "front" : "back", col: c[0], colSpan: 2, row: c[1], rowSpan: 1 }); });
    [1, 2, 3, 4].forEach(function (c) { i++; m.push({ pos: base + i, label: letter + i, size: "half", side: letter === "A" ? "front" : "back", col: c, colSpan: 1, row: 4, rowSpan: 1 }); });
    return m;
  }
  var FORMATS = {
    "11x6": { spots: 16 },
    "9x12": {
      spots: 20, minDollars: 2625,
      sizes: {
        full: { label: "Full", price: 350, pass: 900, dims: "4.4″ x 2.6″", perHome: "7¢" },
        half: { label: "Half", price: 175, pass: 375, dims: "2.1″ x 2.6″", perHome: "3.5¢" }
      },
      sizeOrder: ["full", "half"],
      map: side("A", 0).concat(side("B", 10))
    }
  };
  // Stripe Payment Links per 9x12 size. "" = hold-and-invoice only. Each link redirects to /reserve?paid=1.
  // 2026-11-21: the old $500/$300/$150/$100 links no longer match a price, so they're off until Todd makes Full $350 and Half $175 links.
  var PAY_9x12 = { full: "", half: "" };
  // Season Pass (Todd, 2026-11-21): 3 mailings in a row, $50 off each spot on each mailing.
  // Full $300 x 3 = $900, Half $125 x 3 = $375; a joined ad gets $50 off per spot per mailing.
  var PASS_OFF = 50;
  // Season Pass Payment Links per size. "" = hold-and-invoice until Todd makes the $900 and $375 links.
  var PASS_9x12 = { full: "", half: "" };

  function st(p) { return String((p && p.status) || "open").toLowerCase(); }
  function fmtOf(m) { return m && m.format === "9x12" ? "9x12" : "11x6"; }
  function spotOf(fmt, pos) { var f = FORMATS[fmt]; if (!f || !f.map) return null; for (var i = 0; i < f.map.length; i++) if (f.map[i].pos === pos) return f.map[i]; return null; }
  function spotSize(fmt, pos) { var s = spotOf(fmt, pos); return s ? s.size : null; }
  function spotPrice(fmt, pos) { var s = spotOf(fmt, pos); return s ? FORMATS[fmt].sizes[s.size].price : null; }
  function spotLabel(fmt, pos) { var s = spotOf(fmt, pos); return s ? s.label : String(pos); }
  // Several spots make one ad when they're on the same side and fill a rectangle on the grid.
  function isBlock(fmt, list) {
    if (!list || !list.length) return false;
    var spots = list.map(function (p) { return spotOf(fmt, p); });
    if (spots.some(function (s) { return !s; })) return false;
    var seen = {}, r0 = 99, r1 = 0, c0 = 99, c1 = 0, n = 0;
    for (var i = 0; i < spots.length; i++) {
      var s = spots[i]; if (s.side !== spots[0].side) return false;
      for (var r = s.row; r < s.row + s.rowSpan; r++) for (var c = s.col; c < s.col + s.colSpan; c++) { var k = r + ":" + c; if (seen[k]) return false; seen[k] = 1; n++; r0 = Math.min(r0, r); r1 = Math.max(r1, r); c0 = Math.min(c0, c); c1 = Math.max(c1, c); }
    }
    return n === (r1 - r0 + 1) * (c1 - c0 + 1);
  }
  function passPrice(fmt, list) { return (list || []).reduce(function (n, p) { var q = spotPrice(fmt, p); return n + (q ? (q - PASS_OFF) * 3 : 0); }, 0); }
  function blockPrice(fmt, list) { return (list || []).reduce(function (n, p) { return n + (spotPrice(fmt, p) || 0); }, 0); }
  // Printed size of a block: a grid column is 2.2 in (a Half alone is 2.1), a row is 2.6 in.
  function blockDims(fmt, list) {
    var c0 = 99, c1 = 0, r0 = 99, r1 = 0;
    (list || []).forEach(function (p) { var s = spotOf(fmt, p); if (!s) return; c0 = Math.min(c0, s.col); c1 = Math.max(c1, s.col + s.colSpan - 1); r0 = Math.min(r0, s.row); r1 = Math.max(r1, s.row + s.rowSpan - 1); });
    var cols = c1 - c0 + 1, rows = r1 - r0 + 1, w = cols === 1 ? 2.1 : cols * 2.2, h = rows * 2.6;
    return (Math.round(w * 10) / 10) + "″ x " + (Math.round(h * 10) / 10) + "″";
  }
  function soldDollars(fmt, positions) {
    return (positions || []).reduce(function (n, p) { return n + (st(p) === "sold" ? spotPrice(fmt, p.position) || 0 : 0); }, 0);
  }
  function isConfirmed(m, positions) {
    var fmt = fmtOf(m);
    if (fmt === "9x12") return soldDollars(fmt, positions) >= ((m && m.minDollars) || FORMATS["9x12"].minDollars);
    return (positions || []).filter(function (p) { return st(p) === "sold"; }).length >= ((m && m.minSold) || 8);
  }
  function openOfSize(fmt, positions, size) {
    var open = {}; (positions || []).forEach(function (p) { if (st(p) === "open") open[p.position] = 1; });
    return (FORMATS[fmt].map || []).filter(function (s) { return s.size === size && open[s.pos]; }).map(function (s) { return s.pos; });
  }
  var FMT = { fmtOf: fmtOf, spotOf: spotOf, spotSize: spotSize, spotPrice: spotPrice, spotLabel: spotLabel, isBlock: isBlock, blockPrice: blockPrice, passPrice: passPrice, PASS_OFF: PASS_OFF, blockDims: blockDims, soldDollars: soldDollars, isConfirmed: isConfirmed, openOfSize: openOfSize, PAY_9x12: PAY_9x12, PASS_9x12: PASS_9x12 };
  root.CVS_FORMATS = FORMATS; root.CVS_FMT = FMT;
  if (typeof module !== "undefined" && module.exports) module.exports = { CVS_FORMATS: FORMATS, CVS_FMT: FMT };
})(typeof window !== "undefined" ? window : globalThis);
