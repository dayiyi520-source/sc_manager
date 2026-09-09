export type SystemRole = 'admin' | 'sales_director' | 'product_manager' | 'tech_lead';
export interface CurrentUser { id: string; name: string; avatar: string; role: SystemRole; roleTitle: string; department: string; }
export type MainMenuId = 'workbench' | 'crm' | 'product' | 'approval' | 'project' | 'system';
export type SubMenuId = string;
export interface PageTab { id: SubMenuId; title: string; mainMenuId: MainMenuId; iconName: string; closable?: boolean; }
export interface ApiResponse<T> { code: string; message: string; data: T; requestId: string; }
export interface PageResult<T> { items: T[]; page: number; pageSize: number; total: number; }
