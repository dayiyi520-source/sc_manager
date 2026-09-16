ALTER TABLE t_product_workflow
  ADD COLUMN task_type_id_ VARCHAR(36) NULL AFTER category_;

ALTER TABLE t_product_workflow
  DROP INDEX uk_workflow_version,
  DROP INDEX idx_workflow_published,
  ADD UNIQUE KEY uk_workflow_type_version (tenant_id_,product_line_id_,category_,task_type_id_,workflow_version_),
  ADD KEY idx_workflow_type_published (tenant_id_,product_line_id_,task_type_id_,status_,delete_flag_);

CREATE TABLE t_product_automation_rule (
  id_ VARCHAR(36) PRIMARY KEY,
  tenant_id_ VARCHAR(36) NOT NULL,
  product_line_id_ VARCHAR(36) NOT NULL,
  name_ VARCHAR(128) NOT NULL,
  enabled_ TINYINT NOT NULL DEFAULT 1,
  trigger_type_ VARCHAR(32) NOT NULL,
  trigger_type_id_ VARCHAR(36) NOT NULL,
  trigger_state_key_ VARCHAR(64) NOT NULL,
  condition_type_ VARCHAR(32),
  condition_value_ VARCHAR(128),
  action_type_ VARCHAR(32) NOT NULL,
  action_config_ JSON NOT NULL,
  version_ INT NOT NULL DEFAULT 0,
  create_by_ VARCHAR(36) NOT NULL,
  update_by_ VARCHAR(36) NOT NULL,
  create_time_ DATETIME(6) NOT NULL,
  update_time_ DATETIME(6) NOT NULL,
  delete_flag_ TINYINT NOT NULL DEFAULT 0,
  KEY idx_automation_rule_line (tenant_id_,product_line_id_,enabled_,delete_flag_),
  KEY idx_automation_rule_trigger (tenant_id_,trigger_type_id_,trigger_state_key_,enabled_,delete_flag_)
);

CREATE TABLE t_product_automation_setting (
  tenant_id_ VARCHAR(36) NOT NULL,
  product_line_id_ VARCHAR(36) NOT NULL,
  enabled_ TINYINT NOT NULL DEFAULT 1,
  update_by_ VARCHAR(36) NOT NULL,
  update_time_ DATETIME(6) NOT NULL,
  PRIMARY KEY (tenant_id_,product_line_id_)
);

CREATE TABLE t_product_automation_log (
  id_ VARCHAR(36) PRIMARY KEY,
  tenant_id_ VARCHAR(36) NOT NULL,
  product_line_id_ VARCHAR(36) NOT NULL,
  rule_id_ VARCHAR(36) NOT NULL,
  work_item_id_ VARCHAR(36) NOT NULL,
  result_ VARCHAR(16) NOT NULL,
  detail_ VARCHAR(500),
  create_time_ DATETIME(6) NOT NULL,
  KEY idx_automation_log_line (tenant_id_,product_line_id_,create_time_),
  KEY idx_automation_log_rule (tenant_id_,rule_id_,create_time_)
);
