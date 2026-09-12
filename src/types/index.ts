export type SystemRole = 'admin' | 'sales_director' | 'product_manager' | 'tech_lead';

export interface CurrentUser {
  id: string;
  name: string;
  avatar: string;
  role: SystemRole;
  roleTitle: string;
  department: string;
}

// 导航菜单定义
export type MainMenuId = 
  | 'workbench' 
  | 'crm' 
  | 'product' 
  | 'approval' 
  | 'project' 
  | 'system';

export type SubMenuId =
  // 工作台
  | 'wb_my_tasks'
  | 'wb_okr_perf'
  | 'wb_knowledge'
  | 'wb_knowledge_center'
  // 客户与商机
  | 'crm_dashboard'
  | 'crm_customers'
  | 'crm_leads'
  | 'crm_opportunities'
  | 'crm_visits'
  | 'crm_followups'
  | 'crm_partners'
  | 'crm_tender'
  | 'crm_bidding'
  | 'crm_winning_engagement'
  | 'crm_bidding_review'
  | 'crm_bid_review'
  | 'crm_contracts'
  | 'crm_presales_tasks'
  | 'crm_presales_tickets'
  // 产研管理
  | 'prod_planning'
  | 'prod_req_tasks'
  | 'prod_design_tasks'
  | 'prod_reqs'
  | 'prod_versions'
  | 'prod_lines'
  | 'prod_rd_tasks'
  | 'prod_dev_tasks'
  | 'prod_bugs'
  | 'wb_work_order'

  | 'prod_reviews'
  | 'prod_review'
  // 审批中心
  | 'approval_center'
  | 'comp_approval'
  | 'comp_attendance'
  | 'comp_procurement'
  | 'comp_asset'
  | 'comp_invoice'
  | 'comp_payment'
  // 项目管理兼容别名
  | 'ops_projects'
  | 'ops_milestones'
  // 知识与组织
  | 'know_base'
  | 'team_org'
  | 'sys_settings'
  // 项目管理
  | 'proj_list'
  | 'proj_config'
  | 'proj_delivery_tasks'
  | 'proj_ops_tasks'
  | 'proj_delivery_tickets';

export interface PageTab {
  id: SubMenuId;
  title: string;
  mainMenuId: MainMenuId;
  iconName: string;
  closable?: boolean;
}

// OKR 与 绩效
export interface OKRItem {
  id: string;
  cycle: string; // 如 "2026-09", "2026-08"
  ownerId: string;
  ownerName: string;
  department: string;
  category: 'my' | 'supervisor' | 'subordinate' | 'department' | 'other_dept';
  objective: string;
  weight: number; // 目标权重
  progress: number; // 0-100
  deadline: string;
  alignTo?: string; // 对齐目标
  keyResults: {
    id: string;
    content: string;
    progress: number;
    weight: number;
    deadline: string;
  }[];
}

export interface PerformanceReview {
  id: string;
  type: 'week' | 'month';
  cycleName: string; // "2026年8月月结"
  author: string;
  authorDept: string;
  summary: string;
  uncompletedReason: string;
  selfScore: number;
  suggestions: string;
  helpNeeded: string;
  sendTo: string[];
  createdAt: string;
  status: 'draft' | 'submitted' | 'reviewed';
  feedback?: string;
  leaderScore?: number;
}

// 知识库
export type KnowledgePrimaryCategory = '应知应会' | '产研规范' | '产品沉淀' | '项目沉淀' | '售前文档' | '行业洞察' | '管理规章';

export interface KnowledgeCategoryInfo {
  id: string;
  name: KnowledgePrimaryCategory;
  docCount: number;
  description: string;
  tags: string[];
  icon: string;
  color: string;
  bgGradient?: string;
}

