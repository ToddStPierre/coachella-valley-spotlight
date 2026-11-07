/* Accounts for Coachella Valley Spotlight (Firebase Auth + Firestore).
   Loaded on every page by app.js. Adds the "Sign in" / "My Spotlight" menu link, wires the heart (save) buttons,
   and renders account.html (sign in, create account, reset password, saved places, email preferences).
   Firestore: users/{uid} = { email, favorites: ["biz:slug" | "event:slug"], prefs: {news, deals, events}, updatedAt,
   agent?: { name, title, brokerage, phone, email, website, dre, note, photo, logo, cities[] } } (real estate agents; photo/logo
   are small data URLs). The agent profile feeds the monthly events PDF on agents.html (assets/agent-flyer.js).
   The config is public by design; the Firestore rules (firestore.rules) keep each user to their own document. */
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail, sendEmailVerification, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const app = initializeApp({
  apiKey: "AIzaSyDK_4ApY3Z4lhB1gdjE0en00nb_n4IK6Xk",
  authDomain: "coachellavalleyspotlight.firebaseapp.com",
  projectId: "coachellavalleyspotlight",
  storageBucket: "coachellavalleyspotlight.firebasestorage.app",
  messagingSenderId: "818186701633",
  appId: "1:818186701633:web:6a940e4995feb3953cafc0"
});
const auth = getAuth(app), db = getFirestore(app);
const RENDER = window.CVS_RENDER || {}, ROOT = RENDER.root || "";
const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const PREFS = [["news", "Valley news and good stories"], ["deals", "Local deals and coupons"], ["events", "Things to do this weekend"]];

let user = null, data = { favorites: [], prefs: {} }, loaded = false, prefsSaved = false;
const OWNER_API = "https://cvs-tracker.toddstpierre.workers.dev";
let readyResolve; const ready = new Promise(r => { readyResolve = r; });
window.CVS_AUTH = { ready, user: () => user, token: () => (user ? user.getIdToken() : Promise.resolve(null)), signInUrl: n => ROOT + "account?next=" + encodeURIComponent(n || location.pathname + location.search),
  // Real estate agent profile (agents.html): loaded() is true once the user doc has been read; "cvs:user" fires after each load.
  loaded: () => loaded, agent: () => data.agent || null, agentForm: (el, done) => agentForm(el, done) };
let mine = null, isAdmin = false, leadsMe = null;
async function loadMine() {
  mine = null; isAdmin = false; leadsMe = null;
  if (!user) return;
  try { const r = await fetch(OWNER_API + "/leads/me", { headers: { Authorization: "Bearer " + await user.getIdToken() } }); if (r.ok) leadsMe = await r.json(); } catch (e) {}
  try { const r = await fetch(OWNER_API + "/admin/session", { headers: { Authorization: "Bearer " + await user.getIdToken() } }); isAdmin = r.ok; } catch (e) {}
  try {
    const r = await fetch(OWNER_API + "/owner/mine", { headers: { Authorization: "Bearer " + await user.getIdToken() } });
    mine = r.ok ? await r.json() : { listings: [] };
  } catch (e) { mine = { listings: [] }; }
}

/* ---------- menu link ---------- */
const navList = document.querySelector(".nav-links");
const navItem = document.createElement("li");
navItem.innerHTML = `<a class="nav-account" href="${ROOT}account">My Spotlight</a>`;
if (navList) navList.insertBefore(navItem, navList.firstChild);
function paintNav() {
  const a = navItem.querySelector("a");
  a.title = user ? "Your saved places, emails and account" : "Sign in or create a free account";
  if (/\/account(\.html)?$/.test(location.pathname)) a.setAttribute("aria-current", "page");
}

