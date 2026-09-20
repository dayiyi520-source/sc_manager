import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Alert, Button, Empty, Form, Input, Modal, Select, Spin, Table, Tag } from 'antd';
import { ArrowLeftOutlined, DeleteOutlined, EditOutlined, PlusOutlined, SaveOutlined } from '@ant-design/icons';
import { productRepository } from '../../services/productRepository';
import type { TestReportMetric, VersionTestReportListItem } from '../../types/testManagement';
import { useApp } from '../../context/AppContext';
import { showDeleteConfirm } from '../common/Feedback';
import { PersonIdentity } from '../common/PersonIdentity';
import { LazyRichTextEditor as RichTextEditor } from './LazyRichTextEditor';

type Props = { productLineId: string; versionId: string; versionName: string };
type ReportForm = { name: string; productLineId?: string; versionId?: string; testPlanIds: string[] };

const dateTime = (value?: string) => value ? new Date(value).toLocaleString('zh-CN', { hour12: false }) : '--';
const planLabel = (report: VersionTestReportListItem) => report.planCount > 1 ? `${report.firstPlanName || '测试计划'}等${report.planCount}个` : report.firstPlanName || '--';

const DistributionBars: React.FC<{ items: TestReportMetric[]; tone?: 'primary' | 'danger' }> = ({ items, tone = 'primary' }) => {
  const max = Math.max(1, ...items.map((item) => item.value));
  return <div className="space-y-3">{items.map((item) => <div key={item.name} className="grid grid-cols-[56px_minmax(0,1fr)_36px] items-center gap-3 text-xs"><span className="text-[var(--text-muted)]">{item.name}</span><div className="h-2 overflow-hidden rounded-full bg-[var(--border-main)]"><div className={`h-full rounded-full ${tone === 'danger' ? 'bg-[var(--danger)]' : 'bg-[var(--primary)]'}`} style={{ width: `${item.value / max * 100}%` }} /></div><span className="text-right font-mono text-[var(--text-primary)]">{item.value}</span></div>)}</div>;
};

const Donut: React.FC<{ items: TestReportMetric[]; label: string }> = ({ items, label }) => {
  const total = items.reduce((sum, item) => sum + item.value, 0);
  const rate = total ? Math.round((items[0]?.value || 0) * 100 / total) : 0;
  return <div className="flex items-center gap-5"><div className="relative flex h-28 w-28 shrink-0 items-center justify-center rounded-full" style={{ background: `conic-gradient(var(--success) 0 ${rate}%, var(--border-main) ${rate}% 100%)` }}><div className="flex h-20 w-20 flex-col items-center justify-center rounded-full bg-[var(--bg-surface)]"><strong className="text-xl text-[var(--text-primary)]">{rate}%</strong><span className="text-[11px] text-[var(--text-muted)]">{label}</span></div></div><div className="space-y-2">{items.map((item) => <div key={item.name} className="flex items-center gap-2 text-xs text-[var(--text-body)]"><span className="h-2 w-2 rounded-full bg-[var(--primary)]" />{item.name}<strong className="font-mono text-[var(--text-primary)]">{item.value}</strong></div>)}</div></div>;
};

