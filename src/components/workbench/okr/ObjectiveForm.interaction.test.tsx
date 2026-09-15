// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ObjectiveForm } from './ObjectiveForm';

describe('ObjectiveForm KR dragging', () => {
  it('starts dragging only after pressing the handle and moves the whole row', () => {
    render(<ObjectiveForm cycle="2026-09" ownerName="测试用户" parents={[]} busy={false} unavailable={false} root onCancel={vi.fn()} onSave={vi.fn(async () => true)}/>);
    fireEvent.change(screen.getByLabelText('KR1 名称'), { target: { value: '第一条' } });
    fireEvent.click(screen.getByRole('button', { name: '添加关键结果' }));
    fireEvent.change(screen.getByLabelText('KR2 名称'), { target: { value: '第二条' } });
    const firstRow = screen.getByLabelText('拖动 KR1');
    const secondRow = screen.getByLabelText('拖动 KR2');
    const dataTransfer = { setData: vi.fn(), getData: vi.fn(() => '0'), setDragImage: vi.fn(), effectAllowed: 'none' };

    fireEvent.pointerDown(screen.getByLabelText('KR1 名称'));
    fireEvent.dragStart(firstRow, { dataTransfer });
    expect(dataTransfer.setData).not.toHaveBeenCalled();

    fireEvent.pointerDown(firstRow);
    fireEvent.dragStart(firstRow, { dataTransfer });
    fireEvent.dragOver(secondRow, { dataTransfer });
    fireEvent.drop(secondRow, { dataTransfer });
    expect(dataTransfer.setData).toHaveBeenCalledWith('text/plain', '0');
    expect(screen.getByLabelText('KR1 名称')).toHaveValue('第二条');
    expect(screen.getByLabelText('KR2 名称')).toHaveValue('第一条');
  });
});
