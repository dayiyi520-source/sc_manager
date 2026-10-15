import { Empty, Select, Table } from 'antd';
import type { DepartmentReviewFeedback } from '../../../services/okrRepository';

export function DepartmentFeedbackTable({ rows, disabled = true, loading = false, onChange }: {
  rows: DepartmentReviewFeedback[]; disabled?: boolean; loading?: boolean; onChange?: (row: DepartmentReviewFeedback) => void;
}) {
  return <Table size="small" rowKey="reviewId" pagination={false} loading={loading} dataSource={rows} locale={{ emptyText: <Empty description="本轮暂无员工意见和建议"/> }} columns={[
    { title: '员工', dataIndex: 'employeeName' },
    { title: '意见和建议', dataIndex: 'suggestion', render: text => <p className="whitespace-pre-wrap break-words">{text}</p> },
    { title: '主管判断', render: (_, row) => <Select className="w-full min-w-32" aria-label={`${row.employeeName}主管判断`} placeholder="请选择" value={row.judgment} disabled={disabled} options={['已内部解决', '需公司解决'].map(value => ({ label: value, value }))} onChange={judgment => onChange?.({ ...row, judgment })}/> },
  ]}/>;
}
