-- 统一任务列表常用筛选索引，按租户隔离，重复执行安全。
SET @schema_name = DATABASE();
SET @sql = IF((SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema=@schema_name AND table_name='t_product_bug' AND index_name='idx_bug_tenant_status')=0, 'CREATE INDEX idx_bug_tenant_status ON t_product_bug (tenant_id_, status_, create_time_)', 'SELECT 1'); PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql = IF((SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema=@schema_name AND table_name='t_product_dev_task' AND index_name='idx_dev_task_tenant_status')=0, 'CREATE INDEX idx_dev_task_tenant_status ON t_product_dev_task (tenant_id_, status_, create_time_)', 'SELECT 1'); PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
