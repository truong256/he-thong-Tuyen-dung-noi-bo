package com.example.auth_service.service;

import com.example.auth_service.domain.sprint2.Department;
import com.example.auth_service.dto.DepartmentRequest;
import com.example.auth_service.entity.*;
import com.example.auth_service.exception.*;
import com.example.auth_service.repository.*;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;
import java.util.*;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class DepartmentServiceTest {
    @Mock DepartmentRepository departments;
    @Mock UserRepository users;
    @Mock RecruitmentRequisitionRepository requisitions;
    @InjectMocks DepartmentService service;
    Department root, child, leaf;
    User manager;

    @BeforeEach
    void fixtures() {
        root = department(1L, null);
        child = department(2L, 1L);
        leaf = department(3L, 2L);
        manager = new User("manager@example.com", "test", "HIRING_MANAGER");
        manager.setId(10L);
    }

    @Test
    void buildsThreeLevelsAndKeepsInactiveNodes() {
        leaf.setActive(false);
        when(departments.findAllByOrderByNameAscIdAsc()).thenReturn(List.of(root, child, leaf));
        var tree = service.tree();
        assertThat(tree).hasSize(1);
        assertThat(tree.getFirst().children().getFirst().children().getFirst().department().id()).isEqualTo(3L);
        assertThat(tree.getFirst().children().getFirst().children().getFirst().department().active()).isFalse();
        assertThat(service.list(true)).hasSize(2);
        assertThat(service.list(false)).hasSize(1);
        assertThat(service.list(null)).hasSize(3);
    }

    @Test
    void corruptLegacyTreeFailsWithoutRecursingForever() {
        root.setParentDepartmentId(3L);
        when(departments.findAllByOrderByNameAscIdAsc()).thenReturn(List.of(root, child, leaf));
        assertThatThrownBy(service::tree).isInstanceOf(ConflictException.class);
    }

    @Test
    void missingParentInLegacyTreeIsReported() {
        when(departments.findAllByOrderByNameAscIdAsc()).thenReturn(List.of(child));
        assertThatThrownBy(service::tree).isInstanceOf(BadRequestException.class);
    }

    @Test
    void createsActiveRootWithNormalizedFieldsAndManager() {
        when(departments.lockTree()).thenReturn(1);
        when(users.findById(10L)).thenReturn(Optional.of(manager));
        when(departments.saveAndFlush(any())).thenAnswer(invocation -> invocation.getArgument(0));
        var created = service.create(new DepartmentRequest("  Engineering  ", "eng", " description ", null, 10L));
        assertThat(created.name()).isEqualTo("Engineering");
        assertThat(created.code()).isEqualTo("ENG");
        assertThat(created.description()).isEqualTo("description");
        assertThat(created.managerUserId()).isEqualTo(10L);
        assertThat(created.active()).isTrue();
        var order = inOrder(departments, users);
        order.verify(departments).lockTree();
        order.verify(users).findById(10L);
    }

    @Test
    void missingMutexFailsClosed() {
        assertThatThrownBy(() -> service.create(request(null))).isInstanceOf(ConflictException.class);
        verify(departments, never()).saveAndFlush(any());
    }

    @Test
    void missingManagerIsRejected() {
        when(departments.lockTree()).thenReturn(1);
        assertThatThrownBy(() -> service.create(new DepartmentRequest("Name", "CODE", null, null, null)))
                .isInstanceOf(BadRequestException.class);
        assertThatThrownBy(() -> service.create(request(null))).isInstanceOf(BadRequestException.class);
    }

    @ParameterizedTest
    @ValueSource(strings = {"INACTIVE", "LOCKED"})
    void inactiveManagerIsRejected(String status) {
        when(departments.lockTree()).thenReturn(1);
        manager.setStatus(status);
        when(users.findById(10L)).thenReturn(Optional.of(manager));
        assertThatThrownBy(() -> service.create(request(null))).isInstanceOf(BadRequestException.class);
    }

    @Test
    void candidateOrRolelessOrTemporarilyLockedManagerIsRejected() {
        when(departments.lockTree()).thenReturn(1);
        when(users.findById(10L)).thenReturn(Optional.of(manager));
        manager.setRole("CANDIDATE");
        assertThatThrownBy(() -> service.create(request(null))).isInstanceOf(BadRequestException.class);
        manager.setRoles(Set.of());
        assertThatThrownBy(() -> service.create(request(null))).isInstanceOf(BadRequestException.class);
        manager.setRole("HIRING_MANAGER");
        manager.setLockedUntil(java.time.Instant.now().plusSeconds(900));
        assertThatThrownBy(() -> service.create(request(null))).isInstanceOf(BadRequestException.class);
    }

    @Test
    void duplicateNameAndCodeAreRejected() {
        when(departments.lockTree()).thenReturn(1);
        when(users.findById(10L)).thenReturn(Optional.of(manager));
        when(departments.existsByNameIgnoreCaseAndIdNot("Updated", -1L)).thenReturn(true);
        assertThatThrownBy(() -> service.create(request(null))).isInstanceOf(ConflictException.class).hasMessageContaining("Tên");
        when(departments.existsByNameIgnoreCaseAndIdNot("Updated", -1L)).thenReturn(false);
        when(departments.existsByCodeIgnoreCaseAndIdNot("UPDATED", -1L)).thenReturn(true);
        assertThatThrownBy(() -> service.create(request(null))).isInstanceOf(ConflictException.class).hasMessageContaining("Mã");
    }

    @Test
    void inactiveOrMissingParentIsRejected() {
        when(departments.lockTree()).thenReturn(1);
        when(users.findById(10L)).thenReturn(Optional.of(manager));
        assertThatThrownBy(() -> service.create(request(999L))).isInstanceOf(BadRequestException.class);
        root.setActive(false);
        when(departments.findAll()).thenReturn(List.of(root));
        assertThatThrownBy(() -> service.create(request(1L))).isInstanceOf(ConflictException.class);
    }

    @Test
    void rejectsSelfParentAndMovingUnderDescendant() {
        stubUpdate();
        assertThatThrownBy(() -> service.update(1L, request(1L))).isInstanceOf(ConflictException.class);
        assertThatThrownBy(() -> service.update(1L, request(3L))).isInstanceOf(ConflictException.class);
        verify(departments, never()).saveAndFlush(any());
    }

    @Test
    void updatesOwnerAndCanMoveNodeToRoot() {
        stubUpdate();
        when(departments.saveAndFlush(root)).thenReturn(root);
        root.setParentDepartmentId(2L);
        var updated = service.update(1L, request(null));
        assertThat(updated.parentDepartmentId()).isNull();
        assertThat(updated.managerUserId()).isEqualTo(10L);
    }

    @Test
    void cannotRenameLegacyDepartmentStillReferencedByAccount() {
        stubUpdate();
        when(users.existsByDepartmentIgnoreCase(root.getName())).thenReturn(true);
        assertThatThrownBy(() -> service.update(1L, request(null))).isInstanceOf(ConflictException.class);
    }

    @Test
    void blocksDeletingOpenRequisitionDepartment() {
        stubExisting();
        when(requisitions.hasOpenRequisitions(1L)).thenReturn(true);
        assertThatThrownBy(() -> service.delete(1L)).isInstanceOf(ConflictException.class).hasMessageContaining("mở");
        verify(departments, never()).delete(any());
    }

    @Test
    void blocksDeletingDepartmentWithClosedHistory() {
        stubExisting();
        when(requisitions.existsByDepartmentId(1L)).thenReturn(true);
        assertThatThrownBy(() -> service.delete(1L)).isInstanceOf(ConflictException.class);
    }

    @Test
    void blocksDeletingParentOrDepartmentWithLegacyMembers() {
        stubExisting();
        when(departments.existsByParentDepartmentId(1L)).thenReturn(true);
        assertThatThrownBy(() -> service.delete(1L)).isInstanceOf(ConflictException.class);
        when(departments.existsByParentDepartmentId(1L)).thenReturn(false);
        when(users.existsByDepartmentIgnoreCase(root.getName())).thenReturn(false);
        when(users.existsByDepartmentIgnoreCase(root.getCode())).thenReturn(true);
        assertThatThrownBy(() -> service.delete(1L)).isInstanceOf(ConflictException.class);
    }

    @Test
    void deletesUnusedLeafOnly() {
        stubExisting();
        service.delete(1L);
        verify(departments).delete(root);
        verify(departments).flush();
    }

    @Test
    void cannotDeactivateParentWithActiveChildren() {
        stubExisting();
        when(departments.existsByParentDepartmentIdAndActiveTrue(1L)).thenReturn(true);
        assertThatThrownBy(() -> service.setActive(1L, false)).isInstanceOf(ConflictException.class);
        assertThat(root.isActive()).isTrue();
    }

    @Test
    void deactivationRetainsDataEvenWithRecruitmentHistory() {
        stubExisting();
        when(departments.saveAndFlush(root)).thenReturn(root);
        assertThat(service.setActive(1L, false).active()).isFalse();
        assertThat(root.getManagerUserId()).isEqualTo(10L);
        verifyNoInteractions(requisitions);
        verify(departments, never()).delete(any());
    }

    @Test
    void reactivationValidatesOwnerAndAncestors() {
        stubExisting();
        root.setActive(false);
        when(users.findById(10L)).thenReturn(Optional.of(manager));
        when(departments.findAll()).thenReturn(List.of(root));
        when(departments.saveAndFlush(root)).thenReturn(root);
        assertThat(service.setActive(1L, true).active()).isTrue();
    }

    @Test
    void missingDepartmentReturnsNotFound() {
        assertThatThrownBy(() -> service.get(999L)).isInstanceOf(ResourceNotFoundException.class);
    }

    private void stubExisting() {
        when(departments.lockTree()).thenReturn(1);
        when(departments.findById(1L)).thenReturn(Optional.of(root));
    }
    private void stubUpdate() {
        stubExisting();
        when(users.findById(10L)).thenReturn(Optional.of(manager));
        when(departments.findAll()).thenReturn(List.of(root, child, leaf));
    }
    private DepartmentRequest request(Long parentId) {
        return new DepartmentRequest("Updated", "UPDATED", null, parentId, 10L);
    }
    private Department department(Long id, Long parentId) {
        Department department = new Department();
        department.setId(id);
        department.setName("Department " + id);
        department.setCode("D" + id);
        department.setManagerUserId(10L);
        department.setParentDepartmentId(parentId);
        return department;
    }
}
