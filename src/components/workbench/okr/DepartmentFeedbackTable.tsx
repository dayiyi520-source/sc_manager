import { Alert, Button, Empty, Select, Spin, Table } from 'antd';
import type { DepartmentReviewFeedback } from '../../../services/okrRepository';

export function DepartmentFeedbackTable({ rows, disabled = true, loading = false, error = false, onRetry, onChange }: {
  rows: DepartmentReviewFeedback[]; disabled?: boolean; loading?: boolean; error?: boolean; onRetry?: () => void; onChange?: (row: DepartmentReviewFeedback) => void;
}) {
  if (error && !loading) return <div className="okr-weekly-list-panel"><Alert type="error" showIcon title="员工反馈加载失败" action={onRetry && <Button onClick={onRetry}>重试</Button>}/></div>;
  if (!rows.length) return <div className="okr-weekly-empty-panel" aria-busy={loading}>{loading ? <Spin aria-label="正在加载员工反馈"/> : <Empty description="本轮暂无员工意见和建议"/>}</div>;
  return <div className="okr-weekly-list-panel"><Table size="small" rowKey="reviewId" pagination={false} loading={loading} dataSource={rows} columns={[
    { title: '员工', dataIndex: 'employeeName' },
    { title: '意见和建议', dataIndex: 'suggestion', render: text => <p className="whitespace-pre-wrap break-words">{text}</p> },
    { title: '主管判断', render: (_, row) => <Select className="w-full min-w-32" aria-label={`${row.employeeName}主管判断`} placeholder="请选择" value={row.judgment} disabled={disabled} options={['已内部解决', '需公司解决', '无需处理'].map(value => ({ label: value, value }))} onChange={judgment => onChange?.({ ...row, judgment })}/> },
  ]}/></div>;
}
