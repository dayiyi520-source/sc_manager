// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { ConfigProvider } from 'antd';
import { WeeklyReviewEditor } from './WeeklyReviewEditor';
import { okrRepository, type OkrPerson, type OkrRecord } from '../../../services/okrRepository';
class Observer { observe() {} disconnect() {} unobserve() {} }
globalThis.IntersectionObserver = Observer as unknown as typeof IntersectionObserver;
afterEach(() => vi.restoreAllMocks());
const people: OkrPerson[] = [
 { id: 'manager', name: '部门主管', department: '产品部', rootFlag: 0, supervisorId: 'boss', version: 0 },
 { id: 'employee', name: '员工甲', department: '产品部', rootFlag: 0, supervisorId: 'manager', version: 0 },
];
it.each(['week', 'month'] as const)('opens an employee %s report, closes it and submits without waiting for record refresh', async reviewType => {
 const period = { startDate: '2026-10-12', endDate: '2026-10-18' };
 const record: OkrRecord = { id: 'employee-report', kind: 'review', ownerId: 'employee', status: 'submitted', version: 1, periodKey: '', payload: { title: '员工本轮报告', reviewType, ...period } };
 const mark = vi.spyOn(okrRepository, 'markViewed').mockResolvedValue(undefined);
 const onSubmit = vi.fn().mockResolvedValue(true);
 render(<ConfigProvider theme={{token:{motion:false}}}><WeeklyReviewEditor template="supervisor" reviewType={reviewType} periodOverride={period} viewer={{id:'manager', name:'部门主管', department:'产品部'}} people={people} records={[record]} okrs={[]} work={[]} busy={false} workLoading={false} reviewerName="老板" onRefreshWork={vi.fn()} onCancel={vi.fn()} onSaveDraft={vi.fn()} onSubmit={onSubmit}/></ConfigProvider>);
 fireEvent.click(screen.getByRole('button', { name: reviewType === 'week' ? '提交周报' : '提交月报' }));
 expect(screen.getByText('未读')).toBeInTheDocument();
 fireEvent.click(screen.getByRole('button', { name: '查看复盘' }));
 await waitFor(() => expect(screen.getByText('已读')).toBeInTheDocument());
 fireEvent.click(screen.getByRole('button', { name: /^关\s*闭$/ }));
 fireEvent.click(screen.getByRole('button', { name: /^提\s*交$/ }));
 await waitFor(() => expect(onSubmit).toHaveBeenCalledOnce());
 expect(onSubmit.mock.calls[0][0]).toMatchObject({ reviewType, reviewMode: 'supervisor' });
 expect(mark).toHaveBeenCalledWith(record.id, 'manager');
 expect(record.viewedBy).toBeUndefined();
});
