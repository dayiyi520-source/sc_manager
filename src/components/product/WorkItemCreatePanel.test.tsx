// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { WorkItemCreatePanel } from './WorkItemCreatePanel';

describe('协同事项内新建任务', () => {
  it('将新建面板显示在事项详情抽屉上方', () => {
    render(<WorkItemCreatePanel isOpen title="新建任务" onClose={vi.fn()} zIndex={1001}><p>任务表单</p></WorkItemCreatePanel>);
    expect(screen.getByRole('dialog', { name: '新建任务' })).toHaveStyle({ zIndex: 1001 });
    expect(screen.getByText('任务表单')).toBeVisible();
  });
});
