/**
 * Tela de login / cadastro (login.html).
 * Um único formulário alterna entre os dois modos.
 */
(function () {
  "use strict";

  // Quem já tem sessão válida não precisa ver o login.
  if (WL.auth.isLoggedIn()) {
    location.replace("tasks.html");
    return;
  }

  const MODES = {
    login: {
      title: "Entrar",
      sub: "Acesse a sua lista de tarefas.",
      submit: "Entrar",
      endpoint: "/api/auth/login",
      autocomplete: "current-password",
    },
    register: {
      title: "Criar conta",
      sub: "Cadastre-se para guardar as suas tarefas.",
      submit: "Criar conta",
      endpoint: "/api/auth/register",
      autocomplete: "new-password",
    },
  };

  const $ = (id) => document.getElementById(id);
  const form = $("auth-form");
  const emailInput = $("email");
  const passwordInput = $("password");
  const confirmInput = $("confirm");
  const confirmField = $("confirm-field");
  const passwordHint = $("password-hint");
  const errorEl = $("auth-error");
  const submitBtn = $("auth-submit");
  const tabs = document.querySelectorAll(".auth-tab");

  let mode = "login";

  function showError(message) {
    errorEl.textContent = message;
    errorEl.hidden = false;
  }
  function clearError() {
    errorEl.hidden = true;
    errorEl.textContent = "";
  }

  /** Troca entre "Entrar" e "Criar conta". */
  function setMode(next) {
    mode = next;
    const config = MODES[mode];
    const isRegister = mode === "register";

    $("auth-title").textContent = config.title;
    $("auth-sub").textContent = config.sub;
    submitBtn.textContent = config.submit;
    passwordInput.autocomplete = config.autocomplete;
    confirmField.hidden = !isRegister;
    passwordHint.hidden = !isRegister;
    confirmInput.value = "";
    tabs.forEach((tab) => tab.setAttribute("aria-pressed", String(tab.dataset.mode === mode)));
    clearError();
  }

  tabs.forEach((tab) => tab.addEventListener("click", () => setMode(tab.dataset.mode)));

  // Mostrar / ocultar senha
  $("toggle-pass").addEventListener("click", (event) => {
    const showing = passwordInput.type === "text";
    passwordInput.type = showing ? "password" : "text";
    event.currentTarget.textContent = showing ? "Mostrar" : "Ocultar";
  });

  // Avisos que vêm da URL: ?expirada=1 e #criar
  if (new URLSearchParams(location.search).has("expirada")) $("auth-notice").hidden = false;
  if (location.hash === "#criar") setMode("register");

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearError();

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    // Validações rápidas no navegador (o servidor valida tudo de novo).
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      showError("Informe um e-mail válido.");
      emailInput.focus();
      return;
    }
    if (!password) {
      showError("Informe a senha.");
      passwordInput.focus();
      return;
    }
    if (mode === "register") {
      if (password.length < 8) {
        showError("A senha deve ter pelo menos 8 caracteres.");
        passwordInput.focus();
        return;
      }
      if (password !== confirmInput.value) {
        showError("As senhas não são iguais.");
        confirmInput.focus();
        return;
      }
    }

    const label = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = "Aguarde...";

    try {
      const data = await WL.api.post(MODES[mode].endpoint, { email, password }, { needsAuth: false });
      WL.auth.save(data.token, data.email);
      location.replace("tasks.html");
    } catch (err) {
      showError(err.message);
      submitBtn.disabled = false;
      submitBtn.textContent = label;
    }
  });
})();
