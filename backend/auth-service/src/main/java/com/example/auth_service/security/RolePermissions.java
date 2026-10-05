package com.example.auth_service.security;

import com.example.auth_service.entity.RoleName;
import java.util.*;
import static com.example.auth_service.security.Permission.*;

public final class RolePermissions {
    private RolePermissions() {}

    private static final Map<RoleName, Set<Permission>> MATRIX;
    static {
        Map<RoleName, Set<Permission>> roles = new EnumMap<>(RoleName.class);
        roles.put(RoleName.CANDIDATE, permissions(APPLICATION_CREATE, CANDIDATE_READ_OWN,
                OFFER_READ_OWN, OFFER_RESPOND));
        roles.put(RoleName.RECRUITER, permissions(CATALOG_READ, SALARY_READ, JOB_MANAGE,
                CANDIDATE_READ_ASSIGNED, PIPELINE_MANAGE, INTERVIEW_MANAGE, OFFER_MANAGE, ONBOARDING_MANAGE));
        roles.put(RoleName.HIRING_MANAGER, permissions(CATALOG_READ, SALARY_READ, REQUISITION_CREATE,
                REQUISITION_READ_OWN, CANDIDATE_READ_ASSIGNED, INTERVIEW_READ_ASSIGNED, EVALUATION_SUBMIT));
        roles.put(RoleName.INTERVIEWER, permissions(CATALOG_READ, CANDIDATE_READ_ASSIGNED,
                INTERVIEW_READ_ASSIGNED, EVALUATION_SUBMIT));
        roles.put(RoleName.HR_MANAGER, permissions(DEPARTMENT_MANAGE, CATALOG_READ, CATALOG_MANAGE, SALARY_READ,
                SALARY_MANAGE, REQUISITION_READ_ALL, REQUISITION_APPROVE, RECRUITER_ASSIGN,
                JOB_MANAGE, CANDIDATE_READ_ALL, PIPELINE_MANAGE, INTERVIEW_MANAGE, OFFER_MANAGE,
                OFFER_APPROVE, ONBOARDING_MANAGE, NOTIFICATION_MANAGE, REPORT_READ));
        roles.put(RoleName.APPROVER, permissions(SALARY_READ, REQUISITION_APPROVE, OFFER_APPROVE));
        roles.put(RoleName.ADMIN, permissions(USER_READ, USER_MANAGE, ROLE_READ, ROLE_MANAGE,
                AUDIT_READ, CATALOG_READ, CATALOG_MANAGE, SALARY_READ, SALARY_MANAGE,
                RECRUITER_ASSIGN, CANDIDATE_READ_ALL));
        MATRIX = Collections.unmodifiableMap(roles);
    }

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
