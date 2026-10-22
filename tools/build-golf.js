/* Builds the golf section from data/golf.js:
   - golf/index.html: every course, with search and city / public-private filters (cards pre-rendered for Google)
   - golf/<slug>/index.html: one page per club or facility
   Runs on GitHub before build-seo.js. golf/ is generated, so it is gitignored. Run locally: node tools/build-golf.js */
const fs = require("fs"), path = require("path"), vm = require("vm");
const { root, SITE, esc, ldjson, shell, metaTags, breadcrumbs } = require("./lib");
const ctx = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(root, "data", "golf.js"), "utf8"), ctx);
const list = ctx.window.CVS.golf;
const { head, headRest, header, footer } = shell();
const outbound = u => { try { const x = new URL(u); x.searchParams.set("utm_source", "coachellavalleyspotlight"); x.searchParams.set("utm_medium", "golf"); return x.toString(); } catch { return u; } };
const NUM = ["zero", "one", "two", "three", "four", "five", "six"];
const holesLine = c => c.holes + " holes" + (c.courses.length > 1 ? " &middot; " + c.courses.length + " courses" : "");
const ACCESS = { Public: "Open to the public", Private: "Private club" };

/* One card. The same markup is drawn by the filter script on the list page (keep the two in sync). */
const card = c => `<article class="card golf-card" data-city="${esc(c.city)}" data-access="${c.access}" data-text="${esc((c.name + " " + c.city + " " + c.courses.map(x => x.name).join(" ")).toLowerCase())}">
<span class="meta">${esc(c.city)}</span><span class="golf-access ${c.access.toLowerCase()}">${ACCESS[c.access]}</span>
<h3><a href="golf/${c.slug}/">${esc(c.name)}</a></h3><p class="golf-holes">${holesLine(c)}</p>
<a class="card-link" href="golf/${c.slug}/">Course details &rarr;</a></article>`;

fs.rmSync(path.join(root, "golf"), { recursive: true, force: true });
const write = (rel, html) => { fs.mkdirSync(path.join(root, rel), { recursive: true }); fs.writeFileSync(path.join(root, rel, "index.html"), html); };
const submitBand = `<div class="biz-band" style="margin-top:48px"><p><strong>Run a golf course in the valley?</strong><br>Add your course, or send us a correction. Listing it here is free.</p><a class="btn" href="submit?type=golf#form">Submit a golf course</a></div>`;

/* 1. The list page */
const cities = [...new Set(list.map(c => c.city))].sort();
const pub = list.filter(c => c.access === "Public").length;
write("golf/", `${head}${metaTags({ title: "Golf Courses in the Coachella Valley | Coachella Valley Spotlight", description: `All ${list.length} golf clubs and courses in the Coachella Valley, from Palm Springs to Indio and La Quinta. See which are open to the public, with phone numbers and websites.`, url: "golf/" })}<base href="../">
${headRest}${ldjson({ "@context": "https://schema.org", "@type": "ItemList", name: "Golf courses in the Coachella Valley", numberOfItems: list.length, itemListElement: list.map((c, i) => ({ "@type": "ListItem", position: i + 1, url: SITE + "/golf/" + c.slug + "/", name: c.name })) })}
</head>
<body>
${header}
<main>
<section class="page-hero"><div class="wrap"><span class="eyebrow"><span class="stripe-mini"></span>Golf</span>
<h1>Golf Courses in the <span class="grad">Coachella Valley.</span></h1>
<p>Every golf club and course in the valley, ${list.length} in all. ${pub} are open to the public, and the rest are private clubs. Filter by city, or show only the courses you can book.</p></div></section>
<section style="padding-bottom:var(--s5)"><div class="wrap">
<div class="filters"><label class="sr-only" for="g-q">Search</label><input id="g-q" type="search" placeholder="Search courses">
<label class="sr-only" for="g-city">City</label><select id="g-city"><option value="">All cities</option>${cities.map(c => `<option>${esc(c)}</option>`).join("")}</select>
<label class="sr-only" for="g-access">Access</label><select id="g-access"><option value="">Public and private</option><option value="Public">Open to the public</option><option value="Private">Private clubs</option></select></div>
<p class="golf-count" id="g-count">${list.length} courses</p>
<div class="grid" id="g-list">${list.map(card).join("\n")}</div>
<p class="risk" style="margin-top:24px">Course details change. Call ahead to confirm tee times, guest rules and rates. Course data from public sources, including OpenStreetMap (&copy; OpenStreetMap contributors).</p>
${submitBand}
</div></section>
</main>
${footer}
<script src="assets/app.js"></script>
<script>
(function () {
  var q = document.getElementById("g-q"), city = document.getElementById("g-city"), acc = document.getElementById("g-access"), count = document.getElementById("g-count");
  var cards = [].slice.call(document.querySelectorAll(".golf-card"));
  var p = new URLSearchParams(location.search);
  if (p.get("access")) acc.value = p.get("access");
  if (p.get("city")) city.value = p.get("city");
  function draw() {
    var t = q.value.trim().toLowerCase(), n = 0;
    cards.forEach(function (c) {
      var ok = (!t || c.getAttribute("data-text").indexOf(t) > -1) && (!city.value || c.getAttribute("data-city") === city.value) && (!acc.value || c.getAttribute("data-access") === acc.value);
      c.hidden = !ok; if (ok) n++;
    });
    count.textContent = n + (n === 1 ? " course" : " courses");
  }
  [q, city, acc].forEach(function (el) { el.addEventListener("input", draw); });
  draw();
})();
</script>
</body>
</html>`);

