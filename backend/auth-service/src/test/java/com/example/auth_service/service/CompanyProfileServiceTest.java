package com.example.auth_service.service;

import com.example.auth_service.domain.sprint2.CompanyProfile;
import com.example.auth_service.repository.CompanyProfileRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Collections;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CompanyProfileServiceTest {

    @Mock
    private CompanyProfileRepository repository;

    @InjectMocks
    private CompanyProfileService service;

    private CompanyProfile sampleProfile;

    @BeforeEach
    void setUp() {
        sampleProfile = new CompanyProfile();
        sampleProfile.setId(1L);
        sampleProfile.setCompanyName("ATS Việt Nam");
        sampleProfile.setShortName("ATS Corp");
        sampleProfile.setEmail("contact@ats-corp.vn");
    }

    @Test
    @DisplayName("getProfile returns existing profile from repository")
    void testGetProfile_Existing() {
        when(repository.findAll()).thenReturn(List.of(sampleProfile));

        CompanyProfile result = service.getProfile();

        assertThat(result).isNotNull();
        assertThat(result.getCompanyName()).isEqualTo("ATS Việt Nam");
        verify(repository, never()).save(any());
    }

    @Test
    @DisplayName("getProfile creates default profile if none exists")
    void testGetProfile_Empty_CreatesDefault() {
        when(repository.findAll()).thenReturn(Collections.emptyList());
        when(repository.save(any(CompanyProfile.class))).thenAnswer(inv -> inv.getArgument(0));

        CompanyProfile result = service.getProfile();

        assertThat(result).isNotNull();
        assertThat(result.getCompanyName()).contains("ATS");
        verify(repository).save(any(CompanyProfile.class));
    }

    @Test
    @DisplayName("updateProfile updates fields and persists to repository")
    void testUpdateProfile() {
        when(repository.findAll()).thenReturn(List.of(sampleProfile));
        when(repository.save(any(CompanyProfile.class))).thenAnswer(inv -> inv.getArgument(0));

        CompanyProfile updatePayload = new CompanyProfile();
        updatePayload.setCompanyName("ATS Enterprise Solutions");
        updatePayload.setShortName("ATS New");

        CompanyProfile result = service.updateProfile(updatePayload, "admin@company.com");

        assertThat(result.getCompanyName()).isEqualTo("ATS Enterprise Solutions");
        assertThat(result.getShortName()).isEqualTo("ATS New");
        assertThat(result.getUpdatedBy()).isEqualTo("admin@company.com");
        verify(repository).save(any(CompanyProfile.class));
    }
}
