package com.example.auth_service.security;

import org.junit.jupiter.api.Test;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.datasource.init.ScriptUtils;
import java.sql.DriverManager;
import static org.assertj.core.api.Assertions.*;

class RbacMigrationTest {
    @Test
    void newMigrationCreatesScopeTablesAndRejectsInvalidAssignments() throws Exception {
        try (var connection = DriverManager.getConnection("jdbc:h2:mem:migration;MODE=PostgreSQL", "sa", "")) {
            ScriptUtils.executeSqlScript(connection, new ClassPathResource("db/migration/V1__create_roles_and_users.sql"));
            ScriptUtils.executeSqlScript(connection, new ClassPathResource("db/migration/V6__rbac_resource_scope.sql"));
            ScriptUtils.executeSqlScript(connection, new ClassPathResource("db/migration/V7__complete_s1_account_management.sql"));
            try (var statement = connection.createStatement()) {
                statement.execute("INSERT INTO users (email, password, department, lock_reason) VALUES ('user@example.com', 'test', 'Tech', 'Violation')");
                statement.execute("INSERT INTO recruitment_requisitions (requisition_code, title) VALUES ('REQ-1', 'Java')");
                statement.execute("INSERT INTO requisition_assignments (requisition_id, user_id, role, handover_required) VALUES (1, 1, 'RECRUITER', true)");
                assertThatThrownBy(() -> statement.execute("INSERT INTO requisition_assignments (requisition_id, user_id, role) VALUES (1, 1, 'ADMIN')"))
                        .isInstanceOf(java.sql.SQLException.class);
                assertThatThrownBy(() -> statement.execute("INSERT INTO requisition_assignments (requisition_id, user_id, role) VALUES (2, 1, 'RECRUITER')"))
                        .isInstanceOf(java.sql.SQLException.class);
                assertThatThrownBy(() -> statement.execute("INSERT INTO requisition_assignments (requisition_id, user_id, role) VALUES (1, 1, 'RECRUITER')"))
                        .isInstanceOf(java.sql.SQLException.class);
            }
        }
    }

    @Test
    void v20MigrationAddsStageAndEvaluationsTable() throws Exception {
        try (var connection = DriverManager.getConnection("jdbc:h2:mem:migration_v20;MODE=PostgreSQL", "sa", "")) {
            ScriptUtils.executeSqlScript(connection, new ClassPathResource("db/migration/V1__create_roles_and_users.sql"));
            ScriptUtils.executeSqlScript(connection, new ClassPathResource("db/migration/V6__rbac_resource_scope.sql"));
            ScriptUtils.executeSqlScript(connection, new ClassPathResource("db/migration/V7__complete_s1_account_management.sql"));
            ScriptUtils.executeSqlScript(connection, new ClassPathResource("db/migration/V20_1__rbac_candidate_stage_and_evaluations.sql"));
            try (var statement = connection.createStatement()) {
                var dropConstraints = new java.util.ArrayList<String>();
                try (var cRs = statement.executeQuery("SELECT CONSTRAINT_NAME FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE UPPER(TABLE_NAME) = 'REQUISITION_ASSIGNMENTS' AND CONSTRAINT_TYPE = 'CHECK'")) {
                    while (cRs.next()) {
                        String cName = cRs.getString(1);
                        if (!"requisition_assignments_role_check".equalsIgnoreCase(cName)) {
                            dropConstraints.add(cName);
                        }
                    }
                }
                for (String cName : dropConstraints) {
                    statement.execute("ALTER TABLE requisition_assignments DROP CONSTRAINT " + cName);
                }
                statement.execute("INSERT INTO users (email, password) VALUES ('approver@example.com', 'test')");
                statement.execute("INSERT INTO recruitment_requisitions (requisition_code, title) VALUES ('REQ-V20', 'Golang')");
                // Verify APPROVER role is accepted by updated check constraint
                statement.execute("INSERT INTO requisition_assignments (requisition_id, user_id, role) VALUES (1, 1, 'APPROVER')");

                // Verify stage column in candidate_applications
                statement.execute("INSERT INTO candidate_applications (requisition_id, candidate_user_id, full_name, email, stage) VALUES (1, 1, 'John Doe', 'john@example.com', 'APPLIED')");

                // Verify candidate_evaluations table
                statement.execute("INSERT INTO candidate_evaluations (candidate_id, interviewer_user_id, score, feedback) VALUES (1, 1, 9, 'Outstanding communication')");

                var rs = statement.executeQuery("SELECT stage FROM candidate_applications WHERE id = 1");
                assertThat(rs.next()).isTrue();
                assertThat(rs.getString("stage")).isEqualTo("APPLIED");

                var evalRs = statement.executeQuery("SELECT score, feedback FROM candidate_evaluations WHERE candidate_id = 1");
                assertThat(evalRs.next()).isTrue();
                assertThat(evalRs.getInt("score")).isEqualTo(9);
                assertThat(evalRs.getString("feedback")).isEqualTo("Outstanding communication");
            }
        }
    }
}
