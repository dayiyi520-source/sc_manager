import React, { useEffect, useState } from 'react';
import { Button, Dropdown, Modal, Select, message } from 'antd';
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
  const labels: Record<string, string> = { version: '修改版本', status: '修改状态', owner: '修改负责人', participants: '修改参与人', delete: '批量删除' };
  const execute = async () => {
    if (!valid) { messageApi.warning('只能选择同类型且有版本信息的工作项'); return; }
    setLoading(true);
    try {
      await productRepository.batchWorkItems({
        targets: targets.map(({ id, productLineId, revision }) => ({ id, productLineId: productLineId!, revision: revision! })),
        operation,
        value: typeof value === 'string' ? value : undefined,
        participants: operation === 'participants' ? value as string[] : undefined
      });
      messageApi.success(`已处理 ${targets.length} 条工作项`);
      setOperation('');
      setValue([]);
      onCancel();
      await onComplete();
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : '批量操作失败，请刷新后重试');
    } finally { setLoading(false); }
  };
  const open = (key: string) => {
    if (!valid) { messageApi.warning('请选择同类型且有版本信息的工作项'); return; }
    if (key === 'delete') {
      Modal.confirm({ title: `删除选中的 ${targets.length} 条工作项？`, content: '删除后工作项将不可在列表中查看；存在子任务的工作项不能删除。', okText: '确认删除', okButtonProps: { danger: true }, cancelText: '取消', onOk: async () => {
        setLoading(true);
        try {
          await productRepository.batchWorkItems({ targets: targets.map(({ id, productLineId, revision }) => ({ id, productLineId: productLineId!, revision: revision! })), operation: 'delete' });
          messageApi.success(`已删除 ${targets.length} 条工作项`);
          onCancel();
          await onComplete();
        } catch (error) { messageApi.error(error instanceof Error ? error.message : '批量删除失败'); }
        finally { setLoading(false); }
      } });
      return;
    }
    setOperation(key);
    setValue(key === 'participants' ? [] : '');
  };
  return <div className="flex flex-wrap items-center gap-3 border-b border-[var(--border-main)] bg-[var(--bg-surface)] px-4 py-3 text-sm text-[var(--text-primary)]">
    {contextHolder}
    <span>已选中 {targets.length} 条工作项</span>
    <Dropdown menu={{ items: Object.entries(labels).map(([key, label]) => ({ key, label, danger: key === 'delete', onClick: () => open(key) })) }}>
      <Button disabled={loading}>批量操作 {targets.length} 条</Button>
    </Dropdown>
    <Button onClick={onCancel}>取消选择</Button>
    <Modal className="work-item-batch-modal" title={labels[operation]} open={Boolean(operation)} onCancel={() => setOperation('')} cancelText="取消" okText="保存" onOk={() => void execute()} okButtonProps={{ disabled: (operation !== 'participants' && !value) || !valid, loading }} destroyOnHidden>
      <div className="space-y-6 pt-2">
        <div className="space-y-2">
          <span className="block text-xs font-normal text-[var(--text-primary)]">{labels[operation]}</span>
          <Select className="w-full text-xs font-normal" mode={operation === 'participants' ? 'multiple' : undefined} showSearch optionFilterProp="label" placeholder={operation === 'participants' ? '请选择参与人' : `请选择${labels[operation] || ''}`} value={value || undefined} onChange={setValue} options={choices[operation] || []} loading={statusLoading} notFoundContent={operation === 'version' && lines.size !== 1 ? '请选择同一产品下的工作项' : undefined} />
        </div>
      </div>
    </Modal>
  </div>;
};
