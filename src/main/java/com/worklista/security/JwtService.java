package com.worklista.security;

import com.worklista.model.User;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.Date;
import java.util.Optional;

/**
 * Cria e valida tokens JWT (assinados com HMAC-SHA).
 *
 * Conteúdo do token:
 *  - sub  : id do usuário
 *  - email: e-mail do usuário
 *  - iat / exp: emissão e expiração
 */
@Service
public class JwtService {

    private static final Logger log = LoggerFactory.getLogger(JwtService.class);
    private static final String DEFAULT_SECRET_PREFIX = "troque-esta-chave";

    private final SecretKey key;
    private final Duration lifetime;

    public JwtService(@Value("${app.jwt.secret}") String secret,
                      @Value("${app.jwt.expiration-minutes}") long expirationMinutes) {
        byte[] bytes = secret.getBytes(StandardCharsets.UTF_8);
        if (bytes.length < 32) {
            // HMAC-SHA256 exige uma chave de pelo menos 256 bits (32 bytes).
            throw new IllegalStateException("app.jwt.secret precisa ter no mínimo 32 caracteres.");
        }
        if (secret.startsWith(DEFAULT_SECRET_PREFIX)) {
            log.warn("Usando o segredo JWT padrão. Defina a variável de ambiente JWT_SECRET antes de publicar!");
        }
        this.key = Keys.hmacShaKeyFor(bytes);
        this.lifetime = Duration.ofMinutes(expirationMinutes);
    }

    /** Gera um token para o usuário informado. */
    public String generateToken(User user) {
        Instant now = Instant.now();
        return Jwts.builder()
                .subject(String.valueOf(user.getId()))
                .claim("email", user.getEmail())
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plus(lifetime)))
                .signWith(key)
                .compact();
    }

    /**
     * Valida assinatura e expiração. Retorna vazio se o token for inválido,
     * adulterado ou expirado (nunca lança exceção para o chamador).
     */
    public Optional<AuthUser> validate(String token) {
        try {
            Claims claims = Jwts.parser()
                    .verifyWith(key)
                    .build()
                    .parseSignedClaims(token)
                    .getPayload();
            Long id = Long.parseLong(claims.getSubject());
            String email = claims.get("email", String.class);
            return Optional.of(new AuthUser(id, email));
        } catch (JwtException | IllegalArgumentException ex) {
            return Optional.empty();
        }
    }
}
