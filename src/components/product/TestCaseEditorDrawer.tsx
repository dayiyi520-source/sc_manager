import React, { useEffect, useRef, useState } from 'react';
import { Alert, Button, Cascader, Form, Input, Select, Space, Table } from 'antd';
import { CopyOutlined, DeleteOutlined, FolderOpenOutlined, PlusOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { productRepository } from '../../services/productRepository';
import { teamRepository } from '../../services/teamRepository';
import { WorkItemCreatePanel } from './WorkItemCreatePanel';
import { LazyRichTextEditor as RichTextEditor } from './LazyRichTextEditor';
import type { SaveTestCaseInput, TestCase, TestCaseDirectory, TestPriority } from '../../types/testManagement';

type TestCaseEditorDrawerProps = {
  open: boolean;
  productLineId: string;
  directories: TestCaseDirectory[];
  initialCase?: TestCase | null;
  sourceRequirementId?: string;
  onClose: () => void;
  onSaved: (value: TestCase, continueCreating?: boolean) => void;
};

type EditorValues = Omit<SaveTestCaseInput, 'revision' | 'directoryId'> & { directoryPath?: string[]; tagsText?: string };

type DirectoryOption = { value: string; label: string; children?: DirectoryOption[] };

const directoryOptions = (directories: TestCaseDirectory[]): DirectoryOption[] => {
  const build = (parentId: string | null): DirectoryOption[] => directories
    .filter((item) => (item.parentId || null) === parentId)
    .sort((a, b) => a.sort - b.sort)
    .map((item) => {
      const children = build(item.id);
      return { value: item.id, label: item.name, ...(children.length ? { children } : {}) };
    });
  return build(null);
};

const directoryPath = (directories: TestCaseDirectory[], id?: string): string[] => {
  if (!id) return [];
  const item = directories.find((directory) => directory.id === id);
  return item ? [...directoryPath(directories, item.parentId || undefined), item.id] : [];
};

export const TestCaseEditorDrawer: React.FC<TestCaseEditorDrawerProps> = ({ open, productLineId, directories, initialCase, sourceRequirementId, onClose, onSaved }) => {
  const [form] = Form.useForm<EditorValues>();
  const [saving, setSaving] = useState(false);
  const [continueCreating, setContinueCreating] = useState(false);
  const [error, setError] = useState('');
  const [preconditionValue, setPreconditionValue] = useState('');
  const preconditionEditor = useRef<HTMLDivElement | null>(null);
  const employees = useQuery({ queryKey: ['team-member-options'], queryFn: teamRepository.options, enabled: open, retry: false });

  useEffect(() => {
    if (!open) return;
    setError('');
    setPreconditionValue(initialCase?.precondition || '');
    form.setFieldsValue(initialCase ? {
      directoryPath: directoryPath(directories, initialCase.directoryId),
      sourceRequirementId: initialCase.sourceRequirementId || sourceRequirementId,
      title: initialCase.title,
      precondition: initialCase.precondition || '',
      priority: initialCase.priority,
      ownerId: initialCase.ownerId,
      tags: initialCase.tags,
      tagsText: initialCase.tags.join('、'),
      steps: initialCase.steps.map((step, index) => ({ ...step, sort: index + 1 })),
    } : {
      directoryPath: directoryPath(directories, directories[0]?.id),
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
      const directoryId = values.directoryPath?.at(-1);
      if (!directoryId) throw new Error('请选择功能目录');
      const body: SaveTestCaseInput = {
        directoryId,
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
      const actualLineId = productLineId === 'all' ? directories.find((directory) => directory.id === directoryId)?.productLineId || productLineId : productLineId;
      const saved = initialCase
        ? await productRepository.updateTestCase(actualLineId, initialCase.id, body)
        : await productRepository.createTestCase(actualLineId, body);
      onSaved(saved, continueCreating && !initialCase);
      if (continueCreating && !initialCase) {
        form.setFieldsValue({ title: '', precondition: '', tags: [], tagsText: '', steps: [{ sort: 1, action: '', expectedResult: '' }] });
        setPreconditionValue('');
      }
    } catch (reason) {
      if (reason instanceof Error) setError(reason.message || '保存测试用例失败');
    } finally {
      setSaving(false);
    }
  };

  return <Form form={form} layout="vertical" disabled={!productLineId || saving} requiredMark>
    <Form.Item name="sourceRequirementId" hidden><Input /></Form.Item>
    <WorkItemCreatePanel isOpen={open} onClose={onClose} title={initialCase ? `编辑用例 ${initialCase.code}` : '新建用例'} presentation="workspace" showContinueOption={!initialCase} continueChecked={continueCreating} onContinueCheckedChange={setContinueCreating} footer={<><Button onClick={onClose} disabled={saving}>取消</Button><Button type="primary" onClick={() => void submit()} loading={saving} disabled={!productLineId}>{initialCase ? '保存' : '新建'}</Button></>} properties={<aside className="test-case-properties">
      <h3>用例属性</h3>
      <Form.Item name="ownerId" label="负责人" rules={[{ required: true, message: '请选择负责人' }]}><Select showSearch loading={employees.isLoading} optionFilterProp="label" options={(employees.data || []).map((employee) => ({ label: `${employee.name} · ${employee.department || '未分配部门'}`, value: employee.id }))} /></Form.Item>
      <Form.Item label="用例类型"><div className="test-case-property-value">测试用例</div></Form.Item>
      <Form.Item name="priority" label="优先级" rules={[{ required: true }]}><Select options={(['P0', 'P1', 'P2', 'P3'] as TestPriority[]).map((value) => ({ label: value, value }))} /></Form.Item>
      <Form.Item name="tagsText" label="标签"><Input placeholder="使用逗号或顿号分隔" maxLength={240} /></Form.Item>
      <section className="test-case-attachment-placeholder"><h4>附件</h4><p>暂无附件</p></section>
    </aside>}>
      {!productLineId && <Alert type="warning" showIcon title="请先选择产品线" />}
      {employees.isError && <Alert className="mb-4" type="error" showIcon title="负责人加载失败" action={<Button size="small" onClick={() => employees.refetch()}>重试</Button>} />}
      {error && <Alert className="mb-4" type="error" showIcon title="保存失败" description={error.includes('409') ? '用例已被其他人修改，请关闭后重新打开。' : error} />}
      <div className="test-case-editor-main">
        <Form.Item name="title" label="用例标题" rules={[{ required: true, whitespace: true, message: '请填写用例标题' }]}><Input size="large" maxLength={255} showCount placeholder="请输入标题" /></Form.Item>
        <Form.Item name="directoryPath" label="选择分组" rules={[{ required: true, message: '请选择功能目录' }]}>
          <Cascader className="test-case-directory-cascader" options={directoryOptions(directories)} showSearch changeOnSelect prefix={<FolderOpenOutlined />} placeholder="全部用例 / 选择功能目录" />
        </Form.Item>
        <Form.Item name="precondition" label="前置条件">
          <RichTextEditor editor={preconditionEditor} value={preconditionValue} onInput={(text) => { setPreconditionValue(text); form.setFieldValue('precondition', text); }} placeholder="请输入前置条件" />
        </Form.Item>
        <section className="test-case-step-section">
          <div className="test-case-step-heading"><div><h3>表格描述</h3><span>执行时将保存当前内容快照</span></div></div>
          <Form.List name="steps">
            {(fields, { add, remove }) => <div className="test-case-step-table">
              <Table size="small" rowKey="key" pagination={false} dataSource={fields} columns={[
                { title: '序号', width: 64, render: (_value, _field, index) => <span className="test-case-step-index">{index + 1}</span> },
                { title: '操作步骤', render: (_value, field) => <Form.Item {...field} name={[field.name, 'action']} rules={[{ required: true, whitespace: true, message: '请填写操作步骤' }]}><Input.TextArea autoSize={{ minRows: 2, maxRows: 5 }} placeholder="操作步骤" /></Form.Item> },
                { title: '预期结果', render: (_value, field) => <Form.Item {...field} name={[field.name, 'expectedResult']} rules={[{ required: true, whitespace: true, message: '请填写预期结果' }]}><Input.TextArea autoSize={{ minRows: 2, maxRows: 5 }} placeholder="预期结果" /></Form.Item> },
                { title: '操作', width: 104, render: (_value, field, index) => <Space size={4}><Button type="text" aria-label={`复制第${index + 1}步`} icon={<CopyOutlined />} onClick={() => { const values = form.getFieldValue('steps') || []; add({ ...values[index], sort: fields.length + 1 }); }} /><Button type="text" danger aria-label={`删除第${index + 1}步`} disabled={fields.length === 1} icon={<DeleteOutlined />} onClick={() => remove(field.name)} /></Space> },
              ]} />
              <Button type="link" icon={<PlusOutlined />} onClick={() => add({ sort: fields.length + 1, action: '', expectedResult: '' })}>添加步骤</Button>
            </div>}
          </Form.List>
        </section>
      </div>
    </WorkItemCreatePanel>
  </Form>;
};
