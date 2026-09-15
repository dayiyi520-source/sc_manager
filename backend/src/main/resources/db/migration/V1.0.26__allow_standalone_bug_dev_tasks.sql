-- 缺陷与研发任务既可以由工单流转生成，也可以在各自菜单独立新建。
-- 独立新建时没有来源需求，因此来源关联允许为空。
-- V1.0.15 创建这两个表时没有 requirement_id_ 字段，需要先添加再修改
SET @schema_name = DATABASE();
SET @sql = IF((SELECT COUNT(*) FROM information_schema.columns WHERE table_schema=@schema_name AND table_name='t_product_bug' AND column_name='requirement_id_')=0, 'ALTER TABLE t_product_bug ADD COLUMN requirement_id_ VARCHAR(36) NULL', 'ALTER TABLE t_product_bug MODIFY COLUMN requirement_id_ VARCHAR(36) NULL'); PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql = IF((SELECT COUNT(*) FROM information_schema.columns WHERE table_schema=@schema_name AND table_name='t_product_dev_task' AND column_name='requirement_id_')=0, 'ALTER TABLE t_product_dev_task ADD COLUMN requirement_id_ VARCHAR(36) NULL', 'ALTER TABLE t_product_dev_task MODIFY COLUMN requirement_id_ VARCHAR(36) NULL'); PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
