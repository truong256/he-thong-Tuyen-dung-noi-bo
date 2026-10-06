package com.example.auth_service.repository;

import com.example.auth_service.domain.sprint2.CommonCategory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CommonCategoryRepository extends JpaRepository<CommonCategory, Long> {

    Optional<CommonCategory> findByTypeAndCodeIgnoreCase(String type, String code);

    boolean existsByTypeAndCodeIgnoreCase(String type, String code);

    boolean existsByTypeAndCodeIgnoreCaseAndIdNot(String type, String code, Long id);

    List<CommonCategory> findByTypeOrderBySortOrderAscNameAsc(String type);

    List<CommonCategory> findByActiveTrueOrderByTypeAscSortOrderAscNameAsc();

    List<CommonCategory> findByTypeAndActiveTrueOrderBySortOrderAscNameAsc(String type);

    @Query("SELECT DISTINCT c.type FROM CommonCategory c ORDER BY c.type ASC")
    List<String> findDistinctTypes();

    @Query("SELECT c FROM CommonCategory c WHERE " +
           "(:type IS NULL OR :type = '' OR c.type = :type) AND " +
           "(:active IS NULL OR c.active = :active) AND " +
           "(:search IS NULL OR :search = '' OR " +
           " LOWER(c.name) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           " LOWER(c.code) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           " LOWER(c.type) LIKE LOWER(CONCAT('%', :search, '%'))) " +
           "ORDER BY c.type ASC, c.sortOrder ASC, c.name ASC")
    List<CommonCategory> searchCategories(
            @Param("search") String search,
            @Param("type") String type,
            @Param("active") Boolean active
    );
}
