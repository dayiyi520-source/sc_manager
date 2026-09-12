CREATE TABLE IF NOT EXISTS t_product_line_work_item_type (
  id_ VARCHAR(36) PRIMARY KEY,
  tenant_id_ VARCHAR(36) NOT NULL,
  product_line_id_ VARCHAR(36) NOT NULL,
  category_ VARCHAR(16) NOT NULL,
  name_ VARCHAR(128) NOT NULL,
  description_ TEXT,
  creator_name_ VARCHAR(128),
  create_by_ VARCHAR(36) NOT NULL,
  update_by_ VARCHAR(36) NOT NULL,
  create_time_ DATETIME NOT NULL,
  update_time_ DATETIME NOT NULL,
  enabled_ TINYINT NOT NULL DEFAULT 1,
  delete_flag_ TINYINT NOT NULL DEFAULT 0,
  version_ INT NOT NULL DEFAULT 0,
  KEY idx_product_line_work_item_type (tenant_id_, product_line_id_, category_, delete_flag_)
);
