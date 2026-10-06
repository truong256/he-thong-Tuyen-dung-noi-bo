package com.example.auth_service.service;

import com.example.auth_service.domain.sprint2.CommonCategory;
import com.example.auth_service.dto.CategoryTypeResponse;
import com.example.auth_service.dto.CommonCategoryRequest;
import com.example.auth_service.dto.CommonCategoryResponse;
import com.example.auth_service.exception.ConflictException;
import com.example.auth_service.exception.ResourceNotFoundException;
import com.example.auth_service.repository.CommonCategoryRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

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
        when(repository.existsById(999L)).thenReturn(false);

        assertThatThrownBy(() -> service.delete(999L))
                .isInstanceOf(ResourceNotFoundException.class);
    }
}
