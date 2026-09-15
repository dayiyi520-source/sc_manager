// @vitest-environment jsdom
import { useState } from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { OKRItem } from '../../../types';
import { ObjectiveAlignmentModal } from './ObjectiveAlignmentModal';

const parent: OKRItem = {
  id: 'o-parent', cycle: '2026-09', ownerId: 'boss', ownerName: '直属上级', department: '研发部', category: 'supervisor',
  objective: '提升项目交付质量', weight: 100, progress: 20, deadline: '2026-09-30', status: 'active',
  keyResults: [
    { id: 'kr-1', content: '关键项目按期交付', progress: 10, weight: 60, deadline: '2026-09-30' },
    { id: 'kr-2', content: '降低线上缺陷率', progress: 30, weight: 40, deadline: '2026-09-30' },
  ],
};

function Harness({ parents = [parent] }: { parents?: OKRItem[] }) {
  const [selected, setSelected] = useState<string[]>([]);
  return <ObjectiveAlignmentModal open parents={parents} selectedValues={selected} search="" category="supervisor" onSearchChange={vi.fn()} onCategoryChange={vi.fn()} onSelectionChange={setSelected} onCancel={vi.fn()} onConfirm={vi.fn()}/>;
}

describe('ObjectiveAlignmentModal', () => {
  it('shows all navigation types and both empty states', () => {
    render(<Harness parents={[]}/>);
    ['我的 OKR', '直属上级', '直属下级', '我部门的'].forEach(label => expect(screen.getByRole('button', { name: label })).toBeInTheDocument());
    expect(screen.getByRole('button', { name: '与我关联' })).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('button', { name: '我对齐的' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '与我关联' }));
    expect(screen.getByRole('button', { name: '与我关联' })).toHaveAttribute('aria-expanded', 'true');
    ['我对齐的', '对齐我的', '@我的'].forEach(label => expect(screen.getByRole('button', { name: label })).toBeInTheDocument());
    expect(screen.getAllByText('暂无数据')).toHaveLength(2);
  });

  it('adds one card, adjusts its KR and removes it', () => {
    render(<Harness/>);
    fireEvent.click(screen.getByRole('radio', { name: /提升项目交付质量/ }));
    const remove = screen.getByRole('button', { name: '删除对齐目标：提升项目交付质量' });
    const selectedCard = remove.closest('.okr-alignment-objective-card') as HTMLElement;
    fireEvent.click(within(selectedCard).getByRole('radio', { name: /KR2.*降低线上缺陷率/ }));
    expect(within(selectedCard).getByRole('radio', { name: /KR2.*降低线上缺陷率/ })).toBeChecked();
    fireEvent.click(remove);
    expect(screen.queryByRole('button', { name: '删除对齐目标：提升项目交付质量' })).not.toBeInTheDocument();
    expect(screen.getByText('暂无数据')).toBeInTheDocument();
  });
});
