// @vitest-environment jsdom
import { createRef } from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ObjectiveForm, type ObjectiveFormHandle } from './ObjectiveForm';

describe('ObjectiveForm A dragging', () => {
  it('starts dragging only after pressing the handle and moves the whole row', () => {
    render(<ObjectiveForm cycle="2026-09" ownerName="测试用户" parents={[]} busy={false} unavailable={false} root onCancel={vi.fn()} onSave={vi.fn(async () => true)}/>);
    fireEvent.change(screen.getByLabelText('A1 名称'), { target: { value: '第一条' } });
    fireEvent.click(screen.getByRole('button', { name: '添加动作' }));
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
  it('confirms removal of an added challenge objective and keeps cancellation unchanged', async () => {
    const onRemove = vi.fn();
    render(<ObjectiveForm cycle="2026-09" objectiveIndex={1} ownerName="测试用户" parents={[]} busy={false} unavailable={false} root chrome={false} onCancel={vi.fn()} onRemove={onRemove} onSave={vi.fn(async () => true)}/>);
    expect(screen.getByLabelText('目标编号 O2')).toHaveTextContent('TO2');
    fireEvent.click(screen.getByRole('button', { name: '删除新增目标 O2' }));
    expect(onRemove).not.toHaveBeenCalled();
    fireEvent.click(await screen.findByRole('button', { name: /^取\s*消$/ }));
    expect(onRemove).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: '删除新增目标 O2' }));
    fireEvent.click(await screen.findByRole('button', { name: /^删\s*除$/ }));
    await waitFor(() => expect(onRemove).toHaveBeenCalledTimes(1));
  });

  it('shows the selected period calendar state instead of always showing active', () => {
    render(<ObjectiveForm cycle="2026-08" ownerName="测试用户" parents={[]} busy={false} unavailable={false} root onCancel={vi.fn()} onSave={vi.fn(async () => true)}/>);

    expect(screen.getByText('2026年08月').parentElement).toHaveTextContent('已结束');
  });

  it('shows company metadata and defaults to a committed objective aligned to the period', () => {
    render(<ObjectiveForm cycle="2026-09" ownerName="测试用户" parents={[]} busy={false} unavailable={false} root onCancel={vi.fn()} onSave={vi.fn(async () => true)}/>);

    expect(screen.getByLabelText('目标编号 O1')).toBeInTheDocument();
    expect(screen.getByLabelText('A1 名称')).toHaveAttribute('placeholder', '输入动作名称：要写工作结果（做到什么），不能只写动作描述（做什么）');
    expect(screen.getByRole('button', { name: '添加动作' })).toBeEnabled();
    expect(screen.getByRole('button', { name: /添加目标/ })).toBeEnabled();
    expect(screen.queryByRole('button', { name: '对齐目标' })).not.toBeInTheDocument();
    expect(screen.queryByLabelText('目标备注')).not.toBeInTheDocument();
    expect(screen.getByLabelText('目标名称')).toHaveAttribute('placeholder', '输入目标名称：明确你要达成什么，不写含糊概括的目标');
    expect(screen.getByText('2026年09月目标')).toBeInTheDocument();
    expect(screen.getByText('公司级')).toBeInTheDocument();
    expect(screen.getByText('测试...')).toBeInTheDocument();
    expect(screen.getByLabelText('目标编号 O1')).toHaveTextContent('CO1');
    expect(screen.queryByText('个人级')).not.toBeInTheDocument();
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
      initialPayload: { title: '第二个目标', keyResults: [{ id: 'a1', title: '关键动作', deadline: '2026-09-30', weight: 100, progress: 0 }] },
    };
    const view = render(<ObjectiveForm ref={ref} {...props} busy={false} />);
    fireEvent.change(screen.getByLabelText('目标名称'), { target: { value: '第二个目标' } });
    fireEvent.change(screen.getByLabelText('A1 名称'), { target: { value: '关键动作' } });
    view.rerender(<ObjectiveForm ref={ref} {...props} busy />);

    await act(async () => expect(await ref.current?.submit()).toBe(true));

    expect(onSave).toHaveBeenCalledOnce();
  });
});

