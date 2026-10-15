// @vitest-environment jsdom
import { beforeEach, expect, it } from 'vitest';
import { createOkrFilePersistence } from './okrFilePersistence';
import type { OkrFileState } from '../../scripts/mock-okr-state-plugin';
import { mockApiRequest } from './mockApi';
import type { OkrRecord } from './okrRepository';
const key = (name: string) => `shichuang.frontend.mock.${name}`;
beforeEach(() => { localStorage.clear(); sessionStorage.clear(); });
it('updates existing monthly KR product rows after repeated product renames without changing progress', async () => {
  localStorage.setItem(key('productLines'), JSON.stringify([{ id: 'rename-product', name: '原产品', versions: [] }]));
  localStorage.setItem(key('okrPeople'), JSON.stringify([{ id: 'owner', name: '制定人', role: 'admin', department: '产品' }]));
  const record = { id: 'monthly', ownerId: 'owner', kind: 'objective', status: 'draft', version: 2, periodKey: '2026-10', payload: { title: '月度目标', keyResults: [{ id: 'kr', title: '推进迭代', structureType: 'product', businessObject: '原产品', weight: 100, progress: 45, details: [{ id: 'detail', name: '原产品', version: 'V1', stage: '设计', progress: 45, plannedStartDate: '2026-10-01', plannedEndDate: '2026-10-31' }] }] } };
  localStorage.setItem(key('okrRecords'), JSON.stringify([record]));
  await mockApiRequest('/api/product-lines/rename-product', { method: 'PUT', body: JSON.stringify({ name: '新产品' }) });
  await mockApiRequest('/api/product-lines/rename-product', { method: 'PUT', body: JSON.stringify({ name: '最终产品' }) });
  const records = await mockApiRequest('/api/okr/records?viewerId=owner') as OkrRecord[];
  expect(records[0].payload.keyResults![0]).toMatchObject({ businessObject: '最终产品', progress: 45, details: [{ ...record.payload.keyResults[0].details[0], name: '最终产品', productLineId: 'rename-product' }] });
  expect((await mockApiRequest('/api/okr/records?viewerId=owner'))[0].payload).toEqual(records[0].payload);
  expect(JSON.parse(localStorage.getItem(key('okrRecords'))!)[0].payload).toEqual(records[0].payload);
});
it('normalizes cached defect state and transition labels without changing identifiers', async () => {
  const workflow = { id: 'bug-flow', status: 'PUBLISHED', definition: { states: [{ key: 'wontfix', name: '再不修复', enabled: true, group: 'CANCELLED' }], transitions: [{ key: 'pause', from: 'todo', to: 'wontfix', name: '进入再不修复' }] } };
  localStorage.setItem(key('researchTypes'), JSON.stringify([{ id: 'bug-type', category: '缺陷', name: '系统缺陷', enabled: true, workflow }]));
  const templates = await mockApiRequest('/api/work-item-template');
  expect(templates[0].workflow.definition).toMatchObject({ states: [{ key: 'wontfix', name: '暂不修复' }], transitions: [{ key: 'pause', to: 'wontfix', name: '进入暂不修复' }] });
  expect(JSON.parse(localStorage.getItem(key('researchTypes'))!)[0].workflow.definition.states[0].name).toBe('暂不修复');
});

it('keeps a historical defect on its original workflow node after label correction', async () => {
  const definition = { states: [{ key: 'todo', name: '待处理', enabled: true, initial: true, group: 'NOT_STARTED' }, { key: 'wontfix', name: '再不修复', enabled: true, group: 'CANCELLED' }], transitions: [{ key: 'pause', from: 'todo', to: 'wontfix', name: '进入再不修复' }] };
  localStorage.setItem(key('researchTypes'), JSON.stringify([{ id: 'bug-type', category: '缺陷', name: '系统缺陷', enabled: true, workflow: { id: 'global-flow', status: 'PUBLISHED', definition } }]));
  localStorage.setItem(key('productLines'), JSON.stringify([{ id: 'bug-product', name: '缺陷产品', workItemTypes: [{ id: 'bound-type', name: '系统缺陷', category: '缺陷', enabled: true, workflows: [{ id: 'bound-flow', status: 'PUBLISHED', definition }] }] }]));
  localStorage.setItem(key('workItems'), JSON.stringify([{ id: 'historical-bug', category: 'bug', productLineId: 'bug-product', taskTypeId: 'bound-type', workflowId: 'bound-flow', statusKey: 'wontfix', status: '再不修复', title: '不修改这段再不修复描述' }]));
  const item = await mockApiRequest('/api/work-items/historical-bug');
  expect(item).toMatchObject({ id: 'historical-bug', statusKey: 'wontfix', status: { name: '暂不修复', group: 'CANCELLED' }, title: '不修改这段再不修复描述' });
  const transitions = await mockApiRequest('/api/work-items/historical-bug/transitions?productLineId=bug-product');
  expect(transitions.statuses).toEqual(expect.arrayContaining([expect.objectContaining({ key: 'wontfix', name: '暂不修复', current: true })]));
});

it('persists resolved KR names through the existing file queue and restores them after hydration', async () => {
  localStorage.setItem(key('productLines'), JSON.stringify([{ id: 'p', name: '最新名称', nameAliases: ['历史名称'], versions: [] }]));
  localStorage.setItem(key('okrFileMigration.v1'), 'done');
  let file = { revision: 1, okrRecords: [{ id: 'o', kind: 'objective', status: 'draft', version: 2, ownerId: 'owner', periodKey: '2026-10', payload: { title: '月度目标', keyResults: [{ id: 'kr', structureType: 'product', businessObject: '历史名称', details: [{ id: 'r', name: '历史名称', version: 'V1', progress: 60 }] }] } }], okrPeople: [{ id: 'owner', name: '本人', department: '产品', rootFlag: 1, supervisorId: null }], okrSettings: {} } as unknown as OkrFileState;
  const request = (async (_url: unknown, init?: RequestInit) => {
    if (init?.method === 'PUT') { const body = JSON.parse(String(init.body)); file = { ...body.state, revision: file.revision + 1 }; }
    return new Response(JSON.stringify(file));
  }) as typeof fetch;
  const persistence = createOkrFilePersistence(localStorage, request);
  await persistence.run(() => mockApiRequest('/api/okr/records?viewerId=owner'));
  expect(file.okrRecords[0].payload.keyResults![0].details![0]).toMatchObject({ name: '最新名称', productLineId: 'p', progress: 60 });
  localStorage.removeItem(key('okrRecords'));
  await persistence.run(async () => { expect(JSON.parse(localStorage.getItem(key('okrRecords'))!)[0].payload.keyResults[0].details[0].name).toBe('最新名称'); });
});
