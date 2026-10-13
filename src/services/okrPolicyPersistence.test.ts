// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { okrRepository, type OkrRecord } from './okrRepository';

beforeEach(() => localStorage.clear());
const recordsKey = 'shichuang.frontend.mock.okrRecords';
async function context() {
  const people = await okrRepository.people();
  const admin = people.find(person => person.rootFlag === 1)!;
  const manager = people.find(person => person.name === '陈宇璋')!;
  const other = people.find(person => person.id !== admin.id && person.id !== manager.id)!;
  return { people, admin, manager, other, settings: await okrRepository.settings() };
}
describe('OKR policy persistence and access', () => {
 it('round trips all department template stages and types after fresh reads',async()=>{
 const {admin,settings}=await context();settings.templates=[{department:'产品规划部',type:'product',fields:[],stages:['设计','开发']},{department:'产品规划部',type:'delivery',fields:[],stages:['实施','验收']},{department:'产品规划部',type:'support',fields:[],types:['协作','支持']}];
 await okrRepository.saveSettings(settings,admin.id);const reloaded=await okrRepository.settings();expect(reloaded.templates).toEqual(settings.templates);expect((await okrRepository.settings()).templates).toEqual(settings.templates);
 });
  it('persists settings, rejects non-administrators and prevents stale overwrites', async () => {
    const { admin, manager, settings } = await context();
    settings.cycles!.crossAlignment = true;
    await expect(okrRepository.saveSettings(settings, manager.id)).rejects.toThrow('管理员');
    const saved = await okrRepository.saveSettings(settings, admin.id);
    expect(saved.version).toBe((settings.version ?? 0) + 1);
    expect((await okrRepository.settings()).cycles?.crossAlignment).toBe(true);
    await expect(okrRepository.saveSettings(settings, admin.id)).rejects.toThrow('刷新');
  });
  it('hides pending records from unrelated people while keeping them visible to owner, reviewer and administrator', async () => {
    const { admin, manager, other, settings } = await context();
    settings.confirmation!.visiblePending = false;
    await okrRepository.saveSettings(settings, admin.id);
    const record: OkrRecord = {id:'pending',kind:'objective',ownerId:manager.id,periodKey:'2026-10',status:'submitted',version:1,payload:{title:'待确认'},changeRequest:{id:'change',purpose:'initial',status:'pending',reviewerId:admin.id,reason:'首次提交',baseVersion:1,requestedAt:'2026-10-12',payload:{title:'待确认'}}};
    localStorage.setItem(recordsKey,JSON.stringify([record]));
    expect(await okrRepository.records(other.id)).toEqual([]);
    expect(await okrRepository.records(manager.id)).toHaveLength(1);
    expect(await okrRepository.records(admin.id)).toHaveLength(1);
  });
  it('applies confirmation rules to edits and deletion of legacy objectives', async () => {
    const { admin, manager, settings } = await context();
    settings.confirmation!.actions = ['update','delete'];
    settings.confirmation!.types = ['target','challenge'];
    await okrRepository.saveSettings(settings, admin.id);
    const record: OkrRecord = {id:'legacy',kind:'objective',ownerId:manager.id,periodKey:'2026-10',status:'active',version:1,payload:{title:'原目标',keyResults:[]}};
    localStorage.setItem(recordsKey,JSON.stringify([record]));
    await okrRepository.update(record,'save',{payload:{...record.payload,title:'修改目标'}},manager.id);
    let current = (await okrRepository.records(manager.id))[0];
    expect(current.payload.title).toBe('原目标');
    expect(current.changeRequest?.status).toBe('pending');
    await okrRepository.update(current,'approve-change',{},admin.id);
    current = (await okrRepository.records(manager.id))[0];
    expect(current.payload.title).toBe('修改目标');
    await okrRepository.update(current,'delete',{},manager.id);
    current = (await okrRepository.records(manager.id))[0];
    expect(current.status).toBe('active');
    expect(current.changeRequest?.purpose).toBe('delete');
    await okrRepository.update(current,'approve-change',{},admin.id);
    expect(await okrRepository.records(manager.id)).toEqual([]);
  });
});
