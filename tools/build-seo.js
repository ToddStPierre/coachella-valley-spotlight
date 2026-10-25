/* Search-engine build. Runs on GitHub after build-profiles.js, on every push and once a day.
   1. Puts the directory, deal and event cards straight into the HTML of the home, directory, deals
      and events pages, so Google sees them without running JavaScript. app.js still redraws them.
   2. Builds a page for every upcoming event at event/<slug>/ with Event schema.
   3. Builds city and category pages under local/ (rules are in tools/lib.js landingPages).
   4. Writes sitemap.xml.
   It changes the HTML files in place, so it is meant for the GitHub build. If you run it locally
   (node tools/build-profiles.js && node tools/build-seo.js), undo the HTML changes after with:
   git checkout -- index.html directory.html deals.html events.html */
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
const andList = a => a.length < 2 ? a.join("") : a.slice(0, -1).join(", ") + " and " + a[a.length - 1];

/* 1. Run the card code from app.js (everything above its PRERENDER-END line). */
const app = fs.readFileSync(path.join(root, "assets/app.js"), "utf8");
const ctx = { window: { CVS: D }, document: { documentElement: { getAttribute: () => "" } }, URL };
vm.runInNewContext(app.slice(app.indexOf("{") + 1, app.indexOf("/* PRERENDER-END")) +
  "\n;__out = { R: R, events: events, deals: deals, directory: directory, eventSlug: eventSlug, parse: parse, MONTHS_LONG: MONTHS_LONG, googleCal: googleCal, calLinks: calLinks, listBand: listBand };", ctx);
