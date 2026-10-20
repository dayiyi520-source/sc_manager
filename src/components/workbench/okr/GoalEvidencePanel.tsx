import { Alert, Button, Empty, Skeleton, Table } from 'antd';
import { evidenceTypeLabel, type GoalEvidenceTask, goalEvidenceProducts, goalEvidenceProjects } from '../../../services/goalReviewEvidence';
import { completedActualHours } from './reviewActualHours';

type Props = { section: 'tasks' | 'projects' | 'products'; tasks: GoalEvidenceTask[]; productNames: string[]; projectNames: string[]; loading: boolean; error: Error | null; onRetry: () => void };
export function GoalEvidencePanel({ section, tasks, productNames, projectNames, loading, error, onRetry }: Props) {
  const products = goalEvidenceProducts(tasks, productNames);
  const projects = goalEvidenceProjects(tasks, projectNames);
  return <div className="space-y-4">
    {error && <Alert type="error" showIcon title="关联任务实时数据加载失败，已保存的复盘记录仍可查看" action={<Button onClick={onRetry}>重试</Button>}/>}
    {loading && !tasks.length ? <Skeleton active paragraph={{ rows: 2 }}/> : section === 'products' ? products.length ? products.map(row => <article className="company-linked-row" key={row.key}><div className="min-w-0 space-y-2"><div className="flex flex-wrap gap-3"><strong className="break-words">{row.name}</strong><span className="text-[var(--text-muted)]">{row.version}</span></div><p className="text-sm text-[var(--text-muted)]">任务完成率：{row.progress}%（{row.done}/{row.total}）</p></div></article>) : <Empty description="暂无关联产品"/> : section === 'projects' ? projects.length ? projects.map(row => <article className="company-linked-row" key={row.name}><div className="min-w-0 space-y-2"><strong className="break-words">{row.name}</strong><p className="text-sm text-[var(--text-muted)]">关联产品数：{row.productCount} · 关联任务数：{row.taskCount}</p></div></article>) : <Empty description="暂无关联项目"/> : <Table size="small" rowKey="id" pagination={false} scroll={{ x: true }} dataSource={tasks} locale={{ emptyText: <Empty description="暂无可查看的关联任务"/> }} columns={[
      { title: '标题', dataIndex: 'title', render: title => <span className="break-words">{title}</span> },
      { title: '类型', render: (_, row) => evidenceTypeLabel(row) },
      { title: '状态', dataIndex: 'status' },
      { title: '任务工时', render: (_, row) => { const hours = row.snapshotOnly && row.savedHours == null ? undefined : completedActualHours(row); return hours == null ? '—' : `${hours} 小时`; } },
      { title: '来源员工', render: (_, row) => row.sourceEmployees.join('、') || '未记录来源员工' },
    ]}/>}
  </div>;
}
