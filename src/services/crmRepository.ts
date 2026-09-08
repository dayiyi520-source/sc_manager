import { apiRequest, PageResult } from './apiClient'
import type { Contract, CrmJourneyEvent, Customer, FollowUpRecord, Lead, Opportunity } from '../types'
const query=(values:Record<string,string|number>)=>new URLSearchParams(Object.entries(values).map(([key,value])=>[key,String(value)])).toString()
const parseJsonArray=(value:unknown): string[] => {
  if (Array.isArray(value)) return value.map(String)
  if (typeof value !== 'string') return []
  try { const parsed=JSON.parse(value); return Array.isArray(parsed) ? parsed.map(String) : [] } catch { return [] }
}
export const crmRepository={
  customers:async(values:Record<string,string|number>={})=>{const page=await apiRequest<PageResult<Customer>>(`/api/crm/customers?${query(values)}`);const items=Array.isArray(page?.items)?page.items:[];return{page:page?.page||1,pageSize:page?.pageSize||10,total:page?.total||items.length,...page,items:items.map(item=>({...item,tags:parseJsonArray(item?.tags)}))}},
  createCustomer:(input:Partial<Customer>)=>apiRequest<{id:string;code:string}>('/api/crm/customers',{method:'POST',body:JSON.stringify(input)}),
  leads:async(values:Record<string,string|number>={})=>{const page=await apiRequest<PageResult<Lead>>(`/api/crm/leads?${query(values)}`);const items=Array.isArray(page?.items)?page.items:[];return{page:page?.page||1,pageSize:page?.pageSize||10,total:page?.total||items.length,...page,items:items.map(item=>({...item,products:parseJsonArray(item?.products)}))}},
  createLead:(input:Partial<Lead>)=>apiRequest<{id:string}>('/api/crm/leads',{method:'POST',body:JSON.stringify(input)}),
  updateLead:(id:string,input:Partial<Lead>&{version?:number})=>apiRequest<void>(`/api/crm/leads/${id}`,{method:'PUT',body:JSON.stringify(input)}),
  convertLead:(id:string,input:Partial<Opportunity>)=>apiRequest<{id:string}>(`/api/crm/leads/${id}/convert`,{method:'POST',body:JSON.stringify(input)}),
  opportunities:async(values:Record<string,string|number>={})=>{const page=await apiRequest<PageResult<Opportunity>>(`/api/crm/opportunities?${query(values)}`);const items=Array.isArray(page?.items)?page.items:[];return{page:page?.page||1,pageSize:page?.pageSize||10,total:page?.total||items.length,...page,items:items.map(item=>({...item,collaborators:parseJsonArray(item?.collaborators)}))}},
  createOpportunity:(input:Partial<Opportunity>)=>apiRequest<{id:string}>('/api/crm/opportunities',{method:'POST',body:JSON.stringify(input)}),
  updateOpportunity:(id:string,input:Partial<Opportunity>&{version?:number})=>apiRequest<void>(`/api/crm/opportunities/${id}`,{method:'PUT',body:JSON.stringify(input)}),
  transitionOpportunity:(id:string,stage:Opportunity['stage'],version?:number)=>apiRequest<void>(`/api/crm/opportunities/${id}/stage-transitions`,{method:'POST',body:JSON.stringify({stage,version})}),
  updateBidding:(opportunityId:string,input:Record<string,unknown>)=>apiRequest<{id:string}>(`/api/crm/opportunities/${opportunityId}/bidding`,{method:'PUT',body:JSON.stringify(input)}),
  updateEngagement:(engagementId:string,input:Record<string,unknown>)=>apiRequest<{id:string}>(`/api/crm/biddings/${engagementId}/engagement`,{method:'PUT',body:JSON.stringify(input)}),
  biddings:async(values:Record<string,string|number>={})=>{const page=await apiRequest<PageResult<any>>(`/api/crm/biddings?${query(values)}`);return{page:page?.page||1,pageSize:page?.pageSize||10,total:page?.total||0,...page,items:Array.isArray(page?.items)?page.items:[]}},
  engagements:async(values:Record<string,string|number>={})=>{const page=await apiRequest<PageResult<any>>(`/api/crm/winning-engagements?${query(values)}`);return{page:page?.page||1,pageSize:page?.pageSize||10,total:page?.total||0,...page,items:Array.isArray(page?.items)?page.items:[]}},
  projects:async(values:Record<string,string|number>={})=>{const page=await apiRequest<PageResult<any>>(`/api/crm/projects?${query(values)}`);return{page:page?.page||1,pageSize:page?.pageSize||10,total:page?.total||0,...page,items:Array.isArray(page?.items)?page.items:[]}},
  followUps:async(values:Record<string,string|number>={})=>{const page=await apiRequest<PageResult<FollowUpRecord>>(`/api/crm/follow-ups?${query(values)}`);const items=Array.isArray(page?.items)?page.items:[];return{page:page?.page||1,pageSize:page?.pageSize||10,total:page?.total||items.length,...page,items:items.map(item=>({...item,method:item?.method||item?.followType,date:item?.date||item?.followTime,attachments:parseJsonArray(item?.attachments)}))}},
  createFollowUp:(input:Partial<FollowUpRecord>)=>apiRequest<{id:string}>('/api/crm/follow-ups',{method:'POST',body:JSON.stringify(input)}),
  customer:(id:string)=>apiRequest<Customer>(`/api/crm/customers/${id}`),
  opportunity:(id:string)=>apiRequest<Opportunity>(`/api/crm/opportunities/${id}`),
  followUp:(id:string)=>apiRequest<FollowUpRecord>(`/api/crm/follow-ups/${id}`),
  contracts:async(values:Record<string,string|number>={})=>{const page=await apiRequest<PageResult<Contract>>(`/api/crm/contracts?${query(values)}`);return{page:page?.page||1,pageSize:page?.pageSize||10,total:page?.total||0,...page,items:Array.isArray(page?.items)?page.items:[]}},
  createContract:(input:Partial<Contract>)=>apiRequest<{id:string;code:string}>('/api/crm/contracts',{method:'POST',body:JSON.stringify(input)}),
  contract:(id:string)=>apiRequest<Contract>(`/api/crm/contracts/${id}`),
  updateCustomer:(id:string,input:Partial<Customer>)=>apiRequest<void>(`/api/crm/customers/${id}`,{method:'PUT',body:JSON.stringify(input)}),
  updateContract:(id:string,input:Partial<Contract>)=>apiRequest<void>(`/api/crm/contracts/${id}`,{method:'PUT',body:JSON.stringify(input)}),
  dashboard:()=>apiRequest<{customerCount:number;opportunityAmount:number;opportunityCount:number;wonCount:number;winRate:number;followUpCount:number;contractCount:number}>('/api/crm/dashboard/summary'),
  journey:async(values:Record<string,string|number>={})=>{const page=await apiRequest<PageResult<CrmJourneyEvent>>(`/api/crm/journey?${query(values)}`);return{page:page?.page||1,pageSize:page?.pageSize||10,total:page?.total||0,...page,items:Array.isArray(page?.items)?page.items:[]}},
  visits:()=>apiRequest<any[]>('/api/crm/visits'),
  createVisit:(input:Record<string, unknown>)=>apiRequest<any>('/api/crm/visits',{method:'POST',body:JSON.stringify(input)}),
  checkInVisit:(id:string,payload:{location?:string;notes?:string;photos?:string[]})=>apiRequest<any>(`/api/crm/visits/${id}/checkin`,{method:'POST',body:JSON.stringify(payload)}),
}
