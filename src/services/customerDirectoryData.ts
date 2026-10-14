import snapshot from '../data/mockCustomerDirectory.json';
import { MOCK_TEAM_MEMBERS } from '../data/mockSnapshot';
import { projectDeliveryMap } from './projectDeliveryMap';
import type { Customer, Lead, Opportunity, ProjectItem, TeamMember } from '../types';

// 档案以仓库内的 Mock 文件持久保存，所有消费方通过此处读取同一份数据。
const members = (): TeamMember[] => {
  try { return JSON.parse(localStorage.getItem('shichuang.frontend.mock.teamMembers') || 'null') || MOCK_TEAM_MEMBERS; }
  catch { return MOCK_TEAM_MEMBERS; }
};
const memberName = (id: string) => members().find(member => member.id === id)?.name || '未分配';
export const directoryCustomers = (): Customer[] => snapshot.customers as Customer[];
export const directoryLeads = () => snapshot.leads.map(row => ({ ...row, customerName: directoryCustomers().find(customer => customer.id === row.customerId)?.name || row.customerName, ownerName: memberName(row.ownerId), registrarName: memberName(row.registrarId) })) as Array<Lead & { ownerId: string; registrarId: string; registrarName: string; leadType: string; collaborationCount: number; sharedCount: number; taskCount: number }>;
export const directoryOpportunities = () => snapshot.opportunities.map(row => ({ ...row, customerName: directoryCustomers().find(customer => customer.id === row.customerId)?.name || row.customerName, ownerName: memberName(row.ownerId), presalesOwnerName: memberName(row.presalesOwnerId) })) as Array<Opportunity & { ownerId: string; presalesOwnerId: string; presalesOwnerName: string; grade: string; unfollowedDays: number }>;
export const directoryProjects = (): ProjectItem[] => projectDeliveryMap().map(project => ({ id: project.id, code: project.id, name: project.name, customerName: project.customerName, customerId: directoryCustomers().find(customer => customer.name === project.customerName)?.id, stage: '项目立项', progress: project.products.flatMap(product => product.stages).filter(stage => stage.status === 'completed').length / Math.max(1, project.products.flatMap(product => product.stages).length) * 100, pmName: project.products[0]?.ownerName || '', startDate: '' }));

export const directoryProjectById = (id?: string) => id ? directoryProjects().find(project => project.id === id) : undefined;
export const directoryLeadById = (id?: string) => id ? directoryLeads().find(lead => lead.id === id) : undefined;
export const directoryOpportunityById = (id?: string) => id ? directoryOpportunities().find(opportunity => opportunity.id === id) : undefined;
export const directoryCustomerById = (id?: string) => id ? directoryCustomers().find(customer => customer.id === id) : undefined;

export function customerDirectoryRequest(path: string, method: string) {
  if (method !== 'GET') throw new Error('档案仅支持查看');
  const url = new URL(path, 'http://mock.local');
  const kind = url.pathname.split('/')[3];
  const sources = { customers: directoryCustomers, leads: directoryLeads, opportunities: directoryOpportunities, projects: directoryProjects };
  if (!(kind in sources) || url.pathname.split('/').length !== 4) throw new Error('档案入口不存在');
  const keyword = (url.searchParams.get('keyword') || '').trim().toLocaleLowerCase();
  const rows = sources[kind as keyof typeof sources]().filter(row => row.name.toLocaleLowerCase().includes(keyword));
  const page = Math.max(1, Number(url.searchParams.get('page')) || 1);
  const pageSize = Math.max(1, Number(url.searchParams.get('pageSize')) || 100);
  return { items: rows.slice((page - 1) * pageSize, page * pageSize), total: rows.length, page, pageSize };
}
