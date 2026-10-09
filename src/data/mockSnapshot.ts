import type { ApprovalFlow, Contract, CurrentUser, Customer, DefectBug, FollowUpRecord, Lead, Opportunity, ProductLine, RequirementTask, TeamMember, VersionIteration } from '../types';
import type { TestCase, TestCaseDirectory, TestPlan } from '../types/testManagement';
import { MOCK_DATABASE, MOCK_SNAPSHOT_VERSION } from './mockDatabaseSnapshot';

type Row = Record<string, unknown>;
const rows = (table: keyof typeof MOCK_DATABASE): Row[] => [...(MOCK_DATABASE[table] as unknown as Row[])];
const text = (value: unknown) => value == null ? '' : String(value);
const date = (value: unknown) => text(value).slice(0, 10);
const json = <T>(value: unknown, fallback: T): T => {
  if (typeof value !== 'string') return fallback;
  try { return JSON.parse(value) as T; } catch { return fallback; }
};

export { MOCK_SNAPSHOT_VERSION, MOCK_DATABASE };

export const MOCK_TEAM_MEMBERS: TeamMember[] = rows('t_sys_user')
  .filter((row) => text(row.tenant_id_) === 'local-tenant' && Number(row.delete_flag_ || 0) === 0)
  .map((row) => ({ id: text(row.id_), name: text(row.name_), department: text(row.department_), jobTitle: text(row.role_title_), phone: text(row.phone_) || undefined, email: text(row.email_) || undefined, status: text(row.status_) === 'disabled' ? 'disabled' : 'enabled', loginEnabled: Boolean(text(row.username_)), version: Number(row.version_ || 0) }));

const systemRoles: CurrentUser['role'][] = ['admin', 'sales_director', 'product_manager', 'tech_lead'];
const systemRole = (value: unknown): CurrentUser['role'] => systemRoles.includes(text(value) as CurrentUser['role']) ? text(value) as CurrentUser['role'] : 'product_manager';

export const MOCK_USERS: CurrentUser[] = rows('t_sys_user')
  .filter((row) => text(row.tenant_id_) === 'local-tenant' && Number(row.delete_flag_ || 0) === 0 && text(row.status_) === 'enabled')
  .map((row) => ({ id: text(row.id_), name: text(row.name_), avatar: text(row.avatar_), role: systemRole(row.role_), roleTitle: text(row.role_title_) || '成员', department: text(row.department_) }));

