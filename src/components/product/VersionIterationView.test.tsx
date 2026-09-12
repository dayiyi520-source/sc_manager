/* @vitest-environment jsdom */
import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { VersionIterationView } from './VersionIterationView';

const appMocks = vi.hoisted(() => ({
  assignRequirementToVersion: vi.fn().mockResolvedValue(true),
  addToast: vi.fn(),
  deleteVersion: vi.fn(),
  updateVersion: vi.fn().mockResolvedValue(true),
  showDeleteConfirm: vi.fn(),
}));

vi.mock('../../context/AppContext', () => ({
  useApp: () => ({
    versions: [{
      id: 'version-1',
      code: 'V1.2.0',
      name: '秋季迭代',
      ownerName: '张瑞',
      productLineId: 'line-1',
      productLineName: '协同产品线',
      startDate: '2026-09-01',
      endDate: '2026-09-30',
      status: '迭代中',
      requirementsCount: 1,
      completedReqCount: 0,
    }],
    productLines: [{ id: 'line-1', name: '协同产品线' }],
    requirementTasks: [{
      id: 'requirement-1',
      code: 'REQ-001',
      title: '支持版本规划拖拽',
      status: '待处理',
      priority: '高',
      ownerName: '李明',
      versionName: '',
      productLineId: 'line-1',
      productLineName: '协同产品线',
      estimatedHours: 8,
      dueDate: '2026-09-20',
    }, {
      id: 'requirement-2',
      code: 'REQ-002',
      title: '已纳入迭代的工作项',
      status: '已完成',
      priority: '中',
      ownerName: '王丽',
      versionId: 'version-1',
      versionName: '秋季迭代',
      productLineId: 'line-1',
      productLineName: '协同产品线',
      estimatedHours: 5,
      actualHours: 4,
    }],
    devTasks: [],
    bugs: [],
    deleteVersion: appMocks.deleteVersion,
    assignRequirementToVersion: appMocks.assignRequirementToVersion,
    addToast: appMocks.addToast,
    addVersion: vi.fn().mockResolvedValue(true),
    updateVersion: appMocks.updateVersion,
  }),
}));

vi.mock('./CreateVersionModal', () => ({ CreateVersionModal: ({ isOpen, productLine }: { isOpen: boolean; productLine?: { id: string } }) => isOpen ? <div role="dialog" aria-label="创建迭代版本">产品线：{productLine?.id || '未选择'}</div> : null }));
vi.mock('./WorkItemCreatePanel', () => ({ WorkItemCreatePanel: ({ isOpen, title }: { isOpen: boolean; title: string }) => isOpen ? <div role="dialog" aria-label={title}>{title}</div> : null }));
vi.mock('../common/Feedback', () => ({ showDeleteConfirm: appMocks.showDeleteConfirm }));

