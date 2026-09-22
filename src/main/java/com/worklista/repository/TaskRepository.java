package com.worklista.repository;

import com.worklista.model.Task;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

/**
 * O Spring Data gera as consultas a partir do NOME dos métodos.
 * "UserId" navega até task.user.id, e "TrashedAtIsNull" vira "trashed_at IS NULL".
 */
public interface TaskRepository extends JpaRepository<Task, Long> {

    /** Tarefas ativas do usuário, da mais nova para a mais antiga. */
    List<Task> findByUserIdAndTrashedAtIsNullOrderByIdDesc(Long userId);

    /** Tarefas na lixeira, as mais recentemente removidas primeiro. */
    List<Task> findByUserIdAndTrashedAtIsNotNullOrderByTrashedAtDesc(Long userId);

    /** Busca uma tarefa SOMENTE se ela pertencer ao usuário (evita acesso a dados de terceiros). */
    Optional<Task> findByIdAndUserId(Long id, Long userId);

    /** Esvazia a lixeira do usuário. Deve ser chamado dentro de uma transação. */
    long deleteByUserIdAndTrashedAtIsNotNull(Long userId);
}