/* ---------- user document ---------- */
async function loadUser() {
  loaded = false;
  if (!user) { data = { favorites: [], prefs: {} }; loaded = true; return; }
  try {
    const snap = await getDoc(doc(db, "users", user.uid));
    data = snap.exists() ? Object.assign({ favorites: [], prefs: {} }, snap.data()) : { favorites: [], prefs: { news: true, deals: true, events: true } };
    prefsSaved = snap.exists();
    try { if (!sessionStorage.getItem("cvs_saves_synced")) { sessionStorage.setItem("cvs_saves_synced", "1"); syncSaves(); } } catch (e) {}
  } catch (e) { console.warn("[cvs-auth] load failed", e); }
  loaded = true;
}
async function saveUser(patch) {
  Object.assign(data, patch);
  const d = { email: user.email, favorites: data.favorites || [], prefs: data.prefs || {}, updatedAt: serverTimestamp() };
  if (data.agent) d.agent = data.agent;
  await setDoc(doc(db, "users", user.uid), d);
  prefsSaved = true;
  syncSaves();
}
// Tell the tracker this person's full saved list (to count saves per business/event) and their email choices
// (for the admin page's members list). Never blocks the UI.
async function syncSaves() {
  if (!user) return;
  try {
    await fetch(OWNER_API + "/saves/sync", { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + await user.getIdToken() }, body: JSON.stringify({ items: data.favorites || [], prefs: data.prefs || {}, prefsSaved }) });
  } catch (e) {}
}

/* ---------- hearts ---------- */
// Public save counts: the tracker only returns items with 10+ saves, so small numbers never show.
let saveCounts = {};
fetch(OWNER_API + "/saves").then(r => r.ok ? r.json() : null).then(d => { if (d && d.counts) { saveCounts = d.counts; paintHearts(); } }).catch(() => {});
function paintHearts() {
  const fav = new Set(data.favorites || []);
  document.querySelectorAll("[data-fav]").forEach(b => {
    const n = saveCounts[b.getAttribute("data-fav")] || 0;
    let c = b.querySelector(".fav-count");
    if (n && !c) { c = document.createElement("b"); c.className = "fav-count"; b.appendChild(c); }
    if (c) { c.textContent = n ? String(n) : ""; c.hidden = !n; }
    if (n) b.setAttribute("aria-label", (b.getAttribute("aria-label") || "Save").replace(/\s*\(\d+ saved\)$/, "") + " (" + n + " saved)");
    const on = !!user && fav.has(b.getAttribute("data-fav"));
    b.setAttribute("aria-pressed", on ? "true" : "false");
    b.classList.toggle("on", on);
    b.title = on ? "Saved to My Spotlight" : "Save to My Spotlight";
    const t = b.querySelector("span"); if (t) t.textContent = on ? "Saved" : "Save";
  });
}
document.addEventListener("click", async ev => {
  const b = ev.target.closest("[data-fav]");
  if (!b) return;
  ev.preventDefault(); ev.stopPropagation();
  if (!user) { location.href = ROOT + "account?mode=up&save=" + encodeURIComponent(b.getAttribute("data-fav")) + "&next=" + encodeURIComponent(location.pathname + location.search); return; }
  const key = b.getAttribute("data-fav"), list = new Set(data.favorites || []);
  list.has(key) ? list.delete(key) : list.add(key);
  data.favorites = [...list].slice(-500); paintHearts();
  try { await saveUser({}); } catch (e) { console.warn("[cvs-auth] save failed", e); }
  if (document.getElementById("acct")) renderAccount();
});
let paintTimer;
new MutationObserver(() => { clearTimeout(paintTimer); paintTimer = setTimeout(paintHearts, 50); }).observe(document.body, { childList: true, subtree: true });

/* ---------- account page ---------- */
const box = document.getElementById("acct");
const MSG = {
  "auth/invalid-credential": "That email and password don't match. Try again or reset your password.",
  "auth/wrong-password": "That email and password don't match. Try again or reset your password.",
  "auth/user-not-found": "There's no account with that email yet. Create one below.",
  "auth/email-already-in-use": "There's already an account with that email. Sign in instead.",
  "auth/weak-password": "Please use a password of at least 8 characters.",
  "auth/invalid-email": "That doesn't look like an email address.",
  "auth/too-many-requests": "Too many tries. Wait a few minutes and try again.",
  "auth/network-request-failed": "We couldn't reach the server. Check your connection and try again."
};
const errText = e => MSG[e && e.code] || "Something went wrong. Please try again.";
const next = () => { const n = new URLSearchParams(location.search).get("next"); return n && /^\/[^/]/.test(n) ? n : ""; };

