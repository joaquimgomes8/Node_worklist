/**
 * Página da lixeira (trash.html):
 * restaurar, excluir definitivamente e esvaziar.
 */
(function () {
  "use strict";

  if (!WL.auth.requireLogin()) return;
  WL.ui.initHeader();

  const { h, icon, toast, confirmDialog, formatDate } = WL.ui;

  const listEl = document.getElementById("trash-list");
  const statusEl = document.getElementById("status");
  const statusTitle = document.getElementById("status-title");
  const statusText = document.getElementById("status-text");
  const statusLink = document.getElementById("status-link");
  const emptyBtn = document.getElementById("empty-btn");

  const state = { tasks: [], loading: true };

  // ------------------------------------------------------------------ renderização

  function renderRow(task) {
    return h(
      "li",
      { class: "row row-trash" },
      h(
        "div",
        { class: "row-body" },
        h("p", { class: "row-title" }, task.title),
        task.description ? h("p", { class: "row-desc" }, task.description) : null,
        h("span", { class: "row-meta" }, "Na lixeira desde " + formatDate(task.trashedAt))
      ),
      h(
        "div",
        { class: "row-actions" },
        h(
          "button",
          {
            class: "btn btn-quiet btn-sm",
            type: "button",
            "aria-label": "Restaurar: " + task.title,
            onclick: () => restore(task),
          },
          icon("restore"),
          "Restaurar"
        ),
        h(
          "button",
          {
            class: "btn btn-danger-quiet btn-sm",
            type: "button",
            "aria-label": "Excluir definitivamente: " + task.title,
            onclick: () => deletePermanently(task),
          },
          icon("trash"),
          "Excluir"
        )
      )
    );
  }

  function render() {
    const count = state.tasks.length;

    listEl.replaceChildren(...state.tasks.map(renderRow));
    emptyBtn.hidden = state.loading || count === 0;
    WL.ui.setTrashCount(count);

    if (state.loading) {
      statusTitle.textContent = "Carregando lixeira...";
      statusText.textContent = "";
      statusLink.hidden = true;
      statusEl.hidden = false;
    } else if (count === 0) {
      statusTitle.textContent = "A lixeira está vazia";
      statusText.textContent = "As tarefas que você remover aparecem aqui e podem ser restauradas.";
      statusLink.hidden = false;
      statusEl.hidden = false;
    } else {
      statusEl.hidden = true;
    }
  }

  // ------------------------------------------------------------------ ações

  async function load() {
    try {
      state.tasks = await WL.api.get("/api/trash");
    } catch (err) {
      toast(err.message, "error");
    } finally {
      state.loading = false;
      render();
    }
  }

  async function restore(task) {
    try {
      await WL.api.patch("/api/trash/" + task.id + "/restore");
      state.tasks = state.tasks.filter((t) => t.id !== task.id);
      render();
      toast("Tarefa restaurada.");
    } catch (err) {
      toast(err.message, "error");
    }
  }

  async function deletePermanently(task) {
    const confirmed = await confirmDialog({
      title: "Excluir definitivamente?",
      message: "\u201C" + task.title + "\u201D será apagada e não poderá ser recuperada.",
      confirmLabel: "Excluir definitivamente",
      danger: true,
    });
    if (!confirmed) return;

    try {
      await WL.api.del("/api/trash/" + task.id);
      state.tasks = state.tasks.filter((t) => t.id !== task.id);
      render();
      toast("Tarefa excluída definitivamente.");
    } catch (err) {
      toast(err.message, "error");
    }
  }

  emptyBtn.addEventListener("click", async () => {
    const count = state.tasks.length;
    const confirmed = await confirmDialog({
      title: "Esvaziar a lixeira?",
      message:
        count === 1
          ? "A tarefa que está na lixeira será apagada e não poderá ser recuperada."
          : "As " + count + " tarefas da lixeira serão apagadas e não poderão ser recuperadas.",
      confirmLabel: "Esvaziar lixeira",
      danger: true,
    });
    if (!confirmed) return;

    try {
      await WL.api.del("/api/trash");
      state.tasks = [];
      render();
      toast("Lixeira esvaziada.");
    } catch (err) {
      toast(err.message, "error");
    }
  }); 

  render();
  load();
})();
