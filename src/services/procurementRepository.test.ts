// @vitest-environment jsdom
import { afterEach, expect, it } from 'vitest';
import type { ProjectItem } from '../types';
import { loadProcurementItems } from './procurementRepository';

const projects: ProjectItem[] = [
  { id: 'project-2', code: 'P-002', name: '在线精品课程资源库建设项目', customerId: 'customer-2', customerName: '金华职业技术大学', stage: '项目立项', progress: 20, pmName: '项目经理', startDate: '' },
  { id: 'project-3', code: 'P-003', name: '智慧实训基地升级项目', customerId: 'customer-3', customerName: '浙江工业职业技术学院', stage: '项目立项', progress: 20, pmName: '项目经理', startDate: '' }
];

afterEach(() => localStorage.clear());

it('seeds linked, visibly marked project purchase demo records only when no snapshot exists', () => {
  const items = loadProcurementItems(projects);

  expect(items).toMatchObject([
    { code: 'PO-DEMO-2026-013', amount: 86400, projectId: 'project-2', isDemo: true },
    { code: 'PO-DEMO-2026-021', amount: 53000, projectId: 'project-3', isDemo: true }
  ]);
  expect(loadProcurementItems(projects)).toEqual(items);
});

it('preserves an explicitly saved empty purchase list', () => {
  localStorage.setItem('shichuang.frontend.mock.procurementItems', '[]');

  expect(loadProcurementItems(projects)).toEqual([]);
});

it('waits for project data before writing its initial demo snapshot', () => {
  expect(loadProcurementItems()).toEqual([]);
  expect(localStorage.getItem('shichuang.frontend.mock.procurementItems')).toBeNull();
  expect(loadProcurementItems(projects)).toHaveLength(2);
});
