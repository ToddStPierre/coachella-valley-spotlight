/* Builds data/feed-events.js: upcoming valley events pulled from free public event feeds
   (WordPress "The Events Calendar" JSON). Like the headlines, we only show the title, date, time,
   venue, city and price, and link to the source page. No descriptions or photos are copied, and
   these events don't get their own pages on our site.
   Runs on GitHub before build-seo.js. Routine classes and meetings are skipped, repeat showings
   are folded into one card, and anything that matches a hand-entered event in data/events.js is
   dropped (the hand-entered one wins). If every feed fails, the live list is kept.
   data/feed-events.js is generated, so it is gitignored. */
process.env.TZ = "America/Los_Angeles";
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.join(__dirname, "..");
const LIVE = "https://coachellavalleyspotlight.com/data/feed-events.js";
const OUT = path.join(ROOT, "data", "feed-events.js");
const DAYS = 60, MAX = 250, MAX_PAGES = 12;

// default venue/city is for feeds that leave the venue blank (The Living Desert does).
// delay: The Living Desert's robots.txt asks for 10 seconds between requests.
const SOURCES = [
  { name: "Discover Palm Desert", base: "https://discoverpalmdesert.com" },
  { name: "Discover Cathedral City", base: "https://www.discovercathedralcity.com" },
  { name: "The Living Desert", base: "https://www.livingdesert.org", venue: "The Living Desert", city: "Palm Desert", delay: 10000 },
  { name: "Palm Springs Chamber", base: "https://pschamber.org" }
];
const CITIES = ["Palm Springs", "Desert Hot Springs", "Cathedral City", "Rancho Mirage", "Palm Desert", "Indian Wells",
  "La Quinta", "Indio", "Coachella", "Thousand Palms", "Bermuda Dunes", "Thermal", "Mecca"];
// Routine programs, classes and business meetings: not "things to do" for the calendar.
const SKIP = /\b(class(es)?|support group|workshop|club|meeting|mixer|leads lunch|networking|orientation|tutoring|bingo|device advice|story ?time|zookeeper academy|me (&|and) you at the zoo|office hours|webinar|training|volunteer|commission|council|board of|ribbon cutting|seminar|cpr|blood drive|cancel+ed|postponed|therapy|social worker|notary|shredding|members?[- ]only|member hike|for seniors|senior services|tax help|health screening|vaccin\w*|clinic|counseling|legal aid|food distribution|pantry)\b/i;
// Venues the feeds file under the wrong city.
const VENUE_CITY = [[/acrisure arena/i, "Thousand Palms"]];
// Their category names -> ours.
const CATS = [[/concert|music|symphony|jazz/i, "Music"], [/theat|comedy|dance|perform|broadway|film|movie/i, "Theater"],
  [/sport|golf|tennis|hockey|race|run\b|marathon/i, "Sports"], [/art|exhibit|museum|gallery/i, "Arts"],
  [/family|kid|child|zoo|animal/i, "Family"], [/night|club|dj/i, "Nightlife"]];

function decode(s) {
  return String(s || "").replace(/<[^>]+>/g, " ").replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16))).replace(/&quot;/g, '"').replace(/&apos;|&#039;/g, "'")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
}
const ymd = d => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Los_Angeles" }).format(d);
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const shortDate = s => MON[+s.slice(5, 7) - 1] + " " + +s.slice(8, 10);
function clock(s) { const h = +s.slice(11, 13), m = s.slice(14, 16); return (h % 12 || 12) + ":" + m + (h < 12 ? " AM" : " PM"); }
function words(t) { return new Set(t.toLowerCase().replace(/[^a-z ]/g, " ").split(/\s+/).filter(w => w.length > 3 && !STOP.has(w))); }
const STOP = new Set(["annual", "cathedral", "city", "palm", "springs", "desert", "with", "featuring", "presents", "tour", "live", "show", "night"]);
function sameTitle(a, b) { let n = 0; for (const w of a) if (b.has(w)) n++; return n >= 1 && n / Math.min(a.size, b.size) >= 0.5; }
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function get(url) {
  const r = await fetch(url, { headers: { "User-Agent": "CoachellaValleySpotlight/1.0 (+https://coachellavalleyspotlight.com)" }, signal: AbortSignal.timeout(30000) });
  if (!r.ok) throw new Error(url + " -> " + r.status);
  return r.text();
}

