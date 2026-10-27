import Card from 'antd/es/card/Card';
import { Input, Select, Table, Tag } from 'antd';

/** Monthly feedback is a fixed business flow, independent of custom text fields. */
export function ReviewTemplateMonthlyLinkage({ audience, reportType }: { audience: 'employee' | 'supervisor'; reportType: 'week' | 'month' }) {
  if (reportType !== 'month') return null;
  return <Card size="small" title={audience === 'employee' ? '对公司或部门发展有帮助的意见和建议' : '部门反馈分析'} extra={<Tag>固定业务联动</Tag>}>
    <p className="text-sm text-[var(--text-secondary)]">{audience === 'employee'
      ? '员工填写意见和建议；提交月报后，非空建议进入同部门、同月的主管月报，由主管逐条判断。已有建议板块沿用同一份内容，报告中只显示一次。'
      : '自动汇总同部门员工同月已提交月报中的非空意见和建议。主管逐条选择已内部解决、需公司解决或无需处理；员工建议或来源月报变化后须重新判断。'}</p>
    {audience === 'employee' ? <Input.TextArea aria-label="员工建议联动预览" disabled rows={3} placeholder="填写对公司或部门发展有帮助的意见和建议"/> : <Table size="small" pagination={false} rowKey="id" dataSource={[{ id: 'preview', employee: '示例员工', suggestion: '此处展示员工已提交的意见和建议' }]} columns={[
      { title: '员工', dataIndex: 'employee' },
      { title: '意见和建议', dataIndex: 'suggestion' },
      { title: '主管判断', render: () => <Select aria-label="主管判断联动预览" disabled placeholder="请选择" options={['已内部解决', '需公司解决', '无需处理'].map(value => ({ value, label: value }))}/> },
    ]}/>}
  </Card>;
}
