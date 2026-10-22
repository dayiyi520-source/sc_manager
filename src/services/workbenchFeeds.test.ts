// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { canViewWorkbenchFeed, syncWorkbenchFeeds, createWorkbenchFeed, deleteWorkbenchFeed, listWorkbenchFeeds, FEEDS_KEY, type FeedCatalog, type FeedInput } from './workbenchFeeds';
import { audienceLabel, organizationOptions, validateAudience } from './workbenchAudience';
import { productReleaseFeeds, syncProductReleaseFeeds } from './productReleaseFeeds';
import type { CurrentUser, ProductLine } from '../types';
const catalog = { products: [{id:'p',name:'产品'}], versions:[], projects:[{id:'j',name:'项目'}], customers:[{id:'c',name:'客户'}], people:[{id:'me',name:'本人',department:'产品部'}, {id:'agency',name:'代理商',organizationId:'agency',department:'产品部'}] } as FeedCatalog;
const author = {id:'me',name:'本人'};
const input: FeedInput = {type:'square',title:'标题',content:'正文',tags:['经验分享'],audienceScopes:[['shichuang','产品部']]};
beforeEach(()=>{localStorage.clear();vi.restoreAllMocks();});
describe('信息广场与组织部门范围',()=>{
 it('allows optional independent associations, persists tags and scopes, and clears relationships when editing',()=>{
  const saved=createWorkbenchFeed({...input,projectId:'j',productId:'p',customerId:'c'},catalog,author);
  expect(listWorkbenchFeeds()[0]).toMatchObject({id:saved.id,projectName:'项目',productName:'产品',customer:'客户',tags:['经验分享'],audienceScopes:input.audienceScopes});
  const updated=createWorkbenchFeed({...input,title:'更新'},catalog,author,saved.id);
  expect(updated.projectId).toBeUndefined();expect(updated.productId).toBeUndefined();expect(updated.customerId).toBeUndefined();
  expect(listWorkbenchFeeds().filter(row=>row.id===saved.id)).toHaveLength(1);
 });
 it.each([{...input,tags:[]},{...input,audienceScopes:[]},{...input,audienceScopes:[['missing']]},{...input,audienceScopes:[['shichuang','失效部门']]},{...input,tags:['失效标签']},{...input,productId:'missing'},{...input,customerId:'missing'},{...input,projectId:'missing'}] as FeedInput[])('rejects missing or invalid required metadata and stale associations',value=>{
  expect(()=>createWorkbenchFeed(value,catalog,author)).toThrow();
 });
 it('rejects manual product news, empty title, long content and corrupt storage',()=>{
  expect(()=>createWorkbenchFeed({...input,type:'dynamic'},catalog,author)).toThrow('产品动态仅由');
  expect(()=>createWorkbenchFeed({...input,title:' '},catalog,author)).toThrow('标题');
  expect(()=>createWorkbenchFeed({...input,content:'文'.repeat(10001)},catalog,author)).toThrow('信息简介');
  localStorage.setItem(FEEDS_KEY,'broken');expect(()=>createWorkbenchFeed(input,catalog,author)).toThrow('无法读取');expect(localStorage.getItem(FEEDS_KEY)).toBe('broken');
 });
 it('isolates organizations with identically named departments, supports future members and never bypasses as author/admin',()=>{
  const feed=createWorkbenchFeed(input,catalog,author);
  expect(canViewWorkbenchFeed(feed,{id:'future',department:'产品部',organizationId:'shichuang'})).toBe(true);
  expect(canViewWorkbenchFeed(feed,{id:'agency',department:'产品部',organizationId:'agency'})).toBe(false);
  expect(canViewWorkbenchFeed(feed,{id:'me',department:'其他部',organizationId:'shichuang'})).toBe(false);
  const full=createWorkbenchFeed({...input,audienceScopes:[['agency']]},catalog,author);
  expect(canViewWorkbenchFeed(full,{id:'new',department:'新部门',organizationId:'agency'})).toBe(true);
  expect(audienceLabel(full.audienceScopes)).toBe('代理商组织');
 });
 it('offers organizations and departments without members or all, and folds redundant department selections',()=>{
  const options=organizationOptions(catalog.people!);
  expect(options.map(row=>row.label)).toEqual(['师创组织','代理商组织']);
  expect(options[0].children).toEqual([{value:'产品部',label:'产品部'}]);
  expect(validateAudience([['shichuang'],['shichuang','产品部'],['agency','产品部']],catalog.people!)).toEqual([['shichuang'],['agency','产品部']]);
 });
 it('migrates historical manual news and classification without losing content or widening specified member permissions',()=>{
  localStorage.setItem(FEEDS_KEY,JSON.stringify([{id:'old',type:'dynamic',title:'旧动态',content:'旧正文',time:'2026-10-20',visibility:'specified',audienceIds:['allowed'],authorId:'me'}]));
  const feed=listWorkbenchFeeds()[0];expect(feed.type).toBe('square');expect(feed.tags).toEqual(['产品信息']);
  expect(canViewWorkbenchFeed(feed,{id:'allowed',department:'产品部'})).toBe(true);
  expect(canViewWorkbenchFeed(feed,{id:'admin',department:'产品部'})).toBe(false);
  expect(feed.audienceScopes).toBeUndefined();
 });
 it('source sharing updates by identity, retains local posts, and only authors edit/delete local posts',()=>{
  const own=createWorkbenchFeed(input,catalog,author);
  const shared={id:'shared',type:'square' as const,title:'商机共享',content:'业务内容',time:'2026-10-20',source:{module:'商机管理',recordId:'opp'},tags:['商机信息'],audienceScopes:[['shichuang']] as [string][]};
  syncWorkbenchFeeds('商机管理',[shared]);syncWorkbenchFeeds('商机管理',[{...shared,title:'更新共享'}]);
  expect(listWorkbenchFeeds().filter(row=>row.source?.recordId==='opp')).toHaveLength(1);
  expect(()=>deleteWorkbenchFeed(own.id,'other')).toThrow('不可在工作台删除');
  const source=listWorkbenchFeeds().find(row=>row.source)!;
  expect(()=>createWorkbenchFeed(input,catalog,author,source.id)).toThrow('不可在工作台编辑');
  expect(()=>deleteWorkbenchFeed(source.id,'me')).toThrow('不可在工作台删除');
  syncWorkbenchFeeds('商机管理',[]);expect(listWorkbenchFeeds().some(row=>row.id===own.id)).toBe(true);
  deleteWorkbenchFeed(own.id,'me');expect(listWorkbenchFeeds().some(row=>row.id===own.id)).toBe(false);
 });
 it('storage failure reports failure without silently losing a record',()=>{
  vi.spyOn(Storage.prototype,'setItem').mockImplementation(()=>{throw new Error('quota')});
  expect(()=>createWorkbenchFeed(input,catalog,author)).toThrow('保存失败');
 });
});
describe('产品发布同步',()=>{
 const products=[{id:'p',name:'产品',versions:[{id:'published',name:'V1',status:'已发布',releaseDate:'2026-10-20',changelog:'发布内容'},{id:'completed',name:'V2',status:'已完成'},{id:'planned',name:'V3',status:'待开始'}]}] as ProductLine[];
 it('syncs released versions only, prevents duplicates, defaults to the company organization and keeps sources read-only',()=>{
  expect(productReleaseFeeds(products)).toHaveLength(1);
  syncProductReleaseFeeds(products);syncProductReleaseFeeds(products);
  const rows=listWorkbenchFeeds().filter(row=>row.type==='dynamic');expect(rows).toHaveLength(1);
  expect(rows[0]).toMatchObject({source:{module:'产品发布'},audienceScopes:[['shichuang']],content:'发布内容',time:'2026-10-20'});
  expect(canViewWorkbenchFeed(rows[0],{id:'staff',department:'产品部'})).toBe(true);
  expect(canViewWorkbenchFeed(rows[0],{id:'agent',organizationId:'agency',department:'产品部'})).toBe(false);
  expect(()=>deleteWorkbenchFeed(rows[0].id,rows[0].authorId || '')).toThrow();
  products[0].versions![0].changelog='新内容';syncProductReleaseFeeds(products);expect(listWorkbenchFeeds().filter(row=>row.type==='dynamic')).toHaveLength(1);
  expect(listWorkbenchFeeds().find(row=>row.type==='dynamic')?.content).toBe('新内容');
 });
});

it('keeps shared-source identity when the source publishes again, without duplicating the post',()=>{
 const source={module:'商机管理',recordId:'opportunity:me',detailUrl:'/app/crm_opportunities'};
 const first=createWorkbenchFeed(input,catalog,author,undefined,source);
 const second=createWorkbenchFeed({...input,title:'再次共享'},catalog,author,undefined,source);
 expect(first.id).toBe(second.id);expect(listWorkbenchFeeds().filter(feed=>feed.source?.recordId===source.recordId)).toHaveLength(1);
 expect(listWorkbenchFeeds().find(feed=>feed.id===first.id)?.title).toBe('再次共享');
});
it('rejects damaged audience paths without widening the original visibility',()=>{
 localStorage.setItem(FEEDS_KEY,JSON.stringify([{id:'bad',type:'square',title:'损坏范围',content:'正文',time:'2026-10-22',audienceScopes:[]}]));
 expect(()=>listWorkbenchFeeds()).toThrow('格式异常');
});
