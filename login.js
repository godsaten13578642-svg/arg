(function () {
  if (!window.argAuth) return;

  const loginForm = document.getElementById("login-form");
  const signupForm = document.getElementById("signup-form");
  const loginMsg = document.getElementById("login-msg");
  const signupMsg = document.getElementById("signup-msg");
  const sharedServerForm = document.getElementById("shared-server-form");
  const sharedServerInput = document.getElementById("shared-server-url");
  const sharedServerMsg = document.getElementById("shared-server-msg");

  function getNext() {
    return new URLSearchParams(window.location.search).get("next") || "terminal.html";
  }

  loginForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const username = document.getElementById("login-username").value;
    const password = document.getElementById("login-password").value;
    const session = await window.argAuth.authenticate(username, password);
    if (!session) {
      loginMsg.textContent = "Access denied.";
      return;
    }
    window.location.href = getNext();
  });

  if (window.argStore && sharedServerForm && sharedServerInput) {
    sharedServerInput.value = window.argStore.getApiBase();
    sharedServerForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const saved = window.argStore.setApiBase(sharedServerInput.value);
      if (sharedServerMsg) sharedServerMsg.textContent = `Saved shared server: ${saved}`;
    });
  }

  signupForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const username = document.getElementById("signup-username").value;
    const password = document.getElementById("signup-password").value;
    const result = await window.argAuth.signup(username, password);
    if (!result.ok) {
      signupMsg.textContent = result.error;
      return;
    }
    signupMsg.className = "success";
    signupMsg.textContent = "Account created. You can log in now.";
    signupForm.reset();
  });
})();
