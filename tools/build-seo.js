/* Search-engine build. Runs on GitHub after build-profiles.js, on every push and once a day.
   1. Puts the directory, deal and event cards straight into the HTML of the home, directory, deals
      and events pages, so Google sees them without running JavaScript. app.js still redraws them.
   2. Builds a page for every upcoming event at event/<slug>/ with Event schema.
   3. Builds city and category pages under local/ (rules are in tools/lib.js landingPages).
   4. Writes sitemap.xml.
   It changes the HTML files in place, so it is meant for the GitHub build. If you run it locally
   (node tools/build-profiles.js && node tools/build-seo.js), undo the HTML changes after with:
   git checkout -- index.html directory.html deals.html events.html news.html */
process.env.TZ = "America/Los_Angeles";
const fs = require("fs"), path = require("path"), vm = require("vm");
const { root, SITE, loadData, esc, slugify, ldjson, landingPages, shell, metaTags, breadcrumbs, photoFigure } = require("./lib");

const D = loadData();
const places = D.places || { cities: {}, categories: {} };
const list = (D.directory || []).filter(b => !b.sample);
const { head, headRest, header, footer } = shell();
const write = (rel, html) => { fs.mkdirSync(path.join(root, rel), { recursive: true }); fs.writeFileSync(path.join(root, rel, "index.html"), html); console.log("built " + rel); };
const page = ({ meta, schema, body }) => `${head}${metaTags(meta)}<base href="/">
${headRest}${schema.map(ldjson).join("")}
</head>
<body>
${header}
<main id="main" tabindex="-1">
${body}
</main>
${footer}
<script src="data/events.js"></script><script src="assets/app.js"></script>
</body>
</html>
`;
/* Rough city centers (lat, lng), only used to sort "nearby" links by distance. */
const CITY_LL = { "Desert Hot Springs": [33.961, -116.502], "Palm Springs": [33.830, -116.545], "Cathedral City": [33.780, -116.466], "Rancho Mirage": [33.740, -116.413], "Thousand Palms": [33.820, -116.390], "Palm Desert": [33.722, -116.374], "Indian Wells": [33.718, -116.341], "Bermuda Dunes": [33.743, -116.290], "La Quinta": [33.663, -116.310], "Indio": [33.720, -116.216], "Coachella": [33.680, -116.174] };
const cityDist = (a, b) => { const p = CITY_LL[a], q = CITY_LL[b]; return p && q ? Math.hypot(p[0] - q[0], p[1] - q[1]) : 99; };
const andList = a => a.length < 2 ? a.join("") : a.slice(0, -1).join(", ") + " and " + a[a.length - 1];

/* 1. Run the card code from app.js (everything above its PRERENDER-END line). */
const app = fs.readFileSync(path.join(root, "assets/app.js"), "utf8");
const ctx = { window: { CVS: D }, document: { documentElement: { getAttribute: () => "" } }, URL };
vm.runInNewContext(app.slice(app.indexOf("{") + 1, app.indexOf("/* PRERENDER-END")) +
  "\n;__out = { R: R, events: events, deals: deals, news: news, directory: directory, pickList: pickList, eventSlug: eventSlug, parse: parse, MONTHS_LONG: MONTHS_LONG, googleCal: googleCal, calLinks: calLinks, listBand: listBand, windowFor: windowFor, inWindow: inWindow, iso: iso };", ctx);
const C = ctx.__out;
const listBand = C.listBand;
const TYPE = { events: "event", deals: "deal", news: "news", directory: "directory" };
const cards = (key, items) => items.map(C.R[TYPE[key]]).join("");

