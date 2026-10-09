/* @vitest-environment jsdom */
import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import dayjs from 'dayjs';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CreateVersionModal, isEndDateDisabled, shouldClearEndDate, VERSION_RELEASE_NOTES_PLACEHOLDER } from './CreateVersionModal';

const mocks = vi.hoisted(() => ({
  addVersion: vi.fn().mockResolvedValue(true),
  updateVersion: vi.fn().mockResolvedValue(true),
  addToast: vi.fn(),
}));

vi.mock('../../context/AppContext', () => ({
  useApp: () => ({
    ...mocks,
    productLines: [{ id: 'line-1', name: '协同产品', code: 'PL-01', ownerName: '林志豪', members: [{ id: 'member-1', userId: 'user-1', name: '林志豪', role: '管理员' }] }],
  }),
}));

vi.mock('../../services/teamRepository', () => ({
  teamRepository: { options: vi.fn().mockResolvedValue([{ id: 'user-1', name: '林志豪', department: '产品研发部', jobTitle: '产品经理' }, { id: 'user-2', name: '不属于产品线成员', department: '产品研发部' }]) },
}));

describe('CreateVersionModal', () => {
  it('creates a pending iteration without a publication date', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<QueryClientProvider client={queryClient}><CreateVersionModal isOpen productLine={{ id: 'line-1', name: '协同产品', ownerName: '林志豪' }} onClose={vi.fn()} /></QueryClientProvider>);
    fireEvent.change(screen.getByPlaceholderText('请输入版本名称'), { target: { value: '新迭代' } });
    fireEvent.change(screen.getByPlaceholderText('请输入版本号'), { target: { value: 'V2.0.0' } });
    fireEvent.submit(document.querySelector('#create-version-form')!);
    await waitFor(() => expect(mocks.addVersion).toHaveBeenCalledWith(expect.objectContaining({ status: '待开始', statusPhase: '待开始' })));
    expect(mocks.addVersion.mock.lastCall![0]).not.toHaveProperty('releaseDate');
    mocks.addVersion.mockClear();
  });
  it('requires a product line and exposes the agreed release-note example', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<QueryClientProvider client={queryClient}><CreateVersionModal isOpen onClose={vi.fn()} /></QueryClientProvider>);

    expect(screen.getAllByText(/所属产品/)[0]).toHaveTextContent('*');
    expect(screen.getByRole('combobox', { name: '版本负责人' })).toBeDisabled();
    expect(screen.getByText('请先选择所属产品')).toBeInTheDocument();
    expect(document.querySelector('textarea')).toHaveAttribute('placeholder', VERSION_RELEASE_NOTES_PLACEHOLDER);
    fireEvent.submit(document.querySelector('#create-version-form')!);

    await waitFor(() => expect(mocks.addToast).toHaveBeenCalledWith('warning', '请选择所属产品'));
    expect(mocks.addVersion).not.toHaveBeenCalled();
  });

  it('clears an end date when the start date moves beyond it', () => {
    expect(shouldClearEndDate('2026-09-25', '2026-09-20')).toBe(true);
    expect(shouldClearEndDate('2026-09-20', '2026-09-20')).toBe(false);
    expect(shouldClearEndDate('2026-09-01', '')).toBe(false);
  });

  it('limits version owners to the selected product line members', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<QueryClientProvider client={queryClient}><CreateVersionModal isOpen productLine={{ id: 'line-1', name: '协同产品', code: 'PL-01', description: '', ownerName: '林志豪', members: [{ id: 'member-1', userId: 'user-1', name: '林志豪', role: '管理员' }] }} onClose={vi.fn()} /></QueryClientProvider>);
    const ownerSelect = await screen.findByRole('combobox', { name: '版本负责人' });
    fireEvent.mouseDown(ownerSelect);
    await waitFor(() => expect(screen.getByRole('option', { name: '林志豪 · 产品经理' })).toBeInTheDocument());
    expect(screen.queryByRole('option', { name: '不属于产品线成员' })).not.toBeInTheDocument();
  });

  it('disables end dates before the selected start date', () => {
    expect(isEndDateDisabled(dayjs('2026-09-09'), '2026-09-10')).toBe(true);
    expect(isEndDateDisabled(dayjs('2026-09-10'), '2026-09-10')).toBe(false);
    expect(isEndDateDisabled(dayjs('2026-09-09'), '')).toBe(false);
  });
});