/** 工作台和审批中心使用的本地演示数据，保持各审批页签都有可验证的样例。 */
export const MOCK_APPROVALS: ApprovalFlow[] = [
  {
    id: 'demo-approval-contract', code: 'APPR-2026-1001', title: '华东分部数智调度中心合同用印申请', type: '合同用印审批',
    applicantName: '周明', applicantDept: '商务拓展部', status: '待审批', ccNames: ['林志豪'], relatedCustomer: '国家电网华东分部数智调度中心', relatedProduct: '数字化协同管理中枢 V4.2', amount: 1200000, submittedAt: '2026-10-03 09:20',
    nodes: [
      { title: '发起申请', approver: '周明', role: '商务经理', status: 'passed', time: '2026-10-03 09:20', comment: '合同已完成商务确认。' },
      { title: '部门主管审核', approver: '林志豪', role: '超级系统管理员', status: 'current' },
      { title: '总经理终审', approver: '总经办', role: '总经理', status: 'waiting' },
    ],
    contentDetails: { '审批主题': '华东分部数智调度中心合同用印申请', '关联合同/客户': '国家电网华东分部数智调度中心', '涉及金额': '¥ 1,200,000 元', '申请说明': '请审批合同盖章及归档。' },
  },
  {
    id: 'demo-approval-change', code: 'APPR-2026-1002', title: 'V4.2 版本需求重大变更评审', type: '需求重大变更',
    applicantName: '林志豪', applicantDept: '人力行政部', status: '待审批', ccNames: ['陈佳'], relatedProduct: '数字化协同管理中枢 V4.2', submittedAt: '2026-10-02 15:40',
    nodes: [
      { title: '发起申请', approver: '林志豪', role: '超级系统管理员', status: 'passed', time: '2026-10-02 15:40', comment: '补充跨部门影响评估。' },
      { title: '产品负责人审核', approver: '王芳', role: '产品经理', status: 'current' },
      { title: '技术负责人确认', approver: '李爱剑', role: '前端开发组长', status: 'waiting' },
    ],
    contentDetails: { '审批主题': 'V4.2 版本需求重大变更评审', '关联产品': '数字化协同管理中枢 V4.2', '申请说明': '新增测试计划关联能力，请评估排期影响。' },
  },
  {
    id: 'demo-approval-purchase', code: 'APPR-2026-1003', title: '测试环境设备采购申请', type: '采购与报销',
    applicantName: '赵宁', applicantDept: '研发中心', status: '审批中', ccNames: ['林志豪'], relatedProduct: '智能制造数据平台', amount: 86000, submittedAt: '2026-10-01 11:15',
    nodes: [
      { title: '发起申请', approver: '赵宁', role: '研发工程师', status: 'passed', time: '2026-10-01 11:15' },
      { title: '部门主管审核', approver: '李爱剑', role: '前端开发组长', status: 'current' },
      { title: '财务审核', approver: '财务部', role: '财务负责人', status: 'waiting' },
    ],
    contentDetails: { '审批主题': '测试环境设备采购申请', '关联产品': '智能制造数据平台', '涉及金额': '¥ 86,000 元', '申请说明': '用于新增自动化测试环境。' },
  },
  {
    id: 'demo-approval-passed', code: 'APPR-2026-0998', title: '合作伙伴准入申请', type: '合作伙伴准入',
    applicantName: '林志豪', applicantDept: '人力行政部', status: '已通过', relatedCustomer: '智行新能源汽车工业互联股份有限公司', submittedAt: '2026-09-28 10:05', completedAt: '2026-09-29 16:30',
    nodes: [
      { title: '发起申请', approver: '林志豪', role: '超级系统管理员', status: 'passed', time: '2026-09-28 10:05' },
      { title: '部门主管审核', approver: '王芳', role: '产品经理', status: 'passed', time: '2026-09-29 09:10', comment: '资料完整。' },
      { title: '总经理终审', approver: '总经办', role: '总经理', status: 'passed', time: '2026-09-29 16:30', comment: '同意准入。' },
    ],
    contentDetails: { '审批主题': '合作伙伴准入申请', '关联合作方': '智行新能源汽车工业互联股份有限公司', '申请说明': '完成资质审核并纳入合作伙伴目录。' },
  },
];

export const MOCK_WORKBENCH_FEEDS = [
  { id: 'feed-product-1', type: 'dynamic' as const, time: '2026-10-03 14:20', title: 'V4.2 版本完成测试计划关联', content: '测试团队已补充回归测试用例，版本评审进入待确认阶段。' },
  { id: 'feed-product-2', type: 'dynamic' as const, time: '2026-10-02 17:10', title: '产品需求“统一工作项”已发布', content: '需求完成评审并下发设计、研发和测试任务。' },
  { id: 'feed-feedback-1', type: 'feedback' as const, time: '2026-10-03 10:30', title: '客户反馈：列表筛选响应较慢', content: '国家电网华东分部建议优化大数据量下的筛选体验。', customer: '国家电网华东分部数智调度中心' },
  { id: 'feed-feedback-2', type: 'feedback' as const, time: '2026-10-01 16:00', title: '内部评价：测试计划入口清晰', content: '测试同学反馈关联测试计划的入口更容易找到。', author: '测试团队' },
  { id: 'feed-competitor-1', type: 'competitor' as const, time: '2026-10-02 09:15', title: '友商发布新一代项目协同套件', content: '重点宣传版本规划、测试管理和交付协同能力。', author: '行业情报' },
  { id: 'feed-competitor-2', type: 'competitor' as const, time: '2026-09-30 13:40', title: '竞品新增审批流模板市场', content: '支持合同、采购和需求变更等常见审批场景。', author: '市场部' },
];

