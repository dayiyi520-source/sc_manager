// @vitest-environment jsdom
import { beforeEach, expect, it, vi } from 'vitest';
import { mockApiRequest } from './mockApi';
beforeEach(() => { localStorage.clear(); sessionStorage.clear(); });
it.each(['requirement', 'bug'])('saves, rereads and clears an optional project on %s tasks', async category => {
  localStorage.setItem('shichuang.frontend.mock.workItems', JSON.stringify([{ id: 'task-project', title: '项目关联验收', category, productLineId: 'line-1', revision: 0 }]));
  const path = '/api/work-items/task-project?productLineId=line-1';
  const first = await mockApiRequest(path);
  expect(first.projectId).toBeFalsy();
  const saved = await mockApiRequest(path, { method: 'PUT', body: JSON.stringify({ projectId: 'project-1', projectName: '关联项目甲', revision: 0 }) });
  expect(saved.projectId).toBe('project-1');
  const reread = await mockApiRequest(path);
  expect(reread).toMatchObject({ projectId: 'project-1', projectName: '关联项目甲' });
  await mockApiRequest(path, { method: 'PUT', body: JSON.stringify({ projectId: '', projectName: '', revision: reread.revision }) });
  const cleared = await mockApiRequest(path);
  expect(cleared.projectId).toBe('');
  expect(cleared.projectName).toBe('');
  const stored = JSON.parse(localStorage.getItem('shichuang.frontend.mock.workItems')!);
  expect(stored.find((row: {id: string}) => row.id === 'task-project')).toMatchObject({projectId: '', projectName: ''});
});
