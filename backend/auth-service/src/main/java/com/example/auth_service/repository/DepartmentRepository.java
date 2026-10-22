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

    // One database lock serializes tree writes across every application instance.
    // Acquired before reading nodes, so concurrent moves cannot introduce a cycle.
    @Query(value = "SELECT id FROM department_tree_lock WHERE id = 1 FOR UPDATE", nativeQuery = true)
    Integer lockTree();
}

