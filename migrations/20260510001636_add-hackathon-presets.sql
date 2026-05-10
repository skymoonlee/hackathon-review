CREATE TABLE hackathon_presets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  tracks JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE hackathon_presets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "hackathon_presets_read_anon"
  ON hackathon_presets FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE INDEX hackathon_presets_sort_idx ON hackathon_presets(sort_order ASC, created_at ASC);
