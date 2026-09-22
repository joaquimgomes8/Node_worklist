package com.worklista;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.security.servlet.UserDetailsServiceAutoConfiguration;

/**
 * Ponto de entrada da aplicação.
 *
 * Excluímos a {@link UserDetailsServiceAutoConfiguration} porque NÃO usamos o
 * usuário/senha "padrão" que o Spring Security cria em memória: a autenticação
 * é feita por nós (AuthService) e emitimos um JWT.
 */
@SpringBootApplication(exclude = UserDetailsServiceAutoConfiguration.class)
public class WorkListaApplication {

    public static void main(String[] args) {
        SpringApplication.run(WorkListaApplication.class, args);
    }
}
