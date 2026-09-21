-- Local acceptance data only: replace the legacy rows rendered as "历史事项"
-- with five assistance types and a spread of workflow states.
CREATE TEMPORARY TABLE local_historical_assistance (
  tenant_id_ VARCHAR(64) NOT NULL,
  id_ VARCHAR(64) NOT NULL,
  PRIMARY KEY (tenant_id_, id_)
);

CREATE TEMPORARY TABLE local_historical_assistance_item (
  tenant_id_ VARCHAR(64) NOT NULL,
  id_ VARCHAR(64) NOT NULL,
  PRIMARY KEY (tenant_id_, id_)
);

INSERT INTO local_historical_assistance (tenant_id_, id_)
SELECT tenant_id_, id_
FROM t_product_work_item
WHERE tenant_id_ = 'local-tenant'
  AND category_ = 'requirement'
  AND work_order_type_ IS NULL
  AND delete_flag_ = 0;

INSERT INTO local_historical_assistance_item (tenant_id_, id_)
SELECT item.tenant_id_, item.id_
FROM t_product_work_item item
JOIN local_historical_assistance historical
  ON historical.tenant_id_ = item.tenant_id_
  AND (historical.id_ = item.id_ OR historical.id_ = item.parent_work_item_id_)
WHERE item.tenant_id_ = 'local-tenant'
  AND item.delete_flag_ = 0;

UPDATE t_product_work_item_relation relation_record
JOIN local_historical_assistance historical
  ON historical.tenant_id_ = relation_record.tenant_id_
  AND (historical.id_ = relation_record.source_id_ OR historical.id_ = relation_record.target_id_)
SET relation_record.delete_flag_ = 1,
    relation_record.update_by_ = 'system-assistance-demo',
    relation_record.update_time_ = NOW(6)
WHERE relation_record.delete_flag_ = 0;

DELETE activity
FROM t_product_work_item_activity activity
JOIN local_historical_assistance historical
  ON historical.tenant_id_ = activity.tenant_id_
  AND historical.id_ = activity.subject_id_;

UPDATE t_product_attachment_resource attachment
JOIN local_historical_assistance_item historical
  ON historical.tenant_id_ = attachment.tenant_id_ AND historical.id_ = attachment.subject_id_
SET attachment.delete_flag_ = 1;

UPDATE t_product_work_item child
JOIN local_historical_assistance historical
  ON historical.tenant_id_ = child.tenant_id_
  AND historical.id_ = child.parent_work_item_id_
SET child.delete_flag_ = 1,
    child.update_by_ = 'system-assistance-demo',
    child.update_time_ = NOW(6),
    child.version_ = child.version_ + 1
WHERE child.delete_flag_ = 0;

UPDATE t_product_work_item item
JOIN local_historical_assistance historical
  ON historical.tenant_id_ = item.tenant_id_ AND historical.id_ = item.id_
SET item.delete_flag_ = 1,
    item.update_by_ = 'system-assistance-demo',
    item.update_time_ = NOW(6),
    item.version_ = item.version_ + 1;

CREATE TEMPORARY TABLE local_assistance_seed (
  seed_key_ VARCHAR(64) NOT NULL,
  type_name_ VARCHAR(64) NOT NULL,
  title_ VARCHAR(255) NOT NULL,
  description_ TEXT NOT NULL,
  priority_ VARCHAR(16) NOT NULL,
  status_key_ VARCHAR(64) NOT NULL,
  status_name_ VARCHAR(32) NOT NULL,
  status_group_ VARCHAR(32) NOT NULL,
  status_color_ VARCHAR(32) NOT NULL,
  successful_ TINYINT NOT NULL,
  age_days_ INT NOT NULL,
  PRIMARY KEY (seed_key_)
);

INSERT INTO local_assistance_seed VALUES
  ('customer-need-1', '客户诉求', '客户希望增加批量导出能力', '客户反馈现有列表逐条导出效率较低，希望支持按筛选条件批量导出。', 'P1', 'status_pending', '待处理', 'NOT_STARTED', 'neutral', 0, 1),
  ('customer-need-2', '客户诉求', '客户反馈移动端操作不便', '收集客户移动端使用反馈并确认优先优化的操作路径。', 'P2', 'status_in_progress', '处理中', 'IN_PROGRESS', 'blue', 0, 2),
  ('customer-need-3', '客户诉求', '客户确认报表口径调整', '已与客户确认报表口径和验收范围，形成可追溯的处理结论。', 'P2', 'status_completed', '已完成', 'COMPLETED', 'green', 1, 3),
  ('online-issue-1', '线上问题', '线上查询偶发超时', '定位高峰期查询超时的触发条件并给出临时规避方案。', 'P1', 'status_pending', '待处理', 'NOT_STARTED', 'neutral', 0, 1),
  ('online-issue-2', '线上问题', '生产环境消息延迟', '跟进消息队列延迟现象，核对影响范围和恢复进度。', 'P1', 'status_in_progress', '处理中', 'IN_PROGRESS', 'blue', 0, 2),
  ('online-issue-3', '线上问题', '线上权限异常已恢复', '完成权限异常复核，确认受影响用户可以正常访问。', 'P2', 'status_completed', '已完成', 'COMPLETED', 'green', 1, 4),
  ('presales-1', '售前支持', '售前演示环境准备', '为客户演示准备产品线、账号和典型业务数据。', 'P1', 'status_pending', '待处理', 'NOT_STARTED', 'neutral', 0, 1),
  ('presales-2', '售前支持', '售前方案技术答疑', '协助销售和客户澄清部署架构、接口能力和安全边界。', 'P2', 'status_in_progress', '处理中', 'IN_PROGRESS', 'blue', 0, 3),
  ('presales-3', '售前支持', '售前材料版本确认', '完成售前材料校对并确认当前版本的功能边界。', 'P2', 'status_completed', '已完成', 'COMPLETED', 'green', 1, 5),
  ('delivery-1', '交付支持', '交付初始化数据准备', '协助交付团队整理初始化数据和导入校验清单。', 'P1', 'status_pending', '待处理', 'NOT_STARTED', 'neutral', 0, 1),
  ('delivery-2', '交付支持', '交付现场问题跟进', '跟进现场反馈，协调产品和研发确认解决路径。', 'P1', 'status_in_progress', '处理中', 'IN_PROGRESS', 'blue', 0, 2),
  ('delivery-3', '交付支持', '交付验收材料补齐', '补齐交付验收材料并完成双方确认。', 'P2', 'status_completed', '已完成', 'COMPLETED', 'green', 1, 6),
  ('other-1', '其他问题', '内部流程咨询', '解答跨团队协作流程和事项流转规则相关问题。', 'P3', 'status_pending', '待处理', 'NOT_STARTED', 'neutral', 0, 1),
  ('other-2', '其他问题', '数据口径核对', '协助核对不同报表中的统计口径并记录差异。', 'P2', 'status_in_progress', '处理中', 'IN_PROGRESS', 'blue', 0, 3),
  ('other-3', '其他问题', '历史资料整理完成', '完成历史资料归档和检索标签补充。', 'P3', 'status_completed', '已完成', 'COMPLETED', 'green', 1, 7);

