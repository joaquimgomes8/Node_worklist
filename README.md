# Work Lista

Lista de tarefas com **login/cadastro**, **lixeira** e API protegida por **JWT**.

- **Front-end:** HTML + CSS + JavaScript puro (sem frameworks, sem etapa de build)
- **Back-end:** Java 17 + Spring Boot 3 (Web, Data JPA, Security, Validation)
- **Banco de dados:** H2 em arquivo (padrão, zero configuração) ou PostgreSQL
- **Segurança:** senhas com **bcrypt**, rotas da API protegidas por **JWT**

## O que o sistema faz

| Tela | Recursos |
|------|----------|
| **Login / Cadastro** (`login.html`) | Entrar ou criar conta com e-mail e senha. Validação no navegador e no servidor. |
| **Tarefas** (`tasks.html`) | Criar tarefa (título + descrição), marcar como concluída no checkbox, filtrar (todas / pendentes / concluídas) e mandar para a lixeira. |
| **Lixeira** (`trash.html`) | Restaurar uma tarefa, excluí-la definitivamente (com confirmação) ou esvaziar a lixeira inteira. |

Cada usuário só enxerga as **próprias** tarefas. O tema claro/escuro segue a configuração do sistema, e o layout se adapta a celular e desktop.

---

## Como rodar

### Requisitos

- **JDK 17 ou superior** (`java -version`)
- **Maven 3.9+** (`mvn -version`)

### Passo a passo

```bash
cd work-lista
mvn spring-boot:run
```

Abra **http://localhost:8080** e crie a sua conta.

Na primeira execução o Maven baixa as dependências, então pode demorar um pouco. O front-end é servido pelo próprio Spring Boot, portanto **não há nada mais para instalar ou iniciar**.

Os dados ficam na pasta `data/` (banco H2 em arquivo) e permanecem entre as execuções. Para começar do zero, pare a aplicação e apague essa pasta.

### Gerar um `.jar` executável

```bash
mvn clean package
java -jar target/work-lista-1.0.0.jar
```

---

## Configuração

Tudo tem um valor padrão em `src/main/resources/application.properties` e pode ser sobrescrito por **variáveis de ambiente**, sem editar arquivos:

| Variável | Padrão | Para que serve |
|----------|--------|----------------|
| `JWT_SECRET` | *(chave de exemplo)* | Segredo que assina os tokens. **Mínimo de 32 caracteres. Troque antes de publicar.** |
| `JWT_EXPIRATION_MINUTES` | `120` | Validade do token, em minutos. |
| `PORT` | `8080` | Porta do servidor. |
| `DB_URL` / `DB_USER` / `DB_PASSWORD` | H2 em `./data` | Conexão com o banco. |
| `CORS_ORIGINS` | `http://localhost:5500,http://127.0.0.1:5500` | Origens permitidas quando o front roda em outro endereço. |

Gerar um segredo forte e usá-lo:

```bash
# Linux / macOS
export JWT_SECRET="$(openssl rand -base64 48)"
mvn spring-boot:run
```

```powershell
# Windows (PowerShell)
$env:JWT_SECRET = "cole-aqui-uma-chave-longa-e-aleatoria-com-mais-de-32-caracteres"
mvn spring-boot:run
```

Se você não definir `JWT_SECRET`, a aplicação inicia com a chave de exemplo e avisa no log. Isso serve só para desenvolvimento.

### Usando PostgreSQL

1. Suba um PostgreSQL local (o `docker-compose.yml` já está pronto):
   ```bash
   docker compose up -d
   ```
2. Rode a aplicação com o perfil `postgres`:
   ```bash
   mvn spring-boot:run -Dspring-boot.run.profiles=postgres
   ```

As tabelas (`users` e `tasks`) são criadas automaticamente. Para outro servidor PostgreSQL, defina `DB_URL`, `DB_USER` e `DB_PASSWORD`.

---

## Estrutura do projeto

