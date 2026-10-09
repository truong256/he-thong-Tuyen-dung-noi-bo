package com.example.auth_service.service;

import com.example.auth_service.domain.sprint2.CompetencyFramework;
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
import org.springframework.beans.factory.annotation.Autowired;
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
    private final CompetencyFrameworkRepository competencyFrameworkRepository;

    @Autowired
    public JobTitleService(JobTitleRepository repository, DepartmentRepository departmentRepository, CompetencyFrameworkRepository competencyFrameworkRepository) {
        this.repository = repository;
        this.departmentRepository = departmentRepository;
        this.competencyFrameworkRepository = competencyFrameworkRepository;
    }

    public JobTitleService(JobTitleRepository repository, DepartmentRepository departmentRepository) {
        this(repository, departmentRepository, null);
    }

    @Transactional(readOnly = true)
    @PreAuthorize("hasAuthority('CATALOG_READ')")
    public List<JobTitleResponse> list(String search, Boolean active, Long departmentId, boolean includeSalary) {
        String cleanSearch = (search != null && !search.trim().isEmpty()) ? search.trim() : null;
        List<JobTitle> list = repository.searchJobTitles(cleanSearch, active, departmentId);
        return list.stream().map(jobTitle -> toResponse(jobTitle, includeSalary)).toList();
    }

    @Transactional(readOnly = true)
    @PreAuthorize("hasAuthority('CATALOG_READ')")
    public JobTitleResponse get(Long id, boolean includeSalary) {
        JobTitle jobTitle = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy chức danh với ID: " + id));
        return toResponse(jobTitle, includeSalary);
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
        if (request.competencyFrameworkId() != null && competencyFrameworkRepository != null) {
            CompetencyFramework framework = competencyFrameworkRepository.findById(request.competencyFrameworkId())
                    .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy khung năng lực với ID: " + request.competencyFrameworkId()));
            jobTitle.setCompetencyFramework(framework);
        } else {
            jobTitle.setCompetencyFramework(null);
        }

        JobTitle saved = repository.save(jobTitle);
        return toResponse(saved, true);
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
        }

        jobTitle.setTitle(cleanTitle);
        jobTitle.setCode(cleanCode);
        jobTitle.setDepartment(department);
        if (request.competencyFrameworkId() != null && competencyFrameworkRepository != null) {
            CompetencyFramework framework = competencyFrameworkRepository.findById(request.competencyFrameworkId())
                    .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy khung năng lực với ID: " + request.competencyFrameworkId()));
            jobTitle.setCompetencyFramework(framework);
        } else if (request.competencyFrameworkId() == null) {
            jobTitle.setCompetencyFramework(null);
        }
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
        return toResponse(saved, true);
    }

    @PreAuthorize("hasRole('HR_MANAGER')")
    public JobTitleResponse setActive(Long id, boolean active) {
        JobTitle jobTitle = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy chức danh với ID: " + id));
        jobTitle.setActive(active);
        jobTitle.setUpdatedAt(Instant.now());
        return toResponse(repository.save(jobTitle), true);
    }

    @PreAuthorize("hasRole('HR_MANAGER')")
    public void delete(Long id) {
        JobTitle jobTitle = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy chức danh với ID: " + id));
        repository.delete(jobTitle);
    }

    private JobTitleResponse toResponse(JobTitle j, boolean includeSalary) {
        Long minSalary = includeSalary ? j.getMinSalary() : null;
        Long maxSalary = includeSalary ? j.getMaxSalary() : null;
        String salaryRangeDisplay = includeSalary ? formatSalary(minSalary, maxSalary) : null;
        Long deptId = j.getDepartment() != null ? j.getDepartment().getId() : null;
        String deptName = j.getDepartment() != null ? j.getDepartment().getName() : null;
        Long frameworkId = j.getCompetencyFramework() != null ? j.getCompetencyFramework().getId() : null;
        String frameworkName = j.getCompetencyFramework() != null ? j.getCompetencyFramework().getCompetencyName() : null;

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
                0,
                j.getActive(),
                j.getCreatedAt(),
                j.getUpdatedAt(),
                frameworkId,
                frameworkName
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
        if (min == null && max == null) return "Thỏa thuận";
        if (min != null && max != null) {
            long minMillion = min / 1_000_000;
            long maxMillion = max / 1_000_000;
            return minMillion + " - " + maxMillion + " triệu VNĐ";
        }
        if (min != null) return "Từ " + (min / 1_000_000) + " triệu VNĐ";
        if (max != null) return "Lên đến " + (max / 1_000_000) + " triệu VNĐ";
        return "Thỏa thuận";
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
