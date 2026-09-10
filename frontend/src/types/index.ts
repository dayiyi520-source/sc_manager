export type SystemRole = 'admin' | 'sales_director' | 'product_manager' | 'tech_lead';
export interface CurrentUser { id: string; name: string; avatar: string; role: SystemRole; roleTitle: string; department: string; }
export type MainMenuId = 'workbench' | 'crm' | 'product' | 'approval' | 'project' | 'system';
export type SubMenuId = string;
export interface PageTab { id: SubMenuId; title: string; mainMenuId: MainMenuId; iconName: string; closable?: boolean; }
export interface ApiResponse<T> { code: string; message: string; data: T; requestId: string; }
export interface PageResult<T> { items: T[]; page: number; pageSize: number; total: number; }
export interface WorkbenchTask { id:string; title:string; status:'待处理'|'进行中'|'已完成'; priority:string; productLine:string; dueDate:string; }
export interface WorkbenchApproval { id:string; title:string; applicant:string; status:'待审批'|'已通过'|'已驳回'; createdAt:string; }
export interface OkrKeyResult { id:string; content:string; progress:number; weight:number; deadline:string; }
export interface OkrItem { id:string; cycle:string; category:'my'|'supervisor'|'subordinate'|'department'|'other'; objective:string; owner:string; progress:number; weight:number; deadline:string; alignTo:string; keyResults:OkrKeyResult[]; }
export interface PerformanceReview { id:string; cycleName:string; type:'周复盘'|'月复盘'; summary:string; selfScore:number; status:'草稿'|'已提交'; createdAt:string; }
export interface KnowledgeCategory { id:string; name:string; description:string; }
export interface KnowledgeDocument { id:string; title:string; category:string; tags:string[]; author:string; version:string; updatedAt:string; views:number; favorite:boolean; summary:string; content:string; }
export interface WorkOrder { id:string; code:string; title:string; description:string; goal:string; productLine:string; customer:string; priority:string; source:string; status:'待评审'|'已采纳'|'已转任务'|'已拒绝'|'已搁置'; createdAt:string; }
