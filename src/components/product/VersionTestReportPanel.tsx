import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Alert, Button, Dropdown, Empty, Form, Input, Modal, Select, Spin, Table, Upload, message } from 'antd';
import { DeleteOutlined, DownloadOutlined, EditOutlined, MoreOutlined, PaperClipOutlined, PlusOutlined } from '@ant-design/icons';
import { downloadTestReport } from '../../utils/testReportDownload';
import { productRepository } from '../../services/productRepository';
import type { VersionTestReportListItem } from '../../types/testManagement';
import { useApp } from '../../context/AppContext';
import { showDeleteConfirm } from '../common/Feedback';
import { PersonIdentity } from '../common/PersonIdentity';
import type { ProductLine } from '../../types';
import type { FormInstance } from 'antd';

type Props = { productLineId: string; versionId: string; versionName: string };
type ReportType = '功能测试' | '安全测试' | '回归测试';
type ReportAttachment = { name: string; url: string; size: number; type: string };
type ReportForm = { name: string; reportType: ReportType; productLineId?: string; versionId?: string; attachments: ReportAttachment[] };
const reportTypeOptions = ['功能测试', '安全测试', '回归测试'].map((value) => ({ value, label: value }));

const dateTime = (value?: string) => value ? new Date(value).toLocaleString('zh-CN', { hour12: false }) : '--';
const readFile = (file: File) => new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = reject; reader.readAsDataURL(file); });
export const VersionTestReportPanel: React.FC<Props> = ({ productLineId, versionId, versionName }) => {
  const { productLines } = useApp();
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<VersionTestReportListItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [downloadingId, setDownloadingId] = useState('');
  const [actionError, setActionError] = useState('');
  const [form] = Form.useForm<ReportForm>();
  const [editForm] = Form.useForm<ReportForm>();
  const hasContext = Boolean(productLineId && versionId);
  const reports = useQuery({ queryKey: ['test-reports', productLineId, versionId], queryFn: () => hasContext ? productRepository.versionTestReports(productLineId, versionId) : productRepository.testReports(), retry: false });
  const detailLineId = selectedReport?.productLineId || productLineId;
  const detailVersionId = selectedReport?.versionId || versionId;
  const detail = useQuery({ queryKey: ['version-test-report', detailLineId, detailVersionId, selectedReport?.id], queryFn: () => productRepository.versionTestReport(detailLineId, detailVersionId, selectedReport!.id), enabled: Boolean(detailLineId && detailVersionId && selectedReport), retry: false });
  const report = detail.data;

  useEffect(() => {
    if (!report) return;
    editForm.setFieldsValue({ name: report.name, reportType: report.reportType as ReportType, attachments: report.attachments || [], productLineId: report.productLineId || detailLineId, versionId: report.versionId || detailVersionId });
  }, [editForm, report, detailLineId, detailVersionId]);

  const submitCreate = async () => {
    let values: ReportForm;
    try { values = await form.validateFields(); } catch { return; }
    setSaving(true); setActionError('');
    try {
      const targetLineId = values.productLineId || productLineId;
      const targetVersionId = values.versionId || versionId;
      await productRepository.createVersionTestReport(targetLineId, targetVersionId, { ...values, attachments: values.attachments || [] });
      form.resetFields(); setCreateOpen(false);
      await reports.refetch();
    }
    catch (reason) { setActionError(reason instanceof Error ? reason.message : '新建测试报告失败'); }
    finally { setSaving(false); }
  };
  const saveReport = async () => {
    if (!report) return;
    let values: ReportForm;
    try { values = await editForm.validateFields(); } catch { return; }
    setSaving(true); setActionError('');
    try { await productRepository.updateVersionTestReport(detailLineId, detailVersionId, report.id, { ...values, revision: report.revision }); setSelectedReport(null); await reports.refetch(); }
    catch (reason) { setActionError(reason instanceof Error ? reason.message : '保存测试报告失败'); }
    finally { setSaving(false); }
  };
  const remove = (item: VersionTestReportListItem) => showDeleteConfirm({ title: `确认删除测试报告“${item.name}”？`, content: '删除后报告记录将不可恢复。', onOk: async () => {
    setActionError('');
    try { await productRepository.deleteVersionTestReport(item.productLineId || productLineId, item.versionId || versionId, item.id, item.revision); if (selectedReport?.id === item.id) setSelectedReport(null); await reports.refetch(); }
    catch (reason) { setActionError(reason instanceof Error ? reason.message : '删除测试报告失败'); throw reason; }
  } });
  const download = async (item: VersionTestReportListItem) => {
    setDownloadingId(item.id); setActionError('');
    try { const latest = await productRepository.versionTestReport(item.productLineId || productLineId, item.versionId || versionId, item.id); await downloadTestReport(latest); }
    catch (reason) { setActionError(reason instanceof Error ? reason.message : '下载测试报告失败'); }
    finally { setDownloadingId(''); }
  };

  const data = (reports.data || []).filter((item) => !productLineId || item.productLineId === productLineId);
  return <div className="space-y-4">
    {actionError && <Alert type="error" showIcon title={actionError} closable onClose={() => setActionError('')} />}
    {reports.isError ? <Alert type="error" showIcon title="测试报告加载失败" description={reports.error instanceof Error ? reports.error.message : '请稍后重试。'} action={<Button onClick={() => reports.refetch()}>重试</Button>} /> : reports.isLoading ? <div className="flex min-h-56 items-center justify-center"><Spin /></div> : data.length === 0 ? <div className="flex min-h-56 flex-col items-center justify-center gap-3"><Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无测试报告" /><Button type="primary" icon={<PlusOutlined />} onClick={() => { form.resetFields(); setActionError(''); setCreateOpen(true); }}>新建报告</Button></div> : <><div className="flex justify-end"><Button type="primary" icon={<PlusOutlined />} onClick={() => { form.resetFields(); setActionError(''); setCreateOpen(true); }}>新建报告</Button></div><Table rowKey="id" dataSource={data} pagination={false} scroll={{ x: 1180 }} columns={[{ title: '报告名称', dataIndex: 'name', width: 180, ellipsis: true }, { title: '报告类型', dataIndex: 'reportType', width: 110, render: (value) => value || '测试报告' }, { title: '产品', dataIndex: 'productLineName', width: 160, ellipsis: true }, { title: '版本', dataIndex: 'versionName', width: 140, ellipsis: true }, { title: '创建人', dataIndex: 'creatorName', width: 140, render: (value) => <PersonIdentity name={value} emptyLabel="未设置" variant="list" /> }, { title: '创建时间', dataIndex: 'createdAt', width: 180, render: dateTime }, { title: '操作', key: 'actions', width: 150, fixed: 'right', render: (_, item) => <div className="flex gap-1"><Button type="text" size="small" aria-label="编辑报告" title="编辑报告" icon={<EditOutlined />} onClick={() => { setActionError(''); setSelectedReport(item); }} /><Dropdown trigger={['click']} menu={{ items: [{ key: 'download', label: '下载报告', icon: <DownloadOutlined /> }, { key: 'delete', label: '删除', danger: true, icon: <DeleteOutlined /> }], onClick: ({ key }) => { if (key === 'download') void download(item); if (key === 'delete') remove(item); } }}><Button type="text" size="small" aria-label="更多报告操作" title="更多报告操作" loading={downloadingId === item.id} disabled={Boolean(downloadingId)} icon={<MoreOutlined />} /></Dropdown></div> }]} /></>}
      <Modal title="编辑测试报告" open={Boolean(selectedReport)} onCancel={() => { if (!saving) { setSelectedReport(null); setActionError(''); } }} onOk={() => void saveReport()} okText="保存报告" cancelText="取消" confirmLoading={saving} okButtonProps={{ disabled: !report || detail.isError }} destroyOnHidden>
        {actionError && <Alert type="error" showIcon title={actionError} />}
        {detail.isError ? <Alert type="error" showIcon title="测试报告加载失败" action={<Button onClick={() => void detail.refetch()}>重试</Button>} /> : !report ? <Spin /> : <ReportFields form={editForm} productLines={productLines} />}
      </Modal>
      <Modal title="新建测试报告" open={createOpen} onCancel={() => { setCreateOpen(false); form.resetFields(); setActionError(''); }} onOk={() => void submitCreate()} okText="新建" cancelText="取消" confirmLoading={saving} destroyOnHidden>{actionError && <Alert type="error" showIcon title={actionError} />}<ReportFields form={form} productLines={productLines} initialValues={{ attachments: [], productLineId: productLineId || undefined, versionId: versionId || undefined }} /></Modal>
  </div>;
};

const ReportFields: React.FC<{ form: FormInstance<ReportForm>; productLines: ProductLine[]; initialValues?: Partial<ReportForm> }> = ({ form, productLines, initialValues }) => {
  const createLineId = Form.useWatch('productLineId', form);
  const createAttachments = Form.useWatch('attachments', form) || [];
  const createLine = productLines.find((line) => line.id === createLineId);
  return <Form form={form} layout="vertical" className="version-test-report-create-form" initialValues={initialValues}><Form.Item name="name" label="报告名称" rules={[{ required: true, whitespace: true, message: '请输入报告名称' }]}><Input autoFocus placeholder="请输入报告名称" maxLength={100} showCount /></Form.Item><Form.Item name="reportType" label="报告类型" rules={[{ required: true, message: '请选择报告类型' }]}><Select placeholder="请选择报告类型" options={reportTypeOptions} /></Form.Item><Form.Item name="productLineId" label="选择产品" rules={[{ required: true, message: '请选择产品' }]}><Select showSearch optionFilterProp="label" placeholder="请选择产品" options={productLines.map((line) => ({ value: line.id, label: line.name }))} onChange={() => form.setFieldValue('versionId', undefined)} /></Form.Item><Form.Item name="versionId" label="选择迭代" rules={[{ required: true, message: '请选择迭代版本' }]}><Select showSearch optionFilterProp="label" placeholder="请选择迭代版本" disabled={!createLineId} options={(createLine?.versions || []).map((item) => ({ value: item.id, label: item.name }))} /></Form.Item><Form.Item name="attachments" hidden rules={[{ type: 'array', required: true, min: 1, message: '请上传至少一个报告附件' }]}><Input /></Form.Item><Form.Item label="上传附件" required><Upload accept="image/*,.pdf" multiple showUploadList={false} beforeUpload={async (file) => { const isImageOrPdf = file.type.startsWith('image/') || file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf'); if (!isImageOrPdf) { message.error('仅支持图片和 PDF 格式'); return Upload.LIST_IGNORE; } if (file.size > 10 * 1024 * 1024) { message.error('单个附件不能超过 10MB'); return Upload.LIST_IGNORE; } try { const url = await readFile(file); form.setFieldValue('attachments', [...(form.getFieldValue('attachments') || []), { name: file.name, url, size: file.size, type: file.type }]); } catch { message.error(`读取附件失败：${file.name}`); } return Upload.LIST_IGNORE; }}><Button icon={<PaperClipOutlined />}>选择本地文件</Button></Upload><Form.Item noStyle shouldUpdate>{() => form.getFieldError('attachments').map((error) => <div role="alert" key={error} className="text-[var(--danger)]">{error}</div>)}</Form.Item></Form.Item>{createAttachments.map((item: ReportAttachment, index: number) => <div key={`${item.name}-${index}`} className="mb-2 flex items-center gap-2 text-xs text-[var(--text-body)]"><span className="min-w-0 flex-1 truncate">{item.name}</span><Button type="text" danger size="small" aria-label={`移除附件${item.name}`} icon={<DeleteOutlined />} onClick={() => form.setFieldValue('attachments', createAttachments.filter((_: ReportAttachment, itemIndex: number) => itemIndex !== index))} /></div>)}</Form>;
};
