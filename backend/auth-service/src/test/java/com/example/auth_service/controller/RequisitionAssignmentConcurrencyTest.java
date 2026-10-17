package com.example.auth_service.controller;

import com.example.auth_service.domain.sprint2.RecruitmentRequisition;
import com.example.auth_service.dto.AssignRecruiterPayload;
import com.example.auth_service.entity.*;
import com.example.auth_service.repository.*;
import com.example.auth_service.security.UserPrincipal;
import com.example.auth_service.service.RequisitionAssignmentService;
import jakarta.persistence.EntityManager;
import jakarta.persistence.LockModeType;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.*;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(properties = "spring.datasource.url=jdbc:h2:mem:s306_concurrency;MODE=PostgreSQL;DB_CLOSE_DELAY=0;LOCK_TIMEOUT=5000")
@ActiveProfiles("test")
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
class RequisitionAssignmentConcurrencyTest {
    @Autowired PlatformTransactionManager transactions;
    @Autowired EntityManager entityManager;
    @Autowired UserRepository users;
    @Autowired RoleRepository roles;
    @Autowired RecruitmentRequisitionRepository requisitions;
    @Autowired RequisitionAssignmentRepository assignments;
    @Autowired RequisitionAssignmentService service;

    @Test
    void assignmentWaitsForParentLock_thenCommitsExactlyOnePrimary() throws Exception {
        var tx = new TransactionTemplate(transactions);
        User[] fixtures = tx.execute(status -> new User[] { createUser(RoleName.HR_MANAGER), createUser(RoleName.RECRUITER) });
        Long reqId = tx.execute(status -> {
            var req = new RecruitmentRequisition();
            req.setRequisitionCode("LOCK-" + UUID.randomUUID());
            req.setTitle("Isolated S3-06 concurrency fixture");
            return requisitions.saveAndFlush(req).getId();
        });
        ExecutorService pool = Executors.newSingleThreadExecutor();
        CountDownLatch started = new CountDownLatch(1);
        CountDownLatch finished = new CountDownLatch(1);
        try {
            Future<?>[] worker = new Future<?>[1];
            tx.executeWithoutResult(status -> {
                entityManager.find(RecruitmentRequisition.class, reqId, LockModeType.PESSIMISTIC_WRITE);
                worker[0] = pool.submit(() -> {
                    var principal = UserPrincipal.create(fixtures[0]);
                    SecurityContextHolder.getContext().setAuthentication(
                            new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities()));
                    started.countDown();
                    try {
                        service.assignRecruiters(reqId, new AssignRecruiterPayload(fixtures[1].getId(), List.of(), null, null));
                    } finally {
                        SecurityContextHolder.clearContext();
                        finished.countDown();
                    }
                });
                try {
                    assertThat(started.await(5, TimeUnit.SECONDS)).isTrue();
                    assertThat(finished.await(300, TimeUnit.MILLISECONDS))
                            .as("assignment must wait while another transaction owns the parent lock").isFalse();
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                    throw new IllegalStateException(e);
                }
            });
            worker[0].get(10, TimeUnit.SECONDS);
            tx.executeWithoutResult(status -> {
                var saved = assignments.findByRequisitionId(reqId);
                assertThat(saved).hasSize(1);
                assertThat(saved.getFirst().isPrimary()).isTrue();
                assertThat(saved.getFirst().getUserId()).isEqualTo(fixtures[1].getId());
            });
        } finally {
            pool.shutdownNow();
        }
    }

    private User createUser(RoleName role) {
        User user = new User("s306-" + UUID.randomUUID() + "@test.invalid", UUID.randomUUID().toString());
        user.setFullName("Isolated " + role);
        user.setStatus("ACTIVE");
        user.setRoles(Set.of(roles.findByName(role).orElseThrow()));
        return users.saveAndFlush(user);
    }
}
