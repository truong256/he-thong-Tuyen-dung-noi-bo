package com.example.auth_service.service;

import com.example.auth_service.domain.sprint2.Department;
import com.example.auth_service.dto.ApprovalConfigurationRequest;
import com.example.auth_service.dto.ApprovalConfigurationResponse;
import com.example.auth_service.entity.RequisitionApprovalConfiguration;
import com.example.auth_service.entity.RequisitionApprovalConfigurationStep;
import com.example.auth_service.entity.RoleName;
import com.example.auth_service.entity.User;
import com.example.auth_service.exception.BadRequestException;
import com.example.auth_service.exception.ConflictException;
import com.example.auth_service.exception.ResourceNotFoundException;
import com.example.auth_service.repository.DepartmentRepository;
import com.example.auth_service.repository.RequisitionApprovalConfigurationRepository;
import com.example.auth_service.repository.RequisitionApprovalConfigurationStepRepository;
import com.example.auth_service.repository.UserRepository;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Service
@PreAuthorize("hasRole('HR_MANAGER')")
@Transactional
public class RequisitionApprovalConfigurationService {
    private final RequisitionApprovalConfigurationRepository configurations;
    private final RequisitionApprovalConfigurationStepRepository configurationSteps;
    private final DepartmentRepository departments;
    private final UserRepository users;

    public RequisitionApprovalConfigurationService(
            RequisitionApprovalConfigurationRepository configurations,
            RequisitionApprovalConfigurationStepRepository configurationSteps,
            DepartmentRepository departments,
            UserRepository users
    ) {
        this.configurations = configurations;
        this.configurationSteps = configurationSteps;
        this.departments = departments;
        this.users = users;
    }

