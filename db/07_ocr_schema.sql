-- Phase-1 / M4: OCR persistence

ALTER TABLE document_versions
  ADD COLUMN IF NOT EXISTS ocr_started_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS ocr_completed_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS ocr_error text NULL;

CREATE TABLE IF NOT EXISTS document_version_pages (
  version_id uuid NOT NULL REFERENCES document_versions(id) ON DELETE CASCADE,
  page_number integer NOT NULL,
  text text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (version_id, page_number)
);

