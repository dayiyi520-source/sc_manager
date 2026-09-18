import React, { useEffect, useState } from 'react';
import { Alert, Button, Drawer, Form, Input, Select, Space } from 'antd';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { productRepository } from '../../services/productRepository';
import { teamRepository } from '../../services/teamRepository';
import type { SaveTestCaseInput, TestCase, TestCaseDirectory, TestPriority } from '../../types/testManagement';

type TestCaseEditorDrawerProps = {
  open: boolean;
  productLineId: string;
  directories: TestCaseDirectory[];
  initialCase?: TestCase | null;
  sourceRequirementId?: string;
  onClose: () => void;
  onSaved: (value: TestCase) => void;
};

type EditorValues = Omit<SaveTestCaseInput, 'revision'> & { tagsText?: string };

export const TestCaseEditorDrawer: React.FC<TestCaseEditorDrawerProps> = ({ open, productLineId, directories, initialCase, sourceRequirementId, onClose, onSaved }) => {
  const [form] = Form.useForm<EditorValues>();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const employees = useQuery({ queryKey: ['team-member-options'], queryFn: teamRepository.options, enabled: open, retry: false });

  useEffect(() => {
    if (!open) return;
    setError('');
    form.setFieldsValue(initialCase ? {
      directoryId: initialCase.directoryId,
      sourceRequirementId: initialCase.sourceRequirementId || sourceRequirementId,
      title: initialCase.title,
      precondition: initialCase.precondition || '',
      priority: initialCase.priority,
      ownerId: initialCase.ownerId,
      tags: initialCase.tags,
      tagsText: initialCase.tags.join('、'),
      steps: initialCase.steps.map((step, index) => ({ ...step, sort: index + 1 })),
    } : {
      directoryId: directories[0]?.id,
      sourceRequirementId,
      priority: 'P1',
      tags: [],
      tagsText: '',
      steps: [{ sort: 1, action: '', expectedResult: '' }],
    });
  }, [open, initialCase, sourceRequirementId, directories, form]);

  const submit = async () => {
    setError('');
    try {
      const values = await form.validateFields();
      const body: SaveTestCaseInput = {
        directoryId: values.directoryId,
        sourceRequirementId: values.sourceRequirementId || null,
        title: values.title.trim(),
        precondition: values.precondition?.trim(),
        priority: values.priority as TestPriority,
        ownerId: values.ownerId,
        tags: (values.tagsText || '').split(/[、,]/).map((tag) => tag.trim()).filter(Boolean),
        steps: values.steps.map((step, index) => ({ ...step, sort: index + 1 })),
        revision: initialCase?.revision,
      };
      setSaving(true);
      const saved = initialCase
        ? await productRepository.updateTestCase(productLineId, initialCase.id, body)
        : await productRepository.createTestCase(productLineId, body);
      onSaved(saved);
    } catch (reason) {
      if (reason instanceof Error) setError(reason.message || '保存测试用例失败');
    } finally {
      setSaving(false);
    }
  };

  return <Drawer className="test-case-editor-drawer" open={open} onClose={onClose} title={initialCase ? `编辑用例 ${initialCase.code}` : '新建测试用例'} destroyOnHidden extra={<Space><Button onClick={onClose} disabled={saving}>取消</Button><Button type="primary" onClick={() => void submit()} loading={saving} disabled={!productLineId}>保存</Button></Space>}>
    {!productLineId && <Alert type="warning" showIcon title="请先选择产品线" />}
    {employees.isError && <Alert className="mb-4" type="error" showIcon title="负责人加载失败" action={<Button size="small" onClick={() => employees.refetch()}>重试</Button>} />}
    {error && <Alert className="mb-4" type="error" showIcon title="保存失败" description={error.includes('409') ? '用例已被其他人修改，请关闭后重新打开。' : error} />}
    <Form form={form} layout="vertical" disabled={!productLineId || saving} requiredMark>
      <div className="test-case-editor-grid">
        <Form.Item name="directoryId" label="功能目录" rules={[{ required: true, message: '请选择功能目录' }]}><Select showSearch optionFilterProp="label" options={directories.map((directory) => ({ label: directory.name, value: directory.id }))} /></Form.Item>
        <Form.Item name="priority" label="优先级" rules={[{ required: true }]}><Select options={(['P0', 'P1', 'P2', 'P3'] as TestPriority[]).map((value) => ({ label: value, value }))} /></Form.Item>
        <Form.Item name="ownerId" label="负责人" rules={[{ required: true, message: '请选择负责人' }]}><Select showSearch loading={employees.isLoading} optionFilterProp="label" options={(employees.data || []).map((employee) => ({ label: `${employee.name} · ${employee.department || '未分配部门'}`, value: employee.id }))} /></Form.Item>
        <Form.Item name="tagsText" label="标签"><Input placeholder="使用逗号或顿号分隔" maxLength={240} /></Form.Item>
      </div>
      <Form.Item name="title" label="用例标题" rules={[{ required: true, whitespace: true, message: '请填写用例标题' }]}><Input maxLength={255} showCount /></Form.Item>
      <Form.Item name="precondition" label="前置条件"><Input.TextArea rows={3} maxLength={5000} showCount /></Form.Item>
      <section className="test-case-step-section">
        <div className="test-case-step-heading"><div><h3>测试步骤</h3><span>执行时将保存当前内容快照</span></div></div>
        <Form.List name="steps">
          {(fields, { add, remove }) => <div className="test-case-step-list">
            {fields.map((field, index) => <div className="test-case-step-row" key={field.key}>
              <span className="test-case-step-index">{String(index + 1).padStart(2, '0')}</span>
              <Form.Item {...field} name={[field.name, 'action']} rules={[{ required: true, whitespace: true, message: '请填写操作步骤' }]}><Input.TextArea autoSize={{ minRows: 2, maxRows: 5 }} placeholder="操作步骤" /></Form.Item>
              <Form.Item {...field} name={[field.name, 'expectedResult']} rules={[{ required: true, whitespace: true, message: '请填写预期结果' }]}><Input.TextArea autoSize={{ minRows: 2, maxRows: 5 }} placeholder="预期结果" /></Form.Item>
              <Button type="text" danger aria-label={`删除第${index + 1}步`} disabled={fields.length === 1} icon={<DeleteOutlined />} onClick={() => remove(field.name)} />
            </div>)}
            <Button block type="dashed" icon={<PlusOutlined />} onClick={() => add({ sort: fields.length + 1, action: '', expectedResult: '' })}>添加步骤</Button>
          </div>}
        </Form.List>
      </section>
    </Form>
  </Drawer>;
};
