package com.worklista.dto;

import jakarta.validation.constraints.NotBlank;

/** Corpo de POST /api/auth/login. */
public record LoginRequest(
        @NotBlank(message = "Informe o e-mail.")
        String email,

        @NotBlank(message = "Informe a senha.")
        String password) {
}
