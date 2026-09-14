-- 兼容早期数据库：研发和缺陷任务表需要来源需求字段，供后续迁移和统一工作项回填使用。
SET @schema_name = DATABASE();
SET @sql = IF((SELECT COUNT(*) FROM information_schema.columns WHERE table_schema=@schema_name AND table_name='t_product_bug' AND column_name='requirement_id_')=0, 'ALTER TABLE t_product_bug ADD COLUMN requirement_id_ VARCHAR(36) NULL', 'SELECT 1'); PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql = IF((SELECT COUNT(*) FROM information_schema.columns WHERE table_schema=@schema_name AND table_name='t_product_dev_task' AND column_name='requirement_id_')=0, 'ALTER TABLE t_product_dev_task ADD COLUMN requirement_id_ VARCHAR(36) NULL', 'SELECT 1'); PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
