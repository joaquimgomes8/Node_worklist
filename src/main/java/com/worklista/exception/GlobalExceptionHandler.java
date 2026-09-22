package com.worklista.exception;

import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.server.ResponseStatusException;

import java.util.Map;
import java.util.Objects;

/**
 * Converte exceções em respostas JSON no formato {"message": "..."}, que o
 * front-end exibe diretamente para o usuário.
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    /** Falha de validação (@Valid): devolve a primeira mensagem de erro. */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, String>> handleValidation(MethodArgumentNotValidException ex) {
        String message = ex.getBindingResult().getFieldErrors().stream()
                .map(FieldError::getDefaultMessage)
                .filter(Objects::nonNull)
                .findFirst()
                .orElse("Dados inválidos.");
        return ResponseEntity.badRequest().body(Map.of("message", message));
    }

    /** JSON malformado ou ausente. */
    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<Map<String, String>> handleUnreadable(HttpMessageNotReadableException ex) {
        return ResponseEntity.badRequest().body(Map.of("message", "Corpo da requisição inválido."));
    }

    /** Ex.: /api/tasks/abc/trash (id não numérico). */
    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<Map<String, String>> handleTypeMismatch(MethodArgumentTypeMismatchException ex) {
        return ResponseEntity.badRequest().body(Map.of("message", "Parâmetro inválido."));
    }

    /** Erros de negócio lançados pelos serviços (404, 409, 401...). */
    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<Map<String, String>> handleStatus(ResponseStatusException ex) {
        String message = ex.getReason() != null ? ex.getReason() : "Não foi possível concluir a operação.";
        return ResponseEntity.status(ex.getStatusCode()).body(Map.of("message", message));
    }
}