```
work-lista/
├── pom.xml                       # dependências e build (Maven)
├── docker-compose.yml            # PostgreSQL opcional para desenvolvimento
├── README.md
└── src/main/
    ├── java/com/worklista/
    │   ├── WorkListaApplication.java
    │   ├── config/SecurityConfig.java      # rotas públicas/protegidas, CORS, CSP, bcrypt
    │   ├── security/
    │   │   ├── JwtService.java             # gera e valida o JWT
    │   │   ├── JwtAuthFilter.java          # lê "Authorization: Bearer ..." em cada requisição
    │   │   └── AuthUser.java               # usuário autenticado (id + e-mail)
    │   ├── controller/                     # camada HTTP (rotas)
    │   │   ├── AuthController.java
    │   │   └── TaskController.java
    │   ├── service/                        # regras de negócio
    │   │   ├── AuthService.java
    │   │   └── TaskService.java
    │   ├── repository/                     # acesso ao banco (Spring Data JPA)
    │   ├── model/                          # entidades: User e Task
    │   ├── dto/                            # formatos de entrada e saída da API
    │   └── exception/GlobalExceptionHandler.java   # erros em JSON {"message": "..."}
    └── resources/
        ├── application.properties
        ├── application-postgres.properties
        └── static/                         # FRONT-END
            ├── index.html                  # decide entre login e tarefas
            ├── login.html   tasks.html   trash.html
            ├── favicon.svg
            ├── css/styles.css              # tokens, tema claro/escuro, responsivo
            └── js/
                ├── config.js               # endereço da API
                ├── api.js                  # fetch + token + guarda de login
                ├── ui.js                   # helpers: toast, confirmação, ícones, DOM seguro
                ├── auth.js                 # lógica do login/cadastro
                ├── tasks.js                # lógica da página de tarefas
                └── trash.js                # lógica da lixeira
```

---

## API REST

Todas as rotas abaixo de `/api` (exceto login e cadastro) exigem o cabeçalho
`Authorization: Bearer <token>`. Erros voltam sempre como `{"message": "texto para o usuário"}`.

| Método | Rota | O que faz | Sucesso |
|--------|------|-----------|---------|
| `POST` | `/api/auth/register` | Cria a conta e já devolve o token | `201` `{token, email}` |
| `POST` | `/api/auth/login` | Entra com e-mail e senha | `200` `{token, email}` |
| `GET` | `/api/tasks` | Lista as tarefas ativas | `200` `[Task]` |
| `POST` | `/api/tasks` | Cria tarefa `{title, description?}` | `201` `Task` |
| `PATCH` | `/api/tasks/{id}/completed` | Marca/desmarca `{completed: true\|false}` | `200` `Task` |
| `PATCH` | `/api/tasks/{id}/trash` | Move para a lixeira | `200` `Task` |
| `GET` | `/api/trash` | Lista a lixeira | `200` `[Task]` |
| `PATCH` | `/api/trash/{id}/restore` | Restaura para as tarefas | `200` `Task` |
| `DELETE` | `/api/trash/{id}` | Exclui definitivamente | `204` |
| `DELETE` | `/api/trash` | Esvazia a lixeira | `204` |

Formato de `Task`:

```json
{
  "id": 7,
  "title": "Enviar proposta",
  "description": "Cliente ACME, versão 2",
  "completed": false,
  "createdAt": "2026-09-21T14:03:11.482Z",
  "trashedAt": null
}
```

Códigos de erro: `400` dados inválidos, `401` sem token, token inválido ou credenciais erradas, `404` tarefa inexistente (ou de outro usuário), `409` e-mail já cadastrado.

### Testando com `curl`

```bash
# 1) criar conta (guarde o token da resposta)
curl -s -X POST localhost:8080/api/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"email":"ana@empresa.com","password":"senha-forte-123"}'

# 2) usar o token
TOKEN="cole-o-token-aqui"

curl -s -X POST localhost:8080/api/tasks \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"title":"Enviar proposta","description":"Cliente ACME"}'

curl -s localhost:8080/api/tasks -H "Authorization: Bearer $TOKEN"

# sem token -> 401
curl -i localhost:8080/api/tasks
```

---

## Como a segurança funciona

