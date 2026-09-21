-- 缺陷与研发任务既可以由工单流转生成，也可以在各自菜单独立新建。
-- 独立新建时没有来源需求，因此来源关联允许为空。
ALTER TABLE t_product_bug MODIFY COLUMN requirement_id_ VARCHAR(36) NULL;
ALTER TABLE t_product_dev_task MODIFY COLUMN requirement_id_ VARCHAR(36) NULL;
