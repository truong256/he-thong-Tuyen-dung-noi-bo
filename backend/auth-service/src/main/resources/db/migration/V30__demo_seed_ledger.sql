-- Seed bookkeeping only; no accounts, passwords or demo business data in migrations.
CREATE TABLE demo_seed_runs (
    seed_key VARCHAR(100) PRIMARY KEY,
    completed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    record_counts TEXT NOT NULL
);
