-- Persist storage URLs/keys for the files uploaded during intake so other judges
-- can open the original concept PDF / criteria image from the submission detail page.

ALTER TABLE submissions
  ADD COLUMN IF NOT EXISTS concept_pdf_url TEXT,
  ADD COLUMN IF NOT EXISTS concept_pdf_key TEXT,
  ADD COLUMN IF NOT EXISTS concept_pdf_bucket TEXT,
  ADD COLUMN IF NOT EXISTS criteria_image_url TEXT,
  ADD COLUMN IF NOT EXISTS criteria_image_key TEXT,
  ADD COLUMN IF NOT EXISTS criteria_image_bucket TEXT;
