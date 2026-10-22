package com.example.auth_service.service;

import com.example.auth_service.domain.sprint2.CommonCategory;
import com.example.auth_service.dto.CategoryReorderRequest;
import com.example.auth_service.dto.CategoryTypeResponse;
import com.example.auth_service.dto.CommonCategoryRequest;
import com.example.auth_service.dto.CommonCategoryResponse;
import com.example.auth_service.exception.ConflictException;
import com.example.auth_service.exception.ResourceNotFoundException;
import com.example.auth_service.repository.CandidateApplicationRepository;
import com.example.auth_service.repository.CommonCategoryRepository;
import com.example.auth_service.repository.RecruitmentRequisitionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataIntegrityViolationException;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CommonCategoryServiceTest {

    @Mock
    private CommonCategoryRepository repository;

    @Mock
    private CandidateApplicationRepository candidateApplicationRepository;

    @Mock
    private RecruitmentRequisitionRepository recruitmentRequisitionRepository;

    @InjectMocks
    private CommonCategoryService service;

    private CommonCategory sampleCategory;

    @BeforeEach
    void setUp() {
        sampleCategory = new CommonCategory(1L, "EMPLOYMENT_TYPE", "FULL_TIME", "Toàn thời gian", 1, true);
    }

    @Test
    @DisplayName("list() trả về danh sách CommonCategoryResponse tương ứng")
    void list_success() {
        when(repository.searchCategories("Toàn", "EMPLOYMENT_TYPE", true))
                .thenReturn(List.of(sampleCategory));

        List<CommonCategoryResponse> result = service.list("Toàn", "EMPLOYMENT_TYPE", true);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).code()).isEqualTo("FULL_TIME");
        assertThat(result.get(0).name()).isEqualTo("Toàn thời gian");
    }

    @Test
    @DisplayName("get() trả về thông tin danh mục khi ID tồn tại")
    void get_success() {
        when(repository.findById(1L)).thenReturn(Optional.of(sampleCategory));

        CommonCategoryResponse res = service.get(1L);

        assertThat(res.id()).isEqualTo(1L);
        assertThat(res.code()).isEqualTo("FULL_TIME");
    }

    @Test
    @DisplayName("get() ném ResourceNotFoundException khi ID không tồn tại")
    void get_notFound_throwsException() {
        when(repository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.get(99L))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    @DisplayName("getTypes() tổng hợp số lượng danh mục theo nhóm phân loại")
    void getTypes_success() {
        CommonCategory c2 = new CommonCategory(2L, "EMPLOYMENT_TYPE", "PART_TIME", "Bán thời gian", 2, true);
        CommonCategory c3 = new CommonCategory(3L, "WORK_LOCATION", "HN_HQ", "Hà Nội", 1, true);
        when(repository.findAll()).thenReturn(List.of(sampleCategory, c2, c3));

        List<CategoryTypeResponse> types = service.getTypes();

        assertThat(types).hasSize(2);
        assertThat(types).anyMatch(t -> t.type().equals("EMPLOYMENT_TYPE") && t.count() == 2);
        assertThat(types).anyMatch(t -> t.type().equals("WORK_LOCATION") && t.count() == 1);
    }

    @Test
    @DisplayName("create() ném ConflictException khi mã đã tồn tại trong nhóm")
    void create_duplicateCode_throwsConflictException() {
        CommonCategoryRequest req = new CommonCategoryRequest("EMPLOYMENT_TYPE", "FULL_TIME", "Toàn thời gian", 1, true);
        when(repository.existsByTypeAndCodeIgnoreCase("EMPLOYMENT_TYPE", "FULL_TIME")).thenReturn(true);

        assertThatThrownBy(() -> service.create(req))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("FULL_TIME");
    }

    @Test
    @DisplayName("create() lưu danh mục thành công khi hợp lệ")
    void create_valid_success() {
        CommonCategoryRequest req = new CommonCategoryRequest("WORK_LOCATION", "DA_NANG", "Đà Nẵng", 3, true);
        when(repository.existsByTypeAndCodeIgnoreCase("WORK_LOCATION", "DA_NANG")).thenReturn(false);
        when(repository.save(any(CommonCategory.class))).thenAnswer(inv -> {
            CommonCategory c = inv.getArgument(0);
            c.setId(10L);
            return c;
        });

        CommonCategoryResponse created = service.create(req);

        assertThat(created.id()).isEqualTo(10L);
        assertThat(created.code()).isEqualTo("DA_NANG");
        assertThat(created.name()).isEqualTo("Đà Nẵng");
    }

    @Test
    @DisplayName("update() ném ResourceNotFoundException khi ID không tồn tại")
    void update_notFound_throwsException() {
        CommonCategoryRequest req = new CommonCategoryRequest("EMPLOYMENT_TYPE", "FULL_TIME", "Toàn thời gian", 1, true);
        when(repository.findById(999L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.update(999L, req))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    @DisplayName("update() ném ConflictException khi trùng mã danh mục khác trong nhóm")
    void update_duplicateCode_throwsConflictException() {
        CommonCategoryRequest req = new CommonCategoryRequest("EMPLOYMENT_TYPE", "PART_TIME", "Bán thời gian", 1, true);
        when(repository.findById(1L)).thenReturn(Optional.of(sampleCategory));
        when(repository.existsByTypeAndCodeIgnoreCaseAndIdNot("EMPLOYMENT_TYPE", "PART_TIME", 1L)).thenReturn(true);

        assertThatThrownBy(() -> service.update(1L, req))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("PART_TIME");
    }

    @Test
    @DisplayName("update() cập nhật thông tin thành công khi hợp lệ")
    void update_valid_success() {
        CommonCategoryRequest req = new CommonCategoryRequest("EMPLOYMENT_TYPE", "FULL_TIME_VN", "Toàn thời gian cố định", 5, true);
        when(repository.findById(1L)).thenReturn(Optional.of(sampleCategory));
        when(repository.existsByTypeAndCodeIgnoreCaseAndIdNot("EMPLOYMENT_TYPE", "FULL_TIME_VN", 1L)).thenReturn(false);
        when(repository.save(any(CommonCategory.class))).thenReturn(sampleCategory);

        CommonCategoryResponse res = service.update(1L, req);

        assertThat(res.code()).isEqualTo("FULL_TIME_VN");
        assertThat(res.name()).isEqualTo("Toàn thời gian cố định");
        assertThat(res.sortOrder()).isEqualTo(5);
    }

    @Test
    @DisplayName("setActive() cập nhật trạng thái kích hoạt")
    void setActive_success() {
        when(repository.findById(1L)).thenReturn(Optional.of(sampleCategory));
        when(repository.save(any(CommonCategory.class))).thenReturn(sampleCategory);

        CommonCategoryResponse updated = service.setActive(1L, false);

        assertThat(updated.active()).isFalse();
    }

    @Test
    @DisplayName("delete() ném ResourceNotFoundException khi ID không tồn tại")
    void delete_notFound_throwsException() {
        when(repository.findById(999L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.delete(999L))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    @DisplayName("delete() ném ConflictException khi nguồn ứng viên đang được dùng trong hồ sơ ứng viên")
    void delete_candidateSourceReferenced_throwsConflictException() {
        CommonCategory sourceCat = new CommonCategory(5L, "CANDIDATE_SOURCE", "LINKEDIN", "LinkedIn", 1, true);
        when(repository.findById(5L)).thenReturn(Optional.of(sourceCat));
        when(candidateApplicationRepository.existsByCandidateSourceId(5L)).thenReturn(true);

        assertThatThrownBy(() -> service.delete(5L))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("nguồn ứng viên");

        verify(repository, never()).delete(any());
    }

    @Test
    @DisplayName("delete() ném ConflictException khi lý do loại đang được dùng trong hồ sơ ứng viên")
    void delete_rejectionReasonReferencedCandidate_throwsConflictException() {
        CommonCategory rejectCat = new CommonCategory(6L, "REJECTION_REASON", "SKILL_MISMATCH", "Chưa đạt kỹ năng", 1, true);
        when(repository.findById(6L)).thenReturn(Optional.of(rejectCat));
        when(candidateApplicationRepository.existsByRejectionReasonId(6L)).thenReturn(true);

        assertThatThrownBy(() -> service.delete(6L))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("lý do loại hồ sơ");

        verify(repository, never()).delete(any());
    }

    @Test
    @DisplayName("delete() ném ConflictException khi lý do loại đang được dùng trong yêu cầu tuyển dụng")
    void delete_rejectionReasonReferencedRequisition_throwsConflictException() {
        CommonCategory rejectCat = new CommonCategory(6L, "REJECTION_REASON", "BUDGET_OVER", "Vượt ngân sách", 1, true);
        when(repository.findById(6L)).thenReturn(Optional.of(rejectCat));
        when(candidateApplicationRepository.existsByRejectionReasonId(6L)).thenReturn(false);
        when(recruitmentRequisitionRepository.existsByRejectionReasonId(6L)).thenReturn(true);

        assertThatThrownBy(() -> service.delete(6L))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("lý do loại hồ sơ");

        verify(repository, never()).delete(any());
    }

    @Test
    @DisplayName("delete() ném ConflictException khi địa điểm làm việc đang được dùng trong yêu cầu tuyển dụng")
    void delete_workLocationReferenced_throwsConflictException() {
        CommonCategory locationCat = new CommonCategory(7L, "WORK_LOCATION", "HN_HQ", "Hà Nội Trụ sở", 1, true);
        when(repository.findById(7L)).thenReturn(Optional.of(locationCat));
        when(recruitmentRequisitionRepository.existsByWorkLocationId(7L)).thenReturn(true);

        assertThatThrownBy(() -> service.delete(7L))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("địa điểm làm việc");

        verify(repository, never()).delete(any());
    }

    @Test
    @DisplayName("delete() ném ConflictException khi hình thức làm việc đang được dùng trong yêu cầu tuyển dụng")
    void delete_employmentTypeReferenced_throwsConflictException() {
        CommonCategory empTypeCat = new CommonCategory(8L, "EMPLOYMENT_TYPE", "FULL_TIME", "Toàn thời gian", 1, true);
        when(repository.findById(8L)).thenReturn(Optional.of(empTypeCat));
        when(recruitmentRequisitionRepository.existsByEmploymentTypeId(8L)).thenReturn(true);

        assertThatThrownBy(() -> service.delete(8L))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("hình thức làm việc");

        verify(repository, never()).delete(any());
    }

    @Test
    @DisplayName("delete() ném ConflictException khi gặp DataIntegrityViolationException từ DB constraint")
    void delete_dbIntegrityViolation_throwsConflictException() {
        CommonCategory unlinked = new CommonCategory(9L, "SKILL_TAG", "JAVA", "Java Core", 1, true);
        when(repository.findById(9L)).thenReturn(Optional.of(unlinked));
        doThrow(new DataIntegrityViolationException("FK constraint failure"))
                .when(repository).delete(unlinked);

        assertThatThrownBy(() -> service.delete(9L))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("tham chiếu");
    }

    @Test
    @DisplayName("delete() xóa thành công khi danh mục không có bất kỳ tham chiếu nào")
    void delete_notReferenced_success() {
        CommonCategory safeToDelete = new CommonCategory(10L, "SKILL_TAG", "PASCAL", "Pascal", 1, true);
        when(repository.findById(10L)).thenReturn(Optional.of(safeToDelete));

        service.delete(10L);

        verify(repository, times(1)).delete(safeToDelete);
        verify(repository, times(1)).flush();
    }

    @Test
    @DisplayName("reorder() ném IllegalArgumentException khi request rỗng hoặc không có items")
    void reorder_emptyRequest_throwsException() {
        assertThatThrownBy(() -> service.reorder(null))
                .isInstanceOf(IllegalArgumentException.class);

        assertThatThrownBy(() -> service.reorder(new CategoryReorderRequest(List.of())))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    @DisplayName("reorder() ném ResourceNotFoundException khi ID trong request không tồn tại")
    void reorder_notFoundItem_throwsException() {
        CategoryReorderRequest req = new CategoryReorderRequest(List.of(
                new CategoryReorderRequest.CategoryReorderItem(999L, 1)
        ));
        when(repository.findById(999L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.reorder(req))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    @DisplayName("reorder() cập nhật thứ tự các danh mục thành công")
    void reorder_valid_success() {
        CommonCategory c1 = new CommonCategory(1L, "WORK_LOCATION", "HN", "Hà Nội", 1, true);
        CommonCategory c2 = new CommonCategory(2L, "WORK_LOCATION", "HCM", "Hồ Chí Minh", 2, true);

        when(repository.findById(1L)).thenReturn(Optional.of(c1));
        when(repository.findById(2L)).thenReturn(Optional.of(c2));
        when(repository.save(any(CommonCategory.class))).thenAnswer(inv -> inv.getArgument(0));

        CategoryReorderRequest req = new CategoryReorderRequest(List.of(
                new CategoryReorderRequest.CategoryReorderItem(1L, 2),
                new CategoryReorderRequest.CategoryReorderItem(2L, 1)
        ));

        List<CommonCategoryResponse> responses = service.reorder(req);

        assertThat(responses).hasSize(2);
        assertThat(c1.getSortOrder()).isEqualTo(2);
        assertThat(c2.getSortOrder()).isEqualTo(1);
    }

    @Test
    @DisplayName("list() hoạt động khi các tham số search, type, active đều là null")
    void list_nullParams_success() {
        when(repository.searchCategories(null, null, null))
                .thenReturn(List.of(sampleCategory));

        List<CommonCategoryResponse> result = service.list(null, null, null);

        assertThat(result).hasSize(1);
    }

    @Test
    @DisplayName("create() áp dụng giá trị mặc định sortOrder=0 và active=true khi không truyền")
    void create_defaultSortOrderAndActive_success() {
        CommonCategoryRequest req = new CommonCategoryRequest("SKILL_TAG", "REACT", "ReactJS", null, null);
        when(repository.existsByTypeAndCodeIgnoreCase("SKILL_TAG", "REACT")).thenReturn(false);
        when(repository.save(any(CommonCategory.class))).thenAnswer(inv -> inv.getArgument(0));

        CommonCategoryResponse res = service.create(req);

        assertThat(res.sortOrder()).isEqualTo(0);
        assertThat(res.active()).isTrue();
    }

    @Test
    @DisplayName("delete() ném ConflictException khi địa điểm khớp tên hoặc mã trong yêu cầu tuyển dụng")
    void delete_workLocationByNameOrCode_throwsConflictException() {
        CommonCategory locationCat = new CommonCategory(7L, "WORK_LOCATION", "HCM", "Hồ Chí Minh", 1, true);
        when(repository.findById(7L)).thenReturn(Optional.of(locationCat));
        when(recruitmentRequisitionRepository.existsByWorkLocationId(7L)).thenReturn(false);
        when(recruitmentRequisitionRepository.existsByWorkLocationIgnoreCase("Hồ Chí Minh")).thenReturn(true);

        assertThatThrownBy(() -> service.delete(7L))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("địa điểm làm việc");
    }

    @Test
    @DisplayName("delete() ném ConflictException khi hình thức làm việc khớp recruitmentType trong yêu cầu tuyển dụng")
    void delete_employmentTypeByRecruitmentType_throwsConflictException() {
        CommonCategory empTypeCat = new CommonCategory(8L, "EMPLOYMENT_TYPE", "PART_TIME", "Bán thời gian", 1, true);
        when(repository.findById(8L)).thenReturn(Optional.of(empTypeCat));
        when(recruitmentRequisitionRepository.existsByEmploymentTypeId(8L)).thenReturn(false);
        when(recruitmentRequisitionRepository.existsByRecruitmentTypeIgnoreCase("PART_TIME")).thenReturn(true);

        assertThatThrownBy(() -> service.delete(8L))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("hình thức làm việc");
    }

    @Test
    @DisplayName("delete() ném ConflictException khi danh mục nhóm khác được tham chiếu")
    void delete_customCategoryReferenced_throwsConflictException() {
        CommonCategory customCat = new CommonCategory(15L, "CUSTOM_GROUP", "VAL", "Value", 1, true);
        when(repository.findById(15L)).thenReturn(Optional.of(customCat));
        when(recruitmentRequisitionRepository.existsByWorkLocationId(15L)).thenReturn(true);

        assertThatThrownBy(() -> service.delete(15L))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("tham chiếu");
    }
}
