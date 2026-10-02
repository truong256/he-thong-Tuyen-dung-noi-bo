package com.example.auth_service.service;

import com.example.auth_service.domain.sprint2.Department;
import com.example.auth_service.dto.DepartmentRequest;
import com.example.auth_service.entity.*;
import com.example.auth_service.exception.ConflictException;
import com.example.auth_service.repository.*;
import com.example.auth_service.security.UserPrincipal;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.context.ActiveProfiles;
import java.util.*;
import java.util.concurrent.*;
import static org.assertj.core.api.Assertions.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class DepartmentConcurrencyTest {
    @Autowired DepartmentService service;
    @Autowired DepartmentRepository departments;
    @Autowired UserRepository users;
    @Autowired RoleRepository roles;
    @Autowired JdbcTemplate jdbc;

    @Test
    void simultaneousOppositeMovesCannotCreateCycle() throws Exception {
        jdbc.execute("CREATE TABLE IF NOT EXISTS department_tree_lock (id INTEGER PRIMARY KEY CHECK (id = 1))");
        jdbc.update("INSERT INTO department_tree_lock(id) SELECT 1 WHERE NOT EXISTS (SELECT 1 FROM department_tree_lock WHERE id=1)");
        User hr = new User("department-concurrency@example.test", "test-only");
        hr.setRoles(Set.of(roles.findByName(RoleName.HR_MANAGER).orElseThrow()));
        hr = users.saveAndFlush(hr);
        UserPrincipal principal = UserPrincipal.create(hr);
        Department a = department("Concurrency A", "CONC_A", hr.getId());
        Department b = department("Concurrency B", "CONC_B", hr.getId());
        CountDownLatch start = new CountDownLatch(1);
        try (var executor = Executors.newVirtualThreadPerTaskExecutor()) {
            Future<Boolean> first = executor.submit(() -> move(a, b, principal, start));
            Future<Boolean> second = executor.submit(() -> move(b, a, principal, start));
            start.countDown();
            assertThat(List.of(first.get(20, TimeUnit.SECONDS), second.get(20, TimeUnit.SECONDS)))
                    .containsExactlyInAnyOrder(true, false);
            Department savedA = departments.findById(a.getId()).orElseThrow();
            Department savedB = departments.findById(b.getId()).orElseThrow();
            assertThat(savedA.getParentDepartmentId() == null || savedB.getParentDepartmentId() == null).isTrue();
        } finally {
            jdbc.update("UPDATE departments SET parent_department_id = NULL WHERE id IN (?, ?)", a.getId(), b.getId());
            departments.deleteAllById(List.of(a.getId(), b.getId()));
            users.deleteById(hr.getId());
        }
    }

    private boolean move(Department node, Department parent, UserPrincipal principal, CountDownLatch start) throws Exception {
        start.await();
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities()));
        try {
            service.update(node.getId(), new DepartmentRequest(node.getName(), node.getCode(), null, parent.getId(), principal.getId()));
            return true;
        } catch (ConflictException expected) {
            return false;
        } finally { SecurityContextHolder.clearContext(); }
    }

    private Department department(String name, String code, Long managerId) {
        Department department = new Department();
        department.setName(name);
        department.setCode(code);
        department.setManagerUserId(managerId);
        return departments.saveAndFlush(department);
    }
}
