import React, { createContext, useContext, useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { resolveDataMode } from '../hooks/useDataMode';
import { crmRepository } from '../services/crmRepository';
import { requirementRepository } from '../services/requirementRepository';
import { productRepository } from '../services/productRepository';
import { devLogin, readSession, sessionUsername } from '../services/session';
import {
  MainMenuId,
  SubMenuId,
  PageTab,
  CurrentUser,
  Customer,
  Lead,
  Opportunity,
  FollowUpRecord,
  Partner,
  TenderBidding,
  BiddingReview,
  Contract,
  ProductLine,
  ProductLineMember,
  RequirementTask,
  RequirementEvent,
  VersionIteration,
  DefectBug,
  RequirementPoolItem,
  RequirementTaskDraft,
  ApprovalFlow,
  ProjectRecord,
  ProjectItem,
  WinningEngagement,
  ServerNode,
  OKRItem,
  PerformanceReview,
  KnowledgeDoc,
  Milestone,
  Deliverable,
  ChangeRequest,
  RiskItem,
  DevTask,
  PaymentSchedule,
  InvoiceRecord,
  InvoiceApprovalRecord,
  FinanceStats
} from '../types';
import {
  CURRENT_USERS,
  INITIAL_OKRS,
  INITIAL_PERFORMANCES,
  INITIAL_KNOWLEDGE_DOCS,
  INITIAL_CUSTOMERS,
  INITIAL_LEADS,
  INITIAL_OPPORTUNITIES,
  INITIAL_FOLLOWUPS,
  INITIAL_PARTNERS,
  INITIAL_BIDDINGS,
  INITIAL_BIDDING_REVIEWS,
  INITIAL_CONTRACTS,
  INITIAL_PRODUCT_LINES,
  INITIAL_REQUIREMENT_TASKS,
  INITIAL_VERSIONS,
  INITIAL_BUGS,
  INITIAL_REQUIREMENT_POOL,
  INITIAL_APPROVALS,
  INITIAL_PROJECTS,
  INITIAL_SERVERS,
  INITIAL_MILESTONES,
  INITIAL_DELIVERABLES,
  INITIAL_CHANGE_REQUESTS,
  INITIAL_RISKS,
  INITIAL_DEV_TASKS,
  INITIAL_PAYMENT_SCHEDULES,
  INITIAL_INVOICES
} from '../data/mockData';

export interface ToastItem {
  id: string;
  type: 'success' | 'info' | 'warning' | 'error';
  title: string;
  message?: string;
}

export interface NavigationMenuItem {
  id: SubMenuId;
  title: string;
  mainMenuId: MainMenuId;
  icon: string;
  badge?: number | string;
  badgeType?: 'default' | 'danger' | 'warning' | 'success';
}

export interface MainMenuGroup {
  id: MainMenuId;
  title: string;
  icon: string;
  subMenus: NavigationMenuItem[];
}

export const MENU_GROUPS: MainMenuGroup[] = [
  {
    id: 'workbench',
    title: '工作台',
    icon: 'LayoutDashboard',
    subMenus: [
      { id: 'wb_my_tasks', title: '我的任务', mainMenuId: 'workbench', icon: 'CheckSquare', badge: 4, badgeType: 'danger' },
      { id: 'wb_okr_perf', title: '目标与绩效', mainMenuId: 'workbench', icon: 'Target' },
      { id: 'wb_knowledge', title: '知识库', mainMenuId: 'workbench', icon: 'BookOpen' },
      { id: 'wb_work_order', title: '工单中心', mainMenuId: 'workbench', icon: 'Database' }
    ]
  },
  {
    id: 'crm',
    title: '客户与商机',
    icon: 'Briefcase',
    subMenus: [
      { id: 'crm_dashboard', title: '数据看板', mainMenuId: 'crm', icon: 'BarChart3' },
      { id: 'crm_customers', title: '客户档案', mainMenuId: 'crm', icon: 'Users' },
      { id: 'crm_leads', title: '线索管理', mainMenuId: 'crm', icon: 'Filter' },
      { id: 'crm_opportunities', title: '商机管理', mainMenuId: 'crm', icon: 'TrendingUp', badge: '¥1400w', badgeType: 'success' },
      { id: 'crm_visits', title: '拜访计划', mainMenuId: 'crm', icon: 'Calendar' },
      { id: 'crm_followups', title: '跟进记录', mainMenuId: 'crm', icon: 'Clock' },
      { id: 'crm_partners', title: '合作伙伴', mainMenuId: 'crm', icon: 'Handshake' },
      { id: 'crm_tender', title: '标讯', mainMenuId: 'crm', icon: 'Radio', badge: 'NEW', badgeType: 'danger' },
      { id: 'crm_bidding', title: '招投标管理', mainMenuId: 'crm', icon: 'FileSpreadsheet', badge: 2, badgeType: 'warning' },
      { id: 'crm_winning_engagement', title: '中标接洽', mainMenuId: 'crm', icon: 'Award', badge: 3, badgeType: 'success' },
      { id: 'crm_bidding_review', title: '招标复盘', mainMenuId: 'crm', icon: 'RefreshCw' },
      { id: 'crm_contracts', title: '合同管理', mainMenuId: 'crm', icon: 'FileText' },
      { id: 'crm_presales_tasks', title: '售前任务', mainMenuId: 'crm', icon: 'Ticket' }
    ]
  },
  {
    id: 'product',
    title: '产研管理',
    icon: 'Layers',
    subMenus: [
      { id: 'prod_lines', title: '产品线', mainMenuId: 'product', icon: 'Box' },
      { id: 'prod_versions', title: '版本迭代', mainMenuId: 'product', icon: 'GitBranch' },
      { id: 'prod_req_tasks', title: '需求任务', mainMenuId: 'product', icon: 'ListTodo', badge: '云效流', badgeType: 'default' },
      { id: 'prod_design_tasks', title: '设计任务', mainMenuId: 'product', icon: 'Edit' },
      { id: 'prod_rd_tasks', title: '研发任务', mainMenuId: 'product', icon: 'Code' },
      { id: 'prod_bugs', title: '缺陷管理', mainMenuId: 'product', icon: 'Bug', badge: 3, badgeType: 'danger' },
      { id: 'prod_reviews', title: '复盘管理', mainMenuId: 'product', icon: 'Archive' },
      { id: 'prod_planning', title: '产品规划', mainMenuId: 'product', icon: 'Compass' }
    ]
  },
  {
    id: 'approval',
    title: '综合中心',
    icon: 'Boxes',
    subMenus: [
      { id: 'comp_approval', title: '审批管理', mainMenuId: 'approval', icon: 'Stamp', badge: 1, badgeType: 'danger' },
      { id: 'comp_attendance', title: '考勤管理', mainMenuId: 'approval', icon: 'CalendarCheck' },
      { id: 'comp_procurement', title: '采购管理', mainMenuId: 'approval', icon: 'ShoppingBag' },
      { id: 'comp_asset', title: '资产管理', mainMenuId: 'approval', icon: 'Box' },
      { id: 'comp_invoice', title: '发票管理', mainMenuId: 'approval', icon: 'Receipt' },
      { id: 'comp_payment', title: '回款管理', mainMenuId: 'approval', icon: 'CreditCard' }
    ]
  },
  {
    id: 'project',
    title: '项目管理',
    icon: 'FolderKanban',
    subMenus: [
      { id: 'proj_list', title: '项目列表', mainMenuId: 'project', icon: 'FolderGit2' },
      { id: 'proj_config', title: '里程碑计划', mainMenuId: 'project', icon: 'Settings2' },
      { id: 'proj_delivery_tasks', title: '交付任务', mainMenuId: 'project', icon: 'ClipboardCheck' },
      { id: 'proj_ops_tasks', title: '运维任务', mainMenuId: 'project', icon: 'Server' }
    ]
  },
  {
    id: 'system',
    title: '系统与组织',
    icon: 'Settings',
    subMenus: [
      { id: 'team_org', title: '团队组织', mainMenuId: 'system', icon: 'Users' },
      { id: 'sys_settings', title: '系统设置', mainMenuId: 'system', icon: 'Sliders' }
    ]
  }
];

const ALIAS_MAP: Record<string, SubMenuId> = {
  'approval_center': 'comp_approval',
  'crm_bid_review': 'crm_bidding_review',
  'prod_reqs': 'prod_req_tasks',
  'prod_dev_tasks': 'prod_rd_tasks',
  'prod_pool': 'wb_work_order',
  'prod_review': 'prod_reviews',
  'ops_projects': 'proj_list',
  'ops_milestones': 'proj_config',
  'know_base': 'wb_knowledge'
};

export interface AppContextType {
  activeTabId: SubMenuId;
  openTabs: PageTab[];
  sidebarCollapsed: boolean;
  mobileSidebarOpen: boolean;
  currentUser: CurrentUser;
  theme: 'light' | 'dark';
  globalSearchOpen: boolean;
  toasts: ToastItem[];
  selectedCustomerIdForDetail: string | null;
  selectedOpportunityIdForDetail: string | null;
  selectedBiddingIdForDetail: string | null;
  selectedContractIdForDetail: string | null;
  selectedApprovalIdForDetail: string | null;
  selectedProjectIdForDetail: string | null;
  requirementTaskDraft: RequirementTaskDraft | null;

  // Actions
  setActiveTabId: (id: SubMenuId) => void;
  openPageTab: (id: string) => void;
  closePageTab: (id: SubMenuId) => void;
  toggleSidebar: () => void;
  toggleMobileSidebar: () => void;
  setCurrentUserRole: (role: CurrentUser['role']) => void;
  setGlobalSearchOpen: (open: boolean) => void;
  toggleTheme: () => void;
  addToast: (type: ToastItem['type'], title: string, message?: string) => void;
  removeToast: (id: string) => void;

  setSelectedCustomerIdForDetail: (id: string | null) => void;
  setSelectedOpportunityIdForDetail: (id: string | null) => void;
  setSelectedBiddingIdForDetail: (id: string | null) => void;
  setSelectedContractIdForDetail: (id: string | null) => void;
  setSelectedApprovalIdForDetail: (id: string | null) => void;
  setSelectedProjectIdForDetail: (id: string | null) => void;
  setRequirementTaskDraft: (draft: RequirementTaskDraft | null) => void;

  // Domain States & Updaters
  customers: Customer[];
  setCustomers: React.Dispatch<React.SetStateAction<Customer[]>>;
  leads: Lead[];
  setLeads: React.Dispatch<React.SetStateAction<Lead[]>>;
  opportunities: Opportunity[];
  setOpportunities: React.Dispatch<React.SetStateAction<Opportunity[]>>;
  followUps: FollowUpRecord[];
  followups: FollowUpRecord[];
  setFollowUps: React.Dispatch<React.SetStateAction<FollowUpRecord[]>>;
  partners: Partner[];
  setPartners: React.Dispatch<React.SetStateAction<Partner[]>>;
  biddings: TenderBidding[];
  biddingProjects: TenderBidding[];
  setBiddings: React.Dispatch<React.SetStateAction<TenderBidding[]>>;
  biddingReviews: BiddingReview[];
  winningEngagements: WinningEngagement[];
  bidReviews: BiddingReview[];
  setBiddingReviews: React.Dispatch<React.SetStateAction<BiddingReview[]>>;
  contracts: Contract[];
  setContracts: React.Dispatch<React.SetStateAction<Contract[]>>;
  productLines: ProductLine[];
  setProductLines: React.Dispatch<React.SetStateAction<ProductLine[]>>;
  requirementTasks: RequirementTask[];
  setRequirementTasks: React.Dispatch<React.SetStateAction<RequirementTask[]>>;
  designTasks: RequirementTask[];
  setDesignTasks: React.Dispatch<React.SetStateAction<RequirementTask[]>>;
  versions: VersionIteration[];
  setVersions: React.Dispatch<React.SetStateAction<VersionIteration[]>>;
  bugs: DefectBug[];
  setBugs: React.Dispatch<React.SetStateAction<DefectBug[]>>;
  requirementPool: RequirementPoolItem[];
  setRequirementPool: React.Dispatch<React.SetStateAction<RequirementPoolItem[]>>;
  approvals: ApprovalFlow[];
  setApprovals: React.Dispatch<React.SetStateAction<ApprovalFlow[]>>;
  projects: ProjectItem[];
  setProjects: React.Dispatch<React.SetStateAction<ProjectItem[]>>;
  servers: ServerNode[];
  setServers: React.Dispatch<React.SetStateAction<ServerNode[]>>;
  okrs: OKRItem[];
  setOkrs: React.Dispatch<React.SetStateAction<OKRItem[]>>;
  performances: PerformanceReview[];
  setPerformances: React.Dispatch<React.SetStateAction<PerformanceReview[]>>;
  knowledgeDocs: KnowledgeDoc[];
  setKnowledgeDocs: React.Dispatch<React.SetStateAction<KnowledgeDoc[]>>;
  toggleFavoriteDoc: (id: string) => void;
  deleteKnowledgeDoc: (id: string) => void;

  // Extended Collections for Project & Dev & Finance
  milestones: Milestone[];
  setMilestones: React.Dispatch<React.SetStateAction<Milestone[]>>;
  deliverables: Deliverable[];
  setDeliverables: React.Dispatch<React.SetStateAction<Deliverable[]>>;
  changeRequests: ChangeRequest[];
  setChangeRequests: React.Dispatch<React.SetStateAction<ChangeRequest[]>>;
  risks: RiskItem[];
  setRisks: React.Dispatch<React.SetStateAction<RiskItem[]>>;
  devTasks: DevTask[];
  setDevTasks: React.Dispatch<React.SetStateAction<DevTask[]>>;
  paymentSchedules: PaymentSchedule[];
  setPaymentSchedules: React.Dispatch<React.SetStateAction<PaymentSchedule[]>>;
  invoices: InvoiceRecord[];
  setInvoices: React.Dispatch<React.SetStateAction<InvoiceRecord[]>>;
  invoiceApprovals: InvoiceApprovalRecord[];
  setInvoiceApprovals: React.Dispatch<React.SetStateAction<InvoiceApprovalRecord[]>>;
  financeStats: FinanceStats;
  crmLoading: boolean;
  crmError: string | null;
  retryCrm: () => Promise<unknown>;

  // Handlers
  addCustomer: (cust: Partial<Customer>) => void;
  updateCustomer: (id: string, updates: Partial<Customer>) => void;
  addLead: (lead: Partial<Lead>) => void;
  updateLead: (id: string, updates: Partial<Lead>) => void;
  convertLeadToOpportunity: (id: string, updates?: Partial<Opportunity>) => void;
  addOpportunity: (opp: Partial<Opportunity>) => void;
  updateOpportunity: (id: string, updates: Partial<Opportunity>) => void;
  advanceOpportunityStage: (id: string) => void;
  addFollowUp: (rec: Partial<FollowUpRecord>) => void;
  addFollowup: (rec: Partial<FollowUpRecord>) => void;
  addPartner: (partner: Partial<Partner>) => void;
  updatePartner: (id: string, updates: Partial<Partner>) => void;
  addContract: (contract: Partial<Contract>) => void;
  updateContract: (id: string, updates: Partial<Contract>) => void;
  addBidding: (bid: Partial<TenderBidding>) => void;
  addBiddingProject: (bid: Partial<TenderBidding>) => void;
  updateBiddingProject: (id: string, updates: Partial<TenderBidding>) => void;
  updateBiddingLifecycle: (opportunityId: string, updates: Record<string, unknown>) => Promise<void>;
  addBiddingReview: (rev: Partial<BiddingReview>) => void;
  addBidReview: (rev: Partial<BiddingReview>) => void;
  addProductLine: (line: Partial<ProductLine>) => void;
  updateProductLine: (id: string, updates: Partial<ProductLine>) => Promise<void>;
  addProductLineMembers: (id: string, members: ProductLineMember[]) => Promise<void>;
  addVersion: (v: Partial<VersionIteration>) => Promise<boolean>;
  updateVersion: (id: string, updates: Partial<VersionIteration>) => Promise<boolean>;
  deleteVersion: (id: string) => void;
  addRequirementTask: (task: Partial<RequirementTask>) => Promise<boolean>;
  updateRequirementTask: (id: string, updates: Partial<RequirementTask>) => void;
  addDesignTask: (task: Partial<RequirementTask>) => Promise<boolean>;
  updateDesignTask: (id: string, updates: Partial<RequirementTask>) => void;
  addRequirementTaskComment: (id: string, content: string) => void;
  addRequirementToPool: (item: Partial<RequirementPoolItem>) => void;
  addRequirementPoolItem: (item: Partial<RequirementPoolItem>) => void;
  updateRequirementPoolItem: (id: string, updates: Partial<RequirementPoolItem>) => void;
  convertPoolItemToTask: (poolId: string) => void;
  addBug: (bug: Partial<DefectBug>) => void;
  updateBug: (id: string, updates: Partial<DefectBug>) => void;
  approveFlow: (flowId: string, comment?: string) => void;
  rejectFlow: (flowId: string, comment?: string) => void;
  addOKR: (okr: Partial<OKRItem>) => void;
  addPerformanceReview: (perf: Partial<PerformanceReview>) => void;
  addKnowledgeDoc: (doc: Partial<KnowledgeDoc>) => void;

  // Project handlers
  addProject: (proj: Partial<ProjectItem>) => void;
  updateProject: (id: string, updates: Partial<ProjectItem>) => void;
  advanceProjectStage: (id: string) => void;
  addMilestone: (ms: Partial<Milestone>) => void;
  updateMilestone: (id: string, updates: Partial<Milestone>) => void;
  addDeliverable: (del: Partial<Deliverable>) => void;
  updateDeliverable: (id: string, updates: Partial<Deliverable>) => void;
  addChangeRequest: (cr: Partial<ChangeRequest>) => void;
  updateChangeRequest: (id: string, updates: Partial<ChangeRequest>) => void;
  addRisk: (r: Partial<RiskItem>) => void;
  updateRisk: (id: string, updates: Partial<RiskItem>) => void;
  addDevTask: (dt: Partial<DevTask>) => void;
  updateDevTask: (id: string, updates: Partial<DevTask>) => void;
  addPaymentSchedule: (ps: Partial<PaymentSchedule>) => void;
  updatePaymentSchedule: (id: string, updates: Partial<PaymentSchedule>) => void;
  addInvoice: (inv: Partial<InvoiceRecord>) => void;
  updateInvoice: (id: string, updates: Partial<InvoiceRecord>) => void;
  addInvoiceApproval: (record: Partial<InvoiceApprovalRecord>) => InvoiceApprovalRecord;
  updateInvoiceApproval: (id: string, updates: Partial<InvoiceApprovalRecord>) => void;
}

export type AppNavigationContextType = Pick<AppContextType, 'activeTabId' | 'openTabs' | 'sidebarCollapsed' | 'toggleSidebar' | 'openPageTab' | 'closePageTab'>;
export type AppAuthContextType = Pick<AppContextType, 'currentUser' | 'setCurrentUserRole'>;
export type AppCrmContextType = Pick<AppContextType, 'customers' | 'leads' | 'opportunities' | 'contracts' | 'followUps' | 'productLines' | 'partners' | 'biddings' | 'biddingReviews' | 'winningEngagements' | 'requirementTasks' | 'addLead' | 'updateLead' | 'convertLeadToOpportunity' | 'addFollowUp' | 'addOpportunity' | 'updateOpportunity' | 'advanceOpportunityStage' | 'addPartner' | 'updatePartner' | 'updateContract' | 'addContract' | 'addBiddingProject' | 'updateBiddingProject' | 'updateBiddingLifecycle' | 'addBidReview' | 'openPageTab' | 'addToast' | 'crmLoading' | 'selectedCustomerIdForDetail' | 'setSelectedCustomerIdForDetail'>;

const AppContext = createContext<AppContextType | null>(null);
export const AppNavigationContext = createContext<AppNavigationContextType | null>(null);
export const AppAuthContext = createContext<AppAuthContextType | null>(null);
export const AppCrmContext = createContext<AppCrmContextType | null>(null);

const normalizeRequirementStatus = (status: RequirementTask['status']): RequirementTask['status'] => {
  if (['设计中', '研发中', '测试中'].includes(status)) return '处理中';
  if (status === '已发布') return '已完成';
  if (status === '已关闭') return '已驳回';
  return status;
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const rawRouteTab = location.pathname.startsWith('/app/') ? location.pathname.slice('/app/'.length) as SubMenuId : 'wb_my_tasks';
  const routeTab = (ALIAS_MAP[rawRouteTab] || rawRouteTab) as SubMenuId;
  const [activeTabId, setActiveTabId] = useState<SubMenuId>(routeTab);
  const [openTabs, setOpenTabs] = useState<PageTab[]>([
    { id: 'wb_my_tasks', title: '我的任务', mainMenuId: 'workbench', iconName: 'CheckSquare', closable: false }
  ]);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => typeof window !== 'undefined' && window.innerWidth < 1200);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  useEffect(() => {
    const syncSidebarForViewport = () => {
      if (window.innerWidth < 1200) {
        setSidebarCollapsed(true);
        if (window.innerWidth < 900) setMobileSidebarOpen(false);
      }
    };
    window.addEventListener('resize', syncSidebarForViewport);
    return () => window.removeEventListener('resize', syncSidebarForViewport);
  }, []);
  const initialSession = readSession();
  const [currentUser, setCurrentUser] = useState<CurrentUser>(initialSession?.user || CURRENT_USERS[0]);
  const [crmSessionToken, setCrmSessionToken] = useState(initialSession?.token || '');
  const [crmSessionReady, setCrmSessionReady] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const storedTheme = window.localStorage.getItem('sc-admin-theme');
    return storedTheme === 'light' || storedTheme === 'dark' ? storedTheme : 'light';
  });
  const [globalSearchOpen, setGlobalSearchOpen] = useState(false);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  // Apply dark mode class to root
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    document.documentElement.style.colorScheme = theme;
    window.localStorage.setItem('sc-admin-theme', theme);
  }, [theme]);

  // Selected for drawers
  const [selectedCustomerIdForDetail, setSelectedCustomerIdForDetail] = useState<string | null>(null);
  const [selectedOpportunityIdForDetail, setSelectedOpportunityIdForDetail] = useState<string | null>(null);
  const [selectedBiddingIdForDetail, setSelectedBiddingIdForDetail] = useState<string | null>(null);
  const [selectedContractIdForDetail, setSelectedContractIdForDetail] = useState<string | null>(null);
  const [selectedApprovalIdForDetail, setSelectedApprovalIdForDetail] = useState<string | null>(null);
  const [selectedProjectIdForDetail, setSelectedProjectIdForDetail] = useState<string | null>(null);

  // Core Data Collections
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [leads, setLeads] = useState<Lead[]>(INITIAL_LEADS);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [followUps, setFollowUps] = useState<FollowUpRecord[]>([]);
  const [partners, setPartners] = useState<Partner[]>(INITIAL_PARTNERS);
  const [biddings, setBiddings] = useState<TenderBidding[]>(INITIAL_BIDDINGS);
  const [winningEngagements, setWinningEngagements] = useState<WinningEngagement[]>([]);
  const [biddingReviews, setBiddingReviews] = useState<BiddingReview[]>(INITIAL_BIDDING_REVIEWS);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [productLines, setProductLines] = useState<ProductLine[]>(INITIAL_PRODUCT_LINES);
  const [requirementTasks, setRequirementTasks] = useState<RequirementTask[]>(() => {
    try {
      const saved = localStorage.getItem('shichuang_requirement_tasks');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return INITIAL_REQUIREMENT_TASKS.map((task) => ({ ...task, status: normalizeRequirementStatus(task.status), versionId: '', versionName: '' }));
  });
  const [designTasks, setDesignTasks] = useState<RequirementTask[]>([]);

  useEffect(() => {
    try {
      localStorage.setItem('shichuang_requirement_tasks', JSON.stringify(requirementTasks));
    } catch {}
  }, [requirementTasks]);
  const [versions, setVersions] = useState<VersionIteration[]>(INITIAL_VERSIONS);
  const [bugs, setBugs] = useState<DefectBug[]>(INITIAL_BUGS);
  const [requirementPool, setRequirementPool] = useState<RequirementPoolItem[]>(INITIAL_REQUIREMENT_POOL);
  const [requirementTaskDraft, setRequirementTaskDraft] = useState<RequirementTaskDraft | null>(null);
  const [approvals, setApprovals] = useState<ApprovalFlow[]>(INITIAL_APPROVALS);
  const [projects, setProjects] = useState<ProjectItem[]>(INITIAL_PROJECTS);
  const [servers, setServers] = useState<ServerNode[]>(INITIAL_SERVERS);
  const [okrs, setOkrs] = useState<OKRItem[]>(INITIAL_OKRS);
  const [performances, setPerformances] = useState<PerformanceReview[]>(INITIAL_PERFORMANCES);
  const [knowledgeDocs, setKnowledgeDocs] = useState<KnowledgeDoc[]>(INITIAL_KNOWLEDGE_DOCS);

  // Operations & Delivery Extensions
  const [milestones, setMilestones] = useState<Milestone[]>(INITIAL_MILESTONES);
  const [deliverables, setDeliverables] = useState<Deliverable[]>(INITIAL_DELIVERABLES);
  const [changeRequests, setChangeRequests] = useState<ChangeRequest[]>(INITIAL_CHANGE_REQUESTS);
  const [risks, setRisks] = useState<RiskItem[]>(INITIAL_RISKS);
  const [devTasks, setDevTasks] = useState<DevTask[]>(INITIAL_DEV_TASKS);
  const [paymentSchedules, setPaymentSchedules] = useState<PaymentSchedule[]>(INITIAL_PAYMENT_SCHEDULES);
  const [invoices, setInvoices] = useState<InvoiceRecord[]>(INITIAL_INVOICES);
  const [invoiceApprovals, setInvoiceApprovals] = useState<InvoiceApprovalRecord[]>([]);

  useEffect(() => {
    let cancelled = false;
    let retryTimer: number | undefined;
    const synchronize = async () => {
      const session = readSession();
      if (!session?.token) {
        if (!cancelled) { setCrmSessionToken(''); setCrmSessionReady(false); }
        return;
      }
      if (!session.token.startsWith('local-dev-')) {
        if (!cancelled) { setCrmSessionToken(session.token); setCurrentUser(session.user); setCrmSessionReady(true); }
        return;
      }
      try {
        const refreshed = await devLogin(sessionUsername(session));
        if (cancelled) return;
        setCurrentUser(refreshed.user);
        setCrmSessionToken(refreshed.token);
        setCrmSessionReady(true);
        if (!refreshed.token.startsWith('local-dev-') && retryTimer) window.clearInterval(retryTimer);
      } catch {
        if (!cancelled) { setCrmSessionToken(session.token); setCrmSessionReady(true); }
      }
    };
    void synchronize();
    retryTimer = window.setInterval(() => {
      if (readSession()?.token.startsWith('local-dev-')) void synchronize();
      else if (retryTimer) window.clearInterval(retryTimer);
    }, 15000);
    return () => { cancelled = true; if (retryTimer) window.clearInterval(retryTimer); };
  }, []);

  // 所有领域共用同一数据模式，避免本地回退会话误请求后端。
  const dataMode = resolveDataMode(crmSessionToken, crmSessionReady);
  const crmEnabled = dataMode === 'remote';
  const requirementBackendEnabled = dataMode === 'remote';
  const leadQuery = useQuery({ queryKey:['crm','leads',crmSessionToken], queryFn:()=>crmRepository.leads({page:1,pageSize:100}), enabled:crmEnabled });
  const customerQuery = useQuery({ queryKey:['crm','customers',crmSessionToken], queryFn:()=>crmRepository.customers({page:1,pageSize:100}), enabled:crmEnabled });
  const opportunityQuery = useQuery({ queryKey:['crm','opportunities',crmSessionToken], queryFn:()=>crmRepository.opportunities({page:1,pageSize:100}), enabled:crmEnabled });
  const biddingQuery = useQuery({ queryKey:['crm','biddings',crmSessionToken], queryFn:()=>crmRepository.biddings({page:1,pageSize:100}), enabled:crmEnabled });
  const engagementQuery = useQuery({ queryKey:['crm','winning-engagements',crmSessionToken], queryFn:()=>crmRepository.engagements({page:1,pageSize:100}), enabled:crmEnabled });
  const followUpQuery = useQuery({ queryKey:['crm','follow-ups',crmSessionToken], queryFn:()=>crmRepository.followUps({page:1,pageSize:100}), enabled:crmEnabled });
  const contractQuery = useQuery({ queryKey:['crm','contracts',crmSessionToken], queryFn:()=>crmRepository.contracts({page:1,pageSize:100}), enabled:crmEnabled });
  const requirementQuery = useQuery({ queryKey:['requirements',crmSessionToken], queryFn:()=>requirementRepository.list({page:1,pageSize:100}), enabled:requirementBackendEnabled });
  const designQuery = useQuery({ queryKey:['design-tasks',crmSessionToken], queryFn:()=>productRepository.designTasks(), enabled:requirementBackendEnabled });
  const productLineQuery = useQuery({ queryKey:['product-lines',crmSessionToken], queryFn:()=>productRepository.productLines(), enabled:requirementBackendEnabled });
  const bugQuery = useQuery({ queryKey:['product-bugs',crmSessionToken], queryFn:()=>productRepository.tasks('bug'), enabled:requirementBackendEnabled });
  const devTaskQuery = useQuery({ queryKey:['product-dev-tasks',crmSessionToken], queryFn:()=>productRepository.tasks('dev'), enabled:requirementBackendEnabled });

  // Keep the local verification dataset visible when the optional CRM API is unavailable or empty.
  // This preserves the page workflow while the retry banner still exposes the service problem.
  useEffect(()=>{ setCustomers(customerQuery.data?.items?.length ? customerQuery.data.items : INITIAL_CUSTOMERS) },[customerQuery.data]);
  useEffect(()=>{ setLeads(leadQuery.data?.items?.length ? leadQuery.data.items : INITIAL_LEADS) },[leadQuery.data]);
  useEffect(()=>{ setOpportunities(opportunityQuery.data?.items?.length ? opportunityQuery.data.items : INITIAL_OPPORTUNITIES) },[opportunityQuery.data]);
  useEffect(()=>{ if (biddingQuery.data?.items?.length) setBiddings(biddingQuery.data.items as TenderBidding[]); },[biddingQuery.data]);
  useEffect(()=>{ if (engagementQuery.data?.items?.length) setWinningEngagements(engagementQuery.data.items.map((item: any) => ({ ...item, bidCode: item.biddingId || '', projectName: item.name, amount: 0, commRecords: [], timeline: [], relatedFiles: [], createdAt: item.createdAt || '' }))); },[engagementQuery.data]);
  useEffect(()=>{ setFollowUps(followUpQuery.data?.items?.length ? followUpQuery.data.items : INITIAL_FOLLOWUPS) },[followUpQuery.data]);
  useEffect(()=>{ setContracts(contractQuery.data?.items?.length ? contractQuery.data.items : INITIAL_CONTRACTS) },[contractQuery.data]);
  useEffect(()=>{
    if (Array.isArray(requirementQuery.data?.items)) {
      const remoteTasks = requirementQuery.data.items.map((task) => ({
        ...task,
        status: normalizeRequirementStatus(task.status),
        versionId: '',
        versionName: ''
      }));
      setRequirementTasks((prev) => {
        const remoteIds = new Set(remoteTasks.map((t) => t.id));
        const remoteTitles = new Set(remoteTasks.map((t) => t.title));
        const localOnly = prev.filter((t) => !remoteIds.has(t.id) && !remoteTitles.has(t.title));
        return [...localOnly, ...remoteTasks];
      });
    }
  },[requirementQuery.data]);
  useEffect(()=>{ if (Array.isArray(designQuery.data)) setDesignTasks(designQuery.data.map((task) => ({ ...task, status: normalizeRequirementStatus(task.status), versionId: '', versionName: '' }))); },[designQuery.data]);
  useEffect(() => {
    if (!Array.isArray(productLineQuery.data)) return;
    setProductLines(productLineQuery.data);
    const remoteVersions = productLineQuery.data.flatMap((line) => (line.versions || []).map((version) => ({ ...version, productLineId: line.id, productLineName: line.name })));
    setVersions(remoteVersions);
  }, [productLineQuery.data]);
  useEffect(()=>{ if (bugQuery.data?.length) setBugs(bugQuery.data as DefectBug[]); },[bugQuery.data]);
  useEffect(()=>{ if (devTaskQuery.data?.length) setDevTasks(devTaskQuery.data as DevTask[]); },[devTaskQuery.data]);
  useEffect(() => {
    setActiveTabId(routeTab);
    setOpenTabs((previousTabs) => {
      const menuItems = MENU_GROUPS.flatMap((group) => group.subMenus);
      const normalizedTabs = previousTabs.map((tab) => {
        const normalizedId = (ALIAS_MAP[tab.id] || tab.id) as SubMenuId;
        const menu = menuItems.find((item) => item.id === normalizedId);
        return menu
          ? { ...tab, id: normalizedId, title: menu.title, mainMenuId: menu.mainMenuId, iconName: menu.icon }
          : { ...tab, id: normalizedId };
      });
      const dedupedTabs = normalizedTabs.filter((tab, index, tabs) => tabs.findIndex((candidate) => candidate.id === tab.id) === index);
      if (dedupedTabs.some((tab) => tab.id === routeTab)) return dedupedTabs;
      const menu = menuItems.find((item) => item.id === routeTab);
      return menu
        ? [...dedupedTabs, { id: routeTab, title: menu.title, mainMenuId: menu.mainMenuId, iconName: menu.icon, closable: routeTab !== 'wb_my_tasks' }]
        : dedupedTabs;
    });
  }, [routeTab]);

  const refreshCrm = () => Promise.all([customerQuery.refetch(),leadQuery.refetch(),opportunityQuery.refetch(),biddingQuery.refetch(),engagementQuery.refetch(),followUpQuery.refetch(),contractQuery.refetch(),requirementQuery.refetch(),productLineQuery.refetch(),bugQuery.refetch(),devTaskQuery.refetch()]);
  const crmLoading = customerQuery.isFetching || leadQuery.isFetching || opportunityQuery.isFetching || biddingQuery.isFetching || followUpQuery.isFetching || contractQuery.isFetching;
  const crmError = [customerQuery.error, leadQuery.error, opportunityQuery.error, followUpQuery.error, contractQuery.error].find(Boolean);

  // Global hotkey: Cmd/Ctrl + K for Global Search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setGlobalSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const addToast = (type: ToastItem['type'], title: string, message?: string) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    setToasts((prev) => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      removeToast(id);
    }, 4000);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const openPageTab = (menuId: string) => {
    // Resolve alias
    const resolvedId = (ALIAS_MAP[menuId] || menuId) as SubMenuId;

    // Find menu item info across groups
    let foundMenu: NavigationMenuItem | undefined;
    for (const group of MENU_GROUPS) {
      const match = group.subMenus.find((m) => m.id === resolvedId);
      if (match) {
        foundMenu = match;
        break;
      }
    }

    if (!foundMenu) {
      // Fallback if not found in menu groups
      foundMenu = {
        id: resolvedId,
        title: menuId,
        mainMenuId: 'workbench',
        icon: 'FileText'
      };
    }

    setOpenTabs((previousTabs) => {
      if (previousTabs.some((tab) => tab.id === resolvedId || ALIAS_MAP[tab.id] === resolvedId)) return previousTabs;
      return [
        ...previousTabs,
        {
          id: foundMenu!.id,
          title: foundMenu!.title,
          mainMenuId: foundMenu!.mainMenuId,
          iconName: foundMenu!.icon,
          closable: foundMenu!.id !== 'wb_my_tasks'
        }
      ];
    });
    setActiveTabId(resolvedId);
    navigate(`/app/${resolvedId}`);
  };

  const closePageTab = (id: SubMenuId) => {
    if (id === 'wb_my_tasks') return; // Cannot close default workbench
    const newTabs = openTabs.filter((t) => t.id !== id);
    setOpenTabs(newTabs);
    if (activeTabId === id) {
      const lastTab = newTabs[newTabs.length - 1];
      setActiveTabId(lastTab ? lastTab.id : 'wb_my_tasks');
      navigate(`/app/${lastTab ? lastTab.id : 'wb_my_tasks'}`);
    }
  };

  const toggleSidebar = () => {
    setSidebarCollapsed((prev) => !prev);
  };
  const toggleMobileSidebar = () => setMobileSidebarOpen((prev) => !prev);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  const setCurrentUserRole = (role: CurrentUser['role']) => {
    const target = CURRENT_USERS.find((u) => u.role === role) || CURRENT_USERS[0];
    setCurrentUser(target);
    addToast('info', `已切换身份视角：${target.name}`, `角色权限：${target.roleTitle}`);
  };

  // Helper Actions
  const addCustomer = (cust: Partial<Customer>) => {
    crmRepository.createCustomer(cust).then(result=>refreshCrm().then(()=>addToast('success','客户建档成功',`客户编号：${result.code}`))).catch(error=>addToast('error','客户建档失败',error.message));
  };

  const addOpportunity = (opp: Partial<Opportunity>) => {
    if (crmEnabled) {
      crmRepository.createOpportunity({...opp,ownerName:opp.ownerName||currentUser.name}).then(()=>refreshCrm().then(()=>addToast('success','商机录入成功'))).catch(error=>addToast('error','商机录入失败',error.message));
      return;
    }
    const newOpportunity: Opportunity = {
      id: opp.id || `opp-${Date.now()}`,
      name: opp.name || '新建商机',
      type: opp.type || '定制研发',
      customerId: opp.customerId || customers[0]?.id || '',
      customerName: opp.customerName || customers[0]?.name || '未关联客户',
      leadId: opp.leadId,
      stage: opp.stage || '需求确认',
      status: opp.status || '跟进中',
      amount: opp.amount || 0,
      relatedProduct: opp.relatedProduct || '待确认产品',
      isTrial: opp.isTrial || false,
      deadline: opp.deadline || new Date().toISOString().slice(0, 10),
      ownerName: opp.ownerName || currentUser.name,
      collaborators: opp.collaborators || [],
      source: opp.source || '主动开发',
      probability: opp.probability || 30,
      remarks: opp.remarks || '新增商机',
      createdAt: opp.createdAt || new Date().toISOString().slice(0, 10)
    };
    setOpportunities((prev) => [newOpportunity, ...prev]);
    addToast('success', '商机录入成功');
  };

  const addFollowUp = (rec: Partial<FollowUpRecord>) => {
    const record: FollowUpRecord = { id: `follow-${Date.now()}`, customerId: rec.customerId || '', customerName: rec.customerName || '', content: rec.content || '', ...rec, ownerName: rec.ownerName || currentUser.name };
    if (!crmEnabled) {
      setFollowUps((prev) => [record, ...prev]);
      addToast('success', '跟进记录已登记');
      return;
    }
    crmRepository.createFollowUp({...rec,ownerName:currentUser.name}).then(()=>refreshCrm().then(()=>addToast('success','跟进记录已登记'))).catch(error=>addToast('error','跟进记录保存失败',error.message));
  };

  const addContract = (contract: Partial<Contract>) => {
    crmRepository.createContract({...contract,ownerName:contract.ownerName||currentUser.name}).then(result=>refreshCrm().then(()=>addToast('success','合同建立成功',`编号：${result.code}`))).catch(error=>addToast('error','合同建立失败',error.message));
  };

  const addBidding = (bid: Partial<TenderBidding>) => {
    if (crmEnabled && bid.opportunityId) {
      crmRepository.updateBidding(bid.opportunityId, bid as Record<string, unknown>).then(() => refreshCrm()).then(() => addToast('success', '��Ͷ���ݼ�ͬ����')).catch(error => addToast('error', '��Ͷ���ݼ�ͬ��ʧ��', error.message));
      return;
    }
    const newBid: TenderBidding = {
      id: `bid-${Date.now()}`,
      code: `ZB-2026-NEW${String(biddings.length + 1).padStart(3, '0')}`,
      name: bid.name || '新建招投标项目',
      projectName: bid.projectName || '智慧协同工程项目',
      customerId: bid.customerId || (customers[0]?.id ?? 'c-1'),
      customerName: bid.customerName || (customers[0]?.name ?? '国家电网华东分部'),
      type: bid.type || '公开招标',
      budgetAmount: bid.budgetAmount || 3000000,
      publishDate: bid.publishDate || '2026-08-31',
      bidDeadline: bid.bidDeadline || '2026-09-25 10:00',
      ownerName: bid.ownerName || currentUser.name,
      opportunityId: bid.opportunityId,
      status: '制作标书中',
      remarks: bid.remarks || '通过招投标系统登记',
      reviewed: false
    };
    setBiddings((prev) => [newBid, ...prev]);
    addToast('success', '招投标项目已立项', `招标编号：${newBid.code}`);
  };

  const addBiddingReview = (rev: Partial<BiddingReview>) => {
    const newReview: BiddingReview = {
      id: `brev-${Date.now()}`,
      biddingId: rev.biddingId || 'bid-1',
      biddingName: rev.biddingName || '招投标项目复盘',
      projectName: rev.projectName || '关联项目名称',
      customerName: rev.customerName || '客户名称',
      result: rev.result || '中标',
      ownerName: currentUser.name,
      reviewTime: '2026-08-31',
      scoreAnalysis: rev.scoreAnalysis || {
        businessScore: 90,
        techScore: 92,
        priceScore: 88,
        competitorName: '行业主要竞品',
        competitorPrice: 2800000
      },
      gapAnalysis: rev.gapAnalysis || '在技术架构与团队交付保障上具备压倒性优势。',
      keyWinLossFactors: rev.keyWinLossFactors || ['售前方案高度契合', '现场答辩得分第一'],
      improvementSuggestions: rev.improvementSuggestions || '继续保持方案标准化输出能力。'
    };
    setBiddingReviews((prev) => [newReview, ...prev]);
    if (rev.biddingId) {
      setBiddings((prev) =>
        prev.map((b) => (b.id === rev.biddingId ? { ...b, reviewed: true } : b))
      );
    }
    addToast('success', '招投标复盘已提交', '已沉淀至招投标复盘知识库');
  };

  const addRequirementTask = async (task: Partial<RequirementTask>) => {
    const createdAt = new Date().toISOString().replace('T', ' ').slice(0, 16);
    const newTask: RequirementTask = {
      id: `req-${Date.now()}`,
      title: task.title || '新需求任务',
      description: task.description || '任务详细描述',
      expectedGoal: task.expectedGoal || '交付目标与指标验收标准',
      status: task.status || '待处理',
      priority: task.priority || '中',
      ownerName: task.ownerName || currentUser.name,
      creatorName: currentUser.name,
      department: task.department || currentUser.department,
      versionId: task.versionId || '',
      versionName: task.versionName || '',
      productLineId: task.productLineId || 'pl-1',
      productLineName: task.productLineName || '师创智联协同OS',
      customerId: task.customerId,
      customerName: task.customerName,
      descriptionHtml: task.descriptionHtml,
      media: task.media || [],
      taskType: task.taskType,
      workOrderType: task.workOrderType,
      specialFields: task.specialFields,
      sourceWorkOrderIds: task.sourceWorkOrderIds || [],
      sourceWorkOrderTitles: task.sourceWorkOrderTitles || [],
      requirementType: task.requirementType,
      ccNames: task.ccNames || [],
      plannedStartDate: task.plannedStartDate,
      expectedCompleteDate: task.expectedCompleteDate,
      assignedOwnerName: task.assignedOwnerName,
      assignedNote: task.assignedNote,
      estimatedHours: task.estimatedHours || 20,
      actualHours: 0,
      dueDate: task.dueDate || '2026-09-20',
      createdAt,
      events: [{
        id: `event-${Date.now()}`,
        eventType: '提需求',
        operatorName: currentUser.name,
        createdAt,
        metadata: {
          assigneeName: task.ownerName || currentUser.name
        }
      }],
      category: 'my_responsible',
      todoList: task.todoList || [
        { id: `td-1`, text: '完成技术可行性评估与设计', done: false },
        { id: `td-2`, text: '代码开发与本地单测覆盖', done: false },
        { id: `td-3`, text: '提交测试环境集成回归', done: false }
      ]
    };
    setRequirementTasks((prev) => [newTask, ...prev]);
    if (requirementBackendEnabled) {
      try {
        await requirementRepository.create(newTask);
        await requirementQuery.refetch();
        addToast('success', '工单创建成功', `已进入${newTask.department}工单中心`);
        return true;
      } catch (error) {
        addToast('success', '工单创建成功', `已存入工单中心（离线会话模式）`);
        return true;
      }
    }
    addToast('success', '工单创建成功', `已进入${newTask.department}工单中心`);
    return true;
  };

  const addDesignTask = async (task: Partial<RequirementTask>) => {
    const newTask: RequirementTask = { ...task, id: `design-${Date.now()}`, title: task.title || '新建设计任务', description: task.description || '', status: task.status || '待处理', priority: task.priority || '中', ownerName: task.ownerName || currentUser.name, creatorName: currentUser.name, productLineName: task.productLineName || '师创智联协同OS', versionName: task.versionName || '', estimatedHours: task.estimatedHours || 0, dueDate: task.dueDate || '' };
    if (requirementBackendEnabled) {
      try { await productRepository.createDesignTask({ ...newTask, requirementId: task.requirementId || '' }); await designQuery.refetch(); }
      catch (error) { addToast('error', '设计任务保存失败', error instanceof Error ? error.message : '请稍后重试'); return false; }
    } else setDesignTasks((prev) => [newTask, ...prev]);
    return true;
  };

  const addRequirementToPool = (item: Partial<RequirementPoolItem>) => {
    const newItem: RequirementPoolItem = {
      id: `pool-${Date.now()}`,
      code: `POOL-2026-${String(requirementPool.length + 1).padStart(3, '0')}`,
      title: item.title || '原始业务需求提案',
      description: item.description || '需求背景与场景说明',
      expectedGoal: item.expectedGoal || '期望达成的业务价值',
      productLineName: item.productLineName || '师创智联协同OS',
      customerName: item.customerName,
      priority: item.priority || '中',
      submitter: currentUser.name,
      source: item.source || '内部规划',
      status: '待评审',
      createdAt: '2026-08-31'
    };
    setRequirementPool((prev) => [newItem, ...prev]);
    addToast('success', '工单已提交至工单中心', `编号：${newItem.code}，等待产品委员会评审`);
  };

  const convertPoolItemToTask = (poolId: string) => {
    const target = requirementPool.find((p) => p.id === poolId);
    if (!target) return;
    setRequirementPool((prev) =>
      prev.map((p) => (p.id === poolId ? { ...p, status: '已转任务' } : p))
    );
    addRequirementTask({
      title: target.title,
      description: target.description,
      expectedGoal: target.expectedGoal,
      productLineName: target.productLineName,
      customerName: target.customerName,
      priority: target.priority
    });
    addToast('info', '工单中心流转成功', `需求【${target.title}】已转为正式敏捷研发任务`);
  };

  const addBug = (bug: Partial<DefectBug>) => {
    const newBug: DefectBug = {
      id: `bug-${Date.now()}`,
      code: `BUG-2026-${String(bugs.length + 1).padStart(3, '0')}`,
      title: bug.title || '新建缺陷问题',
      description: bug.description || '复现步骤与错误堆栈',
      status: '待修复',
      severity: bug.severity || '严重',
      priority: bug.priority || '中',
      type: bug.type || '功能错误',
      ownerName: bug.ownerName || '王浩然',
      creatorName: currentUser.name,
      verifierName: '测试组-刘洋',
      productLineId: bug.productLineId || 'pl-1',
      productLineName: bug.productLineName || '师创智联协同OS',
      versionName: bug.versionName || 'V3.5.2',
      createdAt: '2026-08-31 10:30'
      ,sourceWorkOrderIds: bug.sourceWorkOrderIds || []
      ,sourceWorkOrderTitles: bug.sourceWorkOrderTitles || []
    };
    if (requirementBackendEnabled) {
      void productRepository.createTask('bug', newBug).then(() => bugQuery.refetch()).then(() => addToast('success', '缺陷已提报', newBug.title)).catch((error) => addToast('error', '缺陷保存失败', error instanceof Error ? error.message : '请稍后重试'));
      return;
    }
    setBugs((prev) => [newBug, ...prev]);
    addToast('error', '缺陷已提报', `缺陷单：${newBug.code} [${newBug.severity}]`);
  };

  const approveFlow = (flowId: string, comment?: string) => {
    setApprovals((prev) =>
      prev.map((flow) => {
        if (flow.id !== flowId) return flow;
        const newNodes = flow.nodes.map((node) => {
          if (node.status === 'current') {
            return {
              ...node,
              status: 'passed' as const,
              comment: comment || '同意审批，手续合规。',
              time: '刚刚'
            };
          }
          return node;
        });
        const nextWaitingIndex = newNodes.findIndex((n) => n.status === 'waiting');
        if (nextWaitingIndex !== -1) {
          newNodes[nextWaitingIndex].status = 'current';
        }
        const isAllDone = newNodes.every((n) => n.status === 'passed');
        return {
          ...flow,
          status: isAllDone ? ('已通过' as const) : ('待审批' as const),
          nodes: newNodes,
          completedAt: isAllDone ? '刚刚' : undefined
        };
      })
    );
    addToast('success', '审批通过成功', '流程节点已推进');
  };

  const rejectFlow = (flowId: string, comment?: string) => {
    setApprovals((prev) =>
      prev.map((flow) => {
        if (flow.id !== flowId) return flow;
        const newNodes = flow.nodes.map((node) => {
          if (node.status === 'current') {
            return {
              ...node,
              status: 'rejected' as const,
              comment: comment || '驳回：相关资料需重新修正完善。',
              time: '刚刚'
            };
          }
          return node;
        });
        return {
          ...flow,
          status: '已驳回' as const,
          nodes: newNodes,
          completedAt: '刚刚'
        };
      })
    );
    addToast('warning', '审批已驳回', '流程已退回至申请人修正');
  };

  const addOKR = (okr: Partial<OKRItem>) => {
    const newOKR: OKRItem = {
      id: `okr-${Date.now()}`,
      cycle: okr.cycle || '2026-09',
      ownerId: currentUser.id,
      ownerName: currentUser.name,
      department: currentUser.department,
      category: 'my',
      objective: okr.objective || '新建月度目标',
      weight: okr.weight || 30,
      progress: 0,
      deadline: okr.deadline || '2026-09-30',
      alignTo: okr.alignTo || '公司年度核心战略',
      keyResults: okr.keyResults || [
        { id: `kr-${Date.now()}-1`, content: '关键成果 KR 1', progress: 0, weight: 50, deadline: '2026-09-30' },
        { id: `kr-${Date.now()}-2`, content: '关键成果 KR 2', progress: 0, weight: 50, deadline: '2026-09-30' }
      ]
    };
    setOkrs((prev) => [newOKR, ...prev]);
    addToast('success', 'OKR目标设定成功', `目标：${newOKR.objective}`);
  };

  const addPerformanceReview = (perf: Partial<PerformanceReview>) => {
    const newPerf: PerformanceReview = {
      id: `perf-${Date.now()}`,
      type: perf.type || 'week',
      cycleName: perf.cycleName || '2026年第36周复盘总结',
      author: currentUser.name,
      authorDept: currentUser.department,
      summary: perf.summary || '工作总结内容',
      uncompletedReason: perf.uncompletedReason || '无',
      selfScore: perf.selfScore || 90,
      suggestions: perf.suggestions || '无特别意见',
      helpNeeded: perf.helpNeeded || '暂无需协助事项',
      sendTo: perf.sendTo || ['总经办', '直接主管'],
      createdAt: '刚刚',
      status: 'submitted'
    };
    setPerformances((prev) => [newPerf, ...prev]);
    addToast('success', '工作复盘总结已提交', `已发送至：${newPerf.sendTo.join(', ')}`);
  };

  const addKnowledgeDoc = (doc: Partial<KnowledgeDoc>) => {
    const newDoc: KnowledgeDoc = {
      id: `doc-${Date.now()}`,
      title: doc.title || '新建知识文档',
      category: doc.category || '应知应会',
      subCategory: doc.subCategory || '通用规范',
      tags: doc.tags && doc.tags.length > 0 ? doc.tags : ['标准规范'],
      author: doc.author || currentUser.name,
      creator: currentUser.name,
      version: doc.version || 'V1.0.0',
      updatedAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
      timeAgo: '刚刚',
      views: 1,
      downloadsCount: 0,
      isFavorited: false,
      summary: doc.summary || '文档简述',
      content: doc.content || `## ${doc.title || '新建知识文档'}\n\n该文档由 ${currentUser.name} 沉淀至公司知识库。`,
      fileType: doc.fileType || 'doc',
      dingtalkUrl: doc.dingtalkUrl || 'https://dingtalk.com/doc/new-doc',
      wecomUrl: doc.wecomUrl || 'https://work.weixin.qq.com/doc/new-doc',
      fileSize: doc.fileSize || '3.5 MB',
      isMine: true,
      isFollowed: true
    };
    setKnowledgeDocs((prev) => [newDoc, ...prev]);
    addToast('success', '知识文档已上传发布', newDoc.title);
  };

  const toggleFavoriteDoc = (id: string) => {
    setKnowledgeDocs((prev) =>
      prev.map((d) => {
        if (d.id === id) {
          const nextFav = !d.isFavorited;
          if (nextFav) {
            addToast('success', '已加入我的收藏', d.title);
          } else {
            addToast('info', '已取消收藏', d.title);
          }
          return {
            ...d,
            isFavorited: nextFav,
            favoritedAt: nextFav ? new Date().toISOString().split('T')[0] : undefined
          };
        }
        return d;
      })
    );
  };

  const deleteKnowledgeDoc = (id: string) => {
    const target = knowledgeDocs.find((d) => d.id === id);
    setKnowledgeDocs((prev) => prev.filter((d) => d.id !== id));
    addToast('info', '知识文档已归档删除', target?.title);
  };

  // Project & Milestone & Ops Handlers
  const addProject = (proj: Partial<ProjectItem>) => {
    const newProj: ProjectItem = {
      id: `proj-${Date.now()}`,
      code: `PRJ-2026-${String(projects.length + 1).padStart(3, '0')}`,
      name: proj.name || '新建业务工程项目',
      customerName: proj.customerName || (customers[0]?.name ?? '国家电网华东分部'),
      pmName: proj.pmName || currentUser.name,
      stage: proj.stage || '定制开发',
      progress: proj.progress || 10,
      contractAmount: proj.contractAmount || 2000000,
      spentCost: 0,
      riskLevel: proj.riskLevel || '低风险',
      startDate: proj.startDate || '2026-09-01',
      planOnlineDate: proj.planOnlineDate || '2026-12-31',
      milestones: [
        { name: '需求签署', date: '2026-09-15', status: 'completed' },
        { name: '系统开发', date: '2026-10-31', status: 'ongoing' },
        { name: '终验交付', date: '2026-12-31', status: 'pending' }
      ]
    };
    setProjects((prev) => [newProj, ...prev]);
    addToast('success', '项目立项成功', `项目编号：${newProj.code}`);
  };

  const updateProject = (id: string, updates: Partial<ProjectItem>) => {
    setProjects((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...updates } : p))
    );
    addToast('info', '项目状态已更新');
  };

  const advanceProjectStage = (id: string) => {
    const stages: ProjectItem['stage'][] = [
      '项目立项',
      '需求调研',
      '系统设计',
      '定制开发',
      '用户UAT',
      '上线交付',
      '质保运维'
    ];
    setProjects((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p;
        const currentIdx = stages.indexOf(p.stage);
        const nextStage = stages[Math.min(stages.length - 1, currentIdx + 1)];
        return {
          ...p,
          stage: nextStage,
          progress: Math.min(100, p.progress + 15)
        };
      })
    );
    addToast('success', '项目阶段已成功推进');
  };

  const addMilestone = (ms: Partial<Milestone>) => {
    const newMs: Milestone = {
      id: `ms-${Date.now()}`,
      projectId: ms.projectId || (projects[0]?.id ?? 'proj-1'),
      projectName: ms.projectName || (projects[0]?.name ?? '国家电网华东分部项目'),
      name: ms.name || '新建里程碑',
      dueDate: ms.dueDate || '2026-10-01',
      status: ms.status || '未开始',
      paymentTrigger: ms.paymentTrigger || '触发 20% 节点款',
      owner: ms.owner || currentUser.name
    };
    setMilestones((prev) => [newMs, ...prev]);
    addToast('success', '里程碑已创建', newMs.name);
  };

  const updateMilestone = (id: string, updates: Partial<Milestone>) => {
    setMilestones((prev) =>
      prev.map((m) => (m.id === id ? { ...m, ...updates } : m))
    );
    addToast('info', '里程碑状态已更新');
  };

  const addDeliverable = (del: Partial<Deliverable>) => {
    const newDel: Deliverable = {
      id: `del-${Date.now()}`,
      projectId: del.projectId || (projects[0]?.id ?? 'proj-1'),
      projectName: del.projectName || (projects[0]?.name ?? '国家电网华东分部项目'),
      name: del.name || '新建交付物文件',
      version: del.version || 'V1.0',
      status: del.status || '待提交',
      fileSize: del.fileSize || '10.5 MB',
      submitter: currentUser.name,
      uploadDate: '2026-08-31'
    };
    setDeliverables((prev) => [newDel, ...prev]);
    addToast('success', '交付物已归档', newDel.name);
  };

  const updateDeliverable = (id: string, updates: Partial<Deliverable>) => {
    setDeliverables((prev) =>
      prev.map((d) => (d.id === id ? { ...d, ...updates } : d))
    );
    addToast('info', '交付物状态已更新');
  };

  const addChangeRequest = (cr: Partial<ChangeRequest>) => {
    const newCr: ChangeRequest = {
      id: `cr-${Date.now()}`,
      projectId: cr.projectId || (projects[0]?.id ?? 'proj-1'),
      projectName: cr.projectName || (projects[0]?.name ?? '国家电网华东分部项目'),
      title: cr.title || '新建变更申请',
      type: cr.type || '需求范围变更',
      applicant: currentUser.name,
      status: '审核中',
      impactAnalysis: cr.impactAnalysis || '工期后延5个工作日',
      applyDate: '2026-08-31'
    };
    setChangeRequests((prev) => [newCr, ...prev]);
    addToast('success', '变更申请已提交', newCr.title);
  };

  const updateChangeRequest = (id: string, updates: Partial<ChangeRequest>) => {
    setChangeRequests((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...updates } : c))
    );
    addToast('info', '变更申请状态已更新');
  };

  const addRisk = (r: Partial<RiskItem>) => {
    const newR: RiskItem = {
      id: `rk-${Date.now()}`,
      projectId: r.projectId || (projects[0]?.id ?? 'proj-1'),
      projectName: r.projectName || (projects[0]?.name ?? '国家电网华东分部项目'),
      title: r.title || '新建风险预警项',
      level: r.level || '中危风险',
      status: '跟进中',
      mitigationPlan: r.mitigationPlan || '安排专职技术人员现场驻场支持',
      owner: r.owner || currentUser.name,
      createdAt: '2026-08-31'
    };
    setRisks((prev) => [newR, ...prev]);
    addToast('warning', '风险预警已登记', newR.title);
  };

  const updateRisk = (id: string, updates: Partial<RiskItem>) => {
    setRisks((prev) =>
      prev.map((r) => (r.id === id ? { ...r, ...updates } : r))
    );
    addToast('info', '风险状态已更新');
  };

  const addDevTask = (dt: Partial<DevTask>) => {
    const newDt: DevTask = {
      id: `dt-${Date.now()}`,
      title: dt.title || '新建研发任务',
      description: dt.description || '',
      developer: dt.developer || currentUser.name,
      repo: dt.repo || 'shichuang-hub-backend',
      branch: dt.branch || 'feat/new-task',
      status: dt.status || '开发中',
      priority: dt.priority || '中',
      versionName: dt.versionName || '师创智联OS V3.5.2',
      productLineName: dt.productLineName || '师创智联协同OS',
      estimatedHours: dt.estimatedHours || 16,
      spentHours: 0,
      dueDate: dt.dueDate || '2026-09-10'
    };
    if (requirementBackendEnabled) {
      void productRepository.createTask('dev', newDt).then(() => devTaskQuery.refetch()).then(() => addToast('success', '研发任务创建成功', newDt.title)).catch((error) => addToast('error', '研发任务保存失败', error instanceof Error ? error.message : '请稍后重试'));
      return;
    }
    setDevTasks((prev) => [newDt, ...prev]);
    addToast('success', '研发任务创建成功', newDt.title);
  };

  const updateDevTask = (id: string, updates: Partial<DevTask>) => {
    if (requirementBackendEnabled) {
      void productRepository.updateTask('dev', id, updates as Record<string, unknown>).then(() => devTaskQuery.refetch()).then(() => addToast('info', '研发任务已更新')).catch((error) => addToast('error', '研发任务更新失败', error instanceof Error ? error.message : '请稍后重试'));
      return;
    }
    setDevTasks((prev) =>
      prev.map((d) => (d.id === id ? { ...d, ...updates } : d))
    );
    addToast('info', '研发任务已更新');
  };

  const addPaymentSchedule = (ps: Partial<PaymentSchedule>) => {
    const newPs: PaymentSchedule = {
      id: `ps-${Date.now()}`,
      contractId: ps.contractId || (contracts[0]?.id ?? 'ct-1'),
      contractName: ps.contractName || (contracts[0]?.name ?? '国家电网合同'),
      customerName: ps.customerName || (customers[0]?.name ?? '国家电网华东分部'),
      stageName: ps.stageName || '新建回款期次',
      amount: ps.amount || 500000,
      dueDate: ps.dueDate || '2026-10-31',
      status: ps.status || '待付款',
      isInvoiced: ps.isInvoiced ?? false
    };
    setPaymentSchedules((prev) => [newPs, ...prev]);
    addToast('success', '回款计划已生成', `金额：¥${(newPs.amount / 10000).toFixed(0)}万`);
  };

  const updatePaymentSchedule = (id: string, updates: Partial<PaymentSchedule>) => {
    setPaymentSchedules((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...updates } : p))
    );
  };

  const addInvoice = (inv: Partial<InvoiceRecord>) => {
    const newInv: InvoiceRecord = {
      id: `inv-${Date.now()}`,
      invoiceNo: inv.invoiceNo || `FP-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      type: inv.type || '销项发票',
      customerOrSupplier: inv.customerOrSupplier || '国家电网华东分部',
      amount: inv.amount || 1000000,
      taxRate: inv.taxRate || '6% 增值税专用发票',
      issueDate: '2026-08-31',
      status: inv.status || '已开具',
      issueStatus: inv.issueStatus || (inv.status === '待审批' ? '待审批' : '已开具'),
      customerId: inv.customerId,
      opportunityId: inv.opportunityId,
      projectId: inv.projectId,
      paymentScheduleId: inv.paymentScheduleId,
      approvalRecordId: inv.approvalRecordId,
      certificationStatus: inv.certificationStatus || '待认证',
      contractRef: inv.contractRef || 'SC-CT-2026-001'
    };
    setInvoices((prev) => [newInv, ...prev]);
    addToast('success', '发票已开具并归档', `发票号码：${newInv.invoiceNo}`);
  };

  const updateCustomer = (id: string, updates: Partial<Customer>) => {
    crmRepository.updateCustomer(id,updates).then(()=>refreshCrm()).then(()=>addToast('info','客户档案已更新')).catch(error=>addToast('error','客户更新失败',error.message));
  };

  const updateOpportunity = (id: string, updates: Partial<Opportunity>) => {
    crmRepository.updateOpportunity(id,updates).then(()=>refreshCrm().then(()=>addToast('info','商机信息已更新'))).catch(error=>addToast('error','商机更新失败',error.message));
  };

  const advanceOpportunityStage = (id: string) => {
    const stages: Opportunity['stage'][] = ['需求确认', '方案设计', '招投标', '商务谈判', '签约赢单'];
    const current=opportunities.find(item=>item.id===id); if(!current)return; const currentIdx=stages.indexOf(current.stage); const nextStage=stages[Math.min(stages.length-1,currentIdx+1)];
    crmRepository.transitionOpportunity(id,nextStage,current.version).then(()=>refreshCrm().then(()=>addToast('success','商机阶段已成功推进'))).catch(error=>addToast('error','阶段推进失败',error.message));
  };

  const addPartner = (partner: Partial<Partner>) => {
    const newPartner: Partner = {
      id: `p-${Date.now()}`,
      name: partner.name || '新建生态合作伙伴',
      type: partner.type || '方案系统集成商 (SI)',
      level: partner.level || '战略核心伙伴',
      contactName: partner.contactName || '渠道对接人',
      contactPhone: partner.contactPhone || '13800000000',
      contactEmail: partner.contactEmail || 'partner@corp.com',
      commissionRate: partner.commissionRate || 15,
      rebateRate: partner.rebateRate || '15% - 20%',
      region: partner.region || '华东大区',
      coopArea: partner.coopArea || partner.region || '全国区域',
      internalOwner: partner.internalOwner || currentUser.name,
      status: partner.status || '合作中',
      oppsContributed: partner.oppsContributed || 1,
      projectCount: partner.projectCount || 1,
      dealsWon: partner.dealsWon || 0,
      totalAmount: partner.totalAmount || 0,
      coopDate: partner.coopDate || '2026-08-31',
      documents: partner.documents || []
    };
    setPartners((prev) => [newPartner, ...prev]);
    addToast('success', '生态伙伴认证签约成功', newPartner.name);
  };
  const updatePartner = (id: string, updates: Partial<Partner>) => setPartners((items) => items.map((item) => item.id === id ? { ...item, ...updates } : item));

  const updateContract = (id: string, updates: Partial<Contract>) => {
    crmRepository.updateContract(id,updates).then(()=>refreshCrm()).then(()=>addToast('info','合同状态已更新')).catch(error=>addToast('error','合同更新失败',error.message));
  };

  const updateBiddingProject = (id: string, updates: Partial<TenderBidding>) => {
    if (crmEnabled) {
      const current = biddings.find((item) => item.id === id);
      if (current?.opportunityId) {
        crmRepository.updateBidding(current.opportunityId, updates as Record<string, unknown>).then(() => refreshCrm()).then(() => addToast('info', '��Ͷ���Ŀ�Ѹ���')).catch(error => addToast('error', '��Ͷ���Ŀ����ʧ��', error.message));
        return;
      }
    }
    setBiddings((prev) =>
      prev.map((b) => (b.id === id ? { ...b, ...updates } : b))
    );
    addToast('info', '招投标项目已更新');
  };

  const updateBiddingLifecycle = async (opportunityId: string, updates: Record<string, unknown>) => {
    if (!crmEnabled) return;
    await crmRepository.updateBidding(opportunityId, updates);
    await refreshCrm();
  };

  const addProductLine = (line: Partial<ProductLine>) => {
    const newLine: ProductLine = {
      id: `pl-${Date.now()}`,
      name: line.name || '新建产品线',
      code: line.code || 'PL-NEW',
      description: line.description || '该产品线还没有任何简介内容。',
      ownerName: line.owner || line.ownerName || currentUser.name,
      owner: line.owner || line.ownerName || currentUser.name,
      website: line.website,
      subProducts: line.subProducts || [],
      productOwner: line.productOwner || '',
      technicalOwner: line.technicalOwner || '',
      requirementOwner: line.requirementOwner || '',
      techOwner: line.techOwner || '',
      testOwner: line.testOwner || '',
      visibility: '公开',
      coverColor: 'from-blue-600 to-indigo-700',
      coverUrl: line.coverUrl,
      members: line.members || [],
      products: line.products || [],
      currentVersion: 'V1.0.0',
      totalRequirements: line.totalRequirements ?? 0,
      inProgressReqs: line.inProgressReqs ?? 0,
      activeTasksCount: line.activeTasksCount ?? 0,
      iterationProgress: line.iterationProgress ?? 0,
      versionCount: line.versionCount ?? 1,
      customerCount: line.customerCount ?? 0,
      health: (line.health as any) || '健康',
      createdAt: '2026-08-31'
    };
    if (requirementBackendEnabled) {
      void productRepository.createProductLine(newLine).then(() => productLineQuery.refetch()).then(() => addToast('success', '产品线创建成功', newLine.name)).catch((error) => addToast('error', '产品线保存失败', error instanceof Error ? error.message : '请稍后重试'));
      return;
    }
    setProductLines((prev) => [newLine, ...prev]);
    addToast('success', '产品线创建成功', newLine.name);
  };

  const updateProductLine = async (id: string, updates: Partial<ProductLine>) => {
    if (requirementBackendEnabled) {
      await productRepository.updateProductLine(id, updates);
      await productLineQuery.refetch();
      addToast('success', '产品线配置已保存');
      return;
    }
    setProductLines((prev) => prev.map((line) => line.id === id ? { ...line, ...updates } : line));
    addToast('success', '产品线配置已保存');
  };

  const addProductLineMembers = async (id: string, members: ProductLineMember[]) => {
    if (requirementBackendEnabled) {
      await Promise.all(members.map(({ name, role }) => productRepository.addProductLineMember(id, { name, role })));
      await productLineQuery.refetch();
      return;
    }
    setProductLines((prev) => prev.map((line) => line.id === id
      ? {
          ...line,
          members: [...(line.members || []), ...members],
          activities: [
            ...(line.activities || []),
            ...members.map((member) => ({
              id: `activity-${Date.now()}-${member.id}`,
              action: '添加成员角色',
              detail: `${member.name} · ${member.role}`,
              operatorName: currentUser.name,
              createdAt: new Date().toISOString()
            }))
          ]
        }
      : line));
  };

  const addVersion = async (v: Partial<VersionIteration>): Promise<boolean> => {
    const newVer: VersionIteration = {
      id: `ver-${Date.now()}`,
      code: v.code || `V${versions.length + 1}.0.0`,
      name: v.name || '新建迭代版本',
      productLineId: v.productLineId || (productLines[0]?.id ?? 'pl-1'),
      productLineName: v.productLineName || (productLines[0]?.name ?? '师创智联协同OS'),
      ownerName: v.ownerName || productLines.find((line) => line.id === v.productLineId)?.ownerName || productLines.find((line) => line.id === v.productLineId)?.owner || '',
      startDate: v.startDate || '',
      endDate: v.endDate || '',
      releaseDate: v.releaseDate || '',
      status: v.status || '规划中',
      requirementsCount: v.reqCount || v.requirementsCount || 0,
      reqCount: v.reqCount || v.requirementsCount || 0,
      bugCount: v.bugCount || 0,
      completedReqCount: 0,
      changelog: v.changelog || '',
      content: v.content || v.changelog || '',
      linkedRequirementIds: v.linkedRequirementIds || [],
      isReviewed: false
    };
    if (requirementBackendEnabled && newVer.productLineId) {
      try {
        await productRepository.createVersion(newVer.productLineId, newVer);
        await productLineQuery.refetch();
        addToast('success', '版本规划创建成功', `${newVer.name} (${newVer.code})`);
        return true;
      } catch (error) {
        addToast('error', '版本保存失败', error instanceof Error ? error.message : '请稍后重试');
        return false;
      }
    }
    setVersions((prev) => [newVer, ...prev]);
    addToast('success', '版本规划创建成功', `${newVer.name} (${newVer.code})`);
    return true;
  };

  const updateVersion = async (id: string, updates: Partial<VersionIteration>): Promise<boolean> => {
    if (requirementBackendEnabled) {
      const current = versions.find((version) => version.id === id);
      if (current?.productLineId) {
        try {
          await productRepository.updateVersion(current.productLineId, id, updates);
          await productLineQuery.refetch();
          addToast('info', '版本迭代状态已更新');
          return true;
        } catch (error) {
          addToast('error', '版本更新失败', error instanceof Error ? error.message : '请稍后重试');
          return false;
        }
      }
    }
    setVersions((prev) =>
      prev.map((v) => (v.id === id ? { ...v, ...updates } : v))
    );
    addToast('info', '版本迭代状态已更新');
    return true;
  };

  const deleteVersion = (id: string) => {
    const current = versions.find((version) => version.id === id);
    if (requirementBackendEnabled && current?.productLineId) {
      void productRepository.deleteVersion(current.productLineId, id).then(() => productLineQuery.refetch()).then(() => addToast('success', '迭代已删除', current.name)).catch((error) => addToast('error', '迭代删除失败', error instanceof Error ? error.message : '请稍后重试'));
      return;
    }
    setVersions((prev) => prev.filter((version) => version.id !== id));
    addToast('success', '迭代已删除', current?.name);
  };

  const updateBug = (id: string, updates: Partial<DefectBug>) => {
    if (requirementBackendEnabled) {
      void productRepository.updateTask('bug', id, updates as Record<string, unknown>).then(() => bugQuery.refetch()).then(() => addToast('info', '缺陷状态已更新')).catch((error) => addToast('error', '缺陷更新失败', error instanceof Error ? error.message : '请稍后重试'));
      return;
    }
    setBugs((prev) =>
      prev.map((b) => (b.id === id ? { ...b, ...updates } : b))
    );
    addToast('info', '缺陷状态已更新');
  };

  const updateRequirementTask = (id: string, updates: Partial<RequirementTask>) => {
    const current = requirementTasks.find((task) => task.id === id);
    const now = new Date().toISOString().replace('T', ' ').slice(0, 16);
    const events: RequirementEvent[] = [];
    if (current) {
      if (updates.status && updates.status !== current.status) {
        events.push({ id: `event-${Date.now()}-status`, eventType: '变更状态', fromStatus: current.status, toStatus: updates.status, operatorName: currentUser.name, createdAt: now });
      }
      if (updates.ownerName !== undefined && updates.ownerName !== current.ownerName) {
        events.push({ id: `event-${Date.now()}-owner`, eventType: '变更负责人', operatorName: currentUser.name, metadata: { from: current.ownerName || '未分配', to: updates.ownerName || '未分配' }, createdAt: now });
      }
      if (updates.ccNames && JSON.stringify(updates.ccNames) !== JSON.stringify(current.ccNames || [])) {
        events.push({ id: `event-${Date.now()}-cc`, eventType: '修改参与人', operatorName: currentUser.name, metadata: { from: current.ccNames || [], to: updates.ccNames }, createdAt: now });
      }
      if (updates.sourceWorkOrderIds && JSON.stringify(updates.sourceWorkOrderIds) !== JSON.stringify(current.sourceWorkOrderIds || [])) {
        events.push({ id: `event-${Date.now()}-work-orders`, eventType: '修改关联工单', operatorName: currentUser.name, metadata: { from: current.sourceWorkOrderTitles || [], to: updates.sourceWorkOrderTitles || [] }, createdAt: now });
      }
      const textChanges: Array<[keyof RequirementTask, string]> = [
        ['title', '修改需求名称'],
        ['description', '修改任务描述'],
        ['expectedGoal', '修改验收标准'],
        ['requirementType', '修改需求类型'],
        ['priority', '修改优先级'],
        ['productLineName', '修改所属产品线'],
        ['versionName', '修改迭代版本'],
        ['customerName', '修改关联客户'],
        ['plannedStartDate', '修改计划开始时间'],
        ['dueDate', '修改计划完成时间'],
        ['expectedCompleteDate', '修改期望完成时间'],
        ['estimatedHours', '修改预计工时']
      ];
      textChanges.forEach(([field, eventType]) => {
        if (updates[field] !== undefined && updates[field] !== current[field]) {
          events.push({ id: `event-${Date.now()}-${String(field)}`, eventType, operatorName: currentUser.name, metadata: { from: current[field] ?? '', to: updates[field] ?? '' }, createdAt: now });
        }
      });
    }
    const nextUpdates = events.length ? { ...updates, events: [...(current?.events || []), ...events] } : updates;
    setRequirementTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...nextUpdates } : t))
    );
    if (dataMode === 'remote' && current) requirementRepository.update(id, { ...updates, version: (current as RequirementTask & { version?: number }).version }).catch((error) => addToast('error', '需求同步失败', error instanceof Error ? error.message : '请稍后重试'));
  };
  const updateDesignTask = (id: string, updates: Partial<RequirementTask>) => {
    setDesignTasks((prev) => prev.map((task) => task.id === id ? { ...task, ...updates } : task));
    if (requirementBackendEnabled) void productRepository.updateDesignTask(id, updates as Record<string, unknown>).then(() => designQuery.refetch()).catch((error) => addToast('error', '设计任务同步失败', error instanceof Error ? error.message : '请稍后重试'));
  };

  const addRequirementTaskComment = (id: string, content: string) => {
    const trimmed = content.trim();
    if (!trimmed) return;
    const now = new Date().toISOString().replace('T', ' ').slice(0, 16);
    const event: RequirementEvent = {
      id: `event-${Date.now()}-comment`,
      eventType: '评论',
      operatorName: currentUser.name,
      metadata: { content: trimmed },
      createdAt: now
    };
    setRequirementTasks((prev) => prev.map((task) => task.id === id ? { ...task, events: [...(task.events || []), event] } : task));
    if (dataMode === 'remote') requirementRepository.comment(id, trimmed).catch((error) => addToast('error', '评论同步失败', error instanceof Error ? error.message : '请稍后重试'));
    addToast('success', '评论已发布');
  };

  const updateRequirementPoolItem = (id: string, updates: Partial<RequirementPoolItem>) => {
    setRequirementPool((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...updates } : p))
    );
    addToast('info', '工单中心条目已更新');
  };

  const updateInvoice = (id: string, updates: Partial<InvoiceRecord>) => {
    setInvoices((prev) =>
      prev.map((i) => (i.id === id ? { ...i, ...updates } : i))
    );
  };

  const addLead = (lead: Partial<Lead>) => {
    const customer = customers.find((item) => item.id === lead.customerId);
    if (!customer) {
      addToast('warning', '请先选择有效客户');
      return;
    }
    const newLead: Lead = {
      id: `lead-${Date.now()}`,
      name: lead.name || '新建市场线索',
      customerId: customer.id,
      customerName: customer.name,
      schoolContact: lead.schoolContact || customer.contactName,
      contactPhone: lead.contactPhone || customer.contactPhone,
      department: lead.department || currentUser.department,
      ownerName: lead.ownerName || currentUser.name,
      source: lead.source || '市场活动',
      products: lead.products || [],
      status: lead.status || '待确认',
      latestFollowUpAt: lead.latestFollowUpAt,
      createdAt: lead.createdAt || new Date().toISOString().slice(0, 10)
    };
    if (crmEnabled) {
      crmRepository.createLead(newLead).then(() => refreshCrm()).then(() => addToast('success', '线索已创建', newLead.name)).catch((error) => addToast('error', '线索创建失败', error instanceof Error ? error.message : '请稍后重试'));
    } else {
      setLeads((prev) => [newLead, ...prev]);
      addToast('success', '线索已创建', newLead.name);
    }
  };

  const updateLead = (id: string, updates: Partial<Lead>) => {
    if (crmEnabled) {
      crmRepository.updateLead(id, updates)
        .then(() => leadQuery.refetch())
        .then(() => addToast('info', '��������Ѹ���'))
        .catch((error) => addToast('error', '��������ʧ��', error instanceof Error ? error.message : '���Ժ�����'));
      return;
    }
    setLeads((prev) => prev.map((lead) => (lead.id === id ? { ...lead, ...updates } : lead)));
  };

  const convertLeadToOpportunity = (id: string, updates: Partial<Opportunity> = {}) => {
    const lead = leads.find((item) => item.id === id);
    if (!lead || lead.status === '转商机' || lead.status === '已废弃') return;
    const customer = customers.find((item) => item.id === lead.customerId);
    if (!customer) {
      addToast('error', '线索关联客户不存在');
      return;
    }
    const opportunity: Partial<Opportunity> = {
      name: updates.name || lead.name,
      customerId: lead.customerId,
      customerName: customer.name,
      leadId: lead.id,
      type: updates.type || '定制研发',
      stage: updates.stage || '需求确认',
      amount: updates.amount || 0,
      relatedProduct: updates.relatedProduct || lead.products[0] || '待确认产品',
      ownerName: updates.ownerName || lead.ownerName,
      source: updates.source || `线索转化:${lead.id}`,
      probability: updates.probability || 30,
      winRate: updates.winRate || 30,
      isTrial: updates.isTrial || false,
      deadline: updates.deadline || new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
      collaborators: updates.collaborators || [],
      remarks: updates.remarks || '由线索转化生成'
    };
    const opportunityId = `opp-from-${lead.id}-${Date.now()}`;
    if (crmEnabled) {
      crmRepository.convertLead(id, opportunity).then(() => refreshCrm()).then(() => addToast('success', '线索已转为商机', lead.name)).catch((error) => addToast('error', '线索转商机失败', error instanceof Error ? error.message : '请稍后重试'));
    } else {
      addOpportunity({ ...opportunity, id: opportunityId });
      setLeads((prev) => prev.map((item) => (item.id === id ? { ...item, status: '转商机', convertedOpportunityId: opportunityId, convertedAt: new Date().toISOString() } : item)));
      setCustomers((prev) => prev.map((item) => (item.id === customer.id ? { ...item, status: '有效' } : item)));
      addToast('success', '线索已转为商机', lead.name);
    }
  };

  const addInvoiceApproval = (record: Partial<InvoiceApprovalRecord>) => {
    const newRecord: InvoiceApprovalRecord = {
      id: `invoice-approval-${Date.now()}`,
      invoiceId: record.invoiceId,
      customerId: record.customerId,
      opportunityId: record.opportunityId,
      projectId: record.projectId,
      contractId: record.contractId,
      paymentScheduleId: record.paymentScheduleId,
      customerName: record.customerName || '未关联客户',
      contractName: record.contractName || '未关联合同',
      stageName: record.stageName || '未关联付款阶段',
      requestedAmount: record.requestedAmount || 0,
      availableAmount: record.availableAmount || 0,
      overAmount: record.overAmount || 0,
      reason: record.reason || '',
      status: record.status || '待审批',
      applicant: record.applicant || currentUser.name,
      appliedAt: record.appliedAt || new Date().toISOString().slice(0, 16).replace('T', ' '),
      approver: record.approver,
      approvedAt: record.approvedAt,
      comment: record.comment
    };
    setInvoiceApprovals((prev) => [newRecord, ...prev]);
    return newRecord;
  };

  const updateInvoiceApproval = (id: string, updates: Partial<InvoiceApprovalRecord>) => {
    setInvoiceApprovals((prev) => prev.map((record) => (record.id === id ? { ...record, ...updates } : record)));
  };

  const financeStats: FinanceStats = {
    totalContractAmount: contracts.reduce((acc, c) => acc + (c.amount || 0), 0) || 12800000,
    receivedAmount: contracts.reduce((acc, c) => acc + (c.paidAmount || (c.amount ? c.amount * 0.45 : 0)), 0) || 7120000,
    pendingReceivables: paymentSchedules.filter((p) => p.status !== '已收讫' && p.status !== '已收款').reduce((acc, p) => acc + (p.amount || 0), 0) || 5680000,
    invoicedAmount: invoices.reduce((acc, i) => acc + (i.amount || 0), 0) || 6850000
  };

  return (
    <AppContext.Provider
      value={{
        activeTabId,
        openTabs,
        sidebarCollapsed,
        mobileSidebarOpen,
        currentUser,
        theme,
        globalSearchOpen,
        toasts,
        selectedCustomerIdForDetail,
        selectedOpportunityIdForDetail,
        selectedBiddingIdForDetail,
        selectedContractIdForDetail,
        selectedApprovalIdForDetail,
        selectedProjectIdForDetail,
        setActiveTabId,
        openPageTab,
        closePageTab,
        toggleSidebar,
        toggleMobileSidebar,
        setCurrentUserRole,
        setGlobalSearchOpen,
        toggleTheme,
        addToast,
        removeToast,
        setSelectedCustomerIdForDetail,
        setSelectedOpportunityIdForDetail,
        setSelectedBiddingIdForDetail,
        setSelectedContractIdForDetail,
        setSelectedApprovalIdForDetail,
        setSelectedProjectIdForDetail,
        requirementTaskDraft,
        setRequirementTaskDraft,
        customers,
        setCustomers,
        leads,
        setLeads,
        opportunities,
        setOpportunities,
        followUps,
        followups: followUps,
        setFollowUps,
        partners,
        setPartners,
        biddings,
        setBiddings,
        biddingProjects: biddings,
        biddingReviews,
        winningEngagements,
        bidReviews: biddingReviews,
        setBiddingReviews,
        contracts,
        setContracts,
        productLines,
        setProductLines,
        requirementTasks,
        setRequirementTasks,
        designTasks,
        setDesignTasks,
        versions,
        setVersions,
        bugs,
        setBugs,
        requirementPool,
        setRequirementPool,
        approvals,
        setApprovals,
        projects,
        setProjects,
        servers,
        setServers,
        okrs,
        setOkrs,
        performances,
        setPerformances,
        knowledgeDocs,
        setKnowledgeDocs,
        milestones,
        setMilestones,
        deliverables,
        setDeliverables,
        changeRequests,
        setChangeRequests,
        risks,
        setRisks,
        devTasks,
        setDevTasks,
        paymentSchedules,
        setPaymentSchedules,
        invoices,
        setInvoices,
        invoiceApprovals,
        setInvoiceApprovals,
        financeStats,
        crmLoading,
        crmError: crmError ? (crmError instanceof Error ? crmError.message : 'CRM 数据加载失败') : null,
        retryCrm: refreshCrm,
        addCustomer,
        updateCustomer,
        addLead,
        updateLead,
        convertLeadToOpportunity,
        addOpportunity,
        updateOpportunity,
        advanceOpportunityStage,
        addFollowUp,
        addFollowup: addFollowUp,
        addPartner,
        addContract,
        updateContract,
        addBidding,
        addBiddingProject: addBidding,
        updateBiddingProject,
        updateBiddingLifecycle,
        addBiddingReview,
        addBidReview: addBiddingReview,
        addProductLine,
        updateProductLine,
        addProductLineMembers,
        addVersion,
        updateVersion,
        deleteVersion,
        addRequirementTask,
        updateRequirementTask,
        addDesignTask,
        updateDesignTask,
        addRequirementTaskComment,
        addRequirementToPool,
        addRequirementPoolItem: addRequirementToPool,
        updateRequirementPoolItem,
        convertPoolItemToTask,
        addBug,
        updateBug,
        approveFlow,
        rejectFlow,
        addOKR,
        addPerformanceReview,
        addKnowledgeDoc,
        toggleFavoriteDoc,
        deleteKnowledgeDoc,
        addProject,
        updateProject,
        advanceProjectStage,
        addMilestone,
        updateMilestone,
        addDeliverable,
        updateDeliverable,
        addChangeRequest,
        updateChangeRequest,
        addRisk,
        updateRisk,
        addDevTask,
        updateDevTask,
        addPaymentSchedule,
        updatePaymentSchedule,
        addInvoice,
        updateInvoice,
        addInvoiceApproval,
        updateInvoiceApproval
      }}
    >
      <AppNavigationContext.Provider value={{ activeTabId, openTabs, sidebarCollapsed, toggleSidebar, openPageTab, closePageTab }}>
        <AppAuthContext.Provider value={{ currentUser, setCurrentUserRole }}>
          <AppCrmContext.Provider value={{ customers, leads, opportunities, contracts, followUps, productLines, partners, biddings, biddingReviews, winningEngagements, requirementTasks, addLead, updateLead, convertLeadToOpportunity, addFollowUp, addOpportunity, updateOpportunity, advanceOpportunityStage, addPartner, updatePartner, updateContract, addContract, addBiddingProject: addBidding, updateBiddingProject, addBidReview: addBiddingReview, openPageTab, addToast, crmLoading, selectedCustomerIdForDetail, setSelectedCustomerIdForDetail }}>
            {children}
          </AppCrmContext.Provider>
        </AppAuthContext.Provider>
      </AppNavigationContext.Provider>
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};

export const useAppNavigationContext = () => {
  const context = useContext(AppNavigationContext);
  if (!context) throw new Error('useAppNavigationContext must be used within an AppProvider');
  return context;
};

export const useAppAuthContext = () => {
  const context = useContext(AppAuthContext);
  if (!context) throw new Error('useAppAuthContext must be used within an AppProvider');
  return context;
};

export const useAppCrmContext = () => {
  const context = useContext(AppCrmContext);
  if (!context) throw new Error('useAppCrmContext must be used within an AppProvider');
  return context;
};
