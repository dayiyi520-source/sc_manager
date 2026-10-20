import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Alert, Button, Form, Input, Modal, Select, Space, TreeSelect, Typography } from 'antd';
import { useApp } from '../../context/AppContext';
import { createWorkbenchFeed, feedbackProducts, feedTypes, newsTypes, productVersions, type FeedInput, type FeedType, type WorkbenchFeed } from '../../services/workbenchFeeds';
import { teamRepository } from '../../services/teamRepository';
import type { EmployeeOption } from '../../types';
import { LazyRichTextEditor } from '../product/LazyRichTextEditor';

export interface WorkbenchFeedEditorHandle { cancel: (afterCancel?: () => void) => void }
const inputKeys: Array<keyof FeedInput> = ['type', 'title', 'content', 'contentHtml', 'visibility', 'audienceIds', 'productId', 'versionId', 'projectId', 'customerId', 'activityName', 'newsType'];
function snapshot(input: Partial<FeedInput>) {
  return JSON.stringify(inputKeys.map(key => key === 'audienceIds' ? [...(input.audienceIds || [])].sort() : input[key] || ''));
}
export const WorkbenchFeedEditor = forwardRef<WorkbenchFeedEditorHandle, { feed?: WorkbenchFeed; initialType?: FeedType; onSaved: (feed: WorkbenchFeed) => void; onCancel: () => void }>(function WorkbenchFeedEditor({ feed, initialType = 'dynamic', onSaved, onCancel }, ref) {
  const { productLines, versions, projects, customers, currentUser } = useApp();
  const catalog = { products: productLines, versions, projects, customers };
  const editingId = feed?.id;
  const [initialValues] = useState(() => feed ? { ...feed, visibility: feed.visibility || 'all' } : { type: initialType, visibility: 'all' } as FeedInput);
  const baseline = useRef(snapshot(initialValues));
  const [form] = Form.useForm<FeedInput>();
  const [people, setPeople] = useState<EmployeeOption[]>([]);
  const [peopleError, setPeopleError] = useState<string>();
  const [peopleAttempt, setPeopleAttempt] = useState(0);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const confirmingRef = useRef(false);
  const [saveError, setSaveError] = useState<string>();
  const editorRef = useRef<HTMLDivElement>(null);
  const type = Form.useWatch('type', form);
  const content = Form.useWatch('content', form) || '';
  const contentHtml = Form.useWatch('contentHtml', form) || '';
  const visibility = Form.useWatch('visibility', form);
  const productId = Form.useWatch('productId', form);
  const projectId = Form.useWatch('projectId', form);
  const project = projects.find(row => row.id === projectId);
  const feedbackProductOptions = feedbackProducts(catalog, projectId);
  const projectCustomer = project?.customerName || customers.find(row => row.id === project?.customerId)?.name;
  const peopleTree = [...new Set(people.map(person => person.department || '未分配部门'))].map(department => ({ title: department, value: `department:${department}`, children: people.filter(person => (person.department || '未分配部门') === department).map(person => ({ title: person.name, value: person.id })) }));
  useEffect(() => {
    let active = true;
    setPeopleError(undefined);
    teamRepository.options().then(rows => { if (active) setPeople(rows); }).catch(() => { if (active) setPeopleError('可见人员加载失败，请重试'); });
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
    if (savingRef.current) return;
    savingRef.current = true;
    let input: FeedInput;
    try { input = await form.validateFields(); } catch { savingRef.current = false; return; }
    setSaving(true); setSaveError(undefined);
    try {
      if (input.visibility === 'specified' && (peopleError || !input.audienceIds?.every(id => people.some(person => person.id === id)))) throw new Error('请选择有效的可见人员，人员加载失败时请重试');
      const saved = createWorkbenchFeed(input, catalog, currentUser, editingId);
      onSaved(saved);
    } catch (error) { setSaveError(error instanceof Error ? error.message : '保存失败，请重试'); }
    finally { savingRef.current = false; setSaving(false); }
  };
  return <div className="flex h-full min-h-0 flex-col">
    {saveError && <Alert className="mx-4 mt-4" type="error" showIcon title={saveError}/>}
      <Form form={form} initialValues={initialValues} layout="vertical" className="min-h-0 flex-1 overflow-y-auto" style={{ padding: 24 }} disabled={saving} preserve={false}>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
          <div className="min-w-0">
        <Form.Item name="title" label="标题" rules={[{ required: true, whitespace: true, message: '请输入标题' }, { max: 120 }]}><Input placeholder="请输入标题" maxLength={120} showCount/></Form.Item>
        <Form.Item name="content" hidden rules={[{ required: true, whitespace: true, message: '请输入信息简介' }, { max: 10000, message: '信息简介不能超过 10000 字' }]}><Input/></Form.Item>
        <Form.Item name="contentHtml" hidden><Input/></Form.Item>
        <Form.Item label="信息简介" required><LazyRichTextEditor key={editingId || 'new'} size="feed" editor={editorRef} value={content} htmlValue={contentHtml} readOnly={saving} placeholder="请输入信息简介" onInput={(text, html) => { form.setFieldsValue({ content: text, contentHtml: html }); }}/><div className="mt-2 text-xs text-[var(--text-muted)]">{content.length} / 10000 字</div><Form.ErrorList errors={form.getFieldError('content')}/></Form.Item>
          </div>
          <aside className="min-w-0 lg:border-l lg:border-[var(--border-main)] lg:pl-4">
        <Form.Item name="type" label="类型" rules={[{ required: true, message: '请选择类型' }]}><Select options={feedTypes.map(row => ({ value: row.key, label: row.label }))} onChange={() => { form.setFieldsValue({ productId: undefined, versionId: undefined, projectId: undefined, customerId: undefined, activityName: undefined, newsType: undefined }); setSaveError(undefined); }}/></Form.Item>
        {type === 'competitor' && <Form.Item name="newsType" label="资讯类型" rules={[{ required: true, message: '请选择资讯类型' }]}><Select placeholder="请选择资讯类型" options={newsTypes.map(value => ({ value, label: value }))}/></Form.Item>}
        {type === 'dynamic' && <>
          <Form.Item name="productId" label="关联产品" rules={[{ required: true, message: '请选择产品' }]}><Select showSearch optionFilterProp="label" placeholder="请选择产品" options={productLines.map(row => ({ value: row.id, label: row.name }))} onChange={() => form.setFieldValue('versionId', undefined)}/></Form.Item>
          <Form.Item name="versionId" label="关联版本" rules={[{ required: true, message: '请选择版本' }]}><Select showSearch optionFilterProp="label" disabled={!productId} placeholder="请选择版本" options={productVersions(catalog, productId).map(row => ({ value: row.id, label: row.name }))}/></Form.Item>
        </>}
        {type === 'feedback' && <>
          <Form.Item name="projectId" label="关联项目" rules={[{ required: true, message: '请选择项目' }]}><Select showSearch optionFilterProp="label" placeholder="请选择项目" options={projects.map(row => ({ value: row.id, label: row.name }))} onChange={() => form.setFieldValue('productId', undefined)}/></Form.Item>
          <Form.Item name="productId" label="关联产品"><Select disabled={!projectId || !feedbackProductOptions.length} allowClear showSearch optionFilterProp="label" placeholder={!projectId ? '请先选择项目' : feedbackProductOptions.length ? '请选择产品' : '该项目暂无可选产品'} options={feedbackProductOptions.map(row => ({ value: row.id, label: row.name }))}/></Form.Item>
          <Form.Item label="客户"><Input readOnly value={projectCustomer || ''} placeholder={project ? '该项目未关联客户' : '选择项目后自动带入客户'}/></Form.Item>
          {project && !projectCustomer && <Typography.Paragraph type="secondary">该项目未关联客户，将保留项目关联。</Typography.Paragraph>}
        </>}
        {type === 'competitor' && <>
          <Form.Item name="productId" label="关联产品"><Select showSearch allowClear optionFilterProp="label" placeholder="请选择产品" options={productLines.map(row => ({ value: row.id, label: row.name }))}/></Form.Item>
        </>}
        <Form.Item name="visibility" label="可见范围" rules={[{ required: true }]}><Select options={[{ value: 'all', label: '全员' }, { value: 'specified', label: '指定人员' }]}/></Form.Item>
        {visibility === 'specified' && <><Form.Item name="audienceIds" label="可见人员" rules={[{ required: true, message: '请选择可见人员' }]}><TreeSelect treeCheckable showCheckedStrategy={TreeSelect.SHOW_CHILD} treeNodeFilterProp="title" placeholder="请选择部门或成员" treeData={peopleTree} treeDefaultExpandAll/></Form.Item>{peopleError && <Alert type="error" title={peopleError} action={<Button onClick={() => setPeopleAttempt(value => value + 1)}>重试</Button>}/>}</>}
          </aside>
        </div>
      </Form>
    <div className="flex shrink-0 justify-end border-t border-[var(--border-main)] bg-[var(--bg-surface)] px-4 py-3 lg:px-6"><Space><Button disabled={saving} onClick={() => cancel()}>取消</Button><Button type="primary" loading={saving} onClick={() => void save()}>保存</Button></Space></div>
  </div>;
});
