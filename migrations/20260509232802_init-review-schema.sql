-- Hackathon Review demo schema
-- Two tables: submissions (a project being judged + auto-generated criteria) and
-- reviews (per-judge scoring of a submission).

-- ─────────────────────────────────────────────
-- submissions
-- ─────────────────────────────────────────────
CREATE TABLE submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repo_url TEXT,
  product_url TEXT,
  criteria_text TEXT,
  criteria_image_name TEXT,
  concept_pdf_name TEXT,
  criteria JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "submissions_read_authenticated"
  ON submissions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "submissions_insert_self"
  ON submissions FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "submissions_update_owner"
  ON submissions FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "submissions_delete_owner"
  ON submissions FOR DELETE
  TO authenticated
  USING (created_by = auth.uid());

CREATE INDEX submissions_created_by_idx ON submissions(created_by);
CREATE INDEX submissions_created_at_idx ON submissions(created_at DESC);

-- ─────────────────────────────────────────────
-- reviews
-- One row per (submission, judge) — a judge's scoring of a submission.
-- ─────────────────────────────────────────────
CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  judge_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scores JSONB NOT NULL DEFAULT '{}'::jsonb,
  weighted_total NUMERIC(8, 3) NOT NULL DEFAULT 0,
  normalized NUMERIC(5, 4) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (submission_id, judge_id)
);

ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reviews_read_authenticated"
  ON reviews FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "reviews_insert_self"
  ON reviews FOR INSERT
  TO authenticated
  WITH CHECK (judge_id = auth.uid());

CREATE POLICY "reviews_update_self"
  ON reviews FOR UPDATE
  TO authenticated
  USING (judge_id = auth.uid())
  WITH CHECK (judge_id = auth.uid());

CREATE POLICY "reviews_delete_self"
  ON reviews FOR DELETE
  TO authenticated
  USING (judge_id = auth.uid());

CREATE INDEX reviews_submission_id_idx ON reviews(submission_id);
CREATE INDEX reviews_judge_id_idx ON reviews(judge_id);
