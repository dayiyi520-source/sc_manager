// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createOkrFilePersistence } from './okrFilePersistence';
import { migrateLegacyOkrState, saveOkrState, type OkrFileState } from '../../scripts/mock-okr-state-plugin';
import seed from '../data/mockOkrState.json';
import type { OkrRecord } from './okrRepository';
const record=(id:string,kind:OkrRecord['kind']='objective',ownerId='manager'):OkrRecord=>({id,kind,ownerId,periodKey:'2026-10',status:'draft',version:0,payload:{title:id}});
const state=():OkrFileState=>({...seed as unknown as OkrFileState,revision:0,okrRecords:[]});
const key='shichuang.frontend.mock.okrRecords';
describe('portable goal/review mock persistence',()=>{
 it('explains a disconnected preview service, preserves local content and recovers on retry',async()=>{
  localStorage.clear();localStorage.setItem(key,JSON.stringify([record('local-draft','review')]));
  const request=vi.fn().mockRejectedValueOnce(new TypeError('Failed to fetch')).mockResolvedValue(new Response(JSON.stringify(state())));
  const persistence=createOkrFilePersistence(localStorage,request);
  const operation=vi.fn(async()=>true);
  await expect(persistence.run(operation)).rejects.toThrow('无法连接复盘数据服务');
  expect(operation).not.toHaveBeenCalled();
  expect(JSON.parse(localStorage.getItem(key)!)[0].id).toBe('local-draft');
  localStorage.setItem('shichuang.frontend.mock.okrFileMigration.v1','done');
  await expect(persistence.run(operation)).resolves.toBe(true);
  expect(operation).toHaveBeenCalledOnce();
 });
 it('reports an invalid response instead of exposing a JSON parsing error',async()=>{
  localStorage.clear();
  const request=vi.fn().mockResolvedValue(new Response('<html>not the state service</html>'));
  await expect(createOkrFilePersistence(localStorage,request).run(async()=>true)).rejects.toThrow('复盘数据服务返回内容无效');
 });
 it('atomically saves goals and reviews and rejects concurrent overwrites',()=>{
  const dir=mkdtempSync(join(tmpdir(),'okr-state-'));const file=join(dir,'state.json');
  try{writeFileSync(file,JSON.stringify(state()));const saved=saveOkrState(file,{...state(),okrRecords:[record('goal'),record('review','review')]},0);
  expect(saved.revision).toBe(1);expect(JSON.parse(readFileSync(file,'utf8')).okrRecords).toHaveLength(2);
  expect(()=>saveOkrState(file,state(),0)).toThrow('其他页面');expect(JSON.parse(readFileSync(file,'utf8')).okrRecords).toHaveLength(2);
  }finally{rmSync(dir,{recursive:true});}
 });
 it('cleans only legacy boss reviews during migration and retains new file-backed reviews',()=>{
  const initial=migrateLegacyOkrState(state(),{okrRecords:[record('boss-old','review','user-admin'),record('goal'),record('staff','review')]});
  expect(initial.okrRecords.map(r=>r.id)).toEqual(['goal','staff']);
  const migrated=migrateLegacyOkrState({...initial,revision:1,okrRecords:[...initial.okrRecords,record('boss-new','review','user-admin')]},{okrRecords:[record('boss-old','review','user-admin'),record('another')]});
  expect(migrated.okrRecords.map(r=>r.id)).toEqual(['goal','staff','boss-new','another']);
 });
 it('migrates newer legacy goals and template settings without downgrading file records',()=>{
  const current={...state(),revision:1,okrSettings:{...state().okrSettings,version:1},okrRecords:[{...record('goal'),version:2}]};
  const next=migrateLegacyOkrState(current,{okrSettings:{...current.okrSettings,version:3,objectiveTitleTemplates:[{id:'o',title:'本部门目标',department:'产品部',enabled:true,guidance:''}]},okrRecords:[{...record('goal'),version:1},record('new')]});
  expect(next.okrRecords.find(row=>row.id==='goal')?.version).toBe(2);
  expect(next.okrRecords).toHaveLength(2);expect(next.okrSettings.version).toBe(3);
 });
 it('restores persisted records in a fresh browser and rolls back failed writes',async()=>{
  let file=state();let fail=false;
  const request=vi.fn(async (_url:unknown, init?:RequestInit)=>{
   if(fail&&init?.method==='PUT') return new Response(JSON.stringify({message:'保存失败'}),{status:409});
   if(init?.method==='POST'){const b=JSON.parse(String(init.body));file={...migrateLegacyOkrState(file,b.legacy),revision:file.revision+1};}
   if(init?.method==='PUT'){const b=JSON.parse(String(init.body));file={...b.state,revision:file.revision+1};}
   return new Response(JSON.stringify(file));
  }) as unknown as typeof fetch;
  localStorage.clear();const first=createOkrFilePersistence(localStorage,request);
  await first.run(async()=>{localStorage.setItem(key,JSON.stringify([record('goal'),{...record('weekly','review'),viewedBy:['manager']}]));return true;});
  localStorage.clear();const second=createOkrFilePersistence(localStorage,request);
  await second.run(async()=>{expect(JSON.parse(localStorage.getItem(key)!)).toHaveLength(2);expect(JSON.parse(localStorage.getItem(key)!)[1].viewedBy).toEqual(['manager']);});
  fail=true;await expect(second.run(async()=>{localStorage.setItem(key,JSON.stringify([record('lost')]));})).rejects.toThrow('保存失败');
  expect(JSON.parse(localStorage.getItem(key)!)).toHaveLength(2);expect(file.okrRecords.map(r=>r.id)).toEqual(['goal','weekly']);
  fail=false;await second.run(async()=>true);
 });
});

 describe('review receipt migration', () => {
  it('merges unversioned receipts without overwriting file-backed feedback and exclusions', () => {
   const saved = { ...record('monthly', 'review'), status: 'submitted', version: 2, viewedBy: ['admin'], payload: { title: '部门月报', reviewType: 'month' as const, startDate: '2026-10-01', endDate: '2026-10-31', departmentReviewExclusions: [{ employeeId: 'e', reason: '本轮休假' }], departmentFeedbackRows: [{ employeeId: 'e', employeeName: '员工', reviewId: 'r', suggestion: '建议', judgment: '需公司解决' as const }] } };
   const legacy = { ...saved, viewedBy: ['manager'], payload: { ...saved.payload, departmentReviewExclusions: [], departmentFeedbackRows: [] } };
   const current = { ...state(), revision: 1, okrRecords: [saved] };
   const migrated = migrateLegacyOkrState(current, { okrRecords: [legacy] });
   expect(migrated.okrRecords[0]).toEqual({ ...saved, viewedBy: ['admin', 'manager'] });
   expect(migrateLegacyOkrState(migrated, { okrRecords: [legacy] })).toEqual(migrated);
   expect(migrateLegacyOkrState(current, { okrRecords: [{ ...legacy, periodKey: 'other' }] }).okrRecords[0]).toEqual(saved);
   expect(migrateLegacyOkrState(current, { okrRecords: [{ ...legacy, status: 'draft' }] }).okrRecords[0]).toEqual(saved);
  });
 });

