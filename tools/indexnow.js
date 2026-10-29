/* Tells Bing (and the other IndexNow engines) which pages changed, so they're crawled within hours instead of weeks.
   Run after the build:  node tools/indexnow.js all     → every URL in sitemap.xml (on a push, when pages really changed)
                         node tools/indexnow.js fresh   → only pages that refill on their own (this-weekend/, events)
   The key is the <32 hex>.txt file in the site root; IndexNow checks it to confirm we own the site.
   Never fails the build: any error is logged and ignored. */
const fs = require("fs"), path = require("path");
const root = path.join(__dirname, ".."), HOST = "coachellavalleyspotlight.com";
const keyFile = fs.readdirSync(root).find(f => /^[0-9a-f]{32}\.txt$/.test(f));
if (!keyFile) { console.log("indexnow: no key file, skipped"); process.exit(0); }
const key = keyFile.slice(0, 32);
const all = [...fs.readFileSync(path.join(root, "sitemap.xml"), "utf8").matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1].replace(/&amp;/g, "&"));
const urls = process.argv[2] === "all" ? all : all.filter(u => /\/(this-weekend\/|events$)/.test(u));
fetch("https://api.indexnow.org/indexnow", {
  method: "POST", headers: { "Content-Type": "application/json; charset=utf-8" },
  body: JSON.stringify({ host: HOST, key, keyLocation: `https://${HOST}/${keyFile}`, urlList: urls.slice(0, 10000) })
}).then(r => console.log(`indexnow: ${urls.length} URLs sent, HTTP ${r.status}`), e => console.log("indexnow: failed, " + e.message));
