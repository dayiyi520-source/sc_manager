import Card from 'antd/es/card/Card';
import { useEffect, useRef, useState } from 'react';
import { Button, DatePicker, Dropdown, Empty, Input, Modal, Select, Space, Tabs, Table, Tag, message } from 'antd';
import dayjs from 'dayjs';
import { EllipsisOutlined } from '@ant-design/icons';
import type { OkrPerson } from '../../../services/okrRepository';
import { FIXED_REVIEW_BLOCKS, newReviewTemplate, validateReviewTemplates, activateReviewTemplate, reviewTemplateEnabled, type ReviewReportTemplate } from '../../../services/reviewTemplateConfiguration';
import { ReviewTemplateBlockCards } from './ReviewTemplateBlockCards';
import { ReviewTemplateFields } from './ReviewTemplateFields';

type Props = { rows: ReviewReportTemplate[]; departments: string[]; people: OkrPerson[]; disabled?: boolean; onEditingChange?: (editing: boolean) => void; onSave: (rows: ReviewReportTemplate[]) => Promise<boolean> };
export function ReviewTemplateSettings({ rows, departments, people, disabled, onEditingChange, onSave }: Props) {
  const [department, setDepartment] = useState<string>();
  const [audience, setAudience] = useState<string>();
  const [reportType, setReportType] = useState<string>();
  const [editing, setEditing] = useState<ReviewReportTemplate | null>(null);
  const isEditing = !!editing;
  useEffect(() => { onEditingChange?.(isEditing); }, [isEditing, onEditingChange]);
  useEffect(() => () => onEditingChange?.(false), [onEditingChange]);
  const [preview, setPreview] = useState<ReviewReportTemplate | null>(null);
  const [pending, setPending] = useState(false);
  const saveLock = useRef(false);
  const locked = disabled || pending;
  const persist = async (next: ReviewReportTemplate[], close = false) => {
    if (locked || saveLock.current) return;
    const error = validateReviewTemplates(next, rows);
    if (error) { message.warning(error); return; }
    saveLock.current = true; setPending(true);
    try { if (await onSave(next)) { if (close) setEditing(null); } }
    catch { message.error('保存失败，已保留模板内容，请重试'); }
    finally { saveLock.current = false; setPending(false); }
  };
  const saveEditing = (status: 'draft' | 'published') => {
    if (!editing) return;
    const next = { ...editing, name: editing.name.trim(), status, blocks: editing.blocks.map(block => ({ ...block, title: block.title.trim(), fields: block.fields.map(field => ({ ...field, label: field.label.trim() })) })) };
    void persist(status === 'published' ? activateReviewTemplate(rows, next) : rows.some(row => row.id === next.id) ? rows.map(row => row.id === next.id ? next : row) : [...rows, next], true);
  };
  const copy = (row: ReviewReportTemplate) => {
    const version = Math.max(0, ...rows.filter(item => item.department === row.department && item.audience === row.audience && item.reportType === row.reportType).map(item => item.version)) + 1;
    setEditing({ ...structuredClone(row), id: crypto.randomUUID(), version, status: 'draft', enabled: false, effectiveFrom: row.reportType === 'month' ? dayjs().add(1, 'month').startOf('month').format('YYYY-MM-DD') : dayjs().add(1, 'day').format('YYYY-MM-DD') });
  };
  return <div className="grid gap-4">
    <>
    <div className="flex justify-between gap-4"><Space wrap><Select aria-label="模板部门查询" placeholder="全部部门" allowClear style={{ width: 160 }} value={department} onChange={setDepartment} options={[{ value: '*', label: '全部门通用' }, ...departments.map(value => ({ value, label: value }))]}/><Select aria-label="模板身份查询" placeholder="全部身份" allowClear style={{ width: 128 }} value={audience} onChange={setAudience} options={[{ value: 'employee', label: '员工' }, { value: 'supervisor', label: '主管' }]}/><Select aria-label="报告类型查询" placeholder="周报 / 月报" allowClear style={{ width: 128 }} value={reportType} onChange={setReportType} options={[{ value: 'week', label: '周报' }, { value: 'month', label: '月报' }]}/></Space><Button type="primary" disabled={locked} onClick={() => { const next = newReviewTemplate(); next.version = Math.max(0, ...rows.filter(row => row.department === '*' && row.audience === 'employee' && row.reportType === 'week').map(row => row.version)) + 1; setEditing(next); }}>新建模板</Button></div>
    <Table rowKey="id" tableLayout="fixed" scroll={{ x: 1000 }} pagination={{ pageSize: 10 }} locale={{ emptyText: <Empty description="暂无复盘总结模板"/> }} dataSource={rows.filter(row => (!department || row.department === department) && (!audience || row.audience === audience) && (!reportType || row.reportType === reportType))} columns={[
      { title: '模板名称', dataIndex: 'name', ellipsis: true }, { title: '部门', dataIndex: 'department', width: 160, ellipsis: true, render: value => value === '*' ? '全部门通用' : value },
      { title: '适用身份', dataIndex: 'audience', width: 96, render: value => value === 'supervisor' ? '主管' : '员工' }, { title: '报告类型', dataIndex: 'reportType', width: 96, render: value => value === 'month' ? '月报' : '周报' },
      { title: '版本', dataIndex: 'version', width: 80, render: value => `V${value}` }, { title: '生效日期', dataIndex: 'effectiveFrom', width: 136, className: 'whitespace-nowrap' }, { title: '状态', width: 112, render: (_, row) => <Tag color={reviewTemplateEnabled(row) ? 'blue' : 'default'}>{row.status === 'draft' ? '草稿' : reviewTemplateEnabled(row) ? '进行中' : '已结束'}</Tag> },
      { title: '操作', width: 192, render: (_, row) => <Space size={4} wrap={false}>
        <Button type="link" disabled={locked} onClick={() => copy(row)}>复制新版本</Button>
        <Dropdown trigger={['click']} menu={{ items: [
          { key: 'preview', label: '预览', onClick: () => setPreview(row) },
          ...(row.status === 'draft' ? [{ key: 'edit', label: '编辑', disabled: locked, onClick: () => setEditing(structuredClone(row)) }] : [{ key: 'toggle', label: reviewTemplateEnabled(row) ? '停用' : '启用', disabled: locked, onClick: () => Modal.confirm({ title: reviewTemplateEnabled(row) ? '停用此模板？' : '启用此模板？', content: reviewTemplateEnabled(row) ? '停用后新报告不再使用此版本，已有报告和草稿保持原样。' : `启用后将停用同部门、身份及报告类型的其他版本；本模板从 ${row.effectiveFrom} 开始的报告期适用，已有报告保持原样。`, onOk: () => persist(reviewTemplateEnabled(row) ? rows.map(item => item.id === row.id ? { ...item, enabled: false } : item) : activateReviewTemplate(rows, row)) }) }]),
          { key: 'delete', label: <span title={reviewTemplateEnabled(row) ? '请先停用再删除' : undefined}>删除</span>, danger: true, disabled: locked || reviewTemplateEnabled(row), onClick: () => Modal.confirm({ title: '删除此模板？', content: '删除后不能恢复此配置，已有报告和草稿保留其模板及填写内容。', onOk: () => persist(rows.filter(item => item.id !== row.id)) }) },
        ] }}><Button type="text" aria-label={`更多操作：${row.name} V${row.version}`} icon={<EllipsisOutlined/>}/></Dropdown>
      </Space> },
    ]}/>
    </>
    {editing && <Modal open title={rows.some(row => row.id === editing.id) ? '编辑模板' : '新建模板'}
      width="100%" style={{ top: 0, maxWidth: '100vw', paddingBottom: 0 }}
      styles={{ container: { height: '100dvh', borderRadius: 0, display: 'flex', flexDirection: 'column', padding: 24 }, body: { flex: 1, minHeight: 0, overflowY: 'auto' } }}
      footer={null} maskClosable={false} closable={!pending} keyboard={!pending} onCancel={() => { if (!pending) setEditing(null); }}>
      <section aria-label="配置复盘总结模板" className="grid gap-4">
      <div className="sticky top-0 z-10 flex items-center justify-end gap-4 border-b border-[var(--border-main)] bg-[var(--bg-surface)] py-4">

        <Space><Button disabled={pending} onClick={() => setEditing(null)}>取消</Button><Button disabled={locked} onClick={() => editing && setPreview(editing)}>预览</Button><Button loading={pending} disabled={disabled} onClick={() => saveEditing('draft')}>保存草稿</Button><Button type="primary" loading={pending} disabled={disabled} onClick={() => editing && Modal.confirm({ title: '发布此模板？', content: `发布后为进行中，并停用同部门、身份及报告类型的其他版本。本模板从 ${editing.effectiveFrom} 开始的报告期适用；在此之前的报告期不会使用它。已有报告保持原样。`, onOk: () => saveEditing('published') })}>发布模板</Button></Space>
      </div>
      <Tabs key={editing.id} defaultActiveKey="basic" items={[
        { key: 'basic', label: '基础信息', children: <div className="grid grid-cols-2 gap-4 pt-4 [&>label]:grid [&>label]:gap-2"><label>模板名称<Input aria-label="模板名称" disabled={locked} maxLength={100} value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })}/></label>
        <label>适用部门<Select aria-label="适用部门" disabled={locked} style={{ width: '100%' }} value={editing.department} options={[{ value: '*', label: '全部门通用' }, ...departments.map(value => ({ value, label: value }))]} onChange={department => setEditing({ ...editing, department, version: Math.max(0, ...rows.filter(row => row.id !== editing.id && row.department === department && row.audience === editing.audience && row.reportType === editing.reportType).map(row => row.version)) + 1 })}/></label>
        <label>适用身份<Select aria-label="适用身份" disabled={locked} style={{ width: '100%' }} value={editing.audience} options={[{ value: 'employee', label: '员工' }, { value: 'supervisor', label: '主管' }]} onChange={audience => setEditing({ ...editing, audience, version: Math.max(0, ...rows.filter(row => row.id !== editing.id && row.department === editing.department && row.audience === audience && row.reportType === editing.reportType).map(row => row.version)) + 1 })}/></label>
        <label>报告类型<Select aria-label="报告类型" disabled={locked} style={{ width: '100%' }} value={editing.reportType} options={[{ value: 'week', label: '周报' }, { value: 'month', label: '月报' }]} onChange={reportType => setEditing({ ...editing, reportType, effectiveFrom: reportType === 'month' ? dayjs().add(1, 'month').startOf('month').format('YYYY-MM-DD') : editing.effectiveFrom, version: Math.max(0, ...rows.filter(row => row.id !== editing.id && row.department === editing.department && row.audience === editing.audience && row.reportType === reportType).map(row => row.version)) + 1 })}/></label>
        <label>生效日期<DatePicker aria-label="生效日期" disabled={locked} style={{ width: '100%' }} picker={editing.reportType === 'month' ? 'month' : 'date'} value={dayjs(editing.effectiveFrom)} onChange={value => value && setEditing({ ...editing, effectiveFrom: (editing.reportType === 'month' ? value.startOf('month') : value).format('YYYY-MM-DD') })}/></label><label>版本<Input aria-label="版本" disabled value={`V${editing.version}`}/></label></div> },
        { key: 'blocks', label: '模块配置', children: <div className="pt-4"><ReviewTemplateBlockCards blocks={editing.blocks} disabled={locked} onChange={blocks => setEditing({ ...editing, blocks })}/></div> },
      ]}/>
    </section></Modal>}
    <Modal title={preview ? `${preview.name || '模板预览'} · V${preview.version}` : '模板预览'} open={!!preview} width={900} styles={{ body: { maxHeight: '65vh', overflowY: 'auto' } }} footer={<Button onClick={() => setPreview(null)}>关闭预览</Button>} onCancel={() => setPreview(null)}>
      <div className="grid gap-4">{preview?.blocks.map(block => <Card key={block.id} size="small" title={block.title}>{FIXED_REVIEW_BLOCKS.some(fixed => fixed.id === block.id) && <p className="text-sm text-[var(--text-secondary)]">保留现有{block.title}业务内容与关联操作</p>}<ReviewTemplateFields block={block} values={{}} onChange={() => {}} people={people} departments={departments} disabled/></Card>)}</div>
    </Modal>
  </div>;
}
