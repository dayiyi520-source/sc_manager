import { InputNumber, Table } from 'antd';
import type { OkrKrDetail, OkrKrReview } from '../../../services/okrRepository';

type DetailProgress = NonNullable<OkrKrReview['detailProgress']>[number];

interface Props {
  rows: OkrKrDetail[];
  progress: DetailProgress[];
  productName?: string;
  disabled: boolean;
  onChange: (rows: DetailProgress[]) => void;
}

export function ReviewProgressCell({ label, previous, value, disabled, onChange }: { label: string; previous: number; value: number; disabled: boolean; onChange: (value: number) => void }) {
  return <div className="okr-review-detail-progress-cell flex items-center gap-2 whitespace-nowrap text-xs text-[var(--text-body)]">
    <span>复盘前进度 {previous}% → 当前进度</span>
    <InputNumber className="okr-review-detail-progress-input" aria-label={label} min={0} max={100} precision={0} suffix="%" size="small" disabled={disabled} value={value} onChange={next => onChange(next ?? 0)}/>
  </div>;
}

/** The goal's KR subtable is read-only except for this employee's own review progress. */
export function EmployeeReviewDetailTable({ rows, progress, productName, disabled, onChange }: Props) {
  return <div className="okr-kr-detail-table" aria-label="KR子表进度更新">
    <Table<OkrKrDetail> size="small" rowKey="id" pagination={false} scroll={{ x: 1000 }} dataSource={rows} columns={[
      { title: '产品', key: 'name', render: (_: unknown, row) => productName && !row.version && /^v?\d+(?:\.\d+)*$/i.test(row.name.trim()) ? productName : row.name || '未设置' },
      { title: '迭代版本', key: 'version', render: (_: unknown, row) => row.version || (productName && /^v?\d+(?:\.\d+)*$/i.test(row.name.trim()) ? row.name : '未设置') },
      { title: '达成阶段', dataIndex: 'stage', key: 'stage', render: (stage?: string) => stage || '未设置' },
      { title: '开始时间', dataIndex: 'plannedStartDate', key: 'plannedStartDate', render: (date?: string) => date || '未设置' },
      { title: '结束时间', dataIndex: 'plannedEndDate', key: 'plannedEndDate', render: (date?: string) => date || '未设置' },
      { title: '进度修改', key: 'reviewProgress', width: 290, render: (_, row) => {
        const saved = progress.find(item => item.id === row.id);
        const previous = saved?.previousProgress ?? 0;
        return <ReviewProgressCell label={`${row.name} ${row.version || ''}本期更新进度`} previous={previous} value={saved?.currentProgress ?? previous} disabled={disabled}
          onChange={value => onChange([...progress.filter(item => item.id !== row.id), { id: row.id, previousProgress: previous, currentProgress: value }])}/>;
      } },
    ]}/>
  </div>;
}
