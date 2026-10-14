import { apiRequest, type PageResult } from './apiClient';
import type { Contract, Customer, FollowUpRecord, Lead, Opportunity } from '../types';

type Query = Record<string, string | number>;
const list = <T>(kind: string, values: Query = {}) => apiRequest<PageResult<T>>(`/api/customer-directory/${kind}?${new URLSearchParams(Object.entries(values).map(([key, value]) => [key, String(value)]))}`);
const empty = <T>(): Promise<PageResult<T>> => Promise.resolve({ items: [], page: 1, pageSize: 100, total: 0 });
const readOnly = (..._args: unknown[]): Promise<{ id: string; code: string }> => Promise.reject(new Error('旧业务已停用，档案仅支持查看'));
export const customerDirectoryRepository = {
  customers: (values?: Query) => list<Customer>('customers', values),
  leads: (values?: Query) => list<Lead>('leads', values),
  opportunities: (values?: Query) => list<Opportunity>('opportunities', values),
  projects: (values?: Query) => list<import('../types').ProjectItem>('projects', values),
  // AppContext 的历史公共签名暂作兼容；不再调用已删除模块或假装写入成功。
  biddings: () => empty<any>(),
  engagements: () => empty<any>(),
  followUps: () => empty<FollowUpRecord>(),
  contracts: () => empty<Contract>(),
  createCustomer: readOnly, updateCustomer: readOnly,
  createLead: readOnly, updateLead: readOnly, convertLead: readOnly,
  createOpportunity: readOnly, updateOpportunity: readOnly, transitionOpportunity: readOnly,
  createFollowUp: readOnly, createContract: readOnly, updateContract: readOnly,
  updateBidding: readOnly,
};