export interface KnowledgeDoc {
  id: string;
  title: string;
  category: KnowledgePrimaryCategory | string;
  subCategory?: string;
  tags: string[];
  author: string;
  creator?: string;
  version?: string;
  updatedAt: string;
  timeAgo?: string;
  favoritedAt?: string;
  views?: number;
  downloadsCount?: number;
  isFavorited?: boolean;
  dingtalkUrl?: string;
  wecomUrl?: string;
  summary?: string;
  content?: string;
  fileSize?: string;
  fileType?: 'word' | 'excel' | 'ppt' | 'pdf' | 'code' | 'design' | 'doc';
  isNew?: boolean;
  isPinned?: boolean;
  isMine?: boolean;
  isFollowed?: boolean;
}

// 客户与商机
export type CustomerType = '高校' | '教育主管单位' | '其他' | '政府国企' | '民营标杆' | '高校科研' | '渠道集成商' | '金融机构' | string;
export type CustomerLevel = 'S级-战略' | 'A级-重点' | 'B级-标准' | 'C级-培育';
export type OpportunityStage = 
  | '发现商机' 
  | '需求确认' 
  | '方案设计' 
  | '商务谈判' 
  | '招投标' 
  | '中标赢单' 
  | '签约赢单'
  | '输单流失';

export interface Customer {
  id: string;
  name: string;
  code: string;
  type: CustomerType;
  level: CustomerLevel;
  contactName: string;
  contactPhone: string;
  contactTitle: string;
  contactEmail?: string;
  annualBudget?: number;
  activeProjectsCount: number;
  potentialOppsCount: number;
  source: '主动开发' | '代理商' | '官方媒介' | '客户转介' | '行业展会';
  lastFollowUp: string;
  tags: string[];
  address: string;
  industry: string;
  scale: string;
  schoolLevel?: string;
  schoolNature?: string;
  schoolType?: string;
  ownership?: '公办' | '民办' | string;
  region?: string;
  status?: '有效' | '无效' | string;
  createdAt: string;
  version?: number;
}

export interface Opportunity {
  id: string;
  name: string;
  type: '新购软件' | '定制研发' | '维保升级' | '集成总包' | string;
  customerId: string;
  leadId?: string;
  customerName: string;
  stage: OpportunityStage;
  status?: '跟进中' | '已完成' | '已废弃' | string;
  amount: number; // 预计金额（元）
  relatedProduct: string;
  isTrial: boolean;
  deadline: string;
  expectedCloseDate?: string;
  winRate?: number;
  keyDecision?: string;
  ownerName: string;
  collaborators: string[];
  source: string;
  probability: number; // 转化概率%
  remarks: string;
  createdAt: string;
  version?: number;
}

export interface FollowUpRecord {
  id: string;
  customerId: string;
  customerName: string;
  opportunityId?: string;
  opportunityName?: string;
  contactName?: string;
  followType?: '线上聊天' | '电话沟通' | '视频会议' | '线下拜访' | '商务宴请' | string;
  method?: string;
  content: string;
  ownerName?: string;
  creator?: string;
  followTime?: string;
  date?: string;
  feedback?: string;
  nextFollowPlan?: string;
  nextPlanDate?: string;
  nextGoal?: string;
  attachments?: string[];
  assistanceType?: '无协助需求（仅记录）' | '产品需求' | '售前支持' | '价格申请' | string;
  productLines?: string[];
}
export type FollowupRecord = FollowUpRecord;

export interface Partner {
  id: string;
  name: string;
  type: '战略核心伙伴' | '区域总代' | '集成服务商' | '技术生态伙伴' | '方案集成伙伴' | '区域分销伙伴' | '方案系统集成商 (SI)' | string;
  level: '一级' | '二级' | '三级' | '战略核心伙伴' | '方案集成伙伴' | '区域分销伙伴' | string;
  contactName: string;
  contactTitle?: string;
  contactPhone: string;
  contactEmail?: string;
  commissionRate?: number | string; // 5% - 30%
  rebateRate?: string;
  internalOwner?: string;
  region?: string;
  coopArea?: string;
  coopDate?: string;
  oppsContributed?: number;
  projectCount?: number;
  dealsWon?: number;
  totalAmount?: number; // 贡献金额
  status: '合作中' | '已暂停' | '已终止' | string;
  documents?: { title: string; url: string }[];
}

