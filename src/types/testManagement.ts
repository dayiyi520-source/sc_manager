export type TestPriority = 'P0' | 'P1' | 'P2' | 'P3';
export type TestResultStatus = 'NOT_EXECUTED' | 'PASSED' | 'FAILED';
export type TestExecutionScope = 'ALL' | 'FAILED_ONLY' | 'CUSTOM';
export type TestExecutionStatus = 'IN_PROGRESS' | 'ENDED' | 'CANCELLED';

export interface TestCaseStep {
  id?: string;
  sort: number;
  action: string;
  expectedResult: string;
}

export interface TestCaseDirectory {
  id: string;
  parentId?: string | null;
  name: string;
  sort: number;
  caseCount: number;
  productLineId?: string;
  productLineName?: string;
}

export interface TestCase {
  id: string;
  code: string;
  productLineId: string;
  directoryId: string;
  directoryName?: string;
  sourceRequirementId?: string | null;
  sourceRequirementTitle?: string | null;
  title: string;
  precondition?: string | null;
  priority: TestPriority;
  ownerId: string;
  ownerName: string;
  tags: string[];
  workItemTypeId: string;
  workItemTypeName: string;
  workflowId: string;
  statusKey: string;
  statusName: string;
  statusGroup: string;
  statusColor: string;
  enabled: boolean;
  revision: number;
  referenceCount: number;
  latestResult?: TestResultStatus | null;
  createdAt?: string;
  updatedAt?: string;
  steps: TestCaseStep[];
}

export interface TestCasePage {
  items: TestCase[];
  page: number;
  pageSize: number;
  total: number;
}

export interface SaveTestCaseInput {
  directoryId: string;
  sourceRequirementId?: string | null;
  title: string;
  precondition?: string;
  priority: TestPriority;
  ownerId: string;
  tags: string[];
  workItemTypeId: string;
  statusKey: string;
  steps: TestCaseStep[];
  revision?: number;
}

export interface TestPlanCase {
  linkId: string;
  testCaseId: string;
  sort: number;
  code: string;
  title: string;
  priority: TestPriority;
  ownerName: string;
  enabled: boolean;
  latestResult?: TestResultStatus | null;
}

export interface TestPlan {
  id?: string | null;
  workItemId: string;
  executable: boolean;
  name?: string;
  environment?: string;
  startDate?: string | null;
  endDate?: string | null;
  revision: number;
  cases: TestPlanCase[];
}

export interface SaveTestPlanInput {
  testCaseIds: string[];
  name: string;
  environment?: string;
  startDate?: string | null;
  endDate?: string | null;
  revision: number;
}

export interface VersionTestReportPlan {
  id: string;
  name: string;
  taskTitle: string;
  ownerName: string;
  startDate?: string | null;
  endDate?: string | null;
  environment?: string | null;
  status?: string;
  total?: number;
  passed?: number;
  failed?: number;
  notExecuted?: number;
  passRate?: number;
}

export interface VersionTestReportListItem {
  id: string;
  name: string;
  summary?: string;
  creatorName: string;
  firstPlanName?: string;
  planCount: number;
  revision: number;
  createdAt: string;
  updatedAt: string;
}

export interface TestReportMetric { name: string; value: number }

export interface VersionTestReport extends VersionTestReportListItem {
  versionName: string;
  plans: VersionTestReportPlan[];
  statistics: { total: number; defects: number; urgent: number; severe: number };
  resultDistribution: TestReportMetric[];
  repairDistribution: TestReportMetric[];
  severityDistribution: TestReportMetric[];
  priorityDistribution: TestReportMetric[];
  urgentDefects: Array<{ id: string; code: string; title: string; status: string; priority: string; severity: string; assigneeName?: string }>;
}

export interface SaveVersionTestReportInput {
  name: string;
  testPlanIds: string[];
  summary?: string;
  revision?: number;
}

export interface TestEvidence {
  id?: string;
  name: string;
  contentType: string;
  size: number;
  dataUrl: string;
}

export interface LinkedTestDefect {
  id: string;
  code: string;
  title: string;
  status: string;
  priority: string;
  assigneeName?: string;
}

export interface TestExecutionCase {
  id: string;
  testCaseId: string;
  sort: number;
  code: string;
  title: string;
  precondition?: string | null;
  priority: TestPriority;
  steps: TestCaseStep[];
  result: TestResultStatus;
  actualResult?: string | null;
  executorName?: string | null;
  executedAt?: string | null;
  revision: number;
  evidence: TestEvidence[];
  defects: LinkedTestDefect[];
}

export interface TestExecution {
  id: string;
  workItemId: string;
  testPlanId: string;
  planName?: string;
  roundNo: number;
  name: string;
  scopeType: TestExecutionScope;
  environment?: string | null;
  buildVersion?: string | null;
  executorName: string;
  status: TestExecutionStatus;
  startTime?: string | null;
  endTime?: string | null;
  revision: number;
  total: number;
  passed: number;
  failed: number;
  notExecuted: number;
  cases: TestExecutionCase[];
}

export interface CreateTestExecutionInput {
  requestId: string;
  planId: string;
  scopeType: TestExecutionScope;
  testCaseIds: string[];
  name: string;
  environment?: string;
  buildVersion?: string;
}

export interface TestTaskOverview {
  workItemId: string;
  childCount: number;
  completedChildCount: number;
  caseCount: number;
  executionCount: number;
  total: number;
  passed: number;
  failed: number;
  notExecuted: number;
  defectCount: number;
  blockingDefectCount: number;
  conclusion: 'NOT_PASSED' | 'PASSED' | 'CONDITIONAL_PASS';
  blockers: Array<'REQUIRED_CHILD_INCOMPLETE' | 'UNEXECUTED_CASES' | 'OPEN_BLOCKING_DEFECTS'>;
  defects: LinkedTestDefect[];
  children: Array<Record<string, unknown>>;
}