/* 2. Event pages */
const offsetOn = d => { const m = new Intl.DateTimeFormat("en-US", { timeZone: "America/Los_Angeles", timeZoneName: "shortOffset" }).format(d).match(/GMT([+-]\d+)/); const h = m ? +m[1] : -8; return (h < 0 ? "-" : "+") + String(Math.abs(h)).padStart(2, "0") + ":00"; };
function isoStart(e) {
  const m = String(e.time || "").match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!m) return e.date;
  let h = +m[1] % 12; if (/pm/i.test(m[3])) h += 12;
  return `${e.date}T${String(h).padStart(2, "0")}:${m[2]}:00${offsetOn(C.parse(e.date))}`;
}
const niceDate = d => d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
const eventPaths = [];
fs.rmSync(path.join(root, "event"), { recursive: true, force: true });
for (const e of C.events.filter(e => !e.feed)) {
  const slug = C.eventSlug(e), url = `event/${slug}/`;
  eventPaths.push(url);
  const start = C.parse(e.date), end = e.endDate && C.parse(e.endDate);
  const when = e.recurring ? `${e.recurring}${e.until ? " through " + niceDate(C.parse(e.until)) : ""} (next: ${niceDate(start)})` : end ? `${niceDate(start)} to ${niceDate(end)}` : niceDate(start);
  const desc = `${e.title} at ${e.venue}, ${e.city}. ${when}${e.time ? ", " + e.time : ""}. ${e.description || ""}`.trim().slice(0, 300);
  const others = C.events.filter(x => x !== e).slice(0, 4);
  const schema = {
    "@context": "https://schema.org", "@type": "Event", name: e.title, description: e.description || undefined,
    startDate: isoStart(e), endDate: e.endDate || undefined, url: SITE + "/" + url,
    eventStatus: "https://schema.org/EventScheduled", eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    location: { "@type": "Place", name: e.venue, address: { "@type": "PostalAddress", addressLocality: e.city, addressRegion: "CA", addressCountry: "US" } },
    offers: e.price ? { "@type": "Offer", description: e.price, url: e.url || SITE + "/" + url } : undefined
  };
  write(url, page({
    meta: { title: `${e.title} | ${e.city}, ${start.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`, description: desc, url },
    schema: [schema, breadcrumbs([["Home", ""], ["Events", "events"], [e.title, url]])],
    body: `<section class="page-hero"><div class="wrap">
<nav class="crumbs" aria-label="Breadcrumb"><a href="events">Events</a> &rsaquo; <span>${esc(e.city)}</span></nav>
<span class="eyebrow" style="margin-top:24px"><span class="stripe-mini"></span>${esc(e.category || "Event")} &middot; ${esc(e.city)}</span>
<h1>${esc(e.title)}</h1>
${e.description ? `<p>${esc(e.description)}</p>` : ""}
<dl class="facts"><dt>When</dt><dd>${esc(when)}${e.time ? " &middot; " + esc(e.time) : ""}</dd><dt>Where</dt><dd>${esc(e.venue)}, ${esc(e.city)}</dd>${e.price ? `<dt>Price</dt><dd>${esc(e.price)}</dd>` : ""}</dl>
<div class="cta-row">${e.url ? `<a class="btn" href="${esc(e.url)}" target="_blank" rel="noopener">Official event page &rarr;</a>` : ""}${C.calLinks(e)}</div>
<p class="risk">Details can change. Check with the organizer before you go.</p>
</div></section>
${others.length ? `<section class="section" style="padding-top:0"><div class="wrap"><div class="section-head"><div><span class="eyebrow">On the calendar</span><h2>More things to do in the Coachella Valley</h2></div><a class="more" href="events">Open the calendar &rarr;</a></div><div class="grid-2">${cards("events", others)}</div></div></section>` : ""}
<div class="wrap"><div class="biz-band"><p><strong>Hosting something?</strong><br>Send it in. Listing an event is free.</p><a class="btn" href="submit">Submit an event</a></div></div>`
  }));
}

/* 3. City and category pages */
const landing = landingPages(list);
fs.rmSync(path.join(root, "local"), { recursive: true, force: true });
/* The broad category a page belongs to ("Gyms" belongs to "Fitness"). */
const topCat = o => o.field === "service" ? o.items[0].category : o.category;
/* Narrower pages under a broad one: "Fitness in Coachella" → "Gyms in Coachella", "Boxing and martial arts in Coachella". */
const subPages = p => p.field === "category" ? landing.filter(o => o.field === "service" && o.kind === p.kind && o.city === p.city && topCat(o) === p.category && o.category !== p.category) : [];
/* Sponsored ads on matching /local/ pages (data/sponsors.js). On pages without a hero photo, the first ad
   sits in the hero's right column as a card (sponsorSide). Pages with a hero photo get a band above the listings. */
