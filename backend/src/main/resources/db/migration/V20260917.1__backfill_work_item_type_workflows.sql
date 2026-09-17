INSERT INTO t_product_workflow (
  id_, tenant_id_, product_line_id_, category_, task_type_id_, workflow_version_,
  name_, status_, definition_, version_, create_by_, update_by_, create_time_, update_time_, delete_flag_
)
SELECT
  UUID(),
  task_type.tenant_id_,
  task_type.product_line_id_,
  CASE task_type.category_
    WHEN '需求' THEN 'requirement'
    WHEN '设计' THEN 'design'
    WHEN '研发' THEN 'dev'
    WHEN '测试' THEN 'test'
    WHEN '缺陷' THEN 'bug'
  END,
  task_type.id_,
  (
    SELECT COALESCE(MAX(existing.workflow_version_), 0) + 1
    FROM t_product_workflow existing
    WHERE existing.tenant_id_ = task_type.tenant_id_
      AND existing.product_line_id_ = task_type.product_line_id_
      AND existing.task_type_id_ = task_type.id_
  ),
  CONCAT(task_type.name_, '状态配置'),
  'PUBLISHED',
  JSON_OBJECT(
    'states', JSON_ARRAY(
      JSON_OBJECT('key', 'status_pending', 'name', '待处理', 'group', 'NOT_STARTED', 'initial', TRUE, 'successful', FALSE, 'enabled', TRUE, 'stage', CASE WHEN task_type.category_ = '缺陷' THEN 'dev' ELSE CASE task_type.category_ WHEN '需求' THEN 'requirement' WHEN '设计' THEN 'design' WHEN '研发' THEN 'dev' WHEN '测试' THEN 'test' END END, 'color', 'neutral'),
      JSON_OBJECT('key', 'status_in_progress', 'name', '处理中', 'group', 'IN_PROGRESS', 'initial', FALSE, 'successful', FALSE, 'enabled', TRUE, 'stage', CASE WHEN task_type.category_ = '缺陷' THEN 'dev' ELSE CASE task_type.category_ WHEN '需求' THEN 'requirement' WHEN '设计' THEN 'design' WHEN '研发' THEN 'dev' WHEN '测试' THEN 'test' END END, 'color', 'blue'),
      JSON_OBJECT('key', 'status_completed', 'name', '已完成', 'group', 'COMPLETED', 'initial', FALSE, 'successful', TRUE, 'enabled', TRUE, 'stage', CASE WHEN task_type.category_ = '缺陷' THEN 'dev' ELSE CASE task_type.category_ WHEN '需求' THEN 'requirement' WHEN '设计' THEN 'design' WHEN '研发' THEN 'dev' WHEN '测试' THEN 'test' END END, 'color', 'green')
    ),
    'transitions', JSON_ARRAY(
      JSON_OBJECT('key', 'move_status_pending_status_in_progress', 'from', 'status_pending', 'to', 'status_in_progress', 'name', '进入处理中', 'roles', JSON_ARRAY('admin', 'product_manager', 'tech_lead'), 'requiredFields', JSON_ARRAY()),
      JSON_OBJECT('key', 'move_status_in_progress_status_completed', 'from', 'status_in_progress', 'to', 'status_completed', 'name', '进入已完成', 'roles', JSON_ARRAY('admin', 'product_manager', 'tech_lead'), 'requiredFields', JSON_ARRAY())
    )
  ),
  0,
  task_type.create_by_,
  task_type.update_by_,
  NOW(6),
  NOW(6),
  0
FROM t_product_line_work_item_type task_type
WHERE task_type.delete_flag_ = 0
  AND task_type.enabled_ = 1
  AND task_type.category_ IN ('需求', '设计', '研发', '测试', '缺陷')
  AND NOT EXISTS (
    SELECT 1
    FROM t_product_workflow published_type
    WHERE published_type.tenant_id_ = task_type.tenant_id_
      AND published_type.product_line_id_ = task_type.product_line_id_
      AND published_type.task_type_id_ = task_type.id_
      AND published_type.status_ = 'PUBLISHED'
      AND published_type.delete_flag_ = 0
  )
  AND NOT EXISTS (
    SELECT 1
    FROM t_product_workflow published_category
    WHERE published_category.tenant_id_ = task_type.tenant_id_
      AND published_category.product_line_id_ = task_type.product_line_id_
      AND published_category.task_type_id_ IS NULL
      AND published_category.category_ = CASE task_type.category_
        WHEN '需求' THEN 'requirement'
        WHEN '设计' THEN 'design'
        WHEN '研发' THEN 'dev'
        WHEN '测试' THEN 'test'
        WHEN '缺陷' THEN 'bug'
      END
      AND published_category.status_ = 'PUBLISHED'
      AND published_category.delete_flag_ = 0
  );
