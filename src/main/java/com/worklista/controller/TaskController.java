package com.worklista.controller;

import com.worklista.dto.CompletedRequest;
import com.worklista.dto.TaskRequest;
import com.worklista.dto.TaskResponse;
import com.worklista.security.AuthUser;
import com.worklista.service.TaskService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Rotas protegidas por JWT. O {@link AuthUser} vem do token (nunca de parâmetros
 * da requisição), por isso um usuário não consegue "fingir" ser outro.
 */
@RestController
@RequestMapping("/api")
public class TaskController {

    private final TaskService taskService;

    public TaskController(TaskService taskService) {
        this.taskService = taskService;
    }

    // ------------------------------------------------------------------ tarefas

    /** GET /api/tasks -> tarefas ativas */
    @GetMapping("/tasks")
    public List<TaskResponse> list(@AuthenticationPrincipal AuthUser user) {
        return taskService.listActive(user.id());
    }

    /** POST /api/tasks {title, description} -> 201 */
    @PostMapping("/tasks")
    @ResponseStatus(HttpStatus.CREATED)
    public TaskResponse create(@AuthenticationPrincipal AuthUser user, @Valid @RequestBody TaskRequest request) {
        return taskService.create(user.id(), request);
    }

    /** PATCH /api/tasks/{id}/completed {completed: true|false} -> marca/desmarca */
    @PatchMapping("/tasks/{id}/completed")
    public TaskResponse setCompleted(@AuthenticationPrincipal AuthUser user,
                                     @PathVariable Long id,
                                     @Valid @RequestBody CompletedRequest request) {
        return taskService.setCompleted(user.id(), id, request.completed());
    }

    /** PATCH /api/tasks/{id}/trash -> move para a lixeira */
    @PatchMapping("/tasks/{id}/trash")
    public TaskResponse moveToTrash(@AuthenticationPrincipal AuthUser user, @PathVariable Long id) {
        return taskService.moveToTrash(user.id(), id);
    }

    // ------------------------------------------------------------------ lixeira

    /** GET /api/trash -> tarefas na lixeira */
    @GetMapping("/trash")
    public List<TaskResponse> listTrash(@AuthenticationPrincipal AuthUser user) {
        return taskService.listTrash(user.id());
    }

    /** PATCH /api/trash/{id}/restore -> volta para a lista de tarefas */
    @PatchMapping("/trash/{id}/restore")
    public TaskResponse restore(@AuthenticationPrincipal AuthUser user, @PathVariable Long id) {
        return taskService.restore(user.id(), id);
    }

    /** DELETE /api/trash/{id} -> exclui definitivamente (204) */
    @DeleteMapping("/trash/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deletePermanently(@AuthenticationPrincipal AuthUser user, @PathVariable Long id) {
        taskService.deletePermanently(user.id(), id);
    }

    /** DELETE /api/trash -> esvazia a lixeira (204) */
    @DeleteMapping("/trash")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void emptyTrash(@AuthenticationPrincipal AuthUser user) {
        taskService.emptyTrash(user.id());
    }
}