async function readSource(src, from, to) {
  const out = [];
  let url = `${src.base}/wp-json/tribe/events/v1/events?per_page=50&start_date=${from}&end_date=${to}`;
  for (let page = 0; url && page < MAX_PAGES; page++) {
    if (page && src.delay) await sleep(src.delay);
    const d = JSON.parse(await get(url));
    for (const e of d.events || []) {
      const v = e.venue && !Array.isArray(e.venue) ? e.venue : {};
      const title = decode(e.title), venueName = decode(v.venue) || src.venue || "";
      const city = (VENUE_CITY.find(([re]) => re.test(venueName)) || [0, decode(v.city) || src.city || ""])[1];
      if (!title || e.status !== "publish" || e.is_virtual === true || SKIP.test(title) || !CITIES.includes(city)) continue;
      const date = e.start_date.slice(0, 10), end = (e.end_date || "").slice(0, 10);
      const cats = (e.categories || []).map(c => decode(c.name)).join(" ");
      const cost = decode(e.cost);
      const ev = { title: title.slice(0, 160), venue: venueName.slice(0, 100), city, date,
        time: e.all_day === true || e.all_day === "true" ? "All day" : clock(e.start_date),
        category: (CATS.find(([re]) => re.test(cats + " " + title)) || [0, "Community"])[1],
        url: e.url, source: src.name, feed: true };
      if (end > date && end <= ymd(new Date(Date.parse(date) + 14 * 86400000))) ev.endDate = end; // multi-day festival, not a months-long exhibit
      if (cost && cost.length <= 24) ev.price = cost;
      if (/^https:\/\//.test(ev.url)) out.push(ev);
    }
    url = d.next_rest_url || null;
  }
  return out;
}

function handEntered() {
  const ctx = { window: {} };
  try { vm.runInNewContext(fs.readFileSync(path.join(ROOT, "data", "events.js"), "utf8"), ctx); } catch (e) { return []; }
  return (ctx.window.CVS && ctx.window.CVS.events) || [];
}

async function live() {
  try { const m = (await get(LIVE + "?v=" + Date.now())).match(/window\.CVS\.feedEvents = (\[[\s\S]*\]);/); return m ? JSON.parse(m[1]) : []; }
  catch (e) { return []; }
}

(async () => {
  const today = ymd(new Date()), to = ymd(new Date(Date.now() + DAYS * 86400000));
  const results = await Promise.allSettled(SOURCES.map(s => readSource(s, today, to)));
  results.forEach((r, i) => console.log((r.status === "fulfilled" ? r.value.length + " kept" : "FAILED " + r.reason.message) + "  " + SOURCES[i].name));
  let fresh = results.flatMap(r => r.status === "fulfilled" ? r.value : []);
  if (!results.some(r => r.status === "fulfilled")) {
    fresh = (await live()).filter(e => (e.endDate || e.date) >= today);
    console.log("Every feed failed; keeping the live list (" + fresh.length + ").");
  }

  // Fold repeat showings (same title at the same venue) into the first upcoming one.
  fresh.sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  const runs = new Map();
  for (const e of fresh) {
    const key = e.title.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim() + "|" + e.venue.toLowerCase();
    if (!runs.has(key)) runs.set(key, { first: e, last: e.date, n: 1 });
    else { const r = runs.get(key); r.n++; if (e.date > r.last) r.last = e.date; }
  }
  // Drop anything already entered by hand, or already pulled from another feed on the same day.
  const hand = handEntered().map(h => ({ w: words(h.title), from: h.date, to: h.endDate || h.date }));
  const kept = [], list = [];
  for (const { first: e, last, n } of runs.values()) {
    if (n > 1 && last > e.date && !e.endDate) e.time += " · more dates through " + shortDate(last);
    const w = words(e.title);
    if (hand.some(h => sameTitle(h.w, w) && e.date <= h.to && (e.endDate || e.date) >= h.from)) continue;
    if (kept.some(k => k.date === e.date && sameTitle(k.w, w))) continue;
    kept.push({ w, date: e.date }); list.push(e);
  }
  const keep = list.slice(0, MAX);
  fs.writeFileSync(OUT, "/* GENERATED by tools/build-feed-events.js on every build. Do not edit. */\nwindow.CVS = window.CVS || {};\nwindow.CVS.feedEvents = " + JSON.stringify(keep, null, 0).replace(/},{/g, "},\n{") + ";\n");
  console.log("feed-events.js: " + keep.length + " events");
})();
