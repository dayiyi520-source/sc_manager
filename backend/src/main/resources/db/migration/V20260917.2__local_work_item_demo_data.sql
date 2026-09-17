-- Local acceptance data only. Production tenants are unaffected because the target
-- tenant and product line are the fixed local development identities.
INSERT INTO t_product_work_item_child_rule (
  id_, tenant_id_, product_line_id_, parent_type_id_, child_type_id_, enabled_,
  version_, create_by_, update_by_, create_time_, update_time_, delete_flag_
)
SELECT
  UUID(), parent_type.tenant_id_, parent_type.product_line_id_, parent_type.id_, child_type.id_, 1,
  0, 'system-demo', 'system-demo', NOW(6), NOW(6), 0
FROM t_product_line_work_item_type parent_type
JOIN t_product_line_work_item_type child_type
  ON child_type.tenant_id_ = parent_type.tenant_id_
  AND child_type.product_line_id_ = parent_type.product_line_id_
  AND child_type.enabled_ = 1
  AND child_type.delete_flag_ = 0
  AND (
    (parent_type.category_ = '需求' AND child_type.category_ IN ('设计', '研发', '测试'))
    OR (parent_type.category_ = '设计' AND child_type.category_ IN ('研发', '测试'))
    OR (parent_type.category_ = '研发' AND child_type.category_ IN ('研发', '测试'))
    OR (parent_type.category_ = '测试' AND child_type.category_ = '缺陷')
    OR (parent_type.category_ = '缺陷' AND child_type.category_ = '缺陷')
  )
WHERE parent_type.tenant_id_ = 'local-tenant'
  AND parent_type.product_line_id_ = '668a8714-1f4c-4c3a-92eb-f1a29927cccb'
  AND parent_type.enabled_ = 1
  AND parent_type.delete_flag_ = 0
  AND NOT EXISTS (
    SELECT 1
    FROM t_product_work_item_child_rule existing
    WHERE existing.tenant_id_ = parent_type.tenant_id_
      AND existing.product_line_id_ = parent_type.product_line_id_
      AND existing.parent_type_id_ = parent_type.id_
      AND existing.child_type_id_ = child_type.id_
  );

INSERT INTO t_product_work_item (
  id_, tenant_id_, product_line_id_, category_, task_type_id_, code_, title_, description_, expected_goal_,
  version_id_, requirement_id_, parent_work_item_id_, workflow_id_, status_key_, status_name_, status_group_,
  status_color_, successful_, assignee_id_, assignee_name_, priority_, planned_start_date_, planned_end_date_,
  actual_start_at_, completed_at_, estimated_hours_, actual_hours_, source_type_, request_id_, request_hash_,
  version_, create_by_, update_by_, create_time_, update_time_, delete_flag_
)
SELECT
  seed.id_, product_line.tenant_id_, product_line.id_, seed.category_key_, work_type.id_, seed.code_, seed.title_, seed.description_, '',
  NULL, seed.requirement_id_, seed.parent_id_, workflow.id_, seed.status_key_, seed.status_name_, seed.status_group_,
  seed.status_color_, seed.successful_, NULL, NULL, seed.priority_,
  TIMESTAMPADD(DAY, seed.start_offset_, CURDATE()), TIMESTAMPADD(DAY, seed.end_offset_, CURDATE()),
  CASE WHEN seed.status_group_ = 'NOT_STARTED' THEN NULL ELSE TIMESTAMPADD(DAY, -seed.created_days_, NOW(6)) END,
  CASE WHEN seed.status_group_ = 'COMPLETED' THEN TIMESTAMPADD(DAY, -(seed.created_days_ - 1), NOW(6)) ELSE NULL END,
  seed.estimated_hours_, CASE WHEN seed.status_group_ = 'COMPLETED' THEN seed.estimated_hours_ ELSE 0 END,
  'DEMO', CONCAT('demo-', seed.id_), SHA2(CONCAT('demo-work-item:', seed.id_), 256),
  0, 'system-demo', 'system-demo', TIMESTAMPADD(DAY, -seed.created_days_, NOW(6)), NOW(6), 0
