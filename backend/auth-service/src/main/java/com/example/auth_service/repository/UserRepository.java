package com.example.auth_service.repository;

import com.example.auth_service.entity.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface UserRepository extends JpaRepository<User, Long> {

    User findByUsername(String username);

    boolean existsByUsername(String username);

    User findByEmail(String email);

    boolean existsByEmail(String email);

    boolean existsByEmailAndIdNot(String email, Long id);

    User findByActivationToken(String activationToken);

    @Query("""
        SELECT u FROM User u
        WHERE
            (
                :keyword IS NULL
                OR :keyword = ''
                OR LOWER(COALESCE(u.username, ''))
                    LIKE LOWER(CONCAT('%', :keyword, '%'))
                OR LOWER(COALESCE(u.fullName, ''))
                    LIKE LOWER(CONCAT('%', :keyword, '%'))
                OR LOWER(COALESCE(u.email, ''))
                    LIKE LOWER(CONCAT('%', :keyword, '%'))
                OR LOWER(COALESCE(u.department, ''))
                    LIKE LOWER(CONCAT('%', :keyword, '%'))
            )
            AND
            (
                :role IS NULL
                OR :role = ''
                OR u.role = :role
            )
            AND
            (
                :status IS NULL
                OR :status = ''
                OR u.status = :status
            )
        """)
    Page<User> searchUsers(
            @Param("keyword") String keyword,
            @Param("role") String role,
            @Param("status") String status,
            Pageable pageable
    );
}