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
            ScriptUtils.executeSqlScript(connection, new ClassPathResource("db/migration/V5__rbac_resource_scope.sql"));
            try (var statement = connection.createStatement()) {
                statement.execute("INSERT INTO users (email, password) VALUES ('user@example.com', 'test')");
                statement.execute("INSERT INTO recruitment_requisitions (requisition_code, title) VALUES ('REQ-1', 'Java')");
                statement.execute("INSERT INTO requisition_assignments (requisition_id, user_id, role) VALUES (1, 1, 'RECRUITER')");
                assertThatThrownBy(() -> statement.execute("INSERT INTO requisition_assignments (requisition_id, user_id, role) VALUES (1, 1, 'ADMIN')"))
                        .isInstanceOf(java.sql.SQLException.class);
                assertThatThrownBy(() -> statement.execute("INSERT INTO requisition_assignments (requisition_id, user_id, role) VALUES (2, 1, 'RECRUITER')"))
                        .isInstanceOf(java.sql.SQLException.class);
                assertThatThrownBy(() -> statement.execute("INSERT INTO requisition_assignments (requisition_id, user_id, role) VALUES (1, 1, 'RECRUITER')"))
                        .isInstanceOf(java.sql.SQLException.class);
            }
        }
    }
}
