SET @schema_name = DATABASE();
SET @sql = IF((SELECT COUNT(*) FROM information_schema.columns WHERE table_schema=@schema_name AND table_name='t_product_work_item' AND column_name='progress_')=0,
  'ALTER TABLE t_product_work_item ADD COLUMN progress_ TINYINT NOT NULL DEFAULT 0', 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;
UPDATE t_product_work_item SET progress_=100 WHERE successful_=1 AND (progress_ IS NULL OR progress_<>100);
SET @sql = IF((SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema=@schema_name AND table_name='t_product_work_item' AND index_name='idx_work_item_progress_due')=0,
  'CREATE INDEX idx_work_item_progress_due ON t_product_work_item (tenant_id_,planned_end_date_,status_group_,delete_flag_)', 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;
