import React, { useRef, useState } from 'react';
import { Alert, Button, Empty, Form, Input, Modal, Popconfirm, Select, Space, Switch, Table, Tag } from 'antd';
import { PencilIcon, PlusIcon, TrashIcon } from '@primer/octicons-react';
import type { OkrObjectiveTitleTemplate } from '../../../services/okrRepository';
import { KR_TEMPLATE_OPTIONS, validateObjectiveTitleTemplates } from '../../../services/okrObjectiveTitleTemplates';

interface Props {
  rows: OkrObjectiveTitleTemplate[];
  departments: string[];
  disabled: boolean;
  onSave: (rows: OkrObjectiveTitleTemplate[]) => Promise<boolean>;
}
const newRow = (): OkrObjectiveTitleTemplate => ({ id: crypto.randomUUID(), department: '', title: '', guidance: '', enabled: true, krTypes: [] });

export function ObjectiveTitleConfiguration({ rows, departments, disabled, onSave }: Props) {
  const [department, setDepartment] = useState<string>();
  const [batchDepartment, setBatchDepartment] = useState('');
  const [editingRows, setEditingRows] = useState<OkrObjectiveTitleTemplate[] | null>(null);
  const [editingExisting, setEditingExisting] = useState(false);
  const [error, setError] = useState('');
  const [listError, setListError] = useState('');
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const locked = disabled || saving;
  const departmentOptions = [...new Set([...departments, ...rows.map(row => row.department)].filter(Boolean))].map(value => ({ value, label: value }));
  const open = (row?: OkrObjectiveTitleTemplate) => {
    setBatchDepartment(row?.department || department || '');
    setEditingRows(row ? [{ ...row, krTypes: [...(row.krTypes || [])] }] : [newRow()]);
    setEditingExisting(Boolean(row)); setError(''); setListError('');
  };
  const patch = (id: string, value: Partial<OkrObjectiveTitleTemplate>) => {
    setEditingRows(current => current?.map(row => row.id === id ? { ...row, ...value } : row) || null);
    setError('');
  };
  const persist = async (next: OkrObjectiveTitleTemplate[], inModal: boolean) => {
    if (disabled || savingRef.current) return;
    const showError = inModal ? setError : setListError;
    savingRef.current = true; setSaving(true); showError('');
    try {
      if (await onSave(next)) { if (inModal) setEditingRows(null); }
      else showError('保存失败，请重试，当前内容已保留');
    } catch { showError('保存失败，请重试，当前内容已保留'); }
    finally { savingRef.current = false; setSaving(false); }
  };
  const submit = async () => {
    if (!editingRows?.length) { setError('请至少添加一条 O 模板'); return; }
    const changed = editingRows.map(row => ({ ...row, department: batchDepartment.trim(), title: row.title.trim(), guidance: row.guidance.trim() }));
    const changedIds = new Set(changed.map(row => row.id));
    const changedById = new Map(changed.map(row => [row.id, row]));
    const existingIds = new Set(rows.map(row => row.id));
    const next = [...rows.map(row => changedIds.has(row.id) ? changedById.get(row.id)! : row), ...changed.filter(row => !existingIds.has(row.id))];
    const validationError = validateObjectiveTitleTemplates(next);
    if (validationError) { setError(validationError); return; }
    await persist(next, true);
  };

  return <div className="okr-title-template-configuration">
    <div className="okr-title-template-toolbar">
      <Select aria-label="按部门筛选目标模板" allowClear placeholder="全部部门" value={department} options={departmentOptions} onChange={setDepartment}/>
      <Button type="primary" icon={<PlusIcon/>} disabled={locked} onClick={() => open()}>添加模板</Button>
    </div>
    <p className="okr-title-template-help">按部门维护 O 标题及支持的 KR 模板，可一次添加多条。</p>
    {listError && <Alert type="error" showIcon title={listError}/>}
    <Table<OkrObjectiveTitleTemplate> rowKey="id" size="middle" pagination={false} scroll={{ x: 800 }} dataSource={rows.filter(row => !department || row.department === department)} locale={{ emptyText: <Empty description={department ? '该部门暂无 O 模板' : '暂无 O 模板'}/> }} columns={[
      { title: '部门', dataIndex: 'department', width: 160, ellipsis: true },
      { title: 'O 标题', dataIndex: 'title', width: 420, render: (value: string) => <span className="okr-template-title-cell" title={value}>{value}</span> },
      { title: 'KR 模板', key: 'krTypes', width: 220, render: (_, row) => <Space size={[4, 4]} wrap>{(row.krTypes || []).map(type => <Tag key={type}>{KR_TEMPLATE_OPTIONS.find(option => option.value === type)?.label}</Tag>)}</Space> },
      { title: '状态', key: 'enabled', width: 96, render: (_, row) => <Tag color={row.enabled ? 'success' : 'default'}>{row.enabled ? '已启用' : '已停用'}</Tag> },
      { title: '操作', key: 'actions', width: 160, render: (_, row) => <Space size="small">
        <Button type="link" icon={<PencilIcon/>} disabled={locked} aria-label={`编辑${row.title}`} onClick={() => open(row)}>编辑</Button>
        <Popconfirm title="删除此 O 模板？" description="已有目标保持不变。" okText="删除" cancelText="取消" disabled={locked} onConfirm={() => persist(rows.filter(item => item.id !== row.id), false)}>
          <Button type="text" danger icon={<TrashIcon/>} disabled={locked} aria-label={`删除${row.title}`}>删除</Button>
        </Popconfirm>
      </Space> },
    ]}/>
    <Modal title={editingExisting ? '编辑模板' : '添加模板'} open={editingRows !== null} onCancel={() => { if (!saving) setEditingRows(null); }} closable={!saving} maskClosable={!saving} keyboard={!saving} destroyOnHidden width="min(64rem, calc(100vw - 2rem))" className="okr-template-modal" footer={<Space><Button disabled={saving} onClick={() => setEditingRows(null)}>取消</Button><Button type="primary" aria-label="提交模板" loading={saving} disabled={disabled} onClick={() => void submit()}>提交</Button></Space>}>
      <Form layout="vertical">
        <Form.Item label="适用部门" required><Select aria-label="模板适用部门" placeholder="请选择部门" disabled={locked} value={batchDepartment || undefined} showSearch optionFilterProp="label" options={departmentOptions} onChange={value => { setBatchDepartment(value); setError(''); }}/></Form.Item>
      </Form>
      <Table<OkrObjectiveTitleTemplate> rowKey="id" size="small" pagination={false} scroll={{ x: 840 }} dataSource={editingRows || []} locale={{ emptyText: <Empty description="请添加 O 模板"/> }} columns={[
        { title: 'O 标题（必填）', key: 'title', width: 240, render: (_, row, index) => <Input aria-label={`第${index + 1}条O标题`} placeholder="输入 O 标题" maxLength={255} disabled={locked} value={row.title} onChange={event => patch(row.id, { title: event.target.value })}/> },
        { title: 'KR 模板（多选）', key: 'krTypes', width: 260, render: (_, row, index) => <Select aria-label={`第${index + 1}条KR模板`} mode="multiple" placeholder="请选择 KR 模板" options={KR_TEMPLATE_OPTIONS} disabled={locked} value={row.krTypes} onChange={values => patch(row.id, { krTypes: values })}/> },
        { title: '填写说明', key: 'guidance', width: 200, render: (_, row, index) => <Input aria-label={`第${index + 1}条填写说明`} placeholder="选填" maxLength={500} disabled={locked} value={row.guidance} onChange={event => patch(row.id, { guidance: event.target.value })}/> },
        { title: '启用', key: 'enabled', width: 64, render: (_, row, index) => <Switch aria-label={`启用第${index + 1}条模板`} disabled={locked} checked={row.enabled} onChange={enabled => patch(row.id, { enabled })}/> },
        { title: '操作', key: 'remove', width: 64, render: (_, row, index) => <Button type="text" danger icon={<TrashIcon/>} aria-label={`移除第${index + 1}条O模板`} disabled={locked || editingRows?.length === 1} onClick={() => { setEditingRows(current => current && current.length > 1 ? current.filter(item => item.id !== row.id) : current); setError(''); }}/> },
      ]}/>
      <Button className="okr-template-add-row" icon={<PlusIcon/>} disabled={locked} onClick={() => { setEditingRows(current => [...(current || []), newRow()]); setError(''); }}>继续添加O标题</Button>
      {error && <Alert type="error" showIcon title={error}/>}
    </Modal>
  </div>;
}