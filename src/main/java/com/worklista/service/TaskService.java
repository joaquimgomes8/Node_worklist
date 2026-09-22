package com.worklista.service;

import com.worklista.dto.TaskRequest;
import com.worklista.dto.TaskResponse;
import com.worklista.model.Task;
import com.worklista.model.User;
import com.worklista.repository.TaskRepository;
import com.worklista.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

/**
 * Regras das tarefas e da lixeira.
 *
 * SEGURANÇA: todos os métodos recebem o id do usuário autenticado e buscam a
 * tarefa por (id + dono). Se a tarefa for de outra pessoa, a resposta é 404,
 * exatamente como se ela não existisse.
 */
@Service
public class TaskService {

    private final TaskRepository taskRepository;
    private final UserRepository userRepository;

    public TaskService(TaskRepository taskRepository, UserRepository userRepository) {
        this.taskRepository = taskRepository;
        this.userRepository = userRepository;
    }

    // ------------------------------------------------------------------ tarefas ativas

    @Transactional(readOnly = true)
    public List<TaskResponse> listActive(Long userId) {
        return taskRepository.findByUserIdAndTrashedAtIsNullOrderByIdDesc(userId).stream()
                .map(TaskResponse::from)
                .toList();
    }

    @Transactional
    public TaskResponse create(Long userId, TaskRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED,
                        "Usuário não encontrado. Entre novamente."));

        Task task = new Task(user, request.title().trim(), cleanDescription(request.description()));
        return TaskResponse.from(taskRepository.save(task));
    }

    @Transactional
    public TaskResponse setCompleted(Long userId, Long taskId, boolean completed) {
        Task task = findActive(userId, taskId);
        task.setCompleted(completed); // o JPA grava a alteração ao final da transação
        return TaskResponse.from(task);
    }

    @Transactional
    public TaskResponse moveToTrash(Long userId, Long taskId) {
        Task task = findActive(userId, taskId);
        task.moveToTrash();
        return TaskResponse.from(task);
    }

    // ------------------------------------------------------------------ lixeira

    @Transactional(readOnly = true)
    public List<TaskResponse> listTrash(Long userId) {
        return taskRepository.findByUserIdAndTrashedAtIsNotNullOrderByTrashedAtDesc(userId).stream()
                .map(TaskResponse::from)
                .toList();
    }

    @Transactional
    public TaskResponse restore(Long userId, Long taskId) {
        Task task = findTrashed(userId, taskId);
        task.restore();
        return TaskResponse.from(task);
    }

    /** Exclusão definitiva: só vale para itens que já estão na lixeira. */
    @Transactional
    public void deletePermanently(Long userId, Long taskId) {
        taskRepository.delete(findTrashed(userId, taskId));
    }

    @Transactional
    public void emptyTrash(Long userId) {
        taskRepository.deleteByUserIdAndTrashedAtIsNotNull(userId);
    }

    // ------------------------------------------------------------------ auxiliares

    private Task findActive(Long userId, Long taskId) {
        return taskRepository.findByIdAndUserId(taskId, userId)
                .filter(task -> !task.isTrashed())
                .orElseThrow(TaskService::notFound);
    }

    private Task findTrashed(Long userId, Long taskId) {
        return taskRepository.findByIdAndUserId(taskId, userId)
                .filter(Task::isTrashed)
                .orElseThrow(TaskService::notFound);
    }

    /** Descrição em branco vira null (não guardamos strings vazias). */
    private static String cleanDescription(String description) {
        if (description == null || description.isBlank()) {
            return null;
        }
        return description.trim();
    }

    private static ResponseStatusException notFound() {
        return new ResponseStatusException(HttpStatus.NOT_FOUND, "Tarefa não encontrada.");
    }
}
