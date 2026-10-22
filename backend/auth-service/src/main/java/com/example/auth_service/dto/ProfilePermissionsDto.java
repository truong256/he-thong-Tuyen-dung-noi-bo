package com.example.auth_service.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProfilePermissionsDto {
    private boolean canView;
    private boolean canEditStage;
    private boolean canManageTags;
    private boolean canAddNotes;
    private boolean canDeleteNotes;
    private boolean canViewCv;
    private boolean canUploadCv;
}
