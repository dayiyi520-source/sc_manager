-- Local-only acceptance data for the action breakdown tree.
INSERT IGNORE INTO t_okr_record
  (id_, tenant_id_, kind_, owner_id_, period_key_, status_, payload_, create_by_, update_by_, create_time_, update_time_, delete_flag_)
VALUES
  ('demo-action-parent-satisfaction', 'local-tenant', 'action', 'user-admin', '2026-09', 'active',
   JSON_OBJECT('title', '提升客户满意度', 'department', '公司级', 'parentObjectiveId', 'demo-objective-admin-platform', 'parentActionId', '', 'creatorId', 'user-admin', 'assigneeIds', JSON_ARRAY('user-admin'), 'assigneeName', '林志豪', 'structureType', 'support', 'acceptanceStandard', '客户满意度达到 9 分', 'deadline', '2026-09-30', 'weight', 40),
   'system', 'system', '2026-09-01 09:00:00.000000', '2026-09-01 09:00:00.000000', 0),
  ('demo-action-parent-delivery', 'local-tenant', 'action', 'user-admin', '2026-09', 'active',
   JSON_OBJECT('title', '保障重点项目稳定交付', 'department', '公司级', 'parentObjectiveId', 'demo-objective-admin-platform', 'parentActionId', '', 'creatorId', 'user-admin', 'assigneeIds', JSON_ARRAY('user-admin'), 'assigneeName', '林志豪', 'structureType', 'delivery', 'businessObject', '重点客户项目', 'milestone', '完成项目初验', 'deadline', '2026-09-30', 'weight', 35),
   'system', 'system', '2026-09-01 09:01:00.000000', '2026-09-01 09:01:00.000000', 0),
  ('demo-action-parent-platform', 'local-tenant', 'action', 'user-admin', '2026-09', 'active',
   JSON_OBJECT('title', '推进平台智能化能力建设', 'department', '公司级', 'parentObjectiveId', 'demo-objective-admin-platform', 'parentActionId', '', 'creatorId', 'user-admin', 'assigneeIds', JSON_ARRAY('user-admin'), 'assigneeName', '林志豪', 'structureType', 'product', 'productLine', '协同管理平台', 'milestone', '完成智能客服方案评审', 'deadline', '2026-09-30', 'weight', 25),
   'system', 'system', '2026-09-01 09:02:00.000000', '2026-09-01 09:02:00.000000', 0),
  ('demo-action-child-service', 'local-tenant', 'action', 'user-admin', '2026-09', 'active',
   JSON_OBJECT('title', '提升客服首次响应率', 'department', '产研部门', 'parentObjectiveId', 'demo-objective-admin-platform', 'parentActionId', 'demo-action-parent-satisfaction', 'creatorId', 'user-admin', 'assigneeIds', JSON_ARRAY('user-product', 'user-tech'), 'assigneeName', '产品负责人、技术负责人', 'structureType', 'product', 'productLine', '客户服务', 'milestone', '首次响应率达到 95%', 'deadline', '2026-09-20', 'weight', 30),
   'system', 'system', '2026-09-02 10:00:00.000000', '2026-09-02 10:00:00.000000', 0),
  ('demo-action-child-survey', 'local-tenant', 'action', 'user-admin', '2026-09', 'active',
   JSON_OBJECT('title', '完成客户满意度回访与问卷', 'department', '其他支撑', 'parentObjectiveId', 'demo-objective-admin-platform', 'parentActionId', 'demo-action-parent-satisfaction', 'creatorId', 'user-admin', 'assigneeIds', JSON_ARRAY('user-sales'), 'assigneeName', '销售负责人', 'structureType', 'support', 'acceptanceStandard', '完成重点客户回访并回收问卷', 'deadline', '2026-09-25', 'weight', 20),
   'system', 'system', '2026-09-02 10:01:00.000000', '2026-09-02 10:01:00.000000', 0);
