-- Add audit columns for immutable requirement events and indexes for common filters.
-- The conditional statements keep local bootstrap databases repeatable.
SET @schema_name = DATABASE();

SET @sql = IF((SELECT COUNT(*) FROM information_schema.columns WHERE table_schema=@schema_name AND table_name='t_product_requirement_event' AND column_name='create_by_')=0,
  'ALTER TABLE t_product_requirement_event ADD COLUMN create_by_ VARCHAR(36) NOT NULL DEFAULT ''system'', ADD COLUMN update_by_ VARCHAR(36) NOT NULL DEFAULT ''system''', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF((SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema=@schema_name AND table_name='t_product_requirement' AND index_name='idx_requirement_tenant_department_status')=0,
  'CREATE INDEX idx_requirement_tenant_department_status ON t_product_requirement (tenant_id_, department_, status_, create_time_)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF((SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema=@schema_name AND table_name='t_product_requirement' AND index_name='idx_requirement_tenant_priority_status')=0,
  'CREATE INDEX idx_requirement_tenant_priority_status ON t_product_requirement (tenant_id_, priority_, status_, create_time_)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
