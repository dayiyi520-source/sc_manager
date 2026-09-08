CREATE TABLE IF NOT EXISTS t_product_bug (
  id_ VARCHAR(36) PRIMARY KEY, tenant_id_ VARCHAR(36) NOT NULL, code_ VARCHAR(64) NOT NULL,
  title_ VARCHAR(255) NOT NULL, description_ TEXT, product_line_id_ VARCHAR(36), product_line_name_ VARCHAR(255),
  version_name_ VARCHAR(255), type_ VARCHAR(64), severity_ VARCHAR(64), assignee_name_ VARCHAR(128),
  status_ VARCHAR(32) NOT NULL DEFAULT '待修复', source_work_order_ids_ JSON,
  create_by_ VARCHAR(36) NOT NULL, update_by_ VARCHAR(36) NOT NULL, create_time_ DATETIME NOT NULL, update_time_ DATETIME NOT NULL, delete_flag_ TINYINT NOT NULL DEFAULT 0,
  UNIQUE KEY uk_product_bug_code (tenant_id_, code_)
);
CREATE TABLE IF NOT EXISTS t_product_dev_task (
  id_ VARCHAR(36) PRIMARY KEY, tenant_id_ VARCHAR(36) NOT NULL, code_ VARCHAR(64) NOT NULL,
  title_ VARCHAR(255) NOT NULL, description_ TEXT, product_line_id_ VARCHAR(36), product_line_name_ VARCHAR(255),
  version_name_ VARCHAR(255), repo_ VARCHAR(255), branch_ VARCHAR(255), developer_name_ VARCHAR(128),
  estimated_hours_ DECIMAL(10,2) NOT NULL DEFAULT 0, status_ VARCHAR(32) NOT NULL DEFAULT '开发中', source_work_order_ids_ JSON,
  create_by_ VARCHAR(36) NOT NULL, update_by_ VARCHAR(36) NOT NULL, create_time_ DATETIME NOT NULL, update_time_ DATETIME NOT NULL, delete_flag_ TINYINT NOT NULL DEFAULT 0,
  UNIQUE KEY uk_product_dev_code (tenant_id_, code_)
);
