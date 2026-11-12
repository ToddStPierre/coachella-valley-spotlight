/* DEALS
   offer: the short headline of the deal. details: the fine print.
   expires: YYYY-MM-DD or "". Expired deals hide themselves automatically.
   url: where "Get this deal" goes. Use the business's profile page (business/<slug>/) or an outside link.
   slug: the business's directory slug. Claims are counted for that business ("Deals claimed" on their dashboard),
   and the deal shows on their profile page if their listing has no offer of its own.
   Order matters: the first deals lead the home page. Keep family-friendly ones (food, home services) on top; 21+ deals go last. */
window.CVS = window.CVS || {};
window.CVS.deals = [
  { offer: "Free appetizer for the table", business: "Ristorante Mamma Gina", slug: "ristorante-mamma-gina", city: "Palm Desert", category: "Restaurants", details: "With the purchase of 2 entrees. Show the ad. One per table, dining room only (not the Enoteca Bar or happy hour), not valid with other offers.", expires: "2026-12-30", url: "business/ristorante-mamma-gina/" },
  { offer: "Senior and military discounts", business: "Reliable Roofing by TGY", slug: "reliable-roofing", city: "Palm Desert", category: "Home services", details: "On new roofs, re-roofs and repairs. Ask for the senior or military discount when you call (760) 568-1673.", expires: "", url: "business/reliable-roofing/" },
  { offer: "$2,599 golf car lithium conversion", business: "Golf Cars of the Desert", slug: "golf-cars-of-the-desert", city: "Palm Desert", category: "Automotive", details: "Includes tax and transportation to Sun City. Only 25 units at this price. Price may vary by cart type and other factors, and additional fees may apply. Book at (760) 469-8006.", expires: "", url: "business/golf-cars-of-the-desert/" },
  { offer: "30% off any cannabis purchase", business: "Palm Royale Collective", slug: "palm-royale-collective", city: "Palm Desert", category: "Shopping", details: "In store or at prc420.com. Some exclusions apply. 21+ only.", expires: "2026-12-31", url: "business/palm-royale-collective/" }
];