const TODAY_ISO = new Date().toISOString().slice(0, 10);
const adsFor = p => (D.sponsors || []).filter(s => (s.placements || []).includes("category:" + topCat(p)) && (!s.start || s.start <= TODAY_ISO) && (!s.until || s.until >= TODAY_ISO));
// Off-site links open in a new tab with rel="sponsored nofollow"; links to our own pages (e.g. business/<slug>/) stay plain.
const linkAttrs = s => /^https?:/.test(s.url) ? `href="${esc(s.url)}" target="_blank" rel="sponsored nofollow noopener"` : `href="${esc(s.url)}"`;
const adNote = s => `<p class="sponsor-note">${s.affiliate ? "Paid placement. Coachella Valley Spotlight earns a commission if you buy through this link." : "Paid placement."}</p>`;
const adImg = s => `<a class="sponsor-img" ${linkAttrs(s)} data-sponsor="${esc(s.id)}"><img src="${esc(s.image)}" alt="${esc(s.alt)}" loading="lazy" width="${s.w || 900}" height="${s.h || 630}"></a>`;
const adBtn = s => `<a class="btn" ${linkAttrs(s)} data-sponsor="${esc(s.id)}">${esc(s.cta)} &rarr;</a>`;
const sponsorBand = p => adsFor(p).map(s => `<aside class="sponsor-band" aria-label="Sponsored: ${esc(s.name)}">${adImg(s)}
<div class="sponsor-copy"><span class="sponsor-tag">Sponsored</span><h2>${esc(s.headline)}</h2><p>${esc(s.text)}</p>${adBtn(s)}
${adNote(s)}</div></aside>`).join("\n");
const sponsorSide = p => { const s = adsFor(p)[0]; return s ? `<aside class="sponsor-side" aria-label="Sponsored: ${esc(s.name)}"><span class="sponsor-tag">Sponsored</span>${adImg(s)}
<h2>${esc(s.headline)}</h2><p>${esc(s.short || s.text)}</p>${adBtn(s)}${adNote(s)}</aside>` : ""; };
for (const p of landing) {
  const items = C.directory.filter(b => p.items.includes(b));
  const heading = p.kind === "city" ? `Local Businesses in ${p.city}, CA` : p.kind === "category" ? `${p.category} in the Coachella Valley` : `${p.category} in ${p.city}, CA`;
  const intro = [p.city && places.cities[p.city], p.category && ((places.categories || {})[p.category] || (places.services || {})[p.category])].filter(Boolean);
  const names = items.slice(0, 3).map(b => b.name);
  // Public places (dog parks, trails) aren't businesses, so their pages get their own wording.
  const allPublic = items.length && items.every(b => b.public);
  const somePublic = items.some(b => b.public);
  const countLine = p.category && !allPublic && somePublic
    ? `${items.length} ${p.category.toLowerCase()}${/[^is]s$/i.test(p.category) ? "" : " places"} are listed${p.city ? " in " + p.city : " across the valley"} right now, including ${andList(names)}. Each one has its own page with the location and details.`
    : allPublic
    ? `${items.length} ${p.category.toLowerCase()}${/[^is]s$/i.test(p.category) ? "" : " places"} are listed${p.city ? " in " + p.city : " across the valley"} right now, including ${andList(names)}. Each one has its own page with the location, details and a link to the official site.`
    : `${items.length} ${p.category ? p.category.toLowerCase() + (/[^is]s$/i.test(p.category) && !/services$/i.test(p.category) ? " are" : " businesses are") : "local businesses are"} listed${p.city ? " in " + p.city : " across the valley"} right now, including ${andList(names)}. Each one has its own page with the phone number, website and details, and premium listings show current offers.`;
  const related = landing.filter(o => o !== p && (
    (p.kind === "city" && o.kind === "combo" && o.city === p.city) ||
    (p.kind === "category" && ((o.kind === "combo" && o.category === p.category) || o.kind === "category")) ||
    (p.kind === "combo" && ((o.kind === "city" && o.city === p.city) || (o.kind === "category" && o.category === p.category))) ||
    (p.kind === "combo" && p.field === "service" && o.kind === "combo" && o.field === "category" && o.city === p.city && o.category === topCat(p))));
  const subs = subPages(p);
  const subChips = subs.length ? `<div class="chips sub-chips"><span class="sub-label">Narrow it down:</span>${subs.map(o => `<a class="chip" href="${o.path}">${esc(o.category)}</a>`).join("")}</div>` : "";
  // City + service pages: point to the same service in the nearest other cities that have their own page.
  const near = p.kind === "combo" ? landing.filter(o => o.kind === "combo" && o.category === p.category && o.city !== p.city)
    .sort((x, y) => cityDist(p.city, x.city) - cityDist(p.city, y.city)).slice(0, 3) : [];
  const nearLine = near.length ? `<p class="near-line">More ${esc(p.category.toLowerCase())} nearby: ${andList(near.map(o => `<a href="${o.path}">${esc(o.city)}</a>`))}.</p>` : "";
  const label = o => o.kind === "city" ? `All businesses in ${o.city}` : o.kind === "category" ? `${o.category}, valley-wide` : `${o.category} in ${o.city}`;
  // Activity pages (dog parks, hiking trails) get a hero photo, valley-wide and per city.
  const ACT_PHOTO = { "Dog parks": "dog-parks", "Hiking trails": "hiking-trails", "Pickleball": "pickleball", "Tennis": "tennis", "Swimming & water parks": "swimming", "Museums & attractions": "attractions", "Skate parks": "skate-parks", "Disc golf": "disc-golf", "Bowling": "bowling" };
  const fig = p.kind !== "city" && ACT_PHOTO[p.category] ? photoFigure(p.category, `assets/img/activities/${ACT_PHOTO[p.category]}.jpg`, p.category) : "";
  const side = fig || sponsorSide(p);
  // Hiking trails pages: a "dogs allowed" filter and a desert hiking box.
  const hike = p.category === "Hiking trails";
  const dogTrails = hike ? items.filter(b => (b.features || []).includes("Dogs on leash")) : [];
  const dogFilter = dogTrails.length && dogTrails.length < items.length
    ? `<div class="chips trail-filter" role="group" aria-label="Filter trails"><button type="button" class="chip" aria-pressed="true" data-tf="">All trails (${items.length})</button><button type="button" class="chip" aria-pressed="false" data-tf="${dogTrails.map(b => b.slug).join(" ")}">Dogs allowed (${dogTrails.length})</button></div>
<p class="tf-note" hidden>These trails allow dogs on a leash. Some others allow dogs on part of the trail, like the Hopalong Cassidy between the Gabby Hayes junction and the cross, so check the dog rules on each trail's page.</p>
<script>(function(){var bs=document.querySelectorAll(".trail-filter .chip"),n=document.querySelector(".tf-note");bs.forEach(function(b){b.addEventListener("click",function(){var s=b.getAttribute("data-tf"),k=s?s.split(" "):null;bs.forEach(function(x){x.setAttribute("aria-pressed",x===b?"true":"false")});document.querySelectorAll(".grid [data-biz]").forEach(function(c){c.hidden=!!k&&k.indexOf(c.getAttribute("data-biz"))<0});if(n)n.hidden=!k})})})();</script>`
    : "";
  const hikeBox = hike ? `<div class="pf-card golf-season hike-box"><h2>Hiking in the desert: before you go</h2><ul>
<li><b>Season:</b> October to April is the time for the desert-floor trails. In summer, hike only at first light, or go up the Tram, where Long Valley sits at 8,400 feet and is much cooler (expect snow in winter).</li>
<li><b>Water:</b> carry more than you think you need. Tahquitz Canyon's rule of thumb is at least a quart for every hour of hiking. Most trails have no water once you leave the trailhead.</li>
<li><b>Sun:</b> most low trails have little or no shade. Wear a hat, sunscreen and closed-toe shoes, and start early.</li>
<li><b>Dogs:</b> they're banned on most National Monument trails to protect endangered bighorn sheep, leashed or not, and the tribal canyons allow no animals. In warm weather, hot ground can burn paws.</li>
<li><b>Hours change with the seasons:</b> the Indian Canyons and Tahquitz Canyon go to Friday to Sunday from July 6 to October 1, Thousand Palms opens only on weekends from May to October, and Whitewater needs summer weekend reservations. Check each trail's page.</li>
</ul></div>` : "";
  const trail = [["Home", ""], ["Directory", "directory"]];
  if (p.kind === "combo") trail.push([p.city, `local/${slugify(p.city)}/`]);
  trail.push([heading, p.path]);
  write(p.path, page({
    meta: { title: heading, description: `${heading}: ${andList(names)}${items.length > 3 ? " and more" : ""}. Phone numbers, websites and local deals on Coachella Valley Spotlight.`.slice(0, 300), url: p.path, noindex: !p.index },
    schema: [{ "@context": "https://schema.org", "@type": "ItemList", name: heading, itemListElement: items.map((b, i) => ({ "@type": "ListItem", position: i + 1, url: `${SITE}/business/${b.slug}/`, name: b.name })) }, breadcrumbs(trail)],
    body: `<section class="page-hero"><div class="wrap${side ? " city-hero" : ""}">${side ? "<div>" : ""}
<nav class="crumbs" aria-label="Breadcrumb"><a href="directory">Directory</a>${p.kind === "combo" && landing.some(o => o.kind === "city" && o.city === p.city) ? ` &rsaquo; <a href="local/${slugify(p.city)}/">${esc(p.city)}</a>` : ""}</nav>
<span class="eyebrow" style="margin-top:24px"><span class="stripe-mini"></span>Local directory</span>
<h1>${esc(heading)}</h1>
${intro.map(t => `<p>${esc(t)}</p>`).join("\n")}
<p>${esc(countLine)}</p>
${subChips}
${side ? `</div>${side}` : ""}</div></section>
<section style="padding-bottom:var(--s5)"><div class="wrap">
${fig ? sponsorBand(p) : ""}
${dogFilter}
<div class="grid">${cards("directory", items)}</div>
${nearLine}
${hikeBox}
${related.length ? `<h2 class="month-head" style="margin-top:48px"><span class="stripe-mini"></span>Keep browsing</h2><ul class="link-list">${related.map(o => `<li><a href="${o.path}">${esc(label(o))}</a></li>`).join("")}<li><a href="directory">The full directory</a></li></ul>` : ""}
<div class="biz-band" style="margin-top:48px"><p><strong>Own a business${p.city ? " in " + esc(p.city) : ""}?</strong><br>Listing it here is free.</p><a class="btn" href="submit">Add my business</a></div>
</div></section>`
  }));
}

