import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Button, DatePicker, Empty, Form, Input, Modal, Segmented, Select, Table, Tag } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import zhCN from 'antd/locale/zh_CN';
import type { Dayjs } from 'dayjs';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useApp } from '../../context/AppContext';
import { productRepository, type UnifiedWorkItem } from '../../services/productRepository';
import { teamRepository } from '../../services/teamRepository';
import type { EmployeeOption } from '../../types';
import { employeeSelectOptions } from '../common/PersonIdentity';
import { Pagination } from '../common/Pagination';
import { TestPlanDetail, type TestPlanRecord } from './TestPlanDetail';

type PlanRecord = TestPlanRecord;
type Scope = 'all' | 'owned' | 'created' | 'participated';
type PlanFormValues = { name: string; environment?: string; dateRange?: [Dayjs, Dayjs]; workItemId?: string; productLineId?: string; versionId?: string; ownerId?: string };
const taskIsParticipated = (task: UnifiedWorkItem, name: string) => Array.isArray(task.ccNames) ? task.ccNames.includes(name) : String(task.ccNames || '').split(',').map((value) => value.trim()).includes(name);

export const TestPlanWorkspace: React.FC<{ productLineFilter?: string; onDetailChange?: (open: boolean) => void }> = ({ productLineFilter = 'all', onDetailChange }) => {
  const { productLines, versions, currentUser } = useApp();
  const queryClient = useQueryClient();
  const [scope, setScope] = useState<Scope>('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [detail, setDetail] = useState<PlanRecord | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [taskQuery, setTaskQuery] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [planForm] = Form.useForm<PlanFormValues>();
  const tasks = useQuery({ queryKey: ['test-plan-tasks', productLineFilter, productLines.map((line) => line.id).join(',')], queryFn: async () => {
    const lines = productLines.filter((line) => productLineFilter === 'all' || line.id === productLineFilter);
    const results = await Promise.all(lines.map(async (line) => {
      const first = await productRepository.workItems(line.id, 'test'); const items = [...first.page.items];
      for (let currentPage = 2; items.length < first.page.total; currentPage += 1) { const next = await productRepository.workItems(line.id, 'test', '', { page: currentPage }); if (!next.page.items.length) break; items.push(...next.page.items); }
      return items.filter((item) => !item.parentWorkItemId);
    }));
    return results.flat();
  }, retry: false });
  const employees = useQuery({ queryKey: ['test-plan-employees'], queryFn: teamRepository.options, retry: false });
  const plans = useQuery({ queryKey: ['test-plan-list', productLineFilter, tasks.data?.map((task) => task.id).join(',')], enabled: Boolean(tasks.data), queryFn: async () => {
    const values = await Promise.all((tasks.data || []).map(async (task) => {
      const line = productLines.find((item) => item.id === task.productLineId);
      const version = versions.find((item) => item.id === task.versionId);
      const plansForTask = await productRepository.testPlans(task.id);
      return plansForTask.map((plan) => ({ plan, task, productName: line?.name || task.productLineName || '未设置', versionName: version?.name || task.versionName || '未设置' }));
    }));
    return values.flat() as PlanRecord[];
  }, retry: false });
  const allPlans = plans.data || [];
  const scopedPlans = useMemo(() => allPlans.filter(({ plan, task }) => {
    const belongs = scope === 'owned' ? (plan.ownerName || task.assigneeName) === currentUser.name : scope === 'created' ? task.creatorName === currentUser.name : scope === 'participated' ? taskIsParticipated(task, currentUser.name) : true;
    const query = search.trim().toLowerCase();
    return belongs && (!query || `${plan.name || ''} ${task.title} ${task.code || ''}`.toLowerCase().includes(query));
  }), [allPlans, currentUser.name, scope, search]);
  const pagedPlans = scopedPlans.slice((page - 1) * pageSize, page * pageSize);
  const taskCandidates = useMemo(() => (tasks.data || []).filter((item) => !taskQuery.trim() || item.title.toLowerCase().includes(taskQuery.trim().toLowerCase()) || String(item.code || '').toLowerCase().includes(taskQuery.trim().toLowerCase())), [tasks.data, taskQuery]);
  const selectedProductLineId = Form.useWatch('productLineId', planForm);
  const openCreate = () => {
    planForm.resetFields();
    const firstTask = tasks.data?.[0];
    planForm.setFieldsValue({ name: firstTask ? `${firstTask.title}测试计划` : undefined, workItemId: firstTask?.id, productLineId: firstTask?.productLineId || (productLineFilter !== 'all' ? productLineFilter : undefined), versionId: firstTask?.versionId, ownerId: employees.data?.find((item) => item.name === (firstTask?.assigneeName || currentUser.name))?.id });
    setTaskQuery(''); setError(''); setCreateOpen(true);
  };
  const createPlan = async () => {
    try {
      const values = await planForm.validateFields();
      const owner = (employees.data || []).find((item) => item.id === values.ownerId);
      setSaving(true); setError('');
      await productRepository.createTestPlan(values.workItemId!, { testCaseIds: [], name: values.name.trim(), environment: values.environment?.trim(), startDate: values.dateRange?.[0].format('YYYY-MM-DD'), endDate: values.dateRange?.[1].format('YYYY-MM-DD'), workItemId: values.workItemId, productLineId: values.productLineId, versionId: values.versionId, ownerId: owner?.id, ownerName: owner?.name, revision: 0 });
      setCreateOpen(false); planForm.resetFields(); await queryClient.invalidateQueries({ queryKey: ['test-plan-list'] });
    } catch (reason) {
      if (reason instanceof Error) setError(reason.message || '创建测试计划失败');
    } finally { setSaving(false); }
  };
  useEffect(() => { setPage(1); }, [scope, search, productLineFilter]);
  useEffect(() => { onDetailChange?.(Boolean(detail)); }, [detail, onDetailChange]);
  if (detail) return <TestPlanDetail record={detail} onBack={() => setDetail(null)} />;
  if (tasks.isLoading || plans.isLoading) return <div className="test-task-loading">正在加载测试计划...</div>;
  if (tasks.isError || plans.isError) return <Alert type="error" showIcon title="测试计划加载失败" action={<Button onClick={() => { void tasks.refetch(); void plans.refetch(); }}>重试</Button>} />;
  const employeeOptions = (employees.data || []) as EmployeeOption[];
  return <div className="test-plan-workspace test-plan-list-workspace">
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-main)] pb-3">
      <Segmented value={scope} onChange={(value) => setScope(value as Scope)} options={[{ label: `全部·${allPlans.length}`, value: 'all' }, { label: `我负责的·${allPlans.filter(({ plan, task }) => (plan.ownerName || task.assigneeName) === currentUser.name).length}`, value: 'owned' }, { label: `我创建的·${allPlans.filter(({ task }) => task.creatorName === currentUser.name).length}`, value: 'created' }, { label: `我参与的·${allPlans.filter(({ task }) => taskIsParticipated(task, currentUser.name)).length}`, value: 'participated' }]} />
      <div className="flex items-center gap-2"><Input.Search allowClear value={search} onChange={(event) => setSearch(event.target.value)} placeholder="搜索测试计划" style={{ width: 240 }} /><Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>新建</Button></div>
    </div>
    {error && <Alert className="mt-3" closable onClose={() => setError('')} type="error" showIcon title="操作失败" description={error} />}
    {!scopedPlans.length ? <Empty className="py-16" image={Empty.PRESENTED_IMAGE_SIMPLE} description="当前分类暂无测试计划" /> : <div className="dark-panel mt-4 overflow-hidden"><Table rowKey={(record) => record.plan.id || record.task.id} dataSource={pagedPlans} pagination={false} columns={[{ title: '测试计划', render: (_, record) => <button type="button" onClick={() => setDetail(record)} className="text-left text-[var(--active-text)] hover:text-[var(--primary-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]">{record.plan.name || '未命名计划'}</button> }, { title: '关联测试任务', render: (_, record) => record.task.title }, { title: '产品', dataIndex: 'productName' }, { title: '迭代版本', dataIndex: 'versionName' }, { title: '负责人', render: (_, record) => record.plan.ownerName || record.task.assigneeName || '未设置' }, { title: '状态', render: (_, record) => <Tag>{record.plan.cases.length ? '已配置用例' : '未配置用例'}</Tag> }, { title: '计划时间', render: (_, record) => `${record.plan.startDate || '未设置'} 至 ${record.plan.endDate || '未设置'}` }]} /><Pagination total={scopedPlans.length} page={page} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={(size) => { setPageSize(size); setPage(1); }} /></div>}
    <Modal title="新建测试计划" open={createOpen} onCancel={() => setCreateOpen(false)} onOk={() => void createPlan()} okText="保存" cancelText="取消" confirmLoading={saving} destroyOnHidden width="min(640px, calc(100vw - 32px))" styles={{ body: { maxHeight: 'calc(100vh - 220px)', overflowY: 'auto', paddingRight: 8 } }}><Form form={planForm} layout="vertical"><Form.Item name="name" label="计划名称" rules={[{ required: true, whitespace: true, message: '请输入计划名称' }]}><Input maxLength={120} /></Form.Item><Form.Item name="workItemId" label="关联测试任务" rules={[{ required: true, message: '请选择关联测试任务' }]}><Select showSearch allowClear filterOption={false} onSearch={setTaskQuery} placeholder="搜索测试任务标题" options={taskCandidates.map((item) => ({ value: item.id, label: `${item.code || ''} ${item.title}`.trim(), item }))} onChange={(value, option: any) => { const selected = option?.item; planForm.setFieldsValue({ workItemId: value, productLineId: selected?.productLineId, versionId: selected?.versionId || undefined, ownerId: employeeOptions.find((employee) => employee.name === selected?.assigneeName)?.id }); }} /></Form.Item><Form.Item name="environment" label="测试环境" rules={[{ required: true, message: '请选择测试环境' }]}><Select placeholder="请选择测试环境" options={['测试环境', '线上环境'].map((value) => ({ value, label: value }))} /></Form.Item><Form.Item name="dateRange" label="计划起止时间" rules={[{ required: true, message: '请选择计划起止时间' }]}><DatePicker.RangePicker locale={zhCN.DatePicker} placeholder={['开始日期', '结束日期']} className="w-full" /></Form.Item><Form.Item name="ownerId" label="负责人" rules={[{ required: true, message: '请选择负责人' }]}><Select showSearch allowClear optionFilterProp="label" placeholder="搜索并选择负责人" options={employeeSelectOptions(employeeOptions)} /></Form.Item><Form.Item name="productLineId" label="关联产品" rules={[{ required: true, message: '请选择关联产品' }]}><Select showSearch allowClear optionFilterProp="label" placeholder="请选择关联产品" options={productLines.map((line) => ({ value: line.id, label: line.name }))} onChange={(value) => { const currentVersion = planForm.getFieldValue('versionId'); if (currentVersion && !versions.some((version) => version.id === currentVersion && version.productLineId === value)) planForm.setFieldValue('versionId', undefined); }} /></Form.Item><Form.Item noStyle shouldUpdate={(prev, current) => prev.productLineId !== current.productLineId}><Form.Item name="versionId" label="关联迭代" rules={[{ required: true, message: '请选择关联迭代' }]}><Select showSearch allowClear optionFilterProp="label" placeholder="请选择关联迭代" disabled={!selectedProductLineId} options={versions.filter((version) => version.productLineId === selectedProductLineId).map((version) => ({ value: version.id, label: version.name }))} /></Form.Item></Form.Item></Form></Modal>
  </div>;
};
