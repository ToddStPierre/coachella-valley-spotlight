/* Builds data/headlines.js: valley headlines pulled from local newsrooms' public RSS feeds.
   We only show the headline, source, date and a direct link to the publisher's story (never the article itself).
   Runs on GitHub before build-seo.js. Feeds only hold the last day or two, so it merges with the
   headlines already live on the site and keeps the last DAYS days. If every feed fails, the live
   list is kept as is. data/headlines.js is generated, so it is gitignored. */
const fs = require("fs");
const path = require("path");

const SITE = "https://coachellavalleyspotlight.com/data/headlines.js";
const OUT = path.join(__dirname, "..", "data", "headlines.js");
const DAYS = 21, MAX = 60;

// Most specific first: "Palm Desert" before "Desert", "Coachella Valley" before "Coachella".
const PLACES = [
  ["Palm Springs"], ["Desert Hot Springs"], ["Cathedral City"], ["Rancho Mirage"], ["Palm Desert"],
  ["Indian Wells"], ["La Quinta"], ["Indio", /\bIndio\b/], ["Thousand Palms"], ["Bermuda Dunes"], ["Thermal", /\bThermal,|\bin Thermal\b/],
  ["Mecca", /\bMecca\b(?! of)/], ["Valley-wide", /\bCoachella Valley\b|\bthe valley's\b/i], ["Coachella", /\bCoachella\b/]
];
const GN_QUERY = '"Palm Springs" OR "Palm Desert" OR "La Quinta" OR "Indio" OR "Cathedral City" OR "Rancho Mirage" OR "Indian Wells" OR "Desert Hot Springs" OR "Coachella Valley" when:7d';
const FEEDS = [
  { source: "KESQ", url: "https://kesq.com/feed/", skip: /\/kunamundo\// }, // skip KESQ's Spanish-language section
  { source: "The Palm Springs Post", url: "https://thepalmspringspost.com/feed/" },
  { source: "Coachella Valley Independent", url: "https://cvindependent.com/feed/" },
  { source: "Palm Springs Life", url: "https://www.palmspringslife.com/feed/" },
  { source: null, url: "https://news.google.com/rss/search?hl=en-US&gl=US&ceid=US:en&q=" + encodeURIComponent(GN_QUERY) } // source comes from each item
];
// Google News is only used to find stories from outlets that block feed readers (the Desert Sun, NBC Palm Springs).
// Its links are google.com redirects, so each one is resolved to the publisher's own URL below, and only these
// local and regional newsrooms are kept from it. A story whose link can't be resolved is dropped, never shown.
const GN_SOURCES = /^(The Desert Sun|Desert Sun|KESQ|NBC Palm Springs|KMIR|Palm Springs Life|The Palm Springs Post|Coachella Valley Independent|CV Independent|Coachella Valley Weekly|Patch|KTLA|Los Angeles Times|The Press-Enterprise|Press-Enterprise|Riverside County)\b/i;
const GN = /news\.google\.com/;
// Pages that are promotion, not reporting: Palm Springs Life's visitor guide ("Book your stay at…") and its
// "Vision" economic-development section. Checked on the publisher's URL, so it works for feed and Google News items.
const SKIP_URLS = /palmspringslife\.com\/(the-guide|vision)\/|\/press-release\//i;
// Sources that are listings, robots or tourist listicles, not local news.
const SKIP_SOURCES = /^(NFHS Network|Yahoo|MSN|AOL|Realtor\.com|Zillow|Redfin|Homes\.com|Trulia|Tripadvisor|Travel \+ Leisure|Fodor's|Thrillist|Eventbrite|MaxPreps)\b/i;
const SKIP_TITLES = /magnitude|earthquake struck|live (& |and )?on demand|best places to|things to do in|weekend getaway|visitor['’]?s guide|,\s*(FL|Fla\.?|Florida)\b/i;
// Good-news hub: leave out crime, crashes and deaths. A headline that trips this is dropped.
const GRIM = /\b(kill(ed|s|ing)?|dead|death|dies|died|murder\w*|homicide|shoot\w*|shot|stabb\w*|crash\w*|collision|fatal\w*|arrest\w*|charged|sentenced|suspect\w*|assault\w*|rape|body found|overdose|missing|manhunt|carjack\w*|robber\w*|burglar\w*|police chase|wreck|injur\w*|hospitalized|DUI|deadly|accused|trial|knife|attack\w*|gunfire|victim\w*)\b/i;

function decode(s) {
  return String(s || "").replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").replace(/<[^>]+>/g, " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n)).replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)))
    .replace(/&quot;/g, '"').replace(/&apos;|&#039;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&")
    .replace(/\s+/g, " ").trim();
}
function tag(xml, name) { const m = xml.match(new RegExp("<" + name + "\\b[^>]*>([\\s\\S]*?)</" + name + ">")); return m ? m[1] : ""; }
function placeOf(text) { for (const [name, re] of PLACES) if ((re || new RegExp("\\b" + name + "\\b")).test(text)) return name; return null; }
function words(title) { return new Set(title.toLowerCase().replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter(w => w.length > 3)); }
// Same story from two outlets: most of the longer words match.
function same(a, b) { let n = 0; for (const w of a) if (b.has(w)) n++; return n >= 3 && n / Math.min(a.size, b.size) >= 0.5; }
function pacificDate(d) { return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Los_Angeles" }).format(d); }

async function get(url) {
  const r = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 (compatible; CoachellaValleySpotlight/1.0; +https://coachellavalleyspotlight.com)" }, signal: AbortSignal.timeout(20000) });
  if (!r.ok) throw new Error(url + " -> " + r.status);
  return r.text();
}

// news.google.com/rss/articles/<id> -> the publisher's URL, the same way Google's own page does it.
const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36";
async function resolveGN(gnUrl) {
  const id = new URL(gnUrl).pathname.split("/").pop();
  const page = await (await fetch("https://news.google.com/rss/articles/" + id, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(15000) })).text();
  const sg = (page.match(/data-n-a-sg="([^"]+)"/) || [])[1], ts = (page.match(/data-n-a-ts="([^"]+)"/) || [])[1];
  if (!sg || !ts) throw new Error("no signature");
  const req = [[["Fbv4je", JSON.stringify(["garturlreq", [["X", "X", ["X", "X"], null, null, 1, 1, "US:en", null, 1, null, null, null, null, null, 0, 1], "X", "X", 1, [1, 1, 1], 1, 1, null, 0, 0, null, 0], id, +ts, sg]), null, "generic"]]];
  const r = await fetch("https://news.google.com/_/DotsSplashUi/data/batchexecute", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8", "User-Agent": UA }, body: "f.req=" + encodeURIComponent(JSON.stringify(req)), signal: AbortSignal.timeout(15000) });
  const url = JSON.parse(JSON.parse((await r.text()).split("\n\n")[1])[0][2])[1];
  if (!/^https:\/\//.test(url) || GN.test(url)) throw new Error("bad url");
  return url;
}

async function readFeed(feed) {
  const xml = await get(feed.url), out = [];
  for (const m of xml.matchAll(/<item\b[\s\S]*?<\/item>/g)) {
    const item = m[0], url = decode(tag(item, "link"));
    let title = decode(tag(item, "title")), source = feed.source;
    if (!source) { source = decode(tag(item, "source")); if (source && title.endsWith(" - " + source)) title = title.slice(0, -(source.length + 3)); }
    if (!title || !/^https:\/\//.test(url) || (feed.skip && feed.skip.test(url))) continue;
    if ((GN.test(url) && !GN_SOURCES.test(source || "")) || SKIP_URLS.test(url)) continue;
    const when = new Date(decode(tag(item, "pubDate")));
    if (isNaN(when)) continue;
    // WordPress feeds end with "The post X appeared first on <outlet>", and outlet names hold city names.
    const desc = decode(tag(item, "description")).replace(/(The post .*? appeared first on| is a story from) .*$/i, "").split(source || "\u0000").join(" ");
    const city = placeOf(title + " " + desc);
    if (!city || GRIM.test(title) || SKIP_TITLES.test(title) || SKIP_SOURCES.test(source || "")) continue;
    out.push({ title: title.slice(0, 200), city, date: pacificDate(when), time: when.toISOString(), source: (source || "News").slice(0, 60), url, feed: true });
  }
  return out;
}

async function live() {
  try {
    const js = await get(SITE + "?v=" + Date.now());
    const m = js.match(/window\.CVS\.headlines = (\[[\s\S]*\]);/);
    return m ? JSON.parse(m[1]) : [];
  } catch (e) { return []; }
}

(async () => {
  const results = await Promise.allSettled(FEEDS.map(readFeed));
  results.forEach((r, i) => console.log((r.status === "fulfilled" ? r.value.length + " kept" : "FAILED " + r.reason.message) + "  " + FEEDS[i].url.slice(0, 60)));
  const fresh = results.flatMap(r => r.status === "fulfilled" ? r.value : []);
  const old = await live();
  if (!results.some(r => r.status === "fulfilled") && old.length) console.log("Every feed failed; keeping the live list.");
  const cutoff = pacificDate(new Date(Date.now() - DAYS * 86400000)), seen = new Set(), kept = [], list = [];
  // Newsroom feeds before Google News, so a story carried by both keeps the direct link.
  for (const h of [...fresh.filter(h => !GN.test(h.url)), ...fresh.filter(h => GN.test(h.url)), ...old]) {
    const w = words(h.title);
    if (h.date < cutoff || seen.has(h.url) || GRIM.test(h.title) || SKIP_TITLES.test(h.title) || SKIP_SOURCES.test(h.source) || SKIP_URLS.test(h.url) || (GN.test(h.url) && !GN_SOURCES.test(h.source)) || kept.some(k => same(k, w))) continue;
    seen.add(h.url); kept.push(w); list.push(h);
  }
  list.sort((a, b) => b.time.localeCompare(a.time));
  // Swap every Google News link for the publisher's own, newest first, until MAX are ready. Live headlines already
  // carry resolved links, so each run only resolves the handful of new ones.
  const keep = [], links = new Set(list.filter(h => !GN.test(h.url)).map(h => h.url));
  let resolved = 0, dropped = 0;
  for (const h of list) {
    if (keep.length >= MAX) break;
    if (GN.test(h.url)) {
      try { h.url = await resolveGN(h.url); resolved++; } catch (e) { dropped++; continue; }
      if (links.has(h.url) || SKIP_URLS.test(h.url)) { dropped++; continue; }
      links.add(h.url);
    }
    keep.push(h);
  }
  console.log("Google News links resolved: " + resolved + ", dropped: " + dropped);
  fs.writeFileSync(OUT, "/* GENERATED by tools/build-headlines.js on every build. Do not edit. */\nwindow.CVS = window.CVS || {};\nwindow.CVS.headlines = " + JSON.stringify(keep, null, 0).replace(/},{/g, "},\n{") + ";\n");
  console.log("headlines.js: " + keep.length + " headlines");
})();
