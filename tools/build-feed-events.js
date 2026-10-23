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
// type "tribe" (default) = WordPress Events Calendar JSON. The other types read the venue's own
// public listing page (allowed by each site's robots.txt). Venue sources come first: when the same
// show is in a venue list and a tourism feed, the venue's own link wins.
const SOURCES = [
  { name: "Acrisure Arena", type: "acrisure", url: "https://www.acrisurearena.com/events/all" },
  { name: "Agua Caliente", type: "agua", url: "https://www.aguacalientecasinos.com/entertainment" },
  { name: "Fantasy Springs", type: "fantasy", url: "https://www.fantasyspringsresort.com/entertainment" },
  { name: "Spotlight 29", type: "spotlight29", url: "https://www.spotlight29.com/entertainment" },
  { name: "VillageFest", base: "https://villagefest.org", venue: "Palm Canyon Drive", city: "Palm Springs" },
  { name: "Palm Springs Air Museum", base: "https://www.palmspringsairmuseum.org", venue: "Palm Springs Air Museum", city: "Palm Springs" },
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
  [/sport|golf|tennis|hockey|race|run\b|marathon|\bvs\.?\s|firebirds|boxing|basketball|wrestling|ufc|rodeo/i, "Sports"], [/art|exhibit|museum|gallery/i, "Arts"],
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

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
const pad = n => String(n).padStart(2, "0");
// "Nov", "November" + day (+ year if given; otherwise the next time that day comes around).
function toDate(mon, day, year, from) {
  const m = MONTHS.indexOf(String(mon).slice(0, 3).toLowerCase()); if (m < 0 || !+day) return "";
  if (year) return `${year}-${pad(m + 1)}-${pad(+day)}`;
  const y = +from.slice(0, 4); let d = `${y}-${pad(m + 1)}-${pad(+day)}`;
  if (d < ymd(new Date(Date.parse(from) - 2 * 86400000))) d = `${y + 1}-${pad(m + 1)}-${pad(+day)}`;
  return d;
}
function timeOf(s) { const m = String(s).match(/(\d{1,2})(?::(\d\d))?\s*([AP])\.?M/i); return m ? `${+m[1]}:${m[2] || "00"} ${m[3].toUpperCase()}M` : ""; }
const catOf = (title, fallback) => (CATS.find(([re]) => re.test(title)) || [0, fallback])[1];
const show = (src, o) => Object.assign({ category: catOf(o.title, "Music"), source: src.name, feed: true }, o);

// Venue list pages. Each returns the same shape as the tribe reader.
const VENUES = {
  async acrisure(src, from) {
    const html = await get(src.url), out = [];
    for (const b of html.split('<div class="eventItem').slice(1)) {
      const a = b.match(/<h3[^>]*>\s*<a href="([^"]+)"[^>]*>([^<]+)<\/a>/), ds = [...b.matchAll(/m-date__month">\s*(\w+)[\s\S]*?m-date__day">\s*(\d+)[\s\S]*?m-date__year">[,\s]*(\d{4})/g)];
      if (!a || !ds.length) continue;
      const e = show(src, { title: decode(a[2]), venue: "Acrisure Arena", city: "Thousand Palms", date: toDate(ds[0][1], ds[0][2], ds[0][3]), time: "", url: a[1] });
      const last = ds.length > 1 ? toDate(ds[ds.length - 1][1], ds[ds.length - 1][2], ds[ds.length - 1][3]) : "";
      if (last > e.date) e.endDate = last;
      out.push(e);
    }
    return out;
  },
  async agua(src, from) {
    const html = (await get(src.url)).replace(/\\"/g, '"').replace(/\\\//g, "/"), out = [], seen = new Set();
    const VEN = { "Rancho Mirage": "Agua Caliente Resort Casino Spa", "Palm Springs": "Agua Caliente Casino Palm Springs", "Cathedral City": "Agua Caliente Casino Cathedral City" };
    for (const m of html.matchAll(/"title":"((?:[^"\\]|\\.)+)","category_text":"([^"]*)","permalink":"([^"]+agua-event[^"]+)","card_image_url":"[^"]*","card_text":"((?:[^"\\]|\\.)*)"/g)) {
      const un = x => { try { return JSON.parse('"' + x + '"'); } catch (e) { return x; } };
      const title = decode(un(m[1])), text = decode(un(m[4]).replace(/<br>/gi, " | ")), city = m[2], url = m[3].replace("//cms.", "//www.");
      const d = text.match(/(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2})/);
      if (!d || !VEN[city] || seen.has(url)) continue;
      seen.add(url);
      out.push(show(src, { title, venue: VEN[city], city, date: toDate(d[1], d[2], "", from), time: timeOf(text), url }));
    }
    return out;
  },
  async fantasy(src, from) {
    const html = await get(src.url), out = [];
    for (const m of html.matchAll(/data-title="([^"]+)" data-description="([^"]*)" data-thumb="[^"]*" data-link="([^"]*)"/g)) {
      const d = m[2].match(/([A-Z]{3})\w*\s+(\d{1,2})(?:\s*-\s*(\d{1,2}))?/);
      if (!d || !m[3]) continue;
      const e = show(src, { title: decode(m[1]), venue: "Fantasy Springs Resort Casino", city: "Indio", date: toDate(d[1], d[2], "", from), time: timeOf(m[2]), url: (m[3].startsWith("//") ? "https:" : "") + m[3] });
      if (d[3]) e.endDate = toDate(d[1], d[3], "", from);
      out.push(e);
    }
    return out;
  },
  async spotlight29(src, from) {
    const html = await get(src.url), out = [];
    const links = {};
    try { for (const p of JSON.parse(await get("https://www.spotlight29.com/wp-json/wp/v2/entertainment?per_page=100"))) links[decode(p.title.rendered).toLowerCase()] = p.link; } catch (e) {}
    const text = html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, "").replace(/<[^>]+>/g, "\n").split("\n").map(decode).filter(Boolean);
    text.forEach((l, i) => {
      const d = l.match(/^(?:\w+day)\s+(\w+)\s+(\d{1,2}),\s*(\d{4})$/); if (!d) return;
      const title = text[i - 1]; if (!title || !links[title.toLowerCase()]) return; // only real shows from their own show list
      const doors = /doors/i.test(text[i + 2] || "") ? "Doors " + timeOf(text[i + 2]) : "";
      out.push(show(src, { title, venue: "Spotlight 29 Casino", city: "Coachella", date: toDate(d[1], d[2], d[3]), time: doors, url: links[title.toLowerCase()] }));
    });
    return out;
  }
};

