package com.example.auth_service.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Entity
@Table(name = "candidate_application_withdraw_tokens")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class CandidateApplicationWithdrawToken {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 120)
    private String token;

    @Column(name = "application_id", nullable = false)
    private Long applicationId;

    @Column(name = "expiry_date", nullable = false)
    private Instant expiryDate;

    @Column(nullable = false)
    private boolean used = false;

    @Column(name = "used_at")
    private Instant usedAt;

    @Column(name = "created_at")
    private Instant createdAt = Instant.now();

    public boolean isExpired() {
        return !Instant.now().isBefore(expiryDate);
    }
}
