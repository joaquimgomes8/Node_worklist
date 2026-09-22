package com.worklista.dto;

import jakarta.validation.constraints.NotNull;

/** Corpo de PATCH /api/tasks/{id}/completed. */
public record CompletedRequest(
        @NotNull(message = "Informe se a tarefa está concluída.")
        Boolean completed) {
}
