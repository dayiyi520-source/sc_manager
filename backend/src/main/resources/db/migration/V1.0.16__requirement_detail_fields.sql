SET @schema_name = DATABASE();
SET @sql = IF((SELECT COUNT(*) FROM information_schema.columns WHERE table_schema=@schema_name AND table_name='t_product_requirement' AND column_name='requirement_type_')=0,
  'ALTER TABLE t_product_requirement ADD COLUMN requirement_type_ VARCHAR(64) NULL, ADD COLUMN cc_names_ JSON NULL, ADD COLUMN planned_start_date_ DATE NULL, ADD COLUMN expected_complete_date_ DATE NULL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
