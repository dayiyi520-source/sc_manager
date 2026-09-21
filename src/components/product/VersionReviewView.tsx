import React, { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Alert, Button, DatePicker, Form, Input, Select, Spin, Table, Tag, Upload, message } from 'antd';
import { ArrowLeftOutlined, CheckOutlined, DeleteOutlined, PaperClipOutlined, PlusOutlined } from '@ant-design/icons';
import dayjs, { type Dayjs } from 'dayjs';
import { useApp } from '../../context/AppContext';
import { productRepository, type UnifiedWorkItem } from '../../services/productRepository';
import { teamRepository } from '../../services/teamRepository';
import type { SaveVersionReviewInput, VersionReviewConclusion, VersionReviewListItem } from '../../types/versionReview';
import { employeeSelectOptions } from '../common/PersonIdentity';
import { showDeleteConfirm } from '../common/Feedback';

type AttachmentValue = { name: string; url?: string; size?: number };
type FormValues = {
  meetingTopic: string; reviewType: string; productLineId?: string; versionId?: string; meetingTime?: Dayjs;
  participantIds: string[]; relatedTaskIds?: string[]; conclusion?: VersionReviewConclusion;
  agendaConclusion?: string; remainingIssues?: string; attachments?: AttachmentValue[];
};

const statusTag = (status: string) => status === 'SUBMITTED' ? <Tag color="success">已提交</Tag> : <Tag>草稿</Tag>;
const readFile = (file: File) => new Promise<string>((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result));
  reader.onerror = reject;
  reader.readAsDataURL(file);
});

