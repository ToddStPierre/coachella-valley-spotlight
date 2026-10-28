/* SPONSORED PLACEMENTS on /local/ category pages (built into the HTML by tools/build-seo.js).
   placements: which pages show it. "category:Health and beauty" = that category's pages, its city pages
               and the pages of every service under it (dentists, med spas and so on).
   affiliate:  true = the link pays us a commission. The band then says so (FTC disclosure).
   start/until: optional YYYY-MM-DD. Outside those dates the ad isn't built.
   url: an outside link (opens in a new tab, rel="sponsored nofollow") or one of our pages like "business/<slug>/".
   short: shorter text for the hero-side card (falls back to text).
   w/h: the image's pixel size. Every ad is labeled "Sponsored". Keep copy free of health claims. */
window.CVS = window.CVS || {};
window.CVS.sponsors = [
  { id: "dosed-collective", name: "The Dosed Collective", placements: ["category:Health and beauty"], affiliate: true,
    image: "assets/img/ads/dosed-collective.jpg", alt: "The Dosed Collective products: an oral strip box, a nasal spray and a serum bottle",
    headline: "Modern peptides, simply dosed.",
    text: "Oral dissolving strips, nasal sprays and peptide skincare serums from The Dosed Collective. Premeasured, individually packaged and travel-friendly. Create an account to see products and pricing.",
    short: "Oral dissolving strips, nasal sprays and peptide skincare serums. Premeasured and travel-friendly. Create an account to shop.",
    cta: "Explore The Dosed Collective", url: "https://www.thedosedcollective.com/?ref=Todd10", start: "2026-10-28", w: 900, h: 630 },
  { id: "antex-exterminating", name: "Antex Exterminating", placements: ["category:Home services"],
    image: "assets/img/ads/antex-exterminating.jpg", alt: "Antex Exterminating ad from the El Paseo Spotlight card", w: 440, h: 415,
    headline: "Bugs, rodents or gophers? Call Antex.",
    text: "Family-owned pest control with more than 20 years in the business, for homes and businesses across the valley. Roaches, ants, spiders, rodents, gophers and inspections, using products that are safe around kids and pets. First treatment $82 (regularly $120) when you mention Coachella Valley Spotlight.",
    short: "Family-owned pest and gopher control, safe around kids and pets. First treatment $82 (regularly $120) when you mention Coachella Valley Spotlight.",
    cta: "See Antex Exterminating", url: "business/antex-exterminating/", start: "2026-10-28" },
];
