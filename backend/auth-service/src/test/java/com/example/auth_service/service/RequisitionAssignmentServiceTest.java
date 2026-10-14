package com.example.auth_service.service;

import com.example.auth_service.domain.sprint2.RecruitmentRequisition;
import com.example.auth_service.dto.AssignRecruiterPayload;
import com.example.auth_service.dto.AssignmentHistoryDto;
import com.example.auth_service.dto.RequisitionAssignmentsResponse;
import com.example.auth_service.entity.*;
import com.example.auth_service.exception.BadRequestException;
import com.example.auth_service.exception.ResourceNotFoundException;
import com.example.auth_service.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class RequisitionAssignmentServiceTest {

    @Mock
    private RequisitionAssignmentRepository assignments;

    @Mock
    private RequisitionAssignmentHistoryRepository assignmentHistories;

    @Mock
    private RecruitmentRequisitionRepository requisitions;

    @Mock
    private UserRepository users;

    @InjectMocks
    private RequisitionAssignmentService service;

    private RecruitmentRequisition testRequisition;
    private User primaryRecruiter;
    private User supportRecruiter1;
    private User supportRecruiter2;
    private Role recruiterRole;

    @BeforeEach
    void setUp() {
        recruiterRole = new Role(RoleName.RECRUITER, "Recruiter");

        testRequisition = new RecruitmentRequisition();
        testRequisition.setId(10L);
        testRequisition.setRequisitionCode("REQ-2026-001");
        testRequisition.setTitle("Senior Java Backend Engineer");

        primaryRecruiter = new User();
        primaryRecruiter.setId(1L);
        primaryRecruiter.setFullName("Nguyen Van Lead");
        primaryRecruiter.setEmail("lead@company.test");
        primaryRecruiter.setStatus("ACTIVE");
        primaryRecruiter.setRoles(Set.of(recruiterRole));

        supportRecruiter1 = new User();
        supportRecruiter1.setId(2L);
        supportRecruiter1.setFullName("Tran Thi Support");
        supportRecruiter1.setEmail("support1@company.test");
        supportRecruiter1.setStatus("ACTIVE");
        supportRecruiter1.setRoles(Set.of(recruiterRole));

        supportRecruiter2 = new User();
        supportRecruiter2.setId(3L);
        supportRecruiter2.setFullName("Le Van Assistant");
        supportRecruiter2.setEmail("support2@company.test");
        supportRecruiter2.setStatus("ACTIVE");
        supportRecruiter2.setRoles(Set.of(recruiterRole));
    }

    @Test
    @DisplayName("SCRUM-131: Phân công một recruiter chính và hai recruiter hỗ trợ thành công")
    void testAssignRecruiters_InitialAssignment_Success() {
        when(requisitions.findById(10L)).thenReturn(Optional.of(testRequisition));
        when(users.findById(1L)).thenReturn(Optional.of(primaryRecruiter));
        when(users.findById(2L)).thenReturn(Optional.of(supportRecruiter1));
        when(users.findById(3L)).thenReturn(Optional.of(supportRecruiter2));

        when(assignments.findByRequisitionIdAndRoleAndIsPrimaryTrue(10L, RoleName.RECRUITER))
                .thenReturn(Optional.empty());
        when(assignments.findByRequisitionIdAndRole(10L, RoleName.RECRUITER))
                .thenReturn(Collections.emptyList());

        when(assignments.findByRequisitionIdAndUserId(10L, 1L)).thenReturn(Optional.empty());
        when(assignments.findByRequisitionIdAndUserId(10L, 2L)).thenReturn(Optional.empty());
        when(assignments.findByRequisitionIdAndUserId(10L, 3L)).thenReturn(Optional.empty());

        RequisitionAssignment savedPrimary = new RequisitionAssignment();
        savedPrimary.setId(101L);
        savedPrimary.setRequisitionId(10L);
        savedPrimary.setUserId(1L);
        savedPrimary.setRole(RoleName.RECRUITER);
        savedPrimary.setPrimary(true);

        RequisitionAssignment savedSup1 = new RequisitionAssignment();
        savedSup1.setId(102L);
        savedSup1.setRequisitionId(10L);
        savedSup1.setUserId(2L);
        savedSup1.setRole(RoleName.RECRUITER);
        savedSup1.setPrimary(false);

        RequisitionAssignment savedSup2 = new RequisitionAssignment();
        savedSup2.setId(103L);
        savedSup2.setRequisitionId(10L);
        savedSup2.setUserId(3L);
        savedSup2.setRole(RoleName.RECRUITER);
        savedSup2.setPrimary(false);

        when(assignments.findByRequisitionId(10L))
                .thenReturn(List.of(savedPrimary, savedSup1, savedSup2));

        AssignRecruiterPayload payload = new AssignRecruiterPayload(
                1L,
                List.of(2L, 3L),
                "Phân công đợt tuyển dụng Q4",
                "Phụ trách toàn bộ pipeline"
        );

        RequisitionAssignmentsResponse res = service.assignRecruiters(10L, payload);

        assertThat(res).isNotNull();
        assertThat(res.primaryRecruiter()).isNotNull();
        assertThat(res.primaryRecruiter().userId()).isEqualTo(1L);
        assertThat(res.primaryRecruiter().isPrimary()).isTrue();
        assertThat(res.supportRecruiters()).hasSize(2);

        // Verify that assignments were saved
        verify(assignments, times(3)).save(any(RequisitionAssignment.class));

        // Verify that history was recorded for all 3 recruiters
        ArgumentCaptor<RequisitionAssignmentHistory> histCaptor =
                ArgumentCaptor.forClass(RequisitionAssignmentHistory.class);
        verify(assignmentHistories, times(3)).save(histCaptor.capture());

        List<RequisitionAssignmentHistory> recorded = histCaptor.getAllValues();
        assertThat(recorded).anyMatch(h -> h.getUserId().equals(1L) && "PRIMARY".equals(h.getAssignmentType()) && "ASSIGNED".equals(h.getAction()));
        assertThat(recorded).anyMatch(h -> h.getUserId().equals(2L) && "SUPPORT".equals(h.getAssignmentType()) && "ASSIGNED".equals(h.getAction()));
        assertThat(recorded).anyMatch(h -> h.getUserId().equals(3L) && "SUPPORT".equals(h.getAssignmentType()) && "ASSIGNED".equals(h.getAction()));
    }

    @Test
    @DisplayName("SCRUM-132: Đổi recruiter chính phải lưu lịch sử chuyển giao (Handover) và người cũ thành hỗ trợ")
    void testAssignRecruiters_HandoverToNewPrimary_RecordsHistory() {
        when(requisitions.findById(10L)).thenReturn(Optional.of(testRequisition));
        when(users.findById(2L)).thenReturn(Optional.of(supportRecruiter1)); // new primary: ID 2
        when(users.findById(1L)).thenReturn(Optional.of(primaryRecruiter));     // old primary becomes support: ID 1

        RequisitionAssignment existingPrimary = new RequisitionAssignment();
        existingPrimary.setId(101L);
        existingPrimary.setRequisitionId(10L);
        existingPrimary.setUserId(1L);
        existingPrimary.setRole(RoleName.RECRUITER);
        existingPrimary.setPrimary(true);

        when(assignments.findByRequisitionIdAndRoleAndIsPrimaryTrue(10L, RoleName.RECRUITER))
                .thenReturn(Optional.of(existingPrimary));

        when(assignments.findByRequisitionIdAndUserId(10L, 2L)).thenReturn(Optional.empty());
        when(assignments.findByRequisitionIdAndUserId(10L, 1L)).thenReturn(Optional.of(existingPrimary));

        when(assignments.findByRequisitionIdAndRole(10L, RoleName.RECRUITER))
                .thenReturn(List.of(existingPrimary));

        when(assignments.findByRequisitionId(10L))
                .thenReturn(List.of(
                        new RequisitionAssignment() {{
                            setId(102L); setRequisitionId(10L); setUserId(2L); setRole(RoleName.RECRUITER); setPrimary(true);
                        }},
                        new RequisitionAssignment() {{
                            setId(101L); setRequisitionId(10L); setUserId(1L); setRole(RoleName.RECRUITER); setPrimary(false);
                        }}
                ));

        AssignRecruiterPayload payload = new AssignRecruiterPayload(
                2L,
                List.of(1L),
                "Bàn giao công việc do nhân sự nghỉ thai sản",
                "Bàn giao danh sách ứng viên"
        );

        RequisitionAssignmentsResponse res = service.assignRecruiters(10L, payload);

        assertThat(res.primaryRecruiter().userId()).isEqualTo(2L);
        assertThat(res.supportRecruiters()).hasSize(1);
        assertThat(res.supportRecruiters().get(0).userId()).isEqualTo(1L);

        // Verify Handover history
        ArgumentCaptor<RequisitionAssignmentHistory> histCaptor =
                ArgumentCaptor.forClass(RequisitionAssignmentHistory.class);
        verify(assignmentHistories, atLeastOnce()).save(histCaptor.capture());

        assertThat(histCaptor.getAllValues()).anyMatch(h ->
                h.getUserId().equals(2L) &&
                        "HANDOVER".equals(h.getAction()) &&
                        Long.valueOf(1L).equals(h.getPreviousUserId()) &&
                        "Bàn giao công việc do nhân sự nghỉ thai sản".equals(h.getReason())
        );
    }

    @Test
    @DisplayName("SCRUM-132: Thu hồi phân công (Unassign) ghi nhận lịch sử và không xóa lịch sử cũ")
    void testUnassign_RecordsHistoryAndDeletesActiveAssignmentOnly() {
        RequisitionAssignment assignment = new RequisitionAssignment();
        assignment.setId(101L);
        assignment.setRequisitionId(10L);
        assignment.setUserId(2L);
        assignment.setRole(RoleName.RECRUITER);
        assignment.setPrimary(false);

        when(assignments.findByRequisitionIdAndUserId(10L, 2L)).thenReturn(Optional.of(assignment));

        service.unassign(10L, 2L, "Rút khỏi dự án");

        verify(assignments).delete(assignment);

        ArgumentCaptor<RequisitionAssignmentHistory> histCaptor =
                ArgumentCaptor.forClass(RequisitionAssignmentHistory.class);
        verify(assignmentHistories).save(histCaptor.capture());

        RequisitionAssignmentHistory hist = histCaptor.getValue();
        assertThat(hist.getUserId()).isEqualTo(2L);
        assertThat(hist.getAction()).isEqualTo("UNASSIGNED");
        assertThat(hist.getReason()).isEqualTo("Rút khỏi dự án");
    }

    @Test
    @DisplayName("SCRUM-131: Kiểm tra ràng buộc - Báo lỗi khi user không có role RECRUITER")
    void testAssignRecruiters_FailsWhenUserNotRecruiter() {
        User candidateUser = new User();
        candidateUser.setId(99L);
        candidateUser.setStatus("ACTIVE");
        candidateUser.setRoles(Set.of(new Role(RoleName.CANDIDATE, "Candidate")));

        when(requisitions.findById(10L)).thenReturn(Optional.of(testRequisition));
        when(users.findById(99L)).thenReturn(Optional.of(candidateUser));

        AssignRecruiterPayload payload = new AssignRecruiterPayload(99L, null, null, null);

        assertThatThrownBy(() -> service.assignRecruiters(10L, payload))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("phải có vai trò RECRUITER");
    }

    @Test
    @DisplayName("SCRUM-131: Kiểm tra ràng buộc - Báo lỗi khi user bị LOCKED hoặc không ACTIVE")
    void testAssignRecruiters_FailsWhenUserInactive() {
        primaryRecruiter.setStatus("LOCKED");
        when(requisitions.findById(10L)).thenReturn(Optional.of(testRequisition));
        when(users.findById(1L)).thenReturn(Optional.of(primaryRecruiter));

        AssignRecruiterPayload payload = new AssignRecruiterPayload(1L, null, null, null);

        assertThatThrownBy(() -> service.assignRecruiters(10L, payload))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("phải ở trạng thái đang hoạt động");
    }

    @Test
    @DisplayName("SCRUM-131: Báo lỗi khi Requisition không tồn tại")
    void testAssignRecruiters_RequisitionNotFound() {
        when(requisitions.findById(999L)).thenReturn(Optional.empty());

        AssignRecruiterPayload payload = new AssignRecruiterPayload(1L, null, null, null);

        assertThatThrownBy(() -> service.assignRecruiters(999L, payload))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    @DisplayName("SCRUM-132: Lấy lịch sử chuyển giao trả về danh sách có tên đầy đủ của các bên liên quan")
    void testGetAssignmentHistory_ReturnsEnrichedList() {
        when(requisitions.existsById(10L)).thenReturn(true);

        RequisitionAssignmentHistory h1 = RequisitionAssignmentHistory.builder()
                .id(1L)
                .requisitionId(10L)
                .userId(2L)
                .previousUserId(1L)
                .role(RoleName.RECRUITER)
                .assignmentType("PRIMARY")
                .action("HANDOVER")
                .reason("Điều chuyển bộ phận")
                .createdAt(Instant.now())
                .build();

        when(assignmentHistories.findByRequisitionIdOrderByCreatedAtDesc(10L))
                .thenReturn(List.of(h1));
        when(users.findById(2L)).thenReturn(Optional.of(supportRecruiter1));
        when(users.findById(1L)).thenReturn(Optional.of(primaryRecruiter));

        List<AssignmentHistoryDto> history = service.getAssignmentHistory(10L);

        assertThat(history).hasSize(1);
        assertThat(history.get(0).userFullName()).isEqualTo("Tran Thi Support");
        assertThat(history.get(0).previousUserFullName()).isEqualTo("Nguyen Van Lead");
        assertThat(history.get(0).action()).isEqualTo("HANDOVER");
    }
}
