// @vitest-environment jsdom
import { expect, it, vi } from 'vitest';
import { openWorkItemDetailLink, workItemDetailLink } from './workItemDetailLink';

it.each([
  ['requirement', 'prod_req_tasks'], ['design', 'prod_design_tasks'], ['dev', 'prod_rd_tasks'],
  ['test', 'prod_test_tasks'], ['bug', 'prod_bugs'], ['WORK_ORDER', 'wb_work_order'],
])('builds direct %s detail links preserving deployment prefix', (category, page) => {
  const url = new URL(workItemDetailLink('task & 1', category, 'line-1', 'https://example.com/manager/app/wb_work_order?filter=old#tab'));
  expect(url.pathname).toBe(`/manager/app/${page}`);
  expect(url.searchParams.get('detailId')).toBe('task & 1');
  expect(url.searchParams.get('productLineId')).toBe(category === 'WORK_ORDER' ? null : 'line-1');
  expect(url.searchParams.has('filter')).toBe(false);
  expect(url.hash).toBe('');
});

it('opens a separate tab with the same detail URL used for copying', () => {
  const open = vi.spyOn(window, 'open').mockImplementation(() => null);
  openWorkItemDetailLink('d-1', 'design', 'line-1');
  expect(open).toHaveBeenCalledWith(workItemDetailLink('d-1', 'design', 'line-1'), '_blank');
  open.mockRestore();
});
