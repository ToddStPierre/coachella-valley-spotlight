# Automated Outreach & Sales System: Spotlight Postcard

_Plan drafted 2026-11-20._

## 1. The goal in numbers

The target is the **Jan 21, 2027 mailing**: 11 routes, each a 9 x 12 card with 19 spots, and each card mails once **$2,500 is sold**. The artwork deadline is **Jan 11**. That leaves about 7 weeks.

| | Per card | 11 cards |
|---|---|---|
| Minimum to mail | $2,500 | $27,500 |
| Ads at the ~$200 average | ~13 | ~140 |
| Leads needed at ~3% contact-to-close | ~430 | ~4,700 |

Then the Feb 18 and Mar 18 cards follow. The **Season Pass** ($275–$1,375 for 3 mailings) is the main upsell, because one sale covers three cards.

The system has to put a few thousand businesses through a sequence, notice who is interested, and turn a "yes" into a paid, approved ad without Todd touching each step.

## 2. What already exists (build on it, don't replace it)

| Piece | Where | Role in the new system |
|---|---|---|
| Leads CRM | `leads.html` → `cvs-tracker` Worker (D1) | Already has statuses (new/open/hot/won/lost), touches, follow-up dates, reps, and do-not-contact. **This becomes the system of record.** |
| Spot holds | `local-spotlight-reservations` Worker, `reserve.html` | Holds, pay now or invoice later, per card |
| Card calendar | `data/mailings.js` | Says which cards are open, the deadlines, and $ to mail |
| Payment | Stripe payment links ("Payment links" in Leads) | The close |
| Lead source | `data/directory.js` (~700 businesses with phones, mostly La Quinta, Palm Desert, Palm Springs, Indio) | The first outreach list, already sorted by city and category |
| Social proof | Advertiser ads in `assets/img/ads/`, real-card photos, QR tracking (`/t`), stats reports | Goes in every email |

**Gap:** the Worker source isn't in this repo. Pull it in (or add its repo to the session) before the build in Phase 2.

## 3. The funnel

```
LIST ──► OUTREACH ──► REPLY / CLICK ──► PERSONAL OFFER PAGE ──► HOLD ──► PAY ──► ARTWORK ──► PROOF ──► MAILED ──► RESULTS ──► RENEW
 (D1)    (email seq)   (AI triage)      (/o/<lead-id>)          (Worker)  (Stripe) (upload)  (approve)            (QR stats)  (Season Pass)
```

Every arrow is automated. The human steps are: answering hot replies (Claude drafts them, Todd or a rep sends), phone calls to hot leads, and final ad design.

## 4. The pieces

### A. Lead engine (list building)
- **Seed:** import every `directory.js` business into D1 leads, using `Card / Route` from its city and ZIP mapped to a route. Skip existing leads (the Duplicates merge already exists).
- **Find emails:** most directory entries have a phone but no email. Enrich from the business website (contact page scrape) plus Google Places (website and phone). Apollo or Clay are options later; their connectors are installed but failed to connect in this session.
- **Category gap targeting:** for each open card, compute the categories **not yet sold** and target those first. One per category means the pitch is "your category is still open on the La Quinta card."
- **Priority score:** route has the fewest $ sold × category is open × business is in the route's ZIP × home-service category (roofing, HVAC, pest, pools, realty, dental and med spa have done well on past cards).
- Respect `Do Not Contact` everywhere.

### B. Outreach sequences (email-first)
A Worker **Cron Trigger** (runs every 15 minutes on business days) reads leads due for a touch and sends the next step.

**Sequence: "Your category is open"** (5 touches over ~14 days, stops on reply, click-to-hold or DNC):
1. **Day 0, intro.** A plain-text email from Todd, built on a **merge** of their category, their route, the home count, the open-spot count, and a photo of a real card. One CTA: their personal offer page.
2. **Day 3, social proof.** "Here's who's on the Nov 27 card," with 2–3 real advertiser ads from the same or a neighboring category.
3. **Day 6, the math.** "$150 reaches 4,916 La Quinta homes, about 3¢ each," vs. a solo mailer at $3,000+.
4. **Day 10, scarcity, from live data.** "La Quinta is at $1,800 of $2,500. 7 spots left. Your category is still open." It's pulled from the reservations Worker, so it's always true.
5. **Day 14, breakup.** "Should I close your file?" These usually get the most replies.

