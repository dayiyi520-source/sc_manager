// @vitest-environment jsdom
import { beforeEach, expect, it } from 'vitest';
import { mockApiRequest } from './mockApi';
const key = (name: string) => `shichuang.frontend.mock.${name}`;
beforeEach(() => { localStorage.clear(); sessionStorage.clear(); });
it('migrates persistent historical defects to real employees and synchronized workflow bindings', async () => {
  const products = await mockApiRequest('/api/product-lines');
  const members = await mockApiRequest('/api/team-members/options');
  const all = (await Promise.all(products.map((product: any) => mockApiRequest(`/api/work-items?productLineId=${product.id}&category=bug&pageSize=1000`)))).flatMap((result: any) => result.page.items);
  expect(all.length).toBeGreaterThan(0);
  const stored = JSON.parse(localStorage.getItem(key('workItems'))!);
  const productCopies = JSON.parse(localStorage.getItem(key('productLines'))!);
  for (const bug of all) {
    const task = stored.find((task: any) => task.id === bug.id);
    expect(task.verifierId).toBeTruthy();
    expect(members.some((member: any) => member.id === task.verifierId && member.name === task.verifierName)).toBe(true);
    const product = productCopies.find((product: any) => product.id === task.productLineId);
    const type = product.workItemTypes.find((type: any) => type.id === task.taskTypeId);
    expect(type.workflows.some((flow: any) => flow.id === task.workflowId && flow.definition.states.some((state: any) => state.key === task.statusKey))).toBe(true);
    expect((await mockApiRequest(`/api/work-items/${task.id}/transitions?productLineId=${task.productLineId}`)).statuses.length).toBeGreaterThan(1);
  }
  const bug = stored.find((task: any) => task.id === all[0].id);
  const replacement = members.find((member: any) => member.id !== bug.verifierId);
  const saved = await mockApiRequest(`/api/work-items/${bug.id}?productLineId=${bug.productLineId}`, { method: 'PUT', body: JSON.stringify({ revision: bug.revision, verifierId: replacement.id, verifierName: '忽略客户端姓名' }) });
  expect(saved).toMatchObject({ verifierId: replacement.id, verifierName: replacement.name });
  await mockApiRequest(`/api/work-items?productLineId=${bug.productLineId}&category=bug`);
  expect(JSON.parse(localStorage.getItem(key('workItems'))!).find((task: any) => task.id === bug.id)).toMatchObject({ verifierId: replacement.id, verifierName: replacement.name });
  await expect(mockApiRequest(`/api/work-items/${bug.id}?productLineId=${bug.productLineId}`, { method: 'PUT', body: JSON.stringify({ revision: saved.revision, verifierId: 'invalid' }) })).rejects.toThrow('验证者不存在或已停用');
});
it('copies subsequent system workflow edits to product settings without manual resaving', async () => {
  const types = await mockApiRequest('/api/work-item-template');
  const template = types.find((type: any) => type.category === '缺陷');
  const first = await mockApiRequest('/api/product-lines');
  const definition = { ...template.workflow.definition, states: template.workflow.definition.states.map((state: any, index: number) => index === 0 ? { ...state, name: '新待处理' } : state) };
  await mockApiRequest(`/api/work-item-template/types/${template.id}/workflow`, { method: 'PUT', body: JSON.stringify({ definition }) });
  const updated = await mockApiRequest('/api/product-lines');
  for (const product of updated) {
    expect(product.workItemTypes.find((type: any) => type.sourceTemplateId === template.id).workflows[0].definition).toEqual(definition);
  }
  expect(updated[0].workItemTypes.find((type: any) => type.sourceTemplateId === template.id).id).toBe(first[0].workItemTypes.find((type: any) => type.sourceTemplateId === template.id).id);
});
