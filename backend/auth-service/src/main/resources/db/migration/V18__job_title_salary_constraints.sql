ALTER TABLE job_titles
    ADD CONSTRAINT ck_job_titles_min_salary_nonnegative
        CHECK (min_salary IS NULL OR min_salary >= 0),
    ADD CONSTRAINT ck_job_titles_max_salary_nonnegative
        CHECK (max_salary IS NULL OR max_salary >= 0),
    ADD CONSTRAINT ck_job_titles_salary_range
        CHECK (min_salary IS NULL OR max_salary IS NULL OR min_salary <= max_salary);