**Senhas (bcrypt).** A senha nunca é guardada: o banco só recebe o hash bcrypt (custo 12, com *salt* aleatório embutido). O bcrypt só lê os primeiros 72 bytes, então a API recusa senhas maiores em vez de truncá-las em silêncio.

**Login e JWT.**
1. `POST /api/auth/login` confere a senha com bcrypt e devolve um JWT assinado (HMAC-SHA256) com o id do usuário e a data de expiração.
2. O front-end guarda o token e o envia em `Authorization: Bearer ...`.
3. O `JwtAuthFilter` valida assinatura e validade a cada requisição. Sem token válido, as rotas `/api/**` respondem `401` e o front-end volta para o login.

**Isolamento entre usuários.** O id do usuário vem do **token**, nunca do corpo ou da URL, e toda consulta filtra por dono. Pedir a tarefa de outra pessoa resulta em `404`, como se ela não existisse.

**Outras proteções.**
- Login com mensagem única ("E-mail ou senha inválidos"), sem revelar quais e-mails existem.
- Validação de entrada com Bean Validation (tamanhos, e-mail, campos obrigatórios).
- `Content-Security-Policy` restrita (scripts só do próprio site) e, no front-end, todo texto do usuário entra na página como **texto** (nunca `innerHTML`), o que evita XSS.
- Sem sessão no servidor (*stateless*). CSRF está desativado porque a autenticação usa cabeçalho `Authorization`, que o navegador não envia sozinho.

### Limitações conhecidas (leia antes de publicar)

- O token fica no `localStorage`. É simples e funciona bem com a CSP e o tratamento de XSS acima, mas um XSS que escape dessas proteções poderia lê-lo. A alternativa mais robusta é um cookie `HttpOnly` + proteção CSRF.
- Não há *refresh token*: quando o token expira (2 h por padrão), o usuário entra de novo.
- Não há limite de tentativas de login (*rate limiting*). Em produção, coloque um limitador no proxy ou adicione um filtro.
- Use **HTTPS** em produção; sem ele, o token trafega em texto aberto.
- `ddl-auto=update` é conveniente para desenvolvimento. Em produção, prefira migrations (Flyway/Liquibase).

---

## Servindo o front-end separado (opcional)

Por padrão o Spring Boot serve as páginas de `src/main/resources/static`. Se preferir hospedar o front em outro lugar (Nginx, Live Server etc.):

1. Copie a pasta `static/` para o outro servidor. Exemplo com um servidor local na porta 5500:
   ```bash
   npx serve -l 5500 src/main/resources/static
   ```
2. Em `js/config.js`, aponte para a API:
   ```js
   window.WORKLISTA_API_BASE = "http://localhost:8080";
   ```
3. No backend, permita a origem do front (a `5500` já vem liberada por padrão):
   ```bash
   export CORS_ORIGINS="http://localhost:5500"
   ```

---

## Problemas comuns

| Sintoma | Causa e solução |
|---------|-----------------|
| `Port 8080 was already in use` | Outra aplicação usa a porta. Rode com `PORT=9090 mvn spring-boot:run`. |
| `app.jwt.secret precisa ter no mínimo 32 caracteres` | O `JWT_SECRET` definido é curto demais. Use um valor com 32+ caracteres. |
| `release version 17 not supported` | O Maven está usando um JDK antigo. Instale o JDK 17+ e confira `mvn -version`. |
| Erro de CORS no console do navegador | Só ocorre com o front em outro endereço. Veja a seção anterior. |
| "Não foi possível conectar ao servidor" na tela | O backend não está rodando, ou `WORKLISTA_API_BASE` aponta para o lugar errado. |
| Caiu no login sozinho | O token expirou (ou o `JWT_SECRET` mudou). Entre novamente. |
| Fontes diferentes do esperado | As fontes vêm do Google Fonts. Sem internet, a página usa as fontes do sistema. |

---

## Ideias para evoluir

- Editar título e descrição de uma tarefa
- Datas de vencimento, prioridades e etiquetas
- Apagar automaticamente itens com mais de 30 dias na lixeira
- Testes automatizados (JUnit + `MockMvc`) e migrations com Flyway
- Recuperação de senha por e-mail
