-- Normalize downstream requirement records for auditability and idempotent writes.
SET @schema_name = DATABASE();

SET @sql = IF((SELECT COUNT(*) FROM information_schema.columns WHERE table_schema=@schema_name AND table_name='t_crm_presales_ticket' AND column_name='create_by_')=0,
  'ALTER TABLE t_crm_presales_ticket ADD COLUMN create_by_ VARCHAR(36) NOT NULL DEFAULT ''system'', ADD COLUMN update_by_ VARCHAR(36) NOT NULL DEFAULT ''system'', ADD COLUMN version_ INT NOT NULL DEFAULT 0', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql = IF((SELECT COUNT(*) FROM information_schema.columns WHERE table_schema=@schema_name AND table_name='t_project_delivery_ticket' AND column_name='create_by_')=0,
  'ALTER TABLE t_project_delivery_ticket ADD COLUMN create_by_ VARCHAR(36) NOT NULL DEFAULT ''system'', ADD COLUMN update_by_ VARCHAR(36) NOT NULL DEFAULT ''system'', ADD COLUMN version_ INT NOT NULL DEFAULT 0', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql = IF((SELECT COUNT(*) FROM information_schema.columns WHERE table_schema=@schema_name AND table_name='t_product_requirement_task' AND column_name='create_by_')=0,
  'ALTER TABLE t_product_requirement_task ADD COLUMN create_by_ VARCHAR(36) NOT NULL DEFAULT ''system'', ADD COLUMN update_by_ VARCHAR(36) NOT NULL DEFAULT ''system'', ADD COLUMN version_ INT NOT NULL DEFAULT 0', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql = IF((SELECT COUNT(*) FROM information_schema.columns WHERE table_schema=@schema_name AND table_name='t_product_bug' AND column_name='create_by_')=0,
  'ALTER TABLE t_product_bug ADD COLUMN create_by_ VARCHAR(36) NOT NULL DEFAULT ''system'', ADD COLUMN update_by_ VARCHAR(36) NOT NULL DEFAULT ''system'', ADD COLUMN version_ INT NOT NULL DEFAULT 0', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;


SET @sql = IF((SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema=@schema_name AND table_name='t_crm_presales_ticket' AND index_name='idx_presales_ticket_requirement')=0,
  'CREATE INDEX idx_presales_ticket_requirement ON t_crm_presales_ticket (tenant_id_, requirement_id_, status_, create_time_)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql = IF((SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema=@schema_name AND table_name='t_project_delivery_ticket' AND index_name='idx_delivery_ticket_requirement')=0,
  'CREATE INDEX idx_delivery_ticket_requirement ON t_project_delivery_ticket (tenant_id_, requirement_id_, status_, create_time_)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql = IF((SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema=@schema_name AND table_name='t_product_requirement_task' AND index_name='idx_requirement_task_requirement')=0,
  'CREATE INDEX idx_requirement_task_requirement ON t_product_requirement_task (tenant_id_, requirement_id_, status_, create_time_)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql = IF((SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema=@schema_name AND table_name='t_product_bug' AND index_name='idx_product_bug_requirement')=0,
  'CREATE INDEX idx_product_bug_requirement ON t_product_bug (tenant_id_, requirement_id_, status_, create_time_)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF((SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema=@schema_name AND table_name='t_product_requirement_event' AND index_name='idx_requirement_event_type')=0,
  'CREATE INDEX idx_requirement_event_type ON t_product_requirement_event (tenant_id_, event_type_, create_time_)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql = IF((SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema=@schema_name AND table_name='t_requirement_work_item' AND index_name='idx_work_item_requirement_status')=0,
  'CREATE INDEX idx_work_item_requirement_status ON t_requirement_work_item (tenant_id_, requirement_id_, status_, create_time_)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
