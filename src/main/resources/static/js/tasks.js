/**
 * Página de tarefas (tasks.html):
 * listar, criar, concluir (checkbox) e mover para a lixeira.
 */
(function () {
  "use strict";

  if (!WL.auth.requireLogin()) return;
  WL.ui.initHeader();

  const { h, icon, toast, formatDate } = WL.ui;

  // Elementos da página
  const listEl = document.getElementById("task-list");
  const summaryEl = document.getElementById("summary");
  const statusEl = document.getElementById("status");
  const statusTitle = document.getElementById("status-title");
  const statusText = document.getElementById("status-text");
  const form = document.getElementById("task-form");
  const titleInput = document.getElementById("task-title");
  const descInput = document.getElementById("task-desc");
  const submitBtn = document.getElementById("task-submit");
  const filterButtons = document.querySelectorAll(".chip");

  // Estado da tela. A fonte da verdade é o servidor; aqui só guardamos uma cópia.
  const state = {
    tasks: [],
    filter: "all", // all | pending | done
    trashCount: 0,
    loading: true,
  };

  const FILTERS = {
    all: () => true,
    pending: (task) => !task.completed,
    done: (task) => task.completed,
  };

  const EMPTY_COPY = {
    all: { title: "Sua lista está vazia", text: "Escreva a primeira tarefa no campo acima." },
    pending: { title: "Nada pendente", text: "Todas as tarefas já foram concluídas." },
    done: { title: "Nenhuma tarefa concluída", text: "Marque uma tarefa como concluída para vê-la aqui." },
  };

  // ------------------------------------------------------------------ renderização

  function renderRow(task) {
    const checkId = "task-" + task.id;

    return h(
      "li",
      { class: "row" + (task.completed ? " is-done" : "") },
      h("input", {
        class: "check",
        type: "checkbox",
        id: checkId,
        checked: task.completed,
        onchange: (event) => toggleCompleted(task, event.target.checked),
      }),
      h(
        "div",
        { class: "row-body" },
        // O <label> faz o clique no título marcar/desmarcar a tarefa.
        h("label", { class: "row-title", for: checkId }, task.title),
        task.description ? h("p", { class: "row-desc" }, task.description) : null,
        h("span", { class: "row-meta" }, "Criada em " + formatDate(task.createdAt))
      ),
      h(
        "button",
        {
          class: "icon-btn",
          type: "button",
          title: "Mover para a lixeira",
          "aria-label": "Mover para a lixeira: " + task.title,
          onclick: () => moveToTrash(task),
        },
        icon("trash")
      )
    );
  }

  function showStatus(title, text) {
    statusTitle.textContent = title;
    statusText.textContent = text;
    statusEl.hidden = false;
  }

  function render() {
    // Redesenhar a lista perde o foco do teclado; guardamos e devolvemos.
    const focusedId = document.activeElement && document.activeElement.id;

    const total = state.tasks.length;
    const pending = state.tasks.filter(FILTERS.pending).length;
    const done = total - pending;

    summaryEl.textContent =
      state.loading || total === 0
        ? ""
        : pending + (pending === 1 ? " pendente, " : " pendentes, ") + done + (done === 1 ? " concluída" : " concluídas");

    const visible = state.tasks.filter(FILTERS[state.filter]);
    listEl.replaceChildren(...visible.map(renderRow));

    if (state.loading) {
      showStatus("Carregando tarefas...", "");
    } else if (visible.length === 0) {
      const copy = total === 0 ? EMPTY_COPY.all : EMPTY_COPY[state.filter];
      showStatus(copy.title, copy.text);
    } else {
      statusEl.hidden = true;
    }

    filterButtons.forEach((button) =>
      button.setAttribute("aria-pressed", String(button.dataset.filter === state.filter))
    );
    WL.ui.setTrashCount(state.trashCount);

    if (focusedId) {
      const el = document.getElementById(focusedId);
      if (el && el !== document.activeElement) el.focus();
    }
  }

  // ------------------------------------------------------------------ ações

  async function load() {
    try {
      // Tarefas e itens da lixeira (para a bolinha da aba) em paralelo.
      const [tasks, trash] = await Promise.all([WL.api.get("/api/tasks"), WL.api.get("/api/trash")]);
      state.tasks = tasks;
      state.trashCount = trash.length;
    } catch (err) {
      toast(err.message, "error");
    } finally {
      state.loading = false;
      render();
    }
  }

  /** Marca/desmarca. Atualiza a tela na hora e desfaz se o servidor recusar. */
  async function toggleCompleted(task, completed) {
    const previous = task.completed;
    task.completed = completed;
    render();

    try {
      const updated = await WL.api.patch("/api/tasks/" + task.id + "/completed", { completed });
      Object.assign(task, updated);
    } catch (err) {
      task.completed = previous;
      toast(err.message, "error");
    }
    render();
  }

  async function moveToTrash(task) {
    try {
      await WL.api.patch("/api/tasks/" + task.id + "/trash");
      state.tasks = state.tasks.filter((t) => t.id !== task.id);
      state.trashCount += 1;
      render();
      toast("Tarefa movida para a lixeira.");
    } catch (err) {
      toast(err.message, "error");
    }
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const title = titleInput.value.trim();
    if (!title) {
      toast("Escreva um título para a tarefa.", "error");
      titleInput.focus();
      return;
    }

    submitBtn.disabled = true;
    try {
      const created = await WL.api.post("/api/tasks", { title, description: descInput.value.trim() });
      state.tasks.unshift(created);
      // Uma tarefa nova é pendente: no filtro "Concluídas" ela ficaria invisível.
      if (state.filter === "done") state.filter = "all";
      form.reset();
      titleInput.focus();
      render();
    } catch (err) {
      toast(err.message, "error");
    } finally {
      submitBtn.disabled = false;
    }
  });

  filterButtons.forEach((button) =>
    button.addEventListener("click", () => {
      state.filter = button.dataset.filter;
      render();
    })
  );

  render(); // mostra "Carregando..." enquanto a API responde
  load();
})();
