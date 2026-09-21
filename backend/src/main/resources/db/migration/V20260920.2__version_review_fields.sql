ALTER TABLE t_product_version_review
  ADD COLUMN meeting_topic_ VARCHAR(200) NOT NULL DEFAULT '',
  ADD COLUMN review_type_ VARCHAR(40) NOT NULL DEFAULT '版本评审',
  ADD COLUMN initiator_id_ VARCHAR(36) NULL,
  ADD COLUMN initiator_name_ VARCHAR(120) NOT NULL DEFAULT '';

CREATE INDEX idx_version_review_type ON t_product_version_review (tenant_id_, review_type_, delete_flag_, update_time_);
