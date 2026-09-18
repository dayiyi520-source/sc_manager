INSERT INTO t_product_work_item_child_rule (
  id_, tenant_id_, product_line_id_, parent_type_id_, child_type_id_, enabled_, version_,
  create_by_, update_by_, create_time_, update_time_, delete_flag_
)
SELECT
  UUID(), parent.tenant_id_, parent.product_line_id_, parent.id_, child.id_, 1, 0,
  'system', 'system', NOW(6), NOW(6), 0
FROM t_product_line_work_item_type parent
JOIN t_product_line_work_item_type child
  ON child.tenant_id_ = parent.tenant_id_
 AND child.product_line_id_ = parent.product_line_id_
 AND child.category_ = '测试'
 AND child.name_ IN ('用例编写', '测试任务', '测试验收', '安全测试', '回归测试')
 AND child.enabled_ = 1
 AND child.delete_flag_ = 0
WHERE parent.category_ = '测试'
  AND parent.name_ = '测试任务'
  AND parent.enabled_ = 1
  AND parent.delete_flag_ = 0
ON DUPLICATE KEY UPDATE
  enabled_ = 1,
  delete_flag_ = 0,
  version_ = t_product_work_item_child_rule.version_ + 1,
  update_by_ = 'system',
  update_time_ = NOW(6);
