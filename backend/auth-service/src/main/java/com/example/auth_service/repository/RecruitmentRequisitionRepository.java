package com.example.auth_service.repository;

import com.example.auth_service.domain.sprint2.RecruitmentRequisition;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RecruitmentRequisitionRepository extends JpaRepository<RecruitmentRequisition, Long> {
    boolean existsByDepartmentId(Long departmentId);

    @org.springframework.data.jpa.repository.Query("""
        select count(r) > 0 from RecruitmentRequisition r where r.departmentId = :departmentId
        and (r.status is null or upper(r.status) not in ('CLOSED', 'REJECTED', 'CANCELLED'))
        """)
    boolean hasOpenRequisitions(Long departmentId);
}
