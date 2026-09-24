// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import type { OkrRecord } from '../../services/okrRepository';
import type { OKRItem } from '../../types';

const objectiveRecord: OkrRecord = {
  id: 'objective-1',
  kind: 'objective',
  ownerId: 'boss',
  periodKey: '2026-09',
  status: 'active',
  version: 1,
  createdAt: '2026-09-01T08:00:00',
  payload: {
    title: '提升年度经营质量',
    progress: 30,
    keyResults: [{ id: 'a1', title: '改善重点客户交付', weight: 100, progress: 30, assigneeIds: ['manager'] }],
  },
};

const actionParent: OkrRecord = {
  id: 'parent-action',
  kind: 'action',
  ownerId: 'manager',
  periodKey: '2026-09',
  status: 'active',
  version: 1,
  payload: { title: '改善重点客户交付', parentObjectiveId: 'objective-1', parentActionId: 'a1' },
};

const okr: OKRItem = {
  id: 'objective-1',
  cycle: '2026-09',
  ownerId: 'boss',
  ownerName: '老板',
  department: '管理层',
  category: 'my',
  objective: '提升年度经营质量',
  weight: 100,
  progress: 30,
  deadline: '2026-09-30',
  status: 'active',
  keyResults: [{ id: 'a1', content: '改善重点客户交付', weight: 100, progress: 30, deadline: '2026-09-30' }],
};

const okrState = {
  records: [objectiveRecord],
  okrs: [okr],
  performances: [],
  people: [
    { id: 'boss', name: '老板', department: '管理层', supervisorId: null, rootFlag: 1, version: 1 },
    { id: 'manager', name: '主管', department: '产品部', supervisorId: 'boss', rootFlag: 0, version: 1 },
  ],
  work: [],
  actionParents: [actionParent],
  loading: false,
  error: undefined,
  workLoading: false,
  workError: undefined,
  busy: false,
  refresh: vi.fn(),
  refreshWork: vi.fn(),
  saveActions: vi.fn(async () => true),
  saveObjective: vi.fn(async () => true),
  saveObjectiveDraft: vi.fn(async () => true),
  saveReview: vi.fn(async () => true),
  saveReviewDraft: vi.fn(async () => true),
  submitReviewDraft: vi.fn(async () => true),
  submitOkrDraft: vi.fn(async () => true),
  updateOkr: vi.fn(async () => true),
};

vi.mock('./okr/useOriginalOkr', () => ({ useOriginalOkr: () => okrState }));
vi.mock('./okr/OkrProvider', () => ({ OkrProvider: ({ children }: { children: ReactNode }) => children }));
vi.mock('../../context/AppContext', () => ({
  useApp: () => ({ currentUser: { id: 'boss', name: '老板', department: '管理层' }, addToast: vi.fn() }),
  useAppNavigationContext: () => ({ openPageTab: vi.fn() }),
}));

import { appendDemoBreakdown, includeSelectedCycle, OKRPerformanceView } from './OKRPerformanceView';

describe('OKRPerformanceView target navigation', () => {
  beforeEach(() => vi.clearAllMocks());

  it('uses the new labels and clears detail or breakdown state when switching categories', async () => {
    const { container } = render(<OKRPerformanceView />);

    expect(screen.getByRole('tab', { name: /月度目标/ })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: '我的目标' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /拆解目标/ })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '查看详情' }));
    expect(await screen.findByRole('region', { name: '目标逐级承接关系' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: '直属上级目标' }));
    await waitFor(() => expect(screen.queryByRole('region', { name: '目标逐级承接关系' })).not.toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: /拆解目标/ }));
    await waitFor(() => expect(container.querySelector('.okr-action-breakdown-page[aria-label="拆解目标"]')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('tab', { name: '直属下级目标' }));
    await waitFor(() => expect(container.querySelector('.okr-action-breakdown-page[aria-label="拆解目标"]')).not.toBeInTheDocument());
  });

  it('keeps target creation and action breakdown editors mutually exclusive', async () => {
    const { container } = render(<OKRPerformanceView />);

    fireEvent.click(screen.getByRole('button', { name: /拆解目标/ }));
    await waitFor(() => expect(container.querySelector('.okr-action-breakdown-page')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: /添加目标/ }));
    await waitFor(() => expect(container.querySelector('.okr-action-breakdown-page')).not.toBeInTheDocument());
    expect(screen.getByLabelText('目标名称')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /拆解目标/ }));
    await waitFor(() => expect(container.querySelector('.okr-objective-form-stack')).not.toBeInTheDocument());
    expect(container.querySelector('.okr-action-breakdown-page')).toBeInTheDocument();
  });

  it('appends breakdown saves and keeps every saved month selected', () => {
    const august = { id: 'august-save', periodKey: '2026-08', mode: 'draft' as const, groups: [], savedAt: '2026-08-31T10:00:00Z' };
    const september = { id: 'september-save', periodKey: '2026-09', mode: 'draft' as const, groups: [], savedAt: '2026-09-30T10:00:00Z' };
    const secondSeptember = { ...september, id: 'september-save-2' };

    const saved = appendDemoBreakdown(appendDemoBreakdown(appendDemoBreakdown([], august), september), secondSeptember);
    expect(saved.map(item => item.id)).toEqual(['august-save', 'september-save', 'september-save-2']);
    expect(includeSelectedCycle(includeSelectedCycle(['2026-09'], '2026-08'), '2026-09')).toEqual(['2026-09', '2026-08']);
  });
});
