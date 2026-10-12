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
    fireEvent.click(screen.getByRole('button',{name:'更新进度'}));
    await waitFor(()=>expect(update).toHaveBeenCalledWith(record,'update-progress',expect.objectContaining({itemId:'a',progress:45,note:'完成第一阶段'}),'owner'));
    expect(await screen.findByText('保存失败')).toBeInTheDocument();
    expect(screen.getByLabelText('更新说明')).toHaveValue('完成第一阶段');
    expect(close).not.toHaveBeenCalled(); expect(refresh).not.toHaveBeenCalled();
    expect(screen.queryByText(/信心/)).not.toBeInTheDocument();
  });
  it('only displays history for another person’s action',()=>{
    render(<GoalProgressModal record={{...record,progressHistory:[{id:'entry',itemId:'a',operatorId:'owner',createdAt:'2026-10-12T10:00:00',previousProgress:0,progress:20,status:'normal',note:'完成设计',attachments:[]}]}} itemId="a" records={[record]} people={[]} viewerId="other" onClose={vi.fn()} onRefresh={vi.fn()}/>);
    expect(screen.getByText('完成设计')).toBeInTheDocument();
    expect(screen.queryByLabelText('当前进度')).not.toBeInTheDocument();
    expect(screen.queryByRole('button',{name:'更新进度'})).not.toBeInTheDocument();
  });
});
