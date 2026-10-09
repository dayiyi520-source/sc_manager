// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CompanyObjectiveDetail, companyActionTasks } from './CompanyObjectiveDetail';
import { buildGoalHierarchy } from './GoalHierarchyView';
import { okrRepository, type OkrRecord, type OkrWork } from '../../../services/okrRepository';

const objective: OkrRecord = {id:'o',kind:'objective',ownerId:'boss',periodKey:'2026-10',status:'active',version:1,payload:{title:'公司经营目标',weight:40,keyResults:[{id:'a',title:'完成交付',weight:100,progress:10}]}};
const child: OkrRecord = {id:'child',kind:'action',ownerId:'manager',periodKey:'2026-10',status:'active',version:1,payload:{title:'部门交付',parentObjectiveId:'o',parentActionId:'a',weight:100,progress:75}};
const task = {id:'task',title:'实际任务',objectiveId:'o',keyResultId:'child',status:'已完成'} as OkrWork;

describe('company objective detail', () => {
  it('rolls up descendant progress and collects deduplicated evidence without unrelated tasks', () => {
    const root = buildGoalHierarchy([objective,child],'2026-10')[0];
    expect(root.progress).toBe(75);
    expect(companyActionTasks(root.children[0],'o',[task,task,{...task,id:'other',objectiveId:'other'}],[])).toEqual([task]);
  });

  it('displays real metadata and expands tasks; retries an activity failure', async () => {
    vi.spyOn(okrRepository,'events').mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce([]);
    render(<CompanyObjectiveDetail record={objective} records={[objective,child]} people={[{id:'boss',name:'制定人甲',department:'管理层',rootFlag:1,supervisorId:null,version:1}]} work={[task]} workLoading={false} workError={null} onRetryWork={vi.fn()} onClose={vi.fn()}/>);
    expect(screen.getByLabelText('制定人：制定人甲')).toBeInTheDocument();
    expect(screen.getByText('目标详情')).toBeInTheDocument();
    expect(screen.getByText('/ 2026年10月')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '修改目标' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '删除目标' })).toBeDisabled();
    expect(screen.getByRole('group', { name: '目标操作' })).toBeInTheDocument();
    expect(screen.getByText('目标权重:40%')).toBeInTheDocument();
    expect(screen.getByRole('separator')).toBeInTheDocument();
    expect(screen.getByRole('main', {name:'目标与动作'})).toHaveAttribute('tabindex', '0');
    expect(screen.getByRole('complementary', {name:'动态记录'})).toHaveAttribute('tabindex', '0');
    expect(screen.getByLabelText('A1进度：75%')).toBeInTheDocument();
    expect(screen.getByLabelText('A1权重：100%')).toBeInTheDocument();
    for (const name of ['A1关联任务', 'A1项目', 'A1产品', 'A1下级对齐']) expect(screen.getByRole('button', {name})).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(screen.getByRole('button',{name:'A1关联任务'}));
    expect(screen.getByText('实际任务')).toBeInTheDocument();
    expect(screen.getByRole('button', {name:'A1关联任务'})).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByRole('button', {name:'A1关联任务'}));
    expect(screen.queryByText('实际任务')).not.toBeInTheDocument();
    expect(screen.getByRole('button', {name:'A1关联任务'})).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(screen.getByRole('button', {name:'A1关联任务'}));
    expect(screen.getByText('实际任务')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button',{name:'A1下级对齐'}));
    expect(screen.getByText('部门交付')).toBeInTheDocument();
    expect(screen.queryByText('实际任务')).not.toBeInTheDocument();
    expect(screen.getByRole('button', {name:'A1项目'})).toBeInTheDocument();
    expect(screen.getByRole('button', {name:'A1产品'})).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', {name:'A1收起关联内容'}));
    expect(screen.queryByText('部门交付')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', {name:'A1展开关联内容'}));
    expect(screen.getByText('部门交付')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', {name:'A1项目'}));
    expect(screen.getByText('暂无关联项目')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', {name:'A1产品'}));
    expect(screen.getByText('暂无关联产品')).toBeInTheDocument();
    expect(await screen.findByText('动态记录加载失败')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button',{name:/重\s*试/}));
    expect(await screen.findByText('暂无动态记录')).toBeInTheDocument();
    vi.restoreAllMocks();
  });

  it('places enabled edit, delete and close actions in order and dispatches them', async () => {
    vi.spyOn(okrRepository, 'events').mockResolvedValue([]);
    const onEdit = vi.fn(), onDelete = vi.fn(), onClose = vi.fn();
    render(<CompanyObjectiveDetail record={objective} records={[objective]} people={[]} work={[]} workLoading={false} workError={null} onRetryWork={vi.fn()} onEdit={onEdit} onDelete={onDelete} onClose={onClose}/>);
    const actions = screen.getByRole('group', {name: '目标操作'}).querySelectorAll('button');
    expect(Array.from(actions).map(button => button.getAttribute('aria-label'))).toEqual(['修改目标', '删除目标', '关闭目标详情']);
    fireEvent.click(actions[0]); fireEvent.click(actions[1]); fireEvent.click(actions[2]);
    expect(onEdit).toHaveBeenCalledOnce(); expect(onDelete).toHaveBeenCalledOnce(); expect(onClose).toHaveBeenCalledOnce();
    await screen.findByText('暂无动态记录');
    vi.restoreAllMocks();
  });

  it('shows saved project and product associations beneath the shared toggle', async () => {
    vi.spyOn(okrRepository, 'events').mockResolvedValue([]);
    const linked = {...child, payload:{...child.payload,structureType:'delivery',businessObject:'交付项目甲',productLine:'产品甲'}};
    render(<CompanyObjectiveDetail record={objective} records={[objective,linked]} people={[]} work={[]} workLoading={false} workError={null} onRetryWork={vi.fn()} onClose={vi.fn()}/>);
    fireEvent.click(screen.getByRole('button', {name:'A1项目'}));
    expect(screen.getByText('交付项目甲')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', {name:'A1产品'}));
    expect(screen.getByText('产品甲')).toBeInTheDocument();
    expect(screen.queryByText('交付项目甲')).not.toBeInTheDocument();
    await screen.findByText('暂无动态记录');
    vi.restoreAllMocks();
  });
});
