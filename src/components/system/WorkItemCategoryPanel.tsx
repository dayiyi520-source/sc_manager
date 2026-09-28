import React, { useEffect, useState } from 'react';
import { Button, Drawer, Form, Input, InputNumber, Modal, Select, Switch, Table, message } from 'antd';
import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import { productRepository, type WorkItemCategoryDefinition } from '../../services/productRepository';
import { WorkItemCategoryIcon } from '../product/WorkItemCategoryIcon';

const ICON_OPTIONS = ['requirement', 'design', 'dev', 'test', 'bug', 'case'].map((value) => ({ value, label: value }));

export const WorkItemCategoryPanel: React.FC = () => {
  const [items, setItems] = useState<WorkItemCategoryDefinition[]>([]);
  const [editing, setEditing] = useState<WorkItemCategoryDefinition | null>(null);
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const load = async () => { setLoading(true); try { setItems(await productRepository.workItemCategories()); } catch (error) { message.error(error instanceof Error ? error.message : '工作项分类读取失败'); } finally { setLoading(false); } };
  useEffect(() => { void load(); }, []);
  const openCreate = () => { setEditing(null); form.resetFields(); form.setFieldsValue({ iconKey: 'requirement', capabilityType: 'STANDARD', sort: items.length + 1, enabled: true }); setOpen(true); };
  const openEdit = (item: WorkItemCategoryDefinition) => { setEditing(item); form.setFieldsValue(item); setOpen(true); };
  const save = async () => { const values = await form.validateFields(); setLoading(true); try { if (editing) await productRepository.updateWorkItemCategory(editing.id, values); else await productRepository.createWorkItemCategory(values); message.success(editing ? '工作项分类已保存' : '工作项分类已创建'); setOpen(false); await load(); } catch (error) { if (!(error instanceof Error && error.name === 'ValidationError')) message.error(error instanceof Error ? error.message : '保存失败'); } finally { setLoading(false); } };
  const toggle = async (item: WorkItemCategoryDefinition, enabled: boolean) => { setLoading(true); try { await productRepository.updateWorkItemCategory(item.id, { enabled }); await load(); } catch (error) { message.error(error instanceof Error ? error.message : '状态保存失败'); } finally { setLoading(false); } };
  const remove = (item: WorkItemCategoryDefinition) => Modal.confirm({ title: `删除「${item.displayName}」？`, content: '已被模板或工作项引用的分类不可删除。', okButtonProps: { danger: true }, onOk: async () => { try { await productRepository.deleteWorkItemCategory(item.id); message.success('分类已删除'); await load(); } catch (error) { message.error(error instanceof Error ? error.message : '删除失败'); throw error; } } });
  const columns = [
    { title: '分类', dataIndex: 'displayName', render: (_: string, item: WorkItemCategoryDefinition) => <span className="flex items-center gap-2"><WorkItemCategoryIcon category={item.iconKey} />{item.displayName}</span> },
    { title: '稳定编码', dataIndex: 'code', render: (value: string) => <code>{value}</code> },
    { title: '图标', dataIndex: 'iconKey' },
    { title: '排序', dataIndex: 'sort' },
    { title: '启用', dataIndex: 'enabled', render: (value: boolean, item: WorkItemCategoryDefinition) => <Switch size="small" checked={value} disabled={loading} onChange={(checked) => void toggle(item, checked)} /> },
    { title: '操作', key: 'actions', render: (_: unknown, item: WorkItemCategoryDefinition) => <span className="flex gap-1"><Button type="text" icon={<EditOutlined />} aria-label={`编辑${item.displayName}`} onClick={() => openEdit(item)} /><Button type="text" danger icon={<DeleteOutlined />} disabled={item.builtIn} aria-label={`删除${item.displayName}`} onClick={() => remove(item)} /></span> }
  ];
  return <section className="space-y-3" aria-label="工作项分类配置"><div className="flex flex-wrap items-start justify-between gap-3"><div><h4 className="text-sm font-bold text-[var(--text-primary)]">工作项分类</h4><p className="mt-1 text-[var(--text-muted)]">统一管理分类编码、图标和各界面展示名称。内置分类不可删除，自定义分类可新增和删除。</p></div><Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>新增分类</Button></div><Table rowKey="id" loading={loading} columns={columns} dataSource={items} pagination={false} scroll={{ x: 720 }} className="responsive-config-table" /><Drawer title={editing ? '编辑工作项分类' : '新增工作项分类'} open={open} onClose={() => setOpen(false)} width={480} footer={<div className="flex justify-end gap-2"><Button onClick={() => setOpen(false)}>取消</Button><Button type="primary" loading={loading} onClick={() => void save()}>保存</Button></div>}><Form form={form} layout="vertical"><Form.Item name="code" label="稳定编码" rules={[{ required: true, pattern: /^[a-z][a-z0-9_-]*$/, message: '请输入小写字母开头的稳定编码' }]}><Input disabled={Boolean(editing)} /></Form.Item><Form.Item name="name" label="分类名称" rules={[{ required: true, message: '请输入分类名称' }]}><Input /></Form.Item><Form.Item name="displayName" label="界面显示名称" rules={[{ required: true, message: '请输入界面显示名称' }]}><Input /></Form.Item><Form.Item name="iconKey" label="图标" rules={[{ required: true }]}><Select options={ICON_OPTIONS} /></Form.Item><Form.Item name="capabilityType" label="能力类型" rules={[{ required: true }]}><Select options={[{ value: 'STANDARD', label: '标准工作项' }, { value: 'TEST_CASE', label: '测试用例' }]} /></Form.Item><Form.Item name="sort" label="排序"><InputNumber min={0} className="w-full" /></Form.Item><Form.Item name="enabled" label="启用" valuePropName="checked"><Switch /></Form.Item></Form></Drawer></section>;
};
