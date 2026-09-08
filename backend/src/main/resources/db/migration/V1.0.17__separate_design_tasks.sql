SET @schema_name = DATABASE();
SET @sql = IF((SELECT COUNT(*) FROM information_schema.columns WHERE table_schema=@schema_name AND table_name='t_product_requirement' AND column_name='work_item_kind_')=0,
  'ALTER TABLE t_product_requirement ADD COLUMN work_item_kind_ VARCHAR(32) NOT NULL DEFAULT ''requirement''', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

UPDATE t_product_requirement
SET work_item_kind_='requirement'
WHERE work_item_kind_ IS NULL OR work_item_kind_='';

SET @sql = IF((SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema=@schema_name AND table_name='t_product_requirement' AND index_name='idx_requirement_work_item_kind')=0,
  'CREATE INDEX idx_requirement_work_item_kind ON t_product_requirement (tenant_id_, work_item_kind_, create_time_)', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
