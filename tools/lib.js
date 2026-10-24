/* Shared helpers for the build scripts (build-profiles.js and build-seo.js). */
const fs = require("fs"), path = require("path"), vm = require("vm");
const root = path.join(__dirname, "..");
const SITE = "https://coachellavalleyspotlight.com";

function loadData() {
  const ctx = { window: {} };
  for (const f of ["directory", "events", "feed-events", "deals", "news", "places"]) {
    const p = path.join(root, "data", f + ".js");
    if (fs.existsSync(p)) vm.runInNewContext(fs.readFileSync(p, "utf8"), ctx);
  }
  return ctx.window.CVS;
}

const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const slugify = s => String(s).toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const slugOf = b => b.slug || slugify(b.name);
const ldjson = o => `<script type="application/ld+json">${JSON.stringify(o).replace(/</g, "\\u003c")}</script>`;

/* City and category landing pages under /local/.
   Rules, so Google never sees near-empty pages:
   - a page is built only when it has 2 or more listings;
   - it is marked index (and goes in the sitemap) only at 3 or more;
   - city + category pages are only built when that category exists in more than one city
     (otherwise the page would be a copy of the category page). */
const BUILD_MIN = 2, INDEX_MIN = 3;
function landingPages(list) {
  const pages = [], by = (k) => list.reduce((m, b) => ((m[b[k]] = m[b[k]] || []).push(b), m), {});
  const cities = by("city"), cats = by("category");
  for (const [city, items] of Object.entries(cities)) {
    if (items.length >= BUILD_MIN) pages.push({ kind: "city", city, items, path: `local/${slugify(city)}/` });
  }
  /* Same rules for the broad category ("Home services") and the specific service ("Plumbing"). */
  const groups = Object.entries(cats).map(e => [...e, "category"]).concat(Object.entries(by("service")).filter(e => e[0] !== "undefined").map(e => [...e, "service"]));
  for (const [cat, items, field] of groups) {
    if (items.length < BUILD_MIN || (field === "service" && pages.some(p => p.path === `local/${slugify(cat)}/`))) continue;
    pages.push({ kind: "category", field, category: cat, items, path: `local/${slugify(cat)}/` });
    const inCities = items.reduce((m, b) => ((m[b.city] = m[b.city] || []).push(b), m), {});
    if (Object.keys(inCities).length > 1) {
      for (const [city, sub] of Object.entries(inCities)) {
        if (sub.length >= BUILD_MIN) pages.push({ kind: "combo", field, city, category: cat, items: sub, path: `local/${slugify(city)}/${slugify(cat)}/` });
      }
    }
  }
  pages.forEach(p => { p.index = p.items.length >= INDEX_MIN; });
  return pages;
}

/* The most specific schema.org type for a listing's service. */
const SCHEMA_TYPES = { "Plumbing": "Plumber", "Roofing": "RoofingContractor", "Heating and air conditioning": "HVACBusiness", "Electrical": "Electrician", "Painting": "HousePainter", "Locksmith": "Locksmith", "Italian restaurants": "Restaurant", "Restaurants": "Restaurant", "Acupuncture": "MedicalBusiness", "Weight loss": "MedicalClinic", "Med spas": "HealthAndBeautyBusiness", "Pest control": "HomeAndConstructionBusiness", "Flooring": "HomeAndConstructionBusiness", "Wallpaper installation": "HomeAndConstructionBusiness", "Solar panel cleaning": "HomeAndConstructionBusiness", "Home services": "HomeAndConstructionBusiness", "Fitness": "ExerciseGym", "Gyms": "ExerciseGym", "CrossFit gyms": "ExerciseGym", "Personal training": "ExerciseGym", "Boxing and martial arts": "SportsActivityLocation", "Dentists": "Dentist", "Orthodontists": "Dentist", "Veterinarians": "VeterinaryCare", "Pet stores": "PetStore", "Dog parks": "Park", "Hiking trails": "Park", "Pickleball": "SportsActivityLocation", "Tennis": "SportsActivityLocation", "Swimming & water parks": "SportsActivityLocation", "Museums & attractions": "TouristAttraction", "Skate parks": "SportsActivityLocation", "Disc golf": "SportsActivityLocation", "Attractions": "TouristAttraction", "Recreation": "SportsActivityLocation", "Outdoors": "Park", "Pets": "VeterinaryCare", "Pool service": "HomeAndConstructionBusiness", "Landscaping": "HomeAndConstructionBusiness", "Legal": "LegalService", "Estate planning": "LegalService", "Family law": "LegalService", "Criminal defense": "LegalService", "Bankruptcy": "LegalService", "Personal injury": "LegalService", "Business and real estate law": "LegalService" };
const schemaType = b => SCHEMA_TYPES[b.service] || SCHEMA_TYPES[b.category] || "LocalBusiness";

