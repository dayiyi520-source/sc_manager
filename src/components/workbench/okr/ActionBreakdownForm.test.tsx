// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import dayjs from 'dayjs';
import { describe, expect, it, vi } from 'vitest';
import { ActionBreakdownForm } from './ActionBreakdownForm';
import type { OkrPerson, OkrRecord } from '../../../services/okrRepository';

const people: OkrPerson[] = [
  { id: 'boss', name: '张总', department: '管理层', supervisorId: null, rootFlag: 1, version: 0 },
  { id: 'me', name: '产品主管', department: '产研部门', supervisorId: 'boss', rootFlag: 0, version: 0 },
  { id: 'staff', name: '李工', department: '软件研发部', supervisorId: 'me', rootFlag: 0, version: 0 },
];

const titles = ['推进平台智能化能力建设', '保障重点项目稳定交付', '提升客户满意度'];
const parents: OkrRecord[] = titles.map((title, index) => ({
  id: `parent-${index + 1}`,
  kind: 'action',
  ownerId: 'boss',
  periodKey: dayjs().format('YYYY-MM'),
  status: 'active',
  version: 0,
  payload: { title, parentObjectiveId: `objective-${index + 1}`, parentActionId: `parent-${index + 1}` },
}));

const renderForm = () => render(<ActionBreakdownForm open cycle={dayjs().format('YYYY-MM')} person={people[1]} parents={parents} actions={[]} people={people} productLineOptions={['真实产品线']} projectOptions={['真实交付项目']} busy={false} onClose={vi.fn()} onSave={vi.fn(async () => true)} />);

describe('ActionBreakdownForm', () => {
  it('shows dynamic month choices, three untouched parent targets, and source names', () => {
    renderForm();

    expect(screen.getByTitle(dayjs().format('YYYY年MM月'))).toBeInTheDocument();
    expect(screen.queryByText('进行中')).not.toBeInTheDocument();
    titles.forEach(title => expect(screen.getByText(title)).toBeInTheDocument());
    expect(screen.getAllByText('来源自上级 · 张总')).toHaveLength(3);
    expect(screen.getByLabelText('O1 来源承接权重')).toHaveValue('34');
    expect(screen.getByLabelText('O2 来源承接权重')).toHaveValue('33');
    expect(screen.getByLabelText('O3 来源承接权重')).toHaveValue('33');
    expect(screen.getByText('来源承接权重合计 100%')).toBeInTheDocument();
    expect(screen.getAllByText('暂无行动，点击右侧图标开始拆解')).toHaveLength(3);
    expect(screen.queryByText('A1')).not.toBeInTheDocument();

    fireEvent.mouseDown(screen.getByLabelText('目标归属周期'));
    const options = Array.from(document.querySelectorAll('.ant-select-item-option-content')).map(item => item.textContent);
    expect(options).toEqual([
      dayjs().add(1, 'month').format('YYYY年MM月'),
      dayjs().format('YYYY年MM月'),
      dayjs().subtract(1, 'month').format('YYYY年MM月'),
    ]);
  });

  it('opens A1 explicitly and uses different fields for O1, O2, and O3', () => {
    renderForm();

    const expectPeriodActions = () => {
      expect(screen.getByRole('button', { name: /取\s*消/ })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '存草稿' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /提\s*交/ })).toBeInTheDocument();
    };

    fireEvent.click(screen.getByRole('button', { name: '拆解 O1' }));
    expectPeriodActions();
    expect(screen.getByText('A1')).toBeInTheDocument();
    expect(screen.getByLabelText('A1 关联产品线')).toBeInTheDocument();
    fireEvent.mouseDown(screen.getByLabelText('A1 关联产品线'));
    expect(screen.getAllByText('真实产品线').length).toBeGreaterThan(0);
    expect(screen.queryByText('师创智联协同OS')).not.toBeInTheDocument();
    expect(screen.getByLabelText('A1 动作描述')).toBeInTheDocument();
    expect(screen.getByLabelText('A1 需要达成的关键节点')).toBeInTheDocument();
    expect(screen.getByLabelText('A1 指定承接人').closest('.ant-select')).toHaveClass('ant-select-multiple');

    fireEvent.click(screen.getByRole('button', { name: '拆解 O2' }));
    expectPeriodActions();
    expect(screen.getByLabelText('A1 关联项目')).toBeInTheDocument();
    fireEvent.mouseDown(screen.getByLabelText('A1 关联项目'));
    expect(screen.getAllByText('真实交付项目').length).toBeGreaterThan(0);
    expect(screen.getAllByLabelText('A1 需要达成的关键节点')).toHaveLength(2);

    fireEvent.click(screen.getByRole('button', { name: '拆解 O3' }));
    expectPeriodActions();
    expect(screen.getByLabelText('A1 类型')).toBeInTheDocument();
    expect(screen.getByLabelText('A1 可衡量结果')).toBeInTheDocument();
    expect(screen.getAllByLabelText('A1 指定承接人')).toHaveLength(3);
  });

  it('balances weights after add and delete, while invalid manual totals block saving', async () => {
    renderForm();

    fireEvent.click(screen.getByRole('button', { name: '拆解 O1' }));
    expect(screen.getByLabelText('A1 权重')).toHaveValue('100');

    fireEvent.change(screen.getByLabelText('O1 来源承接权重'), { target: { value: '50' } });
    await waitFor(() => expect(screen.getByText('来源承接权重合计 116%，需为 100%')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: '存草稿' })).toBeDisabled();
    fireEvent.change(screen.getByLabelText('O1 来源承接权重'), { target: { value: '34' } });
    await waitFor(() => expect(screen.getByText('来源承接权重合计 100%')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: /添加行动/ }));
    expect(screen.getByLabelText('A1 权重')).toHaveValue('50');
    expect(screen.getByLabelText('A2 权重')).toHaveValue('50');

    fireEvent.change(screen.getByLabelText('A1 权重'), { target: { value: '60' } });
    await waitFor(() => expect(screen.getByText('权重合计 110%，需为 100%')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: '存草稿' })).toBeDisabled();
    expect(screen.getByRole('button', { name: /提\s*交/ })).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: '删除 A2' }));
    await waitFor(() => expect(screen.getByLabelText('A1 权重')).toHaveValue('100'));
    expect(screen.getByText('权重合计 100%')).toBeInTheDocument();
  });

  it('numbers actions A1 through A8 and disables further additions per O', () => {
    renderForm();

    fireEvent.click(screen.getByRole('button', { name: '拆解 O1' }));
    const addButton = screen.getByRole('button', { name: /添加行动/ });
    for (let index = 0; index < 7; index += 1) fireEvent.click(addButton);

    expect(screen.getByText('A8')).toBeInTheDocument();
    expect(screen.getByText('8/8')).toBeInTheDocument();
    expect(addButton).toBeDisabled();
  }, 15000);

  it('toggles each action between target and challenge types from its A label', () => {
    renderForm();

    fireEvent.click(screen.getByRole('button', { name: '拆解 O1' }));
    const actionToggle = screen.getByRole('button', { name: 'A1目标动作' });
    expect(actionToggle).toHaveClass('okr-action-type-target');

    fireEvent.click(actionToggle);
    expect(screen.getByRole('button', { name: 'A1挑战动作' })).toHaveClass('okr-action-type-challenge');
  });
});