Other sequences:
- **Free listing owner → advertiser:** anyone who claimed or got a free Basic listing gets "your listing got N views this month," then a postcard offer.
- **Past advertisers → renewal / Season Pass:** triggered when a card mails, using their QR scan numbers.
- **Held but unpaid:** reminders at 24h, 72h, and 5 days before the artwork deadline, each with the Stripe link.
- **Card closes in 7 days:** a blast to every open/hot lead on that route.

**Deliverability (do this first, it decides everything):**
- Send cold email from a **separate domain** (e.g. `spotlightcard.com` or `getcvspotlight.com`), never the main site domain. Set up SPF, DKIM, and DMARC, and warm it up for 2 weeks (start ~20/day per inbox and ramp to ~50).
- Use 2–3 inboxes on that domain, plain text, one link, no images in touch 1.
- **CAN-SPAM:** a real postal address and a one-click opt-out in every email, and an opt-out writes `Do Not Contact` to D1.
- Sending provider: **Resend** or **Postmark** (simple API from a Worker), or Google Workspace inboxes through the Gmail API if you want replies to land in a normal inbox.

**Channels to keep human, or opt-in only:**
- **Cold SMS and AI voice calls:** don't automate these. TCPA treats texts to cell phones and AI-generated voices as needing prior consent, and the fines are per message. Use SMS only for leads who gave a number on a form or replied.
- **Phone calls stay human**, but automated. Each morning the system builds a **call list** of the 10–20 hottest leads (opened 3+ times, clicked the offer page, or replied "maybe") with talking points, and logs outcomes in the existing Call outcomes.
- **Walk-ins:** a weekly route list by street for leads who never opened an email. These work well in El Paseo and Old Town La Quinta.

### C. AI reply desk (Claude)
Inbound replies hit a webhook (Postmark/Resend inbound or Gmail push) → Worker → the Claude API:
- **Classify:** interested / question / price objection / not now / wrong person / unsubscribe / out of office.
- **Act:** unsubscribe → DNC. Out of office → push the touch back. Not now → follow-up date on the next card's open. Interested or question → status **Hot**, write a **draft reply** with their real open spots and offer link, and notify Todd (email, text, or Slack).
- **Approval mode first:** drafts wait in Leads for a one-click "Send." After ~2 weeks of good drafts, turn on auto-send for simple questions (price, dates, sizes, how design works) and keep a human on anything about money changes, complaints, or custom deals.
- Also log every touch into the lead's history, so Leads stays the one place to look.

### D. The close: a personal offer page
`/o/<token>` is a new static page that reads the lead from the Worker and shows:
- "Hi Maria, **Pool service is open on the La Quinta card** (mails Jan 21)."
- Their route's map, home count, a live spot picker (reuse `reserve.html`'s picker), and the price per size.
- Season Pass vs. single mailing, side by side, with Season Pass marked as the best value.
- Two buttons, same as today: **Pay now** (Stripe Checkout) and **Hold free, invoice me**.

Stripe changes:
- Move from static payment links to **Stripe Checkout Sessions** created by the Worker, with the lead id, card, spot, and size in metadata.
- A **Stripe webhook** → Worker marks the spot **Sold**, sets the lead to **Won**, starts the onboarding sequence, and pings Todd.
- "Invoice me" → Worker creates a **Stripe Invoice** (sent automatically, due by the artwork deadline) plus the held-unpaid reminder sequence.

### E. After the sale (onboarding → renewal)
1. **Welcome email:** a link to an upload page for the logo, offer, photo, and phone, which goes into Firebase Storage or R2.
2. **Ad draft:** Claude writes 2 offer/headline options from the upload and their website. Todd or the designer builds it (Canva templates per ad size can speed this up).
3. **Proof email:** the proof image plus **Approve / Request changes** buttons → Worker logs the approval (a paper trail for the "approved by you" promise).
4. **Mailed:** "Your ad is in 4,916 mailboxes today" plus their Premium listing link.
5. **Results at +14 days:** QR scans and listing views from the existing stats, then an offer to **renew or upgrade to Season Pass**, with the same spot and category held for 72 hours.

