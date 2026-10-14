package com.example.auth_service.repository;

import com.example.auth_service.domain.sprint3.RequisitionApprovalHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Repository truy xuất lịch sử phê duyệt yêu cầu tuyển dụng (S3-03).
 * Chỉ hỗ trợ tra cứu và thêm mới nhật ký, không cung cấp API chỉnh sửa hay xóa lịch sử.
 */
@Repository
public interface RequisitionApprovalHistoryRepository extends JpaRepository<RequisitionApprovalHistory, Long> {

    List<RequisitionApprovalHistory> findByRequisitionIdOrderByStepOrderAsc(Long requisitionId);

    List<RequisitionApprovalHistory> findByRequisitionIdOrderByActionAtAsc(Long requisitionId);

    Optional<RequisitionApprovalHistory> findByRequisitionIdAndStepOrder(Long requisitionId, int stepOrder);

    boolean existsByRequisitionId(Long requisitionId);
}
