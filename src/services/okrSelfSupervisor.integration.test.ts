// @vitest-environment jsdom
import { beforeEach, expect, it, vi } from 'vitest';
vi.mock('./apiClient', async () => {
 const { mockApiRequest } = await import('./mockApi');
 return { apiRequest: mockApiRequest };
});
import { okrRepository, type OkrPayload, type OkrRecord } from './okrRepository';
const recordsKey = 'shichuang.frontend.mock.okrRecords';
beforeEach(() => localStorage.clear());
async function context() {
 const people = await okrRepository.people();
 const admin = people.find(person => person.rootFlag === 1)!;
 const manager = people.find(person => person.id === 'user-product')!;
 const settings = await okrRepository.settings();
 const source: OkrRecord = { id: 'own-department', ownerId: manager.id, kind: 'objective', periodKey: '2026-10', status: 'active', version: 1, createdAt: '2026-10-01', payload: { title: '部门方向', goalModelVersion: 2, goalLevel: 'department', keyResults: [] } };
 localStorage.setItem(recordsKey, JSON.stringify([source]));
 const payload: OkrPayload = { title: '主管本人个人目标', goalModelVersion: 2, goalLevel: 'personal', origin: 'autonomous', objectiveType: 'challenge', deadline: '2026-10-31', keyResults: [{ id: 'personal-kr', title: '个人结果', weight: 100, progress: 0, deadline: '2026-10-31', assigneeIds: [manager.id], executionActions: [{ id: 'own-action', ownerId: manager.id, title: '完成个人动作', progress: 0, weight: 100, deadline: '2026-10-31' }] }] };
 return { admin, manager, settings, payload };
}
it('persists self-supervisor auto approval and applies it to draft submission and active updates', async () => {
 const { admin, manager, settings, payload } = await context();
 await okrRepository.saveSettings({ ...settings, confirmation: { ...settings.confirmation!, selfSupervisor: 'auto' } }, admin.id);
 expect((await okrRepository.settings()).confirmation?.selfSupervisor).toBe('auto');
 const created = await okrRepository.create('objective', '2026-10', payload, false, manager.id);
 let current = (await okrRepository.records(manager.id)).find(record => record.id === created.id)!;
 expect(current.status).toBe('draft');
 await okrRepository.update(current, 'submit', {}, manager.id);
 current = (await okrRepository.records(manager.id)).find(record => record.id === created.id)!;
 expect(current.status).toBe('active');
 expect(current.changeRequest?.status).not.toBe('pending');
 await okrRepository.update(current, 'save', { payload: { ...current.payload, title: '修改后的个人目标', changeReason: '调整工作安排' } }, manager.id);
 current = (await okrRepository.records(manager.id)).find(record => record.id === created.id)!;
 expect(current.payload.title).toBe('修改后的个人目标');
 expect(current.changeRequest?.status).not.toBe('pending');
});
it('uses the saved upper-supervisor option and resolves the pending request when switched back to automatic', async () => {
 const { admin, manager, settings, payload } = await context();
 const saved = await okrRepository.saveSettings({ ...settings, confirmation: { ...settings.confirmation!, selfSupervisor: 'upper' } }, admin.id);
 const created = await okrRepository.create('objective', '2026-10', payload, true, manager.id);
 let current = (await okrRepository.records(manager.id)).find(record => record.id === created.id)!;
 expect(current.status).toBe('submitted');
 expect(current.changeRequest).toMatchObject({ status: 'pending', reviewerId: manager.supervisorId });
 await okrRepository.saveSettings({ ...saved, confirmation: { ...saved.confirmation!, selfSupervisor: 'auto' } }, admin.id);
 current = (await okrRepository.records(manager.id)).find(record => record.id === created.id)!;
 expect(current.status).toBe('active');
 expect(current.changeRequest).toMatchObject({ status: 'approved', reviewerId: 'system' });
 expect(current.changeHistory?.at(-1)?.status).toBe('approved');
});