### F. Dashboard
Add a **Sales** panel to the admin HQ:
- Per card: $ sold / $2,500, holds, days to the artwork deadline, and the open categories.
- Funnel this week: sent → opened → clicked → replied → held → paid.
- Sequence performance by touch and subject line, as an A/B view.
- Alert when a card is under 50% sold with 14 days left, which triggers the "card closes soon" blast and a call list for that route.

## 5. Build order

| Phase | When | Deliverable | Done when |
|---|---|---|---|
| **0. Foundations** | Nov 20–27 | Buy the outreach domain, set up DNS auth, start inbox warm-up, get Worker source into a repo, set up a Stripe webhook endpoint | Warm-up running, test webhook received |
| **1. List** | Nov 24–Dec 3 | Import the directory into D1, email enrichment, route mapping, priority score, open-category view | ≥1,500 leads with email, scored, across 11 routes |
| **2. Sequences** | Dec 1–10 | `sequences` + `touches` tables in D1, cron sender, templates with merge fields + live scarcity, opt-out link, open/click tracking | Touch 1 goes to 50 leads/day and climbs |
| **3. Offer page + Checkout** | Dec 1–10 | `/o/<token>`, Checkout Sessions, Stripe webhook → Sold/Won, auto-invoices | A test lead pays and shows Sold on the card and Won in Leads |
| **4. Reply desk** | Dec 8–15 | Inbound webhook, Claude classify + draft, Hot alerts, draft queue in Leads | Every reply categorized within 5 minutes |
| **5. Onboarding** | Dec 10–20 | Upload page, proof approve flow, mailed and results emails | Jan 21 advertisers go from pay → approved proof without manual email |
| **6. Push** | Dec 15–Jan 11 | Full volume (~150–250 emails/day), daily call lists, "closes in 7 days" blasts on Jan 4 | 11 cards at $2,500+ by Jan 11 |
| **7. Renewals** | Jan 21 on | Results + Season Pass sequence, Feb/Mar card pushes | ≥40% of Jan advertisers renew |

Holiday note: Dec 22–Jan 2 replies will be slow. Front-load touches 1–3 before Dec 19, then run scarcity and breakup touches Jan 2–9.

## 6. Data model additions (D1)

```
sequences  (id, name, steps JSON)                       -- step: {day, subject, body_template, channel}
enrollments(lead_id, sequence_id, step, next_at, state) -- state: active | paused | done | stopped
touches    (id, lead_id, channel, step, sent_at, opened_at, clicked_at, replied_at, msg_id)
replies    (id, lead_id, raw, intent, draft, sent_at, approved_by)
offers     (token, lead_id, card, created_at, viewed_at)
orders     (id, lead_id, card, spot, size, amount, stripe_id, status, proof_url, approved_at)
```

## 7. Tools and monthly cost (estimate)

| Need | Pick | ~Cost/mo |
|---|---|---|
| Sending + inbound | Postmark or Resend | $15–$35 |
| Outreach domain + 2–3 inboxes | Google Workspace | $15–$25 |
| Email enrichment | Website scrape + Google Places; Apollo later if needed | $0–$50 |
| AI replies and drafts | Claude API | $10–$30 |
| Payments | Stripe (already in place) | 2.9% + 30¢ |
| Hosting | Cloudflare Workers + D1 (already in place) | ~$5 |

About **$50–$150/month**, which one Small ad covers.

## 8. KPIs to watch weekly
- Deliverability: bounce under 3%, spam complaints under 0.1%, open rate over 40% on plain-text cold email
- Reply rate over 3%; positive reply rate over 1%
- Offer-page view → hold over 25%; hold → paid over 70%
- $ sold per card vs. $2,500, and the days left
- Cost per sale (tools ÷ ads sold) and Season Pass share of sales

## 9. Decisions needed from Todd
1. **Outreach domain name.** Cold email must not come from the main site domain.
2. **Email provider:** Postmark/Resend (simpler, built for automation) or Google Workspace inboxes (replies in a normal inbox).
3. **Auto-send level for AI replies:** start with approve-every-reply (recommended).
4. **Who works the call list:** Todd, the existing reps, or both. Rep assignment in Leads already exists.
5. **Launch offer for Jan:** e.g. an "early-bird" free size upgrade for anyone booking by Dec 15, to give touches 4–5 a real deadline.
