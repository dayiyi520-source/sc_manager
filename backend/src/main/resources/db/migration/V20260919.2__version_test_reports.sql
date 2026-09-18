CREATE TABLE t_product_version_test_report (
  id_ VARCHAR(36) PRIMARY KEY,
  tenant_id_ VARCHAR(36) NOT NULL,
  product_line_id_ VARCHAR(36) NOT NULL,
  version_id_ VARCHAR(36) NOT NULL,
  name_ VARCHAR(100) NOT NULL,
  summary_ LONGTEXT NULL,
  creator_name_ VARCHAR(120) NOT NULL,
  version_ INT NOT NULL DEFAULT 0,
  create_by_ VARCHAR(36) NOT NULL,
  update_by_ VARCHAR(36) NOT NULL,
  create_time_ DATETIME(6) NOT NULL,
  update_time_ DATETIME(6) NOT NULL,
  delete_flag_ TINYINT NOT NULL DEFAULT 0,
  KEY idx_version_test_report (tenant_id_, product_line_id_, version_id_, delete_flag_, create_time_)
);

CREATE TABLE t_product_version_test_report_plan (
  id_ VARCHAR(36) PRIMARY KEY,
  tenant_id_ VARCHAR(36) NOT NULL,
  report_id_ VARCHAR(36) NOT NULL,
  test_plan_id_ VARCHAR(36) NOT NULL,
  sort_ INT NOT NULL,
  create_by_ VARCHAR(36) NOT NULL,
  update_by_ VARCHAR(36) NOT NULL,
  create_time_ DATETIME(6) NOT NULL,
  update_time_ DATETIME(6) NOT NULL,
  delete_flag_ TINYINT NOT NULL DEFAULT 0,
  UNIQUE KEY uk_version_test_report_plan (tenant_id_, report_id_, test_plan_id_, delete_flag_),
  KEY idx_version_test_report_plan (tenant_id_, report_id_, delete_flag_, sort_)
);
