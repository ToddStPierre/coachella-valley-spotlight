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
const { root, SITE, loadData, esc, slugify, ldjson, landingPages, shell, metaTags, breadcrumbs } = require("./lib");

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
<main>
${body}
</main>
${footer}
<script src="assets/app.js"></script>
</body>
</html>
`;
const andList = a => a.length < 2 ? a.join("") : a.slice(0, -1).join(", ") + " and " + a[a.length - 1];

/* 1. Run the card code from app.js (everything above its PRERENDER-END line). */
const app = fs.readFileSync(path.join(root, "assets/app.js"), "utf8");
const ctx = { window: { CVS: D }, document: { documentElement: { getAttribute: () => "" } }, URL };
vm.runInNewContext(app.slice(app.indexOf("{") + 1, app.indexOf("/* PRERENDER-END")) +
  "\n;__out = { R: R, events: events, deals: deals, directory: directory, eventSlug: eventSlug, parse: parse, MONTHS_LONG: MONTHS_LONG };", ctx);
const C = ctx.__out;
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
for (const e of C.events) {
  const slug = C.eventSlug(e), url = `event/${slug}/`;
  eventPaths.push(url);
  const start = C.parse(e.date), end = e.endDate && C.parse(e.endDate);
  const when = end ? `${niceDate(start)} to ${niceDate(end)}` : niceDate(start);
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
${e.url ? `<div class="cta-row"><a class="btn" href="${esc(e.url)}" target="_blank" rel="noopener">Official event page &rarr;</a></div>` : ""}
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
  const countLine = `${items.length} ${p.category ? p.category.toLowerCase() + " businesses are" : "local businesses are"} listed${p.city ? " in " + p.city : " across the valley"} right now, including ${andList(names)}. Each one has its own page with the phone number, website and details, and premium listings show current offers.`;
  const related = landing.filter(o => o !== p && (
    (p.kind === "city" && o.kind === "combo" && o.city === p.city) ||
    (p.kind === "category" && ((o.kind === "combo" && o.category === p.category) || o.kind === "category")) ||
    (p.kind === "combo" && ((o.kind === "city" && o.city === p.city) || (o.kind === "category" && o.category === p.category)))));
  const label = o => o.kind === "city" ? `All businesses in ${o.city}` : o.kind === "category" ? `${o.category}, valley-wide` : `${o.category} in ${o.city}`;
  const trail = [["Home", ""], ["Directory", "directory"]];
  if (p.kind === "combo") trail.push([p.city, `local/${slugify(p.city)}/`]);
  trail.push([heading, p.path]);
  write(p.path, page({
    meta: { title: heading, description: `${heading}: ${andList(names)}${items.length > 3 ? " and more" : ""}. Phone numbers, websites and local deals on Coachella Valley Spotlight.`.slice(0, 300), url: p.path, noindex: !p.index },
    schema: [{ "@context": "https://schema.org", "@type": "ItemList", name: heading, itemListElement: items.map((b, i) => ({ "@type": "ListItem", position: i + 1, url: `${SITE}/business/${b.slug}/`, name: b.name })) }, breadcrumbs(trail)],
    body: `<section class="page-hero"><div class="wrap">
<nav class="crumbs" aria-label="Breadcrumb"><a href="directory">Directory</a>${p.kind === "combo" && landing.some(o => o.kind === "city" && o.city === p.city) ? ` &rsaquo; <a href="local/${slugify(p.city)}/">${esc(p.city)}</a>` : ""}</nav>
<span class="eyebrow" style="margin-top:24px"><span class="stripe-mini"></span>Local directory</span>
<h1>${esc(heading)}</h1>
${intro.map(t => `<p>${esc(t)}</p>`).join("\n")}
<p>${esc(countLine)}</p>
</div></section>
<section style="padding-bottom:var(--s5)"><div class="wrap">
<div class="grid">${cards("directory", items)}</div>
${related.length ? `<h2 class="month-head" style="margin-top:48px"><span class="stripe-mini"></span>Keep browsing</h2><ul class="link-list">${related.map(o => `<li><a href="${o.path}">${esc(label(o))}</a></li>`).join("")}<li><a href="directory">The full directory</a></li></ul>` : ""}
<div class="biz-band" style="margin-top:48px"><p><strong>Own a business${p.city ? " in " + esc(p.city) : ""}?</strong><br>Listing it here is free.</p><a class="btn" href="submit">Add my business</a></div>
</div></section>`
  }));
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
  const names = Object.keys(groups).sort(), id = c => "cat-" + c.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const head = (i, label, n) => `<h2 class="month-head" id="${i}"><span class="stripe-mini"></span>${esc(label)} <span class="cat-count">${n}</span></h2>`;
  const jumps = (feat.length ? [`<a href="#cat-featured">Featured (${feat.length})</a>`] : []).concat(names.map(c => `<a href="#${id(c)}">${esc(c)} (${groups[c].length})</a>`));
  return (jumps.length > 1 ? `<p class="cat-jump">${jumps.join("")}</p>` : "") +
    (feat.length ? `<section class="featured-band">${head("cat-featured", "Featured Listings", feat.length)}<p class="featured-note">Local businesses on the current Spotlight postcard.</p><div class="grid">${cards("directory", feat)}</div></section>` : "") +
    names.map(c => `${head(id(c), c, groups[c].length)}<div class="grid">${cards("directory", groups[c])}</div>`).join("");
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
const urls = ["", "directory", "deals", "events", "golf/", "advertise", "submit", "story", "mailing-area-el-paseo", "mailing-area-sun-city", "legal"]
  .concat(list.map(b => `business/${b.slug}/`), eventPaths, landing.filter(p => p.index).map(p => p.path), golfPaths);
fs.writeFileSync(path.join(root, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url><loc>${esc(SITE + "/" + u)}</loc></url>`).join("\n")}
</urlset>
`);
console.log(`sitemap.xml: ${urls.length} pages`);