export interface TenderBidding {
  id: string;
  code?: string;
  name?: string;
  projectName?: string;
  oppName?: string;
  customerId?: string;
  customerName: string;
  type?: '公开招标' | '邀请招标' | '竞争性谈判' | '单一来源采购' | string;
  budgetAmount?: number;
  budget?: number;
  bidAmount?: number;
  publishDate?: string;
  bidDeadline?: string;
  deadline?: string;
  ownerName?: string;
  agency?: string;
  techLeader?: string;
  commercialLeader?: string;
  opportunityId?: string;
  status: '报名中' | '制作标书中' | '标书制作中' | '已递交标书' | '已递交投标' | '已投标待开标' | '现场述标中' | '已开标' | '中标' | '未中标' | '流标' | '已放弃' | string;
  result?: '投标中' | '待开标' | '中标' | '已中标' | '未中标' | '已落标' | '流标' | string;
  remarks?: string;
  keyRequirements?: string;
  reviewed?: boolean;
}
export type BiddingProject = TenderBidding;

export interface BiddingReview {
  id: string;
  biddingId: string;
  biddingName: string;
  projectName: string;
  customerName: string;
  result: '中标' | '未中标' | '流标';
  ownerName: string;
  reviewTime: string;
  scoreAnalysis: {
    businessScore: number;
    techScore: number;
    priceScore: number;
    competitorName: string;
    competitorPrice: number;
  };
  gapAnalysis: string;
  keyWinLossFactors: string[];
  improvementSuggestions: string;
}
export type BidReview = BiddingReview;

export interface Contract {
  id: string;
  code: string;
  name: string;
  customerId: string;
  customerName: string;
  relatedProduct: string;
  type: '主合同' | '补充协议' | '维保服务合同' | '代理合作协议' | '标准产品销售' | '定制开发' | '信创集成' | '维保服务' | string;
  isParentContract?: boolean;
  amount: number;
  paidAmount?: number;
  ownerName?: string;
  signDate: string;
  effectiveDate?: string;
  durationMonths?: number;
  endDate?: string;
  status: '履行中' | '履约中' | '已结项' | '已完结' | '有逾期款项' | '已终止' | '进行中' | '待生效' | string;
  paymentStages?: {
    phase: string;
    percentage: number;
    amount: number;
    status: string;
    triggerCondition?: string;
    dueDate: string;
  }[];
  paymentSchedules?: {
    stage: string;
    percentage: number;
    amount: number;
    condition: string;
    dueDate: string;
    isPaid: boolean;
    paidDate?: string;
  }[];
  attachments?: string[];
  version?: number;
}

// 产品与研发
export interface ProductLineMember {
  id: string;
  name: string;
  role: string;
  email?: string;
  phone?: string;
}

export type ProductLineWorkItemCategory = '需求' | '设计' | '研发' | '缺陷';

export interface ProductLineWorkItemType {
  id: string;
  category: ProductLineWorkItemCategory;
  name: string;
  description?: string;
  creatorName?: string;
  createdAt?: string;
  enabled: boolean;
}

export interface ProductLineActivity {
  id: string;
  action: string;
  detail?: string;
  operatorName?: string;
  createdAt: string;
}

export interface ProductItemInLine {
  id: string;
  name: string;
  code?: string;
  version?: string;
  status?: '运营中' | '研发中' | '规划中' | '维护期' | string;
  description?: string;
}

