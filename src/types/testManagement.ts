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
  executionStatus?: TestPlanCaseStatus;
  defectIds?: string[];
}

export type TestPlanCaseStatus = 'NOT_EXECUTED' | 'PASSED' | 'FAILED' | 'DEFERRED';

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
  caseResults?: Array<{ testCaseId: string; executionStatus: TestPlanCaseStatus; defectIds: string[] }>;
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
  revision: number;
  createdAt: string;
  updatedAt: string;
}

export interface VersionTestReport extends VersionTestReportListItem {
  versionName: string;
  attachments?: SaveVersionTestReportInput['attachments'];
}

export interface SaveVersionTestReportInput {
  productLineId?: string;
  versionId?: string;
  name: string;
  reportType: '功能测试' | '安全测试' | '回归测试';
  summary?: string;
  attachments?: Array<{ name: string; url?: string; size?: number; type?: string }>;
  revision?: number;
}
