package com.example.auth_service.repository;

import com.example.auth_service.entity.User;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface UserRepository extends JpaRepository<User, Long> {

    // Tìm tài khoản theo username
    User findByUsername(String username);

    // Kiểm tra username đã tồn tại chưa
    boolean existsByUsername(String username);

    // Tìm tài khoản theo email
    User findByEmail(String email);

    // Kiểm tra email đã tồn tại chưa
    boolean existsByEmail(String email);

    // Kiểm tra email có thuộc tài khoản khác không
    boolean existsByEmailAndIdNot(String email, Long id);

    // Tìm kiếm tài khoản theo username, fullName, email
    // Có thể kết hợp lọc theo status
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