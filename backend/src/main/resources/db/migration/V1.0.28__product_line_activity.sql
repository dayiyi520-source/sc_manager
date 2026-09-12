ALTER TABLE t_product_line
  ADD COLUMN requirement_owner_ VARCHAR(128) NULL,
  ADD COLUMN tech_owner_ VARCHAR(128) NULL,
  ADD COLUMN test_owner_ VARCHAR(128) NULL;

CREATE TABLE IF NOT EXISTS t_product_line_activity (
  id_ VARCHAR(36) PRIMARY KEY,
  tenant_id_ VARCHAR(36) NOT NULL,
  product_line_id_ VARCHAR(36) NOT NULL,
  action_ VARCHAR(128) NOT NULL,
  detail_ VARCHAR(512),
  operator_name_ VARCHAR(128) NOT NULL,
  create_time_ DATETIME NOT NULL,
  KEY idx_product_line_activity (tenant_id_, product_line_id_, create_time_)
);
