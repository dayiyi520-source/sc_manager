// @vitest-environment jsdom
import { render, screen, fireEvent, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SupervisorKrReviewCard } from './SupervisorKrReviewCard';
import type { OkrKrReview, OkrWork } from '../../../services/okrRepository';
const review: OkrKrReview = { objectiveId: 'o', objectiveTitle: '目标', keyResultId: 'kr', keyResultTitle: 'KR', previousProgress: 0, currentProgress: 0, workIds: [], health: 'normal', achievement: '', blocker: '', nextPlan: '' };
const props = { review, employeeActions: [], supports: [], busy: false, editable: true, supportLoading: false, onUpdate: vi.fn(), onEmployeeSupport: vi.fn(), viewerId: 'm' };
describe('主管本人进度和证据', () => {
  it('allows self-assigned progress and evidence actions below employee evidence', () => {
    const add = vi.fn(), remove = vi.fn(), update = vi.fn();
    render(<SupervisorKrReviewCard {...props} selfAssigned onUpdate={update} onAddEvidence={add} onRemoveEvidence={remove} ownEvidence={[{ id: 'work', title: '本人证据', status: '已完成' } as OkrWork]}/>);
    fireEvent.change(screen.getByRole('spinbutton', { name: '主管进度：KR' }), { target: { value: '70' } });
    expect(update).toHaveBeenCalledWith({ supervisorProgress: [{ id: 'kr', currentProgress: 70 }] });
    fireEvent.click(screen.getByRole('button', { name: '关联工作证据' })); expect(add).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole('button', { name: '移除本人证据：本人证据' })); expect(remove).toHaveBeenCalledWith('work');
  });
  it('disables editing submitted progress and keeps evidence visible', () => {
    render(<SupervisorKrReviewCard {...props} editable={false} selfAssigned/>);
    expect(screen.getByRole('spinbutton')).toBeDisabled();
    expect(screen.getByRole('button', { name: '关联工作证据' })).toBeDisabled();
  });
  it('offers no progress editor for an employee-only KR', () => {
    render(<SupervisorKrReviewCard {...props}/>);
    expect(screen.queryByRole('spinbutton')).not.toBeInTheDocument();
  });
});

it('merges employee and supervisor evidence in one table with names and owner-only deletion', () => {
  const saved = { ...review, workIds: ['employee-work'] };
  const employeeSnapshot = { id: 'employee-review', authorId: 'e', authorName: '张三', title: '员工周报', startDate: '2026-10-12', endDate: '2026-10-18', status: 'submitted', krReviews: [saved], assistance: [], items: [{ workId: 'employee-work', title: '员工验证', status: '已完成', sourceLabel: '产品甲 / V1', actualHours: 2, result: '', impact: '' }] };
  render(<SupervisorKrReviewCard {...props} viewerName="陈宇璋" selfAssigned review={{ ...review, employeeReviewSnapshots: [employeeSnapshot] }} ownEvidence={[{ id: 'owner-work', title: '主管验证', status: '已完成', productLineName: '产品乙', versionName: 'V2', actualHours: 3, ownerName: '任务负责人' } as OkrWork]}/>);
  expect(screen.getByRole('columnheader', { name: '陈宇璋' })).toBeInTheDocument();
  expect(screen.queryByText('本人进度')).not.toBeInTheDocument();
  expect(screen.queryByText('主管本人工作证据')).not.toBeInTheDocument();
  const employeeRow = screen.getByText('员工验证').closest('tr')!;
  const ownerRow = screen.getByText('主管验证').closest('tr')!;
  expect(employeeRow.closest('table')).toBe(ownerRow.closest('table'));
  expect(within(employeeRow).getByText('张三')).toBeInTheDocument();
  expect(within(ownerRow).getByText('陈宇璋')).toBeInTheDocument();
  expect(within(employeeRow).queryByRole('button')).not.toBeInTheDocument();
  expect(within(ownerRow).getByRole('button', { name: '移除本人证据：主管验证' })).toBeEnabled();
  expect(within(ownerRow).getByText('产品乙 / V2')).toBeInTheDocument();
  expect(screen.getAllByRole('button', { name: '关联工作证据' })).toHaveLength(1);
});
