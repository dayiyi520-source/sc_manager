import { ArrowLeftIcon, PencilIcon } from '@primer/octicons-react';
import { canUpdateMyTaskProgress, myTaskProgress, validateMyTaskProgress } from '../../services/myTaskProgress';
import { TODO_TAB_KEY, readWorkbenchTab, rememberWorkbenchTab } from '../../services/workbenchPreferences';
import { useEffect, useRef, useState } from 'react';
import { Alert, Button, Empty, Input, InputNumber, Modal, Progress, Select, Table, Tabs, Tag } from 'antd';
import { useApp } from '../../context/AppContext';
import { requirementRepository } from '../../services/requirementRepository';
import { OkrProvider } from './okr/OkrProvider';
type MyTask = Awaited<ReturnType<typeof requirementRepository.myTasks>>[number];
export type TodoTab = 'all' | 'mine' | 'assist' | 'work_order';
export const todoTabs: Array<{ key: TodoTab; label: string }> = [{ key: 'all', label: '全部' }, { key: 'mine', label: '任务' }, { key: 'assist', label: '协同事项' }, { key: 'work_order', label: '工单' }];
export const matchesTodoTab = (row: MyTask, tab: TodoTab) => tab === 'all' || (tab === 'mine' ? row.taskGroup === 'mine' : tab === 'assist' ? row.taskGroup === 'assist' && row.type !== 'work_order' : row.type === 'work_order');
const completed = (status: string) => ['已完成', '已关闭', '已取消', '已驳回'].includes(status);
export function TodoCenterView({ onBack }: { onBack: () => void }) { return <OkrProvider><TodoPage onBack={onBack}/></OkrProvider>; }
function TodoPage({ onBack }: { onBack: () => void }) {
  const { currentUser } = useApp();
  const [rows, setRows] = useState<MyTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [revision, setRevision] = useState(0);
  const [tab, setTab] = useState<TodoTab>(() => { const saved = readWorkbenchTab(TODO_TAB_KEY); return todoTabs.find(row => row.key === saved)?.key || 'all'; });
  const [status, setStatus] = useState('all');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [type, setType] = useState<string>();
  const [owner, setOwner] = useState<string>();
  const [editing, setEditing] = useState<MyTask>();
  const [progress, setProgress] = useState<number | null>(0);
  const [saving, setSaving] = useState(false);
  const saveLock = useRef(false);
  const [progressError, setProgressError] = useState<string>();
  useEffect(() => {
    let active = true; setLoading(true); setError(undefined); setRows([]);
    requirementRepository.myTasks(currentUser.id, true).then(rows => { if (!Array.isArray(rows)) throw new Error('待办数据格式异常，请重试'); if (active) setRows(rows); }).catch(error => { if (active) setError(error instanceof Error ? error.message : '待办加载失败'); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [currentUser.id, revision]);
  const filtered = rows.filter(row => matchesTodoTab(row, tab) && (!type || row.type === type) && (!owner || (row.assigneeId || row.assigneeName || 'unassigned') === owner) && (status === 'all' || (status === 'finished' ? completed(row.status) : !completed(row.status))) && row.title.toLowerCase().includes(query.trim().toLowerCase()));
  const taskTypes: Record<string, string> = { requirement: '产品任务', dev: '研发任务', design: '设计任务', test: '测试任务', bug: '缺陷任务', assistance: '协同事项', work_order: '工单' };
  const typeOptions = [...new Set<string>(rows.map(row => row.type))].map(value => ({ value, label: taskTypes[value] || value }));
  const ownerOptions = [...new Map(rows.map(row => [row.assigneeId || row.assigneeName || 'unassigned', { value: row.assigneeId || row.assigneeName || 'unassigned', label: row.assigneeName || '未分配' }])).values()];
  const saveProgress = async () => {
    if (!editing || saveLock.current) return;
    try { validateMyTaskProgress(progress); } catch (error) { setProgressError((error as Error).message); return; }
    saveLock.current = true; setSaving(true); setProgressError(undefined);
    try {
      const result = await requirementRepository.updateWorkItemProgress(editing.sourceId, progress, editing.revision ?? 0);
      setRows(rows => rows.map(row => row.id === editing.id ? { ...row, progress: result.progress, revision: result.revision } : row));
      setEditing(undefined);
    } catch (error) { setProgressError(error instanceof Error ? error.message : '进度保存失败，请重试'); }
    finally { saveLock.current = false; setSaving(false); }
  };
  return <div className="space-y-4">
    <div className="flex items-center justify-between gap-4"><Button type="text" icon={<ArrowLeftIcon/>} onClick={onBack}>返回我的任务</Button><Button loading={loading} onClick={() => setRevision(value => value + 1)}>刷新</Button></div>
    {error && <Alert type="error" showIcon title={error} action={<Button onClick={() => setRevision(value => value + 1)}>重试</Button>}/>}
    <section className="rounded-xl border border-[var(--border-main)] bg-[var(--bg-surface)] p-4">
      <Tabs activeKey={tab} onChange={key => { setTab(key as TodoTab); rememberWorkbenchTab(TODO_TAB_KEY, key); setPage(1); }} items={todoTabs.map(type => ({ key: type.key, label: `${type.label} (${rows.filter(row => matchesTodoTab(row, type.key)).length})` }))}/>
      <div className="mb-4 flex flex-wrap gap-4">
        <div className="w-[var(--workbench-query-width)] max-w-full"><Input.Search aria-label="搜索待办" allowClear placeholder="搜索标题" value={query} onChange={event => { setQuery(event.target.value); setPage(1); }}/></div>
        <Select className="min-w-40" aria-label="待办类型" placeholder="全部类型" allowClear value={type} onChange={value => { setType(value); setPage(1); }} options={typeOptions}/>
        <Select className="min-w-40" aria-label="待办负责人" placeholder="全部负责人" showSearch optionFilterProp="label" allowClear value={owner} onChange={value => { setOwner(value); setPage(1); }} options={ownerOptions}/>
        <Select className="min-w-40" aria-label="待办状态" value={status} onChange={value => { setStatus(value); setPage(1); }} options={[{ value: 'all', label: '全部状态' }, { value: 'pending', label: '未结束' }, { value: 'finished', label: '已结束（含已完成）' }]}/>
      </div>
      <Table loading={loading} rowKey="id" dataSource={filtered} scroll={{ x: true }} pagination={{ current: page, pageSize: 20, onChange: setPage, showSizeChanger: false, hideOnSinglePage: true }} locale={{ emptyText: error ? '加载失败，请重试' : <Empty description="暂无工作事项"/> }} columns={[
        { title: '标题', dataIndex: 'title', render: (_, row) => <a className="break-words" href={todoDetailUrl(row)} target="_blank" rel="noopener noreferrer">{row.title}</a> },
        { title: '类型', render: (_, row) => taskTypes[row.type] || row.type },
        { title: '状态', dataIndex: 'status', render: value => <Tag>{value}</Tag> },
        { title: '负责人', render: (_, row) => row.assigneeName || '未分配' },
        { title: '截止日期', render: (_, row) => row.dueDate || '未设置' },
        { title: '进度', render: (_, row) => <div className="flex min-w-40 items-center gap-2"><Progress percent={myTaskProgress(row.progress, row.status)} size="small"/><Button type="text" size="small" aria-label={`修改进度：${row.title}`} disabled={loading || !canUpdateMyTaskProgress(row.status)} icon={<PencilIcon/>} onClick={() => { setEditing(row); setProgress(myTaskProgress(row.progress, row.status)); setProgressError(undefined); }}/></div> },
      ]}/>
    </section>
    <Modal open={Boolean(editing)} title="更新任务进度" onCancel={() => { if (!saving) setEditing(undefined); }} onOk={() => void saveProgress()} confirmLoading={saving} cancelButtonProps={{ disabled: saving }} mask={{ closable: !saving }} keyboard={!saving} okText="保存" cancelText="取消" destroyOnHidden>
      <div className="space-y-4">
        <p className="break-words font-medium text-[var(--text-primary)]">{editing?.title}</p>
        <p className="text-sm text-[var(--text-muted)]">填写截至当前的累计完成进度；跨天任务保留最近保存的进度，保存不改变任务状态。</p>
        {progressError && <Alert type="error" showIcon title={progressError}/>}
        <label className="flex items-center gap-4" htmlFor="todo-progress">当前进度<InputNumber id="todo-progress" aria-label="当前进度" min={0} max={100} precision={0} suffix="%" value={progress} disabled={saving} onChange={value => setProgress(value)}/></label>
      </div>
    </Modal>
  </div>;
}
export function todoDetailUrl(row: MyTask) {
  return `${import.meta.env.BASE_URL}app/${row.taskGroup === 'assist' ? 'wb_work_order' : row.targetPage}?detailId=${encodeURIComponent(row.sourceId)}${row.productLineId && row.taskGroup !== 'assist' ? `&productLineId=${encodeURIComponent(row.productLineId)}` : ''}`;
}
