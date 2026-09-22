/**
 * Utilidades de interface compartilhadas pelas páginas.
 *
 * SEGURANÇA (XSS): todo conteúdo vindo do usuário (título, descrição, e-mail)
 * é inserido com textContent / nós de texto, NUNCA com innerHTML. O único
 * innerHTML usado aqui é para os ícones, que são texto fixo escrito neste arquivo.
 */
(function () {
  "use strict";

  const WL = (window.WL = window.WL || {});

  /**
   * Cria um elemento:  h("li", { class: "row", onclick: fn }, "texto", outroNo)
   *  - "class"  -> className
   *  - "onXxx"  -> addEventListener("xxx")
   *  - "checked" -> propriedade (para checkbox)
   *  - demais   -> atributos (valores false/null são ignorados)
   * Os filhos de texto viram nós de texto (seguros contra XSS).
   */
  function h(tag, props, ...children) {
    const el = document.createElement(tag);
    for (const [key, value] of Object.entries(props || {})) {
      if (value === null || value === undefined || value === false) continue;
      if (key === "class") el.className = value;
      else if (key === "checked") el.checked = Boolean(value);
      else if (key.startsWith("on") && typeof value === "function") el.addEventListener(key.slice(2), value);
      else el.setAttribute(key, value === true ? "" : String(value));
    }
    for (const child of children.flat()) {
      if (child === null || child === undefined || child === false) continue;
      el.append(child); // strings viram texto, não HTML
    }
    return el;
  }

  // ------------------------------------------------------------------ ícones
  const SVG_NS = "http://www.w3.org/2000/svg";
  const ICONS = {
    trash:
      '<path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M10 11v6"/><path d="M14 11v6"/>',
    restore: '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>',
    plus: '<path d="M5 12h14"/><path d="M12 5v14"/>',
    logout:
      '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/>',
  };

  function icon(name) {
    const svg = document.createElementNS(SVG_NS, "svg");
    svg.setAttribute("class", "icon");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("fill", "none");
    svg.setAttribute("stroke", "currentColor");
    svg.setAttribute("stroke-width", "2");
    svg.setAttribute("stroke-linecap", "round");
    svg.setAttribute("stroke-linejoin", "round");
    svg.setAttribute("aria-hidden", "true");
    svg.innerHTML = ICONS[name] || ""; // conteúdo fixo definido acima (seguro)
    return svg;
  }

  /** Troca os <span data-icon="nome"> do HTML pelos ícones SVG. */
  function hydrateIcons(root = document) {
    root.querySelectorAll("[data-icon]").forEach((placeholder) => {
      placeholder.replaceWith(icon(placeholder.dataset.icon));
    });
  }

  // ------------------------------------------------------------------ avisos (toasts)
  function toast(message, type = "info") {
    let region = document.getElementById("toasts");
    if (!region) {
      region = h("div", { id: "toasts", class: "toasts", role: "status", "aria-live": "polite" });
      document.body.append(region);
    }
    const el = h("div", { class: "toast" + (type === "error" ? " toast-error" : "") }, message);
    region.append(el);
    setTimeout(() => el.remove(), 3600);
  }

  // ------------------------------------------------------------------ confirmação
  /**
   * Abre um diálogo de confirmação (elemento <dialog> nativo).
   * Retorna uma Promise<boolean>: true se o usuário confirmou.
   * Esc, clique fora ou "Cancelar" resultam em false.
   */
  function confirmDialog({ title, message, confirmLabel = "Confirmar", danger = false }) {
    return new Promise((resolve) => {
      const dialog = h(
        "dialog",
        { class: "dialog", "aria-labelledby": "dialog-title" },
        h(
          "form",
          { method: "dialog" },
          h("h2", { id: "dialog-title" }, title),
          h("p", {}, message),
          h(
            "div",
            { class: "dialog-actions" },
            h("button", { class: "btn btn-quiet", type: "submit", value: "cancel" }, "Cancelar"),
            h("button", { class: "btn " + (danger ? "btn-danger" : "btn-primary"), type: "submit", value: "confirm" }, confirmLabel)
          )
        )
      );

      dialog.addEventListener("close", () => {
        const confirmed = dialog.returnValue === "confirm";
        dialog.remove();
        resolve(confirmed);
      });
      // Clique no fundo escurecido (fora do quadro) cancela.
      dialog.addEventListener("click", (event) => {
        if (event.target === dialog) dialog.close("cancel");
      });

      document.body.append(dialog);
      dialog.showModal();
    });
  }

  // ------------------------------------------------------------------ datas
  const dateFormat = new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "short" });
  function formatDate(iso) {
    return dateFormat.format(new Date(iso));
  }

  // ------------------------------------------------------------------ barra superior
  /** Preenche o e-mail, liga o botão "Sair" e mostra os ícones. */
  function initHeader() {
    const emailEl = document.getElementById("user-email");
    if (emailEl) emailEl.textContent = WL.auth.email || "";

    const logoutBtn = document.getElementById("logout-btn");
    if (logoutBtn) logoutBtn.addEventListener("click", () => WL.auth.logout());
  }

  /** Atualiza a bolinha com a quantidade de itens na aba "Lixeira" (some quando é 0). */
  function setTrashCount(count) {
    const badge = document.getElementById("trash-count");
    if (!badge) return;
    badge.textContent = String(count);
    badge.hidden = count <= 0;
    badge.setAttribute("aria-label", count + (count === 1 ? " item" : " itens") + " na lixeira");
  }

  // Ícones dos elementos estáticos do HTML
  hydrateIcons();

  WL.ui = { h, icon, hydrateIcons, toast, confirmDialog, formatDate, initHeader, setTrashCount };
})();
