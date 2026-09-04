import React from 'react';
import { Ban, Send } from 'lucide-react';
import type { RequirementTask } from '../../types';

export const RequirementActionButtons: React.FC<{
  status: RequirementTask['status'];
  hasWorkItem: boolean;
  onWork: () => void;
  onHold: () => void;
  onReject: () => void;
}> = ({ status, hasWorkItem, onWork, onHold, onReject }) => {
  const locked = hasWorkItem || ['处理中', '已驳回', '已完成'].includes(status);
  if (locked) return null;
  return <div className="flex gap-2">
    <button type="button" onClick={onWork} className="h-9 px-3 rounded-lg bg-[var(--primary)] text-xs font-semibold text-white"><Send className="mr-1 inline w-3.5 h-3.5" />转任务</button>
    {status !== '已搁置' && <button type="button" onClick={onHold} className="h-9 px-3 rounded-lg border border-[var(--border-main)] text-xs text-[var(--text-body)]"><Ban className="mr-1 inline w-3.5 h-3.5" />需求搁置</button>}
    <button type="button" onClick={onReject} className="h-9 px-3 rounded-lg border border-[var(--danger)] text-xs text-[var(--danger)]">需求驳回</button>
  </div>;
};
