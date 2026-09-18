ALTER TABLE t_product_test_plan
  ADD COLUMN name_ VARCHAR(120) NULL AFTER version_id_,
  ADD COLUMN start_date_ DATE NULL AFTER environment_,
  ADD COLUMN end_date_ DATE NULL AFTER start_date_;

UPDATE t_product_test_plan
SET name_ = CONCAT('测试计划-', LEFT(id_, 8))
WHERE name_ IS NULL OR TRIM(name_) = '';

ALTER TABLE t_product_test_plan
  MODIFY COLUMN name_ VARCHAR(120) NOT NULL,
  DROP INDEX uk_test_plan_work_item,
  ADD KEY idx_test_plan_work_item (tenant_id_, work_item_id_, delete_flag_, create_time_);
