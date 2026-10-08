package com.example.auth_service.security;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;
import java.util.List;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity(prePostEnabled = true)
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;
    private final SecurityErrorHandler securityErrorHandler;

    @Value("${app.cors.allowed-origins:http://localhost:5173,http://localhost:3000}")
    private String allowedOrigins;

    public SecurityConfig(JwtAuthenticationFilter jwtAuthenticationFilter, SecurityErrorHandler securityErrorHandler) {
        this.jwtAuthenticationFilter = jwtAuthenticationFilter;
        this.securityErrorHandler = securityErrorHandler;
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .csrf(csrf -> csrf.disable())
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .formLogin(form -> form.disable())
            .httpBasic(basic -> basic.disable())
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                .dispatcherTypeMatchers(jakarta.servlet.DispatcherType.ERROR).permitAll()
                .requestMatchers(HttpMethod.POST, "/api/auth/register", "/api/auth/login",
                        "/api/auth/refresh-token", "/api/auth/forgot-password", "/api/auth/reset-password", "/api/auth/logout").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/auth/me", "/api/auth/permissions").hasAuthority("PROFILE_READ")
                .requestMatchers(HttpMethod.POST, "/api/auth/change-password").hasAuthority("PROFILE_UPDATE")
                .requestMatchers(HttpMethod.PUT, "/api/auth/profile").hasAuthority("PROFILE_UPDATE")
                .requestMatchers(HttpMethod.POST, "/api/auth/avatar", "/api/auth/profile/avatar").hasAuthority("PROFILE_UPDATE")
                .requestMatchers(HttpMethod.DELETE, "/api/auth/avatar", "/api/auth/profile/avatar").hasAuthority("PROFILE_UPDATE")
                .requestMatchers(HttpMethod.GET, "/api/auth/avatar", "/api/auth/avatar/thumbnail", "/api/auth/profile/avatar").hasAuthority("PROFILE_READ")
                .requestMatchers(HttpMethod.GET, "/api/auth/avatar/**", "/api/auth/avatars/**").permitAll()
                // S1-05 / S1-09: ROLE_READ → ADMIN + HR_MANAGER
                .requestMatchers(HttpMethod.GET, "/api/admin/roles").hasAuthority("ROLE_READ")
                // S1-08: USER_READ → ADMIN (F) + HR_MANAGER (R — only view, cannot mutate)
                .requestMatchers(HttpMethod.GET, "/api/admin/users", "/api/admin/users/{id}").hasAuthority("USER_READ")
                // S1-09: ROLE_MANAGE → ADMIN only (assign/revoke roles)
                .requestMatchers(HttpMethod.PUT, "/api/admin/users/{id}/roles").hasAuthority("ROLE_MANAGE")
                // S1-08: USER_MANAGE → ADMIN only (create, update, delete, import, reset password)
                .requestMatchers(HttpMethod.POST, "/api/admin/users").hasAuthority("USER_MANAGE")
                .requestMatchers("/api/admin/users/import", "/api/admin/users/import/**").hasAuthority("USER_MANAGE")
                .requestMatchers(HttpMethod.PUT, "/api/admin/users/{id}").hasAuthority("USER_MANAGE")
                // S1-10: Lock/unlock account → ADMIN only
                .requestMatchers(HttpMethod.PATCH, "/api/admin/users/{id}/status").hasAuthority("USER_MANAGE")
                .requestMatchers(HttpMethod.DELETE, "/api/admin/users/{id}").hasAuthority("USER_MANAGE")
                // ADMIN only: reset password endpoint
                .requestMatchers(HttpMethod.POST, "/api/admin/users/{id}/reset-password").hasAuthority("USER_MANAGE")
                .requestMatchers(HttpMethod.GET, "/api/interview-questions", "/api/interview-questions/**", "/api/questions", "/api/questions/**")
                        .hasAuthority("CATALOG_READ")
                .requestMatchers(HttpMethod.POST, "/api/interview-questions", "/api/interview-questions/**", "/api/questions", "/api/questions/**")
                        .hasAuthority("CATALOG_MANAGE")
                .requestMatchers(HttpMethod.PUT, "/api/interview-questions/**", "/api/questions/**")
                        .hasAuthority("CATALOG_MANAGE")
                .requestMatchers(HttpMethod.DELETE, "/api/interview-questions/**", "/api/questions/**")
                        .hasAuthority("CATALOG_MANAGE")
                .requestMatchers(HttpMethod.GET, "/api/job-titles", "/api/job-titles/{id}")
                        .hasAuthority("CATALOG_READ")
                .requestMatchers(HttpMethod.POST, "/api/job-titles")
                        .hasRole("HR_MANAGER")
                .requestMatchers(HttpMethod.PUT, "/api/job-titles/{id}")
                        .hasRole("HR_MANAGER")
                .requestMatchers(HttpMethod.PATCH, "/api/job-titles/{id}/status")
                        .hasRole("HR_MANAGER")
                .requestMatchers(HttpMethod.DELETE, "/api/job-titles/{id}")
                        .hasRole("HR_MANAGER")
                .requestMatchers(HttpMethod.GET, "/api/categories", "/api/categories/**")
                        .hasAuthority("CATALOG_READ")
                .requestMatchers(HttpMethod.POST, "/api/categories", "/api/categories/**")
                        .hasAuthority("CATALOG_MANAGE")
                .requestMatchers(HttpMethod.PUT, "/api/categories/**")
                        .hasAuthority("CATALOG_MANAGE")
                .requestMatchers(HttpMethod.PATCH, "/api/categories/**")
                        .hasAuthority("CATALOG_MANAGE")
                .requestMatchers(HttpMethod.DELETE, "/api/categories/**")
                        .hasAuthority("CATALOG_MANAGE")
                .requestMatchers(HttpMethod.GET, "/api/competency-frameworks", "/api/competency-frameworks/**")
                        .hasAuthority("CATALOG_READ")
                .requestMatchers(HttpMethod.POST, "/api/competency-frameworks", "/api/competency-frameworks/**")
                        .hasAuthority("CATALOG_MANAGE")
                .requestMatchers(HttpMethod.PUT, "/api/competency-frameworks/**")
                        .hasAuthority("CATALOG_MANAGE")
                .requestMatchers(HttpMethod.DELETE, "/api/competency-frameworks/**")
                        .hasAuthority("CATALOG_MANAGE")
                .requestMatchers(HttpMethod.GET, "/api/salary-ranges", "/api/salary-ranges/{id}").hasAuthority("SALARY_READ")
                .requestMatchers(HttpMethod.GET, "/api/candidates", "/api/candidates/{id}")
                        .hasAnyAuthority("CANDIDATE_READ_ALL", "CANDIDATE_READ_ASSIGNED", "CANDIDATE_READ_OWN")
                // S2-10: Recruitment Requisition (Yêu cầu tuyển dụng)
                .requestMatchers(HttpMethod.POST, "/api/requisitions/draft", "/api/requisitions")
                        .hasAnyAuthority("REQUISITION_CREATE", "REQUISITION_READ_ALL")
                .requestMatchers(HttpMethod.PUT, "/api/requisitions/{id}/draft", "/api/requisitions/{id}")
                        .hasAnyAuthority("REQUISITION_CREATE", "REQUISITION_READ_OWN", "REQUISITION_READ_ALL")
                .requestMatchers(HttpMethod.POST, "/api/requisitions/{id}/submit")
                        .hasAnyAuthority("REQUISITION_CREATE", "REQUISITION_READ_ALL")
                .requestMatchers(HttpMethod.GET, "/api/requisitions", "/api/requisitions/{id}")
                        .hasAnyAuthority("REQUISITION_CREATE", "REQUISITION_READ_OWN", "REQUISITION_READ_ALL")
                .requestMatchers(HttpMethod.DELETE, "/api/requisitions/{id}")
                        .hasAnyAuthority("REQUISITION_CREATE", "REQUISITION_READ_OWN", "REQUISITION_READ_ALL")
                .requestMatchers(HttpMethod.PUT, "/api/requisitions/{id}/assignments/{userId}")
                        .hasAuthority("RECRUITER_ASSIGN")
                .requestMatchers(HttpMethod.DELETE, "/api/requisitions/{id}/assignments/{userId}")
                        .hasAuthority("RECRUITER_ASSIGN")
                .requestMatchers(HttpMethod.GET, "/api/departments", "/api/departments/tree", "/api/departments/{id}")
                        .hasAuthority("CATALOG_READ")
                .requestMatchers(HttpMethod.POST, "/api/departments").hasAuthority("DEPARTMENT_MANAGE")
                .requestMatchers(HttpMethod.PUT, "/api/departments/{id}").hasAuthority("DEPARTMENT_MANAGE")
                .requestMatchers(HttpMethod.PATCH, "/api/departments/{id}/status").hasAuthority("DEPARTMENT_MANAGE")
                .requestMatchers(HttpMethod.DELETE, "/api/departments/{id}").hasAuthority("DEPARTMENT_MANAGE")
                .requestMatchers(HttpMethod.GET, "/api/organization", "/api/organization/**").hasAuthority("CATALOG_READ")
                .requestMatchers(HttpMethod.PUT, "/api/organization", "/api/organization/**").hasAuthority("CATALOG_MANAGE")
                .requestMatchers(HttpMethod.POST, "/api/organization/profile/logo", "/api/organization/profile/image").hasAuthority("CATALOG_MANAGE")
                .anyRequest().denyAll()
            )
            .exceptionHandling(errors -> errors.authenticationEntryPoint(securityErrorHandler)
                    .accessDeniedHandler(securityErrorHandler))
            .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        List<String> origins = Arrays.stream(allowedOrigins.split(","))
                .map(origin -> origin.trim())
                .toList();
        configuration.setAllowedOrigins(origins);
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(List.of("Authorization", "Content-Type", "X-Requested-With", "Accept"));
        configuration.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration authConfig) throws Exception {
        return authConfig.getAuthenticationManager();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}
