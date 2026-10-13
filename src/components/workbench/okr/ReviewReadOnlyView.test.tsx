// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { PerformanceReview } from '../../../types';
import { ReviewReadOnlyView } from './ReviewReadOnlyView';

const review: PerformanceReview & { authorId: string } = {
  id: 'review-1', authorId: 'user-admin', type: 'week', cycleName: '2026年第37周', author: '林志豪',
  authorDept: '平台架构部', summary: '完成核心流程验收', uncompletedReason: '', selfScore: 90,
  nextWeekPlan: '下周完成验证', suggestions: '', helpNeeded: '', sendTo: [], createdAt: '2026-09-13 18:30', status: 'reviewed',
  feedback: '继续保持', leaderScore: 92,
  krReviews: [{ objectiveId: 'o-1', objectiveTitle: '平台目标', keyResultId: 'kr-1', keyResultTitle: '核心流程稳定', previousProgress: 40, currentProgress: 80, health: 'normal', achievement: '完成回归', blocker: '', nextPlan: '补齐自动化', workIds: [] }],
  assistance: [{ subject: '产品团队', result: '完成验收口径统一' }],
  extraWork: { workIds: [], description: '处理环境问题', impact: 'support' },
};

describe('ReviewReadOnlyView', () => {
  it('renders a read-only detail and exposes back and copy actions', () => {
    const onBack = vi.fn();
    const onCopy = vi.fn();
    render(<ReviewReadOnlyView review={review} onBack={onBack} onCopy={onCopy} />);

    expect(screen.getByRole('heading', { name: '2026年第37周' })).toBeInTheDocument();
    expect(screen.getByText('处理环境问题')).toBeInTheDocument();
    expect(screen.getByText('完成核心流程验收')).toBeInTheDocument();
    expect(screen.getByText('下周完成验证')).toBeInTheDocument();
    expect(screen.getByText('完成回归')).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();

    expect(screen.queryByRole('button', { name: '返回复盘列表' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '取消' }));
    fireEvent.click(screen.getByRole('button', { name: '复制为本期' }));
    expect(onBack).toHaveBeenCalledOnce();
    expect(onCopy).toHaveBeenCalledOnce();
  });

  it('formats stored manual extra work instead of exposing its JSON representation', () => {
    render(<ReviewReadOnlyView review={{ ...review, extraWork: { workIds: [], impact: 'none', description: '[{"content":"临时出差","source":"手工记录","status":"已完成","hours":"2","impact":"block"}]' } }} onBack={vi.fn()} onCopy={vi.fn()} />);

    expect(screen.getByText('临时出差')).toBeInTheDocument();
    expect(screen.getByText('已完成 · 2 小时')).toBeInTheDocument();
    expect(screen.queryByText(/挤占 KR 投入/)).not.toBeInTheDocument();
    expect(screen.queryByText(/"content":"临时出差"/)).not.toBeInTheDocument();
  });
  it('displays persisted knowledge content in submitted detail', () => {
    render(<ReviewReadOnlyView review={{ ...review, knowledgeEntries: [{ id: 'knowledge-1', title: '排查经验', category: '产研规范', summary: '排查摘要', content: '检查告警及日志' }] }} onBack={vi.fn()} onCopy={vi.fn()}/>);
    expect(screen.getByText('排查经验')).toBeInTheDocument();
    expect(screen.getByText('检查告警及日志')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /删除知识/ })).not.toBeInTheDocument();
  });

  it('shows monthly metrics and suggestions without historical impact', () => {
    render(<ReviewReadOnlyView review={{ ...review, type: 'month', suggestions: '改进建议', monthlyMetrics: { taskCount: 2, collaborationCount: 1, totalHours: 12 } }} onBack={vi.fn()} onCopy={vi.fn()}/>);
    expect(screen.queryByText('对 OKR 的影响：支持 KR')).not.toBeInTheDocument();
    for (const title of ['本月整体进度', '本月任务', '协同事项', '总工时', '加班时长', '遇到的问题或者建议', '需要协助事项']) expect(screen.getByText(title)).toBeInTheDocument();
    expect(screen.getByText('12 小时')).toBeInTheDocument();
    expect(screen.getByText('改进建议')).toBeInTheDocument();
  });

});
