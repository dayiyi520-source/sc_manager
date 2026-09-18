ALTER TABLE t_product_test_case
  ADD COLUMN task_type_id_ VARCHAR(36) NULL AFTER tags_,
  ADD COLUMN workflow_id_ VARCHAR(36) NULL AFTER task_type_id_,
  ADD COLUMN status_key_ VARCHAR(64) NULL AFTER workflow_id_,
  ADD COLUMN status_name_ VARCHAR(128) NULL AFTER status_key_,
  ADD COLUMN status_group_ VARCHAR(32) NULL AFTER status_name_,
  ADD COLUMN status_color_ VARCHAR(32) NULL AFTER status_group_;

INSERT INTO t_product_workflow (
  id_, tenant_id_, product_line_id_, category_, task_type_id_, workflow_version_,
  name_, status_, definition_, version_, create_by_, update_by_, create_time_, update_time_, delete_flag_
)
SELECT
  UUID(), type.tenant_id_, type.product_line_id_, 'case', type.id_,
  (SELECT COALESCE(MAX(existing.workflow_version_), 0) + 1
     FROM t_product_workflow existing
    WHERE existing.tenant_id_ = type.tenant_id_
      AND existing.product_line_id_ = type.product_line_id_
      AND existing.task_type_id_ = type.id_),
  CONCAT(type.name_, '阶段配置'), 'PUBLISHED',
  JSON_OBJECT(
    'states', JSON_ARRAY(
      JSON_OBJECT('key', 'status_pending', 'name', '待测试', 'group', 'NOT_STARTED', 'initial', TRUE, 'successful', FALSE, 'enabled', TRUE, 'stage', 'test', 'color', 'neutral'),
      JSON_OBJECT('key', 'status_in_progress', 'name', '测试中', 'group', 'IN_PROGRESS', 'initial', FALSE, 'successful', FALSE, 'enabled', TRUE, 'stage', 'test', 'color', 'blue'),
      JSON_OBJECT('key', 'status_deferred', 'name', '暂缓', 'group', 'IN_PROGRESS', 'initial', FALSE, 'successful', FALSE, 'enabled', TRUE, 'stage', 'test', 'color', 'yellow'),
      JSON_OBJECT('key', 'status_completed', 'name', '已完成', 'group', 'COMPLETED', 'initial', FALSE, 'successful', TRUE, 'enabled', TRUE, 'stage', 'test', 'color', 'green')
    ),
    'transitions', JSON_ARRAY(
      JSON_OBJECT('key', 'start_testing', 'from', 'status_pending', 'to', 'status_in_progress', 'name', '开始测试'),
      JSON_OBJECT('key', 'defer_pending', 'from', 'status_pending', 'to', 'status_deferred', 'name', '暂缓测试'),
      JSON_OBJECT('key', 'defer_testing', 'from', 'status_in_progress', 'to', 'status_deferred', 'name', '暂缓测试'),
      JSON_OBJECT('key', 'resume_testing', 'from', 'status_deferred', 'to', 'status_in_progress', 'name', '恢复测试'),
      JSON_OBJECT('key', 'complete_testing', 'from', 'status_in_progress', 'to', 'status_completed', 'name', '完成测试')
    )
  ),
  0, type.create_by_, type.update_by_, NOW(6), NOW(6), 0
FROM t_product_line_work_item_type type
WHERE type.category_ = '用例'
  AND type.enabled_ = 1
  AND type.delete_flag_ = 0
  AND NOT EXISTS (
    SELECT 1 FROM t_product_workflow workflow
     WHERE workflow.tenant_id_ = type.tenant_id_
       AND workflow.product_line_id_ = type.product_line_id_
       AND workflow.task_type_id_ = type.id_
       AND workflow.category_ = 'case'
       AND workflow.status_ = 'PUBLISHED'
       AND workflow.delete_flag_ = 0
       AND JSON_UNQUOTE(JSON_EXTRACT(workflow.definition_, '$.states[1].name')) = '测试中'
       AND JSON_UNQUOTE(JSON_EXTRACT(workflow.definition_, '$.states[3].name')) = '已完成'
  );

CREATE TEMPORARY TABLE tmp_test_case_stage_binding AS
SELECT line.tenant_id_, line.id_ AS product_line_id_,
       (SELECT type.id_
          FROM t_product_line_work_item_type type
         WHERE type.tenant_id_ = line.tenant_id_
           AND type.product_line_id_ = line.id_
           AND type.category_ = '用例'
           AND type.enabled_ = 1
           AND type.delete_flag_ = 0
         ORDER BY type.is_default_ DESC, type.create_time_, type.id_
         LIMIT 1) AS task_type_id_
FROM t_product_line line
WHERE line.delete_flag_ = 0;

ALTER TABLE tmp_test_case_stage_binding ADD COLUMN workflow_id_ VARCHAR(36) NULL;

UPDATE tmp_test_case_stage_binding binding
SET workflow_id_ = (
  SELECT workflow.id_
    FROM t_product_workflow workflow
   WHERE workflow.tenant_id_ = binding.tenant_id_
     AND workflow.product_line_id_ = binding.product_line_id_
     AND workflow.task_type_id_ = binding.task_type_id_
     AND workflow.category_ = 'case'
     AND workflow.status_ = 'PUBLISHED'
     AND workflow.delete_flag_ = 0
   ORDER BY workflow.workflow_version_ DESC
   LIMIT 1
);

UPDATE t_product_test_case test_case
JOIN tmp_test_case_stage_binding binding
  ON binding.tenant_id_ = test_case.tenant_id_
 AND binding.product_line_id_ = test_case.product_line_id_
SET test_case.task_type_id_ = binding.task_type_id_,
    test_case.workflow_id_ = binding.workflow_id_,
    test_case.status_key_ = 'status_pending',
    test_case.status_name_ = '待测试',
    test_case.status_group_ = 'NOT_STARTED',
    test_case.status_color_ = 'neutral'
WHERE test_case.delete_flag_ = 0;

DROP TEMPORARY TABLE tmp_test_case_stage_binding;

ALTER TABLE t_product_test_case
  MODIFY task_type_id_ VARCHAR(36) NOT NULL,
  MODIFY workflow_id_ VARCHAR(36) NOT NULL,
  MODIFY status_key_ VARCHAR(64) NOT NULL,
  MODIFY status_name_ VARCHAR(128) NOT NULL,
  MODIFY status_group_ VARCHAR(32) NOT NULL,
  MODIFY status_color_ VARCHAR(32) NOT NULL,
  ADD KEY idx_test_case_type_stage (tenant_id_,product_line_id_,task_type_id_,status_group_,delete_flag_);
