export type TestPriority = 'P0' | 'P1' | 'P2' | 'P3';
export type TestResultStatus = 'NOT_EXECUTED' | 'PASSED' | 'FAILED';

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
  creatorName?: string;
  participantNames?: string[];
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
  ownerId?: string | null;
  ownerName?: string | null;
  revision: number;
  cases: TestPlanCase[];
}

export interface SaveTestPlanInput {
  testCaseIds: string[];
  name: string;
  environment?: string;
  startDate?: string | null;
  endDate?: string | null;
  workItemId?: string;
  productLineId?: string;
  versionId?: string | null;
  ownerId?: string;
  ownerName?: string;
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
  reportType?: string;
  productLineId?: string;
  productLineName?: string;
  versionId?: string;
  versionName?: string;
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
  reportType: '功能测试' | '安全测试' | '回归测试';
  testPlanIds: string[];
  summary?: string;
  attachments?: Array<{ name: string; url?: string; size?: number; type?: string }>;
  revision?: number;
}
