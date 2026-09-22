package com.worklista.security;

/**
 * Usuário autenticado da requisição atual (extraído do JWT).
 * Os controllers recebem esse objeto com @AuthenticationPrincipal.
 */
public record AuthUser(Long id, String email) {
}
