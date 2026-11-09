/* Subscribable calendar feeds. Runs on GitHub on every build (every push and every 3 hours).
   Writes calendar/valley.ics (every event) and calendar/<city>.ics (one per town with events).
   People subscribe once in Apple, Google or Outlook Calendar and the feed keeps itself up to date.
   Each event links back to its page on the site (utm_source=calendar), and every Friday there is an
   all-day "This weekend in <town>" note that links to the this-weekend page.
   calendar/ is gitignored, like event/: never edit it by hand.
   Uses the same event list, dates, times and weekly repeats as the site (it runs app.js's card code). */
process.env.TZ = "America/Los_Angeles";
const fs = require("fs"), path = require("path"), vm = require("vm");
const { root, SITE, loadData, slugify } = require("./lib");

const D = loadData();
const app = fs.readFileSync(path.join(root, "assets/app.js"), "utf8");
const ctx = { window: { CVS: D }, document: { documentElement: { getAttribute: () => "" } }, URL };
vm.runInNewContext(app.slice(app.indexOf("{") + 1, app.indexOf("/* PRERENDER-END")) +
  "\n;__out = { events: events, eventSlug: eventSlug, calInfo: calInfo, parse: parse, iso: iso };", ctx);
const C = ctx.__out;

const DAYS_AHEAD = 120;
const today = new Date(); today.setHours(0, 0, 0, 0);
const horizon = new Date(today); horizon.setDate(horizon.getDate() + DAYS_AHEAD);
const STAMP = new Date().toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z";
const UTM = "utm_source=calendar&utm_medium=ics";
const withUtm = (u, campaign) => u + (u.indexOf("?") > -1 ? "&" : "?") + UTM + "&utm_campaign=" + campaign;
const x = s => String(s).replace(/\\/g, "\\\\").replace(/[;,]/g, "\\$&").replace(/\r?\n/g, "\\n");
// Fold lines longer than 75 bytes (RFC 5545), without splitting a multi-byte character.
function fold(line) {
  const out = []; let cur = "", n = 0;
  for (const ch of line) {
    const b = Buffer.byteLength(ch);
    if (n + b > (out.length ? 74 : 75)) { out.push(cur); cur = ""; n = 0; }
    cur += ch; n += b;
  }
  out.push(cur);
  return out.join("\r\n ");
}
const VTZ = ["BEGIN:VTIMEZONE", "TZID:America/Los_Angeles", "BEGIN:DAYLIGHT", "TZOFFSETFROM:-0800", "TZOFFSETTO:-0700", "TZNAME:PDT", "DTSTART:19700308T020000", "RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=2SU", "END:DAYLIGHT",
  "BEGIN:STANDARD", "TZOFFSETFROM:-0700", "TZOFFSETTO:-0800", "TZNAME:PST", "DTSTART:19701101T020000", "RRULE:FREQ=YEARLY;BYMONTH=11;BYDAY=1SU", "END:STANDARD", "END:VTIMEZONE"];

