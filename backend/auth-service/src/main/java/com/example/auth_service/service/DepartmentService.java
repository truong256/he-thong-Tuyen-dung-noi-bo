package com.example.auth_service.service;

import com.example.auth_service.domain.sprint2.Department;
import com.example.auth_service.dto.*;
import com.example.auth_service.entity.RoleName;
import com.example.auth_service.exception.*;
import com.example.auth_service.repository.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
@PreAuthorize("hasAuthority('DEPARTMENT_MANAGE')")
public class DepartmentService {
    private final DepartmentRepository departments;
    private final UserRepository users;
    private final RecruitmentRequisitionRepository requisitions;

    public DepartmentService(DepartmentRepository departments, UserRepository users,
                             RecruitmentRequisitionRepository requisitions) {
        this.departments = departments;
        this.users = users;
        this.requisitions = requisitions;
    }

    @PreAuthorize("hasAuthority('CATALOG_READ')")
    public List<DepartmentResponse> list(Boolean active) {
        return departments.findAllByOrderByNameAscIdAsc().stream()
                .filter(d -> active == null || d.isActive() == active)
                .map(DepartmentResponse::from).toList();
    }

    @PreAuthorize("hasAuthority('CATALOG_READ')")
    public DepartmentResponse get(Long id) { return DepartmentResponse.from(requireDepartment(id)); }

    @PreAuthorize("hasAuthority('CATALOG_READ')")
    public List<DepartmentTreeNode> tree() {
        List<Department> all = departments.findAllByOrderByNameAscIdAsc();
        Map<Long, Department> byId = index(all);
        Map<Long, DepartmentTreeNode> nodes = new LinkedHashMap<>();
        for (Department department : all) {
            validateAncestry(department.getId(), department.getParentDepartmentId(), byId, false);
            nodes.put(department.getId(), new DepartmentTreeNode(DepartmentResponse.from(department), new ArrayList<>()));
        }
        List<DepartmentTreeNode> roots = new ArrayList<>();
        for (Department department : all) {
            DepartmentTreeNode node = nodes.get(department.getId());
            if (department.getParentDepartmentId() == null) roots.add(node);
            else nodes.get(department.getParentDepartmentId()).children().add(node);
        }
        return roots;
    }

    @Transactional
    public DepartmentResponse create(DepartmentRequest request) {
        lockTree();
        validateManager(request.managerUserId());
        validateUnique(request, -1L);
        validateAncestry(null, request.parentDepartmentId(), index(departments.findAll()), true);
        Department department = new Department();
        apply(department, request);
        return DepartmentResponse.from(departments.saveAndFlush(department));
    }

    @Transactional
    public DepartmentResponse update(Long id, DepartmentRequest request) {
        lockTree();
        Department department = requireDepartment(id);
        validateManager(request.managerUserId());
        validateUnique(request, id);
        validateAncestry(id, request.parentDepartmentId(), index(departments.findAll()), department.isActive());
        // Sprint 1 accounts reference departments by name/code, not by ID.
        // Do not silently orphan those links by renaming a used legacy identifier.
        if ((!department.getName().equalsIgnoreCase(request.name().trim())
                || !Objects.equals(department.getCode(), request.code().trim().toUpperCase(Locale.ROOT)))
                && hasLegacyMembers(department)) {
            throw new ConflictException("Phòng ban có tài khoản đang sử dụng tên/mã cũ. Hãy cập nhật liên kết tài khoản trước khi đổi tên/mã.");
        }
        apply(department, request);
        return DepartmentResponse.from(departments.saveAndFlush(department));
    }

    @Transactional
    public DepartmentResponse setActive(Long id, boolean active) {
        lockTree();
        Department department = requireDepartment(id);
        if (active) {
            validateManager(department.getManagerUserId());
            validateAncestry(id, department.getParentDepartmentId(), index(departments.findAll()), true);
        } else if (departments.existsByParentDepartmentIdAndActiveTrue(id)) {
            throw new ConflictException("Hãy ngừng áp dụng các phòng ban con trước khi ngừng áp dụng phòng ban cha.");
        }
        department.setActive(active);
        return DepartmentResponse.from(departments.saveAndFlush(department));
    }

    @Transactional
    public void delete(Long id) {
        lockTree();
        Department department = requireDepartment(id);
        if (requisitions.hasOpenRequisitions(id)) {
            throw new ConflictException("Không được xóa phòng ban đang có yêu cầu tuyển dụng mở. Hãy ngừng áp dụng phòng ban.");
        }
        if (requisitions.existsByDepartmentId(id) || departments.existsByParentDepartmentId(id)
                || hasLegacyMembers(department)) {
            throw new ConflictException("Phòng ban đang được sử dụng, chỉ được ngừng áp dụng thay vì xóa.");
        }
        departments.delete(department);
        departments.flush();
    }

    private void lockTree() {
        if (!Integer.valueOf(1).equals(departments.lockTree())) {
            throw new ConflictException("Chưa khởi tạo khóa sơ đồ tổ chức. Vui lòng chạy migration phòng ban.");
        }
    }

    private Department requireDepartment(Long id) {
        return departments.findById(id).orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy phòng ban."));
    }

    private void validateManager(Long id) {
        if (id == null) throw new BadRequestException("Phòng ban phải có người phụ trách.");
        var manager = users.findById(id)
                .orElseThrow(() -> new BadRequestException("Người phụ trách không tồn tại."));
        if (!"ACTIVE".equals(manager.getStatus()) || !manager.isAccountNonLocked()
                || manager.getRoles().stream().noneMatch(role -> role.getName() != RoleName.CANDIDATE)) {
            throw new BadRequestException("Người phụ trách phải là tài khoản nội bộ đang hoạt động và không bị khóa.");
        }
    }

    private void validateUnique(DepartmentRequest request, Long id) {
        if (departments.existsByNameIgnoreCaseAndIdNot(request.name().trim(), id)) {
            throw new ConflictException("Tên phòng ban đã tồn tại.");
        }
        if (departments.existsByCodeIgnoreCaseAndIdNot(request.code().trim(), id)) {
            throw new ConflictException("Mã phòng ban đã tồn tại.");
        }
    }

    private void validateAncestry(Long id, Long parentId, Map<Long, Department> byId, boolean requireActive) {
        Set<Long> visited = new HashSet<>();
        if (id != null) visited.add(id);
        while (parentId != null) {
            if (!visited.add(parentId)) throw new ConflictException("Quan hệ phòng ban cha-con không được tạo vòng lặp.");
            Department parent = byId.get(parentId);
            if (parent == null) throw new BadRequestException("Phòng ban cha không tồn tại.");
            if (requireActive && !parent.isActive()) {
                throw new ConflictException("Không thể áp dụng phòng ban dưới phòng ban cha đã ngừng áp dụng.");
            }
            parentId = parent.getParentDepartmentId();
        }
    }

    private boolean hasLegacyMembers(Department department) {
        return users.existsByDepartmentIgnoreCase(department.getName())
                || (department.getCode() != null && users.existsByDepartmentIgnoreCase(department.getCode()));
    }

    private Map<Long, Department> index(List<Department> all) {
        return all.stream().collect(Collectors.toMap(d -> d.getId(), Function.identity()));
    }

    private void apply(Department department, DepartmentRequest request) {
        department.setName(request.name().trim());
        department.setCode(request.code().trim().toUpperCase(Locale.ROOT));
        department.setDescription(request.description() == null ? null : request.description().trim());
        department.setParentDepartmentId(request.parentDepartmentId());
        department.setManagerUserId(request.managerUserId());
    }
}
