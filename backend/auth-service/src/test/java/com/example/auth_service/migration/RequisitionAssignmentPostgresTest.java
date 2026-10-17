package com.example.auth_service.migration;

import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.datasource.init.ScriptUtils;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;

/** Opt-in: a disposable schema is the only object this test creates or drops. */
@EnabledIfEnvironmentVariable(named = "S306_POSTGRES_TEST_URL", matches = ".+")
class RequisitionAssignmentPostgresTest {
    private Connection connect() throws SQLException {
        String url = System.getenv("S306_POSTGRES_TEST_URL");
        if (!url.matches("jdbc:postgresql://[^/]+/[^?]*test[^?]*(\\?.*)?")) {
            throw new IllegalArgumentException("Use a dedicated PostgreSQL database whose name contains 'test'.");
        }
        return DriverManager.getConnection(url,
                System.getenv().getOrDefault("S306_POSTGRES_TEST_USER", "postgres"),
                System.getenv().getOrDefault("S306_POSTGRES_TEST_PASSWORD", ""));
    }

    @Test
    void v27AndV29PreserveHistoryAndRejectTwoPrimaryRecruiters() throws Exception {
        String schema = "s306_" + UUID.randomUUID().toString().replace("-", "");
        try (Connection c = connect(); var sql = c.createStatement()) {
            sql.execute("CREATE SCHEMA " + schema);
            try {
                sql.execute("SET search_path TO " + schema);
                sql.execute("CREATE TABLE users(id BIGINT PRIMARY KEY)");
                sql.execute("CREATE TABLE recruitment_requisitions(id BIGINT PRIMARY KEY)");
                sql.execute("CREATE TABLE requisition_assignments(id BIGSERIAL PRIMARY KEY, requisition_id BIGINT NOT NULL REFERENCES recruitment_requisitions(id), user_id BIGINT NOT NULL REFERENCES users(id), role VARCHAR(50) NOT NULL, UNIQUE(requisition_id,user_id))");
                ScriptUtils.executeSqlScript(c, new ClassPathResource("db/migration/V27__requisition_recruiter_assignments_and_history.sql"));
                ScriptUtils.executeSqlScript(c, new ClassPathResource("db/migration/V29__one_primary_recruiter_per_requisition.sql"));
                sql.execute("INSERT INTO users VALUES (1),(2),(3)");
                sql.execute("INSERT INTO recruitment_requisitions VALUES (1)");
                sql.execute("INSERT INTO requisition_assignments(requisition_id,user_id,role,is_primary) VALUES(1,1,'RECRUITER',TRUE)");
                assertThatThrownBy(() -> sql.execute("INSERT INTO requisition_assignments(requisition_id,user_id,role,is_primary) VALUES(1,2,'RECRUITER',TRUE)"))
                        .isInstanceOf(SQLException.class).extracting(e -> ((SQLException)e).getSQLState()).isEqualTo("23505");
                sql.execute("UPDATE requisition_assignments SET is_primary=FALSE WHERE user_id=1");
                sql.execute("INSERT INTO requisition_assignments(requisition_id,user_id,role,is_primary) VALUES(1,2,'RECRUITER',TRUE)");
                sql.execute("INSERT INTO requisition_assignment_histories(requisition_id,user_id,role,assignment_type,action,previous_user_id) VALUES(1,2,'RECRUITER','PRIMARY','HANDOVER',1)");
                try (var result = sql.executeQuery("SELECT previous_user_id FROM requisition_assignment_histories WHERE action='HANDOVER'")) {
                    assertThat(result.next()).isTrue();
                    assertThat(result.getLong(1)).isEqualTo(1);
                }
            } finally {
                sql.execute("DROP SCHEMA " + schema + " CASCADE");
            }
        }
    }

    @Test
    void completeFlywayChainAppliesToEmptyPostgresSchema() throws Exception {
        String schema = "s306_chain_" + UUID.randomUUID().toString().replace("-", "");
        try (Connection c = connect(); var sql = c.createStatement()) {
            sql.execute("CREATE SCHEMA " + schema);
            try {
                Flyway.configure().dataSource(System.getenv("S306_POSTGRES_TEST_URL"),
                        System.getenv().getOrDefault("S306_POSTGRES_TEST_USER", "postgres"),
                        System.getenv().getOrDefault("S306_POSTGRES_TEST_PASSWORD", ""))
                        .schemas(schema).defaultSchema(schema).locations("classpath:db/migration").load().migrate();
            } finally {
                sql.execute("DROP SCHEMA " + schema + " CASCADE");
            }
        }
    }
}