describe('VersionIterationView', () => {
  beforeEach(() => {
    appMocks.assignRequirementToVersion.mockClear();
    appMocks.addToast.mockClear();
    appMocks.deleteVersion.mockClear();
    appMocks.updateVersion.mockClear();
    appMocks.showDeleteConfirm.mockClear();
    sessionStorage.clear();
  });

  it('uses two first-level entries and keeps details as a list drill-down', async () => {
    render(<VersionIterationView />);

    expect(screen.getByRole('button', { name: '迭代列表' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '迭代规划' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '详情' })).not.toBeInTheDocument();
    expect(screen.getByText('版本号')).toBeInTheDocument();
    expect(screen.getByText('V1.2.0')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '秋季迭代' }));
    expect(screen.queryByRole('button', { name: '返回迭代列表' })).not.toBeInTheDocument();
    expect(screen.getByText('张瑞')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '迭代工时' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /工作项/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '测试用例' })).toBeInTheDocument();
    expect(screen.getByText('工作项分布')).toBeInTheDocument();
    expect(screen.getByText('工作项排名')).toBeInTheDocument();
    expect(screen.getByText('工时排名')).toBeInTheDocument();
    expect(screen.getAllByText('王丽')).toHaveLength(2);

    fireEvent.click(screen.getByRole('button', { name: /工作项/ }));
    expect(screen.getByText('已纳入迭代的工作项')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '已纳入迭代的工作项' }));
    expect(screen.getByRole('dialog', { name: '需求详情' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '完成迭代' }));
    await waitFor(() => expect(appMocks.updateVersion).toHaveBeenCalledWith('version-1', { status: '已完成' }));
  });

  it('persists a dragged work item into the target iteration', async () => {
    render(<VersionIterationView />);
    fireEvent.click(screen.getByRole('button', { name: '迭代规划' }));

    const values = new Map<string, string>();
    const dataTransfer = {
      effectAllowed: 'none',
      dropEffect: 'none',
      setData: (type: string, value: string) => values.set(type, value),
      getData: (type: string) => values.get(type) || '',
    };
    const workItem = screen.getByLabelText('拖动工作项：支持版本规划拖拽');
    const targetIteration = screen.getByLabelText('迭代版本：秋季迭代');

    fireEvent.dragStart(workItem, { dataTransfer });
    fireEvent.dragOver(targetIteration, { dataTransfer });
    expect(screen.getByText('释放后加入该迭代')).toBeInTheDocument();
    fireEvent.drop(targetIteration, { dataTransfer });

    await waitFor(() => expect(appMocks.assignRequirementToVersion).toHaveBeenCalledWith('requirement-1', 'version-1'));
    expect(appMocks.addToast).toHaveBeenCalledWith('success', '工作项已加入迭代', '支持版本规划拖拽 → 秋季迭代');
  });

  it('keeps the selected product line in detail context and defaults create to it', () => {
    render(<VersionIterationView />);
    fireEvent.click(screen.getByRole('button', { name: '秋季迭代' }));

    expect(screen.getByRole('combobox', { name: '产品线筛选' })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: '进入规划' })).toHaveLength(1);
    const createButton = screen.getByLabelText('新建迭代');
    expect(createButton.className).toContain('text-[var(--primary)]');
    fireEvent.click(createButton);
    expect(screen.getByRole('dialog', { name: '创建迭代版本' })).toHaveTextContent('产品线：line-1');
  });

  it('uses the themed Ant Design confirmation instead of a native browser dialog', () => {
    render(<VersionIterationView />);
    fireEvent.click(screen.getByRole('button', { name: '删除' }));

    expect(appMocks.showDeleteConfirm).toHaveBeenCalledWith(expect.objectContaining({
      title: '确认删除迭代“秋季迭代”？',
      content: '删除后不可恢复，请确认是否继续。',
      onOk: expect.any(Function),
    }));
  });

  it('keeps bulk selection in the work-item header and opens task details as a drawer', () => {
    render(<VersionIterationView />);
    fireEvent.click(screen.getByRole('button', { name: '迭代规划' }));

    expect(screen.getByRole('checkbox', { name: '全选待规划工作项' })).toBeInTheDocument();
    expect(screen.getByText('可拖动到右侧迭代')).toBeInTheDocument();
    const planningHeading = screen.getByText('待规划工作项 · 1').parentElement;
    expect(planningHeading).toHaveClass('items-center');
    expect(planningHeading).not.toHaveClass('justify-center');

    fireEvent.click(screen.getByRole('button', { name: '支持版本规划拖拽' }));
    expect(screen.getByRole('dialog', { name: '需求详情' })).toBeInTheDocument();
  });

  it('collapses the planning filter when clicking outside and highlights active filter/search icons', () => {
    render(<VersionIterationView />);
    fireEvent.click(screen.getByRole('button', { name: '迭代规划' }));
    fireEvent.click(screen.getByRole('button', { name: '过滤待规划工作项' }));

    expect(screen.getByTestId('planning-filter-panel')).toBeInTheDocument();
    expect(screen.getByText('工作项类型')).toHaveClass('text-[var(--text-muted)]');
    const filterButton = screen.getByRole('button', { name: '过滤待规划工作项' });
    expect(filterButton.className).toContain('text-[var(--primary)]');

    fireEvent.click(document.body);
    expect(screen.queryByTestId('planning-filter-panel')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '搜索待规划工作项' }));
    fireEvent.change(screen.getByPlaceholderText('输入关键词'), { target: { value: '拖拽' } });
    expect(screen.getByRole('button', { name: '搜索待规划工作项' }).className).toContain('text-[var(--primary)]');
  });
});
