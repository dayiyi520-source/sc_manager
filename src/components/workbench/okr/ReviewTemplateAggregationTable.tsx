import { Alert, Button, Empty, Select, Table } from 'antd';
import type { OkrPayload } from '../../../services/okrRepository';
import type { ReviewTemplateBlock } from '../../../services/reviewTemplateConfiguration';

type Row = NonNullable<OkrPayload['reviewTemplateAggregations']>[string][number];
export function ReviewTemplateAggregationTable({ block, rows, disabled, loading, error, onRetry, onChange }: { block: ReviewTemplateBlock; rows: Row[]; disabled?: boolean; loading?: boolean; error?: boolean; onRetry?: () => void; onChange: (row: Row) => void }) {
  const config = block.aggregation;
  if (!config) return null;
  if (error) return <Alert type="error" title="员工报告加载失败" action={<Button onClick={onRetry}>重试</Button>}/>;
  return <div className="grid gap-4">{block.guidance && <p className="text-sm text-[var(--text-secondary)] whitespace-pre-wrap">{block.guidance}</p>}<Table size="small" rowKey="employeeId" loading={loading} pagination={false} locale={{ emptyText: <Empty description="暂无已提交的员工内容"/> }} dataSource={rows} columns={[
    { title: '员工', dataIndex: 'employeeName', width: 128 },
    { title: '员工内容', dataIndex: 'content', render: value => <div className="whitespace-pre-wrap break-words">{value}</div> },
    ...(config.needsJudgment ? [{ title: config.judgmentLabel || '主管判断', key: 'judgment', width: 224, render: (_: unknown, row: Row) => disabled ? row.judgment || '——' : <Select aria-label={`${row.employeeName}的${config.judgmentLabel}`} style={{ width: '100%' }} allowClear placeholder="请选择" value={row.judgment} options={config.judgmentOptions.map(value => ({ label: value, value }))} onChange={judgment => onChange({ ...row, judgment })}/> }] : []),
  ]}/></div>;
}