// One VEVENT per event. Feed events that run on several dates get one VEVENT per date.
function vevents(e, feedSlug, seen) {
  const slug = C.eventSlug(e), dates = !e.weekly && e.dates && e.dates.length > 1 ? e.dates : [e.date], out = [];
  dates.forEach((d, i) => {
    const uid = slug + (i ? "-" + d : "") + "@coachellavalleyspotlight.com";
    if (C.parse(d) > horizon || seen[uid]) return; // the same event can be hand-entered and in a feed: keep the first
    seen[uid] = 1;
    const ev = Object.assign({}, e, { date: d }), c = C.calInfo(ev);
    const tz = c.t ? ";TZID=America/Los_Angeles:" : ";VALUE=DATE:";
    const page = e.feed ? `${SITE}/events?city=${encodeURIComponent(e.city || "")}` : `${SITE}/event/${slug}/`;
    const link = withUtm(page, feedSlug);
    const desc = [e.description || "", e.feed && e.url ? "Details and tickets: " + e.url : "", "On Coachella Valley Spotlight: " + link, "More this weekend: " + withUtm(`${SITE}/this-weekend/`, feedSlug)].filter(Boolean).join("\n\n");
    out.push("BEGIN:VEVENT", "UID:" + uid, "DTSTAMP:" + STAMP,
      "DTSTART" + tz + c.start, "DTEND" + tz + c.end, c.rule, "SUMMARY:" + x(e.title), "LOCATION:" + x(c.where),
      "DESCRIPTION:" + x(desc), "URL:" + link, e.category ? "CATEGORIES:" + x(e.category) : "", "END:VEVENT");
  });
  return out.filter(Boolean);
}
// Every Friday for the next 8 weeks: an all-day "This weekend" note with the count, linking to the this-weekend page.
function fridayNotes(list, city, feedSlug) {
  const out = [], d = new Date(today);
  while (d.getDay() !== 5) d.setDate(d.getDate() + 1);
  for (let w = 0; w < 8; w++, d.setDate(d.getDate() + 7)) {
    const fri = new Date(d), sun = new Date(d); sun.setDate(sun.getDate() + 2);
    const n = list.filter(e => {
      const ds = e.weekly ? [e.date].concat(e.dates || []) : (e.dates && e.dates.length ? e.dates : [e.date]);
      const s = C.parse(e.date), last = C.parse(e.endDate || e.date);
      return ds.some(k => { const t = C.parse(k); return t >= fri && t <= sun; }) || (e.endDate && s <= sun && last >= fri) ||
        (e.weekly && ["Friday", "Saturday", "Sunday"].indexOf(e.weekly) > -1 && (!e.until || C.parse(e.until) >= fri));
    }).length;
    if (!n) continue;
    const next = new Date(fri); next.setDate(next.getDate() + 1);
    const where = city || "the valley", page = withUtm(`${SITE}/this-weekend/${city ? slugify(city) + "/" : ""}`, feedSlug);
    out.push("BEGIN:VEVENT", "UID:weekend-" + (city ? slugify(city) : "valley") + "-" + C.iso(fri) + "@coachellavalleyspotlight.com", "DTSTAMP:" + STAMP,
      "DTSTART;VALUE=DATE:" + C.iso(fri).replace(/-/g, ""), "DTEND;VALUE=DATE:" + C.iso(next).replace(/-/g, ""),
      "SUMMARY:" + x("This weekend in " + where + ": " + n + (n === 1 ? " thing" : " things") + " to do"),
      "DESCRIPTION:" + x("The weekend's events, deals and happy hours in " + where + ":\n" + page), "URL:" + page,
      "TRANSP:TRANSPARENT", "END:VEVENT");
  }
  return out;
}
function calendar(name, list, city) {
  const feedSlug = city ? slugify(city) : "valley";
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Coachella Valley Spotlight//Valley Calendar//EN", "CALSCALE:GREGORIAN", "METHOD:PUBLISH",
    "X-WR-CALNAME:" + x(name), "X-WR-CALDESC:" + x("Things to do " + (city ? "in " + city : "across the Coachella Valley") + ", from coachellavalleyspotlight.com. Updates itself."),
    "X-WR-TIMEZONE:America/Los_Angeles", "REFRESH-INTERVAL;VALUE=DURATION:PT6H", "X-PUBLISHED-TTL:PT6H"].concat(VTZ);
  const seen = {};
  list.forEach(e => { lines.push.apply(lines, vevents(e, feedSlug, seen)); });
  lines.push.apply(lines, fridayNotes(list, city, feedSlug));
  lines.push("END:VCALENDAR");
  return lines.map(fold).join("\r\n") + "\r\n";
}

const events = C.events.filter(e => C.parse(e.date) <= horizon);
const dir = path.join(root, "calendar");
fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
const write = (file, body, count) => { fs.writeFileSync(path.join(dir, file), body); console.log("built calendar/" + file + " (" + count + " events)"); };
write("valley.ics", calendar("Coachella Valley Spotlight: Valley events", events, ""), events.length);
const cities = {};
events.forEach(e => { if (e.city) (cities[e.city] = cities[e.city] || []).push(e); });
const index = [];
Object.keys(cities).sort().forEach(city => {
  write(slugify(city) + ".ics", calendar("Coachella Valley Spotlight: " + city, cities[city], city), cities[city].length);
  index.push({ city, slug: slugify(city), count: cities[city].length });
});
// Small list the subscribe box reads, so it only offers towns that have a feed.
fs.writeFileSync(path.join(dir, "index.json"), JSON.stringify({ built: new Date().toISOString(), valley: events.length, cities: index }));
