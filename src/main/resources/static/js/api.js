/**
 * Camada de acesso à API e à sessão (token JWT).
 * Expõe:  WL.auth  (guardar/ler o token, exigir login, sair)
 *         WL.api   (get/post/patch/del já com o cabeçalho Authorization)
 */
(function () {
  "use strict";

  const WL = (window.WL = window.WL || {});

  const TOKEN_KEY = "worklista.token";
  const EMAIL_KEY = "worklista.email";
  const API_BASE = (window.WORKLISTA_API_BASE || "").replace(/\/$/, "");

  /**
   * Lê o conteúdo (payload) de um JWT SÓ para saber quando ele expira.
   * Isto NÃO valida o token; quem valida de verdade é o servidor.
   */
  function decodePayload(token) {
    try {
      const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
      const json = decodeURIComponent(
        atob(base64)
          .split("")
          .map((c) => "%" + c.charCodeAt(0).toString(16).padStart(2, "0"))
          .join("")
      );
      return JSON.parse(json);
    } catch (_) {
      return null;
    }
  }

  const auth = {
    get token() {
      return localStorage.getItem(TOKEN_KEY);
    },
    get email() {
      return localStorage.getItem(EMAIL_KEY);
    },
    save(token, email) {
      localStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem(EMAIL_KEY, email);
    },
    clear() {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(EMAIL_KEY);
    },
    /** true se há um token ainda dentro do prazo de validade. */
    isLoggedIn() {
      const token = this.token;
      if (!token) return false;
      const payload = decodePayload(token);
      return Boolean(payload && payload.exp && payload.exp * 1000 > Date.now());
    },
    /** Guarda das páginas protegidas: sem sessão válida, vai para o login. */
    requireLogin() {
      if (this.isLoggedIn()) return true;
      this.clear();
      location.replace("login.html");
      return false;
    },
    logout() {
      this.clear();
      location.replace("login.html");
    },
  };

  /** Erro devolvido pela API (ou de rede), sempre com uma mensagem pronta para o usuário. */
  class ApiError extends Error {
    constructor(message, status) {
      super(message);
      this.name = "ApiError";
      this.status = status;
    }
  }

  /**
   * Faz a requisição, anexa o token e converte erros em ApiError.
   * Se a API responder 401 numa rota protegida (token expirado/inválido),
   * limpa a sessão e volta para o login.
   */
  async function request(path, { method = "GET", body, needsAuth = true } = {}) {
    const headers = { Accept: "application/json" };
    if (body !== undefined) headers["Content-Type"] = "application/json";
    if (needsAuth && auth.token) headers.Authorization = "Bearer " + auth.token;

    let response;
    try {
      response = await fetch(API_BASE + path, {
        method,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });
    } catch (_) {
      throw new ApiError("Não foi possível conectar ao servidor. Verifique se ele está rodando.", 0);
    }

    if (response.status === 401 && needsAuth) {
      auth.clear();
      location.replace("login.html?expirada=1");
      throw new ApiError("Sessão expirada. Entre novamente.", 401);
    }

    const data = response.status === 204 ? null : await response.json().catch(() => null);

    if (!response.ok) {
      throw new ApiError((data && data.message) || "Algo deu errado. Tente novamente.", response.status);
    }
    return data;
  }

  const api = {
    get: (path) => request(path),
    post: (path, body, options) => request(path, { method: "POST", body, ...options }),
    patch: (path, body) => request(path, { method: "PATCH", body }),
    del: (path) => request(path, { method: "DELETE" }),
  };

  WL.auth = auth;
  WL.api = api;
  WL.ApiError = ApiError;
})();
