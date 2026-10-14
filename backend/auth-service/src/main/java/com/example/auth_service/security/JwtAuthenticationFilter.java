package com.example.auth_service.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private static final Logger logger = LoggerFactory.getLogger(JwtAuthenticationFilter.class);

    private final JwtUtils jwtUtils;
    private final CustomUserDetailsService userDetailsService;

    public JwtAuthenticationFilter(JwtUtils jwtUtils, CustomUserDetailsService userDetailsService) {
        this.jwtUtils = jwtUtils;
        this.userDetailsService = userDetailsService;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        try {
            String jwt = parseJwt(request);
            if (jwt != null && jwtUtils.validateJwtToken(jwt)) {
                String username = jwtUtils.getUsernameFromJwtToken(jwt);
                Integer tokenVersion = jwtUtils.getTokenVersionFromJwtToken(jwt);

                UserDetails userDetails = userDetailsService.loadUserByUsername(username);

                if (userDetails instanceof UserPrincipal principal) {
                    if (tokenVersion == null || tokenVersion != principal.getTokenVersion()) {
                        SecurityContextHolder.clearContext();
                        logger.warn("JWT authentication rejected: stale token version for user {}. Token v={}, DB v={}",
                                username, tokenVersion, principal.getTokenVersion());
                        filterChain.doFilter(request, response);
                        return;
                    }

                    if (principal.isMustChangePassword()) {
                        String uri = request.getRequestURI();
                        boolean isAllowedFirstLoginPath = uri.equals("/api/auth/change-password")
                                || uri.equals("/api/auth/logout")
                                || uri.equals("/api/auth/me")
                                || uri.equals("/api/auth/refresh-token");

                        if (!isAllowedFirstLoginPath) {
                            SecurityContextHolder.clearContext();
                            response.setStatus(HttpServletResponse.SC_FORBIDDEN);
                            response.setContentType("application/json;charset=UTF-8");
                            response.getWriter().write("{\"status\":403,\"message\":\"Tài khoản bắt buộc phải đổi mật khẩu lần đầu trước khi tiếp tục.\",\"mustChangePassword\":true}");
                            return;
                        }
                    }
                }

                if (userDetails == null || !userDetails.isEnabled() || !userDetails.isAccountNonLocked()
                        || !userDetails.isAccountNonExpired() || !userDetails.isCredentialsNonExpired()) {
                    SecurityContextHolder.clearContext();
                    logger.warn("JWT authentication rejected for inactive, expired or locked user: {}", username);
                } else {
                    UsernamePasswordAuthenticationToken authentication =
                            new UsernamePasswordAuthenticationToken(
                                    userDetails,
                                    null,
                                    userDetails.getAuthorities()
                            );
                    authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));

                    SecurityContextHolder.getContext().setAuthentication(authentication);
                }
            }
        } catch (Exception e) {
            SecurityContextHolder.clearContext();
            logger.error("Cannot set user authentication: {}", e.getMessage());
        }

        filterChain.doFilter(request, response);
    }

    private String parseJwt(HttpServletRequest request) {
        String headerAuth = request.getHeader("Authorization");

        if (StringUtils.hasText(headerAuth) && headerAuth.startsWith("Bearer ")) {
            return headerAuth.substring(7);
        }

        return null;
    }
}
