(() => {
	'use strict';

	const SESSION_KEY = 'work-lista-session';
	const USERS_KEY = 'work-lista-users';
	const TASKS_PREFIX = 'work-lista-tasks:';
	const CATEGORIES_PREFIX = 'work-lista-categories:';
	const DEFAULT_CATEGORIES = ['Geral', 'Pessoal', 'Trabalho', 'Estudos'];
	let selectedCategory = 'Geral';
	let openTaskEditor = () => {};

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
	const categoriesKey = () => `${CATEGORIES_PREFIX}${currentUser()}`;
	const getCategories = () => {
		const stored = readJson(categoriesKey(), DEFAULT_CATEGORIES);
		const custom = Array.isArray(stored) ? stored : [];
		return [...new Set([...DEFAULT_CATEGORIES, ...custom.filter((category) => typeof category === 'string' && category.trim())])];
	};
	const saveCategories = (categories) => writeJson(categoriesKey(), categories);
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
			row.innerHTML = '<input class="check" type="checkbox" aria-label="Concluir tarefa"><div class="row-body"><label class="row-title"></label><span class="row-desc"></span><span class="row-meta"></span></div><div class="row-actions"><button class="icon-btn task-edit" data-action="edit" type="button" aria-label="Editar tarefa" title="Editar tarefa">⚙</button><button class="btn btn-danger-quiet btn-sm" data-action="trash" type="button">Excluir</button></div>';
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
		const extra = document.createElement('div');
		extra.className = 'task-extra';
		if (task.priority) {
			const priority = document.createElement('span');
			priority.className = `priority-${task.priority}`;
			priority.textContent = `Prioridade: ${task.priority === 'media' ? 'média' : task.priority}`;
			extra.append(priority);
		}
		if (task.dueDate) {
			const dueDate = document.createElement('span');
			dueDate.textContent = `Prazo: ${new Date(`${task.dueDate}T00:00:00`).toLocaleDateString('pt-BR')}`;
			extra.append(dueDate);
		}
		if (task.link) {
			const link = document.createElement('a');
			link.href = task.link;
			link.target = '_blank';
			link.rel = 'noopener noreferrer';
			link.textContent = 'Abrir link';
			extra.append(link);
		}
		row.querySelector('.row-body').append(extra);
		if (task.image) {
			const image = document.createElement('img');
			image.className = 'row-attachment';
			image.src = task.image;
			image.alt = `Imagem anexada à tarefa ${task.title}`;
			row.querySelector('.row-body').append(image);
		}
		if (task.subtasks?.length && !trash) {
			const subtasks = document.createElement('ul');
			subtasks.className = 'row-subtasks';
			task.subtasks.forEach((subtask, index) => {
				const item = document.createElement('li');
				const label = document.createElement('label');
				const checkbox = document.createElement('input');
				checkbox.type = 'checkbox';
				checkbox.checked = subtask.done;
				checkbox.addEventListener('change', () => {
					const tasks = getTasks();
					const current = tasks.find((entry) => entry.id === task.id);
					if (current?.subtasks?.[index]) current.subtasks[index].done = checkbox.checked;
					saveTasks(tasks);
					renderTasks();
				});
				label.append(checkbox, document.createTextNode(subtask.title));
				item.append(label);
				subtasks.append(item);
			});
			row.querySelector('.row-body').append(subtasks);
		}
		row.querySelector('[data-action="trash"]')?.addEventListener('click', () => moveToTrash(task.id));
		row.querySelector('[data-action="edit"]')?.addEventListener('click', () => openTaskEditor(task));
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
		const categoryToolbar = document.querySelector('#category-toolbar');
		const categoryModal = document.querySelector('#category-modal');
		const categoryForm = document.querySelector('#category-form');
		const categoryError = document.querySelector('#category-error');
		const renderCategoryControls = () => {
			categoryToolbar.querySelectorAll('.custom-category').forEach((button) => button.remove());
			const addButton = document.querySelector('#add-category');
			getCategories().slice(DEFAULT_CATEGORIES.length).forEach((category) => {
				const button = document.createElement('div');
				button.className = 'chip custom-category';
				button.setAttribute('role', 'button');
				button.tabIndex = 0;
				button.dataset.category = category;
				button.setAttribute('aria-pressed', String(category === selectedCategory));
				const label = document.createElement('span');
				label.textContent = category;
				const remove = document.createElement('button');
				remove.className = 'category-delete';
				remove.type = 'button';
				remove.dataset.deleteCategory = category;
				remove.setAttribute('aria-label', `Excluir categoria ${category}`);
				remove.title = `Excluir categoria ${category}`;
				remove.textContent = '×';
				button.append(label, remove);
				categoryToolbar.insertBefore(button, addButton);
			});
			const categorySelect = form.elements.category;
			const currentValue = categorySelect.value;
			categorySelect.replaceChildren(...getCategories().map((category) => {
				const option = document.createElement('option');
				option.value = category;
				option.textContent = category;
				return option;
			}));
			categorySelect.value = getCategories().includes(currentValue) ? currentValue : selectedCategory;
			categoryToolbar.querySelectorAll('[data-category]').forEach((item) => item.setAttribute('aria-pressed', String(item.dataset.category === selectedCategory)));
		};
		renderCategoryControls();
		const closeCategoryModal = () => { categoryModal.hidden = true; categoryForm.reset(); categoryError.hidden = true; };
		document.querySelector('#add-category').addEventListener('click', () => {
			categoryModal.hidden = false;
			document.querySelector('#category-name').focus();
		});
		document.querySelector('#close-category-modal').addEventListener('click', closeCategoryModal);
		document.querySelector('#cancel-category').addEventListener('click', closeCategoryModal);
		categoryModal.addEventListener('click', (event) => { if (event.target === categoryModal) closeCategoryModal(); });
		categoryForm.addEventListener('submit', (event) => {
			event.preventDefault();
			const name = categoryForm.elements.name.value.trim();
			const categories = getCategories();
			if (!name) return;
			if (categories.some((category) => category.toLowerCase() === name.toLowerCase())) {
				categoryError.textContent = 'Essa categoria já existe.';
				categoryError.hidden = false;
				return;
			}
			categories.push(name);
			saveCategories(categories);
			selectedCategory = name;
			renderCategoryControls();
			categoryModal.hidden = true;
			categoryForm.reset();
			renderTasks();
		});
		categoryToolbar.addEventListener('click', (event) => {
			const deleteButton = event.target.closest('[data-delete-category]');
			if (deleteButton) {
				event.stopPropagation();
				const category = deleteButton.dataset.deleteCategory;
				if (!window.confirm(`Excluir a categoria "${category}"? As tarefas serão movidas para Geral.`)) return;
				saveTasks(getTasks().map((task) => task.category === category ? { ...task, category: 'Geral' } : task));
				saveCategories(getCategories().filter((item) => item !== category));
				if (selectedCategory === category) selectedCategory = 'Geral';
				renderCategoryControls();
				renderTasks();
				return;
			}
			const button = event.target.closest('[data-category]');
			if (!button) return;
			selectedCategory = button.dataset.category;
			categoryToolbar.querySelectorAll('[data-category]').forEach((item) => item.setAttribute('aria-pressed', String(item === button)));
			if (!editingTaskId && !modal.hidden) form.elements.category.value = selectedCategory;
			renderTasks();
		});
		categoryToolbar.addEventListener('keydown', (event) => {
			if (event.key !== 'Enter' && event.key !== ' ') return;
			const button = event.target.closest('[data-category]');
			if (!button || event.target.closest('[data-delete-category]')) return;
			event.preventDefault();
			button.click();
		});
		const modal = document.querySelector('#task-modal');
		let draftSubtasks = [];
		let draftImage = '';
		let editingTaskId = null;
		const renderDraftSubtasks = () => {
			const list = document.querySelector('#subtask-editor-list');
			list.replaceChildren(...draftSubtasks.map((subtask, index) => {
				const item = document.createElement('li');
				item.className = 'subtask-editor-item';
				const checkbox = document.createElement('input');
				checkbox.type = 'checkbox';
				checkbox.checked = subtask.done;
				checkbox.setAttribute('aria-label', `Concluir subtarefa ${subtask.title}`);
				checkbox.addEventListener('change', () => { subtask.done = checkbox.checked; });
				item.append(checkbox, document.createTextNode(subtask.title));
				const remove = document.createElement('button');
				remove.type = 'button';
				remove.textContent = 'Remover';
				remove.addEventListener('click', () => { draftSubtasks.splice(index, 1); renderDraftSubtasks(); });
				item.append(remove);
				return item;
			}));
		};
		const showImage = (data) => {
			draftImage = data;
			const preview = document.querySelector('#image-preview');
			preview.hidden = !data;
			preview.querySelector('img').src = data || '';
		};
		const readImage = (file) => {
			if (!file || !file.type.startsWith('image/')) return;
			const reader = new FileReader();
			reader.addEventListener('load', () => showImage(reader.result));
			reader.readAsDataURL(file);
		};
		const resetDraft = () => {
			draftSubtasks = [];
			showImage('');
			document.querySelector('#subtask-input').value = '';
			document.querySelector('#task-image').value = '';
			renderDraftSubtasks();
		};
		const openModal = (task = null) => {
			editingTaskId = task?.id || null;
			form.reset();
			if (task) {
				form.elements.title.value = task.title;
				form.elements.description.value = task.description || '';
				form.elements.category.value = task.category || 'Pessoal';
				form.elements.dueDate.value = task.dueDate || '';
				form.elements.priority.value = task.priority || 'media';
				form.elements.link.value = task.link || '';
				draftSubtasks = (task.subtasks || []).map((subtask) => ({ ...subtask }));
				draftImage = task.image || '';
				document.querySelector('#task-modal-title').textContent = 'Editar tarefa';
				document.querySelector('#task-submit').textContent = 'Salvar alterações';
			} else {
				draftSubtasks = [];
				draftImage = '';
				document.querySelector('#task-modal-title').textContent = 'Adicionar tarefa';
				document.querySelector('#task-submit').textContent = 'Cadastrar tarefa';
				form.elements.category.value = selectedCategory;
			}
			renderDraftSubtasks();
			showImage(draftImage);
			modal.hidden = false;
			form.elements.title.focus();
		};
		openTaskEditor = (task) => openModal(task);
		const closeModal = () => { modal.hidden = true; form.reset(); resetDraft(); editingTaskId = null; };
		document.querySelector('#open-task-modal').addEventListener('click', openModal);
		document.querySelector('#close-task-modal').addEventListener('click', closeModal);
		document.querySelector('#cancel-task-modal').addEventListener('click', closeModal);
		modal.addEventListener('click', (event) => { if (event.target === modal) closeModal(); });
		document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && !modal.hidden) closeModal(); });
		document.querySelector('#add-subtask').addEventListener('click', () => {
			const input = document.querySelector('#subtask-input');
			const title = input.value.trim();
			if (!title) return input.focus();
			draftSubtasks.push({ title, done: false });
			input.value = '';
			renderDraftSubtasks();
			input.focus();
		});
		document.querySelector('#subtask-input').addEventListener('keydown', (event) => {
			if (event.key === 'Enter') { event.preventDefault(); document.querySelector('#add-subtask').click(); }
		});
		document.querySelector('#task-image').addEventListener('change', (event) => readImage(event.target.files[0]));
		document.querySelector('#remove-image').addEventListener('click', () => showImage(''));
		modal.addEventListener('paste', (event) => {
			const image = [...(event.clipboardData?.items || [])].find((item) => item.type.startsWith('image/'));
			if (image) { event.preventDefault(); readImage(image.getAsFile()); }
		});
		form.addEventListener('submit', (event) => {
			event.preventDefault();
			const title = form.elements.title.value.trim();
			if (!title) return form.elements.title.focus();
			const tasks = getTasks();
			const taskData = { category: form.elements.category.value, title, description: form.elements.description.value.trim(), dueDate: form.elements.dueDate.value, priority: form.elements.priority.value, link: form.elements.link.value.trim(), subtasks: draftSubtasks.map((subtask) => ({ ...subtask })), image: draftImage };
			if (editingTaskId) {
				const task = tasks.find((entry) => entry.id === editingTaskId);
				if (task) Object.assign(task, taskData);
			} else {
				tasks.unshift({ id: crypto.randomUUID(), ...taskData, done: false, deleted: false });
			}
			saveTasks(tasks);
			closeModal();
			renderTasks();
		});
		document.querySelectorAll('[data-filter]').forEach((button) => button.addEventListener('click', () => {
			document.querySelectorAll('[data-filter]').forEach((item) => item.setAttribute('aria-pressed', String(item === button)));
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
