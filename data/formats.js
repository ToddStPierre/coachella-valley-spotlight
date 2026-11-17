/* POSTCARD CARD FORMATS
   A card's format comes from data/mailings.js ("format"). No format = the old 11 x 6 card (16 equal spots).
   "9x12" = the card from the Jan 21, 2027 mailing on: 19 fixed spots in four sizes (Todd's mockups, 2026-11-17).
   The reservations Worker (03-build-reservations/worker.js) keeps a copy of this table. Keep the two the same.
   map: pos = spot number. Drawn on a 3-column grid; row/rowSpan count half-Medium-height rows (row 0 = the Mini row on the back). */
(function (root) {
  var FORMATS = {
    "11x6": { spots: 16 },
    "9x12": {
      spots: 19, minDollars: 2500,
      sizes: {
        large: { label: "Large", price: 500, pass: 1375, dims: "5.8″ x 3.5″", perHome: "$0.10" },
        medium: { label: "Medium", price: 300, pass: 825, dims: "2.85″ x 3.5″", perHome: "$0.06" },
        small: { label: "Small", price: 150, pass: 410, dims: "2.85″ x 1.7″", perHome: "$0.03" },
        mini: { label: "Mini", price: 100, pass: 275, dims: "2.85″ x 0.95″", perHome: "$0.02" }
      },
      sizeOrder: ["large", "medium", "small", "mini"],
      map: [
        { pos: 1, size: "large", side: "front", col: 1, colSpan: 2, row: 1, rowSpan: 2 },
        { pos: 2, size: "medium", side: "front", col: 3, colSpan: 1, row: 1, rowSpan: 2 },
        { pos: 3, size: "medium", side: "front", col: 1, colSpan: 1, row: 3, rowSpan: 2 },
        { pos: 4, size: "medium", side: "front", col: 2, colSpan: 1, row: 3, rowSpan: 2 },
        { pos: 5, size: "medium", side: "front", col: 3, colSpan: 1, row: 3, rowSpan: 2 },
        { pos: 6, size: "medium", side: "front", col: 1, colSpan: 1, row: 5, rowSpan: 2 },
        { pos: 7, size: "large", side: "front", col: 2, colSpan: 2, row: 5, rowSpan: 2 },
        { pos: 8, size: "mini", side: "back", col: 1, colSpan: 1, row: 0, rowSpan: 1 },
        { pos: 9, size: "mini", side: "back", col: 2, colSpan: 1, row: 0, rowSpan: 1 },
        { pos: 10, size: "mini", side: "back", col: 3, colSpan: 1, row: 0, rowSpan: 1 },
        { pos: 11, size: "large", side: "back", col: 1, colSpan: 2, row: 1, rowSpan: 2 },
        { pos: 12, size: "small", side: "back", col: 3, colSpan: 1, row: 1, rowSpan: 1 },
        { pos: 13, size: "small", side: "back", col: 3, colSpan: 1, row: 2, rowSpan: 1 },
        { pos: 14, size: "medium", side: "back", col: 1, colSpan: 1, row: 3, rowSpan: 2 },
        { pos: 15, size: "medium", side: "back", col: 2, colSpan: 1, row: 3, rowSpan: 2 },
        { pos: 16, size: "medium", side: "back", col: 3, colSpan: 1, row: 3, rowSpan: 2 },
        { pos: 17, size: "small", side: "back", col: 1, colSpan: 1, row: 5, rowSpan: 1 },
        { pos: 18, size: "small", side: "back", col: 1, colSpan: 1, row: 6, rowSpan: 1 },
        { pos: 19, size: "large", side: "back", col: 2, colSpan: 2, row: 5, rowSpan: 2 }
      ]
    }
  };
  // Stripe Payment Links per 9x12 size. "" = hold-and-invoice only. Each link redirects to /reserve?paid=1.
  var PAY_9x12 = {
    large: "https://pay.coachellavalleyspotlight.com/b/00wdR9e6scVE4YwdYK9MY0N",
    medium: "https://pay.coachellavalleyspotlight.com/b/4gM3cvgeAcVE0Igg6S9MY0M",
    small: "https://pay.coachellavalleyspotlight.com/b/9B6eVdbYk9JsaiQg6S9MY0L",
    mini: "https://pay.coachellavalleyspotlight.com/b/9B6fZhe6s1cWez63k69MY0K"
  };
  // Season Pass (3 mailings, 1 card) links per size. The Medium pass is the existing $825 link.
  var PASS_9x12 = { large: "", medium: "https://pay.coachellavalleyspotlight.com/b/5kQdR98M8cVE4Yw8Eq9MY0I", small: "", mini: "" };

  function st(p) { return String((p && p.status) || "open").toLowerCase(); }
  function fmtOf(m) { return m && m.format === "9x12" ? "9x12" : "11x6"; }
  function spotOf(fmt, pos) { var f = FORMATS[fmt]; if (!f || !f.map) return null; for (var i = 0; i < f.map.length; i++) if (f.map[i].pos === pos) return f.map[i]; return null; }
  function spotSize(fmt, pos) { var s = spotOf(fmt, pos); return s ? s.size : null; }
  function spotPrice(fmt, pos) { var s = spotOf(fmt, pos); return s ? FORMATS[fmt].sizes[s.size].price : null; }
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
  var FMT = { fmtOf: fmtOf, spotOf: spotOf, spotSize: spotSize, spotPrice: spotPrice, soldDollars: soldDollars, isConfirmed: isConfirmed, openOfSize: openOfSize, PAY_9x12: PAY_9x12, PASS_9x12: PASS_9x12 };
  root.CVS_FORMATS = FORMATS; root.CVS_FMT = FMT;
  if (typeof module !== "undefined" && module.exports) module.exports = { CVS_FORMATS: FORMATS, CVS_FMT: FMT };
})(typeof window !== "undefined" ? window : globalThis);
