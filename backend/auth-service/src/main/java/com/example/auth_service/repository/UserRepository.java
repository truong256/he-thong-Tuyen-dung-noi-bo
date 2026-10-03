package com.example.auth_service.repository;

import com.example.auth_service.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long>, JpaSpecificationExecutor<User> {
    Optional<User> findByEmail(String email);
    Optional<User> findByUsername(String username);
    Boolean existsByEmail(String email);
    boolean existsByEmailIgnoreCase(String email);
    Boolean existsByUsername(String username);
    boolean existsByEmailAndIdNot(String email, Long id);
    boolean existsByEmailIgnoreCaseAndIdNot(String email, Long id);

    @Query("""
        SELECT u FROM User u
        WHERE
            (
                :keyword IS NULL
                OR :keyword = ''
                OR LOWER(u.username) LIKE LOWER(CONCAT('%', :keyword, '%'))
                OR LOWER(u.fullName) LIKE LOWER(CONCAT('%', :keyword, '%'))
                OR LOWER(u.email) LIKE LOWER(CONCAT('%', :keyword, '%'))
            )
            AND
            (
                :status IS NULL
                OR :status = ''
                OR u.status = :status
            )
        """)
    List<User> searchUsers(
            @Param("keyword") String keyword,
            @Param("status") String status
    );
}