/* BUSINESS DIRECTORY
   premium: true   = Premium listing ($10/mo or $60/yr, or free while they are on a postcard).
                     Sits above Basic listings, gold border, shows hours, gallery, offer and the ad image.
   postcard: true  = they are on the current Spotlight postcard (adds the "On the postcard" tag).
   hours:   "Mon to Fri 7 AM to 5 PM"                        (Premium)
   gallery: ["assets/img/gallery/name-1.jpg", ...]           (Premium, photos shown on the profile)
   offer:   { title: "10% off", details: "...", expires: "YYYY-MM-DD" }   (Premium, shown on the listing)
   slug: the business's web address and stats ID, e.g. business/reliable-roofing/. Set it once and never change it,
         or its click counts start over. Lowercase letters, numbers and dashes only.
   image: optional, a picture of their postcard ad, shown on their profile page (put the file in assets/img/ads/).
   about, hours, address, area: optional extra lines for the profile page. */
window.CVS = window.CVS || {};
window.CVS.directory = [
  { slug: "reliable-roofing", name: "Reliable Roofing by TGY", category: "Home services", city: "Palm Desert", blurb: "Residential, commercial and mobile home roofing: new roofs, re-roofs, repairs and leaks. Serving the valley since 1987. CA Lic #764608.", phone: "(760) 568-1673", url: "https://www.reliableroofingbytgy.com", premium: true, postcard: true, image: "assets/img/ads/reliable-roofing.jpg", imageAlt: "Reliable Roofing ad from the El Paseo Spotlight card", about: "Family-run roofing contractor in Palm Desert, owned by Todd Gregory Young. Shingles, tile, torch down, flat roofs, urethane foam, waterproofing, sno coats, leak repairs and insurance work for homes, businesses and mobile homes.", area: "Palm Desert and the Coachella Valley" },
  { name: "Sample Plumbing Co.", category: "Home services", city: "Palm Desert", blurb: "Replace with a one-line description of what the business does best.", phone: "", url: "", premium: true, sample: true },
  { name: "Sample Taqueria", category: "Restaurants", city: "Coachella", blurb: "Family-owned spot. One line about why people go.", phone: "", url: "", premium: true, sample: true },
  { name: "Sample Landscaping", category: "Home services", city: "La Quinta", blurb: "Desert landscaping and irrigation.", phone: "", url: "", sample: true },
  { name: "Sample Dental Studio", category: "Health and beauty", city: "Rancho Mirage", blurb: "General and cosmetic dentistry.", phone: "", url: "", sample: true },
  { name: "Sample Realty", category: "Real estate", city: "Palm Springs", blurb: "Local agents for buyers and sellers.", phone: "", url: "", sample: true },
  { name: "Sample Auto Repair", category: "Auto", city: "Indio", blurb: "Brakes, AC and diagnostics.", phone: "", url: "", sample: true },
  { name: "Sample Pest Control", category: "Home services", city: "Cathedral City", blurb: "Scorpions, termites and the usual suspects.", phone: "", url: "", sample: true },
  { name: "Sample Boutique", category: "Shopping", city: "Palm Desert", blurb: "Women's clothing and gifts.", phone: "", url: "", sample: true }
];
