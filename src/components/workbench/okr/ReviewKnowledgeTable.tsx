import { Button, Empty, Table } from 'antd';
import type { OkrReviewKnowledge } from '../../../services/okrRepository';
import { reviewKnowledgeConclusion, reviewKnowledgeScenario } from '../../../services/reviewKnowledge';

export type ReviewKnowledgeRow = OkrReviewKnowledge & { sourceEmployee?: string; sourceReviewId?: string };
export function ReviewKnowledgeTable({ entries, department = false, viewerName, readOnly, disabled, onView, onDelete }: {
  entries: ReviewKnowledgeRow[]; department?: boolean; viewerName?: string; readOnly: boolean; disabled: boolean;
  onView: (row: OkrReviewKnowledge) => void; onDelete: (id: string) => void;
}) {
  return entries.length ? <Table size="small" rowKey="id" pagination={false} dataSource={entries} scroll={{ x: true }} columns={[
    { title: '标题', ellipsis: true, render: (_, row) => <Button type="link" onClick={() => onView(row)}>{row.title}</Button> },
    { title: '场景与痛点', ellipsis: true, render: (_, row) => reviewKnowledgeScenario(row) || '—' },
    { title: '执行动作与复盘结论', ellipsis: true, render: (_, row) => reviewKnowledgeConclusion(row) || '—' },
    ...(department ? [{ title: '来源员工', render: (_: unknown, row: ReviewKnowledgeRow) => row.sourceReviewId ? row.sourceEmployee || '人员已停用' : viewerName || '主管本人' }] : []),
    { title: '操作', hidden: readOnly, render: (_, row) => !row.sourceReviewId && <Button type="text" danger disabled={disabled || readOnly} aria-label={`删除知识沉淀${row.title}`} onClick={() => { if (!disabled && !readOnly && !row.sourceReviewId) onDelete(row.id); }}>删除</Button> },
  ]}/> : <Empty description="暂无知识沉淀"/>;
}
