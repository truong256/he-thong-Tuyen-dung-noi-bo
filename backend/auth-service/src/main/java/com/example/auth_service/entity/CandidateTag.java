package com.example.auth_service.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.Instant;

@Entity
@Table(name = "candidate_tags", uniqueConstraints = {
        @UniqueConstraint(name = "uq_candidate_app_tag", columnNames = {"application_id", "tag_name"})
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CandidateTag {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "application_id", nullable = false)
    private Long applicationId;

    @Column(name = "candidate_user_id")
    private Long candidateUserId;

    @Column(name = "tag_name", nullable = false, length = 100)
    private String tagName;

    @Column(name = "created_by_user_id")
    private Long createdByUserId;

    @Builder.Default
    @Column(name = "created_at")
    private Instant createdAt = Instant.now();
}
