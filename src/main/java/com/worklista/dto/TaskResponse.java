package com.worklista.dto;

import com.worklista.model.Task;

import java.time.Instant;

/**
 * Representação pública de uma tarefa. Usamos um DTO (em vez de devolver a
 * entidade) para não expor campos internos, como o usuário dono.
 */
public record TaskResponse(
        Long id,
        String title,
        String description,
        boolean completed,
        Instant createdAt,
        Instant trashedAt) {

    public static TaskResponse from(Task task) {
        return new TaskResponse(
                task.getId(),
                task.getTitle(),
                task.getDescription(),
                task.isCompleted(),
                task.getCreatedAt(),
                task.getTrashedAt());
    }
}
