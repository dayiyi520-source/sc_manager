import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Alert, Button, DatePicker, Empty, Form, Input, Select, Spin, Table, Tag, message } from 'antd';
import { ArrowLeftOutlined, CheckOutlined, PlusOutlined, SaveOutlined } from '@ant-design/icons';
import dayjs, { type Dayjs } from 'dayjs';
import { productRepository } from '../../services/productRepository';
import { teamRepository } from '../../services/teamRepository';
import type { SaveVersionReviewInput, VersionReviewConclusion } from '../../types/versionReview';
import { ProductVersionScope } from './ProductVersionScope';
import { employeeSelectOptions } from '../common/PersonIdentity';

type FormValues = {
  reviewDate?: Dayjs;
  participantIds: string[];
  conclusion?: VersionReviewConclusion;
  summary?: string;
  remainingRisks?: string;
  releaseRecommendation?: string;
};

const statusTag = (status: string) => status === 'SUBMITTED' ? <Tag color="success">已提交</Tag> : <Tag>草稿</Tag>;

export const VersionReviewView: React.FC<{ productLineFilter?: string }> = ({ productLineFilter = 'all' }) => {
  const [productLineId, setProductLineId] = useState(productLineFilter === 'all' ? '' : productLineFilter);
  const [versionId, setVersionId] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState('');
  const [form] = Form.useForm<FormValues>();
  const lineId = productLineFilter === 'all' ? productLineId : productLineFilter;
  const changeLine = useCallback((value: string) => setProductLineId(value), []);
  const changeVersion = useCallback((value: string) => { setVersionId(value); setSelectedId(''); setCreating(false); }, []);
  const hasScope = Boolean(lineId && versionId);
  const reviews = useQuery({ queryKey: ['version-reviews', lineId, versionId], queryFn: () => productRepository.versionReviews(lineId, versionId), enabled: hasScope, retry: false });
  const detail = useQuery({ queryKey: ['version-review', lineId, versionId, selectedId], queryFn: () => productRepository.versionReview(lineId, versionId, selectedId), enabled: hasScope && Boolean(selectedId), retry: false });
  const employees = useQuery({ queryKey: ['team-member-options'], queryFn: teamRepository.options, enabled: hasScope && (creating || Boolean(selectedId)), retry: false });
  const current = detail.data;
  const editing = creating || Boolean(selectedId);
  const readOnly = current?.status === 'SUBMITTED';

  useEffect(() => {
    if (!current) return;
    form.setFieldsValue({
      reviewDate: current.reviewDate ? dayjs(current.reviewDate) : undefined,
      participantIds: current.participants.map((item) => item.id),
      conclusion: current.conclusion,
      summary: current.summary,
      remainingRisks: current.remainingRisks,
      releaseRecommendation: current.releaseRecommendation
    });
  }, [current, form]);

  const payload = (values: FormValues): SaveVersionReviewInput => ({
    reviewDate: values.reviewDate?.format('YYYY-MM-DD'), participantIds: values.participantIds || [], conclusion: values.conclusion,
    summary: values.summary?.trim(), remainingRisks: values.remainingRisks?.trim(), releaseRecommendation: values.releaseRecommendation?.trim(), revision: current?.revision
  });
  const save = async () => {
    const values = await form.validateFields(); setSaving(true); setActionError('');
    try {
      const saved = creating
        ? await productRepository.createVersionReview(lineId, versionId, payload(values))
        : await productRepository.updateVersionReview(lineId, versionId, current!.id, payload(values));
      setCreating(false); setSelectedId(saved.id); await Promise.all([reviews.refetch(), detail.refetch()]); message.success('版本评审已保存');
    } catch (reason) { setActionError(reason instanceof Error ? reason.message : '版本评审保存失败，表单内容已保留'); }
    finally { setSaving(false); }
  };
  const submit = async () => {
    if (!current) return;
    try {
      await form.validateFields(['reviewDate', 'participantIds', 'conclusion', 'summary']); setSaving(true); setActionError('');
      await productRepository.submitVersionReview(lineId, versionId, current.id, current.revision);
      await Promise.all([reviews.refetch(), detail.refetch()]); message.success('版本评审已提交');
    } catch (reason) { if (reason instanceof Error) setActionError(reason.message || '版本评审提交失败，表单内容已保留'); }
    finally { setSaving(false); }
  };
  const startCreate = () => { setSelectedId(''); setCreating(true); setActionError(''); form.resetFields(); form.setFieldsValue({ participantIds: [] }); };
  const employeeOptions = useMemo(() => employeeSelectOptions(employees.data || []), [employees.data]);

  return <div className="space-y-4">
    <ProductVersionScope productLineFilter={productLineFilter} productLineId={lineId} versionId={versionId} onProductLineChange={changeLine} onVersionChange={changeVersion} />
    {!hasScope ? <div className="flex min-h-56 items-center justify-center"><Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="请选择产品线和迭代版本" /></div> : editing ? <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button icon={<ArrowLeftOutlined />} onClick={() => { setCreating(false); setSelectedId(''); setActionError(''); }}>返回评审列表</Button>
        <div className="flex gap-2">{!readOnly && <Button icon={<SaveOutlined />} loading={saving} onClick={() => void save()}>保存草稿</Button>}{current?.status === 'DRAFT' && <Button type="primary" icon={<CheckOutlined />} loading={saving} onClick={() => void submit()}>提交评审</Button>}</div>
      </div>
      {actionError && <Alert type="error" showIcon title={actionError} closable onClose={() => setActionError('')} />}
      {detail.isError && !creating ? <Alert type="error" showIcon title="版本评审加载失败" action={<Button onClick={() => detail.refetch()}>重试</Button>} /> : !creating && !current ? <div className="flex min-h-56 items-center justify-center"><Spin /></div> : <Form form={form} layout="vertical" disabled={readOnly} className="grid gap-x-4 md:grid-cols-2">
        <Form.Item name="reviewDate" label="评审日期" rules={[{ required: !creating, message: '请选择评审日期' }]}><DatePicker className="w-full" /></Form.Item>
        <Form.Item name="participantIds" label="参与人" rules={[{ required: !creating, type: 'array', min: 1, message: '请选择至少一名参与人' }]}><Select mode="multiple" showSearch optionFilterProp="label" loading={employees.isLoading} status={employees.isError ? 'error' : undefined} options={employeeOptions} placeholder="搜索并选择在职员工" /></Form.Item>
        <Form.Item name="conclusion" label="评审结论" rules={[{ required: !creating, message: '请选择评审结论' }]}><Select options={['通过', '有条件通过', '不通过'].map((value) => ({ value, label: value }))} placeholder="选择结论" /></Form.Item>
        <div className="flex items-center">{current && statusTag(current.status)}</div>
        <Form.Item name="summary" label="评审摘要" className="md:col-span-2" rules={[{ required: !creating, whitespace: true, message: '请输入评审摘要' }]}><Input.TextArea rows={5} maxLength={5000} showCount /></Form.Item>
        <Form.Item name="remainingRisks" label="遗留风险"><Input.TextArea rows={4} maxLength={5000} showCount /></Form.Item>
        <Form.Item name="releaseRecommendation" label="发布建议"><Input.TextArea rows={4} maxLength={5000} showCount /></Form.Item>
      </Form>}
    </div> : reviews.isError ? <Alert type="error" showIcon title="版本评审列表加载失败" action={<Button onClick={() => reviews.refetch()}>重试</Button>} /> : reviews.isLoading ? <div className="flex min-h-56 items-center justify-center"><Spin /></div> : <div className="space-y-4">
      <div className="flex justify-end"><Button type="primary" icon={<PlusOutlined />} onClick={startCreate}>新建评审</Button></div>
      <Table rowKey="id" dataSource={reviews.data || []} locale={{ emptyText: '暂无版本评审' }} onRow={(item) => ({ onClick: () => setSelectedId(item.id), className: 'cursor-pointer' })} columns={[{ title: '评审日期', dataIndex: 'reviewDate', render: (value) => value || '--' }, { title: '参与人', dataIndex: 'participantCount', width: 100, render: (value) => `${value} 人` }, { title: '结论', dataIndex: 'conclusion', render: (value) => value || '未填写' }, { title: '状态', dataIndex: 'status', width: 100, render: statusTag }, { title: '更新时间', dataIndex: 'updatedAt', width: 180, render: (value) => value ? new Date(value).toLocaleString('zh-CN', { hour12: false }) : '--' }]} />
    </div>}
  </div>;
};