async function readSource(src, from, to) {
  if (src.type && VENUES[src.type]) return (await VENUES[src.type](src, from)).filter(e => e.date && e.date >= from && e.date <= to && !SKIP.test(e.title));
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
  const rank = Object.fromEntries(SOURCES.map((s, i) => [s.name, i]));
  fresh.sort((a, b) => a.date.localeCompare(b.date) || rank[a.source] - rank[b.source] || a.time.localeCompare(b.time));
  const runs = new Map();
  for (const e of fresh) {
    const key = e.title.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim() + "|" + e.venue.toLowerCase();
    if (!runs.has(key)) runs.set(key, { first: e, last: e.date, n: 1, dates: [e.date] });
    else { const r = runs.get(key); r.n++; if (e.date > r.last) r.last = e.date; if (!r.dates.includes(e.date)) r.dates.push(e.date); }
  }
  // Drop anything already entered by hand, or already pulled from another feed on the same day.
  const hand = handEntered().map(h => ({ w: words(h.title), from: h.date || h.from || today, to: h.endDate || h.until || h.date || to })); // weekly events cover their whole season
  const kept = [], list = [];
  for (const { first: e, last, n, dates } of runs.values()) {
    if (n > 1 && last > e.date && !e.endDate) { e.time = (e.time ? e.time + " · " : "") + "more dates through " + shortDate(last); e.dates = dates.slice(0, 40); } // dates: for the "This weekend" filter
    const w = words(e.title);
    if (hand.some(h => sameTitle(h.w, w) && e.date <= h.to && (e.endDate || e.date) >= h.from)) continue;
    if (kept.some(k => k.date === e.date && sameTitle(k.w, w))) continue;
    kept.push({ w, date: e.date }); list.push(e);
  }
  const keep = list.slice(0, MAX);
  fs.writeFileSync(OUT, "/* GENERATED by tools/build-feed-events.js on every build. Do not edit. */\nwindow.CVS = window.CVS || {};\nwindow.CVS.feedEvents = " + JSON.stringify(keep, null, 0).replace(/},{/g, "},\n{") + ";\n");
  console.log("feed-events.js: " + keep.length + " events");
})();
