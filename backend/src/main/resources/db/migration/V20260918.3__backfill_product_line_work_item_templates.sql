CREATE TEMPORARY TABLE tmp_product_line_work_item_template (
  category_ VARCHAR(16) NOT NULL,
  api_category_ VARCHAR(16) NOT NULL,
  name_ VARCHAR(128) NOT NULL,
  is_default_ TINYINT NOT NULL,
  stage_ VARCHAR(16) NOT NULL,
  PRIMARY KEY (category_, name_)
);

INSERT INTO tmp_product_line_work_item_template (category_, api_category_, name_, is_default_, stage_) VALUES
  ('需求', 'requirement', '产品类型需求', 1, 'requirement'),
  ('需求', 'requirement', '技术类需求', 0, 'requirement'),
  ('需求', 'requirement', '数据类需求', 0, 'requirement'),
  ('需求', 'requirement', '其他需求', 0, 'requirement'),
  ('设计', 'design', '需求设计', 1, 'design'),
  ('设计', 'design', '物料设计', 0, 'design'),
  ('设计', 'design', '其他设计', 0, 'design'),
  ('研发', 'dev', '开发任务', 1, 'dev'),
  ('研发', 'dev', '缺陷修复任务', 0, 'dev'),
  ('研发', 'dev', '样式优化任务', 0, 'dev'),
  ('研发', 'dev', '性能优化任务', 0, 'dev'),
  ('研发', 'dev', '其他任务', 0, 'dev'),
  ('测试', 'test', '测试任务', 1, 'test'),
  ('测试', 'test', '用例编写', 0, 'test'),
  ('测试', 'test', '测试验收', 0, 'test'),
  ('测试', 'test', '安全测试', 0, 'test'),
  ('测试', 'test', '回归测试', 0, 'test'),
  ('缺陷', 'bug', '系统缺陷', 1, 'dev'),
  ('缺陷', 'bug', '样式缺陷', 0, 'dev'),
  ('缺陷', 'bug', '线上故障', 0, 'dev'),
  ('缺陷', 'bug', '安全漏洞', 0, 'dev');

INSERT INTO t_product_line_work_item_type (
  id_, tenant_id_, product_line_id_, category_, name_, description_, creator_name_,
  create_by_, update_by_, create_time_, update_time_, enabled_, is_default_, delete_flag_, version_
)
SELECT
  UUID(), line.tenant_id_, line.id_, template.category_, template.name_, '系统预设模板', '系统模板',
  COALESCE(NULLIF(line.update_by_, ''), NULLIF(line.create_by_, ''), 'system'),
  COALESCE(NULLIF(line.update_by_, ''), NULLIF(line.create_by_, ''), 'system'),
  NOW(), NOW(), 1, 0, 0, 0
FROM t_product_line line
CROSS JOIN tmp_product_line_work_item_template template
WHERE line.delete_flag_ = 0
  AND NOT EXISTS (
    SELECT 1
    FROM t_product_line_work_item_type existing
    WHERE existing.tenant_id_ = line.tenant_id_
      AND existing.product_line_id_ = line.id_
      AND existing.category_ = template.category_
      AND existing.name_ = template.name_
      AND existing.delete_flag_ = 0
  );

CREATE TEMPORARY TABLE tmp_product_line_default_candidates AS
SELECT MIN(type.id_) AS id_
FROM t_product_line_work_item_type type
JOIN tmp_product_line_work_item_template template
  ON template.category_ = type.category_
 AND template.name_ = type.name_
 AND template.is_default_ = 1
WHERE type.delete_flag_ = 0
  AND type.enabled_ = 1
  AND NOT EXISTS (
    SELECT 1
    FROM t_product_line_work_item_type current_default
    WHERE current_default.tenant_id_ = type.tenant_id_
      AND current_default.product_line_id_ = type.product_line_id_
      AND current_default.category_ = type.category_
      AND current_default.is_default_ = 1
      AND current_default.enabled_ = 1
      AND current_default.delete_flag_ = 0
  )
GROUP BY type.tenant_id_, type.product_line_id_, type.category_;

UPDATE t_product_line_work_item_type type
JOIN tmp_product_line_default_candidates candidate ON candidate.id_ = type.id_
SET type.is_default_ = 1,
    type.update_time_ = NOW(),
    type.version_ = type.version_ + 1;

INSERT INTO t_product_workflow (
  id_, tenant_id_, product_line_id_, category_, task_type_id_, workflow_version_,
  name_, status_, definition_, version_, create_by_, update_by_, create_time_, update_time_, delete_flag_
)
SELECT
  UUID(), type.tenant_id_, type.product_line_id_, template.api_category_, type.id_,
  (
    SELECT COALESCE(MAX(existing.workflow_version_), 0) + 1
    FROM t_product_workflow existing
    WHERE existing.tenant_id_ = type.tenant_id_
      AND existing.product_line_id_ = type.product_line_id_
      AND existing.task_type_id_ = type.id_
  ),
  CONCAT(type.name_, '状态配置'),
  'PUBLISHED',
  JSON_OBJECT(
    'states', JSON_ARRAY(
      JSON_OBJECT('key', 'status_pending', 'name', '待处理', 'group', 'NOT_STARTED', 'initial', TRUE, 'successful', FALSE, 'enabled', TRUE, 'stage', template.stage_, 'color', 'neutral'),
      JSON_OBJECT('key', 'status_in_progress', 'name', '处理中', 'group', 'IN_PROGRESS', 'initial', FALSE, 'successful', FALSE, 'enabled', TRUE, 'stage', template.stage_, 'color', 'blue'),
      JSON_OBJECT('key', 'status_completed', 'name', '已完成', 'group', 'COMPLETED', 'initial', FALSE, 'successful', TRUE, 'enabled', TRUE, 'stage', template.stage_, 'color', 'green'),
      JSON_OBJECT('key', 'status_cancelled', 'name', '已取消', 'group', 'CANCELLED', 'initial', FALSE, 'successful', FALSE, 'enabled', TRUE, 'stage', template.stage_, 'color', 'neutral')
    ),
    'transitions', JSON_ARRAY(
      JSON_OBJECT('key', 'start_processing', 'from', 'status_pending', 'to', 'status_in_progress', 'name', '进入处理中'),
      JSON_OBJECT('key', 'complete', 'from', 'status_in_progress', 'to', 'status_completed', 'name', '完成'),
      JSON_OBJECT('key', 'cancel_pending', 'from', 'status_pending', 'to', 'status_cancelled', 'name', '取消'),
      JSON_OBJECT('key', 'cancel_processing', 'from', 'status_in_progress', 'to', 'status_cancelled', 'name', '取消')
    )
  ),
  0, type.create_by_, type.update_by_, NOW(6), NOW(6), 0
FROM t_product_line_work_item_type type
JOIN tmp_product_line_work_item_template template
  ON template.category_ = type.category_
 AND template.name_ = type.name_
JOIN t_product_line line
  ON line.tenant_id_ = type.tenant_id_
 AND line.id_ = type.product_line_id_
 AND line.delete_flag_ = 0
WHERE type.delete_flag_ = 0
  AND type.enabled_ = 1
  AND NOT EXISTS (
    SELECT 1
    FROM t_product_workflow published
    WHERE published.tenant_id_ = type.tenant_id_
      AND published.product_line_id_ = type.product_line_id_
      AND published.task_type_id_ = type.id_
      AND published.status_ = 'PUBLISHED'
      AND published.delete_flag_ = 0
  );

DROP TEMPORARY TABLE tmp_product_line_default_candidates;
DROP TEMPORARY TABLE tmp_product_line_work_item_template;
