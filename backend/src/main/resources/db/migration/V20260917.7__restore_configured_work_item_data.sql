INSERT INTO t_product_workflow (
  id_, tenant_id_, product_line_id_, category_, task_type_id_, workflow_version_,
  name_, status_, definition_, version_, create_by_, update_by_, create_time_, update_time_, delete_flag_
)
SELECT
  UUID(), task_type.tenant_id_, task_type.product_line_id_, category_workflow.category_, task_type.id_,
  (SELECT COALESCE(MAX(existing.workflow_version_), 0) + 1
   FROM t_product_workflow existing
   WHERE existing.tenant_id_ = task_type.tenant_id_
     AND existing.product_line_id_ = task_type.product_line_id_
     AND existing.category_ = category_workflow.category_
     AND existing.task_type_id_ = task_type.id_),
  CONCAT(task_type.name_, '状态配置'), 'PUBLISHED', category_workflow.definition_, 0,
  task_type.create_by_, task_type.update_by_, NOW(6), NOW(6), 0
FROM t_product_line_work_item_type task_type
JOIN t_product_workflow category_workflow
  ON category_workflow.tenant_id_ = task_type.tenant_id_
  AND category_workflow.product_line_id_ = task_type.product_line_id_
  AND category_workflow.task_type_id_ IS NULL
  AND category_workflow.category_ = CASE task_type.category_
    WHEN '需求' THEN 'requirement'
    WHEN '设计' THEN 'design'
    WHEN '研发' THEN 'dev'
    WHEN '测试' THEN 'test'
    WHEN '缺陷' THEN 'bug'
  END
  AND category_workflow.status_ = 'PUBLISHED'
  AND category_workflow.delete_flag_ = 0
WHERE task_type.enabled_ = 1
  AND task_type.delete_flag_ = 0
  AND task_type.category_ IN ('需求', '设计', '研发', '测试', '缺陷')
  AND NOT EXISTS (
    SELECT 1
    FROM t_product_workflow type_workflow
    WHERE type_workflow.tenant_id_ = task_type.tenant_id_
      AND type_workflow.product_line_id_ = task_type.product_line_id_
      AND type_workflow.task_type_id_ = task_type.id_
      AND type_workflow.status_ = 'PUBLISHED'
      AND type_workflow.delete_flag_ = 0
  );

UPDATE t_product_work_item item
JOIN t_product_line_work_item_type task_type
  ON task_type.tenant_id_ = item.tenant_id_
  AND task_type.product_line_id_ = item.product_line_id_
  AND task_type.id_ = item.task_type_id_
  AND task_type.enabled_ = 1
  AND task_type.delete_flag_ = 0
JOIN t_product_workflow workflow
  ON workflow.tenant_id_ = item.tenant_id_
  AND workflow.product_line_id_ = item.product_line_id_
  AND workflow.category_ = item.category_
  AND workflow.task_type_id_ = item.task_type_id_
  AND workflow.status_ = 'PUBLISHED'
  AND workflow.delete_flag_ = 0
SET item.workflow_id_ = workflow.id_,
    item.delete_flag_ = 0,
    item.update_by_ = 'system-migration',
    item.update_time_ = NOW(6),
    item.version_ = item.version_ + 1
WHERE item.source_type_ = 'DEMO'
  AND item.delete_flag_ = 1
  AND workflow.workflow_version_ = (
    SELECT MAX(latest.workflow_version_)
    FROM t_product_workflow latest
    WHERE latest.tenant_id_ = workflow.tenant_id_
      AND latest.product_line_id_ = workflow.product_line_id_
      AND latest.task_type_id_ = workflow.task_type_id_
      AND latest.status_ = 'PUBLISHED'
      AND latest.delete_flag_ = 0
  );
