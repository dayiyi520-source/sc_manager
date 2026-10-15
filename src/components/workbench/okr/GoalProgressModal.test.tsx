// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { GoalProgressModal } from './GoalProgressModal';
import { okrRepository, type OkrRecord } from '../../../services/okrRepository';
vi.mock('recharts', () => ({ ResponsiveContainer: ({children}:any) => children, LineChart: () => null, Line: () => null, XAxis: () => null, YAxis: () => null, CartesianGrid: () => null, Tooltip: () => null }));
const record:OkrRecord = {id:'goal',kind:'objective',ownerId:'owner',periodKey:'2026-10',status:'active',version:1,payload:{title:'目标',keyResults:[{id:'kr',title:'关键结果',weight:100,progress:20,executionActions:[{id:'a',ownerId:'owner',title:'本人行动',weight:100,progress:20}]}]}};
afterEach(()=>vi.restoreAllMocks());
describe('只读进度历史', () => {
  it('keeps evidence and audit information readable without exposing an update action', () => {
    const update = vi.spyOn(okrRepository, 'update');
    const close = vi.fn();
    render(<GoalProgressModal record={{ ...record, progressHistory: [{ id: 'h', itemId: 'a', operatorId: 'owner', createdAt: '2026-10-12T10:00:00', previousProgress: 0, progress: 20, status: 'normal', note: '提交周报', attachments: [{ name: '记录.txt', data: 'data:text/plain;base64,b2s=' }] }] }} itemId="a" records={[record]} people={[]} viewerId="owner" onClose={close} onRefresh={vi.fn()}/>);
    expect(screen.getByText('提交周报')).toBeInTheDocument();
    expect(screen.getByText(/0% → 20%/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '记录.txt' })).toHaveAttribute('download', '记录.txt');
    expect(screen.queryByRole('button', { name: '更新进度' })).not.toBeInTheDocument();
    expect(screen.queryByLabelText('当前进度')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /关\s*闭/ }));
    expect(close).toHaveBeenCalledOnce();
    expect(update).not.toHaveBeenCalled();
  });
});
