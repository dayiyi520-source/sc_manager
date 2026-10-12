// @vitest-environment jsdom
import { beforeEach, expect, it } from 'vitest';
import { mockApiRequest } from './mockApi';
beforeEach(() => { localStorage.clear(); sessionStorage.clear(); });
it.each(['project', 'other'] as const)('persists %s design source independently of optional product', async (designVariant) => {
  const result = await mockApiRequest('/api/design-tasks', { method: 'POST', body: JSON.stringify({ title: '来源与产品分别保存', designVariant, designProjectName: '验收项目', projectId: 'project-1', designSourceDepartment: '产品部', productLineName: '', ownerName: '当前负责人', plannedStartDate: '2026-10-12', dueDate: '2026-10-13' }) });
  const page = await mockApiRequest('/api/design-tasks');
  const created = page.items.find((item: any) => item.id === result.id);
  expect(created).toMatchObject({ designVariant, productLineName: '', designProjectName: '验收项目', designSourceDepartment: '产品部' });
  await mockApiRequest(`/api/design-tasks/${created.id}`, { method: 'PUT', body: JSON.stringify({ designSourceDepartment: '交付部', productLineName: '后选产品', ownerName: '当前负责人', revision: created.revision }) });
  const refreshed = await mockApiRequest('/api/design-tasks');
  expect(refreshed.items.find((item: any) => item.id === result.id)).toMatchObject({ designVariant, designProjectName: '验收项目', designSourceDepartment: '交付部', productLineName: '后选产品' });
});