function formView(mode, note) {
  const title = { in: "Sign in", up: "Create your free account", reset: "Reset your password" }[mode];
  const lead = {
    in: "Save your favorite local businesses and events, and pick the emails you want.",
    up: new URLSearchParams(location.search).get("save") ? "Create a free account to save this and come back to it anytime. It takes 30 seconds." : "It's free. Save places and events, choose your emails, and manage your business listing if you own one.",
    reset: "Enter your email and we'll send you a link to set a new password."
  }[mode];
  box.innerHTML = `<div class="card acct-card">
<h2>${title}</h2><p class="acct-lead">${lead}</p>
<form class="form acct-form" novalidate>
<label class="full">Email<input name="email" type="email" autocomplete="email" required></label>
${mode === "reset" ? "" : `<label class="full">Password<input name="password" type="password" autocomplete="${mode === "up" ? "new-password" : "current-password"}" minlength="8" required></label>`}
${mode === "up" ? '<p class="full acct-hint">At least 8 characters.</p>' : ""}
<div class="full"><button class="btn" type="submit">${mode === "in" ? "Sign in" : mode === "up" ? "Create account" : "Send reset link"}</button></div>
<p class="full form-status" role="status" aria-live="polite">${note ? esc(note) : ""}</p>
</form>
<p class="acct-switch">${mode === "in" ? '<a href="#" data-mode="up">Create an account</a> &middot; <a href="#" data-mode="reset">Forgot your password?</a>'
    : '<a href="#" data-mode="in">Already have an account? Sign in</a>'}</p>
</div>`;
  const f = box.querySelector("form"), st = f.querySelector(".form-status"), btn = f.querySelector("button");
  box.querySelectorAll("[data-mode]").forEach(a => a.addEventListener("click", e => { e.preventDefault(); formView(a.getAttribute("data-mode")); }));
  f.addEventListener("submit", async e => {
    e.preventDefault();
    const email = f.email.value.trim(), pw = f.password && f.password.value;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { st.textContent = MSG["auth/invalid-email"]; f.email.focus(); return; }
    if (mode !== "reset" && (!pw || (mode === "up" && pw.length < 8))) { st.textContent = mode === "up" ? MSG["auth/weak-password"] : "Please enter your password."; f.password.focus(); return; }
    btn.disabled = true; st.textContent = "One moment…";
    try {
      if (mode === "in") await signInWithEmailAndPassword(auth, email, pw);
      else if (mode === "up") {
        const cred = await createUserWithEmailAndPassword(auth, email, pw);
        try { await sendEmailVerification(cred.user); } catch (e2) {}
        if (window.CVS_GA) window.CVS_GA("sign_up", { method: "email" });
      } else {
        await sendPasswordResetEmail(auth, email);
        formView("in", "If there's an account for " + email + ", a reset link is on its way. Check your inbox (and spam).");
        return;
      }
      const n = next(); if (n) location.href = n;
    } catch (err) { st.textContent = errText(err); btn.disabled = false; }
  });
  const first = f.querySelector("input"); if (first && !note) first.focus({ preventScroll: true });
}

function savedHTML() {
  const R = RENDER.R, favs = (data.favorites || []).slice().reverse();
  if (!R || !favs.length) return '<div class="empty">Nothing saved yet. Tap the heart on any business or event to save it here.</div>';
  const biz = {}, ev = {};
  (RENDER.directory || []).forEach(b => { biz[RENDER.slugOf(b)] = b; });
  (RENDER.events || []).forEach(e => { ev[RENDER.eventSlug(e)] = e; });
  const bizCards = favs.filter(k => k.startsWith("biz:") && biz[k.slice(4)]).map(k => R.directory(biz[k.slice(4)])).join("");
  const evCards = favs.filter(k => k.startsWith("event:") && ev[k.slice(6)]).map(k => R.event(ev[k.slice(6)])).join("");
  return (bizCards ? `<h3 class="acct-sub">Places</h3><div class="grid">${bizCards}</div>` : "") +
    (evCards ? `<h3 class="acct-sub">Events</h3><div class="grid-2">${evCards}</div>` : "") ||
    '<div class="empty">The things you saved have ended or been removed.</div>';
}

