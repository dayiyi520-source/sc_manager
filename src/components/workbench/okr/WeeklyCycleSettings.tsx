import { useEffect, useState } from 'react';
import { Alert, Button, DatePicker, Form, Input, Modal, Select, Space, Switch, Table, Tag } from 'antd';
import dayjs from 'dayjs';
import { PlusIcon } from '@primer/octicons-react';
import type { OkrWeeklyReviewCycle } from '../../../services/okrRepository';
import { validateWeeklyCycles, weeklyCycleState } from '../../../services/weeklyReviewCycles';

export const weeklyTemplateLabels = { byRole: '按角色使用员工/主管周报', employee: '员工周报', supervisor: '部门周报' };
export function WeeklyCycleSettings({ rows, disabled, onChange }: { rows: OkrWeeklyReviewCycle[]; disabled: boolean; onChange: (rows: OkrWeeklyReviewCycle[]) => void }) {
  const [month, setMonth] = useState(() => dayjs().format('YYYY-MM'));
  const [editing, setEditing] = useState<OkrWeeklyReviewCycle>();
  const [error, setError] = useState('');
  const [form] = Form.useForm<OkrWeeklyReviewCycle>();
  const [now, setNow] = useState(() => dayjs());
  useEffect(() => { const timer = window.setInterval(() => setNow(dayjs()), 30_000); return () => window.clearInterval(timer); }, []);
  const open = (row?: OkrWeeklyReviewCycle) => {
    const start = dayjs(month + '-01').isAfter(dayjs(), 'day') ? dayjs(month + '-01') : dayjs().add(1, 'day').startOf('day');
    const value: OkrWeeklyReviewCycle = row || { id: crypto.randomUUID(), month: start.format('YYYY-MM'), startDate: start.format('YYYY-MM-DD'), endDate: start.add(6, 'day').format('YYYY-MM-DD'), template: 'byRole', notifyAt: start.add(4, 'day').hour(9).format('YYYY-MM-DDTHH:mm'), deadline: start.add(6, 'day').hour(18).format('YYYY-MM-DDTHH:mm'), allowBackfill: true };
    setEditing(value); form.setFieldsValue(value); setError('');
  };
  const save = async () => {
    if (disabled || !editing) return;
    const value = await form.validateFields().catch(() => undefined);
    if (!value) return;
    const row = { ...editing, ...value, month: value.startDate.slice(0, 7) };
    const next = rows.some(item => item.id === row.id) ? rows.map(item => item.id === row.id ? row : item) : [...rows, row];
    const invalid = validateWeeklyCycles(next, rows);
    if (invalid) { setError(invalid); return; }
    onChange(next); setEditing(undefined);
  };
  return <section className="space-y-4" aria-label="周报周期配置">
    <Space wrap><DatePicker picker="month" allowClear={false} aria-label="周报所属月份" value={dayjs(month + '-01')} onChange={value => { if (value) setMonth(value.format('YYYY-MM')); }}/><Button icon={<PlusIcon/>} disabled={disabled} onClick={() => open()}>增加周期</Button></Space>
    <p className="text-xs text-[var(--text-muted)]">周期归属于开始日期所在月份。开始后锁定，变更需点击保存配置；通知仅在应用在线时提醒。</p>
    <Table rowKey="id" scroll={{ x: true }} dataSource={rows.filter(row => row.month === month).sort((a, b) => a.startDate.localeCompare(b.startDate))} columns={[
      { title: '周期时间', render: (_, row) => `${row.startDate} 至 ${row.endDate}` },
      { title: '周报模板', render: (_, row) => weeklyTemplateLabels[row.template] },
      { title: '通知时间', render: (_, row) => row.notifyAt.replace('T', ' ') },
      { title: '截止时间', render: (_, row) => row.deadline.replace('T', ' ') },
      { title: '可否补录', render: (_, row) => row.allowBackfill ? '允许' : '不允许' },
      { title: '状态', render: (_, row) => <Tag>{weeklyCycleState(row, now)}</Tag> },
      { title: '操作', render: (_, row) => <Space><Button type="link" disabled={disabled || weeklyCycleState(row, now) !== '未开始'} onClick={() => open(row)}>修改</Button><Button type="link" danger disabled={disabled || weeklyCycleState(row, now) !== '未开始'} onClick={() => Modal.confirm({ title: '删除周报周期', content: `确认删除 ${row.startDate} 至 ${row.endDate} 的周报周期吗？`, okText: '确认删除', cancelText: '取消', okButtonProps: { danger: true }, onOk: () => { const next = rows.filter(item => item.id !== row.id); const invalid = validateWeeklyCycles(next, rows); if (invalid) { setError(invalid); return; } onChange(next); } })}>删除</Button></Space> },
    ]}/>
    {!editing && error && <Alert type="error" title={error} showIcon/>}
    <Modal open={Boolean(editing)} title={rows.some(row => row.id === editing?.id) ? '修改周报周期' : '增加周报周期'} onCancel={() => setEditing(undefined)} onOk={() => void save()} okText="确认" cancelText="取消" okButtonProps={{ disabled }}>
      {error && <Alert type="error" title={error} showIcon/>}
      <Form form={form} layout="vertical" disabled={disabled}>
        <Form.Item name="startDate" label="开始日期" rules={[{ required: true, message: '请选择开始日期' }]}><Input aria-label="开始日期" type="date"/></Form.Item>
        <Form.Item name="endDate" label="结束日期" rules={[{ required: true, message: '请选择结束日期' }]}><Input aria-label="结束日期" type="date"/></Form.Item>
        <Form.Item name="template" label="周报模板" rules={[{ required: true }]}><Select options={Object.entries(weeklyTemplateLabels).map(([value, label]) => ({ value, label }))}/></Form.Item>
        <Form.Item name="notifyAt" label="通知时间" rules={[{ required: true, message: '请选择通知时间' }]}><Input aria-label="通知时间" type="datetime-local"/></Form.Item>
        <Form.Item name="deadline" label="截止时间" rules={[{ required: true, message: '请选择截止时间' }]}><Input aria-label="截止时间" type="datetime-local"/></Form.Item>
        <Form.Item name="allowBackfill" label="允许补录" valuePropName="checked"><Switch/></Form.Item>
      </Form>
    </Modal>
  </section>;
}
