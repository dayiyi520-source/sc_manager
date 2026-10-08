// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { WorkItemFieldConfigurationPanel } from './WorkItemFieldConfigurationPanel';
import { productRepository, type WorkItemCategoryDefinition } from '../../services/productRepository';
import { mockApiRequest } from '../../services/mockApi';

vi.mock('../../services/teamRepository', () => ({ teamRepository: { options: vi.fn().mockResolvedValue([]) } }));
vi.mock('../../services/productRepository', () => ({ productRepository: { workItemFieldConfigurations: vi.fn(), saveWorkItemFieldConfigurations: vi.fn() } }));
const category = (code: string, displayName: string): WorkItemCategoryDefinition => ({ id: code, code, name: code, displayName, iconKey: 'dev', capabilityType: 'STANDARD', sort: 1, enabled: true, builtIn: false, revision: 0 });
const config = (code: string, label: string) => ({ categoryCode: code, scenes: [{ scene: 'CREATE', fields: [{ fieldCode: 'title', label, fieldType: 'text', visible: true, required: true, sort: 1, locked: true }] }] });
afterEach(() => { cleanup(); vi.clearAllMocks(); });
describe('dictionary custom category fields', () => {
  it('shows defect content and basic field groups and preserves hidden controls after refresh', async () => {
    localStorage.clear();
    vi.mocked(productRepository.workItemFieldConfigurations).mockImplementation((code) => mockApiRequest(`/api/work-item-field-configurations?categoryCode=${code}`));
    vi.mocked(productRepository.saveWorkItemFieldConfigurations).mockImplementation((code, scene, fields) => mockApiRequest(`/api/work-item-field-configurations/${code}/${scene}`, { method: 'PUT', body: JSON.stringify({ fields }) }));
    render(<WorkItemFieldConfigurationPanel categories={[category('bug', '缺陷任务')]} />);
    await screen.findByText('左侧内容字段');
    expect(screen.getByText('右侧基础字段')).toBeTruthy();
    const descriptionRow = screen.getByText('任务描述').closest('tr')!;
    fireEvent.click(descriptionRow.querySelector('input[type="checkbox"]')!);
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: /保存当前场景/ })); });
    await waitFor(() => expect(productRepository.saveWorkItemFieldConfigurations).toHaveBeenCalledWith('bug', 'CREATE', expect.arrayContaining([expect.objectContaining({ fieldCode: 'description', visible: false })])));
    fireEvent.click(screen.getByRole('button', { name: /刷新/ }));
    await screen.findByText('任务描述');
    await waitFor(() => expect((screen.getByText('任务描述').closest('tr')!.querySelector('input[type="checkbox"]') as HTMLInputElement).checked).toBe(false));
  });
  it('immediately shows newly supplied categories and saves by stable code', async () => {
    vi.mocked(productRepository.workItemFieldConfigurations).mockImplementation(async (code) => config(code, `${code}标题`) as any);
    const { rerender } = render(<WorkItemFieldConfigurationPanel categories={[category('requirement', '产品任务')]} />);
    await screen.findByText('requirement标题');
    rerender(<WorkItemFieldConfigurationPanel categories={[category('requirement', '产品任务'), category('ops_custom', '运维工作')]} />);
    fireEvent.click(screen.getByRole('tab', { name: '运维工作' }));
    await screen.findByText('ops_custom标题');
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: /保存当前场景/ })); });
    await waitFor(() => expect(productRepository.saveWorkItemFieldConfigurations).toHaveBeenCalledWith('ops_custom', 'CREATE', expect.any(Array)));
  });
  it('rejects stale results after switching category', async () => {
    let resolveOld!: (value: any) => void;
    vi.mocked(productRepository.workItemFieldConfigurations).mockImplementation((code) => code === 'requirement' ? new Promise((resolve) => { resolveOld = resolve; }) : Promise.resolve(config(code, '当前字段') as any));
    render(<WorkItemFieldConfigurationPanel categories={[category('requirement', '产品任务'), category('custom', '自定义')]} />);
    fireEvent.click(screen.getByRole('tab', { name: '自定义' }));
    await screen.findByText('当前字段');
    await act(async () => { resolveOld(config('requirement', '过期字段')); });
    await waitFor(() => expect(screen.queryByText('过期字段')).toBeNull());
    expect(screen.getByText('当前字段')).toBeTruthy();
  });
});
