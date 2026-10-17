// @vitest-environment jsdom
import { beforeEach, expect, it, vi } from 'vitest';
import { createOkrFileCache } from './okrFileCache';
import { createOkrFilePersistence } from './okrFilePersistence';
import seed from '../data/mockOkrState.json';
import type { OkrFileState } from '../../scripts/mock-okr-state-plugin';
const key='shichuang.frontend.mock.okrRecords';
const migration='shichuang.frontend.mock.okrFileMigration.v1';
beforeEach(()=>localStorage.clear());
const constrained = () => ({ getItem:(name:string)=>localStorage.getItem(name),setItem:(name:string,value:string)=>{ if(name===key && value.length>1024)throw new DOMException('quota','QuotaExceededError');localStorage.setItem(name,value); } });
it('saves a full 5MB attachment to the file service despite cache quota and restores it after a fresh read',async()=>{
 localStorage.setItem(migration,'done');
 let remote={...seed,revision:1,okrRecords:[]} as unknown as OkrFileState;
 const request=vi.fn(async (_path:unknown,init?:RequestInit)=>{ if(init?.method==='PUT'){const input=JSON.parse(String(init.body));remote={...input.state,revision:remote.revision+1};}return new Response(JSON.stringify(remote)); });
 const cache=createOkrFileCache(constrained());
 const persistence=createOkrFilePersistence(cache,request);
 const attachment={id:'five',name:'five.bin',size:5*1024*1024,data:'data:application/octet-stream;base64,'+'YWFh'.repeat(Math.floor(5*1024*1024/3))+'YWE='};
 const records=[{id:'review',kind:'review',ownerId:'me',periodKey:'2026-10',status:'draft',version:0,payload:{title:'复盘',knowledgeEntries:[{id:'k',title:'知识',category:'应知应会',attachments:[attachment]}]}}];
 await persistence.run(async()=>cache.setItem(key,JSON.stringify(records)));
 expect(remote.okrRecords).toEqual(records);
 expect(localStorage.getItem(key)).not.toContain('five.bin');
 const fresh=createOkrFileCache(constrained());
 await createOkrFilePersistence(fresh,request).run(async()=>expect(JSON.parse(fresh.getItem(key)!)).toEqual(records),true);
});
it('rolls back cached changes when the file service refuses a save and propagates non-quota errors',async()=>{
 localStorage.setItem(migration,'done');
 const remote={...seed,revision:1,okrRecords:[]} as unknown as OkrFileState;
 const request=vi.fn(async (_path:unknown,init?:RequestInit)=>init?.method==='PUT'?new Response(JSON.stringify({message:'保存冲突'}),{status:409}):new Response(JSON.stringify(remote)));
 const cache=createOkrFileCache(constrained());
 await expect(createOkrFilePersistence(cache,request).run(async()=>cache.setItem(key,JSON.stringify([{title:'大'.repeat(2000)}])))).rejects.toThrow('保存冲突');
 expect(cache.getItem(key)).toBe('[]');
 const blocked=createOkrFileCache({getItem:()=>null,setItem:()=>{throw new DOMException('denied','SecurityError');}});
 expect(()=>blocked.setItem(key,'data')).toThrow('denied');
});
