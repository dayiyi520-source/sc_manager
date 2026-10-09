// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { mockApiRequest } from './mockApi';
import type { OkrRecord } from './okrRepository';

const key = 'shichuang.frontend.mock.okrRecords';
const objective: OkrRecord = { id: 'test-o', kind: 'objective', ownerId: 'boss', periodKey: '2026-10', status: 'active', version: 2, payload: { title: '交付目标', keyResults: [{id:'a',title:'成果',weight:100,progress:60}] } };
const mutate = (action: string, data = {}) => mockApiRequest('/api/okr/records/test-o', {method:'PATCH', body:JSON.stringify({action,version:2,viewerId:'boss',...data})});
describe('objective mutations', () => {
  beforeEach(() => { localStorage.clear(); localStorage.setItem(key, JSON.stringify([objective])); });
  it('saves edits without changing the period, status or action progress', async () => {
    await mutate('save', {payload:{...objective.payload,title:'新的成果目标'}});
    const records = JSON.parse(localStorage.getItem(key)!);
    expect(records[0]).toMatchObject({periodKey:'2026-10',status:'active',version:3,payload:{title:'新的成果目标',keyResults:[{id:'a',progress:60}]}});
  });
  it('soft deletes only the chosen objective and hides it from subsequent reads', async () => {
    localStorage.setItem(key, JSON.stringify([objective,{...objective,id:'other'}, {id:'review',kind:'review',ownerId:'boss',status:'reviewed',payload:{title:'历史复盘'}}]));
    await mutate('delete');
    expect(JSON.parse(localStorage.getItem(key)!)[0]).toMatchObject({status:'deleted',deletedBy:'boss',version:3});
    const records = await mockApiRequest('/api/okr/records?viewerId=boss') as OkrRecord[];
    expect(records.map(record => record.id)).toEqual(['other','review']);
    const parents = await mockApiRequest('/api/okr/actions/parents?periodKey=2026-10') as OkrRecord[];
    expect(parents.map(record => record.id)).toEqual(['other']);
    await expect(mutate('delete')).resolves.toBeDefined();
  });
  it('rejects unauthorized and stale changes without writing', async () => {
    await expect(mutate('delete', {viewerId:'other'})).rejects.toThrow('本人');
    await expect(mutate('save', {version:1})).rejects.toThrow('刷新');
    expect(JSON.parse(localStorage.getItem(key)!)[0]).toEqual(objective);
  });
  it('blocks deletion and action removal when lower-level alignments exist', async () => {
    localStorage.setItem(key, JSON.stringify([objective,{id:'child',kind:'action',status:'active',payload:{parentObjectiveId:'test-o',parentActionId:'a'}}]));
    await expect(mutate('delete')).rejects.toThrow('下级对齐');
    await expect(mutate('save', {payload:{title:'目标',keyResults:[]}})).rejects.toThrow('动作不能移除');
    expect(JSON.parse(localStorage.getItem(key)!)[0]).toEqual(objective);
  });
});