/* 3b. City pages: city/<slug>/, linked from the Cities menu. The homepage mix (events, deals, businesses, headlines) for one city.
   Cards are pre-rendered here; app.js re-renders the same blocks in the browser with data-city filtering. */
const CITY_PAGES = ["Desert Hot Springs", "Palm Springs", "Cathedral City", "Thousand Palms", "Rancho Mirage", "Palm Desert", "Indian Wells", "Bermuda Dunes", "La Quinta", "Indio", "Coachella"];
const DATA_SCRIPTS = '<script src="data/events.js"></script><script src="data/feed-events.js"></script><script src="data/deals.js"></script><script src="data/news.js"></script><script src="data/headlines.js"></script><script src="data/directory.js"></script>';
fs.rmSync(path.join(root, "city"), { recursive: true, force: true });
const cityPaths = [];
for (const city of CITY_PAGES) {
  const slug = slugify(city), url = `city/${slug}/`, q = encodeURIComponent(city);
  const ev = C.events.filter(e => e.city === city), dl = C.deals.filter(d => d.city === city), biz = C.directory.filter(b => b.city === city && !b.sample);
  const intro = places.cities[city] || `${city} is part of the Coachella Valley.`;
  const block = (attrs, html) => `<div ${attrs}>${html}</div>`;
  const sec = (eyebrow, h2, more, inner, first) => `<section class="section"${first ? "" : ' style="padding-top:0"'}><div class="wrap">
<div class="section-head"><div><span class="eyebrow">${eyebrow}</span><h2>${h2}</h2></div>${more}</div>
${inner}
</div></section>`;
  const fig = photoFigure(city, `assets/img/cities/${slug}.jpg`, `${city}, California`);
  const cityLinks = landing.filter(o => o.city === city && o.kind === "combo").sort((a, b) => a.category.localeCompare(b.category));
  const cityHub = landing.find(o => o.kind === "city" && o.city === city);
  // "Browse <City> businesses by type": a button that opens a panel of real links (crawlable, unlike a <select>).
  const typeMenu = cityLinks.length || cityHub ? `<details class="type-menu"><summary class="chip">Browse ${esc(city)} businesses by type</summary><ul class="link-list">${cityHub ? `<li><a href="${cityHub.path}">All businesses in ${esc(city)}</a></li>` : ""}${cityLinks.map(o => `<li><a href="${o.path}">${esc(o.category)}</a></li>`).join("")}</ul></details>` : "";
  let body = `<section class="page-hero"><div class="wrap city-hero${fig ? "" : " no-photo"}"><div>
<nav class="crumbs" aria-label="Breadcrumb"><a href="./">Home</a> &rsaquo; ${esc(city)}</nav>
<span class="eyebrow" style="margin-top:24px"><span class="stripe-mini"></span>City guide</span>
<h1>${esc(city)}</h1>
<p>${esc(intro)}</p>
<div class="chips">${ev.length ? `<a class="chip" href="events?city=${q}">Things to do</a>` : ""}<a class="chip" href="directory?city=${q}">Local businesses</a>${dl.length ? '<a class="chip" href="#deals">Deals</a>' : ""}</div>
${typeMenu}
</div>${fig}</div></section>`;
  if (ev.length) body += sec("On the calendar", `Coming up in ${esc(city)}`, `<a class="more" href="events?city=${q}">All ${esc(city)} events &rarr;</a>`,
    block(`class="grid-2" data-city="${esc(city)}" data-list="events" data-limit="6"`, cards("events", ev.slice(0, 6))), true);
  if (dl.length) body += sec('Local deals<span id="deals"></span>', `Deals in ${esc(city)}`, '<a class="more" href="deals">All deals &rarr;</a>',
    block(`class="grid" data-city="${esc(city)}" data-list="deals" data-limit="6"`, cards("deals", dl.slice(0, 6))), !ev.length);
  if (biz.length) body += sec("Local directory", `Businesses in ${esc(city)}`, `<a class="more" href="directory?city=${q}">All ${biz.length} in ${esc(city)} &rarr;</a>`,
    block(`class="grid" data-city="${esc(city)}" data-list="directory" data-limit="8"`, cards("directory", biz.slice(0, 8))), !ev.length && !dl.length);
  // Headlines are pre-rendered too; a city with none skips the section (app.js hides it the same way).
  const hl = C.pickList("news", n => ({ "data-city": city, "data-limit": "3" })[n] || null);
  if (hl.length) body += sec("Local headlines", `News from ${esc(city)}`, '<a class="more" href="news">All headlines &rarr;</a>',
    block(`class="grid" data-city="${esc(city)}" data-list="news" data-limit="3" data-hide-empty`, cards("news", hl)), false);
  body += `<div class="wrap" style="padding-bottom:var(--s5)"><div class="biz-band"><p><strong>Own a business in ${esc(city)}?</strong><br>Listing it here is free.</p><a class="btn" href="submit?plan=basic#form">Add my business</a></div></div>`;
  const title = `${city}, CA: Things to Do, Deals and Local Businesses`;
  write(url, page({
    meta: { title, description: `What's on in ${city}: upcoming events, local deals and ${biz.length} local businesses. ${intro}`.slice(0, 300), url },
    schema: [{ "@context": "https://schema.org", "@type": "CollectionPage", name: title, about: { "@type": "City", name: city, containedInPlace: { "@type": "State", name: "California" } },
      mainEntity: { "@type": "ItemList", itemListElement: biz.slice(0, 8).map((b, i) => ({ "@type": "ListItem", position: i + 1, url: `${SITE}/business/${b.slug}/`, name: b.name })) } },
      breadcrumbs([["Home", ""], [city, url]])],
    body
  }).replace('<script src="data/events.js"></script><script src="assets/app.js"></script>', DATA_SCRIPTS + '<script src="assets/app.js"></script>'));
  cityPaths.push(url);
}

