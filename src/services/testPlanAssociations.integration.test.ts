// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { mockApiRequest } from './mockApi';

const tasks = [
  { id: 'target', code: 'TEST-01', title: '目标任务', category: 'test', productLineId: 'line-1' },
  { id: 'source', code: 'TEST-02', title: '来源任务', category: 'test', productLineId: 'line-1' },
  { id: 'foreign', code: 'TEST-03', title: '其他产品任务', category: 'test', productLineId: 'line-2' },
  { id: 'not-test', code: 'REQ-01', title: '产品需求', category: 'requirement', productLineId: 'line-1' },
];
const plans = [
  { id: 'owned-plan', workItemId: 'target', name: '目标已有计划', revision: 1, cases: [] },
  { id: 'source-plan', workItemId: 'source', name: '来源回归计划', revision: 2, cases: [{ testCaseId: 'case-1', executionStatus: 'PASSED', defectIds: [] }] },
  { id: 'foreign-plan', workItemId: 'foreign', name: '其他产品计划', revision: 0, cases: [] },
];

describe('测试任务关联已有测试计划', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    localStorage.setItem('shichuang.frontend.mock.workItems', JSON.stringify(tasks));
    localStorage.setItem('shichuang.frontend.mock.testPlans', JSON.stringify(plans));
    localStorage.setItem('shichuang.frontend.mock.productLines', JSON.stringify([{ id: 'line-1', name: '产品一', versions: [] }, { id: 'line-2', name: '产品二', versions: [] }]));
  });

  it('只提供同产品线的其他测试任务计划，并排除当前任务已有关联', async () => {
    await expect(mockApiRequest('/api/work-items/target/available-test-plans')).resolves.toMatchObject([
      { plan: { id: 'source-plan' }, workItemCode: 'TEST-02', workItemTitle: '来源任务' },
    ]);
  });

  it('持久化关联关系而不复制或转移原计划及其执行结果', async () => {
    await mockApiRequest('/api/work-items/target/test-plan-associations', { method: 'POST', body: JSON.stringify({ testPlanIds: ['source-plan'] }) });
    await mockApiRequest('/api/work-items/target/test-plan-associations', { method: 'POST', body: JSON.stringify({ testPlanIds: ['source-plan'] }) });

    const targetPlans = await mockApiRequest('/api/work-items/target/test-plans');
    const sourcePlans = await mockApiRequest('/api/work-items/source/test-plans');
    expect(targetPlans.map((plan) => plan.id)).toEqual(['owned-plan', 'source-plan']);
    expect(targetPlans.find((plan) => plan.id === 'source-plan')).toMatchObject({ workItemId: 'source', revision: 2, cases: [{ testCaseId: 'case-1', executionStatus: 'PASSED' }] });
    expect(sourcePlans.map((plan) => plan.id)).toEqual(['source-plan']);
    expect(JSON.parse(localStorage.getItem('shichuang.frontend.mock.testPlanAssociations') || '{}')).toEqual({ target: ['source-plan'] });
    await expect(mockApiRequest('/api/work-items/target/available-test-plans')).resolves.toEqual([]);
  });

  it('拒绝跨产品、无效计划及非测试任务关联，且不写入部分数据', async () => {
    await expect(mockApiRequest('/api/work-items/target/test-plan-associations', { method: 'POST', body: JSON.stringify({ testPlanIds: ['source-plan', 'foreign-plan'] }) })).rejects.toThrow('仅可关联同一产品线');
    await expect(mockApiRequest('/api/work-items/target/test-plan-associations', { method: 'POST', body: JSON.stringify({ testPlanIds: ['missing-plan'] }) })).rejects.toThrow('不存在');
    await expect(mockApiRequest('/api/work-items/not-test/test-plan-associations', { method: 'POST', body: JSON.stringify({ testPlanIds: ['source-plan'] }) })).rejects.toThrow('测试任务不存在');
    expect(localStorage.getItem('shichuang.frontend.mock.testPlanAssociations')).toBeNull();
  });
});
