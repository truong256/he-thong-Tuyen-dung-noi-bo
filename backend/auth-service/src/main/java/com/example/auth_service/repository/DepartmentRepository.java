package com.example.auth_service.repository;

import com.example.auth_service.domain.sprint2.Department;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import java.util.List;

public interface DepartmentRepository extends JpaRepository<Department, Long> {
    List<Department> findAllByOrderByNameAscIdAsc();
    boolean existsByNameIgnoreCaseAndIdNot(String name, Long id);
    boolean existsByCodeIgnoreCaseAndIdNot(String code, Long id);
    boolean existsByParentDepartmentId(Long id);
    boolean existsByParentDepartmentIdAndActiveTrue(Long id);
    java.util.List<Department> findByManagerUserId(Long managerUserId);
    java.util.Optional<Department> findByNameIgnoreCase(String name);
    java.util.Optional<Department> findByCodeIgnoreCase(String code);

    @Query(value = "SELECT d FROM Department d WHERE " +
           "(:active IS NULL OR d.active = :active) AND " +
           "(:search IS NULL OR LOWER(d.name) LIKE LOWER(CONCAT('%', :search, '%')) " +
           "   OR LOWER(d.code) LIKE LOWER(CONCAT('%', :search, '%')))",
           countQuery = "SELECT count(d) FROM Department d WHERE " +
           "(:active IS NULL OR d.active = :active) AND " +
           "(:search IS NULL OR LOWER(d.name) LIKE LOWER(CONCAT('%', :search, '%')) " +
           "   OR LOWER(d.code) LIKE LOWER(CONCAT('%', :search, '%')))")
    org.springframework.data.domain.Page<Department> searchDepartments(
            @org.springframework.data.repository.query.Param("search") String search,
            @org.springframework.data.repository.query.Param("active") Boolean active,
            org.springframework.data.domain.Pageable pageable
    );

    // One database lock serializes tree writes across every application instance.
    // Acquired before reading nodes, so concurrent moves cannot introduce a cycle.
    @Query(value = "SELECT id FROM department_tree_lock WHERE id = 1 FOR UPDATE", nativeQuery = true)
    Integer lockTree();
}

