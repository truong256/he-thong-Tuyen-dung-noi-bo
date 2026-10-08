package com.example.auth_service.service;

import com.example.auth_service.domain.sprint2.Department;
import com.example.auth_service.domain.sprint2.JobTitle;
import com.example.auth_service.dto.JobTitleRequest;
import com.example.auth_service.dto.JobTitleResponse;
import com.example.auth_service.exception.BadRequestException;
import com.example.auth_service.exception.ConflictException;
import com.example.auth_service.exception.ResourceNotFoundException;
import com.example.auth_service.repository.CompetencyFrameworkRepository;
import com.example.auth_service.repository.DepartmentRepository;
import com.example.auth_service.repository.JobTitleRepository;
import com.example.auth_service.repository.RecruitmentRequisitionRepository;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.*;

@Service
@Transactional
public class JobTitleService {

    private final JobTitleRepository repository;
    private final DepartmentRepository departmentRepository;
    private final RecruitmentRequisitionRepository requisitionRepository;
    private final CompetencyFrameworkRepository competencyFrameworkRepository;

    public JobTitleService(
            JobTitleRepository repository,
            DepartmentRepository departmentRepository,
            RecruitmentRequisitionRepository requisitionRepository,
            CompetencyFrameworkRepository competencyFrameworkRepository
    ) {
        this.repository = repository;
        this.departmentRepository = departmentRepository;
        this.requisitionRepository = requisitionRepository;
        this.competencyFrameworkRepository = competencyFrameworkRepository;
    }

    @Transactional(readOnly = true)
    @PreAuthorize("hasAuthority('CATALOG_READ')")
    public List<JobTitleResponse> list(
            String search,
            Boolean active,
            Long departmentId,
            String level,
            String jobFamily,
            String sortBy,
            String sortOrder,
            boolean includeSalary
    ) {
        String cleanSearch = (search != null && !search.trim().isEmpty()) ? search.trim() : null;
        String cleanLevel = (level != null && !level.trim().isEmpty() && !"ALL".equalsIgnoreCase(level.trim())) ? level.trim() : null;
        String cleanJobFamily = (jobFamily != null && !jobFamily.trim().isEmpty() && !"ALL".equalsIgnoreCase(jobFamily.trim())) ? jobFamily.trim() : null;

        List<JobTitle> list = repository.searchJobTitles(cleanSearch, active, departmentId, cleanLevel, cleanJobFamily);

        // Fetch open requisitions count grouped by job title
        Map<Long, Integer> openReqMap = new HashMap<>();
        List<Object[]> groupedReqs = requisitionRepository.countOpenRequisitionsGroupedByJobTitle();
        if (groupedReqs != null) {
            for (Object[] row : groupedReqs) {
                if (row != null && row.length >= 2 && row[0] != null && row[1] != null) {
                    openReqMap.put(((Number) row[0]).longValue(), ((Number) row[1]).intValue());
                }
            }
        }

        List<JobTitleResponse> responses = new ArrayList<>(list.stream()
                .map(jobTitle -> toResponse(jobTitle, includeSalary, openReqMap.getOrDefault(jobTitle.getId(), 0)))
                .toList());

        // Sort if sortBy is specified
        if (sortBy != null && !sortBy.trim().isEmpty()) {
            boolean desc = "desc".equalsIgnoreCase(sortOrder);
            Comparator<JobTitleResponse> comparator = switch (sortBy.toLowerCase().trim()) {
                case "title" -> Comparator.comparing(JobTitleResponse::title, Comparator.nullsLast(String.CASE_INSENSITIVE_ORDER));
                case "level" -> Comparator.comparingInt(this::getLevelOrder);
                case "headcount" -> Comparator.comparingInt(r -> r.currentHeadcount() != null ? r.currentHeadcount() : 0);
                case "createdat" -> Comparator.comparing(JobTitleResponse::createdAt, Comparator.nullsLast(Comparator.naturalOrder()));
                default -> null;
            };

            if (comparator != null) {
                if (desc) {
                    comparator = comparator.reversed();
                }
                responses.sort(comparator);
            }
        }

        return responses;
    }

    @Transactional(readOnly = true)
    @PreAuthorize("hasAuthority('CATALOG_READ')")
    public List<JobTitleResponse> list(String search, Boolean active, Long departmentId, boolean includeSalary) {
        return list(search, active, departmentId, null, null, null, null, includeSalary);
    }

    private int getLevelOrder(JobTitleResponse r) {
        if (r.level() == null) return 99;
        return switch (r.level().toUpperCase()) {
            case "INTERN" -> 1;
            case "JUNIOR" -> 2;
            case "MIDDLE" -> 3;
            case "SENIOR" -> 4;
            case "LEAD" -> 5;
            case "MANAGER" -> 6;
            case "DIRECTOR" -> 7;
            case "EXECUTIVE" -> 8;
            default -> 99;
        };
    }

