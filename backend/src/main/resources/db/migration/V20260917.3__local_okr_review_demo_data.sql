-- Local-only OKR reporting hierarchy required by the existing record visibility rules.
INSERT IGNORE INTO t_okr_reporting
  (id_, tenant_id_, employee_id_, supervisor_id_, root_flag_, create_by_, update_by_, create_time_, update_time_, delete_flag_)
VALUES
  ('demo-okr-report-admin', 'local-tenant', 'user-admin', NULL, 1, 'system', 'system', NOW(6), NOW(6), 0),
  ('demo-okr-report-product', 'local-tenant', 'user-product', 'user-admin', 0, 'system', 'system', NOW(6), NOW(6), 0),
  ('demo-okr-report-tech', 'local-tenant', 'user-tech', 'user-admin', 0, 'system', 'system', NOW(6), NOW(6), 0),
  ('demo-okr-report-sales', 'local-tenant', 'user-sales', 'user-admin', 0, 'system', 'system', NOW(6), NOW(6), 0);

-- Five records complement the existing user-admin weekly draft, yielding six "My Reviews" records.
INSERT IGNORE INTO t_okr_record
  (id_, tenant_id_, kind_, owner_id_, period_key_, status_, payload_, version_, create_by_, update_by_, create_time_, update_time_, delete_flag_)