/* 3c. This weekend: this-weekend/ for the valley and this-weekend/<city>/ for each city page.
   Fixed URLs that refill every build (every 3 hours), so they can rank for "things to do this weekend".
   Mon to Thu shows the coming Fri to Sun; Fri to Sun shows today through Sunday (same window as events?when=weekend).
   City pages are always built so their URLs never 404, but are noindex (and left out of the sitemap) under 3 events. */
fs.rmSync(path.join(root, "this-weekend"), { recursive: true, force: true });
const weekendPaths = [];
{
  const w = C.windowFor("weekend"), days = [];
  for (let d = C.parse(w[0]); C.iso(d) <= w[1]; d.setDate(d.getDate() + 1)) days.push(C.iso(d));
  const dayName = s => C.parse(s).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
  const short = s => C.parse(s).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const range = days.length > 1 ? `${short(days[0])}–${short(days[days.length - 1])}` : short(days[0]);
  const longRange = days.length > 1 ? `${dayName(days[0])} to ${dayName(days[days.length - 1])}` : dayName(days[0]);
  const all = C.events.filter(e => C.inWindow(e, w));
  // Multi-day events that run every day of the window go in "All weekend" instead of repeating under each day.
  const allWeekend = e => !e.dates && e.endDate && e.date <= w[0] && e.endDate >= w[1] && days.length > 1;
  const isFree = e => /\bfree\b/i.test((e.description || "") + " " + (e.time || "")) && !/\$\d/.test(e.description || "");
  const weekendPage = (city, items, url) => {
    const where = city || "the Coachella Valley", whereShort = city || "the valley";
    const cities = [...new Set(items.map(e => e.city))];
    const free = items.filter(isFree);
    const picks = items.filter(e => !e.feed).concat(items.filter(e => e.feed)).slice(0, 3).map(e => e.title);
    let body = `<section class="page-hero"><div class="wrap city-hero no-photo"><div>
<nav class="crumbs" aria-label="Breadcrumb"><a href="./">Home</a> &rsaquo; <a href="events">Events</a> &rsaquo; ${city ? `<a href="this-weekend/">This weekend</a> &rsaquo; ${esc(city)}` : "This weekend"}</nav>
<span class="eyebrow" style="margin-top:24px"><span class="stripe-mini"></span>${esc(longRange)}</span>
<h1>Things to Do This Weekend in <span class="grad">${esc(where)}.</span></h1>
<p>${items.length ? `${items.length} event${items.length === 1 ? "" : "s"} ${city ? `in ${esc(city)}` : `across ${cities.length} ${cities.length === 1 ? "city" : "cities"}`} this weekend${picks.length ? `, including ${esc(andList(picks))}` : ""}.${free.length ? ` ${free.length} of them ${free.length === 1 ? "is" : "are"} free.` : ""} This page updates on its own every few hours.` : `Nothing is on the calendar in ${esc(where)} this weekend yet. Here&rsquo;s what&rsquo;s happening nearby.`}</p>
<div class="chips">${days.map(d => `<a class="chip" href="${url}#${d}">${esc(C.parse(d).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }))}</a>`).join("")}<a class="chip" href="events">Full calendar</a></div>
</div></div></section>
<section style="padding-bottom:var(--s5)"><div class="wrap">`;
    const group = (id, h, list) => list.length ? `<section class="guide-day" id="${id}"><h2 class="month-head"><span class="stripe-mini"></span>${h}</h2><div class="grid-2">${cards("events", list)}</div></section>` : "";
    const long = items.filter(allWeekend);
    body += group("all-weekend", "All weekend long", long);
    // A feed show that opened earlier ("& Juliet", Oct 29 to Nov 1) shows that day's date on its card, not its opening night.
    // Hand-entered events keep their own date, because their event/<slug>/ link is built from it.
    const onDay = (e, d) => e.feed && e.date < d ? Object.assign({}, e, { date: d }) : e;
    for (const d of days) body += group(d, esc(dayName(d)), items.filter(e => !allWeekend(e) && C.inWindow(e, [d, d])).map(e => onDay(e, d)));
    if (!items.length) {
      const near = all.slice().sort((a, b) => cityDist(city, a.city) - cityDist(city, b.city)).slice(0, 8);
      body += near.length ? group("nearby", "Nearby this weekend", near) : `<div class="empty">Nothing on the calendar yet. Check back soon.</div>`;
    }
    // City links (valley page) or a link back up (city pages).
    const counts = CITY_PAGES.map(c => [c, all.filter(e => e.city === c).length]).filter(x => x[1]);
    body += city ? `<p style="margin-top:var(--s4)"><a href="this-weekend/">Everything happening in the Coachella Valley this weekend &rarr;</a></p>`
      : counts.length ? `<div class="browse-links"><h2 class="month-head"><span class="stripe-mini"></span>This weekend by city</h2><ul class="link-list">${counts.map(([c, n]) => `<li><a href="this-weekend/${slugify(c)}/">${esc(c)} (${n})</a></li>`).join("")}</ul></div>` : "";
    body += `<div class="seo-copy guide-faq"><h2>This weekend in ${esc(whereShort)}: quick answers</h2>
<h3>What is there to do in ${esc(where)} this weekend?</h3><p>${items.length ? `${items.length} things are on the calendar for ${esc(longRange)}. ${esc(andList(items.slice(0, 5).map(e => `${e.title} (${e.city})`)))}${items.length > 5 ? ", and more listed above" : ""}.` : `Nothing is listed in ${esc(where)} this weekend yet. Nearby events are listed above.`}</p>
<h3>What is free to do this weekend?</h3><p>${free.length ? `${esc(andList(free.slice(0, 6).map(e => e.title)))}${free.length > 6 ? `, plus ${free.length - 6} more` : ""}.` : "Nothing on this weekend&rsquo;s list is marked free. Farmers markets, parks and hiking trails always are."} See <a href="local/hiking-trails/">hiking trails</a> and <a href="local/dog-parks/">dog parks</a> for free things to do any day.</p>
<p>Times and details come from each organizer and can change, so check the event&rsquo;s own page before you go. Hosting something that isn&rsquo;t here? <a href="submit">Add it free</a>.</p></div>
</div></section>`;
    const title = `Things to Do This Weekend in ${city ? city + ", CA" : "the Coachella Valley"} (${range})`;
    const description = (items.length ? `${items.length} things to do in ${where} this weekend, ${range}: ${andList(picks)}${free.length ? `, plus ${free.length} free events` : ""}. Updated every few hours.` : `What's happening in and near ${where} this weekend, ${range}.`).slice(0, 300);
    const shown = items.length ? items : [];
    write(url, page({
      meta: { title, description, url, noindex: city && items.length < INDEX_MIN_WEEKEND },
      schema: [{ "@context": "https://schema.org", "@type": "CollectionPage", name: title, description,
        mainEntity: { "@type": "ItemList", itemListElement: shown.slice(0, 30).map((e, i) => ({ "@type": "ListItem", position: i + 1, name: e.title, url: e.feed ? e.url || undefined : `${SITE}/event/${C.eventSlug(e)}/` })) } },
        breadcrumbs([["Home", ""], ["Events", "events"], ["This weekend", "this-weekend/"]].concat(city ? [[city, url]] : []))],
      body
    }).replace('<script src="data/events.js"></script><script src="assets/app.js"></script>', DATA_SCRIPTS + '<script src="assets/app.js"></script>'));
    if (!city || items.length >= INDEX_MIN_WEEKEND) weekendPaths.push(url);
  };
  const INDEX_MIN_WEEKEND = 3;
  weekendPage(null, all, "this-weekend/");
  for (const city of CITY_PAGES) weekendPage(city, all.filter(e => e.city === city), `this-weekend/${slugify(city)}/`);
}

