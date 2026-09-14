CREATE TABLE t_product_work_item_relation (
  id_ VARCHAR(36) PRIMARY KEY,
  tenant_id_ VARCHAR(36) NOT NULL,
  product_line_id_ VARCHAR(36) NOT NULL,
  source_id_ VARCHAR(36) NOT NULL,
  target_id_ VARCHAR(36) NOT NULL,
  type_ VARCHAR(32) NOT NULL,
  scope_ VARCHAR(16) NOT NULL,
  during_testing_ TINYINT NOT NULL DEFAULT 0,
  version_ INT NOT NULL DEFAULT 0,
  create_by_ VARCHAR(36) NOT NULL,
  update_by_ VARCHAR(36) NOT NULL,
  create_time_ DATETIME(6) NOT NULL,
  update_time_ DATETIME(6) NOT NULL,
  delete_flag_ TINYINT NOT NULL DEFAULT 0,
  UNIQUE KEY uk_work_item_relation (tenant_id_,product_line_id_,source_id_,target_id_,type_),
  KEY idx_relation_target (tenant_id_,product_line_id_,target_id_,delete_flag_),
  KEY idx_relation_source (tenant_id_,product_line_id_,source_id_,delete_flag_)
);