VALUES
  (
    'demo-review-admin-week-01', 'local-tenant', 'review', 'user-admin',
    '2026-08-24/2026-08-30', 'reviewed',
    JSON_OBJECT(
      'title', '[周报] 2026年第 35 周 (08.24 - 08.30)', 'startDate', '2026-08-24', 'endDate', '2026-08-30',
      'summary', '完成统一工作项模型评审，并明确需求、研发和缺陷的状态边界。', 'reviewMode', 'structured', 'reviewType', 'week', 'selfScore', 88,
      'krReviews', JSON_ARRAY(
        JSON_OBJECT('objectiveId', 'demo-objective-admin-platform', 'objectiveTitle', '建设稳定的管理平台交付底座', 'keyResultId', 'demo-kr-admin-architecture', 'keyResultTitle', '完成统一工作项架构与评审', 'previousProgress', 35, 'currentProgress', 58, 'health', 'normal', 'achievement', '完成领域模型、权限边界和迁移策略评审，输出可执行方案。', 'blocker', '', 'nextPlan', '推进核心接口联调并补齐回归用例。', 'evidenceNote', '架构评审已通过。', 'workIds', JSON_ARRAY()),
        JSON_OBJECT('objectiveId', 'demo-objective-admin-platform', 'objectiveTitle', '建设稳定的管理平台交付底座', 'keyResultId', 'demo-kr-admin-quality', 'keyResultTitle', '降低核心流程回归风险', 'previousProgress', 28, 'currentProgress', 45, 'health', 'risk', 'achievement', '完成审批和状态流转的首轮测试覆盖。', 'blocker', '历史数据状态不完整，需要补充兼容验证。', 'nextPlan', '增加历史数据场景并完成迁移前后对比。', 'evidenceNote', '已形成风险清单。', 'workIds', JSON_ARRAY())
      ),
      'assistance', JSON_ARRAY(JSON_OBJECT('subject', '协助产品团队梳理状态语义', 'result', '统一了需求、任务和缺陷的状态口径。')),
      'extraWork', JSON_OBJECT('workIds', JSON_ARRAY(), 'description', '处理本地开发环境认证兼容问题。', 'impact', 'support', 'notes', JSON_OBJECT()),
      'items', JSON_ARRAY(), 'syncKrProgress', false,
      'feedback', '架构推进扎实，后续需继续收敛历史数据风险。', 'finalScore', 90, 'evaluation', 'A'
    ),
    1, 'user-admin', 'user-admin', '2026-08-30 18:20:00.000000', '2026-08-31 10:15:00.000000', 0
  ),
  (
    'demo-review-admin-week-02', 'local-tenant', 'review', 'user-admin',
    '2026-08-31/2026-09-06', 'reviewed',
    JSON_OBJECT(
      'title', '[周报] 2026年第 36 周 (08.31 - 09.06)', 'startDate', '2026-08-31', 'endDate', '2026-09-06',
      'summary', '完成复盘模块结构化改造方案，并推动产品线配置和工作项接口联调。', 'reviewMode', 'structured', 'reviewType', 'week', 'selfScore', 91,
      'krReviews', JSON_ARRAY(
        JSON_OBJECT('objectiveId', 'demo-objective-admin-platform', 'objectiveTitle', '建设稳定的管理平台交付底座', 'keyResultId', 'demo-kr-admin-architecture', 'keyResultTitle', '完成统一工作项架构与评审', 'previousProgress', 58, 'currentProgress', 72, 'health', 'normal', 'achievement', '复盘、目标与组织关系的数据契约完成联调。', 'blocker', '', 'nextPlan', '完成月复盘和审批流程的端到端验证。', 'evidenceNote', '接口契约已冻结。', 'workIds', JSON_ARRAY()),
        JSON_OBJECT('objectiveId', 'demo-objective-admin-platform', 'objectiveTitle', '建设稳定的管理平台交付底座', 'keyResultId', 'demo-kr-admin-quality', 'keyResultTitle', '降低核心流程回归风险', 'previousProgress', 45, 'currentProgress', 63, 'health', 'normal', 'achievement', '补齐任务创建、详情关闭和返回列表的回归场景。', 'blocker', '', 'nextPlan', '将关键场景纳入持续集成检查。', 'evidenceNote', '核心回归通过。', 'workIds', JSON_ARRAY())
      ),
      'assistance', JSON_ARRAY(JSON_OBJECT('subject', '协助研发定位自动化规则读取失败', 'result', '明确为工作项类型配置缺失并完成修复方案。')),
      'extraWork', JSON_OBJECT('workIds', JSON_ARRAY(), 'description', '整理跨模块接口异常清单。', 'impact', 'support', 'notes', JSON_OBJECT()),
      'items', JSON_ARRAY(), 'syncKrProgress', false,
      'feedback', '本周交付完整，问题闭环速度较好。', 'finalScore', 92, 'evaluation', 'A'
    ),
    1, 'user-admin', 'user-admin', '2026-09-06 18:10:00.000000', '2026-09-07 09:40:00.000000', 0
  ),
  (
    'demo-review-admin-week-03', 'local-tenant', 'review', 'user-admin',
    '2026-09-07/2026-09-13', 'submitted',
    JSON_OBJECT(
      'title', '[周报] 2026年第 37 周 (09.07 - 09.13)', 'startDate', '2026-09-07', 'endDate', '2026-09-13',
      'summary', '完成子任务创建链路修复，并补齐需求、设计、研发和缺陷演示数据。', 'reviewMode', 'structured', 'reviewType', 'week', 'selfScore', 89,
      'krReviews', JSON_ARRAY(
        JSON_OBJECT('objectiveId', 'demo-objective-admin-platform', 'objectiveTitle', '建设稳定的管理平台交付底座', 'keyResultId', 'demo-kr-admin-delivery', 'keyResultTitle', '关键业务流程可稳定验收', 'previousProgress', 42, 'currentProgress', 68, 'health', 'normal', 'achievement', '修复添加子任务关闭和创建成功后重复打开详情的问题。', 'blocker', '', 'nextPlan', '完成复盘数据与审批场景验收。', 'evidenceNote', '主子任务数据已可展开查看。', 'workIds', JSON_ARRAY()),
        JSON_OBJECT('objectiveId', 'demo-objective-admin-platform', 'objectiveTitle', '建设稳定的管理平台交付底座', 'keyResultId', 'demo-kr-admin-quality', 'keyResultTitle', '降低核心流程回归风险', 'previousProgress', 63, 'currentProgress', 76, 'health', 'risk', 'achievement', '关键接口测试已覆盖，但本地演示数据仍不完整。', 'blocker', '缺少收到的复盘数据，审批列表无法完整验收。', 'nextPlan', '补齐直属下属复盘并核对待查看与已查看筛选。', 'evidenceNote', '已记录验收缺口。', 'workIds', JSON_ARRAY())
      ),
      'assistance', JSON_ARRAY(JSON_OBJECT('subject', '协助测试核对主子任务层级', 'result', '确认四类工作项均具备主任务和子任务样例。')),
      'extraWork', JSON_OBJECT('workIds', JSON_ARRAY(), 'description', '更新本地验收环境与说明。', 'impact', 'support', 'notes', JSON_OBJECT()),
      'items', JSON_ARRAY(), 'syncKrProgress', false
    ),
    0, 'user-admin', 'user-admin', '2026-09-13 18:35:00.000000', '2026-09-13 18:35:00.000000', 0
  ),
  (
    'demo-review-admin-month-01', 'local-tenant', 'review', 'user-admin',
    '2026-08-01/2026-08-31', 'reviewed',
    JSON_OBJECT(
      'title', '[月报] 2026年08月', 'startDate', '2026-08-01', 'endDate', '2026-08-31',
      'summary', '八月完成管理平台统一工作项架构设计、审批边界梳理和首批核心能力落地，整体进度符合计划。', 'reviewMode', 'monthly', 'reviewType', 'month', 'selfScore', 90,
      'krReviews', JSON_ARRAY(
        JSON_OBJECT('objectiveId', 'demo-objective-admin-platform', 'objectiveTitle', '建设稳定的管理平台交付底座', 'keyResultId', 'demo-kr-admin-architecture', 'keyResultTitle', '完成统一工作项架构与评审', 'previousProgress', 20, 'currentProgress', 72, 'health', 'normal', 'achievement', '完成工作项统一模型、流程配置和权限边界的设计及评审。', 'blocker', '', 'nextPlan', '九月完成接口联调、数据迁移和验收闭环。', 'evidenceNote', '评审结论已归档。', 'workIds', JSON_ARRAY()),
        JSON_OBJECT('objectiveId', 'demo-objective-admin-platform', 'objectiveTitle', '建设稳定的管理平台交付底座', 'keyResultId', 'demo-kr-admin-quality', 'keyResultTitle', '降低核心流程回归风险', 'previousProgress', 10, 'currentProgress', 63, 'health', 'risk', 'achievement', '完成核心状态流转和审批规则测试。', 'blocker', '历史数据质量不一致，迁移验证工作量高于预期。', 'nextPlan', '建立固定演示数据并补齐兼容测试。', 'evidenceNote', '风险已纳入九月计划。', 'workIds', JSON_ARRAY())
      ),
      'assistance', JSON_ARRAY(JSON_OBJECT('subject', '支持产品和研发统一工作项术语', 'result', '形成统一状态和类型说明。')),
      'extraWork', JSON_OBJECT('workIds', JSON_ARRAY(), 'description', '完成本地开发环境服务治理。', 'impact', 'support', 'notes', JSON_OBJECT()),
      'items', JSON_ARRAY(), 'syncKrProgress', false, 'weeklyReviewIds', JSON_ARRAY('demo-review-admin-week-01'),
      'weeklyReviewSnapshots', JSON_ARRAY(),
      'monthlyOtherTasks', JSON_ARRAY(JSON_OBJECT('id', 'admin-aug-task-01', 'content', '整理跨模块验收清单', 'result', '形成四个模块的统一验收口径。', 'status', '已完成')),
      'nextMonthPlans', JSON_ARRAY(JSON_OBJECT('id', 'admin-sep-plan-01', 'content', '完成复盘与子任务端到端验收', 'plannedDate', '2026-09-30')),
      'otherNotes', '需要持续关注历史数据兼容。', 'nextMonthArrangement', '优先完成核心链路回归和演示环境数据建设。',
      'feedback', '月度目标推进清晰，建议继续加强自动化回归。', 'finalScore', 91, 'evaluation', 'A'
    ),
    1, 'user-admin', 'user-admin', '2026-08-31 19:00:00.000000', '2026-09-01 10:00:00.000000', 0
  ),
  (
    'demo-review-admin-month-02', 'local-tenant', 'review', 'user-admin',
    '2026-09-01/2026-09-30', 'draft',
    JSON_OBJECT(
      'title', '[月报] 2026年09月', 'startDate', '2026-09-01', 'endDate', '2026-09-30',
      'summary', '九月重点推进工作项创建、复盘审批和验收数据闭环，目前按计划进行。', 'reviewMode', 'monthly', 'reviewType', 'month', 'selfScore', 86,
      'krReviews', JSON_ARRAY(
        JSON_OBJECT('objectiveId', 'demo-objective-admin-platform', 'objectiveTitle', '建设稳定的管理平台交付底座', 'keyResultId', 'demo-kr-admin-delivery', 'keyResultTitle', '关键业务流程可稳定验收', 'previousProgress', 42, 'currentProgress', 68, 'health', 'risk', 'achievement', '子任务和复盘主流程已具备验收条件。', 'blocker', '尚需完成完整浏览器回归。', 'nextPlan', '补齐数据后执行全链路验收。', 'evidenceNote', '当前为月中草稿。', 'workIds', JSON_ARRAY())
      ),
      'assistance', JSON_ARRAY(), 'extraWork', JSON_OBJECT('workIds', JSON_ARRAY(), 'description', '', 'impact', '', 'notes', JSON_OBJECT()),
      'items', JSON_ARRAY(), 'syncKrProgress', false, 'weeklyReviewIds', JSON_ARRAY('demo-review-admin-week-02', 'demo-review-admin-week-03'),
      'weeklyReviewSnapshots', JSON_ARRAY(), 'monthlyOtherTasks', JSON_ARRAY(),
      'nextMonthPlans', JSON_ARRAY(JSON_OBJECT('id', 'admin-oct-plan-01', 'content', '持续完善回归自动化', 'plannedDate', '2026-10-16')),
      'otherNotes', '月末根据验收结果补充总结。', 'nextMonthArrangement', '完成剩余回归并跟进验收反馈。'
    ),
    0, 'user-admin', 'user-admin', '2026-09-16 17:30:00.000000', '2026-09-16 17:30:00.000000', 0
  );

