import { FeedSummary } from './FeedSummary';
import { FEED_TAB_KEY, readWorkbenchTab, rememberWorkbenchTab } from '../../services/workbenchPreferences';
import { useRef, useState } from 'react';
import { Alert, Button, Empty, Form, Input, Modal, Pagination, Select, Space, Tabs, Typography } from 'antd';
import { ArrowLeftIcon, PlusIcon } from '@primer/octicons-react';
import dayjs from 'dayjs';
import { useApp } from '../../context/AppContext';
import { createWorkbenchFeed, feedTypes, newsTypes, productVersions, type FeedInput, type FeedType } from '../../services/workbenchFeeds';
import { useWorkbenchFeeds } from './useWorkbenchFeeds';
import { OkrProvider } from './okr/OkrProvider';

export function WorkbenchFeedsView({ onBack }: { onBack: () => void }) { return <OkrProvider><FeedsPage onBack={onBack}/></OkrProvider>; }
function FeedsPage({ onBack }: { onBack: () => void }) {
  const { productLines, versions, projects, customers, currentUser } = useApp();
  const catalog = { products: productLines, versions, projects, customers };
  const { feeds, error, reload } = useWorkbenchFeeds();
  const [tab, setTab] = useState<FeedType>(() => { const saved = readWorkbenchTab(FEED_TAB_KEY); return feedTypes.find(row => row.key === saved)?.key || 'dynamic'; });
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const [saveError, setSaveError] = useState<string>();
  const [form] = Form.useForm<FeedInput>();
  const type = Form.useWatch('type', form);
  const productId = Form.useWatch('productId', form);
  const projectId = Form.useWatch('projectId', form);
  const project = projects.find(row => row.id === projectId);
  const projectCustomer = project?.customerName || customers.find(row => row.id === project?.customerId)?.name;
  const filtered = feeds.filter(row => row.type === tab && [row.title, row.content, row.productName, row.versionName, row.projectName, row.type !== 'competitor' ? row.customer : undefined, row.activityName, row.newsType].some(value => value?.toLowerCase().includes(query.trim().toLowerCase())));
  const startCreate = () => { form.resetFields(); form.setFieldsValue({ type: tab }); setSaveError(undefined); setOpen(true); };
  const save = async () => {
    if (savingRef.current) return;
    savingRef.current = true;
    let input: FeedInput;
    try { input = await form.validateFields(); } catch { savingRef.current = false; return; }
    setSaving(true); setSaveError(undefined);
    try { createWorkbenchFeed(input, catalog, currentUser); setTab(input.type); rememberWorkbenchTab(FEED_TAB_KEY, input.type); setQuery(''); setPage(1); setOpen(false); }
    catch (error) { setSaveError(error instanceof Error ? error.message : '保存失败，请重试'); }
    finally { savingRef.current = false; setSaving(false); }
  };
  return <div className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-4"><Button type="text" icon={<ArrowLeftIcon/>} onClick={onBack}>返回我的任务</Button><Button type="primary" icon={<PlusIcon/>} disabled={Boolean(error)} onClick={startCreate}>新增动态与评价</Button></div>
    {error && <Alert type="error" showIcon title={error} action={<Button onClick={reload}>重试</Button>}/>}
    <section className="rounded-xl border border-[var(--border-main)] bg-[var(--bg-surface)] p-4">
      <Tabs activeKey={tab} onChange={key => { setTab(key as FeedType); rememberWorkbenchTab(FEED_TAB_KEY, key); setPage(1); }} items={feedTypes.map(type => ({ key: type.key, label: `${type.label} (${feeds.filter(row => row.type === type.key).length})` }))}/>
      <div className="w-[var(--workbench-query-width)] max-w-full"><Input.Search aria-label="搜索动态与评价" placeholder="搜索标题、简要或关联信息" allowClear value={query} onChange={event => { setQuery(event.target.value); setPage(1); }}/></div>
      <div className="divide-y divide-[var(--border-main)]">
        {!error && !filtered.length && <Empty className="py-8" description="暂无动态与评价"/>}
        {filtered.slice((page - 1) * 10, page * 10).map(feed => <article key={feed.id} className="space-y-3 py-6">
          <h2 className="break-words text-base font-semibold text-[var(--text-primary)]">{feed.title}</h2>
          <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-[var(--text-muted)]"><span>{dayjs(feed.time).isValid() ? dayjs(feed.time).format('YYYY-MM-DD HH:mm') : feed.time}</span><span>{feed.author || '未记录发布人'}</span></div>
          <Space wrap className="text-sm text-[var(--text-muted)]">{feed.productName && <span>产品：{feed.productName}</span>}{feed.versionName && <span>版本：{feed.versionName}</span>}{feed.projectName && <span>项目：{feed.projectName}</span>}{feed.type !== 'competitor' && feed.customer && <span>客户：{feed.customer}</span>}{feed.type === 'competitor' && <span>资讯类型：{feed.newsType || '未分类'}</span>}{feed.activityName && <span>活动：{feed.activityName}</span>}</Space>
          <FeedSummary content={feed.content}/>
        </article>)}
      </div>
      <div className="flex justify-end pt-4"><Pagination current={page} pageSize={10} total={filtered.length} showSizeChanger={false} onChange={setPage} hideOnSinglePage/></div>
    </section>
    <Modal open={open} title="新增动态与评价" onCancel={() => { if (!saving) setOpen(false); }} onOk={() => void save()} confirmLoading={saving} okText="保存" cancelText="取消" cancelButtonProps={{ disabled: saving }} mask={{ closable: !saving }} keyboard={!saving} destroyOnHidden>
      {saveError && <Alert className="mb-4" type="error" showIcon title={saveError}/>}
      <Form form={form} initialValues={{ type: tab }} layout="vertical" disabled={saving} preserve={false}>
        <Form.Item name="type" label="类型" rules={[{ required: true, message: '请选择类型' }]}><Select options={feedTypes.map(row => ({ value: row.key, label: row.label }))} onChange={() => { form.setFieldsValue({ productId: undefined, versionId: undefined, projectId: undefined, customerId: undefined, activityName: undefined, newsType: undefined }); setSaveError(undefined); }}/></Form.Item>
        <Form.Item name="title" label="标题" rules={[{ required: true, whitespace: true, message: '请输入标题' }, { max: 120 }]}><Input placeholder="请输入标题" maxLength={120} showCount/></Form.Item>
        {type === 'competitor' && <Form.Item name="newsType" label="资讯类型" rules={[{ required: true, message: '请选择资讯类型' }]}><Select placeholder="请选择资讯类型" options={newsTypes.map(value => ({ value, label: value }))}/></Form.Item>}
        {type === 'dynamic' && <>
          <Form.Item name="productId" label="关联产品" rules={[{ required: true, message: '请选择产品' }]}><Select showSearch optionFilterProp="label" placeholder="请选择产品" options={productLines.map(row => ({ value: row.id, label: row.name }))} onChange={() => form.setFieldValue('versionId', undefined)}/></Form.Item>
          <Form.Item name="versionId" label="关联版本" rules={[{ required: true, message: '请选择版本' }]}><Select showSearch optionFilterProp="label" disabled={!productId} placeholder="请选择版本" options={productVersions(catalog, productId).map(row => ({ value: row.id, label: row.name }))}/></Form.Item>
        </>}
        {type === 'feedback' && <>
          <Form.Item name="projectId" label="关联项目" rules={[{ required: true, message: '请选择项目' }]}><Select showSearch optionFilterProp="label" placeholder="请选择项目" options={projects.map(row => ({ value: row.id, label: row.name }))}/></Form.Item>
          <Form.Item label="客户"><Input readOnly value={projectCustomer || ''} placeholder={project ? '该项目未关联客户' : '选择项目后自动带入客户'}/></Form.Item>
          {project && !projectCustomer && <Typography.Paragraph type="secondary">该项目未关联客户，将保留项目关联。</Typography.Paragraph>}
        </>}
        {type === 'competitor' && <>
          <Form.Item name="activityName" label="关联活动" rules={[{ max: 120 }]}><Input maxLength={120} placeholder="填写活动名称"/></Form.Item>
        </>}
        <Form.Item name="content" label="简要" rules={[{ required: true, whitespace: true, message: '请输入内容简要' }, { max: 10000 }]}><Input.TextArea placeholder="请输入内容简要" rows={6} maxLength={10000} showCount/></Form.Item>
      </Form>
    </Modal>
  </div>;
}
