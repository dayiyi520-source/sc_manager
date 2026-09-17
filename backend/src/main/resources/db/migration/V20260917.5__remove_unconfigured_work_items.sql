CREATE TEMPORARY TABLE invalid_work_items (
  tenant_id_ VARCHAR(36) NOT NULL,
  id_ VARCHAR(36) NOT NULL,
  PRIMARY KEY (tenant_id_, id_)
);

INSERT INTO invalid_work_items (tenant_id_, id_)
SELECT item.tenant_id_, item.id_
FROM t_product_work_item item
LEFT JOIN t_product_line_work_item_type task_type
  ON task_type.tenant_id_ = item.tenant_id_
  AND task_type.product_line_id_ = item.product_line_id_
  AND task_type.id_ = item.task_type_id_
  AND task_type.enabled_ = 1
  AND task_type.delete_flag_ = 0
LEFT JOIN t_product_workflow workflow
  ON workflow.tenant_id_ = item.tenant_id_
  AND workflow.product_line_id_ = item.product_line_id_
  AND workflow.id_ = item.workflow_id_
  AND workflow.task_type_id_ = item.task_type_id_
  AND workflow.status_ = 'PUBLISHED'
  AND workflow.delete_flag_ = 0
WHERE item.delete_flag_ = 0
  AND (task_type.id_ IS NULL OR workflow.id_ IS NULL);

UPDATE t_product_work_item_relation relation_record
JOIN invalid_work_items invalid
  ON invalid.tenant_id_ = relation_record.tenant_id_
  AND (invalid.id_ = relation_record.source_id_ OR invalid.id_ = relation_record.target_id_)
SET relation_record.delete_flag_ = 1,
    relation_record.update_time_ = NOW(6);

DELETE activity
FROM t_product_work_item_activity activity
JOIN invalid_work_items invalid
  ON invalid.tenant_id_ = activity.tenant_id_
  AND invalid.id_ = activity.subject_id_;

DELETE automation_log
FROM t_product_automation_log automation_log
JOIN invalid_work_items invalid
  ON invalid.tenant_id_ = automation_log.tenant_id_
  AND invalid.id_ = automation_log.work_item_id_;

UPDATE t_product_work_item child
JOIN invalid_work_items invalid
  ON invalid.tenant_id_ = child.tenant_id_
  AND invalid.id_ = child.parent_work_item_id_
SET child.parent_work_item_id_ = NULL,
    child.update_time_ = NOW(6),
    child.version_ = child.version_ + 1
WHERE child.delete_flag_ = 0;

UPDATE t_product_work_item item
JOIN invalid_work_items invalid
  ON invalid.tenant_id_ = item.tenant_id_
  AND invalid.id_ = item.id_
SET item.delete_flag_ = 1,
    item.update_time_ = NOW(6),
    item.version_ = item.version_ + 1;

DROP TEMPORARY TABLE invalid_work_items;
