SET @schema_name = DATABASE();
SET @sql = IF((SELECT COUNT(*) FROM information_schema.columns WHERE table_schema=@schema_name AND table_name='t_product_requirement' AND column_name='work_order_type_')=0,
  'ALTER TABLE t_product_requirement ADD COLUMN work_order_type_ VARCHAR(32) NULL, ADD COLUMN special_fields_ JSON NULL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