const usersById = new Map(MOCK_USERS.map((user) => [user.id, user]));

export const MOCK_SYSTEM_ROLES = rows('t_sys_role')
  .filter((row) => text(row.tenant_id_) === 'local-tenant' && Number(row.delete_flag_ || 0) === 0)
  .map((row) => ({
    id: text(row.id_),
    code: text(row.code_),
    name: text(row.name_),
    memberCount: rows('t_sys_user').filter((user) => text(user.role_) === text(row.code_) && text(user.status_) === 'enabled' && Number(user.delete_flag_ || 0) === 0).length,
    status: 'active' as const,
  }));

const reportingRows = rows('t_okr_reporting').filter((row) => Number(row.delete_flag_ || 0) === 0);
export const MOCK_OKR_PEOPLE = MOCK_USERS.map((user) => {
  const reporting = reportingRows.find((row) => text(row.employee_id_) === user.id);
  return { id: user.id, name: user.name, department: user.department, supervisorId: text(reporting?.supervisor_id_) || null, rootFlag: Number(reporting?.root_flag_ || 0), version: Number(reporting?.version_ || 0) };
});
export const MOCK_OKR_RECORDS = rows('t_okr_record').filter((row) => Number(row.delete_flag_ || 0) === 0).map((row) => ({
  id: text(row.id_), kind: text(row.kind_) as 'objective' | 'review' | 'action', ownerId: text(row.owner_id_), periodKey: text(row.period_key_), status: text(row.status_), version: Number(row.version_ || 0), createdAt: text(row.create_time_), payload: (typeof row.payload_ === 'object' && row.payload_ !== null ? row.payload_ : {})
}));
export const MOCK_OKR_SETTINGS = rows('t_okr_setting').find((row) => Number(row.delete_flag_ || 0) === 0)?.config_ || {
  defaultView: 'list',
  timeRules: [
    { key: 'addObjective', label: '添加目标', startDay: 1, endDay: 31, shortMonthRule: 'clamp', allowBackfill: false },
    { key: 'breakdown', label: '拆解目标', startDay: 1, endDay: 31, shortMonthRule: 'clamp', allowBackfill: true },
    { key: 'weeklyReview', label: '周总结', startDay: 1, endDay: 31, shortMonthRule: 'clamp', allowBackfill: true },
    { key: 'monthlyReview', label: '月总结', startDay: 1, endDay: 31, shortMonthRule: 'clamp', allowBackfill: true }
  ],
  validation: { actionWeightTotal: 100, maxActions: 8, assigneeMultiple: true, keyNodeMultiple: true, resultRequired: true },
  dictionaries: { productNodes: [], deliveryNodes: [], presalesNodes: [], supportTypes: [] },
  templates: [
    { department: '产研部门', type: 'product', fields: ['目标内容', '关联产品', '关键节点', '动作', '截止日期', '权重'] },
    { department: '项目交付部门', type: 'delivery', fields: ['目标内容', '关联项目', '关键节点', '动作', '截止日期', '权重'] },
    { department: '售前支持部门', type: 'presales', fields: ['目标内容', '关联线索/商机/投标', '关键节点', '动作', '截止日期', '权重'] },
    { department: '其他支撑部门', type: 'support', fields: ['目标内容', '类型', '动作', '预期结果', '截止日期', '权重'] }
  ]
};

const versionsByProduct = new Map<string, Row[]>();
rows('t_product_line_version').filter((row) => text(row.tenant_id_) === 'local-tenant' && Number(row.delete_flag_ || 0) === 0).forEach((row) => {
  const key = text(row.product_line_id_); versionsByProduct.set(key, [...(versionsByProduct.get(key) || []), row]);
});
const workItems = rows('t_product_work_item').filter((row) => text(row.tenant_id_) === 'local-tenant' && Number(row.delete_flag_ || 0) === 0);
const workItemTypeNameById = new Map(rows('t_product_line_work_item_type').map((row) => [text(row.id_), text(row.name_)]));
const productNameById = new Map(rows('t_product_line').map((row) => [text(row.id_), text(row.name_)]));
const versionNameById = new Map(rows('t_product_line_version').map((row) => [text(row.id_), text(row.name_)]));

