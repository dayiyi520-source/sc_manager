CREATE TABLE t_work_item_category_dictionary (
  id_ VARCHAR(36) PRIMARY KEY,
  tenant_id_ VARCHAR(36) NOT NULL,
  code_ VARCHAR(32) NOT NULL,
  display_name_ VARCHAR(64) NOT NULL,
  icon_key_ VARCHAR(64) NOT NULL,
  sort_ INT NOT NULL DEFAULT 0,
  enabled_ TINYINT NOT NULL DEFAULT 1,
  built_in_ TINYINT NOT NULL DEFAULT 1,
  create_by_ VARCHAR(36) NOT NULL,
  update_by_ VARCHAR(36) NOT NULL,
  create_time_ DATETIME(6) NOT NULL,
  update_time_ DATETIME(6) NOT NULL,
  version_ INT NOT NULL DEFAULT 0,
  delete_flag_ TINYINT NOT NULL DEFAULT 0,
  UNIQUE KEY uk_work_item_category_dictionary (tenant_id_, code_, delete_flag_),
  KEY idx_work_item_category_dictionary_sort (tenant_id_, enabled_, sort_, delete_flag_)
);
