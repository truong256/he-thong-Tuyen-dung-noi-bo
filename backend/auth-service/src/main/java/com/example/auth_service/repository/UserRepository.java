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
    boolean existsByDepartmentIgnoreCase(String department);

    @Query("""
        SELECT COUNT(u) FROM User u 
        WHERE u.department IS NOT NULL 
          AND (
            LOWER(TRIM(u.department)) = LOWER(TRIM(:name)) 
            OR LOWER(TRIM(u.department)) = LOWER(TRIM(:code))
            OR (:code = 'DEV-BE' AND (LOWER(u.department) LIKE '%backend%' OR LOWER(u.department) LIKE '%phát triển%'))
            OR (:code = 'DEV-FE' AND (LOWER(u.department) LIKE '%frontend%' OR LOWER(u.department) LIKE '%giao diện%'))
            OR (:code = 'TECH' AND (LOWER(u.department) LIKE '%công nghệ%' OR LOWER(u.department) LIKE '%kỹ thuật%'))
            OR (:code = 'TA-REC' AND (LOWER(u.department) LIKE '%nhân sự%' OR LOWER(u.department) LIKE '%tuyển dụng%'))
            OR (:code = 'BOD' AND (LOWER(u.department) LIKE '%giám đốc%' OR LOWER(u.department) LIKE '%điều hành%'))
          )
    """)
    long countUsersInDepartment(@Param("name") String name, @Param("code") String code);

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
