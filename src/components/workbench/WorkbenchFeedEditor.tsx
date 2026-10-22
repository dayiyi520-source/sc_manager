import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Alert, Button, Cascader, Form, Input, Modal, Select, Space } from 'antd';
import { useApp } from '../../context/AppContext';
import { createWorkbenchFeed, informationTags, type FeedInput, type FeedType, type WorkbenchFeed } from '../../services/workbenchFeeds';
import { organizationOptions } from '../../services/workbenchAudience';
import { teamRepository } from '../../services/teamRepository';
import type { EmployeeOption } from '../../types';
import { LazyRichTextEditor } from '../product/LazyRichTextEditor';

export interface WorkbenchFeedEditorHandle { cancel: (afterCancel?: () => void) => void }
const snapshot = (input: Partial<FeedInput>) => JSON.stringify([input.title || '', input.content || '', input.contentHtml || '', input.projectId || '', input.productId || '', input.customerId || '', [...(input.tags || [])].sort(), (input.audienceScopes || []).map(path => JSON.stringify(path)).sort()]);
export const WorkbenchFeedEditor = forwardRef<WorkbenchFeedEditorHandle, { feed?: WorkbenchFeed; source?: WorkbenchFeed['source']; preset?: Partial<FeedInput>; initialType?: FeedType; onSaved: (feed: WorkbenchFeed) => void; onCancel: () => void }>(function WorkbenchFeedEditor({ feed, source, preset, onSaved, onCancel }, ref) {
  const { productLines = [], versions = [], projects = [], customers = [], currentUser } = useApp();
  const [initialValues] = useState<Partial<FeedInput>>(() => feed ? { ...feed, type: 'square' } : { type: 'square', ...preset });
  const baseline = useRef(snapshot(initialValues));
  const [form] = Form.useForm<FeedInput>();
  const [people, setPeople] = useState<EmployeeOption[]>([]);
  const [peopleError, setPeopleError] = useState<string>();
  const [peopleLoading, setPeopleLoading] = useState(true);
  const [peopleAttempt, setPeopleAttempt] = useState(0);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const confirmingRef = useRef(false);
  const [saveError, setSaveError] = useState<string>();
  const editorRef = useRef<HTMLDivElement>(null);
  const content = Form.useWatch('content', form) || '';
  const contentHtml = Form.useWatch('contentHtml', form) || '';
  useEffect(() => {
    let active = true;
    setPeopleError(undefined); setPeopleLoading(true);
    teamRepository.options().then(rows => { if (active) setPeople(rows); }).catch(() => { if (active) setPeopleError('组织部门加载失败，请重试'); }).finally(() => { if (active) setPeopleLoading(false); });
    return () => { active = false; };
  }, [peopleAttempt]);
  const cancel = (afterCancel = onCancel) => {
    if (savingRef.current || confirmingRef.current) return;
    if (snapshot(form.getFieldsValue(true)) === baseline.current) { afterCancel(); return; }
    confirmingRef.current = true;
    Modal.confirm({ title: '是否放弃本次编辑', content: '放弃后，本次修改不会保存。', okText: '放弃编辑', cancelText: '继续编辑', onOk: afterCancel, onCancel: () => { confirmingRef.current = false; }, afterClose: () => { confirmingRef.current = false; } });
  };
  useImperativeHandle(ref, () => ({ cancel }));
  const save = async () => {
    if (savingRef.current || peopleLoading || peopleError) return;
    savingRef.current = true;
    let input: FeedInput;
    try { input = await form.validateFields(); } catch { savingRef.current = false; return; }
    setSaving(true); setSaveError(undefined);
    try {
      const saved = createWorkbenchFeed({ ...input, type: 'square' }, { products: productLines, versions, projects, customers, people }, currentUser, feed?.id, source);
      onSaved(saved);
    } catch (error) { setSaveError(error instanceof Error ? error.message : '保存失败，请重试'); }
    finally { savingRef.current = false; setSaving(false); }
  };
  return <div className="flex h-full min-h-0 flex-col">
    {saveError && <Alert className="mx-4 mt-4" type="error" showIcon title={saveError}/>}
    <div className="min-h-0 flex-1 overflow-y-auto p-4 lg:p-6"><Form form={form} initialValues={initialValues} layout="vertical" disabled={saving}>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="min-w-0">
          <Form.Item name="title" label="标题" rules={[{ required: true, whitespace: true, message: '请输入标题' }, { max: 120 }]}><Input placeholder="请输入标题" maxLength={120} showCount/></Form.Item>
          <Form.Item name="content" hidden rules={[{ required: true, whitespace: true, message: '请输入信息简介' }, { max: 10000, message: '信息简介不能超过 10000 字' }]}><Input/></Form.Item>
          <Form.Item name="contentHtml" hidden><Input/></Form.Item>
          <Form.Item label="信息简介" required><LazyRichTextEditor key={feed?.id || 'new'} size="feed" editor={editorRef} value={content} htmlValue={contentHtml} readOnly={saving} placeholder="请输入信息简介" onInput={(text, html) => form.setFieldsValue({ content: text, contentHtml: html })}/><div className="mt-2 text-xs text-[var(--text-muted)]">{content.length} / 10000 字</div><Form.ErrorList errors={form.getFieldError('content')}/></Form.Item>
        </div>
        <aside className="min-w-0 lg:border-l lg:border-[var(--border-main)] lg:pl-4">
          <Form.Item name="projectId" label="关联项目"><Select allowClear showSearch optionFilterProp="label" placeholder="请选择项目（选填）" options={projects.map(row => ({ value: row.id, label: row.name }))}/></Form.Item>
          <Form.Item name="productId" label="关联产品"><Select allowClear showSearch optionFilterProp="label" placeholder="请选择产品（选填）" options={productLines.map(row => ({ value: row.id, label: row.name }))}/></Form.Item>
          <Form.Item name="customerId" label="关联客户"><Select allowClear showSearch optionFilterProp="label" placeholder="请选择客户（选填）" options={customers.map(row => ({ value: row.id, label: row.name }))}/></Form.Item>
          <Form.Item name="tags" label="信息标签" rules={[{ required: true, type: 'array', min: 1, message: '请选择信息标签' }]}><Select mode="multiple" placeholder="请选择信息标签" options={informationTags.map(value => ({ value, label: value }))}/></Form.Item>
          <Form.Item name="audienceScopes" label="可见范围" rules={[{ required: true, type: 'array', min: 1, message: '请选择可见范围' }]}><Cascader multiple showCheckedStrategy={Cascader.SHOW_PARENT} options={organizationOptions(people)} disabled={peopleLoading || Boolean(peopleError)} placeholder={peopleLoading ? '正在加载组织部门...' : '请选择组织或部门'} maxTagCount="responsive"/></Form.Item>
          {peopleError && <Alert type="error" showIcon title={peopleError} action={<Button onClick={() => setPeopleAttempt(value => value + 1)}>重试</Button>}/>}
          {feed?.visibility === 'specified' && !feed.audienceScopes?.length && <Alert type="info" title="此信息原按成员指定范围，保存前请重新选择组织或部门。"/>}
        </aside>
      </div>
    </Form></div>
    <div className="flex shrink-0 justify-end border-t border-[var(--border-main)] bg-[var(--bg-surface)] px-4 py-3 lg:px-6"><Space><Button disabled={saving} onClick={() => cancel()}>取消</Button><Button type="primary" disabled={peopleLoading || Boolean(peopleError)} loading={saving} onClick={() => void save()}>保存</Button></Space></div>
  </div>;
});
