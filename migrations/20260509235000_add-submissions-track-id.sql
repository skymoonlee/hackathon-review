-- Add hackathon track selector to submissions.
ALTER TABLE submissions
  ADD COLUMN IF NOT EXISTS track_id TEXT;

CREATE INDEX IF NOT EXISTS submissions_track_id_idx ON submissions(track_id);
