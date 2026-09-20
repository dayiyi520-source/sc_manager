import React, { useEffect, useRef, useState } from 'react';
import { Button, Form, Input, Select } from 'antd';
import { WorkItemCreatePanel } from './WorkItemCreatePanel';
import { LazyRichTextEditor as RichTextEditor } from './LazyRichTextEditor';
import type { EmployeeOption } from '../../types';
import { employeeSelectOptions } from '../common/PersonIdentity';

export type DefectCreateValues = {
  title: string;
  description: string;
  descriptionHtml: string;
  severity: string;
  priority: string;
  type: string;
  assignee: string;
  env: string;
};

type DefectCreatePanelProps = {
  open: boolean;
  productLineName?: string;
  versionName?: string;
  requirementTitle?: string;
  employeeNames: string[];
  employeeOptions: EmployeeOption[];
  initialTitle?: string;
  initialDescription?: string;
  saving?: boolean;
  onClose: () => void;
  onSubmit: (values: DefectCreateValues) => Promise<void> | void;
};

export const DefectCreatePanel: React.FC<DefectCreatePanelProps> = ({ open, productLineName, versionName, requirementTitle, employeeNames, employeeOptions, initialTitle = '', initialDescription = '', saving, onClose, onSubmit }) => {
  const [form] = Form.useForm<Omit<DefectCreateValues, 'description' | 'descriptionHtml'>>();
  const [description, setDescription] = useState(initialDescription);
  const [descriptionHtml, setDescriptionHtml] = useState('');
  const editor = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    form.setFieldsValue({ title: initialTitle, severity: '严重缺陷', priority: '高', type: '功能缺陷', assignee: employeeNames[0] || '', env: '测试环境' });
    setDescription(initialDescription);
    setDescriptionHtml('');
  }, [employeeNames, form, initialDescription, initialTitle, open]);

  const submit = async () => {
    const values = await form.validateFields();
    await onSubmit({ ...values, description, descriptionHtml });
  };

  return <WorkItemCreatePanel
    isOpen={open}
    onClose={onClose}
    title="提报新缺陷 Bug"
    showContinueOption={false}
    footer={<><Button onClick={onClose}>取消</Button><Button type="primary" loading={saving} onClick={() => void submit()}>提交缺陷</Button></>}
    properties={<Form form={form} layout="vertical" requiredMark>
      <Form.Item label="所属产品线"><Input value={productLineName || '未设置'} disabled /></Form.Item>
      <Form.Item label="关联版本"><Input value={versionName || '未设置'} disabled /></Form.Item>
      <Form.Item name="severity" label="严重程度" rules={[{ required: true }]}><Select options={['致命阻断', '严重缺陷', '一般问题', '轻微优化'].map((value) => ({ value, label: value }))} /></Form.Item>
      <Form.Item name="priority" label="优先级" rules={[{ required: true }]}><Select options={['紧急', '高', '中', '低'].map((value) => ({ value, label: value }))} /></Form.Item>
      <Form.Item name="type" label="缺陷类型"><Select options={['功能缺陷', '性能缺陷', 'UI交互', '安全漏洞', '环境配置'].map((value) => ({ value, label: value }))} /></Form.Item>
      <Form.Item name="assignee" label="责任处理人" rules={[{ required: true, message: '请选择责任处理人' }]}><Select showSearch optionFilterProp="label" options={employeeSelectOptions(employeeOptions, 'name')} /></Form.Item>
      <Form.Item label="关联需求"><Input value={requirementTitle || '未关联'} disabled /></Form.Item>
      <Form.Item name="env" label="所属环境"><Input maxLength={120} /></Form.Item>
    </Form>}
  >
    <Form form={form} layout="vertical" className="w-full" requiredMark>
      <Form.Item name="title" label="缺陷 Bug 名称" rules={[{ required: true, whitespace: true, message: '请输入缺陷标题' }]}><Input maxLength={255} placeholder="请输入清晰、可定位的缺陷标题" /></Form.Item>
      <Form.Item label="复现步骤 / 缺陷描述">
        <RichTextEditor editor={editor} value={description} htmlValue={descriptionHtml} onInput={(text, html) => { setDescription(text); setDescriptionHtml(html); }} placeholder="请详细描述复现步骤、实际结果和期望结果..." />
      </Form.Item>
    </Form>
  </WorkItemCreatePanel>;
};
