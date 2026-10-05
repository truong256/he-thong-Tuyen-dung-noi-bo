package com.example.auth_service.security;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.security.Key;
import java.util.*;

@Component
public class JwtUtils {

    private static final Logger logger = LoggerFactory.getLogger(JwtUtils.class);

    @Value("${jwt.secret}")
    private String jwtSecret;

    @Value("${jwt.expiration-ms:3600000}")
    private int jwtExpirationMs;

    private Key getSigningKey() {
        return Keys.hmacShaKeyFor(jwtSecret.getBytes(StandardCharsets.UTF_8));
    }

    public String generateAccessToken(String username) {
        return generateAccessToken(username, Set.of(), 1);
    }

    public String generateAccessToken(String email, String role) {
        Set<String> roles = new HashSet<>();
        if (role != null) roles.add(role);
        return generateAccessToken(email, roles, 1);
    }

    public String generateAccessToken(String email, Set<String> roles) {
        return generateAccessToken(email, roles, 1);
    }

    public String generateAccessToken(String email, Set<String> roles, int tokenVersion) {
        return generateAccessToken(email, roles, tokenVersion, false);
    }

    public String generateAccessToken(String email, Set<String> roles, int tokenVersion, boolean mustChangePassword) {
        List<String> roleList = roles != null ? new ArrayList<>(roles) : new ArrayList<>();
        String primaryRole = !roleList.isEmpty() ? roleList.get(0) : null;

        return Jwts.builder()
                .setSubject(email)
                .claim("email", email)
                .claim("roles", roleList)
                .claim("role", primaryRole)
                .claim("tokenVersion", tokenVersion)
                .claim("mustChangePassword", mustChangePassword)
                .setIssuedAt(new Date())
                .setExpiration(new Date(System.currentTimeMillis() + jwtExpirationMs))
                .signWith(getSigningKey(), SignatureAlgorithm.HS256)
                .compact();
    }

    public Boolean getMustChangePasswordFromJwtToken(String token) {
        try {
            Claims claims = Jwts.parserBuilder()
                    .setSigningKey(getSigningKey())
                    .build()
                    .parseClaimsJws(token)
                    .getBody();
            Object mcp = claims.get("mustChangePassword");
            if (mcp instanceof Boolean) {
                return (Boolean) mcp;
            }
            return false;
        } catch (Exception e) {
            return null;
        }
    }

    public Integer getTokenVersionFromJwtToken(String token) {
        try {
            Claims claims = Jwts.parserBuilder()
                    .setSigningKey(getSigningKey())
                    .build()
                    .parseClaimsJws(token)
                    .getBody();
            Object tv = claims.get("tokenVersion");
            if (tv instanceof Number) {
                return ((Number) tv).intValue();
            }
            return null;
        } catch (Exception e) {
            return null;
        }
    }

    public String getUsernameFromJwtToken(String token) {
        return Jwts.parserBuilder()
                .setSigningKey(getSigningKey())
                .build()
                .parseClaimsJws(token)
                .getBody()
                .getSubject();
    }

    public String getUsernameFromJwt(String token) {
        return getUsernameFromJwtToken(token);
    }

    @SuppressWarnings("unchecked")
    public List<String> getRolesFromJwtToken(String token) {
        Claims claims = Jwts.parserBuilder()
                .setSigningKey(getSigningKey())
                .build()
                .parseClaimsJws(token)
                .getBody();

        Object rolesObj = claims.get("roles");
        if (rolesObj instanceof List<?>) {
            return (List<String>) rolesObj;
        }
        String singleRole = claims.get("role", String.class);
        if (singleRole != null) {
            return List.of(singleRole);
        }
        return Collections.emptyList();
    }

    public boolean validateJwtToken(String authToken) {
        try {
            Jwts.parserBuilder().setSigningKey(getSigningKey()).build().parseClaimsJws(authToken);
            return true;
        } catch (SecurityException | MalformedJwtException e) {
            logger.error("Invalid JWT signature: {}", e.getMessage());
        } catch (ExpiredJwtException e) {
            logger.error("JWT token is expired: {}", e.getMessage());
        } catch (UnsupportedJwtException e) {
            logger.error("JWT token is unsupported: {}", e.getMessage());
        } catch (IllegalArgumentException e) {
            logger.error("JWT claims string is empty: {}", e.getMessage());
        }
        return false;
    }
}
