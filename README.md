# Coachella Valley Spotlight

A local hub for the Coachella Valley: events, deals, local news, a business directory, and the shared postcard ad offer.

## Stocking the site
All listings live in `data/`:

- `data/events.js`: events (past ones hide automatically)
- `data/deals.js`: deals (expired ones hide automatically)
- `data/news.js`: local news, newest first
- `data/directory.js`: businesses (`featured: true` puts one at the top)

Copy an entry, change the details, save, and push. Delete the `sample: true` entries once real ones are in.

Forms (Advertise and Submit) post to Formspree form `myezyype`.