FROM (
  SELECT 'demo-wi-req-main-01' id_, 'DEMO-REQ-001' code_, 'requirement' category_key_, '需求' category_label_, '业务需求' type_name_, '智慧校园统一搜索体验升级' title_, '统一搜索入口、结果分类和常用筛选，缩短教师定位业务功能的时间。' description_, NULL parent_id_, NULL requirement_id_, 'P1' priority_, 'status_in_progress' status_key_, '处理中' status_name_, 'IN_PROGRESS' status_group_, 'blue' status_color_, 0 successful_, -8 start_offset_, 12 end_offset_, 32 estimated_hours_, 12 created_days_
  UNION ALL SELECT 'demo-wi-req-main-02','DEMO-REQ-002','requirement','需求','业务需求','教师工作台批量处理能力','支持对待办事项进行批量选择、校验和处理结果反馈。',NULL,NULL,'P2','status_pending','待处理','NOT_STARTED','neutral',0,-2,18,24,8
  UNION ALL SELECT 'demo-wi-req-child-01','DEMO-REQ-C01','design','设计','需求设计','统一搜索交互原型与状态说明','补齐搜索、空结果、加载失败和权限受限状态。','demo-wi-req-main-01','demo-wi-req-main-01','P1','status_completed','已完成','COMPLETED','green',1,-7,-2,12,10
  UNION ALL SELECT 'demo-wi-req-child-02','DEMO-REQ-C02','dev','研发','研发任务','统一搜索接口聚合与排序','实现跨模块结果聚合、排序和分页。','demo-wi-req-main-01','demo-wi-req-main-01','P1','status_in_progress','处理中','IN_PROGRESS','blue',0,-4,8,20,7
  UNION ALL SELECT 'demo-wi-req-child-03','DEMO-REQ-C03','design','设计','需求设计','批量处理操作流程设计','明确批量操作的选择、确认、处理中和失败恢复流程。','demo-wi-req-main-02','demo-wi-req-main-02','P2','status_in_progress','处理中','IN_PROGRESS','blue',0,0,7,10,4
  UNION ALL SELECT 'demo-wi-req-child-04','DEMO-REQ-C04','test','测试','测试执行','批量处理异常场景验收','验证部分失败、重复提交和网络超时后的页面反馈。','demo-wi-req-main-02','demo-wi-req-main-02','P2','status_pending','待处理','NOT_STARTED','neutral',0,6,14,8,2

  UNION ALL SELECT 'demo-wi-design-main-01','DEMO-DES-001','design','设计','需求设计','移动端首页交互重构','优化移动端首页的信息层级、快捷入口和触控反馈。',NULL,NULL,'P1','status_in_progress','处理中','IN_PROGRESS','blue',0,-6,10,28,11
  UNION ALL SELECT 'demo-wi-design-main-02','DEMO-DES-002','design','设计','公司物料','数据看板视觉规范升级','统一数据看板的图表、筛选器和异常状态视觉规范。',NULL,NULL,'P2','status_pending','待处理','NOT_STARTED','neutral',0,1,16,20,6
  UNION ALL SELECT 'demo-wi-design-child-01','DEMO-DES-C01','dev','研发','研发任务','移动端首页响应式实现','按设计稿实现首页布局和触控区域。','demo-wi-design-main-01',NULL,'P1','status_in_progress','处理中','IN_PROGRESS','blue',0,-3,7,18,8
  UNION ALL SELECT 'demo-wi-design-child-02','DEMO-DES-C02','test','测试','测试执行','移动端多尺寸视觉验收','覆盖常用手机宽度及横竖屏切换。','demo-wi-design-main-01',NULL,'P2','status_pending','待处理','NOT_STARTED','neutral',0,5,10,8,3
  UNION ALL SELECT 'demo-wi-design-child-03','DEMO-DES-C03','dev','研发','研发任务','看板主题令牌适配','将图表与筛选器切换为统一设计令牌。','demo-wi-design-main-02',NULL,'P2','status_pending','待处理','NOT_STARTED','neutral',0,4,12,12,3
  UNION ALL SELECT 'demo-wi-design-child-04','DEMO-DES-C04','test','测试','测试执行','看板四态视觉检查','检查默认、悬停、加载和错误状态的一致性。','demo-wi-design-main-02',NULL,'P2','status_completed','已完成','COMPLETED','green',1,-4,-1,6,5

  UNION ALL SELECT 'demo-wi-dev-main-01','DEMO-DEV-001','dev','研发','性能优化','统一权限缓存优化','降低高频权限校验的数据库访问次数并保证租户隔离。',NULL,NULL,'P1','status_in_progress','处理中','IN_PROGRESS','blue',0,-9,9,36,14
  UNION ALL SELECT 'demo-wi-dev-main-02','DEMO-DEV-002','dev','研发','研发任务','工作项批量导入能力','支持模板校验、批量写入和错误行反馈。',NULL,NULL,'P2','status_pending','待处理','NOT_STARTED','neutral',0,2,20,40,7
  UNION ALL SELECT 'demo-wi-dev-child-01','DEMO-DEV-C01','dev','研发','技术难题','缓存失效与并发一致性处理','实现租户级缓存版本和并发失效策略。','demo-wi-dev-main-01',NULL,'P1','status_in_progress','处理中','IN_PROGRESS','blue',0,-6,4,18,10
  UNION ALL SELECT 'demo-wi-dev-child-02','DEMO-DEV-C02','test','测试','测试执行','权限缓存隔离测试','验证跨租户、角色变更和缓存失效场景。','demo-wi-dev-main-01',NULL,'P1','status_completed','已完成','COMPLETED','green',1,-8,-2,10,12
  UNION ALL SELECT 'demo-wi-dev-child-03','DEMO-DEV-C03','dev','研发','研发任务','导入模板解析与校验','解析模板并返回字段级错误信息。','demo-wi-dev-main-02',NULL,'P2','status_pending','待处理','NOT_STARTED','neutral',0,3,12,20,4
  UNION ALL SELECT 'demo-wi-dev-child-04','DEMO-DEV-C04','test','测试','测试执行','大批量导入稳定性验证','验证重复数据、错误行和超时后的幂等性。','demo-wi-dev-main-02',NULL,'P2','status_pending','待处理','NOT_STARTED','neutral',0,10,18,12,2

  UNION ALL SELECT 'demo-wi-bug-main-01','DEMO-BUG-001','bug','缺陷','缺陷','组织树切换后成员列表未刷新','切换部门后成员列表仍显示上一个部门的数据。',NULL,NULL,'P1','status_in_progress','处理中','IN_PROGRESS','blue',0,-5,3,12,9
  UNION ALL SELECT 'demo-wi-bug-main-02','DEMO-BUG-002','bug','缺陷','缺陷','版本规划拖拽后顺序异常','连续拖拽多个工作项后列表顺序与保存结果不一致。',NULL,NULL,'P2','status_pending','待处理','NOT_STARTED','neutral',0,-1,7,10,5
  UNION ALL SELECT 'demo-wi-bug-child-01','DEMO-BUG-C01','bug','缺陷','功能问题','定位组织树缓存更新条件','复现并确认部门切换时缓存键未更新。','demo-wi-bug-main-01',NULL,'P1','status_completed','已完成','COMPLETED','green',1,-5,-3,4,8
  UNION ALL SELECT 'demo-wi-bug-child-02','DEMO-BUG-C02','bug','缺陷','缺陷','修复成员列表查询刷新','调整查询键并补充切换部门回归用例。','demo-wi-bug-main-01',NULL,'P1','status_in_progress','处理中','IN_PROGRESS','blue',0,-2,2,8,5
  UNION ALL SELECT 'demo-wi-bug-child-03','DEMO-BUG-C03','bug','缺陷','功能问题','定位拖拽排序冲突','检查前端排序结果与服务端版本号冲突。','demo-wi-bug-main-02',NULL,'P2','status_in_progress','处理中','IN_PROGRESS','blue',0,0,4,4,3
  UNION ALL SELECT 'demo-wi-bug-child-04','DEMO-BUG-C04','bug','缺陷','缺陷','补充拖拽并发保护','保存前校验版本并在冲突时提示刷新。','demo-wi-bug-main-02',NULL,'P2','status_pending','待处理','NOT_STARTED','neutral',0,2,6,6,2
) seed
JOIN t_product_line product_line
  ON product_line.tenant_id_ = 'local-tenant'
  AND product_line.id_ = '668a8714-1f4c-4c3a-92eb-f1a29927cccb'
  AND product_line.delete_flag_ = 0
JOIN t_product_line_work_item_type work_type
  ON work_type.tenant_id_ = product_line.tenant_id_
  AND work_type.product_line_id_ = product_line.id_
  AND work_type.category_ = seed.category_label_
  AND work_type.name_ = seed.type_name_
  AND work_type.enabled_ = 1
  AND work_type.delete_flag_ = 0
JOIN t_product_workflow workflow
  ON workflow.tenant_id_ = product_line.tenant_id_
  AND workflow.product_line_id_ = product_line.id_
  AND workflow.category_ = seed.category_key_
  AND workflow.task_type_id_ = work_type.id_
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
    AND (existing.id_ = seed.id_ OR existing.request_id_ = CONCAT('demo-', seed.id_))
);
