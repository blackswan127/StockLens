-- 001-initial-schema.sql
-- Baseline marker, not executable DDL.
-- The runtime schema is created idempotently with CREATE TABLE IF NOT EXISTS
-- statements in server/services/db.ts. This row only records the baseline so
-- later numbered migrations are applied in order.
SELECT 1;
