(function () {
  const form = document.getElementById("access-form");
  if (!form || !window.argAuth) return;

  const msg = document.getElementById("login-msg");

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value;

    const session = window.argAuth.authenticate(username, password);
    if (!session) {
      msg.textContent = "Access denied: invalid credentials.";
      return;
    }

    const next = new URLSearchParams(window.location.search).get("next") || "terminal.html";
    window.location.href = next;
  });
})();
