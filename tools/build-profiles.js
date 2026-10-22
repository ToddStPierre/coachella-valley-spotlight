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
  const rows = [["Area served", b.area], ["Address", b.address], ["Hours", prem && b.hours]].filter(r => r[1]);
  const gallery = prem ? (b.gallery || []) : [];
  const html = `${head}${metaTags({ title: `${b.name} | ${kind} in ${b.city}, CA`, description: desc, url, image: prem && b.image })}<base href="../../">
${headRest}${ldjson(schema)}${ldjson(breadcrumbs(trail))}
</head>
<body data-profile="${slug}">
${header}
<main>
<section class="page-hero"><div class="wrap">
<nav class="crumbs" aria-label="Breadcrumb"><a href="directory">Directory</a>${cityPage ? ` &rsaquo; <a href="${cityPage.path}">${esc(b.city)}</a>` : ""}${catPage ? ` &rsaquo; <a href="${catPage.path}">${esc(catPage.category)}</a>` : ""}</nav>
<div class="profile" data-biz="${slug}" data-noimp>
<div>
<span class="eyebrow" style="margin-top:24px"><span class="stripe-mini"></span>${esc(kind)} &middot; ${esc(b.city)}</span>
<h1>${esc(b.name)}</h1>
${b.postcard || prem ? '<span class="tag" style="display:inline-block;font-family:var(--mono);font-size:12px;letter-spacing:.06em;text-transform:uppercase;padding:5px 12px;border-radius:999px;background:#fde8bf;color:#7a4a00;margin-bottom:16px">' + (b.postcard ? "On the Spotlight postcard" : "Premium listing") + '</span>' : ""}
<p>${esc(prem ? (b.about || b.blurb) : b.blurb)}</p>
${offer ? `<div class="offer-box" style="max-width:640px;margin-bottom:16px"><b>${esc(offer.title)}</b>${offer.details ? `<span>${esc(offer.details)}</span>` : ""}${offer.expires ? `<span>Good through ${esc(nice(offer.expires))}</span>` : ""}</div>` : ""}
${rows.length ? `<dl class="facts">${rows.map(r => `<dt>${r[0]}</dt><dd>${esc(r[1])}</dd>`).join("")}</dl>` : ""}
<div class="cta-row">
${tel ? `<a class="btn" href="tel:${tel}" data-track="call">Call ${esc(b.phone)}</a>` : ""}
${b.url ? `<a class="btn btn-ghost" href="${esc(outbound(b.url))}" target="_blank" rel="noopener" data-track="website">Visit website &rarr;</a>` : ""}
</div>
<p class="risk">Tell them you found them on Coachella Valley Spotlight.</p>
${b.claimed ? '<p class="claim-line"><span class="claimed-badge">&#10003; Claimed by the owner</span></p>' : `<p class="claim-line"><a href="claim.html?b=${slug}">Is this your business? Claim this listing &rarr;</a></p>`}
</div>
${prem && b.image ? `<figure class="profile-ad"><img src="${esc(b.image)}" alt="${esc(b.imageAlt || b.name + " ad")}"><figcaption>As seen on the Spotlight postcard</figcaption></figure>` : ""}
</div>
${gallery.length ? `<h2 class="month-head" style="margin-top:48px"><span class="stripe-mini"></span>Photos</h2><div class="gallery">${gallery.map((g, i) => `<img src="${esc(g)}" alt="${esc(b.name)} photo ${i + 1}" loading="lazy">`).join("")}</div>` : ""}
</div></section>
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