function renderAccount() {
  if (!box) return;
  // Signed out: intro on the left, sign-in box on the right. Signed in: full-width account view under the intro.
  const lay = document.getElementById("acct-layout"); if (lay) lay.classList.toggle("is-in", !!user);
  if (!loaded) { box.innerHTML = '<div class="empty">Loading your account…</div>'; return; }
  if (!user) { formView(new URLSearchParams(location.search).get("mode") === "up" ? "up" : "in"); return; }
  const p = data.prefs || {};
  box.innerHTML = `<div class="acct-grid">
<div class="acct-main">
${user.emailVerified ? "" : `<div class="acct-banner">Please confirm your email. We sent a link to <b>${esc(user.email)}</b>. <button type="button" class="linklike" data-act="verify">Send it again</button></div>`}
<h2 class="month-head"><span class="stripe-mini"></span>Saved places and events</h2>
${savedHTML()}
</div>
<aside class="acct-side">
${isAdmin ? `<div class="card acct-card acct-owner"><h2>Site admin</h2><p>Stats for every listing, claims, sign-ups and form submissions.</p><a class="btn" href="${ROOT}stats.html">Open the admin page</a></div>` : ""}
${leadsMe ? `<div class="card acct-card acct-owner"><h2>Leads</h2><p>${leadsMe.role === "admin" ? "Every business you and the reps are working." : "Your sales list, " + esc(leadsMe.rep) + ": log calls, emails and follow-ups."}</p><a class="btn" href="${ROOT}leads.html">Open leads</a></div>` : ""}
<div class="card acct-card"><h2>Your account</h2><p>${esc(user.email)}</p><button type="button" class="btn btn-ghost" data-act="out">Sign out</button></div>
${mine && mine.listings && mine.listings.length ? `<div class="card acct-card acct-owner"><h2>Your business</h2>${mine.listings.map(l => { const city = ((RENDER.directory || []).find(b => RENDER.slugOf(b) === l.slug) || {}).city || ""; return `<p><b>${esc(l.name)}</b>${city && !l.name.includes(city) ? ` (${esc(city)})` : ""}<br><a href="${ROOT}owner.html?b=${encodeURIComponent(l.slug)}">Manage listing and stats &rarr;</a></p>`; }).join("")}</div>` : ""}
<div class="card acct-card acct-agent" id="agent">${agentCardHTML()}</div>
<div class="card acct-card"><h2>Email preferences</h2><form class="acct-prefs">${PREFS.map(([k, t]) => `<label class="acct-check"><input type="checkbox" name="${k}"${p[k] ? " checked" : ""}> ${t}</label>`).join("")}
<button class="btn" type="submit">Save preferences</button><p class="form-status" role="status" aria-live="polite"></p></form></div>
${mine && mine.listings && mine.listings.length ? "" : `<div class="card acct-card"><h2>Own a local business?</h2>${mine && mine.notice ? `<p><b>${esc(mine.notice)}</b></p>` : ""}<p>Find your listing and tap &ldquo;Claim this listing.&rdquo; Once we approve it, sign in here with the same email to manage it and see its stats.</p><a class="btn btn-ghost" href="${ROOT}directory">Find my business</a></div>`}
</aside></div>`;
  box.querySelector('[data-act="out"]').addEventListener("click", () => { try { sessionStorage.removeItem("cvs_admin"); } catch (e) {} signOut(auth); });
  const v = box.querySelector('[data-act="verify"]');
  if (v) v.addEventListener("click", async () => { try { await sendEmailVerification(user); v.textContent = "Sent!"; v.disabled = true; } catch (e) { v.textContent = "Try again in a minute"; } });
  wireAgentCard(box.querySelector(".acct-agent"));
  if (location.hash === "#agent") { const ag = box.querySelector(".acct-agent"); if (ag) { if (!data.agent) { const b = ag.querySelector('[data-act="agent-edit"]'); if (b) b.click(); } ag.scrollIntoView({ block: "start" }); } }
  const pf = box.querySelector(".acct-prefs");
  pf.addEventListener("submit", async e => {
    e.preventDefault(); const st = pf.querySelector(".form-status");
    const prefs = {}; PREFS.forEach(([k]) => { prefs[k] = pf.elements[k].checked; });
    try { await saveUser({ prefs }); st.textContent = "Saved."; } catch (err) { st.textContent = "Couldn't save. Please try again."; }
  });
  paintHearts();
}

