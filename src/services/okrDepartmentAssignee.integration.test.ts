// @vitest-environment jsdom
import { beforeEach, expect, it, vi } from 'vitest';

vi.mock('./apiClient', async () => {
  const { mockApiRequest } = await import('./mockApi');
  return { apiRequest: mockApiRequest };
});

import { okrRepository, type OkrRecord } from './okrRepository';

const recordsKey = 'shichuang.frontend.mock.okrRecords';

beforeEach(() => localStorage.clear());

it('persists a supervisor sub KR reassignment without creating a review request', async () => {
  const people = await okrRepository.people();
  const manager = people.find(person => person.id === 'user-product')!;
  const member = people.find(person => person.supervisorId === manager.id && person.department === manager.department)!;
  const record: OkrRecord = {
    id: 'assignee-update', kind: 'objective', ownerId: manager.id, periodKey: '2026-10', status: 'active', version: 1,
    payload: { goalModelVersion: 2, goalLevel: 'department', origin: 'autonomous', objectiveType: 'challenge', title: '部门目标', deadline: '2026-10-31', keyResults: [{ id: 'kr', title: '交付版本', structureType: 'product', businessObject: '产品', weight: 100, progress: 0, deadline: '2026-10-31', assigneeIds: [member.id], details: [{ id: 'detail', name: '产品', version: 'V1', stage: '设计', plannedStartDate: '2026-10-01', plannedEndDate: '2026-10-20', assigneeIds: [member.id] }] }] },
  };
  localStorage.setItem(recordsKey, JSON.stringify([record]));
  await okrRepository.update(record, 'save', { payload: { ...record.payload, keyResults: record.payload.keyResults?.map(kr => ({ ...kr, details: kr.details?.map(detail => ({ ...detail, assigneeIds: [manager.id] })) })) } }, manager.id);
  const saved = (await okrRepository.records(manager.id)).find(item => item.id === record.id)!;
  expect(saved.changeRequest?.status).not.toBe('pending');
  expect(saved.payload.keyResults?.[0].details?.[0].assigneeIds).toEqual([manager.id]);
  expect(saved.changeHistory?.at(-1)?.reason).toBe('调整承接人员');
});
