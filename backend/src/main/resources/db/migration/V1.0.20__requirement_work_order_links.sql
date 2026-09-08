SET @schema_name = DATABASE();
SET @sql = IF((SELECT COUNT(*) FROM information_schema.columns WHERE table_schema=@schema_name AND table_name='t_product_requirement' AND column_name='source_work_order_ids_')=0,
  'ALTER TABLE t_product_requirement ADD COLUMN source_work_order_ids_ JSON NULL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql = IF((SELECT COUNT(*) FROM information_schema.columns WHERE table_schema=@schema_name AND table_name='t_product_requirement' AND column_name='source_work_order_titles_')=0,
  'ALTER TABLE t_product_requirement ADD COLUMN source_work_order_titles_ JSON NULL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