    @Transactional(readOnly = true)
    @PreAuthorize("hasAuthority('CATALOG_READ')")
    public JobTitleResponse get(Long id, boolean includeSalary) {
        JobTitle jobTitle = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy chức danh với ID: " + id));
        int openRequisitions = (int) requisitionRepository.countOpenRequisitionsByJobTitleId(id);
        return toResponse(jobTitle, includeSalary, openRequisitions);
    }

    @PreAuthorize("hasRole('HR_MANAGER')")
    public JobTitleResponse create(JobTitleRequest request) {
        validateSalaryRange(request);
        String cleanCode = request.code().trim().toUpperCase();
        String cleanTitle = request.title().trim();

        if (repository.existsByCodeIgnoreCase(cleanCode)) {
            throw new ConflictException("Mã chức danh đã tồn tại: " + cleanCode);
        }
        if (repository.existsByTitleIgnoreCase(cleanTitle)) {
            throw new ConflictException("Tên chức danh đã tồn tại: " + cleanTitle);
        }

        Department department = null;
        if (request.departmentId() != null) {
            department = departmentRepository.findById(request.departmentId())
                    .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy phòng ban với ID: " + request.departmentId()));
            if (!department.isActive()) {
                throw new BadRequestException("Phòng ban đã ngừng áp dụng, không thể gán chức danh.");
            }
        }

        JobTitle jobTitle = new JobTitle();
        jobTitle.setTitle(cleanTitle);
        jobTitle.setCode(cleanCode);
        jobTitle.setDepartment(department);
        jobTitle.setLevel(request.level() != null ? request.level().trim() : "MIDDLE");
        jobTitle.setJobFamily(request.jobFamily() != null ? request.jobFamily().trim() : "TECH");
        jobTitle.setMinSalary(request.minSalary());
        jobTitle.setMaxSalary(request.maxSalary());
        jobTitle.setJobDescription(request.jobDescription());
        jobTitle.setKeyResponsibilities(joinList(request.keyResponsibilities()));
        jobTitle.setRequirements(joinList(request.requirements()));
        jobTitle.setCompetencies(joinList(request.competencies()));
        jobTitle.setStandardHeadcount(request.standardHeadcount() != null ? request.standardHeadcount() : 1);
        jobTitle.setCurrentHeadcount(request.currentHeadcount() != null ? request.currentHeadcount() : 0);
        jobTitle.setActive(request.active() != null ? request.active() : true);
        jobTitle.setCreatedAt(Instant.now());
        jobTitle.setUpdatedAt(Instant.now());

        JobTitle saved = repository.save(jobTitle);
        return toResponse(saved, true, 0);
    }

    @PreAuthorize("hasRole('HR_MANAGER')")
    public JobTitleResponse update(Long id, JobTitleRequest request) {
        validateSalaryRange(request);
        JobTitle jobTitle = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy chức danh với ID: " + id));

        String cleanCode = request.code().trim().toUpperCase();
        String cleanTitle = request.title().trim();

        if (repository.existsByCodeIgnoreCaseAndIdNot(cleanCode, id)) {
            throw new ConflictException("Mã chức danh đã tồn tại: " + cleanCode);
        }
        if (repository.existsByTitleIgnoreCaseAndIdNot(cleanTitle, id)) {
            throw new ConflictException("Tên chức danh đã tồn tại: " + cleanTitle);
        }

        Department department = null;
        if (request.departmentId() != null) {
            department = departmentRepository.findById(request.departmentId())
                    .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy phòng ban với ID: " + request.departmentId()));
            if (!department.isActive()) {
                throw new BadRequestException("Phòng ban đã ngừng áp dụng, không thể gán chức danh.");
            }
        }

        jobTitle.setTitle(cleanTitle);
        jobTitle.setCode(cleanCode);
        jobTitle.setDepartment(department);
        if (request.level() != null) jobTitle.setLevel(request.level().trim());
        if (request.jobFamily() != null) jobTitle.setJobFamily(request.jobFamily().trim());
        jobTitle.setMinSalary(request.minSalary());
        jobTitle.setMaxSalary(request.maxSalary());
        jobTitle.setJobDescription(request.jobDescription());
        if (request.keyResponsibilities() != null) jobTitle.setKeyResponsibilities(joinList(request.keyResponsibilities()));
        if (request.requirements() != null) jobTitle.setRequirements(joinList(request.requirements()));
        if (request.competencies() != null) jobTitle.setCompetencies(joinList(request.competencies()));
        if (request.standardHeadcount() != null) jobTitle.setStandardHeadcount(request.standardHeadcount());
        if (request.currentHeadcount() != null) jobTitle.setCurrentHeadcount(request.currentHeadcount());
        if (request.active() != null) jobTitle.setActive(request.active());
        jobTitle.setUpdatedAt(Instant.now());

        JobTitle saved = repository.save(jobTitle);
        int openRequisitions = (int) requisitionRepository.countOpenRequisitionsByJobTitleId(id);
        return toResponse(saved, true, openRequisitions);
    }