export const MOCK_PRODUCT_LINES: ProductLine[] = rows('t_product_line')
  .filter((row) => text(row.tenant_id_) === 'local-tenant' && Number(row.delete_flag_ || 0) === 0)
  .map((row) => {
    const id = text(row.id_); const items = workItems.filter((item) => text(item.product_line_id_) === id);
    const memberIds = [row.owner_user_id_, row.requirement_owner_user_id_, row.requirement_owner_secondary_user_id_, row.tech_owner_user_id_, row.tech_owner_secondary_user_id_, row.test_owner_user_id_, row.test_owner_secondary_user_id_].map(text).filter(Boolean);
    const members = [...new Set(memberIds)].map((userId, index) => { const user = usersById.get(userId); return { id: `snapshot-member-${id}-${index}`, userId, name: user?.name || '', role: userId === text(row.owner_user_id_) ? '管理员' : '参与人' as const }; }).filter((member) => member.name);
    return { id, name: text(row.name_), code: text(row.code_), description: text(row.description_), status: text(row.status_), ownerName: text(row.owner_name_), ownerUserId: text(row.owner_user_id_) || undefined, productOwner: text(row.owner_name_), technicalOwner: text(row.tech_owner_), technicalOwnerUserId: text(row.tech_owner_user_id_) || undefined, requirementOwner: text(row.requirement_owner_), requirementOwnerUserId: text(row.requirement_owner_user_id_) || undefined, requirementOwnerSecondary: text(row.requirement_owner_secondary_), requirementOwnerSecondaryUserId: text(row.requirement_owner_secondary_user_id_) || undefined, techOwner: text(row.tech_owner_), techOwnerUserId: text(row.tech_owner_user_id_) || undefined, techOwnerSecondary: text(row.tech_owner_secondary_), techOwnerSecondaryUserId: text(row.tech_owner_secondary_user_id_) || undefined, testOwner: text(row.test_owner_), testOwnerUserId: text(row.test_owner_user_id_) || undefined, testOwnerSecondary: text(row.test_owner_secondary_), testOwnerSecondaryUserId: text(row.test_owner_secondary_user_id_) || undefined, members, visibility: text(row.visibility_) || '公开', commercialAvailability: (text(row.commercial_availability_) || '不可商用') as ProductLine['commercialAvailability'], sort: Number(row.sort_ || 0), currentVersion: text(row.current_version_), totalRequirements: items.filter((item) => text(item.category_) === 'requirement').length, inProgressReqs: items.filter((item) => text(item.category_) === 'requirement' && !['COMPLETED', 'CANCELLED'].includes(text(item.status_group_))).length, iterationProgress: 0, createdAt: text(row.create_time_), versions: (versionsByProduct.get(id) || []).map((version) => ({ id: text(version.id_), name: text(version.name_), code: text(version.code_), startDate: date(version.start_date_), endDate: date(version.end_date_), releaseDate: text(version.release_time_) || date(version.release_date_), status: text(version.status_) })) } as ProductLine;
  });

export const MOCK_VERSIONS: VersionIteration[] = rows('t_product_line_version')
  .filter((row) => text(row.tenant_id_) === 'local-tenant' && Number(row.delete_flag_ || 0) === 0)
  .map((row) => ({ id: text(row.id_), code: text(row.code_), name: text(row.name_), ownerName: text(row.owner_name_), productLineId: text(row.product_line_id_), productLineName: productNameById.get(text(row.product_line_id_)) || '', startDate: date(row.start_date_), endDate: date(row.end_date_), releaseDate: text(row.release_time_) || date(row.release_date_), status: text(row.status_), statusPhase: text(row.status_phase_), requirementsCount: Number(row.requirements_count_ || 0), completedReqCount: Number(row.completed_req_count_ || 0), linkedRequirementIds: json<string[]>(row.linked_requirement_ids_, []) }));

