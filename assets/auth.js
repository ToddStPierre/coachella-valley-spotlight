/* Accounts for Coachella Valley Spotlight (Firebase Auth + Firestore).
   Loaded on every page by app.js. Adds the "Sign in" / "My Spotlight" menu link, wires the heart (save) buttons,
   and renders account.html (sign in, create account, reset password, saved places, email preferences).
   Firestore: users/{uid} = { email, favorites: ["biz:slug" | "event:slug"], prefs: {news, deals, events}, updatedAt }.
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

let user = null, data = { favorites: [], prefs: {} }, loaded = false;
const OWNER_API = "https://cvs-tracker.toddstpierre.workers.dev";
let readyResolve; const ready = new Promise(r => { readyResolve = r; });
window.CVS_AUTH = { ready, user: () => user, token: () => (user ? user.getIdToken() : Promise.resolve(null)), signInUrl: n => ROOT + "account?next=" + encodeURIComponent(n || location.pathname + location.search) };
let mine = null;
async function loadMine() {
  mine = null;
  if (!user) return;
  try {
    const r = await fetch(OWNER_API + "/owner/mine", { headers: { Authorization: "Bearer " + await user.getIdToken() } });
    mine = r.ok ? await r.json() : { listings: [] };
  } catch (e) { mine = { listings: [] }; }
}

/* ---------- menu link ---------- */
const navList = document.querySelector(".nav-links");
const navItem = document.createElement("li");
navItem.innerHTML = `<a class="nav-account" href="${ROOT}account">Sign in</a>`;
if (navList) navList.appendChild(navItem);
function paintNav() {
  const a = navItem.querySelector("a");
  a.textContent = user ? "My Spotlight" : "Sign in";
  if (/\/account(\.html)?$/.test(location.pathname)) a.setAttribute("aria-current", "page");
}

/* ---------- user document ---------- */
async function loadUser() {
  loaded = false;
  if (!user) { data = { favorites: [], prefs: {} }; loaded = true; return; }
  try {
    const snap = await getDoc(doc(db, "users", user.uid));
    data = snap.exists() ? Object.assign({ favorites: [], prefs: {} }, snap.data()) : { favorites: [], prefs: { news: true, deals: true, events: true } };
  } catch (e) { console.warn("[cvs-auth] load failed", e); }
  loaded = true;
}
async function saveUser(patch) {
  Object.assign(data, patch);
  await setDoc(doc(db, "users", user.uid), { email: user.email, favorites: data.favorites || [], prefs: data.prefs || {}, updatedAt: serverTimestamp() });
}

/* ---------- hearts ---------- */
function paintHearts() {
  const fav = new Set(data.favorites || []);
  document.querySelectorAll("[data-fav]").forEach(b => {
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
  if (!user) { location.href = ROOT + "account?next=" + encodeURIComponent(location.pathname + location.search); return; }
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
    up: "It's free. Save places and events, choose your emails, and manage your business listing if you own one.",
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
  if (!loaded) { box.innerHTML = '<div class="empty">Loading your account…</div>'; return; }
  if (!user) { formView("in"); return; }
  const p = data.prefs || {};
  box.innerHTML = `<div class="acct-grid">
<div class="acct-main">
${user.emailVerified ? "" : `<div class="acct-banner">Please confirm your email. We sent a link to <b>${esc(user.email)}</b>. <button type="button" class="linklike" data-act="verify">Send it again</button></div>`}
<h2 class="month-head"><span class="stripe-mini"></span>Saved places and events</h2>
${savedHTML()}
</div>
<aside class="acct-side">
<div class="card acct-card"><h2>Your account</h2><p>${esc(user.email)}</p><button type="button" class="btn btn-ghost" data-act="out">Sign out</button></div>
<div class="card acct-card"><h2>Email preferences</h2><form class="acct-prefs">${PREFS.map(([k, t]) => `<label class="acct-check"><input type="checkbox" name="${k}"${p[k] ? " checked" : ""}> ${t}</label>`).join("")}
<button class="btn" type="submit">Save preferences</button><p class="form-status" role="status" aria-live="polite"></p></form></div>
${mine && mine.listings && mine.listings.length ? `<div class="card acct-card acct-owner"><h2>Your business</h2>${mine.listings.map(l => `<p><b>${esc(l.name)}</b><br><a href="${ROOT}owner.html?b=${encodeURIComponent(l.slug)}">Manage listing and stats &rarr;</a></p>`).join("")}</div>`
  : `<div class="card acct-card"><h2>Own a local business?</h2>${mine && mine.notice ? `<p><b>${esc(mine.notice)}</b></p>` : ""}<p>Find your listing and tap &ldquo;Claim this listing.&rdquo; Once we approve it, sign in here with the same email to manage it and see its stats.</p><a class="btn btn-ghost" href="${ROOT}directory">Find my business</a></div>`}
</aside></div>`;
  box.querySelector('[data-act="out"]').addEventListener("click", () => signOut(auth));
  const v = box.querySelector('[data-act="verify"]');
  if (v) v.addEventListener("click", async () => { try { await sendEmailVerification(user); v.textContent = "Sent!"; v.disabled = true; } catch (e) { v.textContent = "Try again in a minute"; } });
  const pf = box.querySelector(".acct-prefs");
  pf.addEventListener("submit", async e => {
    e.preventDefault(); const st = pf.querySelector(".form-status");
    const prefs = {}; PREFS.forEach(([k]) => { prefs[k] = pf.elements[k].checked; });
    try { await saveUser({ prefs }); st.textContent = "Saved."; } catch (err) { st.textContent = "Couldn't save. Please try again."; }
  });
  paintHearts();
}

onAuthStateChanged(auth, async u => {
  user = u; paintNav(); renderAccount(); readyResolve(u);
  await Promise.all([loadUser(), box ? loadMine() : null]); paintHearts(); renderAccount();
});
