package com.example.auth_service.controller;

import com.example.auth_service.dto.ConfirmCandidateInfoRequest;
import com.example.auth_service.entity.*;
import com.example.auth_service.repository.*;
import com.example.auth_service.security.JwtUtils;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.ObjectMapper;

import java.util.Set;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class CandidateControllerIntegrationTest {

    @Autowired private MockMvc mvc;
    @Autowired private ObjectMapper mapper;
    @Autowired private JwtUtils jwt;
    @Autowired private UserRepository users;
    @Autowired private RoleRepository roles;
    @Autowired private CandidateApplicationRepository candidateRepository;

    private User recruiter;
    private User hrManager;
    private User candidateUser;
    private CandidateApplication testCandidate;

    @BeforeEach
    void setUp() {
        recruiter = createUser("recruiter_s4", RoleName.RECRUITER);
        hrManager = createUser("hrmanager_s4", RoleName.HR_MANAGER);
        candidateUser = createUser("cand_s4", RoleName.CANDIDATE);

        testCandidate = new CandidateApplication();
        testCandidate.setRequisitionId(1L);
        testCandidate.setCandidateUserId(candidateUser.getId());
        testCandidate.setFullName("Lê Thị Ban Đầu");
        testCandidate.setEmail("lethi@bandau.vn");
        testCandidate.setPhone("0901234567");
        testCandidate.setParsedFullName("Lê Thị Gợi Ý");
        testCandidate.setParsedEmail("lethi.goiy@ats.vn");
        testCandidate.setParsedPhone("0988776655");
        testCandidate.setParsedStatus("SUCCESS");
        testCandidate.setIsParsedConfirmed(false);
        testCandidate = candidateRepository.saveAndFlush(testCandidate);
    }

    private User createUser(String emailPrefix, RoleName roleName) {
        User user = new User(emailPrefix + "@test.local", "password123");
        user.setFullName("User " + emailPrefix);
        user.setRoles(Set.of(roles.findByName(roleName).orElseThrow()));
        return users.saveAndFlush(user);
    }

    private String token(User user) {
        return "Bearer " + jwt.generateAccessToken(user.getEmail(), Set.of(user.getRole()), user.getTokenVersion());
    }

    @Test
    @DisplayName("S4-04: Recruiter views candidate detail with verified and parsed suggestions")
    void testGetCandidateDetail() throws Exception {
        mvc.perform(get("/api/candidates/" + testCandidate.getId() + "/detail")
                        .header("Authorization", token(hrManager)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id", is(testCandidate.getId().intValue())))
                .andExpect(jsonPath("$.fullName", is("Lê Thị Ban Đầu")))
                .andExpect(jsonPath("$.email", is("lethi@bandau.vn")))
                .andExpect(jsonPath("$.parsedFullName", is("Lê Thị Gợi Ý")))
                .andExpect(jsonPath("$.parsedEmail", is("lethi.goiy@ats.vn")))
                .andExpect(jsonPath("$.parsedStatus", is("SUCCESS")))
                .andExpect(jsonPath("$.isParsedConfirmed", is(false)));
    }

    @Test
    @DisplayName("S4-04: Recruiter confirms and updates candidate information")
    void testConfirmCandidateInfo() throws Exception {
        ConfirmCandidateInfoRequest req = new ConfirmCandidateInfoRequest(
                "Lê Thị Gợi Ý Đã Duyệt", "lethi.duyet@ats.vn", "0988776655", "SCREENING"
        );

        mvc.perform(put("/api/candidates/" + testCandidate.getId() + "/confirm-parsed")
                        .header("Authorization", token(hrManager))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.fullName", is("Lê Thị Gợi Ý Đã Duyệt")))
                .andExpect(jsonPath("$.email", is("lethi.duyet@ats.vn")))
                .andExpect(jsonPath("$.phone", is("0988776655")))
                .andExpect(jsonPath("$.stage", is("SCREENING")))
                .andExpect(jsonPath("$.isParsedConfirmed", is(true)))
                .andExpect(jsonPath("$.confirmedByUserId", is(hrManager.getId().intValue())));
    }

    @Test
    @DisplayName("S4-04: Public candidate applies with CV file without needing authentication")
    void testPublicApplyWithCv() throws Exception {
        MockMultipartFile file = new MockMultipartFile(
                "file", "cv.pdf", "application/pdf", "dummy content".getBytes()
        );

        mvc.perform(multipart("/api/public/candidates/apply")
                        .file(file)
                        .param("requisitionId", "1")
                        .param("fullName", "Ứng Viên Công Khai")
                        .param("email", "ungvien@public.vn")
                        .param("phone", "0911223344"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.fullName", is("Ứng Viên Công Khai")))
                .andExpect(jsonPath("$.email", is("ungvien@public.vn")))
                .andExpect(jsonPath("$.phone", is("0911223344")))
                .andExpect(jsonPath("$.stage", is("APPLIED")));
    }

    @Test
    @DisplayName("S4-04: Candidate parsing test endpoint previews extracted fields")
    void testParseCvPreview() throws Exception {
        MockMultipartFile file = new MockMultipartFile(
                "file", "test.txt", "text/plain", "Not a pdf".getBytes()
        );

        mvc.perform(multipart("/api/candidates/parse-cv")
                        .file(file)
                        .header("Authorization", token(hrManager)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status", is("FAILED")))
                .andExpect(jsonPath("$.message", containsString("chỉ hỗ trợ định dạng PDF")));
    }
}
