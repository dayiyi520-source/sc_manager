// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { GoalProgressModal } from './GoalProgressModal';
import { okrRepository, type OkrRecord } from '../../../services/okrRepository';
vi.mock('recharts', () => ({ ResponsiveContainer: ({children}:any) => children, LineChart: () => null, Line: () => null, XAxis: () => null, YAxis: () => null, CartesianGrid: () => null, Tooltip: () => null }));
const record:OkrRecord = {id:'goal',kind:'objective',ownerId:'owner',periodKey:'2026-10',status:'active',version:1,payload:{title:'目标',keyResults:[{id:'kr',title:'关键结果',weight:100,progress:20,executionActions:[{id:'a',ownerId:'owner',title:'本人行动',weight:100,progress:20}]}]}};
afterEach(()=>vi.restoreAllMocks());
describe('进度更新与只读历史',()=>{
  it('requires a note and preserves the form on a persistence failure',async()=>{
    const update=vi.spyOn(okrRepository,'update').mockRejectedValue(new Error('保存失败'));
    const close=vi.fn(), refresh=vi.fn();
    render(<GoalProgressModal record={record} itemId="a" records={[record]} people={[]} viewerId="owner" onClose={close} onRefresh={refresh}/>);
    fireEvent.click(screen.getByRole('button',{name:'更新进度'}));
    expect(screen.getByText('请填写更新说明')).toBeInTheDocument();
    expect(update).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText('更新说明'),{target:{value:'完成第一阶段'}});
    fireEvent.change(screen.getByLabelText('当前进度'),{target:{value:'45'}});
    fireEvent.click(screen.getByRole('radio',{name:'风险'}));
    fireEvent.click(screen.getByRole('button',{name:'更新进度'}));
    await waitFor(()=>expect(update).toHaveBeenCalledWith(record,'update-progress',expect.objectContaining({itemId:'a',progress:45,note:'完成第一阶段',progressStatus:'risk'}),'owner'));
    expect(await screen.findByText('保存失败')).toBeInTheDocument();
    expect(screen.getByLabelText('更新说明')).toHaveValue('完成第一阶段');
    expect(close).not.toHaveBeenCalled(); expect(refresh).not.toHaveBeenCalled();
    expect(screen.queryByText(/信心/)).not.toBeInTheDocument();
  });
  it('opens a disabled update form from another person’s action history',()=>{
    const update=vi.spyOn(okrRepository,'update');
    render(<GoalProgressModal record={{...record,progressHistory:[{id:'entry',itemId:'a',operatorId:'owner',createdAt:'2026-10-12T10:00:00',previousProgress:0,progress:20,status:'normal',note:'完成设计',attachments:[]}]}} itemId="a" records={[record]} people={[]} viewerId="other" onClose={vi.fn()} onRefresh={vi.fn()}/>);
    expect(screen.getByText('完成设计')).toBeInTheDocument();
    expect(screen.queryByLabelText('当前进度')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button',{name:'更新进度'}));
    expect(screen.getByLabelText('当前进度')).toBeDisabled();
    expect(screen.getByLabelText('更新说明')).toBeDisabled();
    expect(screen.getByRole('button',{name:'添加附件'})).toBeDisabled();
    for (const radio of screen.getAllByRole('radio')) expect(radio).toBeDisabled();
    expect(screen.getByRole('button',{name:'更新进度'})).toBeDisabled();
    fireEvent.click(screen.getByRole('button',{name:'更新进度'}));
    expect(update).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button',{name:'查看历史进度'}));
    expect(screen.getByText('完成设计')).toBeInTheDocument();
  });
  it('prevents updating an owned KR with a downstream alignment',()=>{
    const child:OkrRecord={...record,id:'child',ownerId:'other',payload:{title:'下级目标',sourceObjectiveId:'goal',sourceKrId:'kr'}};
    render(<GoalProgressModal record={record} itemId="kr" records={[record,child]} people={[]} viewerId="owner" onClose={vi.fn()} onRefresh={vi.fn()}/>);
    expect(screen.getByText('进度变化')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button',{name:'更新进度'}));
    expect(screen.getByLabelText('当前进度')).toBeDisabled();
    expect(screen.getByRole('button',{name:'更新进度'})).toBeDisabled();
    expect(screen.getByRole('radio',{name:'正常'})).toBeDisabled();
  });
  it('restores the most recently saved status',()=>{
    render(<GoalProgressModal record={{...record,progressHistory:[{id:'entry',itemId:'a',operatorId:'owner',createdAt:'2026-10-12T10:00:00',previousProgress:0,progress:20,status:'overdue',note:'依赖延期',attachments:[]}]}} itemId="a" records={[record]} people={[]} viewerId="owner" onClose={vi.fn()} onRefresh={vi.fn()}/>);
    expect(screen.getByRole('radio',{name:'逾期'})).toBeChecked();
    expect(screen.getByRole('radio',{name:'逾期'})).toBeEnabled();
  });
});
