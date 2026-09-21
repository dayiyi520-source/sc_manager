ALTER TABLE t_product_work_item
  ADD COLUMN assistance_status_ VARCHAR(32) NULL,
  ADD COLUMN assistance_initiator_id_ VARCHAR(64) NULL,
  ADD COLUMN assistance_owner_id_ VARCHAR(64) NULL,
  ADD COLUMN assistance_resolution_ TEXT NULL;

CREATE TABLE IF NOT EXISTS t_product_assistance_reassignment (
  id_ VARCHAR(64) PRIMARY KEY,
  tenant_id_ VARCHAR(64) NOT NULL,
  assistance_id_ VARCHAR(64) NOT NULL,
  from_user_id_ VARCHAR(64) NOT NULL,
  to_user_id_ VARCHAR(64) NOT NULL,
  reason_ TEXT NOT NULL,
  handoff_note_ TEXT NULL,
  status_ VARCHAR(24) NOT NULL,
  revision_ INT NOT NULL DEFAULT 0,
  create_by_ VARCHAR(64) NOT NULL,
  create_time_ DATETIME(6) NOT NULL,
  update_by_ VARCHAR(64) NOT NULL,
  update_time_ DATETIME(6) NOT NULL,
  delete_flag_ TINYINT NOT NULL DEFAULT 0,
  UNIQUE KEY uk_assistance_pending (tenant_id_, assistance_id_, status_, delete_flag_),
  KEY idx_assistance_reassign_to (tenant_id_, to_user_id_, status_)
);

CREATE TABLE IF NOT EXISTS t_product_assistance_memo (
  id_ VARCHAR(64) PRIMARY KEY,
  tenant_id_ VARCHAR(64) NOT NULL,
  assistance_id_ VARCHAR(64) NOT NULL,
  author_id_ VARCHAR(64) NOT NULL,
  content_ TEXT NOT NULL,
  create_time_ DATETIME(6) NOT NULL,
  delete_flag_ TINYINT NOT NULL DEFAULT 0,
  KEY idx_assistance_memo (tenant_id_, assistance_id_, author_id_, create_time_)
);