-- Six direct-report records yield three pending and three reviewed items in "Reviews Received".
INSERT IGNORE INTO t_okr_record
  (id_, tenant_id_, kind_, owner_id_, period_key_, status_, payload_, version_, create_by_, update_by_, create_time_, update_time_, delete_flag_)
VALUES
  (
    'demo-review-product-week-01', 'local-tenant', 'review', 'user-product', '2026-09-07/2026-09-13', 'submitted',
    JSON_OBJECT(
      'title', '[周报] 2026年第 37 周 (09.07 - 09.13)', 'startDate', '2026-09-07', 'endDate', '2026-09-13', 'summary', '完成需求任务体验走查、子任务字段梳理和验收清单更新。',
      'reviewMode', 'structured', 'reviewType', 'week', 'selfScore', 87,
      'krReviews', JSON_ARRAY(
        JSON_OBJECT('objectiveId', 'demo-objective-product', 'objectiveTitle', '提升产研协同体验', 'keyResultId', 'demo-kr-product-flow', 'keyResultTitle', '完成核心任务流程体验优化', 'previousProgress', 48, 'currentProgress', 67, 'health', 'normal', 'achievement', '完成需求详情、添加子任务和返回列表的交互走查。', 'blocker', '', 'nextPlan', '跟进研发修复并完成验收。', 'evidenceNote', '验收清单已更新。', 'workIds', JSON_ARRAY()),
        JSON_OBJECT('objectiveId', 'demo-objective-product', 'objectiveTitle', '提升产研协同体验', 'keyResultId', 'demo-kr-product-rules', 'keyResultTitle', '完善工作项配置规则', 'previousProgress', 30, 'currentProgress', 52, 'health', 'risk', 'achievement', '明确子任务分类与工作项类型的联动规则。', 'blocker', '部分产品线缺少已发布类型配置。', 'nextPlan', '补齐配置并验证无数据和失败状态。', 'evidenceNote', '配置缺口已列出。', 'workIds', JSON_ARRAY())
      ),
      'assistance', JSON_ARRAY(JSON_OBJECT('subject', '协助测试完善验收场景', 'result', '补充关闭、取消和创建成功三种返回路径。')),
      'extraWork', JSON_OBJECT('workIds', JSON_ARRAY(), 'description', '整理周复盘字段口径。', 'impact', 'support', 'notes', JSON_OBJECT()), 'items', JSON_ARRAY(), 'syncKrProgress', false
    ),
    0, 'user-product', 'user-product', '2026-09-13 18:05:00.000000', '2026-09-13 18:05:00.000000', 0
  ),
  (
    'demo-review-product-month-01', 'local-tenant', 'review', 'user-product', '2026-08-01/2026-08-31', 'reviewed',
    JSON_OBJECT(
      'title', '[月报] 2026年08月', 'startDate', '2026-08-01', 'endDate', '2026-08-31', 'summary', '完成产研核心页面需求梳理和工作项统一体验方案，关键范围按期冻结。',
      'reviewMode', 'monthly', 'reviewType', 'month', 'selfScore', 92,
      'krReviews', JSON_ARRAY(JSON_OBJECT('objectiveId', 'demo-objective-product', 'objectiveTitle', '提升产研协同体验', 'keyResultId', 'demo-kr-product-flow', 'keyResultTitle', '完成核心任务流程体验优化', 'previousProgress', 12, 'currentProgress', 48, 'health', 'normal', 'achievement', '完成需求、设计、研发和缺陷四类任务的统一交互方案。', 'blocker', '', 'nextPlan', '推动研发落地并完成真实数据验收。', 'evidenceNote', '产品方案已评审通过。', 'workIds', JSON_ARRAY())),
      'assistance', JSON_ARRAY(JSON_OBJECT('subject', '支持研发澄清边界', 'result', '明确主任务与子任务字段差异。')),
      'extraWork', JSON_OBJECT('workIds', JSON_ARRAY(), 'description', '补充复盘管理的空状态和异常反馈。', 'impact', 'support', 'notes', JSON_OBJECT()), 'items', JSON_ARRAY(), 'syncKrProgress', false,
      'weeklyReviewIds', JSON_ARRAY(), 'weeklyReviewSnapshots', JSON_ARRAY(), 'monthlyOtherTasks', JSON_ARRAY(),
      'nextMonthPlans', JSON_ARRAY(JSON_OBJECT('id', 'product-sep-plan-01', 'content', '完成产研模块验收', 'plannedDate', '2026-09-25')), 'otherNotes', '', 'nextMonthArrangement', '重点跟进子任务和复盘模块验收。',
      'feedback', '需求边界清晰，跨团队协作有效。', 'finalScore', 93, 'evaluation', 'A'
    ),
    1, 'user-product', 'user-admin', '2026-08-31 18:40:00.000000', '2026-09-01 09:20:00.000000', 0
  ),
  (
    'demo-review-tech-week-01', 'local-tenant', 'review', 'user-tech', '2026-09-07/2026-09-13', 'reviewed',
    JSON_OBJECT(
      'title', '[周报] 2026年第 37 周 (09.07 - 09.13)', 'startDate', '2026-09-07', 'endDate', '2026-09-13', 'summary', '完成自动化规则接口修复、工作项类型回填和子任务创建链路稳定性优化。',
      'reviewMode', 'structured', 'reviewType', 'week', 'selfScore', 93,
      'krReviews', JSON_ARRAY(
        JSON_OBJECT('objectiveId', 'demo-objective-tech', 'objectiveTitle', '提升产研平台交付质量', 'keyResultId', 'demo-kr-tech-api', 'keyResultTitle', '核心接口可用率达到验收标准', 'previousProgress', 55, 'currentProgress', 79, 'health', 'normal', 'achievement', '修复自动化规则读取和工作项类型空数据问题。', 'blocker', '', 'nextPlan', '补齐接口异常场景测试。', 'evidenceNote', '本地联调通过。', 'workIds', JSON_ARRAY()),
        JSON_OBJECT('objectiveId', 'demo-objective-tech', 'objectiveTitle', '提升产研平台交付质量', 'keyResultId', 'demo-kr-tech-regression', 'keyResultTitle', '关键流程具备自动化回归', 'previousProgress', 36, 'currentProgress', 61, 'health', 'risk', 'achievement', '补齐需求创建和子任务返回路径测试。', 'blocker', '浏览器端完整回归仍需人工确认。', 'nextPlan', '完成 1920x1080 验收并固化用例。', 'evidenceNote', '服务端测试已通过。', 'workIds', JSON_ARRAY())
      ),
      'assistance', JSON_ARRAY(JSON_OBJECT('subject', '协助产品定位复盘模式异常', 'result', '修正月复盘模式兼容并完成验证。')),
      'extraWork', JSON_OBJECT('workIds', JSON_ARRAY(), 'description', '清理本地构建和服务启动问题。', 'impact', 'support', 'notes', JSON_OBJECT()), 'items', JSON_ARRAY(), 'syncKrProgress', false,
      'feedback', '技术问题闭环完整，建议继续补齐浏览器自动化。', 'finalScore', 94, 'evaluation', 'A+'
    ),
    1, 'user-tech', 'user-admin', '2026-09-13 19:10:00.000000', '2026-09-14 09:15:00.000000', 0
  ),
  (
    'demo-review-tech-month-01', 'local-tenant', 'review', 'user-tech', '2026-09-01/2026-09-30', 'submitted',
    JSON_OBJECT(
      'title', '[月报] 2026年09月', 'startDate', '2026-09-01', 'endDate', '2026-09-30', 'summary', '九月完成核心接口修复和数据迁移建设，当前进入回归与验收阶段。',
      'reviewMode', 'monthly', 'reviewType', 'month', 'selfScore', 90,
      'krReviews', JSON_ARRAY(JSON_OBJECT('objectiveId', 'demo-objective-tech', 'objectiveTitle', '提升产研平台交付质量', 'keyResultId', 'demo-kr-tech-api', 'keyResultTitle', '核心接口可用率达到验收标准', 'previousProgress', 55, 'currentProgress', 79, 'health', 'risk', 'achievement', '完成工作项类型、自动化规则和子任务相关接口修复。', 'blocker', '仍需覆盖历史数据迁移后的兼容行为。', 'nextPlan', '执行迁移回放和多账号权限验证。', 'evidenceNote', '月度复盘为阶段性提交。', 'workIds', JSON_ARRAY())),
      'assistance', JSON_ARRAY(), 'extraWork', JSON_OBJECT('workIds', JSON_ARRAY(), 'description', '支持测试环境数据准备。', 'impact', 'support', 'notes', JSON_OBJECT()), 'items', JSON_ARRAY(), 'syncKrProgress', false,
      'weeklyReviewIds', JSON_ARRAY('demo-review-tech-week-01'), 'weeklyReviewSnapshots', JSON_ARRAY(), 'monthlyOtherTasks', JSON_ARRAY(),
      'nextMonthPlans', JSON_ARRAY(JSON_OBJECT('id', 'tech-oct-plan-01', 'content', '完成历史数据兼容验证', 'plannedDate', '2026-10-20')), 'otherNotes', '持续观察迁移执行情况。', 'nextMonthArrangement', '完成回归自动化和性能基线验证。'
    ),
    0, 'user-tech', 'user-tech', '2026-09-16 18:20:00.000000', '2026-09-16 18:20:00.000000', 0
  ),
  (
    'demo-review-sales-week-01', 'local-tenant', 'review', 'user-sales', '2026-09-07/2026-09-13', 'submitted',
    JSON_OBJECT(
      'title', '[周报] 2026年第 37 周 (09.07 - 09.13)', 'startDate', '2026-09-07', 'endDate', '2026-09-13', 'summary', '完成重点客户机会梳理和跨部门方案协同，推进两个项目进入方案确认。',
      'reviewMode', 'structured', 'reviewType', 'week', 'selfScore', 86,
      'krReviews', JSON_ARRAY(
        JSON_OBJECT('objectiveId', 'demo-objective-sales', 'objectiveTitle', '提升重点客户项目转化效率', 'keyResultId', 'demo-kr-sales-pipeline', 'keyResultTitle', '重点商机阶段推进率达到目标', 'previousProgress', 44, 'currentProgress', 62, 'health', 'normal', 'achievement', '推动华东师大与南山实验项目完成方案确认。', 'blocker', '', 'nextPlan', '组织技术交流并确认预算窗口。', 'evidenceNote', '客户会议纪要已归档。', 'workIds', JSON_ARRAY()),
        JSON_OBJECT('objectiveId', 'demo-objective-sales', 'objectiveTitle', '提升重点客户项目转化效率', 'keyResultId', 'demo-kr-sales-risk', 'keyResultTitle', '控制重点机会延期风险', 'previousProgress', 38, 'currentProgress', 51, 'health', 'risk', 'achievement', '完成十个重点机会的风险分级。', 'blocker', '两个客户内部审批时间尚未确定。', 'nextPlan', '建立每周跟进机制并同步交付资源。', 'evidenceNote', '风险台账已更新。', 'workIds', JSON_ARRAY())
      ),
      'assistance', JSON_ARRAY(JSON_OBJECT('subject', '协助产品补充客户场景', 'result', '提供三个典型审批与交付案例。')),
      'extraWork', JSON_OBJECT('workIds', JSON_ARRAY(), 'description', '支持行业方案材料更新。', 'impact', 'none', 'notes', JSON_OBJECT()), 'items', JSON_ARRAY(), 'syncKrProgress', false
    ),
    0, 'user-sales', 'user-sales', '2026-09-13 17:50:00.000000', '2026-09-13 17:50:00.000000', 0
  ),
  (
    'demo-review-sales-month-01', 'local-tenant', 'review', 'user-sales', '2026-08-01/2026-08-31', 'reviewed',
    JSON_OBJECT(
      'title', '[月报] 2026年08月', 'startDate', '2026-08-01', 'endDate', '2026-08-31', 'summary', '八月完成重点客户池分层和商机风险治理，重点项目整体保持稳定推进。',
      'reviewMode', 'monthly', 'reviewType', 'month', 'selfScore', 88,
      'krReviews', JSON_ARRAY(JSON_OBJECT('objectiveId', 'demo-objective-sales', 'objectiveTitle', '提升重点客户项目转化效率', 'keyResultId', 'demo-kr-sales-pipeline', 'keyResultTitle', '重点商机阶段推进率达到目标', 'previousProgress', 18, 'currentProgress', 44, 'health', 'normal', 'achievement', '完成重点客户分层并推动三个商机进入下一阶段。', 'blocker', '', 'nextPlan', '集中推进方案确认和商务沟通。', 'evidenceNote', '商机阶段记录完整。', 'workIds', JSON_ARRAY())),
      'assistance', JSON_ARRAY(JSON_OBJECT('subject', '支持交付团队预判资源', 'result', '明确四季度重点项目排期。')),
      'extraWork', JSON_OBJECT('workIds', JSON_ARRAY(), 'description', '完成行业竞品信息汇总。', 'impact', 'support', 'notes', JSON_OBJECT()), 'items', JSON_ARRAY(), 'syncKrProgress', false,
      'weeklyReviewIds', JSON_ARRAY(), 'weeklyReviewSnapshots', JSON_ARRAY(), 'monthlyOtherTasks', JSON_ARRAY(),
      'nextMonthPlans', JSON_ARRAY(JSON_OBJECT('id', 'sales-sep-plan-01', 'content', '完成两个重点项目方案确认', 'plannedDate', '2026-09-28')), 'otherNotes', '', 'nextMonthArrangement', '聚焦重点客户方案确认与预算沟通。',
      'feedback', '客户分层清晰，重点机会推进符合预期。', 'finalScore', 89, 'evaluation', 'A'
    ),
    1, 'user-sales', 'user-admin', '2026-08-31 18:00:00.000000', '2026-09-01 09:35:00.000000', 0
  );
