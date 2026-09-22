package com.worklista.dto;

/** Resposta de login/cadastro: o JWT que o front-end enviará em cada requisição. */
public record AuthResponse(String token, String email) {
}