const designVariantFor = (row: Row): RequirementTask['designVariant'] => {
  const typeName = text(row.task_type_name_) || text(row.requirement_type_) || workItemTypeNameById.get(text(row.task_type_id_)) || '';
  if (text(row.category_) !== 'design') return undefined;
  if (typeName.includes('其他')) return 'other';
  if (typeName.includes('物料') || typeName.includes('项目')) return 'project';
  return 'product';
};

const task = (row: Row): RequirementTask => ({
  id: text(row.id_), code: text(row.code_), title: text(row.title_), description: text(row.description_), expectedGoal: text(row.expected_goal_), status: text(row.status_name_), priority: text(row.priority_), ownerName: text(row.assignee_name_) || usersById.get(text(row.assignee_id_))?.name || '', assigneeId: text(row.assignee_id_) || undefined, creatorName: text(row.creator_name_), department: text(row.department_), versionId: text(row.version_id_) || undefined, versionName: versionNameById.get(text(row.version_id_)) || '', productLineId: text(row.product_line_id_), productLineName: productNameById.get(text(row.product_line_id_)) || '', estimatedHours: Number(row.estimated_hours_ || 0), actualHours: Number(row.actual_hours_ || 0), dueDate: date(row.planned_end_date_ || row.expected_complete_date_), createdAt: date(row.create_time_), category: 'my_dept', requirementType: text(row.task_type_name_) || text(row.requirement_type_) || workItemTypeNameById.get(text(row.task_type_id_)) || undefined, designVariant: designVariantFor(row), designProjectName: text(row.project_name_) || text(row.projectName) || undefined, designSourceDepartment: text(row.source_department_) || text(row.department_) || undefined, revision: Number(row.version_ || 0),
});