export interface ProductLine {
  id: string;
  name: string;
  code: string;
  description: string;
  ownerName?: string;
  owner?: string;
  website?: string;
  subProducts?: string[];
  productOwner?: string;
  technicalOwner?: string;
  testOwner?: string;
  versionCount?: number;
  customerCount?: number;
  health?: '健康' | '预警' | '关注' | string;
  status?: '启用中' | '已停用' | string;
  visibility?: '公开' | '私密' | '仅创建者可见' | '部门可见' | '保密';
  coverColor?: string;
  coverUrl?: string;
  members?: ProductLineMember[] | string[];
  workItemTypes?: ProductLineWorkItemType[];
  currentVersion?: string;
  totalRequirements?: number;
  inProgressReqs?: number;
  activeTasksCount?: number;
  progress?: number;
  iterationProgress?: number; // 0-100
  createdAt?: string;
  coverImage?: string;
  requirementOwner?: string;
  techOwner?: string;
  products?: ProductItemInLine[];
  pendingReqCount?: number;
  pendingBugCount?: number;
  activeTaskCount?: number;
  versions?: VersionIteration[];
  activities?: ProductLineActivity[];
}

export interface RequirementTask {
  id: string;
  code?: string;
  title: string;
  description?: string;
  expectedGoal?: string;
  status: '待处理' | '处理中' | '已搁置' | '已驳回' | '已完成' | '设计中' | '研发中' | '测试中' | '已发布' | '已挂起' | string;
  priority: '紧急' | '高' | '中' | '低' | 'P0-紧急阻断' | 'P1-高优' | 'P2-普通' | 'P2-标准' | 'P3-低优' | string;
  ownerName: string;
  creatorName?: string;
  department?: string;
  departmentId?: string;
  versionId?: string;
  versionName: string;
  productLineId?: string;
  productLineName: string;
  customerId?: string;
  customerName?: string;
  descriptionHtml?: string;
  media?: RequirementMedia[];
  taskType?: RequirementTaskType;
  taskId?: string;
  assignedOwnerName?: string;
  assignedNote?: string;
  events?: RequirementEvent[];
  estimatedHours: number;
  actualHours?: number;
  dueDate: string;
  createdAt?: string;
  todoList?: { id: string; text: string; done: boolean }[];
  category?: 'my_responsible' | 'my_dept' | 'assigned_to_me' | 'other_dept';
  workOrderType?: WorkOrderType;
  specialFields?: Record<string, string | number | null> | string;
  sourceWorkOrderIds?: string[];
  sourceWorkOrderTitles?: string[];
  requirementId?: string;
  requirementType?: string;
  ccNames?: string[];
  plannedStartDate?: string;
  expectedCompleteDate?: string;
}

export type RequirementWorkOrderType = 'requirement' | 'task' | 'bug' | 'risk' | 'source' | 'topic';
export interface RequirementWorkOrderCandidate {
  id: string;
  type: RequirementWorkOrderType;
  typeLabel: string;
  title: string;
  code?: string;
  ownerName?: string;
  productLineName?: string;
  status?: string;
  summary?: string;
}

export interface RequirementTaskDraft {
  title?: string;
  description?: string;
  expectedGoal?: string;
  ownerName?: string;
  priority?: RequirementTask['priority'];
  productLineName?: string;
  versionName?: string;
  dueDate?: string;
  customerName?: string;
  requirementType?: string;
  ccNames?: string[];
  plannedStartDate?: string;
  expectedCompleteDate?: string;
  sourceWorkOrderIds?: string[];
}

export type WorkOrderType = '客户诉求' | '线上问题' | '售前支持' | '交付支持' | '其他问题';

export type RequirementTaskType =
  | '产品需求'
  | '数据需求'
  | '缺陷管理'
  | '设计任务'
  | '售前任务'
  | '交付任务'
  | '运维任务'
  | '研发任务'
  | 'bug修复'
  | '售前支持'
  | '项目交付'
  | '运维部署'
  | '技术问题';

export interface RequirementMedia {
  id: string;
  name: string;
  type: 'image' | 'video' | 'file';
  dataUrl: string;
  size?: number;
  mimeType?: string;
}