const C = ctx.__out;
const listBand = C.listBand;
const TYPE = { events: "event", deals: "deal", directory: "directory" };
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
    (p.kind === "combo" && ((o.kind === "city" && o.city === p.city) || (o.kind === "category" && o.category === p.category)))));
  const label = o => o.kind === "city" ? `All businesses in ${o.city}` : o.kind === "category" ? `${o.category}, valley-wide` : `${o.category} in ${o.city}`;
  // Activity pages (dog parks, hiking trails) get a hero photo, valley-wide and per city.
  const ACT_PHOTO = { "Dog parks": "dog-parks", "Hiking trails": "hiking-trails", "Pickleball": "pickleball", "Tennis": "tennis", "Swimming & water parks": "swimming", "Museums & attractions": "attractions", "Skate parks": "skate-parks", "Disc golf": "disc-golf", "Bowling": "bowling" };
  const fig = p.kind !== "city" && ACT_PHOTO[p.category] ? photoFigure(p.category, `assets/img/activities/${ACT_PHOTO[p.category]}.jpg`, p.category) : "";
  const trail = [["Home", ""], ["Directory", "directory"]];
  if (p.kind === "combo") trail.push([p.city, `local/${slugify(p.city)}/`]);
  trail.push([heading, p.path]);
  write(p.path, page({
    meta: { title: heading, description: `${heading}: ${andList(names)}${items.length > 3 ? " and more" : ""}. Phone numbers, websites and local deals on Coachella Valley Spotlight.`.slice(0, 300), url: p.path, noindex: !p.index },
    schema: [{ "@context": "https://schema.org", "@type": "ItemList", name: heading, itemListElement: items.map((b, i) => ({ "@type": "ListItem", position: i + 1, url: `${SITE}/business/${b.slug}/`, name: b.name })) }, breadcrumbs(trail)],
    body: `<section class="page-hero"><div class="wrap${fig ? " city-hero" : ""}">${fig ? "<div>" : ""}
<nav class="crumbs" aria-label="Breadcrumb"><a href="directory">Directory</a>${p.kind === "combo" && landing.some(o => o.kind === "city" && o.city === p.city) ? ` &rsaquo; <a href="local/${slugify(p.city)}/">${esc(p.city)}</a>` : ""}</nav>
<span class="eyebrow" style="margin-top:24px"><span class="stripe-mini"></span>Local directory</span>
<h1>${esc(heading)}</h1>
${intro.map(t => `<p>${esc(t)}</p>`).join("\n")}
<p>${esc(countLine)}</p>
${fig ? `</div>${fig}` : ""}</div></section>
<section style="padding-bottom:var(--s5)"><div class="wrap">
<div class="grid">${cards("directory", items)}</div>
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
  let body = `<section class="page-hero"><div class="wrap city-hero${fig ? "" : " no-photo"}"><div>
<nav class="crumbs" aria-label="Breadcrumb"><a href="./">Home</a> &rsaquo; ${esc(city)}</nav>
<span class="eyebrow" style="margin-top:24px"><span class="stripe-mini"></span>City guide</span>
<h1>${esc(city)}</h1>
<p>${esc(intro)}</p>
<div class="chips">${ev.length ? `<a class="chip" href="events?city=${q}">Things to do</a>` : ""}<a class="chip" href="directory?city=${q}">Local businesses</a>${dl.length ? '<a class="chip" href="#deals">Deals</a>' : ""}</div>
</div>${fig}</div></section>`;
  if (ev.length) body += sec("On the calendar", `Coming up in ${esc(city)}`, `<a class="more" href="events?city=${q}">All ${esc(city)} events &rarr;</a>`,
    block(`class="grid-2" data-city="${esc(city)}" data-list="events" data-limit="6"`, cards("events", ev.slice(0, 6))), true);
  if (dl.length) body += sec('Local deals<span id="deals"></span>', `Deals in ${esc(city)}`, '<a class="more" href="deals">All deals &rarr;</a>',
    block(`class="grid" data-city="${esc(city)}" data-list="deals" data-limit="6"`, cards("deals", dl.slice(0, 6))), !ev.length);
  if (biz.length) body += sec("Local directory", `Businesses in ${esc(city)}`, `<a class="more" href="directory?city=${q}">All ${biz.length} in ${esc(city)} &rarr;</a>`,
    block(`class="grid" data-city="${esc(city)}" data-list="directory" data-limit="8"`, cards("directory", biz.slice(0, 8))), !ev.length && !dl.length);
  body += sec("Local headlines", `News from ${esc(city)}`, '<a class="more" href="news">All headlines &rarr;</a>',
    block(`class="grid" data-city="${esc(city)}" data-list="news" data-limit="3" data-hide-empty`, '<noscript><div class="empty">Turn on JavaScript to see the headlines.</div></noscript>'), false);
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
const browseLinks = landing.length ? `<div class="browse-links"><h2 class="month-head"><span class="stripe-mini"></span>Browse by city and category</h2><ul class="link-list">${landing.map(o => `<li><a href="${o.path}">${esc(o.kind === "city" ? "Businesses in " + o.city : o.kind === "category" ? o.category : o.category + " in " + o.city)}</a></li>`).join("")}</ul></div>` : "";
for (const file of ["index.html", "directory.html", "deals.html", "events.html"]) {
  const p = path.join(root, file);
  let html = fs.readFileSync(p, "utf8");
  html = html.replace(/(data-(browse|list)="(\w+)"(?: data-limit="(\d+)")?>)<noscript><div class="empty">Turn on JavaScript to see the listings\.<\/div><\/noscript>/g, (m, open, mode, key, limit) => {
    if (!TYPE[key]) return m;
    const items = C[key].slice(0, +limit || 999);
    if (!items.length) return open + empty;
    if (mode === "list") return open + cards(key, items);
    return open + (key === "events" ? eventsByMonth(items) : key === "directory" ? byCategory(items) : `<div class="grid">${cards(key, items)}</div>`);
  });
  html = html.replace("<!--browse-links-->", browseLinks);
  fs.writeFileSync(p, html);
  console.log("prerendered " + file);
}

/* 4. Sitemap */
const golfCtx = { window: {} };
if (fs.existsSync(path.join(root, "data", "golf.js"))) require("vm").runInNewContext(fs.readFileSync(path.join(root, "data", "golf.js"), "utf8"), golfCtx);
const golfPaths = ((golfCtx.window.CVS || {}).golf || []).map(c => `golf/${c.slug}/`);
const urls = ["", "directory", "deals", "events", "golf/", "advertise", "submit", "story", "contact", "mailing-area-el-paseo", "mailing-area-sun-city", "legal"]
  .concat(cityPaths, list.map(b => `business/${b.slug}/`), eventPaths, landing.filter(p => p.index).map(p => p.path), golfPaths);
fs.writeFileSync(path.join(root, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url><loc>${esc(SITE + "/" + u)}</loc></url>`).join("\n")}
</urlset>
`);
console.log(`sitemap.xml: ${urls.length} pages`);