export const MOCK_REQUIREMENT_TASKS = workItems.filter((row) => text(row.category_) === 'requirement').map(task);
export const MOCK_OPS_TASKS: RequirementTask[] = [
  { title: '生产监控告警规则优化', description: '梳理接口延迟与错误率告警，合并重复通知并验证值班通知链路。', expectedGoal: '关键告警能够及时通知，重复告警明显减少。', status: '处理中', priority: '高', estimatedHours: 8, actualHours: 3, progress: 40 },
  { title: '数据库备份恢复演练', description: '使用最近一次备份在隔离环境完成恢复，记录恢复耗时和数据核验结果。', expectedGoal: '完成恢复验证并形成演练记录。', status: '待处理', priority: '高', estimatedHours: 12, actualHours: 0, progress: 0 },
  { title: '服务证书到期巡检与续期', description: '检查服务证书有效期，完成即将到期证书的续期和访问验证。', expectedGoal: '所有服务证书有效且访问正常。', status: '待验收', priority: '中', estimatedHours: 4, actualHours: 4, progress: 100 },
  { title: '日志存储清理策略配置', description: '配置日志保留期限与归档策略，检查磁盘占用及查询可用性。', expectedGoal: '归档策略生效，日志查询正常。', status: '已完成', priority: '低', estimatedHours: 6, actualHours: 5, progress: 100 },
].map((item, index) => {
  const owner = MOCK_USERS[index % MOCK_USERS.length];
  const product = MOCK_PRODUCT_LINES[index % MOCK_PRODUCT_LINES.length];
  return {
    ...item, id: `demo-ops-${index + 1}`, code: `OPS-DEMO-00${index + 1}`,
    ownerName: owner?.name || '', assigneeId: owner?.id, department: owner?.department,
    creatorName: MOCK_USERS[0]?.name || '', creatorId: MOCK_USERS[0]?.id,
    productLineId: product?.id, productLineName: product?.name || '', versionName: '',
    createdAt: '2026-10-08', dueDate: `2026-10-${12 + index * 3}`, events: [],
  };
});
export const MOCK_DESIGN_TASKS = [
  ...workItems.filter((row) => text(row.category_) === 'design').map(task),
  {
    id: 'demo-design-project-exhibition', code: 'DSN-DEMO-001', title: '华东体验中心展厅导视与展板设计',
    status: '设计中', priority: '中', ownerName: '周明', creatorName: '林晓', versionName: '', productLineId: '', productLineName: '',
    estimatedHours: 12, dueDate: '2026-10-18', requirementType: '物料设计', designVariant: 'project',
    designProjectName: '华东体验中心建设项目', createdAt: '2026-09-29'
  },
  {
    id: 'todo-design-project-demo-task', code: 'DSN-DEMO-001-TASK', title: '展厅导视与产品展板设计',
    status: '设计中', priority: '中', ownerName: '周明', creatorName: '周明', versionName: '', productLineId: '', productLineName: '',
    estimatedHours: 12, dueDate: '2026-10-18', requirementType: '物料设计', designVariant: 'project',
    designProjectName: '华东体验中心建设项目', createdAt: '2026-09-29'
  },
  {
    id: 'demo-design-project-packaging', code: 'DSN-DEMO-002', title: '新品发布会产品手册与包装延展',
    status: '待处理', priority: '高', ownerName: '', creatorName: '周明', versionName: '', productLineId: '', productLineName: '',
    estimatedHours: 16, dueDate: '2026-10-22', requirementType: '物料设计', designVariant: 'project',
    designProjectName: '新品发布会筹备', createdAt: '2026-09-30'
  },
  {
    id: 'demo-design-other-event', code: 'DSN-DEMO-003', title: '季度合作伙伴大会主视觉与邀请函',
    status: '待处理', priority: '中', ownerName: '陈佳', creatorName: '陈佳', versionName: '', productLineId: '', productLineName: '',
    estimatedHours: 10, dueDate: '2026-10-20', requirementType: '其他设计', designVariant: 'other',
    designSourceDepartment: '市场部', createdAt: '2026-09-30'
  },
  {
    id: 'demo-design-other-internal', code: 'DSN-DEMO-004', title: '研发中心季度成果展示模板',
    status: '已完成', priority: '低', ownerName: '许悦', creatorName: '赵宁', versionName: '', productLineId: '', productLineName: '',
    estimatedHours: 6, dueDate: '2026-10-02', requirementType: '其他设计', designVariant: 'other',
    designSourceDepartment: '人力资源部', createdAt: '2026-09-27'
  }
];
export const MOCK_DEV_TASKS = workItems.filter((row) => text(row.category_) === 'dev').map(task);
export const MOCK_TEST_TASKS = workItems.filter((row) => text(row.category_) === 'test').map(task);
export const MOCK_BUGS: DefectBug[] = workItems.filter((row) => text(row.category_) === 'bug').map((row) => ({ id: text(row.id_), code: text(row.code_), title: text(row.title_), description: text(row.description_), status: text(row.status_name_), severity: text(row.severity_), type: text(row.task_type_name_) || '缺陷', ownerName: text(row.assignee_name_), creatorName: text(row.creator_name_), verifierName: text(row.verifier_name_), productLineId: text(row.product_line_id_), productLineName: productNameById.get(text(row.product_line_id_)) || '', versionName: versionNameById.get(text(row.version_id_)) || '', linkedTaskId: text(row.requirement_id_) || undefined, createdAt: text(row.create_time_) }));

const activeRows = (table: keyof typeof MOCK_DATABASE) => rows(table).filter((row) => Number(row.delete_flag_ || 0) === 0);
const customerNameById = new Map(activeRows('t_crm_customer').map((row) => [text(row.id_), text(row.name_)]));
const opportunityNameById = new Map(activeRows('t_crm_opportunity').map((row) => [text(row.id_), text(row.name_)]));

export const MOCK_CUSTOMERS: Customer[] = activeRows('t_crm_customer').map((row) => ({
  id: text(row.id_), name: text(row.name_), code: text(row.code_), type: text(row.type_), level: (text(row.level_) || 'C级-培育') as Customer['level'],
  contactName: text(row.contact_name_), contactPhone: text(row.contact_phone_), contactTitle: text(row.contact_title_), contactEmail: text(row.contact_email_) || undefined,
  annualBudget: Number(row.annual_budget_ || 0), activeProjectsCount: 0, potentialOppsCount: activeRows('t_crm_opportunity').filter((item) => text(item.customer_id_) === text(row.id_)).length,
  source: (text(row.source_) || '主动开发') as Customer['source'], lastFollowUp: date(row.update_time_ || row.create_time_), tags: Array.isArray(row.tags_) ? row.tags_.map(text) : [],
  address: text(row.address_), industry: text(row.industry_), scale: text(row.scale_), schoolLevel: text(row.school_level_) || undefined, schoolNature: text(row.school_nature_) || undefined,
  schoolType: text(row.school_type_) || undefined, ownership: text(row.ownership_) || undefined, region: text(row.region_) || undefined, status: text(row.status_) || undefined,
  createdAt: date(row.create_time_), version: Number(row.version_ || 0),
}));

