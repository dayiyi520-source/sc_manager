CREATE TABLE t_notification_template (
  tenant_id_ VARCHAR(36) PRIMARY KEY,
  config_ JSON NOT NULL,
  update_by_ VARCHAR(36) NOT NULL,
  update_time_ DATETIME(6) NOT NULL
);

CREATE TABLE t_product_notification_setting (
  tenant_id_ VARCHAR(36) NOT NULL,
  product_line_id_ VARCHAR(36) NOT NULL,
  config_ JSON NOT NULL,
  update_by_ VARCHAR(36) NOT NULL,
  update_time_ DATETIME(6) NOT NULL,
  PRIMARY KEY (tenant_id_, product_line_id_)
);

CREATE TABLE t_automation_template_setting (
  tenant_id_ VARCHAR(36) PRIMARY KEY,
  enabled_ TINYINT NOT NULL DEFAULT 1,
  update_by_ VARCHAR(36) NOT NULL,
  update_time_ DATETIME(6) NOT NULL
);

CREATE TABLE t_automation_template_rule (
  id_ VARCHAR(36) PRIMARY KEY,
  tenant_id_ VARCHAR(36) NOT NULL,
  name_ VARCHAR(128) NOT NULL,
  enabled_ TINYINT NOT NULL DEFAULT 1,
  trigger_type_ VARCHAR(32) NOT NULL,
  trigger_type_id_ VARCHAR(36) NOT NULL,
  trigger_state_key_ VARCHAR(64) NOT NULL,
  condition_type_ VARCHAR(32),
  condition_value_ TEXT,
  action_type_ VARCHAR(32) NOT NULL,
  action_config_ JSON NOT NULL,
  version_ INT NOT NULL DEFAULT 0,
  create_by_ VARCHAR(36) NOT NULL,
  update_by_ VARCHAR(36) NOT NULL,
  create_time_ DATETIME(6) NOT NULL,
  update_time_ DATETIME(6) NOT NULL,
  delete_flag_ TINYINT NOT NULL DEFAULT 0,
  KEY idx_automation_template_rule (tenant_id_, enabled_, delete_flag_)
);

ALTER TABLE t_product_automation_rule MODIFY condition_value_ TEXT;
