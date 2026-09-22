// Página inicial: encaminha para as tarefas (se já estiver logado) ou para o login.
location.replace(WL.auth.isLoggedIn() ? "tasks.html" : "login.html");
