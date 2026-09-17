INSERT INTO t_product_work_item (
  id_, tenant_id_, product_line_id_, category_, task_type_id_, code_, title_, description_, expected_goal_,
  version_id_, requirement_id_, parent_work_item_id_, workflow_id_, status_key_, status_name_, status_group_,
  status_color_, successful_, assignee_id_, assignee_name_, priority_, planned_start_date_, planned_end_date_,
  estimated_hours_, actual_hours_, source_type_, request_id_, request_hash_, version_, create_by_, update_by_,
  create_time_, update_time_, delete_flag_
)
SELECT
  UUID(), product_line.tenant_id_, product_line.id_, seed.category_key_, task_type.id_,
  CONCAT('WI-LOCAL-', UPPER(seed.category_key_), '-001'), seed.title_, seed.description_, seed.expected_goal_,
  NULL, NULL, NULL, workflow.id_,
  JSON_UNQUOTE(JSON_EXTRACT(workflow.definition_, '$.states[0].key')),
  JSON_UNQUOTE(JSON_EXTRACT(workflow.definition_, '$.states[0].name')),
  JSON_UNQUOTE(JSON_EXTRACT(workflow.definition_, '$.states[0].group')),
  COALESCE(NULLIF(JSON_UNQUOTE(JSON_EXTRACT(workflow.definition_, '$.states[0].color')), 'null'), 'neutral'),
  0, NULL, NULL, seed.priority_, CURDATE(), DATE_ADD(CURDATE(), INTERVAL 14 DAY),
  seed.estimated_hours_, 0, 'DEMO', CONCAT('local-configured-', seed.category_key_, '-001'),
  SHA2(CONCAT('local-configured-', seed.category_key_, '-001'), 256), 0,
  'system-demo', 'system-demo', NOW(6), NOW(6), 0
FROM (
  SELECT 'requirement' category_key_, '需求' category_label_, '统一权限范围验收需求' title_, '验证私密产品线和统一工作项的数据范围。' description_, '只有授权成员可以查看和维护工作项。' expected_goal_, 'P1' priority_, 16 estimated_hours_
  UNION ALL SELECT 'design', '设计', '测试与缺陷页面交互设计', '统一测试任务与缺陷管理的页面结构和筛选交互。', '页面使用统一工作项配置和状态流程。', 'P2', 8
  UNION ALL SELECT 'dev', '研发', '统一工作项存储收口', '将产研任务的创建、读取和编辑统一到工作项存储。', '生产链路不再依赖浏览器回退数据。', 'P1', 24
  UNION ALL SELECT 'test', '测试', '统一工作项回归测试', '覆盖产品线权限、任务创建、编辑和状态流转。', '五类工作项均可通过真实接口验收。', 'P1', 12
  UNION ALL SELECT 'bug', '缺陷', '历史工作项流程绑定异常', '历史工作项未绑定子类型流程时无法可靠判断完成度。', '无效历史数据删除，新数据绑定有效流程。', 'P1', 6
) seed
JOIN (
  SELECT p.id_, p.tenant_id_
  FROM t_product_line p
  WHERE p.tenant_id_ = 'local-tenant'
    AND p.delete_flag_ = 0
    AND (
      SELECT COUNT(DISTINCT type_count.category_)
      FROM t_product_line_work_item_type type_count
      WHERE type_count.tenant_id_ = p.tenant_id_
        AND type_count.product_line_id_ = p.id_
        AND type_count.enabled_ = 1
        AND type_count.delete_flag_ = 0
        AND type_count.category_ IN ('需求', '设计', '研发', '测试', '缺陷')
    ) = 5
  ORDER BY p.create_time_, p.id_
  LIMIT 1
) product_line
JOIN t_product_line_work_item_type task_type
  ON task_type.tenant_id_ = product_line.tenant_id_
  AND task_type.product_line_id_ = product_line.id_
  AND task_type.category_ = seed.category_label_
  AND task_type.enabled_ = 1
  AND task_type.delete_flag_ = 0
  AND task_type.id_ = (
    SELECT MIN(selected_type.id_)
    FROM t_product_line_work_item_type selected_type
    WHERE selected_type.tenant_id_ = product_line.tenant_id_
      AND selected_type.product_line_id_ = product_line.id_
      AND selected_type.category_ = seed.category_label_
      AND selected_type.enabled_ = 1
      AND selected_type.delete_flag_ = 0
  )
JOIN t_product_workflow workflow
  ON workflow.tenant_id_ = product_line.tenant_id_
  AND workflow.product_line_id_ = product_line.id_
  AND workflow.category_ = seed.category_key_
  AND workflow.task_type_id_ = task_type.id_
  AND workflow.status_ = 'PUBLISHED'
  AND workflow.delete_flag_ = 0
  AND workflow.workflow_version_ = (
    SELECT MAX(latest.workflow_version_)
    FROM t_product_workflow latest
    WHERE latest.tenant_id_ = workflow.tenant_id_
      AND latest.product_line_id_ = workflow.product_line_id_
      AND latest.task_type_id_ = workflow.task_type_id_
      AND latest.status_ = 'PUBLISHED'
      AND latest.delete_flag_ = 0
  )
WHERE NOT EXISTS (
  SELECT 1
  FROM t_product_work_item existing
  WHERE existing.tenant_id_ = product_line.tenant_id_
    AND existing.product_line_id_ = product_line.id_
    AND existing.request_id_ = CONCAT('local-configured-', seed.category_key_, '-001')
);
