import { openWorkItemDetailLink } from '../../utils/workItemDetailLink';
import { ArrowLeftIcon } from '@primer/octicons-react';
import { TODO_TAB_KEY, readWorkbenchTab, rememberWorkbenchTab } from '../../services/workbenchPreferences';
import { useEffect, useState } from 'react';
import { Alert, Button, Empty, Input, Select, Table, Tabs, Tag } from 'antd';
import { useApp } from '../../context/AppContext';
import { requirementRepository } from '../../services/requirementRepository';
import { OkrProvider } from './okr/OkrProvider';
type MyTask = Awaited<ReturnType<typeof requirementRepository.myTasks>>[number];
export type TodoTab = 'all' | 'mine' | 'assist' | 'work_order';
export const todoTabs: Array<{ key: TodoTab; label: string }> = [{ key: 'all', label: '全部' }, { key: 'mine', label: '任务' }, { key: 'assist', label: '协同事项' }, { key: 'work_order', label: '工单' }];
export const matchesTodoTab = (row: MyTask, tab: TodoTab) => tab === 'all' || (tab === 'mine' ? row.taskGroup === 'mine' : tab === 'assist' ? row.taskGroup === 'assist' && row.type !== 'work_order' : row.type === 'work_order');
const completed = (status: string) => ['已完成', '已关闭', '已取消', '已驳回'].includes(status);
export function TodoCenterView({ onBack, backLabel, agentOnly = false }: { onBack: () => void; backLabel?: string; agentOnly?: boolean }) { return <OkrProvider><TodoPage onBack={onBack} backLabel={backLabel} agentOnly={agentOnly}/></OkrProvider>; }
function TodoPage({ onBack, backLabel = '返回我的待办', agentOnly = false }: { onBack: () => void; backLabel?: string; agentOnly?: boolean }) {
  const { currentUser } = useApp();
  const [rows, setRows] = useState<MyTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [revision, setRevision] = useState(0);
  const [tab, setTab] = useState<TodoTab>(() => { const saved = readWorkbenchTab(TODO_TAB_KEY); return agentOnly ? 'assist' : todoTabs.find(row => row.key === saved && row.key !== 'all')?.key || 'mine'; });
  const [status, setStatus] = useState('all');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [type, setType] = useState<string>();
  useEffect(() => {
    let active = true; setLoading(true); setError(undefined);
    requirementRepository.myTasks(currentUser.id, true).then(rows => { if (!Array.isArray(rows)) throw new Error('待办数据格式异常，请重试'); if (active) setRows(rows); }).catch(error => { if (active) setError(error instanceof Error ? error.message : '待办加载失败'); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [currentUser.id, revision]);
  const filtered = rows.filter(row => matchesTodoTab(row, agentOnly ? 'assist' : tab) && (!type || row.type === type) && (status === 'all' || (status === 'finished' ? completed(row.status) : !completed(row.status))) && row.title.toLowerCase().includes(query.trim().toLowerCase()));
  const taskTypes: Record<string, string> = { requirement: '产品任务', dev: '研发任务', design: '设计任务', test: '测试任务', bug: '缺陷任务', assistance: '协同事项', work_order: '工单' };
  const typeOptions = [...new Set<string>(rows.map(row => row.type))].map(value => ({ value, label: taskTypes[value] || value }));
  return <div className="space-y-4">
    <div className="flex items-center justify-between gap-4"><Button type="text" icon={<ArrowLeftIcon/>} onClick={onBack}>{backLabel}</Button><Button loading={loading} onClick={() => setRevision(value => value + 1)}>刷新</Button></div>
    {error && <Alert type="error" showIcon title={error} action={<Button onClick={() => setRevision(value => value + 1)}>重试</Button>}/>}
    <section className="rounded-xl border border-[var(--border-main)] bg-[var(--bg-surface)] p-4">
      {agentOnly ? <h2 className="mb-4 text-base font-semibold text-[var(--text-primary)]">协同中心</h2> : <Tabs activeKey={tab} onChange={key => { setTab(key as TodoTab); setType(undefined); setStatus('all'); rememberWorkbenchTab(TODO_TAB_KEY, key); setPage(1); }} items={todoTabs.filter(type => type.key !== 'all').map(type => ({ key: type.key, label: `${type.label} (${rows.filter(row => matchesTodoTab(row, type.key)).length})` }))}/>}
      <div className="mb-4 flex flex-wrap gap-4">
        <div className="w-[var(--workbench-query-width)] max-w-full"><Input.Search className="workbench-search todo-center-search" aria-label="搜索待办" allowClear placeholder="搜索标题" value={query} onChange={event => { setQuery(event.target.value); setPage(1); }}/></div>
        {!agentOnly && <>
          <Select className="min-w-40" aria-label="待办类型" placeholder="全部类型" allowClear value={type} onChange={value => { setType(value); setPage(1); }} options={typeOptions}/>
          <Select className="min-w-40" aria-label="待办状态" value={status} onChange={value => { setStatus(value); setPage(1); }} options={[{ value: 'all', label: '全部状态' }, { value: 'pending', label: '未结束' }, { value: 'finished', label: '已结束（含已完成）' }]}/>
        </>}
      </div>
      <Table loading={loading} rowKey="id" dataSource={filtered} scroll={{ x: true }} pagination={{ current: page, pageSize: 20, onChange: setPage, showSizeChanger: false, hideOnSinglePage: true }} locale={{ emptyText: error ? '加载失败，请重试' : <Empty description="暂无工作事项"/> }} columns={[
        { title: '标题', dataIndex: 'title', render: (_, row) => <button type="button" className="break-words text-left text-[var(--primary)] hover:underline focus-visible:outline focus-visible:outline-[var(--primary)] active:opacity-70" onClick={() => openWorkItemDetailLink(row.sourceId, row.taskGroup === 'assist' ? 'WORK_ORDER' : row.type, row.productLineId)}>{row.title}</button> },
        { title: '类型', render: (_, row) => taskTypes[row.type] || row.type },
        { title: '状态', dataIndex: 'status', render: value => <Tag>{value}</Tag> },
        { title: '负责人', render: (_, row) => row.assigneeName || '未分配' },
        { title: '截止日期', render: (_, row) => row.dueDate || '未设置' },
      ]}/>
    </section>
  </div>;
}
