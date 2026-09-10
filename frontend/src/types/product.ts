// 产品管理相关类型定义

export interface RequirementTask {
  id?: string;
  title: string;
  description?: string;
  descriptionHtml?: string;
  expectedGoal?: string;
  status?: string;
  priority?: string;
  ownerName?: string;
  creatorName?: string;
  productLineName?: string;
  productLineId?: string;
  versionName?: string;
  versionId?: string;
  customerName?: string;
  plannedStartDate?: string;
  dueDate?: string;
  createdAt?: string;
  estimatedHours?: number;
  requirementType?: string;
  expectedCompleteDate?: string;
  ccNames?: string[];
  code?: string;
  media?: Array<{
    id: string;
    name: string;
    url?: string;
    type: string;
  }>;
}

export interface Version {
  id: string;
  name: string;
  code?: string;
  status: string;
  releaseDate?: string;
  productLineId?: string;
  productLineName?: string;
  requirementsCount?: number;
  completedReqCount?: number;
  tasksCount?: number;
  bugsCount?: number;
  linkedRequirementIds?: string[];
  description?: string;
  planStartDate?: string;
  planReleaseDate?: string;
}

export interface ProductLine {
  id: string;
  name: string;
  code?: string;
  description?: string;
  status?: string;
  owner?: string;
  members?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface DevTask {
  id: string;
  title: string;
  status: string;
  developer?: string;
  priority: string;
  versionName?: string;
  productLineName?: string;
  description?: string;
  estimatedHours?: number;
  createdAt?: string;
}

export interface Bug {
  id: string;
  title: string;
  status: string;
  assignee?: string;
  ownerName?: string;
  severity: string;
  versionName?: string;
  productLineName?: string;
  description?: string;
  createdAt?: string;
  type?: string;
  code?: string;
}

export interface DesignTask {
  id: string;
  title: string;
  status: string;
  designer?: string;
  priority: string;
  versionName?: string;
  productLineName?: string;
  description?: string;
  createdAt?: string;
}

// API 响应类型
export interface PageResponse<T> {
  items: T[];
  total?: number;
  page?: number;
  pageSize?: number;
}

// 表单模式
export type FormMode = 'create' | 'edit';

// 任务类型
export type TaskKind = 'requirement' | 'design' | 'dev' | 'bug';
