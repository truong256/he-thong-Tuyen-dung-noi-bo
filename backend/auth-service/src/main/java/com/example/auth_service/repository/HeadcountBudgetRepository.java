package com.example.auth_service.repository;

import com.example.auth_service.domain.sprint3.HeadcountBudget;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface HeadcountBudgetRepository extends JpaRepository<HeadcountBudget, Long> {

    Optional<HeadcountBudget> findByDepartmentIdAndYear(Long departmentId, int year);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT b FROM HeadcountBudget b WHERE b.departmentId = :departmentId AND b.year = :year")
    Optional<HeadcountBudget> findByDepartmentIdAndYearForUpdate(@Param("departmentId") Long departmentId, @Param("year") int year);

    boolean existsByDepartmentIdAndYear(Long departmentId, int year);

    Page<HeadcountBudget> findByYear(int year, Pageable pageable);

    Page<HeadcountBudget> findByDepartmentId(Long departmentId, Pageable pageable);

    Page<HeadcountBudget> findByDepartmentIdAndYear(Long departmentId, int year, Pageable pageable);

    List<HeadcountBudget> findAllByYear(int year);
}
