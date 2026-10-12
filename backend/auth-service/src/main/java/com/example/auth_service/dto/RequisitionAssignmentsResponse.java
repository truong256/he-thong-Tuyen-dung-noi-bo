package com.example.auth_service.dto;

import java.util.List;

public record RequisitionAssignmentsResponse(
        Long requisitionId,
        String requisitionCode,
        String requisitionTitle,
        AssignmentMemberDto primaryRecruiter,
        List<AssignmentMemberDto> supportRecruiters,
        List<AssignmentMemberDto> hiringManagers
) {}
