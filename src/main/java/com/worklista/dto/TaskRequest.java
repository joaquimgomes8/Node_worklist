package com.worklista.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Corpo de POST /api/tasks. A descrição é opcional. */
public record TaskRequest(
        @NotBlank(message = "Informe um título para a tarefa.")
        @Size(max = 120, message = "O título pode ter no máximo 120 caracteres.")
        String title,

        @Size(max = 1000, message = "A descrição pode ter no máximo 1000 caracteres.")
        String description) {
}