/* Pieces of index.html reused as the page shell for generated pages. */
function shell() {
  const tpl = fs.readFileSync(path.join(root, "index.html"), "utf8");
  return {
    head: tpl.slice(0, tpl.indexOf("<title>")),
    headRest: tpl.slice(tpl.indexOf('<link rel="icon"'), tpl.indexOf("</head>")).replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>\n?/g, ""),
    header: tpl.slice(tpl.indexOf('<header class="site-header">'), tpl.indexOf("</header>") + 9),
    footer: tpl.slice(tpl.indexOf('<footer class="site-footer">'), tpl.indexOf("</footer>") + 9)
  };
}

/* Social and canonical tags for a generated page. url is the path from the site root, e.g. "business/x/". */
function metaTags({ title, description, url, image, noindex }) {
  const abs = SITE + "/" + url;
  const img = /^https?:/.test(image || "") ? image : SITE + "/" + (image || "assets/img/real-cards.jpg");
  return `<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${esc(abs)}">
${noindex ? '<meta name="robots" content="noindex, follow">\n' : ""}<meta property="og:type" content="website">
<meta property="og:site_name" content="Coachella Valley Spotlight">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${esc(abs)}">
<meta property="og:image" content="${esc(img)}">
<meta name="twitter:card" content="summary_large_image">
`;
}

function breadcrumbs(trail) {
  return {
    "@context": "https://schema.org", "@type": "BreadcrumbList",
    itemListElement: trail.map((t, i) => ({ "@type": "ListItem", position: i + 1, name: t[0], item: SITE + "/" + t[1] }))
  };
}

/* Hero photo with its Wikimedia credit. Credits live in legal.html#photos as
   <li><strong>Key:</strong> <a href="file page">name</a> by Author, <a ...>License</a>, so they're written once. */
let creditCache;
function credits() {
  if (creditCache) return creditCache;
  creditCache = {};
  const html = fs.readFileSync(path.join(root, "legal.html"), "utf8");
  for (const m of html.matchAll(/<li><strong>([^<]+):<\/strong> <a href="([^"]+)"[^>]*>[^<]*<\/a> by ([^,<]+(?:, [^,<]+)*?), <a [^>]*>([^<]+)<\/a>/g)) creditCache[m[1].replace(/&amp;/g, "&")] = { url: m[2], by: m[3], license: m[4] };
  return creditCache;
}
function photoFigure(key, src, alt) {
  if (!src || !fs.existsSync(path.join(root, src))) return "";
  const cr = credits()[key];
  return `<figure class="city-photo"><img src="${src}" alt="${esc(alt)}" width="800" height="450"><figcaption>${cr ? `Photo: <a href="${esc(cr.url)}" target="_blank" rel="noopener">${esc(cr.by)}</a>, ${esc(cr.license)} via Wikimedia Commons` : '<a href="legal#photos">Photo credit</a>'}</figcaption></figure>`;
}

module.exports = { photoFigure, schemaType, root, SITE, loadData, esc, slugify, slugOf, ldjson, landingPages, shell, metaTags, breadcrumbs };
