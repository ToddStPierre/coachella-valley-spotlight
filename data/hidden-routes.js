/* POSTCARD ROUTES HIDDEN FROM THE PUBLIC SITE (Todd, 2026-11-16)
   Only El Paseo, Sun City Palm Desert and Indio (opened 2026-11-18) are shown. The 7 cities below stay in data/mailings.js,
   data/routes.js and the booking Worker, so the admin pages (stats.html) still see them.
   Load this right after data/mailings.js on public pages only. Never load it on stats.html.
   To bring a city back: delete its id from this list. To bring them all back: empty the list. */
window.CVS_HIDDEN_ROUTES = [
  "palm-springs", "cathedral-city", "rancho-mirage", "indian-wells",
  "la-quinta", "coachella", "desert-hot-springs"
];
(function () {
  var hide = window.CVS_HIDDEN_ROUTES || [];
  window.CVS_MAILINGS = (window.CVS_MAILINGS || []).filter(function (m) { return hide.indexOf(m.route) < 0; });
})();
