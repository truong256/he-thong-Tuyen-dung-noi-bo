package com.example.auth_service.security;

import com.example.auth_service.entity.RoleName;
import java.util.*;
import static com.example.auth_service.security.Permission.*;

/**
 * Ma trận phân quyền theo Product Backlog ATS – Sheet "2. User Roles"
 *
 * Ký hiệu gốc:
 *   F = toàn quyền (full)
 *   W = ghi trong phạm vi được giao (write/scoped)
 *   R = chỉ xem (read-only)
 *   – = không truy cập
 *   * = chỉ trên dữ liệu của chính mình / vị trí mình sở hữu / vòng phỏng vấn tham gia
 *
 * Module                  | Candidate | Interviewer | Hiring Mgr | Recruiter | Approver | HR Manager
 * Danh mục TC & vị trí   |    –      |     R       |     R      |    R      |    R     |    F
 * Yêu cầu tuyển dụng     |    –      |     –       |    W*      |    W      |   W*     |    F
 * Tin tuyển dụng          |    R      |     –       |     R      |    W      |    R     |    F
 * Hồ sơ ứng viên/pipeline|   R*      |    R*       |    R*      |    F      |    R     |    F
 * Lịch phỏng vấn          |   R*      |    R*       |    R*      |    F      |    –     |    F
 * Phiếu đánh giá          |    –      |    W*       |    R*      |    R      |    R     |    F
 * Offer & onboarding      |   R*      |     –       |    R*      |    W      |   W*     |    F
 * Email & thông báo       |   R*      |    R*       |    R*      |    F      |    –     |    F
 * Báo cáo & dashboard     |    –      |     –       |    R*      |    R*     |    R     |    F
 * Người dùng & nhật ký    |    –      |     –       |     –      |    –      |    –     |    R
 *
 * NOTE – Dải lương (Salary): SPEC CONFLICT – NEEDS PO DECISION
 * Sheet 2 (User Roles) ghi chú "Admin có toàn quyền trên mọi module" (F).
 * Tuy nhiên Jira S2-05 (SCRUM-53) Acceptance Criteria quy định "Chỉ HR_MANAGER mới được xem và quản lý dải lương chuẩn ngạch bậc".
 * Hiện tại áp dụng nguyên tắc đặc tả bảo mật hẹp nhất (Least Privilege / S2-05):
 * Admin KHÔNG được cấp SALARY_READ / SALARY_MANAGE (chỉ HR_MANAGER có).
 * Trạng thái: SPEC CONFLICT – CHƯA TỰ Ý CHỐT THAY PO, chờ Product Owner xác nhận chính thức.
 */
public final class RolePermissions {
    private RolePermissions() {}

    private static final Map<RoleName, Set<Permission>> MATRIX;

