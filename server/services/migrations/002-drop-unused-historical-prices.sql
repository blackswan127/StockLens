-- 002-drop-unused-historical-prices.sql
-- historical_prices was never populated and its runtime DDL has been removed
-- from db.ts. Drop the legacy table for existing databases. IF EXISTS keeps
-- this migration safe to apply more than once.
DROP TABLE IF EXISTS historical_prices;