    public List<ApprovalConfigurationResponse> list(Long departmentId) {
        List<RequisitionApprovalConfiguration> results = departmentId == null
                ? configurations.findAllByOrderByDepartmentIdAscVersionDesc()
                : configurations.findAllByDepartmentIdOrderByVersionDesc(departmentId);
        return results.stream().map(this::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public ApprovalConfigurationResponse get(Long id) {
        return toResponse(findConfiguration(id));
    }

    public ApprovalConfigurationResponse create(ApprovalConfigurationRequest request) {
        Department department = requireActiveDepartment(request.departmentId());
        validateSteps(request.steps());
        if (configurations.findByDepartmentIdAndActiveTrue(department.getId()).isPresent()) {
            throw new ConflictException("Phòng ban đã có cấu hình phê duyệt đang hoạt động.");
        }

        int nextVersion = configurations.findFirstByDepartmentIdOrderByVersionDesc(department.getId())
                .map(configuration -> configuration.getVersion() + 1)
                .orElse(1);
        return createVersion(department, nextVersion, request.steps());
    }

    public ApprovalConfigurationResponse update(Long id, ApprovalConfigurationRequest request) {
        RequisitionApprovalConfiguration current = findConfiguration(id);
        if (!current.isActive()) {
            throw new ConflictException("Chỉ có thể sửa cấu hình đang hoạt động.");
        }
        if (!current.getDepartmentId().equals(request.departmentId())) {
            throw new BadRequestException("Không thể chuyển cấu hình sang phòng ban khác.");
        }
        Department department = requireActiveDepartment(current.getDepartmentId());
        validateSteps(request.steps());

        current.setActive(false);
        current.setDeactivatedAt(Instant.now());
        configurations.save(current);

        return createVersion(department, current.getVersion() + 1, request.steps());
    }

    public void deactivate(Long id) {
        RequisitionApprovalConfiguration configuration = findConfiguration(id);
        if (configuration.isActive()) {
            configuration.setActive(false);
            configuration.setDeactivatedAt(Instant.now());
            configurations.save(configuration);
        }
    }

    private ApprovalConfigurationResponse createVersion(
            Department department,
            int version,
            List<ApprovalConfigurationRequest.ApprovalStepRequest> steps
    ) {
        RequisitionApprovalConfiguration configuration = new RequisitionApprovalConfiguration();
        configuration.setDepartmentId(department.getId());
        configuration.setVersion(version);
        configuration.setActive(true);
        configuration.setCreatedByUserId(currentUserId());
        configuration.setCreatedAt(Instant.now());
        configuration = configurations.saveAndFlush(configuration);

        List<RequisitionApprovalConfigurationStep> savedSteps = new ArrayList<>();
        for (int index = 0; index < steps.size(); index++) {
            ApprovalConfigurationRequest.ApprovalStepRequest requestStep = steps.get(index);
            RequisitionApprovalConfigurationStep step = new RequisitionApprovalConfigurationStep();
            step.setConfigurationId(configuration.getId());
            step.setStepOrder(index + 1);
            step.setMinimumSalary(requestStep.minimumSalary());
            step.setApproverUserId(requestStep.approverUserId());
            savedSteps.add(step);
        }
        configurationSteps.saveAll(savedSteps);
        return toResponse(configuration, department, savedSteps);
    }

    private void validateSteps(List<ApprovalConfigurationRequest.ApprovalStepRequest> steps) {
        if (steps == null || steps.isEmpty()) {
            throw new BadRequestException("Cấu hình phải có ít nhất một cấp phê duyệt.");
        }
        if (steps.getFirst() == null || steps.getFirst().minimumSalary() == null || steps.getFirst().minimumSalary() != 0) {
            throw new BadRequestException("Cấp phê duyệt đầu tiên phải áp dụng từ mức lương 0.");
        }

        long previousMinimum = -1;
        Set<Long> approverIds = new HashSet<>();
        for (ApprovalConfigurationRequest.ApprovalStepRequest step : steps) {
            if (step == null || step.minimumSalary() == null || step.minimumSalary() < 0 || step.approverUserId() == null) {
                throw new BadRequestException("Mỗi cấp cần có ngưỡng lương không âm và người phê duyệt.");
            }
            if (step.minimumSalary() <= previousMinimum) {
                throw new BadRequestException("Ngưỡng lương các cấp phải tăng dần và không trùng nhau.");
            }
            previousMinimum = step.minimumSalary();
            if (!approverIds.add(step.approverUserId())) {
                throw new BadRequestException("Một người không thể được cấu hình ở nhiều cấp phê duyệt.");
            }
            User approver = users.findById(step.approverUserId())
                    .orElseThrow(() -> new BadRequestException("Người phê duyệt không tồn tại."));
            boolean hasApprovalRole = approver.getRoles().stream()
                    .anyMatch(role -> role.getName() == RoleName.APPROVER || role.getName() == RoleName.HR_MANAGER);
            if (!"ACTIVE".equals(approver.getStatus()) || !hasApprovalRole) {
                throw new BadRequestException("Người phê duyệt phải đang hoạt động và có vai trò APPROVER hoặc HR_MANAGER.");
            }
        }
    }

    private Department requireActiveDepartment(Long departmentId) {
        Department department = departments.findById(departmentId)
                .orElseThrow(() -> new BadRequestException("Phòng ban không tồn tại."));
        if (!department.isActive()) {
            throw new BadRequestException("Không thể cấu hình phê duyệt cho phòng ban đã ngừng áp dụng.");
        }
        return department;
    }

    private RequisitionApprovalConfiguration findConfiguration(Long id) {
        return configurations.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy cấu hình phê duyệt."));
    }

    private Long currentUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new BadRequestException("Vui lòng đăng nhập để thực hiện chức năng này.");
        }
        return users.findByEmail(authentication.getName())
                .map(User::getId)
                .orElseThrow(() -> new BadRequestException("Không tìm thấy tài khoản HR Manager đang đăng nhập."));
    }

    private ApprovalConfigurationResponse toResponse(RequisitionApprovalConfiguration configuration) {
        Department department = departments.findById(configuration.getDepartmentId()).orElse(null);
        List<RequisitionApprovalConfigurationStep> steps = configurationSteps
                .findAllByConfigurationIdOrderByStepOrderAsc(configuration.getId());
        return toResponse(configuration, department, steps);
    }

    private ApprovalConfigurationResponse toResponse(
            RequisitionApprovalConfiguration configuration,
            Department department,
            List<RequisitionApprovalConfigurationStep> steps
    ) {
        List<ApprovalConfigurationResponse.ApprovalStepResponse> stepResponses = steps.stream()
                .map(step -> new ApprovalConfigurationResponse.ApprovalStepResponse(
                        step.getStepOrder(),
                        step.getMinimumSalary(),
                        step.getApproverUserId(),
                        users.findById(step.getApproverUserId()).map(User::getFullName).orElse(null)
                ))
                .toList();
        return new ApprovalConfigurationResponse(
                configuration.getId(),
                configuration.getDepartmentId(),
                department != null ? department.getName() : null,
                configuration.getVersion(),
                configuration.isActive(),
                configuration.getCreatedAt(),
                configuration.getDeactivatedAt(),
                stepResponses
        );
    }
}