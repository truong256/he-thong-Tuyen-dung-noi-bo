import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateJobTitles1730000000000 implements MigrationInterface {
  name = 'CreateJobTitles1730000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "job_titles" (
        "id"          uuid                     NOT NULL,
        "code"        character varying(30)    NOT NULL,
        "name"        character varying(150)   NOT NULL,
        "name_key"    character varying(150)   NOT NULL,
        "level"       character varying(20)    NOT NULL,
        "level_rank"  smallint                 NOT NULL,
        "salary_min"  bigint                   NOT NULL,
        "salary_max"  bigint                   NOT NULL,
        "description" character varying(500),
        "status"      character varying(10)    NOT NULL DEFAULT 'ACTIVE',
        "created_by"  character varying(64)    NOT NULL,
        "updated_by"  character varying(64)    NOT NULL,
        "created_at"  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at"  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "pk_job_titles" PRIMARY KEY ("id"),
        CONSTRAINT "chk_job_titles_salary" CHECK ("salary_min" > 0 AND "salary_max" >= "salary_min"),
        CONSTRAINT "chk_job_titles_level" CHECK ("level" IN ('INTERN','FRESHER','JUNIOR','MIDDLE','SENIOR','LEAD','MANAGER','DIRECTOR')),
        CONSTRAINT "chk_job_titles_status" CHECK ("status" IN ('ACTIVE','INACTIVE'))
      )
    `);
    await queryRunner.query(`CREATE UNIQUE INDEX "uq_job_titles_code" ON "job_titles" ("code")`);
    await queryRunner.query(`CREATE UNIQUE INDEX "uq_job_titles_name_level" ON "job_titles" ("name_key", "level")`);
    await queryRunner.query(`CREATE INDEX "ix_job_titles_status" ON "job_titles" ("status")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "ix_job_titles_status"`);
    await queryRunner.query(`DROP INDEX "uq_job_titles_name_level"`);
    await queryRunner.query(`DROP INDEX "uq_job_titles_code"`);
    await queryRunner.query(`DROP TABLE "job_titles"`);
  }
}
