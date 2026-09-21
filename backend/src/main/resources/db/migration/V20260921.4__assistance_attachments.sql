CREATE TABLE IF NOT EXISTS t_product_attachment_resource (
  id_ VARCHAR(64) PRIMARY KEY, tenant_id_ VARCHAR(64) NOT NULL, name_ VARCHAR(255) NOT NULL,
  mime_type_ VARCHAR(128) NOT NULL, size_ BIGINT NOT NULL, storage_key_ VARCHAR(512) NOT NULL,
  scan_status_ VARCHAR(24) NOT NULL DEFAULT 'PENDING', subject_type_ VARCHAR(64) NULL, subject_id_ VARCHAR(64) NULL,
  visibility_ VARCHAR(32) NOT NULL DEFAULT 'SHARED', create_by_ VARCHAR(64) NOT NULL, create_time_ DATETIME(6) NOT NULL,
  delete_flag_ TINYINT NOT NULL DEFAULT 0, KEY idx_attachment_subject (tenant_id_, subject_type_, subject_id_)
);
