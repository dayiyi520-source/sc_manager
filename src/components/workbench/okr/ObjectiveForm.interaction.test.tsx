// @vitest-environment jsdom
import { createRef } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ObjectiveForm, type ObjectiveFormHandle } from './ObjectiveForm';

describe('ObjectiveForm A dragging', () => {
  it('starts dragging only after pressing the handle and moves the whole row', () => {
    render(<ObjectiveForm cycle="2026-09" ownerName="测试用户" parents={[]} busy={false} unavailable={false} root onCancel={vi.fn()} onSave={vi.fn(async () => true)}/>);
    fireEvent.change(screen.getByLabelText('A1 名称'), { target: { value: '第一条' } });
    fireEvent.click(screen.getByRole('button', { name: '继续添加' }));
    fireEvent.change(screen.getByLabelText('A2 名称'), { target: { value: '第二条' } });
    const firstRow = screen.getByLabelText('拖动 A1');
    const secondRow = screen.getByLabelText('拖动 A2');
    const dataTransfer = { setData: vi.fn(), getData: vi.fn(() => '0'), setDragImage: vi.fn(), effectAllowed: 'none' };

    fireEvent.pointerDown(screen.getByLabelText('A1 名称'));
    fireEvent.dragStart(firstRow, { dataTransfer });
    expect(dataTransfer.setData).not.toHaveBeenCalled();

    fireEvent.pointerDown(firstRow);
    fireEvent.dragStart(firstRow, { dataTransfer });
    fireEvent.dragOver(secondRow, { dataTransfer });
    fireEvent.drop(secondRow, { dataTransfer });
    expect(dataTransfer.setData).toHaveBeenCalledWith('text/plain', '0');
    expect(screen.getByLabelText('A1 名称')).toHaveValue('第二条');
    expect(screen.getByLabelText('A2 名称')).toHaveValue('第一条');
  });
});

describe('ObjectiveForm objective numbering', () => {
  it('shows the selected period calendar state instead of always showing active', () => {
    render(<ObjectiveForm cycle="2026-08" ownerName="测试用户" parents={[]} busy={false} unavailable={false} root onCancel={vi.fn()} onSave={vi.fn(async () => true)}/>);

    expect(screen.getByText('2026年08月').parentElement).toHaveTextContent('已结束');
  });

  it('shows the simplified target-and-action fields without alignment metadata', () => {
    render(<ObjectiveForm cycle="2026-09" ownerName="测试用户" parents={[]} busy={false} unavailable={false} root onCancel={vi.fn()} onSave={vi.fn(async () => true)}/>);

    expect(screen.getByLabelText('目标编号 O1')).toBeInTheDocument();
    expect(screen.getByLabelText('A1 名称')).toHaveAttribute('placeholder', '输入动作名称');
    expect(screen.getByRole('button', { name: '继续添加' })).toBeEnabled();
    expect(screen.getByRole('button', { name: /添加目标/ })).toBeEnabled();
    expect(screen.queryByRole('button', { name: '对齐目标' })).not.toBeInTheDocument();
    expect(screen.queryByLabelText('目标备注')).not.toBeInTheDocument();
    expect(screen.queryByText('个人级')).not.toBeInTheDocument();
    expect(screen.queryByText('测试用户')).not.toBeInTheDocument();
    expect(screen.queryByText('目标型')).not.toBeInTheDocument();
  });

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

    expect(screen.getByLabelText('目标编号 O2')).toHaveTextContent('O2');
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
    fireEvent.change(screen.getByLabelText('A1 名称'), { target: { value: '关键动作' } });
    view.rerender(<ObjectiveForm ref={ref} {...props} busy />);

    await act(async () => expect(await ref.current?.submit()).toBe(true));

    expect(onSave).toHaveBeenCalledOnce();
  });
});