export const VersionTestReportPanel: React.FC<Props> = ({ productLineId, versionId, versionName }) => {
  const { productLines } = useApp();
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<VersionTestReportListItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState('');
  const [summary, setSummary] = useState('');
  const [form] = Form.useForm<ReportForm>();
  const [editForm] = Form.useForm<ReportForm>();
  const editor = useRef<HTMLDivElement>(null);
  const createLineId = Form.useWatch('productLineId', form) || productLineId;
  const createVersionId = Form.useWatch('versionId', form) || versionId;
  const createLine = productLines.find((line) => line.id === createLineId);
  const hasContext = Boolean(productLineId && versionId);
  const reports = useQuery({ queryKey: ['test-reports', productLineId, versionId], queryFn: () => hasContext ? productRepository.versionTestReports(productLineId, versionId) : productRepository.testReports(), retry: false });
  const detailLineId = selectedReport?.productLineId || productLineId;
  const detailVersionId = selectedReport?.versionId || versionId;
  const planLineId = createOpen ? createLineId : detailLineId;
  const planVersionId = createOpen ? createVersionId : detailVersionId;
  const plans = useQuery({ queryKey: ['version-test-report-plans', planLineId, planVersionId], queryFn: () => productRepository.versionTestReportPlans(planLineId, planVersionId), enabled: Boolean(planLineId && planVersionId), retry: false });
  const detail = useQuery({ queryKey: ['version-test-report', detailLineId, detailVersionId, selectedReport?.id], queryFn: () => productRepository.versionTestReport(detailLineId, detailVersionId, selectedReport!.id), enabled: Boolean(detailLineId && detailVersionId && selectedReport), retry: false });
  const report = detail.data;

  useEffect(() => {
    if (!report) return;
    editForm.setFieldsValue({ name: report.name, testPlanIds: report.plans.map((plan) => plan.id) });
    setSummary(report.summary || '');
  }, [editForm, report]);

  const planOptions = useMemo(() => (plans.data || []).map((plan) => ({ value: plan.id, label: `${plan.name} · ${plan.taskTitle}` })), [plans.data]);
  const submitCreate = async () => {
    const values = await form.validateFields();
    setSaving(true); setActionError('');
    try {
      const targetLineId = values.productLineId || productLineId;
      const targetVersionId = values.versionId || versionId;
      await productRepository.createVersionTestReport(targetLineId, targetVersionId, values);
      form.resetFields(); setCreateOpen(false);
      await reports.refetch();
    }
    catch (reason) { setActionError(reason instanceof Error ? reason.message : '新建测试报告失败'); }
    finally { setSaving(false); }
  };
  const saveReport = async () => {
    if (!report) return;
    const values = await editForm.validateFields();
    setSaving(true); setActionError('');
    try { await productRepository.updateVersionTestReport(detailLineId, detailVersionId, report.id, { ...values, summary, revision: report.revision }); await Promise.all([detail.refetch(), reports.refetch()]); }
    catch (reason) { setActionError(reason instanceof Error ? reason.message : '保存测试报告失败'); }
    finally { setSaving(false); }
  };
  const remove = (item: VersionTestReportListItem) => showDeleteConfirm({ title: `确认删除测试报告“${item.name}”？`, content: '删除后报告及其计划关联将不可恢复。', onOk: async () => { await productRepository.deleteVersionTestReport(item.productLineId || productLineId, item.versionId || versionId, item.id, item.revision); if (selectedReport?.id === item.id) setSelectedReport(null); await reports.refetch(); } });

  if (selectedReport) return <div className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3"><Button icon={<ArrowLeftOutlined />} onClick={() => setSelectedReport(null)}>返回报告列表</Button><Button type="primary" icon={<SaveOutlined />} loading={saving} onClick={() => void saveReport()}>保存报告</Button></div>
    {actionError && <Alert type="error" showIcon title={actionError} closable onClose={() => setActionError('')} />}
    {detail.isError ? <Alert type="error" showIcon title="测试报告加载失败" action={<Button onClick={() => detail.refetch()}>重试</Button>} /> : !report ? <div className="flex min-h-64 items-center justify-center"><Spin /></div> : <>
      <section className="rounded-lg border border-[var(--border-main)] bg-[var(--bg-surface-soft)] p-5"><div className="flex flex-wrap items-start justify-between gap-4"><div><div className="text-[11px] text-[var(--text-muted)]">测试报告</div><h2 className="mt-1 text-xl font-bold text-[var(--text-primary)]">{report.name}</h2></div><div className="grid gap-4 text-xs text-[var(--text-muted)] sm:grid-cols-3"><span>迭代版本<strong className="mt-1 block text-[var(--text-primary)]">{selectedReport.versionName || versionName}</strong></span><span>报告创建人<strong className="mt-1 block text-[var(--text-primary)]">{report.creatorName}</strong></span><span>创建时间<strong className="mt-1 block font-mono text-[var(--text-primary)]">{dateTime(report.createdAt)}</strong></span></div></div><Form form={editForm} layout="vertical" className="mt-5 grid gap-x-4 sm:grid-cols-2"><Form.Item name="name" label="报告名称" rules={[{ required: true, whitespace: true, message: '请输入报告名称' }]}><Input maxLength={100} showCount /></Form.Item><Form.Item name="testPlanIds" label="关联测试计划（最多15个）" rules={[{ required: true, message: '请选择关联测试计划' }, { type: 'array', max: 15, message: '最多关联15个测试计划' }]}><Select mode="multiple" showSearch optionFilterProp="label" maxTagCount="responsive" options={planOptions} /></Form.Item></Form></section>
      <section><h3 className="mb-3 text-base font-bold text-[var(--text-primary)]">报告总结</h3><RichTextEditor editor={editor} value={summary} htmlValue={summary} onInput={(text) => setSummary(text)} placeholder="请输入报告总结" /></section>
      <h3 className="pt-2 text-base font-bold text-[var(--text-primary)]">测试概况</h3>
      <section className="rounded-lg border border-[var(--border-main)] bg-[var(--bg-surface-soft)] p-4"><h4 className="font-semibold text-[var(--text-primary)]">统计信息</h4><div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">{[['用例总数量', report.statistics.total], ['缺陷总数', report.statistics.defects], ['高优先级缺陷', report.statistics.urgent], ['严重缺陷', report.statistics.severe]].map(([label, value]) => <div key={String(label)} className="border-r border-[var(--border-main)] last:border-0"><strong className={`text-2xl ${label === '严重缺陷' ? 'text-[var(--danger)]' : 'text-[var(--text-primary)]'}`}>{value}</strong><span className="ml-1 text-xs text-[var(--text-muted)]">个</span><div className="mt-2 text-xs text-[var(--text-muted)]">{label}</div></div>)}</div></section>
      <div className="grid gap-4 lg:grid-cols-2"><section className="rounded-lg border border-[var(--border-main)] bg-[var(--bg-surface-soft)] p-4"><h4 className="font-semibold text-[var(--text-primary)]">测试统计分布</h4><div className="mt-4"><Donut items={report.resultDistribution} label="通过率" /></div></section><section className="rounded-lg border border-[var(--border-main)] bg-[var(--bg-surface-soft)] p-4"><h4 className="font-semibold text-[var(--text-primary)]">缺陷修复占比</h4><div className="mt-4"><Donut items={report.repairDistribution.slice().reverse()} label="修复率" /></div></section></div>
      <section className="rounded-lg border border-[var(--border-main)] bg-[var(--bg-surface-soft)] p-4"><h4 className="mb-4 font-semibold text-[var(--text-primary)]">测试计划明细列表</h4><Table rowKey="id" size="small" pagination={false} dataSource={report.plans} columns={[{ title: '计划名称', dataIndex: 'name' }, { title: '状态', dataIndex: 'status', width: 100, render: (value) => <Tag color={value === '已完成' ? 'success' : 'default'}>{value}</Tag> }, { title: '通过率', dataIndex: 'passRate', width: 100, render: (value) => `${value || 0}%` }, { title: '管理员', dataIndex: 'ownerName', width: 140, render: (value) => <PersonIdentity name={value} emptyLabel="未设置" variant="list" /> }, { title: '关联任务', dataIndex: 'taskTitle', ellipsis: true }]} /></section>
      <section className="rounded-lg border border-[var(--border-main)] bg-[var(--bg-surface-soft)] p-4"><h4 className="mb-5 font-semibold text-[var(--text-primary)]">计划缺陷严重程度分布</h4><DistributionBars items={report.severityDistribution} tone="danger" /></section>
      <section className="rounded-lg border border-[var(--border-main)] bg-[var(--bg-surface-soft)] p-4"><h4 className="mb-5 font-semibold text-[var(--text-primary)]">计划缺陷优先级分布</h4><DistributionBars items={report.priorityDistribution} /></section>
      <section className="rounded-lg border border-[var(--border-main)] bg-[var(--bg-surface-soft)] p-4"><h4 className="mb-4 font-semibold text-[var(--text-primary)]">紧急严重缺陷</h4><Table rowKey="id" size="small" pagination={false} locale={{ emptyText: '暂无 P0/P1 紧急严重缺陷' }} dataSource={report.urgentDefects} columns={[{ title: '缺陷', key: 'defect', render: (_, item) => <div><strong>{item.title}</strong><div className="text-[11px] text-[var(--text-muted)]">{item.code}</div></div> }, { title: '状态', dataIndex: 'status', width: 100 }, { title: '优先级', dataIndex: 'priority', width: 90 }, { title: '严重程度', dataIndex: 'severity', width: 100 }, { title: '负责人', dataIndex: 'assigneeName', width: 140, render: (value) => <PersonIdentity name={value} emptyLabel="未设置" variant="list" /> }]} /></section>
    </>}
  </div>;

  const data = reports.data || [];
  return <div className="space-y-4">
    {actionError && <Alert type="error" showIcon title={actionError} closable onClose={() => setActionError('')} />}
    {reports.isError ? <Alert type="error" showIcon title="测试报告加载失败" description={reports.error instanceof Error ? reports.error.message : '请稍后重试。'} action={<Button onClick={() => reports.refetch()}>重试</Button>} /> : reports.isLoading ? <div className="flex min-h-56 items-center justify-center"><Spin /></div> : data.length === 0 ? <div className="flex min-h-56 flex-col items-center justify-center gap-3"><Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无测试报告" /><Button type="primary" icon={<PlusOutlined />} onClick={() => { form.setFieldsValue({ productLineId, versionId, testPlanIds: [] }); setCreateOpen(true); }}>新建报告</Button></div> : <><div className="flex justify-end"><Button type="primary" icon={<PlusOutlined />} onClick={() => { form.setFieldsValue({ productLineId, versionId, testPlanIds: [] }); setCreateOpen(true); }}>新建报告</Button></div><Table rowKey="id" dataSource={data} pagination={false} scroll={{ x: 1180 }} columns={[{ title: '报告名称', dataIndex: 'name', width: 180, ellipsis: true }, { title: '报告类型', dataIndex: 'reportType', width: 110, render: (value) => value || '测试报告' }, { title: '产品线', dataIndex: 'productLineName', width: 160, ellipsis: true }, { title: '版本', dataIndex: 'versionName', width: 140, ellipsis: true }, { title: '关联测试计划', key: 'plans', width: 180, ellipsis: true, render: (_, item) => planLabel(item) }, { title: '创建人', dataIndex: 'creatorName', width: 140, render: (value) => <PersonIdentity name={value} emptyLabel="未设置" variant="list" /> }, { title: '创建时间', dataIndex: 'createdAt', width: 180, render: dateTime }, { title: '操作', key: 'actions', width: 150, fixed: 'right', render: (_, item) => <div className="flex gap-1"><Button type="link" size="small" icon={<EditOutlined />} onClick={() => setSelectedReport(item)}>修改</Button><Button type="link" danger size="small" icon={<DeleteOutlined />} onClick={() => remove(item)}>删除</Button></div> }]} /></>}
    <Modal title="新建测试报告" open={createOpen} onCancel={() => { setCreateOpen(false); form.resetFields(); setActionError(''); }} onOk={() => void submitCreate()} okText="新建" cancelText="取消" confirmLoading={saving} destroyOnHidden><Form form={form} layout="vertical"><Form.Item name="name" label="报告名称" rules={[{ required: true, whitespace: true, message: '请输入报告名称' }]}><Input autoFocus placeholder="请输入报告名称" maxLength={100} showCount /></Form.Item><Form.Item name="productLineId" label="选择产品线" rules={[{ required: true, message: '请选择产品线' }]}><Select showSearch optionFilterProp="label" placeholder="请选择产品线" options={productLines.map((line) => ({ value: line.id, label: line.name }))} onChange={() => { form.setFieldValue('versionId', undefined); form.setFieldValue('testPlanIds', []); }} /></Form.Item><Form.Item name="versionId" label="选择迭代" rules={[{ required: true, message: '请选择迭代' }]}><Select showSearch optionFilterProp="label" placeholder="请选择迭代" disabled={!createLineId} options={(createLine?.versions || []).map((item) => ({ value: item.id, label: item.name }))} onChange={() => form.setFieldValue('testPlanIds', [])} /></Form.Item><Form.Item name="testPlanIds" label="关联计划" rules={[{ required: true, message: '请选择关联测试计划' }, { type: 'array', max: 15, message: '最多关联15个测试计划' }]}><Select mode="multiple" showSearch optionFilterProp="label" placeholder="请选择关联计划" maxTagCount="responsive" loading={plans.isLoading} disabled={!createVersionId} options={planOptions} /></Form.Item>{plans.isError && <Alert type="error" showIcon title="测试计划加载失败" action={<Button onClick={() => plans.refetch()}>重试</Button>} />}</Form></Modal>
  </div>;
};
