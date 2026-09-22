/**
 * Configuração do front-end.
 *
 * WORKLISTA_API_BASE = endereço onde a API Spring Boot está rodando.
 *
 *  - "" (vazio)  -> mesma origem. É o padrão: o próprio Spring Boot serve estas
 *                   páginas, então as chamadas vão para /api/... sem CORS.
 *  - "http://localhost:8080" -> use se abrir o front por outro servidor
 *                   (ex.: Live Server na porta 5500). Nesse caso a origem do
 *                   front precisa estar em CORS_ORIGINS no backend.
 */
window.WORKLISTA_API_BASE = "";