    static {
        Map<RoleName, Set<Permission>> roles = new EnumMap<>(RoleName.class);

        // ----------------------------------------------------------------
        // CANDIDATE – nộp hồ sơ, theo dõi trạng thái, phản hồi offer
        // ----------------------------------------------------------------
        roles.put(RoleName.CANDIDATE, permissions(
                APPLICATION_CREATE,
                CANDIDATE_READ_OWN,        // R* hồ sơ của chính mình
                OFFER_READ_OWN,            // R* offer của mình
                OFFER_RESPOND              // phản hồi offer
        ));

        // ----------------------------------------------------------------
        // RECRUITER – vận hành tuyển dụng hằng ngày
        //   Danh mục: R  →  CATALOG_READ
        //   Dải lương: Theo Jira S2-05 chỉ HR_MANAGER xem dải lương chuẩn (GAP 02: Bỏ SALARY_READ)
        //   Tin tuyển dụng: W  →  JOB_MANAGE
        //   Hồ sơ & pipeline: Theo Jira S1-05 giới hạn vị trí phụ trách (GAP 01: CANDIDATE_READ_ASSIGNED, PIPELINE_MANAGE)
        //   Lịch phỏng vấn: F  →  INTERVIEW_MANAGE
        //   Phiếu đánh giá: R  →  EVALUATION_READ (GAP 03)
        //   Offer: W  →  OFFER_MANAGE
        //   Onboarding: W  →  ONBOARDING_MANAGE
        //   Email & thông báo: F  →  NOTIFICATION_MANAGE
        //   Báo cáo: R*  →  REPORT_READ
        // ----------------------------------------------------------------
        roles.put(RoleName.RECRUITER, permissions(
                CATALOG_READ,
                JOB_MANAGE,
                CANDIDATE_READ_ASSIGNED,
                PIPELINE_MANAGE,
                INTERVIEW_MANAGE,
                EVALUATION_READ,
                OFFER_MANAGE,
                ONBOARDING_MANAGE,
                NOTIFICATION_MANAGE,
                REPORT_READ
        ));

        // ----------------------------------------------------------------
        // HIRING_MANAGER – trưởng bộ phận, sở hữu vị trí tuyển dụng
        //   Danh mục: R  →  CATALOG_READ
        //   Dải lương: Theo Jira S2-05 chỉ HR_MANAGER xem dải lương chuẩn (GAP 02: Bỏ SALARY_READ)
        //   Yêu cầu tuyển dụng: W*  →  REQUISITION_CREATE, REQUISITION_READ_OWN
        //   Hồ sơ ứng viên: R*  →  CANDIDATE_READ_ASSIGNED
        //   Lịch phỏng vấn: R*  →  INTERVIEW_READ_ASSIGNED
        //   Phiếu đánh giá: R*  →  EVALUATION_READ (GAP 03: Thu hồi EVALUATION_SUBMIT)
        //   Offer: R*  →  OFFER_READ_OWN
        //   Báo cáo: R*  →  REPORT_READ (của vị trí mình)
        // ----------------------------------------------------------------
        roles.put(RoleName.HIRING_MANAGER, permissions(
                CATALOG_READ,
                REQUISITION_CREATE,
                REQUISITION_READ_OWN,
                CANDIDATE_READ_ASSIGNED,
                INTERVIEW_READ_ASSIGNED,
                EVALUATION_READ,
                OFFER_READ_OWN,
                REPORT_READ
        ));

        // ----------------------------------------------------------------
        // INTERVIEWER – nhân sự được mời tham gia một vòng phỏng vấn
        //   Danh mục: R  →  CATALOG_READ
        //   Hồ sơ ứng viên: R*  →  CANDIDATE_READ_ASSIGNED (vòng mình tham gia)
        //   Lịch phỏng vấn: R*  →  INTERVIEW_READ_ASSIGNED
        //   Phiếu đánh giá: W*  →  EVALUATION_SUBMIT, EVALUATION_READ
        //   Email & thông báo: R*  → NOTIFICATION_READ_OWN (trong base)
        // ----------------------------------------------------------------
        roles.put(RoleName.INTERVIEWER, permissions(
                CATALOG_READ,
                CANDIDATE_READ_ASSIGNED,
                INTERVIEW_READ_ASSIGNED,
                EVALUATION_READ,
                EVALUATION_SUBMIT
        ));

        // ----------------------------------------------------------------
        // HR_MANAGER – chủ sở hữu toàn bộ hoạt động tuyển dụng
        //   Danh mục: F  →  CATALOG_READ, CATALOG_MANAGE
        //   Dải lương: F  →  SALARY_READ, SALARY_MANAGE  (S2-05 sole owner)
        //   Yêu cầu: F  →  REQUISITION_READ_ALL, REQUISITION_APPROVE, RECRUITER_ASSIGN
        //   Tin tuyển dụng: F  →  JOB_MANAGE
        //   Hồ sơ & pipeline: F  →  CANDIDATE_READ_ALL, PIPELINE_MANAGE
        //   Lịch phỏng vấn: F  →  INTERVIEW_MANAGE
        //   Phiếu đánh giá: F  →  EVALUATION_READ, EVALUATION_SUBMIT
        //   Offer & onboarding: F  →  OFFER_MANAGE, OFFER_APPROVE, ONBOARDING_MANAGE
        //   Email & thông báo: F  →  NOTIFICATION_MANAGE
        //   Báo cáo: F  →  REPORT_READ
        //   Người dùng & nhật ký: R  →  USER_READ, ROLE_READ, AUDIT_READ (không có USER_MANAGE/ROLE_MANAGE)
        //   Phòng ban: F  →  DEPARTMENT_MANAGE
        // ----------------------------------------------------------------
        roles.put(RoleName.HR_MANAGER, permissions(
                DEPARTMENT_MANAGE,
                CATALOG_READ,
                CATALOG_MANAGE,
                SALARY_READ,
                SALARY_MANAGE,
                REQUISITION_CREATE,
                REQUISITION_READ_ALL,
                REQUISITION_APPROVE,
                RECRUITER_ASSIGN,
                JOB_MANAGE,
                CANDIDATE_READ_ALL,
                PIPELINE_MANAGE,
                INTERVIEW_MANAGE,
                EVALUATION_READ,
                EVALUATION_SUBMIT,
                OFFER_MANAGE,
                OFFER_APPROVE,
                ONBOARDING_MANAGE,
                NOTIFICATION_MANAGE,
                REPORT_READ,
                USER_READ,
                ROLE_READ,
                AUDIT_READ
        ));

        // ----------------------------------------------------------------
        // APPROVER – ban giám đốc, phê duyệt theo hạn mức
        //   Danh mục: R  →  CATALOG_READ
        //   Dải lương: GAP 02 Bỏ SALARY_READ (S2-05: chỉ HR_MANAGER)
        //   Yêu cầu tuyển dụng: W*  →  REQUISITION_APPROVE
        //   Hồ sơ ứng viên: R  →  CANDIDATE_READ_ALL (read-only tổng quan)
        //   Phiếu đánh giá: R  →  EVALUATION_READ
        //   Offer: W*  →  OFFER_APPROVE
        //   Báo cáo: R  →  REPORT_READ
        // ----------------------------------------------------------------
        roles.put(RoleName.APPROVER, permissions(
                CATALOG_READ,
                REQUISITION_APPROVE,
                CANDIDATE_READ_ALL,
                EVALUATION_READ,
                OFFER_APPROVE,
                REPORT_READ
        ));

        // ----------------------------------------------------------------
        // ADMIN – vận hành hệ thống (GAP 04)
        //   Sheet 2: "Admin có toàn quyền trên mọi module"
        //   Bổ sung đầy đủ permissions quản trị các module:
        //   Người dùng: F  →  USER_READ, USER_MANAGE
        //   Vai trò: F  →  ROLE_READ, ROLE_MANAGE
        //   Phòng ban: R  →  CATALOG_READ (chỉ HR_MANAGER có DEPARTMENT_MANAGE theo S2-04)
        //   Danh mục: F  →  CATALOG_READ, CATALOG_MANAGE
        //   Yêu cầu tuyển dụng: F  →  REQUISITION_CREATE, REQUISITION_READ_ALL, REQUISITION_APPROVE, RECRUITER_ASSIGN
        //   Tin tuyển dụng: F  →  JOB_MANAGE
        //   Hồ sơ & pipeline: F  →  CANDIDATE_READ_ALL, PIPELINE_MANAGE
        //   Lịch phỏng vấn: F  →  INTERVIEW_MANAGE
        //   Phiếu đánh giá: R  →  EVALUATION_READ
        //   Offer & onboarding: F  →  OFFER_MANAGE, OFFER_APPROVE, ONBOARDING_MANAGE
        //   Email & thông báo: F  →  NOTIFICATION_MANAGE
        //   Báo cáo: F  →  REPORT_READ
        //
        // NOTE: SPEC CONFLICT – NEEDS PO DECISION:
        //   Backlog ghi Admin toàn quyền, nhưng S2-05 AC quy định chỉ HR_MANAGER xem dải lương chuẩn.
        //   Theo chỉ đạo chính sách hạn chế: Không cấp SALARY_READ và SALARY_MANAGE cho Admin.
        // ----------------------------------------------------------------
        roles.put(RoleName.ADMIN, permissions(
                USER_READ,
                USER_MANAGE,
                ROLE_READ,
                ROLE_MANAGE,
                AUDIT_READ,
                CATALOG_READ,
                CATALOG_MANAGE,
                REQUISITION_CREATE,
                REQUISITION_READ_ALL,
                REQUISITION_APPROVE,
                RECRUITER_ASSIGN,
                JOB_MANAGE,
                CANDIDATE_READ_ALL,
                PIPELINE_MANAGE,
                INTERVIEW_MANAGE,
                EVALUATION_READ,
                OFFER_MANAGE,
                OFFER_APPROVE,
                ONBOARDING_MANAGE,
                NOTIFICATION_MANAGE,
                REPORT_READ
        ));

        MATRIX = Collections.unmodifiableMap(roles);
    }

    /**
     * Base permissions granted to ALL authenticated roles.
     * PROFILE_READ and PROFILE_UPDATE allow users to manage their own profile.
     * NOTIFICATION_READ_OWN allows viewing own notifications.
     */
    private static Set<Permission> permissions(Permission... permissions) {
        EnumSet<Permission> result = EnumSet.of(PROFILE_READ, PROFILE_UPDATE, NOTIFICATION_READ_OWN);
        Collections.addAll(result, permissions);
        return Collections.unmodifiableSet(result);
    }

    public static Set<Permission> forRole(RoleName role) {
        return role == null ? Set.of() : MATRIX.getOrDefault(role, Set.of());
    }

    public static Map<RoleName, Set<Permission>> all() { return MATRIX; }
}
