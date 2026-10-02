import type { Contract, CurrentUser, Customer, DefectBug, FollowUpRecord, Lead, Opportunity, ProductLine, RequirementTask, TeamMember, VersionIteration } from '../types';
import type { LinkedTestDefect, TestCase, TestCaseDirectory, TestExecution, TestPlan } from '../types/testManagement';
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
  defaultView: 'list', timeRules: [], validation: { actionWeightTotal: 100, maxActions: 10, assigneeMultiple: true, keyNodeMultiple: true, resultRequired: false }, dictionaries: { productNodes: [], deliveryNodes: [], presalesNodes: [], supportTypes: [] }, templates: []
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
    return { id, name: text(row.name_), code: text(row.code_), description: text(row.description_), status: text(row.status_), ownerName: text(row.owner_name_), ownerUserId: text(row.owner_user_id_) || undefined, productOwner: text(row.owner_name_), technicalOwner: text(row.tech_owner_), technicalOwnerUserId: text(row.tech_owner_user_id_) || undefined, requirementOwner: text(row.requirement_owner_), requirementOwnerUserId: text(row.requirement_owner_user_id_) || undefined, requirementOwnerSecondary: text(row.requirement_owner_secondary_), requirementOwnerSecondaryUserId: text(row.requirement_owner_secondary_user_id_) || undefined, techOwner: text(row.tech_owner_), techOwnerUserId: text(row.tech_owner_user_id_) || undefined, techOwnerSecondary: text(row.tech_owner_secondary_), techOwnerSecondaryUserId: text(row.tech_owner_secondary_user_id_) || undefined, testOwner: text(row.test_owner_), testOwnerUserId: text(row.test_owner_user_id_) || undefined, testOwnerSecondary: text(row.test_owner_secondary_), testOwnerSecondaryUserId: text(row.test_owner_secondary_user_id_) || undefined, members, visibility: text(row.visibility_) || '公开', commercialAvailability: (text(row.commercial_availability_) || '不可商用') as ProductLine['commercialAvailability'], sort: Number(row.sort_ || 0), currentVersion: text(row.current_version_), totalRequirements: items.filter((item) => text(item.category_) === 'requirement').length, inProgressReqs: items.filter((item) => text(item.category_) === 'requirement' && !['COMPLETED', 'CANCELLED'].includes(text(item.status_group_))).length, iterationProgress: 0, createdAt: text(row.create_time_), versions: (versionsByProduct.get(id) || []).map((version) => ({ id: text(version.id_), name: text(version.name_), code: text(version.code_), startDate: date(version.start_date_), endDate: date(version.end_date_), status: text(version.status_) })) } as ProductLine;
  });

export const MOCK_VERSIONS: VersionIteration[] = rows('t_product_line_version')
  .filter((row) => text(row.tenant_id_) === 'local-tenant' && Number(row.delete_flag_ || 0) === 0)
  .map((row) => ({ id: text(row.id_), code: text(row.code_), name: text(row.name_), ownerName: text(row.owner_name_), productLineId: text(row.product_line_id_), productLineName: productNameById.get(text(row.product_line_id_)) || '', startDate: date(row.start_date_), endDate: date(row.end_date_), releaseDate: date(row.release_date_), status: text(row.status_), statusPhase: text(row.status_phase_), requirementsCount: Number(row.requirements_count_ || 0), completedReqCount: Number(row.completed_req_count_ || 0), linkedRequirementIds: json<string[]>(row.linked_requirement_ids_, []) }));

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
export const MOCK_DESIGN_TASKS = workItems.filter((row) => text(row.category_) === 'design').map(task);
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
const executionCaseRows = activeRows('t_product_test_execution_case');
const planCasesByPlan = new Map<string, TestPlan['cases']>();
planCaseRows.forEach((row) => {
  const source = testCasesById.get(text(row.test_case_id_));
  if (!source) return;
  const planId = text(row.test_plan_id_);
  planCasesByPlan.set(planId, [...(planCasesByPlan.get(planId) || []), { linkId: text(row.id_), testCaseId: source.id, sort: Number(row.sort_ || 0), code: source.code, title: source.title, priority: source.priority, ownerName: source.ownerName, enabled: source.enabled, latestResult: source.latestResult }]);
});
const defectsByExecutionCase = new Map<string, LinkedTestDefect[]>();
activeRows('t_product_test_execution_defect').forEach((row) => {
  const defect = MOCK_BUGS.find((item) => item.id === text(row.defect_work_item_id_));
  if (!defect) return;
  const key = text(row.execution_case_id_);
  defectsByExecutionCase.set(key, [...(defectsByExecutionCase.get(key) || []), { id: defect.id, code: defect.code, title: defect.title, status: defect.status, priority: defect.priority || '', assigneeName: defect.ownerName }]);
});
const executionCasesByExecution = new Map<string, TestExecution['cases']>();
executionCaseRows.forEach((row) => {
  const source = testCasesById.get(text(row.test_case_id_));
  const steps = json<TestCase['steps']>(row.steps_snapshot_, source?.steps || []);
  const key = text(row.execution_id_);
  executionCasesByExecution.set(key, [...(executionCasesByExecution.get(key) || []), { id: text(row.id_), testCaseId: text(row.test_case_id_), sort: Number(row.sort_ || 0), code: text(row.code_snapshot_) || source?.code || '', title: text(row.title_snapshot_) || source?.title || '', precondition: text(row.precondition_snapshot_) || source?.precondition || null, priority: (text(row.priority_snapshot_) || source?.priority || 'P2') as TestCase['priority'], steps, result: (text(row.result_) || 'NOT_EXECUTED') as TestExecution['cases'][number]['result'], actualResult: text(row.actual_result_) || null, executorName: text(row.executor_name_) || null, executedAt: text(row.executed_at_) || null, revision: Number(row.version_ || 0), evidence: [], defects: defectsByExecutionCase.get(text(row.id_)) || [] }]);
});
export const MOCK_TEST_PLANS: TestPlan[] = rows('t_product_test_plan').filter((row) => Number(row.delete_flag_ || 0) === 0).map((row) => ({ id: text(row.id_), workItemId: text(row.work_item_id_), name: text(row.name_), environment: text(row.environment_) || null, startDate: date(row.start_date_), endDate: date(row.end_date_), ownerId: text(row.owner_id_), ownerName: text(row.owner_name_), executable: Boolean(row.executable_), revision: Number(row.revision_ || 0), cases: planCasesByPlan.get(text(row.id_)) || [] }));
export const MOCK_TEST_EXECUTIONS: TestExecution[] = rows('t_product_test_execution').filter((row) => Number(row.delete_flag_ || 0) === 0).map((row) => { const cases = executionCasesByExecution.get(text(row.id_)) || []; return { id: text(row.id_), workItemId: text(row.work_item_id_), testPlanId: text(row.test_plan_id_), planName: text(row.plan_name_), roundNo: Number(row.round_no_ || 1), name: text(row.name_), scopeType: text(row.scope_type_) as TestExecution['scopeType'], environment: text(row.environment_) || null, buildVersion: text(row.build_version_) || null, executorName: text(row.executor_name_), status: text(row.status_) as TestExecution['status'], startTime: text(row.start_time_), endTime: text(row.end_time_) || null, revision: Number(row.version_ || 0), total: Number(row.total_ || cases.length), passed: Number(row.passed_ || cases.filter((item) => item.result === 'PASSED').length), failed: Number(row.failed_ || cases.filter((item) => item.result === 'FAILED').length), notExecuted: Number(row.not_executed_ || cases.filter((item) => item.result === 'NOT_EXECUTED').length), cases }; });