describe('ObjectiveForm submission requirements', () => {
  it.each([
    { title: '   ', actionTitle: '动作', deadline: '2026-09-30', weight: 100 },
    { title: '目标', actionTitle: '   ', deadline: '2026-09-30', weight: 100 },
    { title: '目标', actionTitle: '动作', deadline: undefined, weight: 100 },
    { title: '目标', actionTitle: '动作', deadline: '2026-02-30', weight: 100 },
    { title: '目标', actionTitle: '动作', deadline: '2026-09-30', weight: 0 },
    { title: '目标', actionTitle: '动作', deadline: '2026-09-30', weight: 99.5 },
  ])('blocks incomplete or invalid submissions: %j', async ({ title, actionTitle, deadline, weight }) => {
    const ref = createRef<ObjectiveFormHandle>();
    const onSave = vi.fn(async () => true);
    render(<ObjectiveForm ref={ref} cycle="2026-09" ownerName="测试用户" parents={[]} busy={false} unavailable={false} root onCancel={vi.fn()} onSave={onSave} initialPayload={{ title, keyResults: [{ id: 'a1', title: actionTitle, deadline, weight, progress: 0 }] }} />);
    await act(async () => expect(await ref.current?.submit()).toBe(false));
    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('defaults appended company objectives to TO and preserves independent O weight on submission', async () => {
    const ref = createRef<ObjectiveFormHandle>();
    const onSave = vi.fn(async () => true);
    render(<ObjectiveForm ref={ref} cycle="2026-10" objectiveIndex={1} ownerName="测试用户" parents={[]} busy={false} unavailable={false} root onCancel={vi.fn()} onSave={onSave}/>);
    expect(screen.getByLabelText('目标编号 O2')).toHaveTextContent('TO2');
    fireEvent.change(screen.getByLabelText('目标名称'), {target:{value:'挑战目标'}});
    fireEvent.change(screen.getByLabelText('A1 名称'), {target:{value:'交付成果'}});
    fireEvent.change(screen.getByLabelText('目标权重'), {target:{value:'35'}});
    fireEvent.change(screen.getByLabelText('A1 截止日期'), {target:{value:'2026-10-31'}});
    fireEvent.keyDown(screen.getByLabelText('A1 截止日期'), {key:'Enter',code:'Enter'});
    await act(async () => { await ref.current?.submit(); });
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({objectiveType:'challenge',weight:35,keyResults:[expect.objectContaining({weight:100})]}));
  });

  it('retains a saved TO type, note and O weight when editing a draft', async () => {
    const ref = createRef<ObjectiveFormHandle>();
    const onSaveDraft = vi.fn(async () => true);
    render(<ObjectiveForm ref={ref} cycle="2026-10" ownerName="测试用户" parents={[]} busy={false} unavailable={false} root onCancel={vi.fn()} onSave={vi.fn()} onSaveDraft={onSaveDraft} initialPayload={{title:'已有目标',objectiveType:'challenge',weight:40,note:'已有说明',keyResults:[{id:'a',title:'成果',weight:100,progress:60}]}}/>);
    await act(async () => { await ref.current?.saveDraft(); });
    expect(onSaveDraft).toHaveBeenCalledWith(expect.objectContaining({objectiveType:'challenge',weight:40,note:'已有说明',keyResults:[expect.objectContaining({progress:60})]}));
  });

  it('clears the derived O deadline when the last A deadline is removed from a draft', async () => {
    const ref = createRef<ObjectiveFormHandle>();
    const onSaveDraft = vi.fn(async () => true);
    render(<ObjectiveForm ref={ref} cycle="2026-10" ownerName="测试用户" parents={[]} busy={false} unavailable={false} root onCancel={vi.fn()} onSave={vi.fn()} onSaveDraft={onSaveDraft} initialPayload={{title:'草稿目标',deadline:'2026-10-31',keyResults:[{id:'a',title:'成果',deadline:'2026-10-31',weight:100,progress:0}]}}/>);
    const clear = screen.getByLabelText('A1 截止日期').closest('.ant-picker')?.querySelector('.ant-picker-clear');
    expect(clear).not.toBeNull();
    fireEvent.click(clear!);
    await act(async () => { await ref.current?.saveDraft(); });
    expect(onSaveDraft).toHaveBeenCalledWith(expect.objectContaining({deadline:undefined,keyResults:[expect.objectContaining({deadline:undefined})]}));
  });

  it('keeps draft saving available without a deadline', async () => {
    const ref = createRef<ObjectiveFormHandle>();
    const onSaveDraft = vi.fn(async () => true);
    render(<ObjectiveForm ref={ref} cycle="2026-09" ownerName="测试用户" parents={[]} busy={false} unavailable={false} root onCancel={vi.fn()} onSave={vi.fn()} onSaveDraft={onSaveDraft} initialPayload={{ title: '草稿目标', keyResults: [{ id: 'a1', title: '', weight: 100, progress: 0 }] }} />);
    await act(async () => expect(await ref.current?.saveDraft()).toBe(true));
    expect(onSaveDraft).toHaveBeenCalledOnce();
  });
});

describe('ObjectiveForm assignee search', () => {
  it('filters assignees by the displayed member name', async () => {
    render(
      <ObjectiveForm
        cycle="2026-09"
        ownerName="林志豪"
        parents={[]}
        people={[{ id: 'user-product', name: '陈宇璋', department: '产品规划部' }]}
        busy={false}
        unavailable={false}
        root
        onCancel={vi.fn()}
        onSave={vi.fn(async () => true)}
      />,
    );

    const assigneeSelect = screen.getByLabelText('A1 承接人员');
    fireEvent.mouseDown(assigneeSelect);
    fireEvent.change(assigneeSelect, { target: { value: '陈' } });

    expect(await screen.findByText('陈宇璋 · 产品规划部')).toBeInTheDocument();
  });
});



describe('assigned supervisor actions', () => {
  const source = {id:'source-a',kind:'action' as const,ownerId:'manager',periodKey:'2026-09',status:'active',version:0,payload:{title:'上级产研动作',deadline:'2026-09-25',parentObjectiveId:'parent',parentKeyResultId:'source-a'}};
  const people = [{id:'manager',name:'陈宇璋',department:'产品部',jobTitle:'产品主管',rootFlag:0,version:0}];
  it('blocks submission when no assigned action exists', async()=>{
    const ref=createRef<ObjectiveFormHandle>(); const onSave=vi.fn();
    render(<ObjectiveForm ref={ref} cycle="2026-09" ownerName="毛景强" goalLevel="个人级" parents={[]} busy={false} unavailable={false} root={false} supervisor onCancel={vi.fn()} onSave={onSave}/>);
    expect(screen.getByText('暂无需要承接的动作')).toBeInTheDocument();
    expect(screen.getByRole('button',{name:/提\s*交/})).toBeDisabled();
    await act(async()=>{expect(await ref.current?.submit()).toBe(false);});
    expect(onSave).not.toHaveBeenCalled();
  });
  it('rejects saved dates beyond the upper action deadline for both save paths',async()=>{
    const ref=createRef<ObjectiveFormHandle>(); const onSave=vi.fn(); const onSaveDraft=vi.fn();
    render(<ObjectiveForm ref={ref} cycle="2026-09" ownerName="毛景强" goalLevel="个人级" parents={[]} people={people} alignmentActions={[source]} busy={false} unavailable={false} root={false} supervisor onCancel={vi.fn()} onSave={onSave} onSaveDraft={onSaveDraft} initialPayload={{title:'个人目标',parentObjectiveId:'parent',keyResults:[{id:'a',title:'动作',deadline:'2026-09-26',weight:100,progress:0}]}}/>);
    expect(screen.getByText(/上级产研动作——来源于上级陈宇璋/)).toBeInTheDocument();
    await act(async()=>{expect(await ref.current?.submit()).toBe(false);expect(await ref.current?.saveDraft()).toBe(false);});
    expect(screen.getByText(/不能超过上级动作截止日期 2026-09-25/)).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();expect(onSaveDraft).not.toHaveBeenCalled();
  });
  it('defaults the first objective to CO after switching into an assigned cycle',async()=>{
    const ref=createRef<ObjectiveFormHandle>();
    const props={ownerName:'毛景强',parents:[],people,busy:false,unavailable:false,root:false,supervisor:true,onCancel:vi.fn(),onSave:vi.fn()};
    const view=render(<ObjectiveForm ref={ref} {...props} cycle="2026-10" alignmentActions={[]}/>);
    expect(ref.current?.snapshot().objectiveType).toBe('challenge');
    view.rerender(<ObjectiveForm ref={ref} {...props} cycle="2026-09" alignmentActions={[source]}/>);
    expect(ref.current?.snapshot().objectiveType).toBe('target');
  });
});