export interface RequirementEvent {
  id: string;
  eventType: string;
  fromStatus?: string;
  toStatus?: string;
  reason?: string;
  operatorName: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface RequirementWorkItem {
  id: string;
  requirementId: string;
  requirementCode?: string;
  requirementTitle?: string;
  taskType: RequirementTaskType;
  title: string;
  assigneeName: string;
  note?: string;
  status: string;
  syncStatus?: 'PENDING' | 'SUCCESS' | 'FAILED' | string;
  retryCount?: number;
  lastError?: string;
  nextRetryAt?: string;
  lastSyncAt?: string;
  createdAt?: string;
}

export interface DepartmentOption {
  id: string;
  name: string;
  managerName: string;
}

export interface EmployeeOption {
  id: string;
  username?: string;
  name: string;
  department?: string;
  role?: string;
  roleTitle?: string;
}

export interface VersionIteration {
  id: string;
  code?: string;
  name: string;
  ownerName?: string;
  productLineId?: string;
  productLineName?: string;
  startDate?: string;
  endDate?: string;
  releaseDate?: string;
  status: '规划中' | '迭代中' | '封版测试' | '已发布' | string;
  requirementsCount?: number;
  reqCount?: number;
  bugCount?: number;
  changelog?: string;
  content?: string;
  completedReqCount?: number;
  linkedRequirementIds?: string[];
  isReviewed?: boolean;
  createdAt?: string;
}

export interface DefectBug {
  id: string;
  code?: string;
  title: string;
  description?: string;
  status: '待修复' | '修复中' | '待验证' | '已关闭' | '已拒绝' | string;
  severity: '致命' | '严重' | '一般' | '轻微' | '致命阻断' | '严重缺陷' | '一般问题' | '轻微优化' | string;
  priority?: '紧急' | '高' | '中' | '低' | string;
  type?: '功能错误' | 'UI显示异常' | '性能问题' | '安全漏洞' | '兼容性缺陷' | '功能缺陷' | '性能缺陷' | 'UI交互' | '环境配置' | string;
  ownerName?: string;
  creatorName?: string;
  creator?: string;
  reporter?: string;
  assignee?: string;
  verifierName?: string;
  productLineId?: string;
  productLineName: string;
  versionName: string;
  linkedTaskId?: string;
  env?: string;
  createdAt: string;
  stepsToReproduce?: string;
  sourceWorkOrderIds?: string[];
  sourceWorkOrderTitles?: string[];
  requirementId?: string;
}
export type BugRecord = DefectBug;
export type BugItem = DefectBug;

export interface RequirementPoolItem {
  id: string;
  code?: string;
  title: string;
  description: string;
  expectedGoal?: string;
  productLineName?: string;
  customerName?: string;
  priority: 'P0-紧急阻断' | 'P1-高优' | 'P2-普通' | 'P3-低优' | '高' | '中' | '低';
  submitter?: string;
  source: '客户反馈' | '销售商机' | '内部规划' | '竞品对标' | '运维反馈' | '客户现场提报' | '销售商务反馈' | '产品内部规划' | '售后运维提报';
  status: '待评审' | '已转任务' | '已转版本' | '已拒绝' | '已搁置' | '已采纳';
  createdAt: string;
  attachments?: string[];
}
export type RequirementItem = RequirementPoolItem;

export interface DevTask {
  id: string;
  title: string;
  description?: string;
  developer: string;
  repo?: string;
  branch?: string;
  status: '待处理' | '设计中' | '待开发' | '开发中' | '待测试' | '测试中' | '待验收' | '已验收' | '已发布' | '已完成' | '已提测' | '已合并上线' | string;
  priority: '紧急' | '高' | '中' | '低' | 'P0-紧急' | 'P1-高优' | 'P2-标准';
  versionName: string;
  productLineName: string;
  estimatedHours: number;
  spentHours: number;
  dueDate: string;
  requirementId?: string;
}

// 审批中心
export interface ApprovalFlow {
  id: string;
  code: string;
  title: string;
  type: '合同用印审批' | '商机特批报价' | '招投标立项' | '需求重大变更' | '采购与报销' | '合作伙伴准入';
  applicantName: string;
  applicantDept: string;
  status: '待审批' | '已通过' | '已驳回' | '已撤销';
  relatedCustomer?: string;
  relatedProduct?: string;
  amount?: number;
  submittedAt: string;
  completedAt?: string;
  nodes: {
    title: string;
    approver: string;
    role: string;
    status: 'passed' | 'rejected' | 'current' | 'waiting';
    comment?: string;
    time?: string;
  }[];
  contentDetails: Record<string, any>;
}

// 项目与运营交付
export interface ProjectRecord {
  id: string;
  code: string;
  name: string;
  customerId?: string;
  customerName: string;
  type?: '定制研发' | '标准部署' | '系统集成' | '二期升级' | string;
  stage: '项目立项' | '需求调研' | '系统开发' | 'UAT验收' | '割接上线' | '终验维保' | '系统设计' | '定制开发' | '用户UAT' | '上线交付' | '质保运维';
  health?: '正常' | '预警' | '延期';
  progress: number;
  pmName: string;
  budget?: number;
  spentBudget?: number;
  contractAmount?: number;
  spentCost?: number;
  riskLevel?: string;
  planOnlineDate?: string;
  actualOnlineDate?: string;
  milestones?: { name: string; date: string; status: 'completed' | 'ongoing' | 'pending' }[];
  startDate: string;
  endDate?: string;
  membersCount?: number;
}
export type ProjectItem = ProjectRecord;

export interface Milestone {
  id: string;
  projectId: string;
  projectName: string;
  name: string;
  dueDate: string;
  status: '已完成' | '进行中' | '延期风险' | '未开始';
  paymentTrigger?: string;
  owner: string;
}

export interface Deliverable {
  id: string;
  projectId: string;
  projectName: string;
  name: string;
  version: string;
  status: '已签章' | '审核中' | '待提交';
  fileSize: string;
  submitter: string;
  uploadDate: string;
}

export interface ChangeRequest {
  id: string;
  projectId: string;
  projectName: string;
  title: string;
  type: '需求范围变更' | '工期进度变更' | '架构与技术栈变更' | '商务预算变更';
  applicant: string;
  status: '审核中' | '已批准' | '已驳回';
  impactAnalysis: string;
  applyDate: string;
}

export interface RiskItem {
  id: string;
  projectId: string;
  projectName: string;
  title: string;
  level: '高危风险' | '中危风险' | '低危风险';
  status: '跟进中' | '已化解';
  mitigationPlan: string;
  owner: string;
  createdAt: string;
}

// 财务
export interface PaymentSchedule {
  id: string;
  contractId?: string;
  customerId?: string;
  opportunityId?: string;
  projectId?: string;
  contractName: string;
  customerName: string;
  stageName: string;
  amount: number;
  receivedAmount?: number;
  invoicedAmount?: number;
  dueDate: string;
  status: '已收讫' | '待付款' | '已收款' | '待催收' | string;
  isInvoiced?: boolean;
  invoiceStatus?: '待开具' | '已开具' | '已作废' | '已红冲' | string;
  overdueDays?: number;
  actualDate?: string;
}

export type LeadStatus = '待确认' | '跟进中' | '转商机' | '已废弃';
export type LeadSource = '市场活动' | '官网引流' | '客户转介绍' | '二次复购';

export interface Lead {
  id: string;
  name: string;
  customerId: string;
  customerName: string;
  schoolContact: string;
  contactPhone?: string;
  department: string;
  ownerName: string;
  source: LeadSource;
  products: string[];
  status: LeadStatus;
  latestFollowUpAt?: string;
  convertedOpportunityId?: string;
  convertedAt?: string;
  createdAt: string;
  version?: number;
}

export interface CrmJourneyEvent {
  id: string;
  eventType: string;
  title: string;
  description?: string;
  status?: string;
  occurredAt: string;
  customerId?: string;
  leadId?: string;
  opportunityId?: string;
  requirementId?: string;
  workItemId?: string;
  taskType?: string;
}

export interface FinanceStats {
  totalContractAmount: number;
  receivedAmount: number;
  pendingReceivables: number;
  invoicedAmount: number;
}

export interface InvoiceRecord {
  id: string;
  invoiceNo: string;
  type: '销项发票' | '进项发票' | '销项' | '进项' | string;
  customerId?: string;
  opportunityId?: string;
  projectId?: string;
  paymentScheduleId?: string;
  customerOrSupplier?: string;
  customerName?: string;
  category?: string;
  amount: number;
  taxRate: string;
  issueDate?: string;
  applyDate?: string;
  taxAmount?: number;
  applicant?: string;
  relatedContractCode?: string;
  status: '已开具' | '已认证' | '待开具' | '待审批' | '开票中' | '已发送' | '已作废' | '已红冲' | '已校验归档' | '作废' | string;
  issueStatus?: '待申请' | '待审批' | '开票中' | '已开具' | '已发送' | '已作废' | '已红冲' | string;
  certificationStatus?: '待认证' | '已认证' | '已抵扣' | string;
  approvalRecordId?: string;
  voidReason?: string;
  contractRef?: string;
}

export interface InvoiceApprovalRecord {
  id: string;
  invoiceId?: string;
  customerId?: string;
  opportunityId?: string;
  projectId?: string;
  contractId?: string;
  paymentScheduleId?: string;
  customerName: string;
  contractName: string;
  stageName: string;
  requestedAmount: number;
  availableAmount: number;
  overAmount: number;
  reason: string;
  status: '待提交' | '待审批' | '审批通过' | '审批拒绝' | '已撤回' | '已过期';
  applicant: string;
  appliedAt: string;
  approver?: string;
  approvedAt?: string;
  comment?: string;
}

export interface ServerNode {
  id: string;
  name: string;
  ip: string;
  role: 'API网关' | '核心业务' | '数据计算' | 'Redis缓存' | 'Postgres主库';
  status: 'healthy' | 'warning' | 'error';
  cpuUsage: number;
  memoryUsage: number;
  diskUsage: number;
  uptime: string;
  port: number;
}

export interface AssetRecord { id: string; assetCode: string; name: string; category: string; brand: string; model: string; status: string; holder: string; department: string; location: string; buyDate: string; price: number; }
export interface AssetBorrowLog { id: string; assetCode: string; assetName: string; borrower: string; department: string; borrowDate: string; returnDate: string; status: string; remark?: string; }
export interface AssetMaintenanceRecord { id: string; assetCode: string; assetName: string; issueDescription: string; repairCompany: string; cost: number; startDate: string; expectedEndDate: string; status: string; }
export interface TaxProfile { id: string; companyName: string; taxId: string; bankName: string; bankAccount: string; addressPhone: string; }
export interface PaymentPlan { id: string; planCode: string; contractCode: string; customerName: string; stageName: string; planAmount: number; receivedAmount: number; uncollectedAmount: number; dueDate: string; status: string; manager: string; }
export interface ActualPaymentRecord { id: string; recordCode: string; planCode: string; customerName: string; amount: number; payDate: string; payMethod: string; bankSerialNo: string; operator: string; }

export interface VisitPlan {
  id: string; title: string; schoolName: string; customerId?: string; leadId?: string; opportunityId?: string;
  visitDate: string; timeSlot?: string; purpose: string; visitorName: string; visitorNames?: string[];
  status: '计划中' | '已打卡' | '已完成' | '已取消'; checkInTime?: string; checkInLocation?: string;
  checkInNotes?: string; checkInPhotos?: string[]; createdAt: string;
}

export interface TenderInfo {
  id: string; code: string; title: string; source: string; potentialCustomer: string; region: string; budget: number;
  deadline: string; deadlineReminder: '今日截止' | '三天内截止' | '本周截止' | '本月截止'; matchRate: number;
  matchLevel: '极高匹配' | '高匹配' | '中匹配' | '低匹配'; productLine: string; matchReasons: string[]; content: string;
  attachments?: { title: string; url: string; size?: string }[];
  trackingRecords?: { time: string; operator: string; action: string; note?: string }[];
  status: '未跟踪' | '已跟踪' | '已立项' | '忽略'; priority?: '高' | '中' | '低'; assignedTo?: string;
  relatedOpportunity?: string; remarks?: string; createdAt: string;
}

export interface TenderRule { id: string; name: string; keywords: string[]; industry: string; productLine: string; weight: number; status: '启用' | '禁用'; minBudget?: number; regions?: string[]; autoMarkRecommend: boolean; pushToWechat: boolean; updatedAt: string; }
export interface WinningEngagementCommRecord { id: string; time: string; operator: string; title: string; content: string; keyRequirements?: string; }
export interface WinningEngagementTimeline { id: string; time: string; title: string; desc: string; type: 'notice' | 'meeting' | 'scheme' | 'contract' | 'system'; }
export interface WinningEngagement {
  id: string; bidCode: string; projectName: string; customerName: string; ownerName: string; amount: number;
  status: '待接洽' | '需求沟通' | '方案确认' | '合同准备' | '已签约'; bidNoticeDoc?: string; expectedSignDate?: string;
  commRecords: WinningEngagementCommRecord[]; timeline: WinningEngagementTimeline[]; relatedFiles: { title: string; url: string; size?: string }[];
  isTransferredToDelivery?: boolean; isTransferredToReqPool?: boolean; createdAt: string;
}

export interface AttendanceRecord { id: string; employeeName: string; date: string; checkIn?: string; checkOut?: string; status: string; }
export interface LeaveApplication { id: string; code?: string; applicant: string; type: string; startDate?: string; endDate?: string; startTime?: string; endTime?: string; days: number; status?: string; approvalStatus?: string; reason?: string; }
export interface OvertimeRecord { id: string; code?: string; employeeName?: string; empName?: string; department?: string; date: string; timeSlot?: string; hours: number; type?: string; reason: string; status: string; }
export interface AttendanceException { id: string; employeeName: string; date: string; type: string; status: string; }
export interface ShiftSchedule { id: string; name: string; startTime: string; endTime: string; status: string; }
export interface ProcurementItem { id: string; code?: string; name?: string; category?: string; type?: string; supplier?: string; description?: string; quantity?: number; unitPrice?: number; amount: number; status: string; relatedCustomer?: string; relatedProject?: string; orderTime?: string; }
export interface ProcurementApply { id: string; code?: string; title?: string; type?: string; applicant: string; department?: string; amount?: number; totalAmount?: number; relatedCustomer?: string; relatedProject?: string; status: string; createdAt?: string; items?: ProcurementItem[]; }
export interface InboundRecord { id: string; inboundCode?: string; procurementId?: string; purchaseCode?: string; itemName?: string; quantity?: number; receivedAt?: string; inboundTime?: string; receiver?: string; registrar?: string; status?: string; transferredToAsset?: boolean; }
export interface AssetItem { id: string; name: string; category: string; assetNo: string; owner: string; status: string; value: number; }
export interface AssetBorrowRecord { id: string; assetId: string; borrower: string; borrowDate: string; returnDate?: string; status: string; }
export interface AssetRepairRecord { id: string; assetId: string; reporter: string; reportedAt: string; status: string; description: string; }
export interface SalesInvoiceItem { id: string; invoiceNo: string; customerName: string; amount: number; status: string; issueDate: string; }
export interface PurchaseInvoiceItem { id: string; invoiceNo: string; supplierName: string; amount: number; status: string; issueDate: string; }
export interface InvoiceApply { id: string; applicant: string; invoiceType: string; amount: number; status: string; createdAt: string; }
export interface InvoiceHeader { id: string; invoiceNo: string; type: string; amount: number; status: string; issueDate: string; }
export interface PaymentPlanItem { id: string; contractName: string; customerName: string; amount: number; dueDate: string; status: string; }
export interface PaymentRecordItem { id: string; planId: string; amount: number; receivedDate: string; status: string; }
