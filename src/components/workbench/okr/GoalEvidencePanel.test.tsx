// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { GoalEvidencePanel } from './GoalEvidencePanel';
import type { GoalEvidenceTask } from '../../../services/goalReviewEvidence';
afterEach(cleanup);
const tasks = [{ id: 't', title: '实现归集', taskType: 'dev', kind: 'task', status: '已完成', actualHours: 3, sourceEmployees: ['员工甲'], productLineName: '产品甲', versionName: 'V1', projectName: '项目甲' }] as GoalEvidenceTask[];
const props = { tasks, productNames: [], projectNames: [], loading: false, error: null, onRetry: vi.fn() };
describe('目标工作任务展示', () => {
  it('展示任务五字段、产品完成率和项目计数', () => {
    const result = render(<GoalEvidencePanel {...props} section="tasks"/>);
    expect(screen.getAllByRole('columnheader').map(row => row.textContent)).toEqual(['标题', '类型', '状态', '任务工时', '来源员工']);
    expect(screen.getByText('研发任务')).toBeInTheDocument(); expect(screen.getByText('3 小时')).toBeInTheDocument(); expect(screen.getByText('员工甲')).toBeInTheDocument();
    result.rerender(<GoalEvidencePanel {...props} section="products"/>);
    expect(screen.getByText('V1')).toBeInTheDocument(); expect(screen.getByText('任务完成率：100%（1/1）')).toBeInTheDocument();
    result.rerender(<GoalEvidencePanel {...props} section="projects"/>);
    expect(screen.getByText('关联产品数：1 · 关联任务数：1')).toBeInTheDocument();
  });
});
