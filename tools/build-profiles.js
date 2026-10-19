/* Builds a profile page for every real (non-sample) business in data/directory.js
   at business/<slug>/index.html, using index.html's header and footer.
   Runs automatically on GitHub when you push. Run it locally with: node tools/build-profiles.js */
const fs = require("fs"), path = require("path"), vm = require("vm");
const root = path.join(__dirname, "..");
const ctx = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(root, "data/directory.js"), "utf8"), ctx);
const list = (ctx.window.CVS.directory || []).filter(b => !b.sample);

const tpl = fs.readFileSync(path.join(root, "index.html"), "utf8");
const head = tpl.slice(0, tpl.indexOf("<title>"));
const headRest = tpl.slice(tpl.indexOf('<link rel="icon"'), tpl.indexOf("</head>"));
const header = tpl.slice(tpl.indexOf('<header class="site-header">'), tpl.indexOf("</header>") + 9);
const footer = tpl.slice(tpl.indexOf('<footer class="site-footer">'), tpl.indexOf("</footer>") + 9);

const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const slugOf = b => b.slug || String(b.name).toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const outbound = u => { try { const x = new URL(u); x.searchParams.set("utm_source", "coachellavalleyspotlight"); x.searchParams.set("utm_medium", "profile"); return x.toString(); } catch { return u; } };

fs.rmSync(path.join(root, "business"), { recursive: true, force: true });
for (const b of list) {
  const slug = slugOf(b);
  const tel = b.phone ? b.phone.replace(/[^\d+]/g, "") : "";
  const desc = `${b.name}: ${b.category} in ${b.city}. ${b.blurb || ""}`.slice(0, 300);
  const schema = { "@context": "https://schema.org", "@type": "LocalBusiness", name: b.name, description: b.about || b.blurb, telephone: b.phone || undefined, url: b.url || undefined, address: { "@type": "PostalAddress", streetAddress: b.address || undefined, addressLocality: b.city, addressRegion: "CA", addressCountry: "US" }, areaServed: b.area || "Coachella Valley" };
  const rows = [["Area served", b.area], ["Address", b.address], ["Hours", b.hours]].filter(r => r[1]);
  const html = `${head}<title>${esc(b.name)} | ${esc(b.category)} in ${esc(b.city)} | Coachella Valley Spotlight</title>
<meta name="description" content="${esc(desc)}">
<meta property="og:title" content="${esc(b.name)}">
<meta property="og:description" content="${esc(desc)}">
<base href="../../">
${headRest}<script type="application/ld+json">${JSON.stringify(schema)}</script>
</head>
<body data-profile="${slug}">
${header}
<main>
<section class="page-hero"><div class="wrap">
<a class="more" href="directory.html">&larr; Back to the directory</a>
<div class="profile" data-biz="${slug}" data-noimp>
<div>
<span class="eyebrow" style="margin-top:24px"><span class="stripe-mini"></span>${esc(b.category)} &middot; ${esc(b.city)}</span>
<h1>${esc(b.name)}</h1>
${b.featured ? '<span class="tag" style="display:inline-block;font-family:var(--mono);font-size:12px;letter-spacing:.06em;text-transform:uppercase;padding:5px 12px;border-radius:999px;background:#fde8bf;color:#7a4a00;margin-bottom:16px">Featured on the Spotlight postcard</span>' : ""}
<p>${esc(b.about || b.blurb)}</p>
${rows.length ? `<dl class="facts">${rows.map(r => `<dt>${r[0]}</dt><dd>${esc(r[1])}</dd>`).join("")}</dl>` : ""}
<div class="cta-row">
${tel ? `<a class="btn" href="tel:${tel}" data-track="call">Call ${esc(b.phone)}</a>` : ""}
${b.url ? `<a class="btn btn-ghost" href="${esc(outbound(b.url))}" target="_blank" rel="noopener" data-track="website">Visit website &rarr;</a>` : ""}
</div>
<p class="risk">Tell them you found them on Coachella Valley Spotlight.</p>
</div>
${b.image ? `<figure class="profile-ad"><img src="${esc(b.image)}" alt="${esc(b.imageAlt || b.name + " ad")}"><figcaption>As seen on the Spotlight postcard</figcaption></figure>` : ""}
</div>
</div></section>
<div class="wrap"><div class="biz-band"><p><strong>Own a local business?</strong><br>Get a featured profile like this one when you advertise on the card.</p><a class="btn" href="advertise.html">See how the card works</a></div></div>
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
