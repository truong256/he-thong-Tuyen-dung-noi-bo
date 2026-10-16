package com.example.auth_service.repository;

import com.example.auth_service.domain.sprint2.RecruitmentRequisition;
import com.example.auth_service.entity.RequisitionAssignment;
import com.example.auth_service.entity.RoleName;
import com.example.auth_service.exception.BadRequestException;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;

import java.time.DateTimeException;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Locale;

/** SQL filters shared by data and count queries. Dates are Vietnam calendar dates. */
public final class RequisitionListSpecification {
    private static final ZoneId VIETNAM = ZoneId.of("Asia/Ho_Chi_Minh");
    private RequisitionListSpecification() { }

    public static Specification<RecruitmentRequisition> filtered(Long ownerId, String status,
            Long departmentId, String keyword, Long recruiterId, LocalDate from, LocalDate to) {
        if (from != null && to != null && from.isAfter(to)) {
            throw new BadRequestException("Ngày bắt đầu không được sau ngày kết thúc.");
        }
        if (departmentId != null && departmentId <= 0 || recruiterId != null && recruiterId <= 0) {
            throw new BadRequestException("ID phòng ban và người tuyển dụng phải lớn hơn 0.");
        }
        Instant start;
        Instant end;
        try {
            start = from == null ? null : from.atStartOfDay(VIETNAM).toInstant();
            end = to == null ? null : to.plusDays(1).atStartOfDay(VIETNAM).toInstant();
        } catch (DateTimeException | ArithmeticException ex) {
            throw new BadRequestException("Khoảng ngày không hợp lệ.");
        }
        String normalizedStatus = status == null || status.isBlank() || "ALL".equalsIgnoreCase(status.trim())
                ? null : status.trim().toUpperCase(Locale.ROOT);
        String term = keyword == null || keyword.isBlank() ? null : "%" + escapeLike(keyword.trim().toLowerCase(Locale.ROOT)) + "%";
        return (root, query, cb) -> {
            var conditions = new ArrayList<Predicate>();
            if (ownerId != null) conditions.add(cb.equal(root.get("createdByUserId"), ownerId));
            if (normalizedStatus != null) conditions.add(cb.equal(cb.upper(root.get("status")), normalizedStatus));
            if (departmentId != null) conditions.add(cb.equal(root.get("departmentId"), departmentId));
            if (start != null) conditions.add(cb.greaterThanOrEqualTo(root.<Instant>get("createdAt"), start));
            if (end != null) conditions.add(cb.lessThan(root.<Instant>get("createdAt"), end));
            if (term != null) conditions.add(cb.or(
                    cb.like(cb.lower(root.get("title")), term, '\\'),
                    cb.like(cb.lower(root.get("requisitionCode")), term, '\\')));
            if (recruiterId != null) {
                // EXISTS avoids duplicate requisitions/counts when several recruiters are assigned.
                var assigned = query.subquery(Long.class);
                var assignment = assigned.from(RequisitionAssignment.class);
                assigned.select(assignment.get("requisitionId")).where(
                        cb.equal(assignment.get("requisitionId"), root.get("id")),
                        cb.equal(assignment.get("userId"), recruiterId),
                        cb.equal(assignment.get("role"), RoleName.RECRUITER));
                conditions.add(cb.exists(assigned));
            }
            return cb.and(conditions.toArray(Predicate[]::new));
        };
    }

    private static String escapeLike(String text) {
        return text.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_");
    }
}