/* ---------- real estate agent profile (monthly events PDF) ---------- */
const AGENT_FIELDS = [["name", "Your name", "name", true], ["title", "Title (e.g. REALTOR®)", "organization-title"], ["brokerage", "Brokerage", "organization", true],
  ["phone", "Phone", "tel", true], ["email", "Email", "email"], ["website", "Website", "url"], ["dre", "DRE #", "off"]];
const VALLEY_CITIES = ["Bermuda Dunes", "Cathedral City", "Coachella", "Desert Hot Springs", "Indian Wells", "Indio", "La Quinta", "Palm Desert", "Palm Springs", "Rancho Mirage", "Thousand Palms"];
function agentCardHTML() {
  const a = data.agent;
  if (!a) return `<h2>Real estate agent?</h2><p>Get a free monthly <b>valley events flyer</b> (PDF) with your photo and contact info already on it. Mail it, email it or hand it out to your farm.</p>
<button type="button" class="btn" data-act="agent-edit">Set up my agent profile</button>`;
  return `<h2>Your agent profile</h2><div class="agent-mini">${a.photo ? `<img src="${esc(a.photo)}" alt="">` : ""}<div><b>${esc(a.name)}</b><br>${esc([a.title, a.brokerage].filter(Boolean).join(", "))}<br>${esc(a.phone || "")}</div></div>
<a class="btn" href="${ROOT}agents">Get this month's events PDF &rarr;</a> <button type="button" class="linklike" data-act="agent-edit">Edit profile</button>`;
}
function wireAgentCard(card) {
  if (!card) return;
  const b = card.querySelector('[data-act="agent-edit"]');
  if (b) b.addEventListener("click", () => agentForm(card, () => { card.innerHTML = agentCardHTML(); wireAgentCard(card); }));
}
// Shrink a picked image to fit in maxPx (keeps it small enough to live in the Firestore doc).
function shrinkImage(file, maxPx, type) {
  return new Promise((res, rej) => {
    if (!file || !/^image\//.test(file.type)) return rej(new Error("Please pick a photo (JPG or PNG)."));
    const img = new Image(), url = URL.createObjectURL(file);
    img.onload = () => {
      const k = Math.min(1, maxPx / Math.max(img.width, img.height)), c = document.createElement("canvas");
      c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      const g = c.getContext("2d");
      if (type === "image/jpeg") { g.fillStyle = "#fff"; g.fillRect(0, 0, c.width, c.height); }
      g.drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url);
      let out = c.toDataURL(type, .85);
      if (out.length > 160000) out = c.toDataURL("image/jpeg", .7);
      res(out);
    };
    img.onerror = () => { URL.revokeObjectURL(url); rej(new Error("That image didn't open. Try a JPG or PNG.")); };
    img.src = url;
  });
}
function agentForm(el, done) {
  if (!user) { location.href = window.CVS_AUTH.signInUrl(); return; }
  const a = Object.assign({ email: user.email, cities: [] }, data.agent || {});
  const pics = { photo: a.photo || "", logo: a.logo || "" };
  el.innerHTML = `<h2>${data.agent ? "Edit your agent profile" : "Your agent profile"}</h2><p class="acct-lead">This goes on your monthly events flyer. Only you can see it here.</p>
<form class="form agent-form" novalidate>
${AGENT_FIELDS.map(([k, t, ac, req]) => `<label class="full">${t}${req ? "" : ' <span class="opt">(optional)</span>'}<input name="${k}" value="${esc(a[k] || "")}" autocomplete="${ac}"${k === "email" ? ' type="email"' : k === "phone" ? ' type="tel"' : k === "website" ? ' inputmode="url" placeholder="yoursite.com"' : ""}${req ? " required" : ""} maxlength="${k === "website" ? 120 : 80}"></label>`).join("")}
<label class="full">A short note for your neighbors <span class="opt">(optional)</span><textarea name="note" maxlength="160" rows="2" placeholder="Thinking of buying or selling? I'm always happy to talk.">${esc(a.note || "")}</textarea></label>
<div class="full agent-pics">
<label class="agent-pic"><span class="agent-pic-img round" data-prev="photo">${pics.photo ? `<img src="${esc(pics.photo)}" alt="">` : "Photo"}</span><span>Your photo <span class="opt">(optional)</span></span><input type="file" accept="image/*" data-pic="photo"></label>
<label class="agent-pic"><span class="agent-pic-img" data-prev="logo">${pics.logo ? `<img src="${esc(pics.logo)}" alt="">` : "Logo"}</span><span>Brokerage logo <span class="opt">(optional)</span></span><input type="file" accept="image/*" data-pic="logo"></label>
</div>
<fieldset class="full agent-cities"><legend>Cities you farm <span class="opt">(optional, picks the events on your flyer)</span></legend>
${VALLEY_CITIES.map(c => `<label class="acct-check"><input type="checkbox" name="city" value="${esc(c)}"${(a.cities || []).includes(c) ? " checked" : ""}> ${esc(c)}</label>`).join("")}</fieldset>
<div class="full"><button class="btn" type="submit">Save my profile</button> <button class="linklike" type="button" data-act="cancel">Cancel</button></div>
<p class="full form-status" role="status" aria-live="polite"></p></form>`;
  const f = el.querySelector("form"), st = f.querySelector(".form-status");
  el.querySelectorAll("[data-pic]").forEach(inp => inp.addEventListener("change", async () => {
    const k = inp.getAttribute("data-pic");
    try {
      pics[k] = await shrinkImage(inp.files[0], 400, k === "photo" ? "image/jpeg" : "image/png");
      el.querySelector(`[data-prev="${k}"]`).innerHTML = `<img src="${pics[k]}" alt="">`; st.textContent = "";
    } catch (e) { st.textContent = e.message; }
  }));
  f.querySelector('[data-act="cancel"]').addEventListener("click", () => done && done());
  f.addEventListener("submit", async e => {
    e.preventDefault();
    const out = {};
    AGENT_FIELDS.forEach(([k]) => { out[k] = f.elements[k].value.trim(); });
    out.note = f.elements.note.value.trim();
    out.website = out.website.replace(/^https?:\/\//i, "").replace(/\/$/, "");
    out.cities = [...f.querySelectorAll('input[name="city"]:checked')].map(x => x.value);
    out.photo = pics.photo; out.logo = pics.logo;
    const miss = AGENT_FIELDS.find(([k, , , req]) => req && !out[k]);
    if (miss) { st.textContent = "Please add your " + miss[1].toLowerCase() + "."; f.elements[miss[0]].focus(); return; }
    if (out.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(out.email)) { st.textContent = "That email doesn't look right."; f.elements.email.focus(); return; }
    const first = !data.agent, btn = f.querySelector("button[type=submit]");
    btn.disabled = true; st.textContent = "Saving…";
    const before = data.agent;
    try {
      await saveUser({ agent: out });
      if (first) agentNotice(out);
      if (window.CVS_GA) window.CVS_GA(first ? "agent_profile_create" : "agent_profile_update", {});
      document.dispatchEvent(new CustomEvent("cvs:user", { detail: { user, agent: out } }));
      done && done(out);
    } catch (err) {
      console.warn("[cvs-auth] agent save failed", err);
      data.agent = before;
      st.textContent = "We couldn't save your profile just now. Please try again, or call or text (760) 422-5475."; btn.disabled = false;
    }
  });
}
// Let Todd know a new agent signed up (browser to Formspree, like mailTodd in app.js).
function agentNotice(a) {
  const fd = new FormData();
  fd.append("_subject", "Coachella Valley Spotlight: new real estate agent profile");
  fd.append("source", "Coachella Valley Spotlight / agent profile");
  [["name", a.name], ["brokerage", a.brokerage], ["title", a.title], ["phone", a.phone], ["email", a.email || user.email], ["account_email", user.email],
    ["website", a.website], ["dre", a.dre], ["cities", (a.cities || []).join(", ") || "Whole valley"]].forEach(([k, v]) => { if (v) fd.append(k, v); });
  fetch("https://formspree.io/f/myezyype", { method: "POST", headers: { Accept: "application/json" }, body: fd }).catch(() => {});
}

/* ---------- sign-up prompts (only for signed-out visitors) ---------- */
const PROMPT_KEY = "cvs_hide_acct_prompt";
function promptsOff() { try { return sessionStorage.getItem(PROMPT_KEY) === "1"; } catch (e) { return false; } }
function addPrompts() {
  if (document.querySelector("[data-acct-prompt]")) return;
  const up = ROOT + "account?mode=up&next=" + encodeURIComponent(location.pathname + location.search);
  const heart = '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M12 20.5s-7.5-4.6-9.4-9.3C1.4 8.3 3.2 4.8 6.6 4.5c2-.2 3.7.9 5.4 2.9 1.7-2 3.4-3.1 5.4-2.9 3.4.3 5.2 3.8 4 6.7-1.9 4.7-9.4 9.3-9.4 9.3Z"/></svg>';
  const make = (cls, html) => { const d = document.createElement("div"); d.className = cls; d.setAttribute("data-acct-prompt", ""); d.innerHTML = html; return d; };
  // Footer, every page
  const foot = document.querySelector(".foot-signup > div");
  if (foot) foot.appendChild(make("acct-foot", `<p>Or <a href="${up}">create a free My Spotlight account</a> to save places and events and pick your emails.</p>`));
  if (promptsOff()) return;
  // Home: after "Coming up around the valley"
  const coming = document.querySelector('[data-when="after-weekend"]');
  const sec = coming && coming.closest("section");
  if (sec) sec.after(make("wrap acct-band-wrap", `<div class="acct-band"><div class="acct-band-ico">${heart}</div><div><h2>Make the valley yours</h2><p>Create a free <b>My Spotlight</b> account to save the places and events you love, get weekend picks by email, and find them again in one tap.</p></div><a class="btn" href="${up}">Create my free account</a></div>`));
  // Directory / events: slim bar above the results
  const browse = document.querySelector("[data-browse]");
  if (browse) browse.before(make("acct-bar", `${heart}<span>Tap the heart to save businesses and events to <b>My Spotlight</b>.</span><a href="${up}">Create a free account</a><button type="button" class="acct-x" aria-label="Hide this">&times;</button>`));
  // Business profile: sidebar card
  const side = document.querySelector(".pf-side"), name = document.querySelector(".pf-head h1");
  if (side && name) {
    const c = make("pf-card acct-side-card", `<h2>${heart} Save ${esc(name.textContent)}</h2><p>Keep the businesses you use in one place with a free My Spotlight account.</p><a class="btn btn-ghost" href="${ROOT}account?mode=up&save=${encodeURIComponent((document.querySelector(".pf-head [data-fav]") || {}).getAttribute ? document.querySelector(".pf-head [data-fav]").getAttribute("data-fav") : "")}&next=${encodeURIComponent(location.pathname)}">Create a free account</a>`);
    const firstCard = side.querySelector(".pf-card");
    firstCard ? firstCard.after(c) : side.prepend(c);
  }
}
function removePrompts() { document.querySelectorAll("[data-acct-prompt]").forEach(el => el.remove()); }
document.addEventListener("click", e => {
  if (!e.target.closest(".acct-x")) return;
  try { sessionStorage.setItem(PROMPT_KEY, "1"); } catch (err) {}
  const bar = e.target.closest(".acct-bar"); if (bar) bar.remove();
});

onAuthStateChanged(auth, async u => {
  user = u; paintNav(); renderAccount(); readyResolve(u);
  if (u) removePrompts(); else addPrompts();
  await Promise.all([loadUser(), box ? loadMine() : null]);
  // Finish a save that started before sign-up (?save=biz:slug), then go back.
  const sp = new URLSearchParams(location.search), pend = sp.get("save");
  if (u && pend && /^(biz|event):[a-z0-9-]{2,120}$/.test(pend)) {
    if (!(data.favorites || []).includes(pend)) { data.favorites = (data.favorites || []).concat(pend).slice(-500); try { await saveUser({}); } catch (e) {} }
    const n = next(); if (n) { location.href = n; return; }
  }
  paintHearts(); renderAccount();
  document.dispatchEvent(new CustomEvent("cvs:user", { detail: { user: u, agent: data.agent || null } }));
});
