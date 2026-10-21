// @vitest-environment jsdom
import { beforeEach, expect, it } from 'vitest';
import { mockApiRequest } from './mockApi';
beforeEach(() => { localStorage.clear(); sessionStorage.clear(); });
it.each(['requirement', 'bug'])('saves and clears expected completion independently of planned dates for %s', async category => {
  const task = { id: 'date-restore', title: '日期恢复验收', category, productLineId: 'line-1', revision: 0, plannedStartDate: '2026-10-21', plannedEndDate: '2026-10-28', expectedCompleteDate: '2026-10-30' };
  localStorage.setItem('shichuang.frontend.mock.workItems', JSON.stringify([task]));
  const path = '/api/work-items/date-restore?productLineId=line-1';
  await mockApiRequest(path, {method:'PUT',body:JSON.stringify({expectedCompleteDate:'2026-11-01',revision:0})});
  const saved = await mockApiRequest(path);
  expect(saved).toMatchObject({expectedCompleteDate:'2026-11-01',plannedStartDate:task.plannedStartDate,plannedEndDate:task.plannedEndDate});
  await mockApiRequest(path, {method:'PUT',body:JSON.stringify({title:'只改标题',revision:saved.revision})});
  const retained = await mockApiRequest(path);
  expect(retained.expectedCompleteDate).toBe('2026-11-01');
  await mockApiRequest(path, {method:'PUT',body:JSON.stringify({expectedCompleteDate:'',revision:retained.revision})});
  expect((await mockApiRequest(path)).expectedCompleteDate).toBe('');
  const rows=JSON.parse(localStorage.getItem('shichuang.frontend.mock.workItems')!);
  expect(rows.find((row:{id:string})=>row.id===task.id)).toMatchObject({expectedCompleteDate:'',plannedEndDate:task.plannedEndDate});
});
