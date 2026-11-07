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

## Real estate agent events flyer
`agents` (agents.html) lets a real estate agent with a free My Spotlight account download a monthly PDF of valley events with their photo, contact info, logo and a QR code to their website on every page. The profile lives in the agent's Firestore user doc (`agent`), edited on the account page or on `agents`. The PDF is built in the browser (`assets/agent-flyer.js`, jsPDF in `assets/vendor`). When an agent saves a profile for the first time, Formspree emails a "new real estate agent profile" notice.

`firestore.rules` allows the `agent` field. Publish the rules in the Firebase console (Firestore Database > Rules) after changing them; pushing to GitHub doesn't deploy them.
