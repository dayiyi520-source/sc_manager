// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { productRepository } from './productRepository';
import type { SaveTestPlanInput } from '../types/testManagement';

describe('测试计划用例结果持久化', () => {
  beforeEach(() => {
    localStorage.clear(); sessionStorage.clear();
    localStorage.setItem('shichuang.frontend.mock.workItems', JSON.stringify([{ id: 'task', productLineId: 'line', category: 'test' }, { id: 'bug', productLineId: 'line', category: 'bug' }, { id: 'foreign', productLineId: 'other', category: 'bug' }]));
    localStorage.setItem('shichuang.frontend.mock.testCases', JSON.stringify([{ id: 'c1', productLineId: 'line', title: '登录', enabled: true, priority: 'P1' }, { id: 'c2', productLineId: 'line', title: '退出', enabled: true, priority: 'P2' }]));
    localStorage.setItem('shichuang.frontend.mock.testPlans', JSON.stringify([{ id: 'plan', workItemId: 'task', name: '计划', revision: 0, cases: [{ testCaseId: 'c1', title: '登录', linkId: 'link1' }] }, { id: 'other-plan', workItemId: 'task', name: '其他计划', revision: 0, cases: [{ testCaseId: 'c1' }] }]));
  });
  const save = (patch: Partial<SaveTestPlanInput> = {}) => productRepository.saveTestPlan('task', 'plan', { name: '计划', testCaseIds: ['c1'], revision: 0, ...patch });
  it('四种状态独立保存，添加用例保留已有结果和缺陷，其他计划不变', async () => {
    let revision = 0;
    for (const executionStatus of ['NOT_EXECUTED', 'PASSED', 'FAILED', 'DEFERRED'] as const) {
      const plan = await save({ revision, caseResults: [{ testCaseId: 'c1', executionStatus, defectIds: ['bug'] }] });
      revision = plan.revision;
      expect((await productRepository.testPlans('task'))[0].cases[0]).toMatchObject({ executionStatus, defectIds: ['bug'], linkId: 'link1' });
    }
    await save({ revision, testCaseIds: ['c1', 'c2'] });
    const plans = await productRepository.testPlans('task');
    expect(plans[0].cases[0]).toMatchObject({ executionStatus: 'DEFERRED', defectIds: ['bug'] });
    expect(plans[0].cases[1]).toMatchObject({ executionStatus: 'NOT_EXECUTED', defectIds: [] });
    expect(plans[1].cases[0].executionStatus).toBeUndefined();
  });
  it('当前页创建的缺陷保存到工作项，并能通过标题或编号搜索后关联', async () => {
    localStorage.setItem('shichuang.frontend.mock.productLines', JSON.stringify([{ id: 'line', name: '产品', versions: [], workItemTypes: [{ id: 'bt', category: '缺陷', enabled: true, name: '功能缺陷' }] }]));
    const created = await productRepository.createWorkItem({ requestId: 'plan-create-bug', productLineId: 'line', category: 'bug', taskTypeId: 'bt', title: '登录缺陷', priority: 'P1', severity: '严重缺陷', type: '功能缺陷', env: '测试环境' });
    const repeated = await productRepository.createWorkItem({ requestId: 'plan-create-bug', productLineId: 'line', category: 'bug', taskTypeId: 'bt', title: '登录缺陷', priority: 'P1' });
    expect(repeated.id).toBe(created.id);
    expect((await productRepository.workItems('line', 'bug', '登录')).page.items.map((item) => item.id)).toContain(created.id);
    expect((await productRepository.workItems('line', 'bug', created.code)).page.items.map((item) => item.id)).toContain(created.id);
    expect((await productRepository.tasks('bug')).items.map((item) => item.id)).toContain(created.id);
    await save({ caseResults: [{ testCaseId: 'c1', executionStatus: 'NOT_EXECUTED', defectIds: [created.id] }] });
    expect((await productRepository.testPlans('task'))[0].cases[0].defectIds).toEqual([created.id]);
    await save({ revision: 1, caseResults: [{ testCaseId: 'c1', executionStatus: 'NOT_EXECUTED', defectIds: [] }] });
    expect((await productRepository.workItemDetail('line', created.id)).id).toBe(created.id);
    expect((await productRepository.tasks('bug')).items.map((item) => item.id)).toContain(created.id);
  });

  it('拒绝过期版本、跨产品缺陷和错误计划范围，不覆盖原结果', async () => {
    await save({ caseResults: [{ testCaseId: 'c1', executionStatus: 'PASSED', defectIds: [] }] });
    await expect(save()).rejects.toThrow('已被更新');
    await expect(save({ revision: 1, caseResults: [{ testCaseId: 'c1', executionStatus: 'FAILED', defectIds: ['foreign'] }] })).rejects.toThrow('有效缺陷');
    await expect(productRepository.saveTestPlan('other-task', 'plan', { name: '错误', testCaseIds: ['c1'], revision: 1 })).rejects.toThrow('不存在');
    expect((await productRepository.testPlans('task'))[0].cases[0].executionStatus).toBe('PASSED');
  });
});
