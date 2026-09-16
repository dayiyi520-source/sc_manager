// @vitest-environment jsdom
import { createRef } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ObjectiveForm, type ObjectiveFormHandle } from './ObjectiveForm';

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

describe('ObjectiveForm objective numbering', () => {
  it('shows the objective position provided by the shared multi-objective card', () => {
    render(
      <ObjectiveForm
        cycle="2026-09"
        objectiveIndex={1}
        ownerName="测试用户"
        parents={[]}
        busy={false}
        unavailable={false}
        root={false}
        onCancel={vi.fn()}
        onSave={vi.fn().mockResolvedValue(true)}
      />,
    );

    expect(screen.getByRole('button', { name: '目标类型：目标型' })).toHaveTextContent('O2');
  });

  it('lets a locked parent batch continue through the imperative handle', async () => {
    const ref = createRef<ObjectiveFormHandle>();
    const onSave = vi.fn().mockResolvedValue(true);
    const props = {
      cycle: '2026-09',
      ownerName: '测试用户',
      parents: [],
      unavailable: false,
      root: false,
      onCancel: vi.fn(),
      onSave,
    };
    const view = render(<ObjectiveForm ref={ref} {...props} busy={false} />);
    fireEvent.change(screen.getByLabelText('目标名称'), { target: { value: '第二个目标' } });
    fireEvent.change(screen.getByLabelText('KR1 名称'), { target: { value: '关键结果' } });
    view.rerender(<ObjectiveForm ref={ref} {...props} busy />);

    await act(async () => expect(await ref.current?.submit()).toBe(true));

    expect(onSave).toHaveBeenCalledOnce();
  });
});