export const MOCK_LEADS: Lead[] = activeRows('t_crm_lead').map((row) => ({
  id: text(row.id_), name: text(row.name_), customerId: text(row.customer_id_), customerName: customerNameById.get(text(row.customer_id_)) || '', schoolContact: text(row.school_contact_),
  contactPhone: text(row.contact_phone_) || undefined, department: text(row.department_), ownerName: text(row.owner_name_), source: text(row.source_) as Lead['source'],
  products: Array.isArray(row.products_) ? row.products_.map(text) : [], status: text(row.status_) as Lead['status'], latestFollowUpAt: date(row.update_time_) || undefined,
  convertedOpportunityId: text(row.converted_opportunity_id_) || undefined, createdAt: date(row.create_time_), version: Number(row.version_ || 0),
}));

export const MOCK_OPPORTUNITIES: Opportunity[] = activeRows('t_crm_opportunity').map((row) => ({
  id: text(row.id_), name: text(row.name_), type: text(row.type_), customerId: text(row.customer_id_), customerName: customerNameById.get(text(row.customer_id_)) || '',
  leadId: text(row.lead_id_) || undefined, stage: text(row.stage_) as Opportunity['stage'], status: text(row.status_) || '跟进中', amount: Number(row.amount_ || 0),
  relatedProduct: text(row.related_product_), isTrial: Boolean(row.is_trial_), deadline: date(row.deadline_), expectedCloseDate: date(row.expected_close_date_) || undefined,
  winRate: Number(row.win_rate_ || 0) || undefined, keyDecision: text(row.key_decision_) || undefined, ownerName: text(row.owner_name_), collaborators: Array.isArray(row.collaborators_) ? row.collaborators_.map(text) : [],
  source: text(row.source_), probability: Number(row.probability_ || 0), remarks: text(row.remarks_), createdAt: date(row.create_time_), version: Number(row.version_ || 0),
}));

export const MOCK_FOLLOW_UPS: FollowUpRecord[] = activeRows('t_crm_follow_up').map((row) => ({
  id: text(row.id_), customerId: text(row.customer_id_), customerName: customerNameById.get(text(row.customer_id_)) || '', opportunityId: text(row.opportunity_id_) || undefined,
  opportunityName: opportunityNameById.get(text(row.opportunity_id_)) || undefined, contactName: text(row.contact_name_) || undefined, followType: text(row.follow_type_) || undefined,
  content: text(row.content_), ownerName: text(row.owner_name_) || undefined, followTime: text(row.follow_time_) || undefined, feedback: text(row.feedback_) || undefined,
  nextFollowPlan: text(row.next_follow_plan_) || undefined, nextPlanDate: date(row.next_plan_date_) || undefined, attachments: Array.isArray(row.attachments_) ? row.attachments_.map(text) : [],
}));

export const MOCK_CONTRACTS: Contract[] = activeRows('t_crm_contract').map((row) => ({
  id: text(row.id_), code: text(row.code_), name: text(row.name_), customerId: text(row.customer_id_), customerName: customerNameById.get(text(row.customer_id_)) || '',
  relatedProduct: text(row.related_product_), type: text(row.type_), amount: Number(row.amount_ || 0), paidAmount: Number(row.paid_amount_ || 0), ownerName: text(row.owner_name_) || undefined,
  signDate: date(row.sign_date_), effectiveDate: date(row.effective_date_) || undefined, durationMonths: Number(row.duration_months_ || 0) || undefined, endDate: date(row.end_date_) || undefined,
  status: text(row.status_), paymentStages: activeRows('t_crm_contract_payment_stage').filter((stage) => text(stage.contract_id_) === text(row.id_)).map((stage) => ({ phase: text(stage.phase_), percentage: Number(stage.percentage_ || 0), amount: Number(stage.amount_ || 0), status: text(stage.status_), triggerCondition: text(stage.trigger_condition_) || undefined, dueDate: date(stage.due_date_) })),
  attachments: Array.isArray(row.attachments_) ? row.attachments_.map(text) : [], version: Number(row.version_ || 0),
}));

