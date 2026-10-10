import React, { useEffect, useRef, useState } from 'react';
import { Button, Dropdown, Input, InputNumber, Modal, Select, message } from 'antd';
import { validCompletionHours } from './TaskCompletionDialog';
import { productRepository } from '../../services/productRepository';

export type BatchTarget = { id: string; category: string; productLineId?: string; revision?: number };
type Option = { value: string; label: string };

export const WorkItemBatchBar: React.FC<{
  targets: BatchTarget[];
  versions: Array<Option & { productLineId?: string }>;
  employees: Option[];
  onCancel: () => void;
  onComplete: () => Promise<unknown> | void;
}> = ({ targets, versions, employees, onCancel, onComplete }) => {
  const [operation, setOperation] = useState('');
  const [value, setValue] = useState<string | string[]>([]);
  const [statuses, setStatuses] = useState<Option[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);
  const [completionHours, setCompletionHours] = useState<Record<string, number | null>>({});
  const [completionReason, setCompletionReason] = useState('');
  const completed = useRef(new Set<string>());
  const [messageApi, contextHolder] = message.useMessage();
  const categories = new Set(targets.map((target) => target.category));
  const lines = new Set(targets.map((target) => target.productLineId));
  const valid = targets.length > 0 && categories.size === 1 && targets.every((target) => target.productLineId && Number.isInteger(target.revision));

  useEffect(() => {
    if (operation !== 'status' || !valid) return;
    let active = true;
    setStatuses([]);
    setStatusLoading(true);
    Promise.all(targets.map((target) => productRepository.workItemTransitions(target.productLineId!, target.id)))
      .then((results) => {
        if (!active) return;
        const common = results[0].statuses.filter((status) => !status.current && status.allowed && results.every((result) => result.statuses.some((option) => option.key === status.key && option.allowed && !option.current)));
        setStatuses(common.map((status) => ({ value: status.key, label: status.name })));
      })
      .catch((error) => { if (active) messageApi.error(error instanceof Error ? error.message : '状态加载失败'); })
      .finally(() => { if (active) setStatusLoading(false); });
    return () => { active = false; };
  }, [operation, targets.map((target) => `${target.id}:${target.revision}`).join('|')]);

  if (!targets.length) return null;
  const choices: Record<string, Option[]> = {
    version: lines.size === 1 ? versions.filter((version) => version.productLineId === targets[0].productLineId) : [],
    status: statuses,
    owner: employees,
    participants: employees
  };
  const labels: Record<string, string> = { version: '修改版本', status: '修改状态', owner: '修改负责人', participants: '修改参与人', delete: '批量归档' };
  const execute = async () => {
    if (!valid) { messageApi.warning('只能选择同类型且有版本信息的工作项'); return; }
    setLoading(true);
    try {
      if (operation === 'status' && statuses.find((status) => status.value === value)?.label === '已完成') {
        const remaining = targets.filter((target) => !completed.current.has(target.id));
        if (remaining.some((target) => !validCompletionHours(completionHours[target.id] ?? null))) throw new Error('请为每条任务填写非负且最多两位小数的完成工时');
        const transitions = await Promise.all(remaining.map(async (target) => {
          const options = await productRepository.workItemTransitions(target.productLineId!, target.id);
          const action = options.actions.find((item) => item.to === value && item.allowed);
          if (!action) throw new Error(`任务 ${target.id} 当前不能完成，请刷新后重试`);
          if (action.requiredFields.includes('reason') && !completionReason.trim()) throw new Error('请填写状态变更原因');
          return { target, options, action };
        }));
        for (const { target, options, action } of transitions) {
          await productRepository.transitionWorkItem(target.productLineId!, target.id, { edgeKey: action.edgeKey, revision: options.revision, actualHours: completionHours[target.id]!, reason: completionReason.trim() });
          completed.current.add(target.id);
        }
      } else {
      await productRepository.batchWorkItems({
        targets: targets.map(({ id, productLineId, revision }) => ({ id, productLineId: productLineId!, revision: revision! })),
        operation,
        value: typeof value === 'string' ? value : undefined,
        participants: operation === 'participants' ? value as string[] : undefined
      });
      }
      messageApi.success(`已处理 ${targets.length} 条工作项`);
      setOperation('');
      setValue([]);
      onCancel();
      await onComplete();
    } catch (error) {
      messageApi.error(`${error instanceof Error ? error.message : '批量操作失败，请刷新后重试'}${completed.current.size ? `；已完成 ${completed.current.size} 条，重试只处理剩余任务` : ''}`);
    } finally { setLoading(false); }
  };
  const open = (key: string) => {
    if (!valid) { messageApi.warning('请选择同类型且有版本信息的工作项'); return; }
    if (key === 'delete') {
      Modal.confirm({ title: `归档选中的 ${targets.length} 条工作项？`, content: '归档后工作项将从当前列表移除，可在产品配置的归档任务中恢复。', okText: '确认归档', okButtonProps: { danger: true }, cancelText: '取消', onOk: async () => {
        setLoading(true);
        try {
          await productRepository.batchWorkItems({ targets: targets.map(({ id, productLineId, revision }) => ({ id, productLineId: productLineId!, revision: revision! })), operation: 'delete' });
          messageApi.success(`已归档 ${targets.length} 条工作项`);
          onCancel();
          await onComplete();
        } catch (error) { messageApi.error(error instanceof Error ? error.message : '批量归档失败'); }
        finally { setLoading(false); }
      } });
      return;
    }
    setOperation(key);
    completed.current.clear();
    setCompletionHours({});
    setCompletionReason('');
    setValue(key === 'participants' ? [] : '');
  };
  return <div className="flex flex-wrap items-center gap-3 border-b border-[var(--border-main)] bg-[var(--bg-surface)] px-4 py-3 text-sm text-[var(--text-primary)]">
    {contextHolder}
    <span>已选中 {targets.length} 条工作项</span>
    <Dropdown menu={{ items: Object.entries(labels).map(([key, label]) => ({ key, label, danger: key === 'delete', onClick: () => open(key) })) }}>
      <Button disabled={loading}>批量操作 {targets.length} 条</Button>
    </Dropdown>
    <Button disabled={loading} onClick={onCancel}>取消选择</Button>
    <Modal className="work-item-batch-modal" title={labels[operation]} open={Boolean(operation)} onCancel={() => { if (!loading) { setOperation(''); if (completed.current.size) void onComplete(); } }} cancelButtonProps={{ disabled: loading }} closable={!loading} maskClosable={!loading} cancelText="取消" okText="保存" onOk={() => void execute()} okButtonProps={{ disabled: (operation !== 'participants' && !value) || !valid, loading }} destroyOnHidden>
      <div className="space-y-6 pt-2">
        {operation === 'status' && statuses.find((status) => status.value === value)?.label === '已完成' && <div className="space-y-3">
          {targets.map((target) => <label key={target.id} className="block text-xs">任务 {target.id} 完成工时（小时）<InputNumber className="w-full" min={0} disabled={loading || completed.current.has(target.id)} value={completionHours[target.id] ?? null} placeholder="请输入完成工时" onChange={(hours) => setCompletionHours((current) => ({ ...current, [target.id]: hours }))} /></label>)}
          <Input.TextArea value={completionReason} disabled={loading} maxLength={2000} placeholder="状态变更原因（流程要求时必填）" onChange={(event) => setCompletionReason(event.target.value)} />
        </div>}
        <div className="space-y-2">
          <span className="block text-xs font-normal text-[var(--text-primary)]">{labels[operation]}</span>
          <Select disabled={loading || completed.current.size > 0} className="w-full text-xs font-normal" mode={operation === 'participants' ? 'multiple' : undefined} showSearch optionFilterProp="label" placeholder={operation === 'participants' ? '请选择参与人' : `请选择${labels[operation] || ''}`} value={value || undefined} onChange={setValue} options={choices[operation] || []} loading={statusLoading} notFoundContent={operation === 'version' && lines.size !== 1 ? '请选择同一产品下的工作项' : undefined} />
        </div>
      </div>
    </Modal>
  </div>;
};