/* 2. One page per club or facility */
for (const c of list) {
  const url = `golf/${c.slug}/`, tel = c.phone ? c.phone.replace(/[^\d+]/g, "") : "";
  const n = c.courses.length;
  const layout = n > 1 ? `${NUM[n] || n} courses: ${c.courses.map(x => x.name.replace(/ Course$/, "")).join(", ").replace(/, ([^,]*)$/, " and $1")}` : `one ${c.courses[0].holes}-hole course`;
  const intro = `${c.name} is a ${c.access === "Public" ? "public" : "private"} golf facility in ${c.city} with ${c.holes} holes across ${layout}.`;
  const access = c.access === "Public" ? "Open to the public. Anyone can book a tee time, so call the pro shop or check the website for rates." : "Private club. Play is generally for members and their guests, so call the club to ask about guest play or membership.";
  const others = list.filter(x => x.city === c.city && x.slug !== c.slug).slice(0, 6);
  const map = "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(c.name + ", " + c.address);
  const schema = { "@context": "https://schema.org", "@type": "GolfCourse", "@id": SITE + "/" + url + "#course", name: c.name, telephone: c.phone || undefined, url: c.url || undefined, publicAccess: c.access === "Public",
    address: { "@type": "PostalAddress", streetAddress: c.address.split(",")[0], addressLocality: c.city, addressRegion: "CA", postalCode: (c.address.match(/\d{5}$/) || [])[0], addressCountry: "US" } };
  write(url, `${head}${metaTags({ title: `${c.name} | Golf in ${c.city}, CA`, description: `${c.name} in ${c.city}: ${c.access === "Public" ? "public" : "private"} golf, ${c.holes} holes. Address, phone, website and course details.`, url })}<base href="../../">
${headRest}${ldjson(schema)}${ldjson(breadcrumbs([["Home", ""], ["Golf", "golf/"], [c.name, url]]))}
</head>
<body>
${header}
<main>
<section class="page-hero"><div class="wrap">
<nav class="crumbs" aria-label="Breadcrumb"><a href="golf/">Golf</a> &rsaquo; <a href="golf/?city=${encodeURIComponent(c.city)}">${esc(c.city)}</a></nav>
<span class="eyebrow" style="margin-top:24px"><span class="stripe-mini"></span>Golf &middot; ${esc(c.city)}</span>
<h1>${esc(c.name)}</h1>
<span class="golf-access ${c.access.toLowerCase()}" style="margin-bottom:16px">${ACCESS[c.access]}</span>
<p>${esc(intro)}</p>
<p>${esc(access)}</p>
<dl class="facts"><dt>Address</dt><dd><a href="${esc(map)}" target="_blank" rel="noopener">${esc(c.address)}</a></dd><dt>Holes</dt><dd>${c.holes}</dd></dl>
<div class="table-scroll" style="max-width:640px;margin-top:16px"><table class="stats-table"><thead><tr><th>Course</th><th>Holes</th><th>Par</th></tr></thead><tbody>${c.courses.map(x => `<tr><td>${esc(x.name)}</td><td>${x.holes || ""}</td><td>${x.par || ""}</td></tr>`).join("")}</tbody></table></div>
<div class="cta-row" style="margin-top:24px">
${tel ? `<a class="btn" href="tel:${tel}">Call ${esc(c.phone)}</a>` : ""}
${c.url ? `<a class="btn btn-ghost" href="${esc(outbound(c.url))}" target="_blank" rel="noopener">Visit website &rarr;</a>` : ""}
</div>
<p class="risk">Details change. Call ahead to confirm tee times, guest rules and rates.</p>
<p class="claim-line"><a href="submit?type=golf&amp;name=${encodeURIComponent(c.name)}#form">Run this course? Send us an update &rarr;</a></p>
</div></section>
${others.length ? `<section class="section" style="padding-top:0"><div class="wrap"><h2 class="month-head"><span class="stripe-mini"></span>More golf in ${esc(c.city)}</h2><div class="grid">${others.map(card).join("\n")}</div><p style="margin-top:16px"><a class="more" href="golf/">All valley golf courses &rarr;</a></p></div></section>` : ""}
</main>
${footer}
<script src="assets/app.js"></script>
</body>
</html>`);
}
console.log("golf: " + list.length + " course pages + golf/index.html");