INSERT INTO t_product_work_item (
  id_, tenant_id_, product_line_id_, category_, task_type_id_, code_, title_, description_, description_html_, expected_goal_,
  workflow_id_, status_key_, status_name_, status_group_, status_color_, successful_, assignee_id_, assignee_name_, creator_name_, department_,
  requirement_type_, work_order_type_, special_fields_, priority_, planned_start_date_, planned_end_date_, actual_start_at_, completed_at_,
  estimated_hours_, actual_hours_, source_type_, request_id_, request_hash_, version_, create_by_, update_by_, create_time_, update_time_, delete_flag_,
  assistance_status_, assistance_initiator_id_, assistance_owner_id_, assistance_blocks_closure_, assistance_task_status_
)
SELECT
  UUID(), 'local-tenant', line.id_, 'requirement', type.id_, CONCAT('ASSIST-20260922-', seed.seed_key_), seed.title_, seed.description_, seed.description_, '',
  workflow.id_, seed.status_key_, seed.status_name_, seed.status_group_, seed.status_color_, seed.successful_, 'user-product', '张瑞', '林志豪', '产品中心',
  '协助事项', seed.type_name_, JSON_OBJECT('source', 'local-assistance-demo'), seed.priority_, CURDATE(), DATE_ADD(CURDATE(), INTERVAL 14 DAY),
  CASE WHEN seed.status_group_ = 'NOT_STARTED' THEN NULL ELSE TIMESTAMPADD(DAY, -seed.age_days_, NOW(6)) END,
  CASE WHEN seed.successful_ = 1 THEN TIMESTAMPADD(DAY, -(seed.age_days_ - 1), NOW(6)) ELSE NULL END,
  8, CASE WHEN seed.successful_ = 1 THEN 8 ELSE 0 END, 'WORK_ORDER', CONCAT('local-assistance-20260922-', seed.seed_key_), SHA2(CONCAT('local-assistance-20260922-', seed.seed_key_), 256),
  0, 'system-assistance-demo', 'system-assistance-demo', TIMESTAMPADD(DAY, -seed.age_days_, NOW(6)), NOW(6), 0,
  seed.status_name_, 'user-admin', 'user-product', 1, CASE WHEN seed.successful_ = 1 THEN 'COMPLETED' ELSE 'PROCESSING' END
FROM local_assistance_seed seed
JOIN t_product_line line
  ON line.tenant_id_ = 'local-tenant' AND line.name_ = '接口诊断产品线' AND line.delete_flag_ = 0
JOIN t_product_line_work_item_type type
  ON type.tenant_id_ = line.tenant_id_ AND type.product_line_id_ = line.id_ AND type.name_ = '产品类型需求' AND type.enabled_ = 1 AND type.delete_flag_ = 0
JOIN t_product_workflow workflow
  ON workflow.tenant_id_ = line.tenant_id_ AND workflow.product_line_id_ = line.id_ AND workflow.task_type_id_ = type.id_
  AND workflow.category_ = 'requirement' AND workflow.status_ = 'PUBLISHED' AND workflow.delete_flag_ = 0
  AND workflow.workflow_version_ = (
    SELECT MAX(latest.workflow_version_)
    FROM t_product_workflow latest
    WHERE latest.tenant_id_ = workflow.tenant_id_ AND latest.product_line_id_ = workflow.product_line_id_
      AND latest.task_type_id_ = workflow.task_type_id_ AND latest.category_ = workflow.category_
      AND latest.status_ = 'PUBLISHED' AND latest.delete_flag_ = 0
  )
WHERE NOT EXISTS (
  SELECT 1 FROM t_product_work_item existing
  WHERE existing.tenant_id_ = 'local-tenant' AND existing.request_id_ = CONCAT('local-assistance-20260922-', seed.seed_key_)
);

DROP TEMPORARY TABLE local_assistance_seed;
DROP TEMPORARY TABLE local_historical_assistance_item;
DROP TEMPORARY TABLE local_historical_assistance;
