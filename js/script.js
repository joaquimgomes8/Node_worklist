(() => {
	'use strict';

	const SESSION_KEY = 'work-lista-session';
	const USERS_KEY = 'work-lista-users';
	const TASKS_PREFIX = 'work-lista-tasks:';
	let selectedCategory = 'Geral';

	const readJson = (key, fallback) => {
		try {
			const value = JSON.parse(localStorage.getItem(key));
			return value ?? fallback;
		} catch {
			return fallback;
		}
	};
	const writeJson = (key, value) => localStorage.setItem(key, JSON.stringify(value));
	const currentUser = () => localStorage.getItem(SESSION_KEY);
	const tasksKey = () => `${TASKS_PREFIX}${currentUser()}`;
	const redirectToLogin = () => { window.location.href = 'login.html'; };

	function initAuth() {
		const form = document.querySelector('#auth-form');
		if (!form) return;
		let mode = 'login';
		const title = document.querySelector('#auth-title');
		const subtitle = document.querySelector('#auth-sub');
		const submit = document.querySelector('#auth-submit');
		const confirmField = document.querySelector('#confirm-field');
		const passwordHint = document.querySelector('#password-hint');
		const error = document.querySelector('#auth-error');
		const showError = (message) => { error.textContent = message; error.hidden = !message; };
		const updateMode = (nextMode) => {
			mode = nextMode;
			const registering = mode === 'register';
			title.textContent = registering ? 'Criar conta' : 'Entrar';
			subtitle.textContent = registering ? 'Comece a organizar o seu trabalho.' : 'Acesse a sua lista de tarefas.';
			submit.textContent = registering ? 'Criar conta' : 'Entrar';
			confirmField.hidden = !registering;
			passwordHint.hidden = !registering;
			document.querySelectorAll('[data-mode]').forEach((tab) => tab.setAttribute('aria-pressed', String(tab.dataset.mode === mode)));
			showError('');
		};
		document.querySelectorAll('[data-mode]').forEach((tab) => tab.addEventListener('click', () => updateMode(tab.dataset.mode)));
		document.querySelector('#toggle-pass')?.addEventListener('click', (event) => {
			const password = document.querySelector('#password');
			const visible = password.type === 'text';
			password.type = visible ? 'password' : 'text';
			event.currentTarget.textContent = visible ? 'Mostrar' : 'Ocultar';
		});
		form.addEventListener('submit', (event) => {
			event.preventDefault();
			const data = new FormData(form);
			const email = String(data.get('email') || '').trim().toLowerCase();
			const password = String(data.get('password') || '');
			const confirm = String(data.get('confirm') || '');
			const users = readJson(USERS_KEY, {});
			if (!email || !email.includes('@')) return showError('Informe um e-mail válido.');
			if (mode === 'register') {
				if (password.length < 8) return showError('A senha precisa ter pelo menos 8 caracteres.');
				if (password !== confirm) return showError('As senhas não conferem.');
				if (users[email]) return showError('Já existe uma conta com este e-mail.');
				users[email] = password;
				writeJson(USERS_KEY, users);
			} else if (users[email] !== password) return showError('E-mail ou senha incorretos.');
			localStorage.setItem(SESSION_KEY, email);
			window.location.href = 'tasks.html';
		});
	}

	function initAppShell() {
		if (!document.querySelector('.topbar')) return false;
		if (!currentUser()) { redirectToLogin(); return true; }
		const userEmail = document.querySelector('#user-email');
		if (userEmail) userEmail.textContent = currentUser();
		document.querySelector('#logout-btn')?.addEventListener('click', () => { localStorage.removeItem(SESSION_KEY); redirectToLogin(); });
		return true;
	}

	const getTasks = () => readJson(tasksKey(), []);
	const saveTasks = (tasks) => writeJson(tasksKey(), tasks);

	function renderTaskRow(task, trash = false) {
		const row = document.createElement('li');
		row.className = `row${trash ? ' row-trash' : ''}${task.done ? ' is-done' : ''}`;
		if (trash) {
			row.innerHTML = '<div class="row-body"><span class="row-title"></span><span class="row-meta"></span></div><div class="row-actions"><button class="btn btn-quiet btn-sm" data-action="restore" type="button">Restaurar</button><button class="btn btn-danger-quiet btn-sm" data-action="delete" type="button">Excluir</button></div>';
		} else {
			row.innerHTML = '<input class="check" type="checkbox" aria-label="Concluir tarefa"><div class="row-body"><label class="row-title"></label><span class="row-desc"></span><span class="row-meta"></span></div><div class="row-actions"><button class="btn btn-danger-quiet btn-sm" data-action="trash" type="button">Excluir</button></div>';
			row.querySelector('.check').checked = task.done;
			row.querySelector('.check').addEventListener('change', (event) => {
				const tasks = getTasks();
				const item = tasks.find((entry) => entry.id === task.id);
				if (item) item.done = event.target.checked;
				saveTasks(tasks);
				renderTasks();
			});
		}
		row.querySelector('.row-title').textContent = task.title;
		row.querySelector('.row-desc')?.append(task.description || '');
		row.querySelector('.row-meta').textContent = trash ? 'Enviada para a lixeira' : (task.done ? 'Concluída' : 'Pendente');
		row.querySelector('[data-action="trash"]')?.addEventListener('click', () => moveToTrash(task.id));
		row.querySelector('[data-action="restore"]')?.addEventListener('click', () => restoreTask(task.id));
		row.querySelector('[data-action="delete"]')?.addEventListener('click', () => deleteTask(task.id));
		return row;
	}

	function renderEmpty(title, text, link = false) {
		const status = document.querySelector('#status');
		if (!status) return;
		status.hidden = false;
		document.querySelector('#status-title').textContent = title;
		document.querySelector('#status-text').textContent = text;
		const linkElement = document.querySelector('#status-link');
		if (linkElement) linkElement.hidden = !link;
	}

	function updateTrashCount() {
		const countElement = document.querySelector('#trash-count');
		if (!countElement) return;
		const count = getTasks().filter((task) => task.deleted).length;
		countElement.textContent = count;
		countElement.hidden = count === 0;
	}

	function renderTasks() {
		const list = document.querySelector('#task-list');
		if (!list) return;
		const filter = document.querySelector('[data-filter][aria-pressed="true"]')?.dataset.filter || 'all';
		const tasks = getTasks();
		const active = tasks.filter((task) => !task.deleted && (selectedCategory === 'Geral' || (task.category || 'Pessoal') === selectedCategory) && (filter === 'all' || (filter === 'done' ? task.done : !task.done)));
		list.replaceChildren(...active.map((task) => renderTaskRow(task)));
		const status = document.querySelector('#status');
		if (active.length === 0) {
			renderEmpty(filter === 'all' ? 'Nenhuma tarefa por aqui' : 'Nenhum resultado', filter === 'all' ? 'Adicione sua primeira tarefa para começar.' : 'Não há tarefas neste filtro.');
		} else if (status) {
			status.hidden = true;
		}
		const categoryTasks = tasks.filter((task) => !task.deleted && (selectedCategory === 'Geral' || (task.category || 'Pessoal') === selectedCategory));
		const done = categoryTasks.filter((task) => task.done).length;
		const pending = categoryTasks.filter((task) => !task.done).length;
		document.querySelector('#summary').textContent = `${selectedCategory} · ${pending} pendente${pending === 1 ? '' : 's'} · ${done} concluída${done === 1 ? '' : 's'}`;
		updateTrashCount();
	}

	function moveToTrash(id) {
		const tasks = getTasks();
		const task = tasks.find((entry) => entry.id === id);
		if (task) task.deleted = true;
		saveTasks(tasks);
		renderTasks();
	}
	function restoreTask(id) {
		const tasks = getTasks();
		const task = tasks.find((entry) => entry.id === id);
		if (task) task.deleted = false;
		saveTasks(tasks);
		renderTrash();
	}
	function deleteTask(id) { saveTasks(getTasks().filter((task) => task.id !== id)); renderTrash(); }

	function renderTrash() {
		const list = document.querySelector('#trash-list');
		if (!list) return;
		const deleted = getTasks().filter((task) => task.deleted);
		list.replaceChildren(...deleted.map((task) => renderTaskRow(task, true)));
		document.querySelector('#empty-btn').hidden = deleted.length === 0;
		const status = document.querySelector('#status');
		if (deleted.length === 0) renderEmpty('A lixeira está vazia', 'As tarefas excluídas aparecerão aqui.', true);
		else if (status) status.hidden = true;
		updateTrashCount();
	}

	function initTasks() {
		const form = document.querySelector('#task-form');
		if (!form) return;
		const modal = document.querySelector('#task-modal');
		const openModal = () => {
			modal.hidden = false;
			document.querySelector('#task-category-label').textContent = `Categoria: ${selectedCategory}`;
			form.elements.title.focus();
		};
		const closeModal = () => { modal.hidden = true; form.reset(); };
		document.querySelector('#open-task-modal').addEventListener('click', openModal);
		document.querySelector('#close-task-modal').addEventListener('click', closeModal);
		document.querySelector('#cancel-task-modal').addEventListener('click', closeModal);
		modal.addEventListener('click', (event) => { if (event.target === modal) closeModal(); });
		document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && !modal.hidden) closeModal(); });
		form.addEventListener('submit', (event) => {
			event.preventDefault();
			const title = form.elements.title.value.trim();
			if (!title) return form.elements.title.focus();
			const tasks = getTasks();
			tasks.unshift({ id: crypto.randomUUID(), category: selectedCategory, title, description: form.elements.description.value.trim(), done: false, deleted: false });
			saveTasks(tasks);
			closeModal();
			renderTasks();
		});
		document.querySelectorAll('[data-filter]').forEach((button) => button.addEventListener('click', () => {
			document.querySelectorAll('[data-filter]').forEach((item) => item.setAttribute('aria-pressed', String(item === button)));
			renderTasks();
		}));
		document.querySelectorAll('[data-category]').forEach((button) => button.addEventListener('click', () => {
			selectedCategory = button.dataset.category;
			document.querySelectorAll('[data-category]').forEach((item) => item.setAttribute('aria-pressed', String(item === button)));
			document.querySelector('#task-category-label').textContent = `Categoria: ${selectedCategory}`;
			renderTasks();
		}));
		renderTasks();
	}

	function initTrash() {
		if (!document.querySelector('#trash-list')) return;
		document.querySelector('#empty-btn').addEventListener('click', () => { saveTasks(getTasks().filter((task) => !task.deleted)); renderTrash(); });
		renderTrash();
	}

	document.addEventListener('DOMContentLoaded', () => {
		initAuth();
		if (initAppShell()) { initTasks(); initTrash(); }
	});
})();
