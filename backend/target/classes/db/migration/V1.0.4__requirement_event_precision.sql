-- Preserve the order of requirement events created within the same second.
SET @schema_name = DATABASE();
SET @sql = IF((SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = @schema_name AND table_name = 't_product_requirement_event' AND column_name = 'create_time_' AND datetime_precision < 6) = 1,
  'ALTER TABLE t_product_requirement_event MODIFY COLUMN create_time_ DATETIME(6) NOT NULL',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
