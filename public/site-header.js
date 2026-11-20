// Shared header behaviour for the static pages (About, Contact, Terms & Privacy).
// A signed-in member sees the same account control and Directory link as in the app.
(function () {
  var nav = document.querySelector("header nav[data-site-nav]");
  if (!nav) return;
  fetch("/api/me", { credentials: "same-origin", headers: { Accept: "application/json" } })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (data) {
      var m = data && data.member;
      if (!m || m.tenant === "guest") return;
      var name = String(m.name || "").trim();
      var digits = String(m.phone || "").replace(/\D/g, "");
      var initial = /^[A-Za-z]/.test(name) ? name[0].toUpperCase() : "A";
      var last4 = digits.length >= 4 ? digits.slice(-4) : "";
      var login = document.getElementById("siteLogin");
      if (!login) return;
      var dir = document.createElement("a");
      dir.className = "nav-btn";
      dir.href = "/#directory";
      dir.textContent = "Directory";
      nav.insertBefore(dir, login);
      login.className = "account-chip";
      login.href = "/#dashboard";
      login.setAttribute("aria-label", "My requests");
      login.textContent = "";
      var dot = document.createElement("span");
      dot.className = "account-dot";
      dot.setAttribute("aria-hidden", "true");
      dot.textContent = initial;
      login.appendChild(dot);
      login.appendChild(document.createTextNode(last4 ? initial + " · " + last4 : "My requests"));
    })
    .catch(function () {});
})();