describe('file read query bursts', () => {
 it('serves 40 concurrent and repeated read queries with one file GET, then revalidates after focus or expiry', async () => {
  localStorage.clear(); localStorage.setItem('shichuang.frontend.mock.okrFileMigration.v1', 'done');
  let file = state();
  const request = vi.fn(async () => new Response(JSON.stringify(file)));
  const persistence = createOkrFilePersistence(localStorage, request);
  const read = () => persistence.run(async () => JSON.parse(localStorage.getItem(key)!), true);
  await Promise.all(Array.from({ length: 40 }, read));
  await read(); expect(request).toHaveBeenCalledTimes(1);
  file = { ...file, revision: 1, okrRecords: [record('external')] };
  window.dispatchEvent(new Event('focus'));
  expect((await read())[0].id).toBe('external'); expect(request).toHaveBeenCalledTimes(2);
  const clock = vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 5001);
  try { await read(); expect(request).toHaveBeenCalledTimes(3); } finally { clock.mockRestore(); }
 });
 it('reads a fresh revision before writing and exposes successful writes to cached reads', async () => {
  localStorage.clear(); localStorage.setItem('shichuang.frontend.mock.okrFileMigration.v1', 'done');
  let file = state();
  const request = vi.fn(async (_url: unknown, init?: RequestInit) => {
   if (init?.method === 'PUT') {
    const body = JSON.parse(String(init.body)); expect(body.previousRevision).toBe(file.revision);
    file = { ...body.state, revision: file.revision + 1 };
   }
   return new Response(JSON.stringify(file));
  });
  const persistence = createOkrFilePersistence(localStorage, request);
  await persistence.run(async () => true, true);
  file = { ...file, revision: 3, okrRecords: [record('external')] };
  await persistence.run(async () => {
   const rows = JSON.parse(localStorage.getItem(key)!); rows.push(record('new'));
   localStorage.setItem(key, JSON.stringify(rows));
  });
  expect(await persistence.run(async () => JSON.parse(localStorage.getItem(key)!).map((row: OkrRecord) => row.id), true)).toEqual(['external', 'new']);
  expect(request).toHaveBeenCalledTimes(3);
 });
});


it('shares a read failure across queued queries and allows the next explicit retry', async () => {
 localStorage.clear();
 const request = vi.fn().mockRejectedValueOnce(new TypeError('断网')).mockResolvedValue(new Response(JSON.stringify(state())));
 const persistence = createOkrFilePersistence(localStorage, request);
 const read = () => persistence.run(async () => true, true);
 const failed = await Promise.allSettled(Array.from({ length: 40 }, read));
 expect(failed.every(result => result.status === 'rejected')).toBe(true);
 expect(request).toHaveBeenCalledTimes(1);
 await expect(read()).resolves.toBe(true);
 expect(request).toHaveBeenCalledTimes(2);
});
