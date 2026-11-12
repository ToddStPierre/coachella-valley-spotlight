/* Puts every directory listing on the map: writes data/geo.js, window.CVS_GEO = { slug: [lat, lng, h] }.
   h is a short hash of the address, so a listing is looked up again only when its address changes.
   A listing that couldn't be found is stored as [null, null, h] so it isn't retried on every build
   (run with --retry to try those again).

   1. US Census batch geocoder (free, no key, one request for everything new).
   2. Anything the Census misses: OpenStreetMap Nominatim, one per second, with a named User-Agent.
   Results outside the valley are thrown away.

   data/geo.js IS committed. Run locally after adding listings: node tools/geocode.js
   The GitHub Action also runs it before deploy (continue-on-error), so new listings get pins even if
   nobody ran it locally; those results just aren't saved back to the repo. */
const fs = require("fs"), path = require("path");
const { root, loadData, slugOf } = require("./lib");
const OUT = path.join(root, "data", "geo.js");
const RETRY = process.argv.includes("--retry");
const UA = "CoachellaValleySpotlight-geocoder/1.0 (+https://coachellavalleyspotlight.com/contact)";
const BOX = { s: 33.45, n: 34.1, w: -116.75, e: -115.85 }; // Coachella Valley, with room for Whitewater and Thermal
const inBox = (lat, lng) => lat > BOX.s && lat < BOX.n && lng > BOX.w && lng < BOX.e;

function hash(s) { let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h.toString(36); }
const sleep = ms => new Promise(r => setTimeout(r, ms));

/* "75-030 Gerald Ford Dr Ste 203, Palm Desert, CA 92211" -> street "75030 Gerald Ford Dr", city, zip */
function parts(b) {
  const segs = b.address.split(",").map(s => s.trim()).filter(Boolean);
  const zip = (b.address.match(/\b9[0-6]\d{3}\b/) || [""])[0];
  // The street is the first segment that starts with a number (skips "Suite B1" or a building name in front).
  let street = segs.find(s => /^\d/.test(s)) || segs[0];
  street = street
    .replace(/\s*(,|\b)(suite|ste\.?|unit|bldg\.?|building|space|spc\.?)\s*[\w-]+$/i, "")
    .replace(/\s*#\s*[\w-]+$/, "")
    .replace(/^(\d+)-(\d+)\b/, "$1$2")
    .replace(/\b(hwy|highway|ca-|state route|sr-?)\s*111\b/i, "Highway 111")
    .replace(/\b(hwy|highway|ca-)\s*74\b/i, "Highway 74")
    .trim();
  return { street, city: b.city, zip };
}

function csvCell(s) { return '"' + String(s).replace(/"/g, "") + '"'; }

async function census(todo) {
  if (!todo.length) return {};
  const rows = todo.map((b, i) => { const p = parts(b); return [i, csvCell(p.street), csvCell(p.city), "CA", p.zip].join(","); }).join("\n");
  const form = new FormData();
  form.append("addressFile", new Blob([rows], { type: "text/csv" }), "addresses.csv");
  form.append("benchmark", "Public_AR_Current");
  const res = await fetch("https://geocoding.geo.census.gov/geocoder/locations/addressbatch", { method: "POST", body: form, headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error("Census geocoder HTTP " + res.status);
  const out = {};
  for (const line of (await res.text()).split("\n")) {
    const m = line.match(/^"(\d+)","[^"]*","Match","[^"]*","[^"]*","(-?[\d.]+),(-?[\d.]+)"/);
    if (m) { const lng = +m[2], lat = +m[3]; if (inBox(lat, lng)) out[todo[+m[1]].__slug] = [+lat.toFixed(5), +lng.toFixed(5)]; }
  }
  return out;
}

async function nominatim(b) {
  const p = parts(b);
  const tries = [
    { street: p.street, city: p.city, state: "CA", postalcode: p.zip, countrycodes: "us" },
    { q: b.address, countrycodes: "us" },
    { q: b.name + ", " + b.city + ", CA", countrycodes: "us" }
  ];
  for (const t of tries) {
    const q = new URLSearchParams(Object.assign({ format: "jsonv2", limit: "1" }, t));
    for (const k of [...q.keys()]) if (!q.get(k)) q.delete(k);
    await sleep(1100);
    try {
      const res = await fetch("https://nominatim.openstreetmap.org/search?" + q, { headers: { "User-Agent": UA, "Accept-Language": "en" } });
      if (!res.ok) continue;
      const [hit] = await res.json();
      if (hit && inBox(+hit.lat, +hit.lon)) return [+(+hit.lat).toFixed(5), +(+hit.lon).toFixed(5)];
    } catch (e) { /* network hiccup: try the next form */ }
  }
  return null;
}

(async () => {
  const list = loadData().directory.filter(b => b.address && !b.sample);
  let geo = {};
  if (fs.existsSync(OUT)) { const ctx = {}; new Function("window", fs.readFileSync(OUT, "utf8"))(ctx); geo = ctx.CVS_GEO || {}; }

  const todo = [];
  for (const b of list) {
    const slug = slugOf(b), h = hash(b.address), have = geo[slug];
    if (have && have[2] === h && (have[0] != null || !RETRY)) continue;
    b.__slug = slug; b.__h = h; todo.push(b);
  }
  console.log(`${list.length} listings with an address, ${todo.length} to look up`);

  let fromCensus = {};
  if (todo.length) {
    try { fromCensus = await census(todo); } catch (e) { console.warn("Census lookup failed:", e.message); }
  }
  let nom = 0, miss = [];
  for (const b of todo) {
    let ll = fromCensus[b.__slug];
    if (!ll) { ll = await nominatim(b); if (ll) nom++; }
    if (ll) geo[b.__slug] = [ll[0], ll[1], b.__h];
    else { geo[b.__slug] = [null, null, b.__h]; miss.push(b.name + " (" + b.address + ")"); }
  }
  // Drop listings that no longer exist.
  const live = new Set(list.map(slugOf));
  for (const k of Object.keys(geo)) if (!live.has(k)) delete geo[k];

  const keys = Object.keys(geo).sort();
  const body = keys.map(k => JSON.stringify(k) + ":" + JSON.stringify(geo[k])).join(",\n");
  fs.writeFileSync(OUT, "/* Map pins for the directory: slug -> [lat, lng, address hash]. Generated by tools/geocode.js; don't edit by hand. */\nwindow.CVS_GEO = {\n" + body + "\n};\n");
  const found = keys.filter(k => geo[k][0] != null).length;
  console.log(`Census ${Object.keys(fromCensus).length}, OpenStreetMap ${nom}, not found ${miss.length}. On the map: ${found} of ${keys.length}.`);
  if (miss.length) console.log("Not found:\n  " + miss.join("\n  "));
})();
