-- Persist the parsed track (name, description, emphasis, sponsors) on the
-- submission row so the review page can rebuild the multi-persona judge panel
-- without re-parsing the concept PDF.

ALTER TABLE submissions
  ADD COLUMN IF NOT EXISTS track_snapshot JSONB;
