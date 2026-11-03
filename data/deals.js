/* DEALS
   offer: the short headline of the deal. details: the fine print.
   expires: YYYY-MM-DD or "". Expired deals hide themselves automatically.
   url: where "Get this deal" goes. Use the business's profile page (business/<slug>/) or an outside link.
   slug: the business's directory slug. Claims are counted for that business ("Deals claimed" on their dashboard),
   and the deal shows on their profile page if their listing has no offer of its own. */
window.CVS = window.CVS || {};
window.CVS.deals = [
  { offer: "First pest treatment for $82", business: "Antex Exterminating", slug: "antex-exterminating", city: "Palm Desert", category: "Home services", details: "Initial treatment for $82, regularly $120. Mention Coachella Valley Spotlight when you call (760) 503-5664.", expires: "", url: "business/antex-exterminating/" },
  { offer: "Free appetizer for the table", business: "Ristorante Mamma Gina", slug: "ristorante-mamma-gina", city: "Palm Desert", category: "Restaurants", details: "With the purchase of 2 entrees. Show the ad. One per table, dining room only (not the Enoteca Bar or happy hour), not valid with other offers.", expires: "2026-11-25", url: "business/ristorante-mamma-gina/" }
];
