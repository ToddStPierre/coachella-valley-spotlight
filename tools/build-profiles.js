/* Builds a profile page for every real (non-sample) business in data/directory.js
   at business/<slug>/index.html, using index.html's header and footer.
   Runs automatically on GitHub when you push. Run it locally with: node tools/build-profiles.js */
const fs = require("fs"), path = require("path");
const { schemaType, root, SITE, loadData, esc, slugOf, ldjson, landingPages, shell, metaTags, breadcrumbs } = require("./lib");
const list = (loadData().directory || []).filter(b => !b.sample);
const { head, headRest, header, footer } = shell();
const landing = landingPages(list);
const nice = d => { const [y, m, dd] = d.split("-").map(Number); return ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][m - 1] + " " + dd + ", " + y; };
const outbound = u => { try { const x = new URL(u); x.searchParams.set("utm_source", "coachellavalleyspotlight"); x.searchParams.set("utm_medium", "profile"); return x.toString(); } catch { return u; } };

fs.rmSync(path.join(root, "business"), { recursive: true, force: true });
for (const b of list) {
  const slug = slugOf(b);
  const tel = b.phone ? b.phone.replace(/[^\d+]/g, "") : "";
  const desc = `${b.name}: ${b.service || b.category} in ${b.city}. ${b.blurb || ""}`.slice(0, 300);
  const url = `business/${slug}/`;
  const cityPage = landing.find(p => p.kind === "city" && p.city === b.city);
  const catPage = [b.service, b.category].filter(Boolean).map(t => landing.find(p => p.kind === "combo" && p.city === b.city && p.category === t) || landing.find(p => p.kind === "category" && p.category === t)).find(Boolean);
  const kind = b.service || b.category;
  const trail = [["Home", ""], ["Directory", "directory"]].concat(cityPage ? [[b.city, cityPage.path]] : []).concat([[b.name, url]]);
  const schema = { "@context": "https://schema.org", "@type": schemaType(b), "@id": SITE + "/" + url + "#business", name: b.name, image: b.image ? SITE + "/" + b.image : undefined, description: b.about || b.blurb, telephone: b.phone || undefined, url: b.url || undefined, address: { "@type": "PostalAddress", streetAddress: b.address || undefined, addressLocality: b.city, addressRegion: "CA", addressCountry: "US" }, areaServed: b.area || "Coachella Valley" };
  const prem = !!(b.premium || b.featured);
  const today = new Date().toISOString().slice(0, 10);
  const offer = prem && b.offer && b.offer.title && (!b.offer.expires || b.offer.expires >= today) ? b.offer : null;
  const rows = [["Area served", b.area], ["Address", b.address], ["Hours", (prem || b.public) && b.hours], ["Size", b.size], ["Happy hour", b.happyHour]].filter(r => r[1]);
  const gallery = prem ? (b.gallery || []) : [];
  // Related: same service (or category) in the same city first, then valley-wide. Up to 4.
  const sameKind = x => x !== b && (x.service || x.category) === kind;
  const related = list.filter(x => sameKind(x) && x.city === b.city).concat(list.filter(x => sameKind(x) && x.city !== b.city)).slice(0, 4);
  // Map: by address when we have one, otherwise a search for the business name in its city.
  const mapQ = b.address ? (/\bCA\b/.test(b.address) ? b.address : b.address + ", " + b.city + ", CA") : b.city + ", CA";
  const mapPlace = encodeURIComponent((b.public && b.address ? "" : b.name + ", ") + mapQ);
  const ico = p => `<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${p}</svg>`;
  const I = {
    pin: ico('<path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21Z"/><circle cx="12" cy="9.5" r="2.5"/>'),
    phone: ico('<path d="M5 4h3.5l1.5 4-2 1.5a11 11 0 0 0 6.5 6.5L16 14l4 1.5V19a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z"/>'),
    web: ico('<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.7 3.8 5.7 3.8 9s-1.3 6.3-3.8 9c-2.5-2.7-3.8-5.7-3.8-9S9.5 5.7 12 3Z"/>'),
    area: ico('<path d="M3 7l6-3 6 3 6-3v13l-6 3-6-3-6 3Z"/><path d="M9 4v13M15 7v13"/>'),
    clock: ico('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
    star: ico('<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9Z"/>')
  };
  const SOCIAL = { facebook: "Facebook", instagram: "Instagram", tiktok: "TikTok", yelp: "Yelp", youtube: "YouTube", x: "X" };
  const social = Object.keys(SOCIAL).filter(k => b.social && b.social[k]);
  const facts = [["Happy hour", b.happyHour], ["Size", b.size], ["Area served", b.area]].filter(r => r[1]);
  // Court details (pickleball and tennis): what a player checks before driving over.
  const C = b.courts || {};
  const courtRows = [["Courts", b.size], ["Setup", C.setup], ["Surface", C.surface], ["Nets", C.nets], ["Lights", C.lights], ["How play works", C.play], ["Skill levels", C.levels], ["Reservations", C.reserve], ["Cost", C.cost], ["Lessons and leagues", C.lessons], ["Closures", C.closures], ["Court rules", C.rules], ["Good to know", C.note], ["Questions", C.contact]].filter(r => r[1]);
  // Trail details (hiking trails): what a hiker checks before heading out.
  const TR = b.trail || {};
  const trailRows = [["Distance", TR.length], ["Climb", TR.climb], ["Difficulty", TR.difficulty], ["Time", TR.time], ["The route", TR.route], ["Dogs", TR.dogs], ["Fee", TR.fee], ["Hours", TR.hours], ["Permit", TR.permit], ["Parking", TR.parking], ["At the trailhead", TR.facilities], ["Shade", TR.shade], ["Best time to go", TR.season], ["Guided hikes", TR.guided], ["Closures", TR.closures], ["Before you go", TR.rules], ["Good to know", TR.note], ["Questions", TR.contact]].filter(r => r[1]);
  const showHours = (prem || b.public) && b.hours;
  const owner = !b.public;
  const html = `${head}${metaTags({ title: `${b.name} | ${kind} in ${b.city}, CA`, description: desc, url, image: prem && b.image })}<base href="../../">
${headRest}${ldjson(schema)}${ldjson(breadcrumbs(trail))}
</head>
<body data-profile="${slug}">
${header}
<main id="main" tabindex="-1">
<div data-biz="${slug}" data-noimp>
<section class="page-hero pf-hero"><div class="wrap">
<nav class="crumbs" aria-label="Breadcrumb"><a href="directory">Directory</a>${cityPage ? ` &rsaquo; <a href="${cityPage.path}">${esc(b.city)}</a>` : ""}${catPage ? ` &rsaquo; <a href="${catPage.path}">${esc(catPage.category)}</a>` : ""}</nav>
<span class="eyebrow" style="margin-top:24px"><span class="stripe-mini"></span>${esc(kind)} &middot; ${esc(b.city)}</span>
</div></section>
<section class="pf-body"><div class="wrap pf-grid">
<div class="pf-left">
<div class="pf-head">
<h1>${esc(b.name)}</h1>
${b.claimed && owner ? '<span class="verified verified-lg">&#10003; Verified by owner</span>' : ""}
${b.postcard || prem ? '<span class="pf-badge">' + (b.postcard ? "On the Spotlight postcard" : "Premium listing") + '</span>' : ""}
<p class="pf-lede">${esc(b.blurb)}</p>
<div class="cta-row">
${tel ? `<a class="btn" href="tel:${tel}" data-track="call">Call ${esc(b.phone)}</a>` : ""}
${b.url ? `<a class="btn btn-ghost" href="${esc(outbound(b.url))}" target="_blank" rel="noopener" data-track="website">Visit website &rarr;</a>` : ""}
<button type="button" class="btn btn-ghost fav-btn" data-fav="biz:${slug}" aria-pressed="false"><svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M12 20.5s-7.5-4.6-9.4-9.3C1.4 8.3 3.2 4.8 6.6 4.5c2-.2 3.7.9 5.4 2.9 1.7-2 3.4-3.1 5.4-2.9 3.4.3 5.2 3.8 4 6.7-1.9 4.7-9.4 9.3-9.4 9.3Z"/></svg><span>Save</span></button>
</div>
${owner ? '<p class="risk">Tell them you found them on Coachella Valley Spotlight.</p>' : ""}
</div>
<div class="pf-main">
${(prem && b.about) ? `<div class="pf-card"><h2>About</h2><p>${esc(b.about)}</p></div>` : ""}
${offer ? `<div class="pf-card"><h2>Deals</h2><div class="pf-deal">${b.image ? `<img src="${esc(b.image)}" alt="" loading="lazy">` : ""}<div><b>${esc(offer.title)}</b>${offer.details ? `<p>${esc(offer.details)}</p>` : ""}<p class="pf-deal-meta">${offer.expires ? `Good through ${esc(nice(offer.expires))}` : "Ongoing"} &middot; Mention Coachella Valley Spotlight</p>${tel ? `<a class="btn" href="tel:${tel}" data-track="call">Call to claim</a>` : ""}</div></div></div>` : ""}
<div class="pf-card pf-contact">
<ul>
${b.address ? `<li>${I.pin}<span>${esc(b.address)}</span></li>` : ""}
${tel ? `<li>${I.phone}<a href="tel:${tel}" data-track="call">${esc(b.phone)}</a></li>` : ""}
${b.url ? `<li>${I.web}<a href="${esc(outbound(b.url))}" target="_blank" rel="noopener" data-track="website">${b.public ? "Official page" : "Visit website"} &rarr;</a></li>` : ""}
${b.googlePlaceId ? `<li class="pf-review">${I.star}<a href="https://search.google.com/local/writereview?placeid=${esc(b.googlePlaceId)}" target="_blank" rel="noopener" data-track="review">Leave a Google review &rarr;</a></li>` : ""}
${!b.address && b.area ? `<li>${I.area}<span>${esc(b.area)}</span></li>` : ""}
${!b.address && !b.area ? `<li>${I.area}<span>${esc(b.city)}, CA</span></li>` : ""}
</ul>
${`<iframe class="pf-map" title="Map of ${esc(b.name)}" src="https://maps.google.com/maps?q=${mapPlace}&amp;z=15&amp;output=embed" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe><a class="pf-dir" href="https://www.google.com/maps/dir/?api=1&amp;destination=${mapPlace}" target="_blank" rel="noopener">Get directions &rarr;</a>`}
</div>
${b.features && b.features.length ? `<div class="pf-card"><h2>What it has</h2><ul class="feat-pills feat-lg" aria-label="Features">${b.features.map(x => `<li>${esc(x)}</li>`).join("")}</ul></div>` : ""}
${b.courts && courtRows.length ? `<div class="pf-card pf-courts"><h2>Court details</h2><dl class="facts">${courtRows.map(r => `<dt>${r[0]}</dt><dd>${esc(r[1])}</dd>`).join("")}</dl>${C.checked ? `<p class="pf-checked">Last checked ${esc(nice(C.checked))}. Hours and rules change, so call or check the official page before you go.</p>` : ""}</div>` : ""}
${b.trail && trailRows.length ? `<div class="pf-card pf-courts pf-trail"><h2>Trail details</h2><dl class="facts">${trailRows.map(r => `<dt>${r[0]}</dt><dd>${esc(r[1])}</dd>`).join("")}</dl>${TR.checked ? `<p class="pf-checked">Last checked ${esc(nice(TR.checked))}. Hours, fees and trail rules change, so check the official page before you go. In the desert, start early and carry plenty of water.</p>` : ""}</div>` : ""}
${prem && b.googlePlaceId ? `<section class="g-reviews pf-card" data-reviews="${slug}" hidden></section>` : ""}
${gallery.length ? `<div class="pf-card"><h2>Photos</h2><div class="gallery">${gallery.map((g, i) => `<img src="${esc(g)}" alt="${esc(b.name)} photo ${i + 1}" loading="lazy">`).join("")}</div></div>` : ""}
</div>
</div>
<aside class="pf-side">
${prem && b.image ? `<figure class="profile-ad"><img src="${esc(b.image)}" alt="${esc(b.imageAlt || b.name + " ad")}"><figcaption>As seen on the Spotlight postcard</figcaption></figure>` : ""}
${showHours ? `<div class="pf-card"><h2>${I.clock} Hours</h2><p class="pf-hours">${esc(b.hours)}</p></div>` : ""}
${facts.length ? `<div class="pf-card"><h2>Good to know</h2><dl class="facts">${facts.map(r => `<dt>${r[0]}</dt><dd>${esc(r[1])}</dd>`).join("")}</dl></div>` : ""}
${social.length ? `<div class="pf-card"><h2>Follow</h2><ul class="pf-social">${social.map(k => `<li><a href="${esc(b.social[k])}" target="_blank" rel="noopener">${SOCIAL[k]}</a></li>`).join("")}</ul></div>` : ""}
${owner && !prem ? `<div class="pf-card pf-upsell"><h2>Is this your business?</h2><p>Add your hours, photos, a special offer and live Google reviews with a Premium listing, and see how many people view and call you each month.</p><a class="btn" href="advertise#plans">See Premium</a></div>` : ""}
<div class="pf-card pf-owner">
${owner ? (b.claimed ? '<p><span class="claimed-badge">&#10003; Verified by owner</span></p>' : `<p><a href="claim.html?b=${slug}">Claim this listing &rarr;</a><br><span>Free. Keep your details up to date yourself.</span></p>`) : ""}
<p><a href="contact?topic=${encodeURIComponent("Fix or update a listing")}&about=${encodeURIComponent(b.name)}&city=${encodeURIComponent(b.city)}&page=${encodeURIComponent(url)}#form">Suggest an edit &rarr;</a><br><span>See something wrong or out of date?</span></p>
</div>
</aside>
</div></section>
${related.length ? `<section class="pf-related"><div class="wrap"><h2 class="month-head"><span class="stripe-mini"></span>More ${esc(/^(Italian|Mexican|Asian|Latin|Mediterranean|American|Vegan)\b/.test(kind) ? kind : kind.charAt(0).toLowerCase() + kind.slice(1))} nearby</h2><div class="grid">${related.map(x => `<a class="card pf-rel" href="business/${slugOf(x)}/"><span class="meta">${esc(x.service || x.category)} &middot; ${esc(x.city)}</span><b>${esc(x.name)}</b><span>${esc(x.blurb)}</span></a>`).join("")}</div></div></section>` : ""}
</div>
<div class="wrap"><div class="biz-band"><p><strong>Own a local business?</strong><br>List it free, or go Premium for photos, hours, offers and monthly stats.</p><a class="btn" href="advertise#plans">See listing plans</a></div></div>
</main>
${footer}
<script src="assets/app.js"></script>
</body>
</html>
`;
  fs.mkdirSync(path.join(root, "business", slug), { recursive: true });
  fs.writeFileSync(path.join(root, "business", slug, "index.html"), html);
  console.log("built business/" + slug + "/");
}
