CREATE TEMPORARY TABLE tmp_case_work_item_template (
  name_ VARCHAR(128) NOT NULL PRIMARY KEY,
  is_default_ TINYINT NOT NULL
);

INSERT INTO tmp_case_work_item_template (name_, is_default_) VALUES
  ('功能测试', 1),
  ('性能测试', 0),
  ('兼容性测试', 0),
  ('易用性测试', 0),
  ('安全性测试', 0),
  ('稳定性测试', 0),
  ('接口测试', 0),
  ('自动化测试', 0),
  ('按照部署测试', 0),
  ('冒烟测试', 0),
  ('回归测试', 0),
  ('其他', 0);

INSERT INTO t_product_line_work_item_type (
  id_, tenant_id_, product_line_id_, category_, name_, description_, creator_name_,
  create_by_, update_by_, create_time_, update_time_, enabled_, is_default_, delete_flag_, version_
)
SELECT
  UUID(), line.tenant_id_, line.id_, '用例', template.name_, '系统预设模板', '系统模板',
  COALESCE(NULLIF(line.update_by_, ''), NULLIF(line.create_by_, ''), 'system'),
  COALESCE(NULLIF(line.update_by_, ''), NULLIF(line.create_by_, ''), 'system'),
  NOW(6), NOW(6), 1, 0, 0, 0
FROM t_product_line line
CROSS JOIN tmp_case_work_item_template template
WHERE line.delete_flag_ = 0
  AND NOT EXISTS (
    SELECT 1
    FROM t_product_line_work_item_type existing
    WHERE existing.tenant_id_ = line.tenant_id_
      AND existing.product_line_id_ = line.id_
      AND existing.category_ = '用例'
      AND existing.name_ = template.name_
      AND existing.delete_flag_ = 0
  );

CREATE TEMPORARY TABLE tmp_case_default_candidates AS
SELECT MIN(type.id_) AS id_
FROM t_product_line_work_item_type type
JOIN tmp_case_work_item_template template
  ON template.name_ = type.name_
 AND template.is_default_ = 1
WHERE type.category_ = '用例'
  AND type.delete_flag_ = 0
  AND type.enabled_ = 1
  AND NOT EXISTS (
    SELECT 1
    FROM t_product_line_work_item_type current_default
    WHERE current_default.tenant_id_ = type.tenant_id_
      AND current_default.product_line_id_ = type.product_line_id_
      AND current_default.category_ = '用例'
      AND current_default.is_default_ = 1
      AND current_default.enabled_ = 1
      AND current_default.delete_flag_ = 0
  )
GROUP BY type.tenant_id_, type.product_line_id_;

UPDATE t_product_line_work_item_type type
JOIN tmp_case_default_candidates candidate ON candidate.id_ = type.id_
SET type.is_default_ = 1,
    type.update_time_ = NOW(6),
    type.version_ = type.version_ + 1;

INSERT INTO t_product_workflow (
  id_, tenant_id_, product_line_id_, category_, task_type_id_, workflow_version_,
  name_, status_, definition_, version_, create_by_, update_by_, create_time_, update_time_, delete_flag_
)
SELECT
  UUID(), type.tenant_id_, type.product_line_id_, 'case', type.id_,
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
      JSON_OBJECT('key', 'status_pending', 'name', '待测试', 'group', 'NOT_STARTED', 'initial', TRUE, 'successful', FALSE, 'enabled', TRUE, 'stage', 'test', 'color', 'neutral'),
      JSON_OBJECT('key', 'status_passed', 'name', '已通过', 'group', 'COMPLETED', 'initial', FALSE, 'successful', TRUE, 'enabled', TRUE, 'stage', 'test', 'color', 'green'),
      JSON_OBJECT('key', 'status_failed', 'name', '未通过', 'group', 'IN_PROGRESS', 'initial', FALSE, 'successful', FALSE, 'enabled', TRUE, 'stage', 'test', 'color', 'red'),
      JSON_OBJECT('key', 'status_deferred', 'name', '暂缓', 'group', 'IN_PROGRESS', 'initial', FALSE, 'successful', FALSE, 'enabled', TRUE, 'stage', 'test', 'color', 'yellow')
    ),
    'transitions', JSON_ARRAY(
      JSON_OBJECT('key', 'pass_pending', 'from', 'status_pending', 'to', 'status_passed', 'name', '测试通过'),
      JSON_OBJECT('key', 'fail_pending', 'from', 'status_pending', 'to', 'status_failed', 'name', '测试未通过'),
      JSON_OBJECT('key', 'defer_pending', 'from', 'status_pending', 'to', 'status_deferred', 'name', '暂缓测试'),
      JSON_OBJECT('key', 'pass_failed', 'from', 'status_failed', 'to', 'status_passed', 'name', '复测通过'),
      JSON_OBJECT('key', 'defer_failed', 'from', 'status_failed', 'to', 'status_deferred', 'name', '暂缓测试'),
      JSON_OBJECT('key', 'pass_deferred', 'from', 'status_deferred', 'to', 'status_passed', 'name', '恢复并通过'),
      JSON_OBJECT('key', 'fail_deferred', 'from', 'status_deferred', 'to', 'status_failed', 'name', '恢复并未通过')
    )
  ),
  0, type.create_by_, type.update_by_, NOW(6), NOW(6), 0
FROM t_product_line_work_item_type type
JOIN tmp_case_work_item_template template ON template.name_ = type.name_
JOIN t_product_line line
  ON line.tenant_id_ = type.tenant_id_
 AND line.id_ = type.product_line_id_
 AND line.delete_flag_ = 0
WHERE type.category_ = '用例'
  AND type.delete_flag_ = 0
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

DROP TEMPORARY TABLE tmp_case_default_candidates;
DROP TEMPORARY TABLE tmp_case_work_item_template;
