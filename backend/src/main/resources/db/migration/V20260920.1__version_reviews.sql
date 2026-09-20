CREATE TABLE t_product_version_review (
  id_ VARCHAR(36) PRIMARY KEY,
  tenant_id_ VARCHAR(36) NOT NULL,
  product_line_id_ VARCHAR(36) NOT NULL,
  version_id_ VARCHAR(36) NOT NULL,
  review_date_ DATE NULL,
  conclusion_ VARCHAR(24) NULL,
  summary_ TEXT NULL,
  remaining_risks_ TEXT NULL,
  release_recommendation_ TEXT NULL,
  status_ VARCHAR(16) NOT NULL DEFAULT 'DRAFT',
  version_ INT NOT NULL DEFAULT 0,
  create_by_ VARCHAR(36) NOT NULL,
  update_by_ VARCHAR(36) NOT NULL,
  create_time_ DATETIME(6) NOT NULL,
  update_time_ DATETIME(6) NOT NULL,
  delete_flag_ TINYINT NOT NULL DEFAULT 0,
  KEY idx_version_review_scope (tenant_id_, product_line_id_, version_id_, delete_flag_, create_time_),
  KEY idx_version_review_status (tenant_id_, status_, delete_flag_)
);

CREATE TABLE t_product_version_review_participant (
  id_ VARCHAR(36) PRIMARY KEY,
  tenant_id_ VARCHAR(36) NOT NULL,
  review_id_ VARCHAR(36) NOT NULL,
  participant_id_ VARCHAR(36) NOT NULL,
  participant_name_ VARCHAR(120) NOT NULL,
  sort_ INT NOT NULL,
  create_by_ VARCHAR(36) NOT NULL,
  update_by_ VARCHAR(36) NOT NULL,
  create_time_ DATETIME(6) NOT NULL,
  update_time_ DATETIME(6) NOT NULL,
  delete_flag_ TINYINT NOT NULL DEFAULT 0,
  UNIQUE KEY uk_version_review_participant (tenant_id_, review_id_, participant_id_, delete_flag_),
  KEY idx_version_review_participant (tenant_id_, review_id_, delete_flag_, sort_)
);
