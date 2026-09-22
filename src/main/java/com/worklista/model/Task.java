package com.worklista.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

import java.time.Instant;

/**
 * Tarefa de um usuário.
 *
 * A lixeira é uma "exclusão lógica" (soft delete): em vez de apagar a linha,
 * preenchemos {@code trashedAt}. Assim dá para restaurar. Excluir de vez
 * (só permitido para itens já na lixeira) remove a linha do banco.
 */
@Entity
@Table(name = "tasks", indexes = @Index(name = "idx_tasks_user_id", columnList = "user_id"))
public class Task {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 120)
    private String title;

    @Column(length = 1000)
    private String description;

    @Column(nullable = false)
    private boolean completed = false;

    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    /** null = tarefa ativa; preenchido = está na lixeira desde esse instante. */
    private Instant trashedAt;

    /** Dono da tarefa. Toda consulta filtra por ele (ninguém vê tarefas alheias). */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    /** Exigido pelo JPA. */
    protected Task() {
    }

    public Task(User user, String title, String description) {
        this.user = user;
        this.title = title;
        this.description = description;
    }

    @PrePersist
    void onCreate() {
        this.createdAt = Instant.now();
    }

    public boolean isTrashed() {
        return trashedAt != null;
    }

    public void moveToTrash() {
        this.trashedAt = Instant.now();
    }

    public void restore() {
        this.trashedAt = null;
    }

    public Long getId() {
        return id;
    }

    public String getTitle() {
        return title;
    }

    public String getDescription() {
        return description;
    }

    public boolean isCompleted() {
        return completed;
    }

    public void setCompleted(boolean completed) {
        this.completed = completed;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getTrashedAt() {
        return trashedAt;
    }
}
