import { useEffect, useRef, useState } from 'react';
import { Alert, Button, Form, Input, Modal, Select, Space, Switch, Table, Tag } from 'antd';
import dayjs from 'dayjs';
import { PlusIcon } from '@primer/octicons-react';
import type { OkrWeeklyReviewCycle } from '../../../services/okrRepository';
import { validateWeeklyCycles, weeklyCycleState } from '../../../services/weeklyReviewCycles';

export function WeeklyCycleSettings({ rows, disabled, onChange }: { rows: OkrWeeklyReviewCycle[]; disabled: boolean; onChange: (rows: OkrWeeklyReviewCycle[]) => void | Promise<boolean> }) {
  const [month, setMonth] = useState(() => {
    const saved = window.sessionStorage.getItem('okr.settings.weeklyCycleMonth');
    return saved && /^\d{4}-\d{2}$/.test(saved) && dayjs(saved + '-01').format('YYYY-MM') === saved ? saved : 'all';
  });
  const months = [...new Set([dayjs().format('YYYY-MM'), ...rows.map(row => row.month), ...(month === 'all' ? [] : [month])])].sort().reverse();
  const [editing, setEditing] = useState<OkrWeeklyReviewCycle>();
  const [saving, setSaving] = useState(false);
  const locked = useRef(false);
  const blocked = disabled || saving;
  const [error, setError] = useState('');
  const [form] = Form.useForm<OkrWeeklyReviewCycle>();
  const [now, setNow] = useState(() => dayjs());
  useEffect(() => { const timer = window.setInterval(() => setNow(dayjs()), 30_000); return () => window.clearInterval(timer); }, []);
  const open = (row?: OkrWeeklyReviewCycle) => {
    const start = month !== 'all' && month !== dayjs().format('YYYY-MM') ? dayjs(month + '-01') : dayjs().add(1, 'day').startOf('day');
    const value: OkrWeeklyReviewCycle = row || { id: crypto.randomUUID(), title: '', month: start.format('YYYY-MM'), startDate: start.format('YYYY-MM-DD'), endDate: start.add(6, 'day').format('YYYY-MM-DD'), notifyAt: start.add(4, 'day').hour(9).format('YYYY-MM-DDTHH:mm'), deadline: start.add(6, 'day').hour(18).format('YYYY-MM-DDTHH:mm'), allowBackfill: true };
    setEditing(value); form.resetFields(); form.setFieldsValue({ ...value, title: value.title || '' }); setError('');
  };
  const persist = async (next: OkrWeeklyReviewCycle[]) => {
    if (blocked || locked.current) return false;
    locked.current = true; setSaving(true); setError('');
    try {
      if (await onChange(next) === false) { setError('保存失败，请重试，当前内容已保留'); return false; }
      return true;
    } catch { setError('保存失败，请重试，当前内容已保留'); return false; }
    finally { locked.current = false; setSaving(false); }
  };
  const save = async () => {
    if (blocked || !editing) return;
    const value = await form.validateFields().catch(() => undefined);
    if (!value) return;
    const row = { ...editing, ...value, title: value.title?.trim(), month: value.startDate.slice(0, 7) };
    const next = rows.some(item => item.id === row.id) ? rows.map(item => item.id === row.id ? row : item) : [...rows, row];
    const invalid = validateWeeklyCycles(next, rows);
    if (invalid) { setError(invalid); return; }
    if (await persist(next)) {
      if (month !== 'all') { window.sessionStorage.setItem('okr.settings.weeklyCycleMonth', row.month); setMonth(row.month); }
      setEditing(undefined);
    }
  };
  return <section className="space-y-4" aria-label="周期配置">
    <div className="flex flex-wrap items-center justify-between gap-4"><Space><span>周期</span><Select className="min-w-40" aria-label="周期筛选" value={month} options={[{ value: 'all', label: '全部周期' }, ...months.map(value => ({ value, label: dayjs(value + '-01').format('YYYY年MM月') }))]} onChange={value => { window.sessionStorage.setItem('okr.settings.weeklyCycleMonth', value); setMonth(value); }}/></Space><Button type="primary" icon={<PlusIcon/>} disabled={blocked} onClick={() => open()}>增加周期</Button></div>
    <p className="text-xs text-[var(--text-muted)]">周期归属于开始日期所在月份，可新增和修改过去的周期，确认后立即生效；截止后需开启允许补录，员工方可填写；已开始周期不可删除；通知仅在应用在线时提醒。</p>
    <Table rowKey="id" scroll={{ x: true }} dataSource={rows.filter(row => month === 'all' || row.month === month).sort((a, b) => a.startDate.localeCompare(b.startDate))} columns={[
      { title: '标题', render: (_, row) => row.title || `${row.startDate} 至 ${row.endDate}` },
      { title: '周期时间', render: (_, row) => `${row.startDate} 至 ${row.endDate}` },
      { title: '通知时间', render: (_, row) => row.notifyAt.replace('T', ' ') },
      { title: '截止时间', render: (_, row) => row.deadline.replace('T', ' ') },
      { title: '可否补录', render: (_, row) => row.allowBackfill ? '允许' : '不允许' },
      { title: '状态', render: (_, row) => { const state = weeklyCycleState(row, now); return <Tag color={state === '进行中' ? 'blue' : state === '未开始' ? 'gold' : undefined}>{state}</Tag>; } },
      { title: '操作', render: (_, row) => <Space><Button type="link" disabled={blocked} onClick={() => open(row)}>修改</Button><Button type="link" danger disabled={blocked || weeklyCycleState(row, now) !== '未开始'} onClick={() => Modal.confirm({ title: '删除周报周期', content: `确认删除 ${row.startDate} 至 ${row.endDate} 的周报周期吗？`, okText: '确认删除', cancelText: '取消', okButtonProps: { danger: true }, onOk: async () => { const next = rows.filter(item => item.id !== row.id); const invalid = validateWeeklyCycles(next, rows); if (invalid) { setError(invalid); return; } if (!await persist(next)) throw new Error('保存失败'); } })}>删除</Button></Space> },
    ]}/>
    {!editing && error && <Alert type="error" title={error} showIcon/>}
    <Modal open={Boolean(editing)} title={rows.some(row => row.id === editing?.id) ? '修改周报周期' : '增加周报周期'} closable={!blocked} maskClosable={!blocked} keyboard={!blocked} confirmLoading={saving} cancelButtonProps={{ disabled: blocked }} onCancel={() => { if (!blocked) setEditing(undefined); }} onOk={() => void save()} okText="确认" cancelText="取消" okButtonProps={{ disabled: blocked }}>
      {error && <Alert type="error" title={error} showIcon/>}
      <Form form={form} layout="vertical" disabled={blocked}>
        <Form.Item name="title" label="标题" rules={[{ required: true, whitespace: true, message: '请输入标题' }, { max: 100, message: '标题最多100个字符' }]}><Input aria-label="周期标题" placeholder="请输入标题" maxLength={100}/></Form.Item>
        <Form.Item name="startDate" label="开始日期" rules={[{ required: true, message: '请选择开始日期' }]}><Input aria-label="开始日期" type="date"/></Form.Item>
        <Form.Item name="endDate" label="结束日期" rules={[{ required: true, message: '请选择结束日期' }]}><Input aria-label="结束日期" type="date"/></Form.Item>
        <Form.Item name="notifyAt" label="通知时间" rules={[{ required: true, message: '请选择通知时间' }]}><Input aria-label="通知时间" type="datetime-local"/></Form.Item>
        <Form.Item name="deadline" label="截止时间" rules={[{ required: true, message: '请选择截止时间' }]}><Input aria-label="截止时间" type="datetime-local"/></Form.Item>
        <Form.Item name="allowBackfill" label="允许补录" valuePropName="checked"><Switch/></Form.Item>
      </Form>
    </Modal>
  </section>;
}
