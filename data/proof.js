/* ADVERTISER RESULTS on the Advertise page (the "Results" section under the advertiser wall).
   The whole section stays hidden until there is at least one result or quote here. Only put in what is true:
   a number from HQ or a quote the business said and agreed to have on the site, word for word.

   totals: running numbers across every card. Leave a field null to hide that box.
     scans:   total QR scans from all cards (HQ > results)
     cards:   cards mailed so far
     homes:   homes reached so far
     sinceLabel: small line under the boxes, e.g. "Since our first card on Nov 27, 2026"

   results: one entry per advertiser. Copy a line, fill it in, delete the fields you don't have.
     business: "Foam King and Insulation Company"   (shown as written)
     slug:     "foam-king-and-insulation-company"   (optional: links the name to their profile)
     number:   "12 calls"                           (optional: the big headline result)
     detail:   "from the El Paseo card in the first week"  (optional: line under the number)
     quote:    "I'm the only roofer on the card..." (optional: their words, without quote marks)
     person:   "Gina, owner"                        (optional: who said it)
     card:     "El Paseo, Nov 27, 2026"             (optional: which card)
     photo:    "assets/img/advertisers/xyz.jpg"     (optional: square photo of the owner or shop)

   Example (keep it commented out):
   { business: "Golf Cars of the Desert", slug: "golf-cars-of-the-desert", number: "3 conversions sold",
     detail: "from one Sun City card", quote: "People walked in holding the postcard.", person: "Owner",
     card: "Sun City, Dec 17, 2026" },
*/
window.CVS_PROOF = {
  totals: { scans: null, cards: null, homes: null, sinceLabel: "" },
  results: [
  ]
};