/* 1b. Pre-render the card lists into the hub pages, plus the browse links on the directory page. */
const empty = '<div class="empty">Nothing here yet. Check back soon.</div>';
function eventsByMonth(items) {
  let html = "", last = "";
  for (const e of items) {
    const d = C.parse(e.date), m = C.MONTHS_LONG[d.getMonth()] + " " + d.getFullYear();
    if (m !== last) { html += (last ? "</div>" : "") + `<h2 class="month-head"><span class="stripe-mini"></span>${m}</h2><div class="grid-2">`; last = m; }
    html += C.R.event(e);
  }
  return html + "</div>";
}
/* Directory groups, same as the live page in app.js: postcard advertisers in a Featured section, then one heading per category, A to Z. */
function byCategory(items) {
  const feat = items.filter(b => b.postcard), groups = {};
  for (const b of items) if (!b.postcard) (groups[b.category || "Other"] = groups[b.category || "Other"] || []).push(b);
  const hh = items.filter(b => b.happyHour); if (hh.length) groups["Happy hours"] = hh;
  const names = Object.keys(groups).sort(), id = c => "cat-" + c.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const head = (i, label, n) => `<h2 class="month-head" id="${i}"><span class="stripe-mini"></span>${esc(label)} <span class="cat-count">${n}</span></h2>`;
  const jumps = (feat.length ? [`<a href="#cat-featured">Featured (${feat.length})</a>`] : []).concat(names.map(c => `<a href="#${id(c)}">${esc(c)} (${groups[c].length})</a>`));
  return (jumps.length > 1 ? `<p class="cat-jump">${jumps.join("")}</p>` : "") +
    (feat.length ? `<section class="featured-band">${head("cat-featured", "Featured Listings", feat.length)}<p class="featured-note">Local businesses on the current Spotlight postcard.</p><div class="grid">${cards("directory", feat)}</div></section>` : "") +
    names.map((c, i) => `${head(id(c), c, groups[c].length)}<div class="grid">${cards("directory", groups[c])}</div>${listBand(i, names.length)}`).join("");
}
/* Directory page "Browse by city and category": one collapsible row per city and per broad category, so the page
   stays short but every landing page is still linked (Google reads links inside closed <details>). */
