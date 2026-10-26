/* Claim a listing: sends the request to the tracker, Todd approves it. */
(function () {
  var API = "https://cvs-tracker.toddstpierre.workers.dev";
  // Formspree drops emails sent from the tracker's servers, so the browser sends the tracker's email notice.
  function mailTodd(n) { if (!n) return; var fd = new FormData(); Object.keys(n).forEach(function (k) { if (n[k] != null) fd.append(k, String(n[k])); }); fetch("https://formspree.io/f/myezyype", { method: "POST", headers: { Accept: "application/json" }, body: fd }).catch(function () {}); }
  var slug = new URLSearchParams(location.search).get("b") || "";
  var biz = ((window.CVS && window.CVS.directory) || []).filter(function (b) { return b.slug === slug; })[0];
  var form = document.getElementById("claim-form"), msg = document.getElementById("cl-msg");
  if (!biz) { form.innerHTML = '<p class="full">We couldn&rsquo;t find that listing. Go back to the <a href="directory.html">directory</a> and use the claim link on your business&rsquo;s page.</p>'; return; }
  document.getElementById("cl-biz").value = biz.name;
  document.getElementById("cl-title").textContent = "Claim " + biz.name;
  if (biz.claimed) { form.innerHTML = '<p class="full">This listing has already been claimed. If that wasn&rsquo;t you, call or text (760) 422-5475 and we&rsquo;ll sort it out.</p>'; return; }
  // If they're signed in, fill in their account email (it's what links the listing to their login).
  (function waitAuth(n) {
    if (!window.CVS_AUTH) { if (n < 100) setTimeout(function () { waitAuth(n + 1); }, 100); return; }
    window.CVS_AUTH.ready.then(function (u) { if (u && u.email && !form.email.value) form.email.value = u.email; });
  })(0);
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var btn = form.querySelector("button[type=submit]"); btn.disabled = true; msg.textContent = "Sending…";
    fetch(API + "/claim", { method: "POST", body: JSON.stringify({ b: slug, name: form.name.value, role: form.role.value, email: form.email.value, phone: form.phone.value, note: form.note.value }) })
      .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, d: d }; }); })
      .then(function (r) {
        if (!r.ok) { msg.textContent = r.d.error || "That didn’t go through. Please try again."; btn.disabled = false; return; }
        mailTodd(r.d.notice);
        form.innerHTML = '<p class="full" style="font-size:18px"><strong>Got it, thank you!</strong> We&rsquo;ll give the business a quick call to confirm. Once it&rsquo;s approved, <a href="account">sign in or create a free account</a> with this same email to manage your listing.</p>';
      })
      .catch(function () { msg.textContent = "That didn’t go through. Please call or text (760) 422-5475."; btn.disabled = false; });
  });
})();