    @PreAuthorize("hasRole('HR_MANAGER')")
    public JobTitleResponse setActive(Long id, boolean active) {
        JobTitle jobTitle = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy chức danh với ID: " + id));
        jobTitle.setActive(active);
        jobTitle.setUpdatedAt(Instant.now());
        int openRequisitions = (int) requisitionRepository.countOpenRequisitionsByJobTitleId(id);
        return toResponse(repository.save(jobTitle), true, openRequisitions);
    }

    @PreAuthorize("hasRole('HR_MANAGER')")
    public JobTitleResponse toggleStatus(Long id) {
        JobTitle jobTitle = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy chức danh với ID: " + id));
        boolean currentActive = jobTitle.getActive() != null ? jobTitle.getActive() : true;
        jobTitle.setActive(!currentActive);
        jobTitle.setUpdatedAt(Instant.now());
        int openRequisitions = (int) requisitionRepository.countOpenRequisitionsByJobTitleId(id);
        return toResponse(repository.save(jobTitle), true, openRequisitions);
    }

    @PreAuthorize("hasRole('HR_MANAGER')")
    public void delete(Long id) {
        JobTitle jobTitle = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy chức danh với ID: " + id));

        if (jobTitle.getCurrentHeadcount() != null && jobTitle.getCurrentHeadcount() > 0) {
            throw new ConflictException("Không thể xóa chức danh đang có " + jobTitle.getCurrentHeadcount() + " nhân sự đảm nhiệm. Vui lòng chuyển chức danh nhân sự trước khi xóa.");
        }
        if (requisitionRepository.existsByJobTitleId(id)) {
            throw new ConflictException("Không thể xóa chức danh đang có yêu cầu tuyển dụng liên kết. Vui lòng ngừng áp dụng chức danh thay vì xóa.");
        }
        if (competencyFrameworkRepository.existsByJobTitleId(id)) {
            throw new ConflictException("Không thể xóa chức danh đang có khung năng lực liên kết. Vui lòng ngừng áp dụng chức danh thay vì xóa.");
        }

        repository.delete(jobTitle);
    }

    private JobTitleResponse toResponse(JobTitle j, boolean includeSalary, int openRequisitions) {
        Long minSalary = includeSalary ? j.getMinSalary() : null;
        Long maxSalary = includeSalary ? j.getMaxSalary() : null;
        String salaryRangeDisplay = includeSalary ? formatSalary(minSalary, maxSalary) : null;
        Long deptId = j.getDepartment() != null ? j.getDepartment().getId() : null;
        String deptName = j.getDepartment() != null ? j.getDepartment().getName() : null;

        return new JobTitleResponse(
                j.getId(),
                j.getTitle(),
                j.getCode(),
                deptId,
                deptName,
                j.getLevel(),
                j.getJobFamily(),
                minSalary,
                maxSalary,
                salaryRangeDisplay,
                j.getJobDescription(),
                splitList(j.getKeyResponsibilities()),
                splitList(j.getRequirements()),
                splitList(j.getCompetencies()),
                j.getStandardHeadcount(),
                j.getCurrentHeadcount(),
                openRequisitions,
                j.getActive(),
                j.getCreatedAt(),
                j.getUpdatedAt()
        );
    }

    private void validateSalaryRange(JobTitleRequest request) {
        Long minSalary = request.minSalary();
        Long maxSalary = request.maxSalary();
        if (minSalary != null && minSalary < 0) {
            throw new BadRequestException("Lương tối thiểu không được âm.");
        }
        if (maxSalary != null && maxSalary < 0) {
            throw new BadRequestException("Lương tối đa không được âm.");
        }
        if (minSalary != null && maxSalary != null && minSalary > maxSalary) {
            throw new BadRequestException("Lương tối thiểu không được lớn hơn lương tối đa.");
        }
    }

    private String formatSalary(Long min, Long max) {
        if (min == null && max == null) return "Chưa khai báo";
        if (min != null && max != null) {
            long minMillion = min / 1_000_000;
            long maxMillion = max / 1_000_000;
            return minMillion + " - " + maxMillion + " triệu VNĐ";
        }
        if (min != null) return "Từ " + (min / 1_000_000) + " triệu VNĐ";
        if (max != null) return "Lên đến " + (max / 1_000_000) + " triệu VNĐ";
        return "Chưa khai báo";
    }

    private String joinList(List<String> list) {
        if (list == null || list.isEmpty()) return null;
        return String.join(";\n", list);
    }

    private List<String> splitList(String text) {
        if (text == null || text.trim().isEmpty()) return Collections.emptyList();
        String[] parts = text.split(";\\s*\\n|;\\s*");
        List<String> result = new ArrayList<>();
        for (String p : parts) {
            String trimmed = p.trim();
            if (!trimmed.isEmpty()) {
                result.add(trimmed);
            }
        }
        return result;
    }
}
