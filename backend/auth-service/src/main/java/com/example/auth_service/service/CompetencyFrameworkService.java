package com.example.auth_service.service;

import com.example.auth_service.dto.CompetencyFrameworkRequest;
import com.example.auth_service.dto.CompetencyFrameworkResponse;
import java.util.List;

public interface CompetencyFrameworkService {
    CompetencyFrameworkResponse createFramework(CompetencyFrameworkRequest request);
    CompetencyFrameworkResponse updateFramework(Long id, CompetencyFrameworkRequest request);
    CompetencyFrameworkResponse getFrameworkById(Long id);
    List<CompetencyFrameworkResponse> getAllFrameworks();
    void deleteFramework(Long id);
}
