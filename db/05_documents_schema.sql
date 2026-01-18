-- Phase-1 / M3: documents + immutable versions (soft delete)

CREATE TABLE IF NOT EXISTS documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  folder_id uuid NOT NULL REFERENCES folders(id) ON DELETE RESTRICT,
  title text NULL,
  latest_version_id uuid NULL,
  is_deleted boolean NOT NULL DEFAULT false,
  created_by_user_id uuid NULL REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_documents_folder_id ON documents(folder_id);

CREATE TABLE IF NOT EXISTS document_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  version_number integer NOT NULL,
  original_filename text NOT NULL,
  storage_bucket text NOT NULL,
  storage_key text NOT NULL,
  content_type text NOT NULL DEFAULT 'application/pdf',
  size_bytes bigint NULL,
  upload_status text NOT NULL DEFAULT 'PENDING_UPLOAD',
  uploaded_at timestamptz NULL,
  uploader_user_id uuid NULL REFERENCES users(id) ON DELETE SET NULL,
  page_count integer NULL,
  ocr_status text NOT NULL DEFAULT 'NOT_STARTED',
  ocr_attempts integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT document_versions_unique_version UNIQUE (document_id, version_number),
  CONSTRAINT document_versions_upload_status CHECK (upload_status IN ('PENDING_UPLOAD', 'UPLOADED')),
  CONSTRAINT document_versions_ocr_status CHECK (ocr_status IN ('NOT_STARTED','PENDING','PROCESSING','COMPLETED','FAILED'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_document_versions_storage_key_unique
  ON document_versions(storage_bucket, storage_key);

ALTER TABLE documents
  ADD CONSTRAINT documents_latest_version_fk
  FOREIGN KEY (latest_version_id) REFERENCES document_versions(id) ON DELETE SET NULL;