export const VersionReviewView: React.FC<{ productLineFilter?: string }> = ({ productLineFilter = 'all' }) => {
  const { productLines } = useApp();
  const fixedLineId = productLineFilter === 'all' ? '' : productLineFilter;
  const [selectedId, setSelectedId] = useState('');
  const [creating, setCreating] = useState(false);
  const [scope, setScope] = useState({ lineId: '', versionId: '' });
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState('');
  const [form] = Form.useForm<FormValues>();
  const selectedLineId = Form.useWatch('productLineId', form);
  const attachments = Form.useWatch('attachments', form) || [];
  const lineId = scope.lineId || fixedLineId;
  const versionId = scope.versionId;
  const line = productLines.find((item) => item.id === (selectedLineId || lineId));
  const versions = line?.versions || [];
  const hasScope = Boolean(scope.lineId && scope.versionId);
  const reviews = useQuery({ queryKey: ['version-reviews', scope.lineId, scope.versionId], queryFn: () => productRepository.versionReviews(scope.lineId, scope.versionId), enabled: hasScope, retry: false });
  const globalReviews = useQuery({ queryKey: ['version-reviews', 'all'], queryFn: productRepository.allVersionReviews, retry: false });
  const detail = useQuery({ queryKey: ['version-review', scope.lineId, scope.versionId, selectedId], queryFn: () => productRepository.versionReview(scope.lineId, scope.versionId, selectedId), enabled: hasScope && Boolean(selectedId), retry: false });
  const employees = useQuery({ queryKey: ['team-member-options'], queryFn: teamRepository.options, enabled: creating || Boolean(selectedId), retry: false });
  const tasks = useQuery({ queryKey: ['version-review-tasks', selectedLineId || lineId], queryFn: () => productRepository.workItems(selectedLineId || lineId), enabled: Boolean(selectedLineId || lineId) && (creating || Boolean(selectedId)), retry: false });
  const current = detail.data;
  const editing = creating || Boolean(selectedId);
  const readOnly = current?.status === 'SUBMITTED';

  useEffect(() => {
    if (!current) return;
    form.setFieldsValue({
      meetingTopic: current.meetingTopic, reviewType: current.reviewType, productLineId: scope.lineId, versionId: scope.versionId,
      meetingTime: current.meetingTime ? dayjs(current.meetingTime) : current.reviewDate ? dayjs(current.reviewDate) : undefined,
      participantIds: current.participants.map((item) => item.id), relatedTaskIds: current.relatedTaskIds || [],
      conclusion: current.conclusion, agendaConclusion: current.agendaConclusion || current.summary,
      remainingIssues: current.remainingIssues || current.remainingRisks, attachments: current.attachments || []
    });
  }, [current, form, scope.lineId, scope.versionId]);

  const employeeOptions = useMemo(() => employeeSelectOptions(employees.data || []), [employees.data]);
  const taskItems = ((tasks.data as { page?: { items?: UnifiedWorkItem[] } } | undefined)?.page?.items || []) as UnifiedWorkItem[];
  const taskOptions = taskItems.map((item) => ({ value: item.id, label: `${item.code || ''} ${item.title}`.trim() }));
  const listItems = (globalReviews.data || []).filter((item) => !fixedLineId || item.productLineId === fixedLineId);
  const payload = (values: FormValues): SaveVersionReviewInput => ({
    meetingTopic: values.meetingTopic.trim(), reviewType: values.reviewType, productLineId: values.productLineId, versionId: values.versionId,
    meetingTime: values.meetingTime?.toISOString(), reviewDate: values.meetingTime?.format('YYYY-MM-DD'),
    participantIds: values.participantIds || [], relatedTaskIds: values.relatedTaskIds || [], conclusion: values.conclusion,
    agendaConclusion: values.agendaConclusion?.trim(), remainingIssues: values.remainingIssues?.trim(), attachments: values.attachments || [],
    revision: current?.revision
  });
  const submitForm = async () => {
    const values = await form.validateFields();
    if (!values.productLineId || !values.versionId) return;
    setSaving(true); setActionError('');
    try {
      const nextScope = { lineId: values.productLineId, versionId: values.versionId };
      const saved = creating
        ? await productRepository.createAndSubmitVersionReview(nextScope.lineId, nextScope.versionId, payload(values))
        : await productRepository.updateAndSubmitVersionReview(scope.lineId, scope.versionId, current!.id, payload(values));
      setScope(nextScope); setCreating(false); setSelectedId(saved.id);
      await Promise.all([reviews.refetch(), globalReviews.refetch(), detail.refetch()]);
      message.success('版本评审已提交');
    } catch (reason) { setActionError(reason instanceof Error ? reason.message : '版本评审保存失败，表单内容已保留'); }
    finally { setSaving(false); }
  };
  const startCreate = () => {
    setSelectedId(''); setCreating(true); setActionError(''); setScope({ lineId: fixedLineId, versionId: '' });
    form.resetFields();
    form.setFieldsValue({ productLineId: fixedLineId || undefined, participantIds: [], relatedTaskIds: [], attachments: [] });
  };
  const openReview = (item: VersionReviewListItem) => {
    if (!item.productLineId || !item.versionId) return;
    setScope({ lineId: item.productLineId, versionId: item.versionId }); setCreating(false); setSelectedId(item.id); setActionError('');
  };
  const remove = (item: VersionReviewListItem) => showDeleteConfirm({
    title: `确认删除评审“${item.meetingTopic || '未命名评审'}”？`, content: '删除后评审记录不可恢复。',
    onOk: async () => {
      try { await productRepository.deleteVersionReview(item.productLineId || scope.lineId, item.versionId || scope.versionId, item.id, item.revision); await globalReviews.refetch(); }
      catch (reason) { setActionError(reason instanceof Error ? reason.message : '版本评审删除失败'); }
    }
  });
  const backToList = () => { setCreating(false); setSelectedId(''); setActionError(''); setScope({ lineId: '', versionId: '' }); };

  return <div className="space-y-4">
    {editing ? <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button icon={<ArrowLeftOutlined />} onClick={backToList}>返回评审列表</Button>
        <div className="flex gap-2">{!readOnly && <Button type="primary" icon={<CheckOutlined />} loading={saving} onClick={() => void submitForm()}>提交评审</Button>}</div>
      </div>
      {actionError && <Alert type="error" showIcon title={actionError} closable onClose={() => setActionError('')} />}
      {detail.isError && !creating ? <Alert type="error" showIcon title="版本评审加载失败" action={<Button onClick={() => detail.refetch()}>重试</Button>} /> : !creating && !current ? <div className="flex min-h-56 items-center justify-center"><Spin /></div> : <Form form={form} layout="vertical" disabled={readOnly} className="grid gap-x-4 md:grid-cols-2">
        <Form.Item name="meetingTopic" label="会议主题" rules={[{ required: true, whitespace: true, message: '请输入会议主题' }]}><Input placeholder="请输入会议主题" maxLength={200} /></Form.Item>
        <Form.Item name="reviewType" label="会议类型" rules={[{ required: true, message: '请选择会议类型' }]}><Select placeholder="请选择会议类型" options={['版本评审', '发布评审', '专项评审'].map((value) => ({ value, label: value }))} /></Form.Item>
        <Form.Item name="productLineId" label="所属产品线" rules={[{ required: true, message: '请选择所属产品线' }]}><Select showSearch optionFilterProp="label" placeholder="请选择产品线" disabled={Boolean(fixedLineId) || Boolean(selectedId)} options={productLines.map((item) => ({ value: item.id, label: item.name }))} onChange={() => form.setFieldValue('versionId', undefined)} /></Form.Item>
        <Form.Item name="versionId" label="所属版本" rules={[{ required: true, message: '请选择所属版本' }]}><Select showSearch optionFilterProp="label" placeholder="请选择迭代版本" disabled={!selectedLineId || Boolean(selectedId)} options={versions.map((item) => ({ value: item.id, label: item.name }))} /></Form.Item>
        <Form.Item name="meetingTime" label="会议时间" rules={[{ required: true, message: '请选择会议时间' }]}><DatePicker showTime className="w-full" /></Form.Item>
        <Form.Item name="participantIds" label="参与人" rules={[{ required: true, type: 'array', min: 1, message: '请选择至少一名参与人' }]}><Select mode="multiple" showSearch optionFilterProp="label" loading={employees.isLoading} options={employeeOptions} placeholder="搜索并选择在职员工" /></Form.Item>
        <Form.Item name="relatedTaskIds" label="关联任务"><Select mode="multiple" showSearch optionFilterProp="label" loading={tasks.isLoading} options={taskOptions} placeholder="请选择关联任务" /></Form.Item>
        <Form.Item name="conclusion" label="评审结论" rules={[{ required: true, message: '请选择评审结论' }]}><Select placeholder="请选择评审结论" options={['通过', '有条件通过', '不通过'].map((value) => ({ value, label: value }))} /></Form.Item>
        <Form.Item name="agendaConclusion" label="议题结论" className="md:col-span-2" rules={[{ required: true, whitespace: true, message: '请输入议题结论' }]}><Input.TextArea rows={5} maxLength={5000} showCount placeholder="请输入议题结论" /></Form.Item>
        <Form.Item name="remainingIssues" label="遗留问题" className="md:col-span-2"><Input.TextArea rows={4} maxLength={5000} showCount placeholder="请输入遗留问题" /></Form.Item>
        <Form.Item label="会议附件" className="md:col-span-2">
          <Form.Item name="attachments" noStyle getValueProps={() => ({})}><Upload multiple showUploadList={false} beforeUpload={async (file) => { if (attachments.length >= 10) { message.error('会议附件最多上传 10 个'); return Upload.LIST_IGNORE; } if (file.size > 10 * 1024 * 1024) { message.error('单个会议附件不能超过 10MB'); return Upload.LIST_IGNORE; } const url = await readFile(file); form.setFieldValue('attachments', [...attachments, { name: file.name, url, size: file.size }]); return Upload.LIST_IGNORE; }}><Button icon={<PaperClipOutlined />}>添加会议附件</Button></Upload></Form.Item>
          <div className="mt-2 space-y-1">{attachments.map((item, index) => <div key={`${item.name}-${item.size}-${index}`} className="flex items-center justify-between gap-2 text-xs text-[var(--text-body)]"><span className="min-w-0 flex-1 truncate">{item.name}</span><Button type="text" danger size="small" aria-label={`移除附件${item.name}`} icon={<DeleteOutlined />} onClick={() => form.setFieldValue('attachments', attachments.filter((_, itemIndex) => itemIndex !== index))} /></div>)}</div>
        </Form.Item>
        {current && <div className="flex items-center">{statusTag(current.status)}</div>}
      </Form>}
    </div> : globalReviews.isError ? <Alert type="error" showIcon title="版本评审列表加载失败" action={<Button onClick={() => globalReviews.refetch()}>重试</Button>} /> : globalReviews.isLoading ? <div className="flex min-h-56 items-center justify-center"><Spin /></div> : <div className="space-y-4">
      <div className="flex justify-end"><Button type="primary" icon={<PlusOutlined />} onClick={startCreate}>新建评审</Button></div>
      <Table<VersionReviewListItem> rowKey="id" dataSource={listItems} scroll={{ x: 1120 }} locale={{ emptyText: '暂无可访问的版本评审' }} onRow={(item) => ({ onClick: () => openReview(item), className: 'cursor-pointer' })} columns={[
        { title: '会议主题', dataIndex: 'meetingTopic', width: 220, ellipsis: true },
        { title: '评审类型', dataIndex: 'reviewType', width: 120 },
        { title: '产品线', dataIndex: 'productLineName', width: 180, ellipsis: true },
        { title: '迭代版本', dataIndex: 'versionName', width: 180, ellipsis: true },
        { title: '发起人', dataIndex: 'initiatorName', width: 120 },
        { title: '参与人', dataIndex: 'participantNames', width: 220, ellipsis: true, render: (value) => value || '--' },
        { title: '评审时间', dataIndex: 'meetingTime', width: 160, render: (value, item) => value || item.reviewDate || '--' },
        { title: '操作', key: 'actions', width: 150, render: (_, item) => <div className="flex gap-1"><Button type="link" size="small" onClick={(event) => { event.stopPropagation(); openReview(item); }}>详情</Button><Button type="link" danger size="small" icon={<DeleteOutlined />} onClick={(event) => { event.stopPropagation(); void remove(item); }}>删除</Button></div> }
      ]} />
    </div>}
  </div>;
};