export const MOCK_TEST_CASE_DIRECTORIES: TestCaseDirectory[] = rows('t_product_test_case_directory').filter((row) => Number(row.delete_flag_ || 0) === 0).map((row) => ({ id: text(row.id_), parentId: text(row.parent_id_) || null, name: text(row.name_), sort: Number(row.sort_ || 0), caseCount: Number(row.case_count_ || 0), productLineId: text(row.product_line_id_), productLineName: productNameById.get(text(row.product_line_id_)) || '' }));
const testCaseSteps = new Map<string, TestCase['steps']>();
activeRows('t_product_test_case_step').forEach((row) => {
  const caseId = text(row.test_case_id_);
  testCaseSteps.set(caseId, [...(testCaseSteps.get(caseId) || []), { id: text(row.id_), sort: Number(row.sort_ || 0), action: text(row.action_), expectedResult: text(row.expected_result_) }]);
});
export const MOCK_TEST_CASES: TestCase[] = rows('t_product_test_case').filter((row) => Number(row.delete_flag_ || 0) === 0).map((row) => ({ id: text(row.id_), code: text(row.code_), productLineId: text(row.product_line_id_), directoryId: text(row.directory_id_), directoryName: text(row.directory_name_), title: text(row.title_), precondition: text(row.precondition_) || null, priority: (text(row.priority_) || 'P2') as TestCase['priority'], ownerId: text(row.owner_id_), ownerName: text(row.owner_name_), creatorName: text(row.creator_name_), tags: json<string[]>(row.tags_, []), workItemTypeId: text(row.work_item_type_id_), workItemTypeName: text(row.work_item_type_name_), workflowId: text(row.workflow_id_), statusKey: text(row.status_key_), statusName: text(row.status_name_), statusGroup: text(row.status_group_), statusColor: text(row.status_color_), enabled: Boolean(row.enabled_), revision: Number(row.revision_ || 0), referenceCount: Number(row.reference_count_ || 0), latestResult: row.latest_result_ as TestCase['latestResult'], createdAt: text(row.create_time_), updatedAt: text(row.update_time_), steps: testCaseSteps.get(text(row.id_)) || [] }));
const testCasesById = new Map(MOCK_TEST_CASES.map((item) => [item.id, item]));
const planCaseRows = activeRows('t_product_test_plan_case');
const planCasesByPlan = new Map<string, TestPlan['cases']>();
planCaseRows.forEach((row) => {
  const source = testCasesById.get(text(row.test_case_id_));
  if (!source) return;
  const planId = text(row.test_plan_id_);
  planCasesByPlan.set(planId, [...(planCasesByPlan.get(planId) || []), { linkId: text(row.id_), testCaseId: source.id, sort: Number(row.sort_ || 0), code: source.code, title: source.title, priority: source.priority, ownerName: source.ownerName, enabled: source.enabled, latestResult: source.latestResult }]);
});
export const MOCK_TEST_PLANS: TestPlan[] = rows('t_product_test_plan').filter((row) => Number(row.delete_flag_ || 0) === 0).map((row) => ({ id: text(row.id_), workItemId: text(row.work_item_id_), name: text(row.name_), environment: text(row.environment_) || null, startDate: date(row.start_date_), endDate: date(row.end_date_), ownerId: text(row.owner_id_), ownerName: text(row.owner_name_), executable: Boolean(row.executable_), revision: Number(row.revision_ || 0), cases: planCasesByPlan.get(text(row.id_)) || [] }));
