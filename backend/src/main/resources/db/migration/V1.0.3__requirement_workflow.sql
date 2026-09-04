-- This migration may be applied after a local bootstrap that created some of
-- these columns manually. Keep each column addition idempotent so Flyway can
-- finish the migration without invalid duplicate-column errors.
SET @schema_name = DATABASE();
SET @sql = IF((SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = @schema_name AND table_name = 't_product_requirement' AND column_name = 'description_html_') = 0, 'ALTER TABLE t_product_requirement ADD COLUMN description_html_ LONGTEXT NULL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql = IF((SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = @schema_name AND table_name = 't_product_requirement' AND column_name = 'media_') = 0, 'ALTER TABLE t_product_requirement ADD COLUMN media_ JSON NULL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql = IF((SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = @schema_name AND table_name = 't_product_requirement' AND column_name = 'task_type_') = 0, 'ALTER TABLE t_product_requirement ADD COLUMN task_type_ VARCHAR(32) NULL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql = IF((SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = @schema_name AND table_name = 't_product_requirement' AND column_name = 'task_id_') = 0, 'ALTER TABLE t_product_requirement ADD COLUMN task_id_ VARCHAR(36) NULL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql = IF((SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = @schema_name AND table_name = 't_product_requirement' AND column_name = 'assigned_owner_name_') = 0, 'ALTER TABLE t_product_requirement ADD COLUMN assigned_owner_name_ VARCHAR(128) NULL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql = IF((SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = @schema_name AND table_name = 't_product_requirement' AND column_name = 'assigned_note_') = 0, 'ALTER TABLE t_product_requirement ADD COLUMN assigned_note_ VARCHAR(1024) NULL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

CREATE TABLE IF NOT EXISTS t_product_requirement_event (
  id_ VARCHAR(36) PRIMARY KEY,
  tenant_id_ VARCHAR(36) NOT NULL,
  requirement_id_ VARCHAR(36) NOT NULL,
  event_type_ VARCHAR(32) NOT NULL,
  from_status_ VARCHAR(32),
  to_status_ VARCHAR(32),
  reason_ VARCHAR(2048),
  operator_name_ VARCHAR(128) NOT NULL,
  metadata_ JSON NOT NULL,
  create_time_ DATETIME NOT NULL,
  KEY idx_requirement_event_requirement (tenant_id_, requirement_id_, create_time_)
);

CREATE TABLE IF NOT EXISTS t_requirement_work_item (
  id_ VARCHAR(36) PRIMARY KEY,
  tenant_id_ VARCHAR(36) NOT NULL,
  requirement_id_ VARCHAR(36) NOT NULL,
  task_type_ VARCHAR(32) NOT NULL,
  title_ VARCHAR(255) NOT NULL,
  assignee_name_ VARCHAR(128) NOT NULL,
  note_ VARCHAR(2048),
  status_ VARCHAR(32) NOT NULL DEFAULT '',
  create_by_ VARCHAR(36) NOT NULL,
  update_by_ VARCHAR(36) NOT NULL,
  create_time_ DATETIME NOT NULL,
  update_time_ DATETIME NOT NULL,
  delete_flag_ TINYINT NOT NULL DEFAULT 0,
  version_ INT NOT NULL DEFAULT 0,
  KEY idx_work_item_requirement (tenant_id_, requirement_id_),
  KEY idx_work_item_type_status (tenant_id_, task_type_, status_)
);

CREATE TABLE IF NOT EXISTS t_sys_notification (
  id_ VARCHAR(36) PRIMARY KEY,
  tenant_id_ VARCHAR(36) NOT NULL,
  recipient_name_ VARCHAR(128) NOT NULL,
  title_ VARCHAR(255) NOT NULL,
  content_ VARCHAR(2048) NOT NULL,
  related_type_ VARCHAR(64) NOT NULL,
  related_id_ VARCHAR(36) NOT NULL,
  read_flag_ TINYINT NOT NULL DEFAULT 0,
  create_time_ DATETIME NOT NULL,
  KEY idx_notification_recipient (tenant_id_, recipient_name_, read_flag_, create_time_)
);

CREATE TABLE IF NOT EXISTS t_crm_presales_ticket (
  id_ VARCHAR(36) PRIMARY KEY, tenant_id_ VARCHAR(36) NOT NULL, requirement_id_ VARCHAR(36) NOT NULL,
  title_ VARCHAR(255) NOT NULL, assignee_name_ VARCHAR(128) NOT NULL, note_ VARCHAR(2048), status_ VARCHAR(32) NOT NULL DEFAULT '',
  create_time_ DATETIME NOT NULL, update_time_ DATETIME NOT NULL, delete_flag_ TINYINT NOT NULL DEFAULT 0,
  KEY idx_presales_ticket (tenant_id_, status_, create_time_)
);

CREATE TABLE IF NOT EXISTS t_project_delivery_ticket (
  id_ VARCHAR(36) PRIMARY KEY, tenant_id_ VARCHAR(36) NOT NULL, requirement_id_ VARCHAR(36) NOT NULL,
  title_ VARCHAR(255) NOT NULL, assignee_name_ VARCHAR(128) NOT NULL, note_ VARCHAR(2048), status_ VARCHAR(32) NOT NULL DEFAULT '待处理',
  create_time_ DATETIME NOT NULL, update_time_ DATETIME NOT NULL, delete_flag_ TINYINT NOT NULL DEFAULT 0,
  KEY idx_delivery_ticket (tenant_id_, status_, create_time_)
);

CREATE TABLE IF NOT EXISTS t_product_requirement_task (
  id_ VARCHAR(36) PRIMARY KEY, tenant_id_ VARCHAR(36) NOT NULL, requirement_id_ VARCHAR(36) NOT NULL,
  task_type_ VARCHAR(32) NOT NULL, title_ VARCHAR(255) NOT NULL, assignee_name_ VARCHAR(128) NOT NULL, note_ VARCHAR(2048), status_ VARCHAR(32) NOT NULL DEFAULT '',
  create_time_ DATETIME NOT NULL, update_time_ DATETIME NOT NULL, delete_flag_ TINYINT NOT NULL DEFAULT 0,
  KEY idx_product_requirement_task (tenant_id_, task_type_, status_)
);

CREATE TABLE IF NOT EXISTS t_product_bug (
  id_ VARCHAR(36) PRIMARY KEY, tenant_id_ VARCHAR(36) NOT NULL, requirement_id_ VARCHAR(36) NOT NULL,
  title_ VARCHAR(255) NOT NULL, assignee_name_ VARCHAR(128) NOT NULL, note_ VARCHAR(2048), status_ VARCHAR(32) NOT NULL DEFAULT '',
  create_time_ DATETIME NOT NULL, update_time_ DATETIME NOT NULL, delete_flag_ TINYINT NOT NULL DEFAULT 0,
  KEY idx_product_bug (tenant_id_, status_, create_time_)
);
