package com.example.auth_service.controller;

import com.example.auth_service.domain.sprint2.*;
import com.example.auth_service.dto.*;
import com.example.auth_service.entity.*;
import com.example.auth_service.repository.*;
import com.example.auth_service.security.*;
import com.example.auth_service.service.DepartmentService;
import org.junit.jupiter.api.*;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.ObjectMapper;
import java.util.Set;
import static org.assertj.core.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class DepartmentIntegrationTest {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper mapper;
    @Autowired JwtUtils jwt;
    @Autowired UserRepository users;
    @Autowired RoleRepository roles;
    @Autowired DepartmentRepository departments;
    @Autowired RecruitmentRequisitionRepository requisitions;
    @Autowired DepartmentService service;
    @Autowired JdbcTemplate jdbc;
    User hr, manager;

    @BeforeEach
    void fixtures() {
        // H2 test profile uses Hibernate for schema; production creates this via V10.
        jdbc.execute("CREATE TABLE IF NOT EXISTS department_tree_lock (id INTEGER PRIMARY KEY CHECK (id = 1))");
        jdbc.update("INSERT INTO department_tree_lock(id) SELECT 1 WHERE NOT EXISTS (SELECT 1 FROM department_tree_lock WHERE id=1)");
        hr = user("dept-hr", RoleName.HR_MANAGER);
        manager = user("dept-owner", RoleName.HIRING_MANAGER);
    }

    @AfterEach
    void clearContext() { SecurityContextHolder.clearContext(); }

    @Test
    void hrCanCreateReadUpdateAndDeleteUnusedDepartment() throws Exception {
        var response = mvc.perform(post("/api/departments").header("Authorization", token(hr))
                .contentType(MediaType.APPLICATION_JSON).content(body("Engineering", "eng", null, manager.getId())))
                .andExpect(status().isCreated()).andExpect(header().exists("Location"))
                .andExpect(jsonPath("$.code").value("ENG")).andExpect(jsonPath("$.managerUserId").value(manager.getId()))
                .andReturn().getResponse().getContentAsString();
        long id = mapper.readTree(response).get("id").asLong();
        mvc.perform(get("/api/departments/" + id).header("Authorization", token(hr))).andExpect(status().isOk());
        mvc.perform(put("/api/departments/" + id).header("Authorization", token(hr))
                .contentType(MediaType.APPLICATION_JSON).content(body("Product", "PRODUCT", null, hr.getId())))
                .andExpect(status().isOk()).andExpect(jsonPath("$.managerUserId").value(hr.getId()));
        mvc.perform(delete("/api/departments/" + id).header("Authorization", token(hr))).andExpect(status().isNoContent());
        assertThat(departments.findById(id)).isEmpty();
    }

    @ParameterizedTest
    @EnumSource(value = RoleName.class, names = "HR_MANAGER", mode = EnumSource.Mode.EXCLUDE)
    void otherSixRolesCannotMutateDepartments(RoleName role) throws Exception {
        String bearer = token(user("dept-other", role));
        mvc.perform(post("/api/departments").header("Authorization", bearer).contentType(MediaType.APPLICATION_JSON)
                .content(body("Denied", "DENIED", null, manager.getId())))
                .andExpect(status().isForbidden()).andExpect(jsonPath("$.message").value("Bạn không có quyền truy cập chức năng này."));
        mvc.perform(put("/api/departments/1").header("Authorization", bearer).contentType(MediaType.APPLICATION_JSON)
                .content(body("Denied", "DENIED", null, manager.getId()))).andExpect(status().isForbidden());
        mvc.perform(patch("/api/departments/1/status").header("Authorization", bearer).contentType(MediaType.APPLICATION_JSON)
                .content("{\"active\":false}")).andExpect(status().isForbidden());
        mvc.perform(delete("/api/departments/1").header("Authorization", bearer)).andExpect(status().isForbidden());
    }

    @Test
    void unauthenticatedRequestIsDenied() throws Exception {
        mvc.perform(get("/api/departments/tree")).andExpect(status().isUnauthorized());
        mvc.perform(post("/api/departments").contentType(MediaType.APPLICATION_JSON)
                .content(body("Denied", "DENIED", null, manager.getId()))).andExpect(status().isUnauthorized());
    }

    @Test
    void catalogReadersCanSeeTreeButCandidatesCannot() throws Exception {
        Department root = department("Root", null);
        Department child = department("Child", root.getId());
        Department leaf = department("Leaf", child.getId());
        mvc.perform(get("/api/departments/tree").header("Authorization", token(manager)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].children[0].children[0].department.id").value(leaf.getId()));
        mvc.perform(get("/api/departments/tree").header("Authorization", token(user("dept-candidate", RoleName.CANDIDATE))))
                .andExpect(status().isForbidden());
    }

    @Test
    void selfParentAndDescendantParentAreRejected() throws Exception {
        Department root = department("Root", null);
        Department child = department("Child", root.getId());
        Department leaf = department("Leaf", child.getId());
        for (Long parentId : new Long[]{root.getId(), leaf.getId()}) {
            mvc.perform(put("/api/departments/" + root.getId()).header("Authorization", token(hr))
                    .contentType(MediaType.APPLICATION_JSON).content(body("Root", "ROOT", parentId, manager.getId())))
                    .andExpect(status().isConflict()).andExpect(jsonPath("$.message").value("Quan hệ phòng ban cha-con không được tạo vòng lặp."));
        }
        assertThat(departments.findById(root.getId()).orElseThrow().getParentDepartmentId()).isNull();
    }

    @ParameterizedTest
    @ValueSource(strings = {"DRAFT", "PENDING_APPROVAL", "APPROVED", "OPEN", "CLOSED", "REJECTED", "CANCELLED", "UNKNOWN"})
    void anyRecruitmentHistoryPreventsDeletionButAllowsDeactivation(String status) throws Exception {
        Department department = department("Used", null);
        RecruitmentRequisition requisition = new RecruitmentRequisition();
        requisition.setTitle("Java developer");
        requisition.setRequisitionCode("DEPT-REQ");
        requisition.setDepartmentId(department.getId());
        requisition.setStatus(status);
        requisitions.saveAndFlush(requisition);
        mvc.perform(delete("/api/departments/" + department.getId()).header("Authorization", token(hr)))
                .andExpect(status().isConflict());
        mvc.perform(patch("/api/departments/" + department.getId() + "/status").header("Authorization", token(hr))
                .contentType(MediaType.APPLICATION_JSON).content("{\"active\":false}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.active").value(false));
        assertThat(requisitions.findById(requisition.getId()).orElseThrow().getDepartmentId()).isEqualTo(department.getId());
        assertThat(requisitions.findById(requisition.getId()).orElseThrow().getStatus()).isEqualTo(status);
    }

    @Test
    void parentDeletionAndDeactivationPreserveChildren() throws Exception {
        Department root = department("Root", null);
        Department child = department("Child", root.getId());
        mvc.perform(delete("/api/departments/" + root.getId()).header("Authorization", token(hr))).andExpect(status().isConflict());
        mvc.perform(patch("/api/departments/" + root.getId() + "/status").header("Authorization", token(hr))
                .contentType(MediaType.APPLICATION_JSON).content("{\"active\":false}")).andExpect(status().isConflict());
        child.setActive(false);
        departments.saveAndFlush(child);
        mvc.perform(patch("/api/departments/" + root.getId() + "/status").header("Authorization", token(hr))
                .contentType(MediaType.APPLICATION_JSON).content("{\"active\":false}")).andExpect(status().isOk());
        mvc.perform(patch("/api/departments/" + child.getId() + "/status").header("Authorization", token(hr))
                .contentType(MediaType.APPLICATION_JSON).content("{\"active\":true}")).andExpect(status().isConflict());
    }

    @Test
    void activeParentCanBeRestoredBeforeChild() throws Exception {
        Department root = department("Root", null);
        root.setActive(false);
        departments.saveAndFlush(root);
        mvc.perform(post("/api/departments").header("Authorization", token(hr)).contentType(MediaType.APPLICATION_JSON)
                .content(body("Child", "CHILD", root.getId(), manager.getId()))).andExpect(status().isConflict());
        mvc.perform(patch("/api/departments/" + root.getId() + "/status").header("Authorization", token(hr))
                .contentType(MediaType.APPLICATION_JSON).content("{\"active\":true}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.active").value(true));
    }

    @Test
    void missingManagerAndInvalidIdsAndMalformedJsonAre400() throws Exception {
        mvc.perform(post("/api/departments").header("Authorization", token(hr)).contentType(MediaType.APPLICATION_JSON)
                .content(body("Root", "ROOT", null, null))).andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.validationErrors.managerUserId").exists());
        mvc.perform(post("/api/departments").header("Authorization", token(hr)).contentType(MediaType.APPLICATION_JSON)
                .content(body("Root", "ROOT", 999999L, manager.getId()))).andExpect(status().isBadRequest());
        mvc.perform(get("/api/departments/not-a-number").header("Authorization", token(hr))).andExpect(status().isBadRequest());
        mvc.perform(post("/api/departments").header("Authorization", token(hr)).contentType(MediaType.APPLICATION_JSON)
                .content("{")).andExpect(status().isBadRequest());
        mvc.perform(patch("/api/departments/1/status").header("Authorization", token(hr)).contentType(MediaType.APPLICATION_JSON)
                .content("{}")).andExpect(status().isBadRequest());
    }

    @Test
    void duplicateNamesAndCodesAreCaseInsensitive() throws Exception {
        department("Root", null);
        for (String request : new String[]{body("root", "NEW", null, manager.getId()), body("New", "root", null, manager.getId())}) {
            mvc.perform(post("/api/departments").header("Authorization", token(hr)).contentType(MediaType.APPLICATION_JSON)
                    .content(request)).andExpect(status().isConflict());
        }
    }

    @Test
    void nonInternalAndInactiveManagersAreRejected() throws Exception {
        User candidate = user("dept-candidate", RoleName.CANDIDATE);
        manager.setStatus("INACTIVE");
        users.saveAndFlush(manager);
        for (Long id : new Long[]{candidate.getId(), manager.getId(), 999999L}) {
            mvc.perform(post("/api/departments").header("Authorization", token(hr)).contentType(MediaType.APPLICATION_JSON)
                    .content(body("Root", "ROOT", null, id))).andExpect(status().isBadRequest());
        }
    }

    @Test
    void departmentReferencedByAccountCannotBeDeleted() throws Exception {
        Department department = department("Used", null);
        manager.setDepartment(department.getCode());
        users.saveAndFlush(manager);
        mvc.perform(delete("/api/departments/" + department.getId()).header("Authorization", token(hr)))
                .andExpect(status().isConflict());
    }

    @Test
    void serviceCannotBeCalledWithoutHrAuthority() {
        UserPrincipal principal = UserPrincipal.create(manager);
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities()));
        assertThatThrownBy(() -> service.create(new DepartmentRequest("Denied", "DENIED", null, null, manager.getId())))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    void statusFilterAndMissingDetail() throws Exception {
        department("Active", null);
        Department inactive = department("Inactive", null);
        inactive.setActive(false);
        departments.saveAndFlush(inactive);
        mvc.perform(get("/api/departments?active=true").header("Authorization", token(hr)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(1));
        mvc.perform(get("/api/departments/999999").header("Authorization", token(hr))).andExpect(status().isNotFound());
    }

    private User user(String name, RoleName role) {
        User user = new User(name + "@example.test", "test-only");
        user.setRoles(Set.of(roles.findByName(role).orElseThrow()));
        return users.saveAndFlush(user);
    }
    private String token(User user) {
        return "Bearer " + jwt.generateAccessToken(user.getEmail(), Set.of(user.getRole()), user.getTokenVersion());
    }
    private String body(String name, String code, Long parentId, Long managerId) {
        return mapper.writeValueAsString(new DepartmentRequest(name, code, "Test", parentId, managerId));
    }
    private Department department(String name, Long parentId) {
        Department department = new Department();
        department.setName(name);
        department.setCode(name.toUpperCase());
        department.setParentDepartmentId(parentId);
        department.setManagerUserId(manager.getId());
        return departments.saveAndFlush(department);
    }
}
