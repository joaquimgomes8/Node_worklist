package com.worklista.service;

import com.worklista.dto.AuthResponse;
import com.worklista.dto.LoginRequest;
import com.worklista.dto.RegisterRequest;
import com.worklista.model.User;
import com.worklista.repository.UserRepository;
import com.worklista.security.JwtService;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.nio.charset.StandardCharsets;
import java.util.Locale;

/** Regras de cadastro e login. */
@Service
public class AuthService {

    /** O bcrypt ignora tudo após 72 bytes; recusamos senhas maiores em vez de truncar em silêncio. */
    private static final int BCRYPT_MAX_BYTES = 72;

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    public AuthService(UserRepository userRepository, PasswordEncoder passwordEncoder, JwtService jwtService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
    }

    /** Cria a conta (senha salva com bcrypt) e já devolve um token, para o usuário entrar direto. */
    public AuthResponse register(RegisterRequest request) {
        if (exceedsBcryptLimit(request.password())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "A senha é longa demais (máximo de 72 bytes).");
        }

        String email = normalizeEmail(request.email());
        if (userRepository.existsByEmail(email)) {
            throw emailAlreadyRegistered();
        }

        User user;
        try {
            user = userRepository.saveAndFlush(new User(email, passwordEncoder.encode(request.password())));
        } catch (DataIntegrityViolationException ex) {
            // Duas requisições simultâneas com o mesmo e-mail: a restrição UNIQUE do banco protege.
            throw emailAlreadyRegistered();
        }
        return new AuthResponse(jwtService.generateToken(user), user.getEmail());
    }

    /**
     * Confere e-mail e senha. A mensagem de erro é a MESMA para "e-mail não existe"
     * e "senha errada", para não revelar quais e-mails estão cadastrados.
     */
    public AuthResponse login(LoginRequest request) {
        User user = userRepository.findByEmail(normalizeEmail(request.email()))
                .filter(u -> !exceedsBcryptLimit(request.password()))
                .filter(u -> passwordEncoder.matches(request.password(), u.getPasswordHash()))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "E-mail ou senha inválidos."));

        return new AuthResponse(jwtService.generateToken(user), user.getEmail());
    }

    private static String normalizeEmail(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }

    private static boolean exceedsBcryptLimit(String password) {
        return password.getBytes(StandardCharsets.UTF_8).length > BCRYPT_MAX_BYTES;
    }

    private static ResponseStatusException emailAlreadyRegistered() {
        return new ResponseStatusException(HttpStatus.CONFLICT, "Este e-mail já está cadastrado.");
    }
}
