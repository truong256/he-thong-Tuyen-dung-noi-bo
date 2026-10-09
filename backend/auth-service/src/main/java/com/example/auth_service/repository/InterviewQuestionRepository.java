package com.example.auth_service.repository;

import com.example.auth_service.domain.sprint2.InterviewQuestion;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface InterviewQuestionRepository extends JpaRepository<InterviewQuestion, Long> {

    @Query(value = """
        SELECT DISTINCT q
        FROM InterviewQuestion q
        JOIN q.competencyCriterion c
        JOIN c.competencyFramework f
        LEFT JOIN f.jobTitles j
        WHERE (:search IS NULL
            OR LOWER(q.questionText) LIKE LOWER(CONCAT('%', :search, '%'))
            OR LOWER(q.category) LIKE LOWER(CONCAT('%', :search, '%'))
            OR LOWER(c.criterionCode) LIKE LOWER(CONCAT('%', :search, '%'))
            OR LOWER(c.criterionName) LIKE LOWER(CONCAT('%', :search, '%'))
            OR LOWER(f.competencyName) LIKE LOWER(CONCAT('%', :search, '%'))
            OR LOWER(j.title) LIKE LOWER(CONCAT('%', :search, '%')))
        AND (:difficultyLevel IS NULL OR q.difficultyLevel = :difficultyLevel)
        AND (:jobTitleId IS NULL OR j.id = :jobTitleId)
        AND (:criterionId IS NULL OR c.id = :criterionId)
        AND (:active IS NULL OR q.active = :active)
        ORDER BY q.createdAt DESC
        """,
        countQuery = """
        SELECT COUNT(DISTINCT q)
        FROM InterviewQuestion q
        JOIN q.competencyCriterion c
        JOIN c.competencyFramework f
        LEFT JOIN f.jobTitles j
        WHERE (:search IS NULL
            OR LOWER(q.questionText) LIKE LOWER(CONCAT('%', :search, '%'))
            OR LOWER(q.category) LIKE LOWER(CONCAT('%', :search, '%'))
            OR LOWER(c.criterionName) LIKE LOWER(CONCAT('%', :search, '%'))
            OR LOWER(f.competencyName) LIKE LOWER(CONCAT('%', :search, '%')))
        AND (:difficultyLevel IS NULL OR q.difficultyLevel = :difficultyLevel)
        AND (:jobTitleId IS NULL OR j.id = :jobTitleId)
        AND (:criterionId IS NULL OR c.id = :criterionId)
        AND (:active IS NULL OR q.active = :active)
        """)
    Page<InterviewQuestion> search(
        @Param("search") String search,
        @Param("difficultyLevel") String difficultyLevel,
        @Param("jobTitleId") Long jobTitleId,
        @Param("criterionId") Long criterionId,
        @Param("active") Boolean active,
        Pageable pageable
    );

    boolean existsByCompetencyCriterionId(Long competencyCriterionId);
}