const pill = (o, text) => `<li><a href="${o.path}">${esc(text)}</a></li>`;
const browseRow = (title, n, links) => `<details class="browse-row"><summary>${esc(title)} <span class="cat-count">${n}</span></summary><ul class="link-list">${links}</ul></details>`;
const byCityRows = landing.filter(o => o.kind === "city").sort((a, b) => a.city.localeCompare(b.city)).map(c => {
  const combos = landing.filter(o => o.kind === "combo" && o.city === c.city).sort((a, b) => a.category.localeCompare(b.category));
  return browseRow(c.city, c.items.length, pill(c, "All businesses in " + c.city) + combos.map(o => pill(o, o.category)).join(""));
}).join("");
const tops = landing.filter(o => o.kind === "category" && o.field === "category").sort((a, b) => a.category.localeCompare(b.category));
const byCatRows = tops.map(t => {
  const svc = landing.filter(o => o.kind === "category" && o.field === "service" && topCat(o) === t.category && o.category !== t.category).sort((a, b) => a.category.localeCompare(b.category));
  return browseRow(t.category, t.items.length, pill(t, "All " + t.category.toLowerCase()) + svc.map(o => pill(o, o.category)).join(""));
}).join("");
const orphanSvc = landing.filter(o => o.kind === "category" && o.field === "service" && !tops.some(t => t.category === topCat(o)));
const browseLinks = landing.length ? `<div class="browse-links"><h2 class="month-head"><span class="stripe-mini"></span>Browse by city and category</h2><div class="browse-cols"><div><h3>By city</h3>${byCityRows}</div><div><h3>By category</h3>${byCatRows}${orphanSvc.length ? browseRow("More", orphanSvc.length, orphanSvc.map(o => pill(o, o.category)).join("")) : ""}</div></div></div>` : "";
/* Reads an opening tag's attributes into { name: value } (bare attributes get ""). */
const attrsOf = str => { const a = {}; str.replace(/([\w-]+)(?:="([^"]*)")?/g, (m, k, v) => { a[k] = v === undefined ? "" : v; }); return a; };
for (const file of ["index.html", "directory.html", "deals.html", "events.html", "news.html", "halloween.html", "welcome.html", "farmers-markets.html"]) {
  const p = path.join(root, file);
  let html = fs.readFileSync(p, "utf8");
  // Any empty data-list / data-browse block (or one holding only the "Turn on JavaScript" placeholder) gets its cards.
  html = html.replace(/<(div|ol) ([^>]*\bdata-(browse|list)="(\w+)"[^>]*)>(?:<noscript><div class="empty">Turn on JavaScript to see the (?:listings|headlines)\.<\/div><\/noscript>)?(?=<\/(?:div|ol)>)/g, (m, tag, attrs, mode, key) => {
    if (!TYPE[key]) return m;
    const open = `<${tag} ${attrs}>`, a = attrsOf(attrs);
    if (mode === "list") {
      const items = C.pickList(key, n => n in a ? a[n] : null);
      const view = a["data-view"] === "row" ? TYPE[key] + "Row" : TYPE[key], opt = { img: "data-img" in a };
      return open + (items.length ? items.map(x => C.R[view](x, opt)).join("") : empty);
    }
    const items = C[key];
    if (!items.length) return open + empty;
    return open + (key === "events" ? eventsByMonth(items) : key === "directory" ? byCategory(items) : `<div class="${key === "news" ? "grid-2" : "grid"}">${cards(key, items)}</div>`);
  });
  html = html.replace(/<span data-count="(\w+)"><\/span>/g, (m, k) => `<span data-count="${k}">${(C[k] || []).filter(x => !x.sample).length}</span>`);
  html = html.replace("<!--browse-links-->", browseLinks);
  fs.writeFileSync(p, html);
  console.log("prerendered " + file);
}

/* 4. Sitemap */
const golfCtx = { window: {} };
if (fs.existsSync(path.join(root, "data", "golf.js"))) require("vm").runInNewContext(fs.readFileSync(path.join(root, "data", "golf.js"), "utf8"), golfCtx);
const golfPaths = ((golfCtx.window.CVS || {}).golf || []).map(c => `golf/${c.slug}/`);
const urls = ["", "directory", "deals", "events", "halloween", "welcome", "farmers-markets", "golf/", "advertise", "submit", "story", "contact", "mailing-area-el-paseo", "mailing-area-sun-city", "mailing-calendar", "pricing", "legal"]
  .concat(cityPaths, weekendPaths, list.map(b => `business/${b.slug}/`), eventPaths, landing.filter(p => p.index).map(p => p.path), golfPaths);
fs.writeFileSync(path.join(root, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url><loc>${esc(SITE + "/" + u)}</loc></url>`).join("\n")}
</urlset>
`);
console.log(`sitemap.xml: ${urls.length} pages`);
