import { Alert, Button, DatePicker, Empty, Flex, Form, Input, InputNumber, Modal, Select, Tag, Typography } from 'antd';
import Card from 'antd/es/card/Card';
import { PlusIcon, TrashIcon } from '@primer/octicons-react';
import dayjs from 'dayjs';
import { useState } from 'react';
import type { OkrActionPayload, OkrPerson, OkrRecord } from '../../../services/okrRepository';

const departmentType = (department: string) => {
  if (/产研|产品|研发|技术/.test(department)) return 'product';
  if (/售前|销售|市场/.test(department)) return 'presales';
  if (/交付|项目|实施/.test(department)) return 'delivery';
  return 'support';
};

export function ActionBreakdownForm({ open, cycle, person, parents, people, busy, onClose, onSave }: {
  open: boolean; cycle: string; person?: OkrPerson; parents: OkrRecord[]; people: OkrPerson[]; busy: boolean;
  onClose: () => void; onSave: (payloads: OkrActionPayload[]) => Promise<void>;
}) {
  const [form] = Form.useForm();
  const [collapsed, setCollapsed] = useState<Set<number>>(new Set());
  const type = departmentType(person?.department || '');
  const fieldName = type === 'product' ? '关联产品线' : type === 'presales' ? '关联线索/商机' : type === 'delivery' ? '关联项目' : '验收标准';
  const structureLabel = type === 'support' ? '验收标准' : fieldName;
  const selectParent = (parent: OkrRecord) => {
    const actions = form.getFieldValue('actions') || [{weight: 100}];
    const targetIndex = actions.findIndex((action: Record<string, unknown>) => !action.parentActionId);
    const index = targetIndex >= 0 ? targetIndex : 0;
    form.setFieldValue(['actions', index, 'parentActionId'], parent.id);
    form.setFieldValue(['actions', index, 'parentObjectiveId'], parent.payload.parentObjectiveId || '');
  };
  const submit = async (values: { actions: Array<Record<string, unknown>> }) => {
    const payloads = (values.actions || []).map(action => ({
      title: String(action.title || '').trim(), department: person?.department || '其他支撑',
      parentObjectiveId: String(action.parentObjectiveId || ''), parentActionId: String(action.parentActionId || ''),
      assigneeId: action.assigneeId ? String(action.assigneeId) : undefined,
      assigneeName: action.assigneeId ? people.find(item => item.id === action.assigneeId)?.name : undefined,
      structureType: type, productLine: type === 'product' ? String(action.businessObject || '') : undefined,
      businessObject: type !== 'product' && type !== 'support' ? String(action.businessObject || '') : undefined,
      acceptanceStandard: type === 'support' ? String(action.businessObject || '') : undefined,
      milestone: type === 'support' ? undefined : String(action.milestone || ''),
      deadline: dayjs.isDayjs(action.deadline) ? action.deadline.format('YYYY-MM-DD') : String(action.deadline || ''), weight: Number(action.weight || 0),
    }));
    await onSave(payloads);
    form.resetFields();
  };
  return <Modal open={open} width="min(100%, 76rem)" title={`${dayjs(cycle).format('YYYY年MM月')} · 拆解动作`} onCancel={onClose} footer={null} destroyOnHidden>
    <Form form={form} layout="vertical" disabled={busy} onFinish={submit} initialValues={{actions: [{weight: 100}]}}>
      <div className="okr-action-breakdown-grid">
        <Card title="上级指定给我的动作" className="okr-action-parent-panel">
          {parents.length ? <Flex vertical gap="small">{parents.map(parent => <Card size="small" key={parent.id} className="okr-action-parent-item" role="button" tabIndex={0} onClick={() => selectParent(parent)} onKeyDown={event => { if(event.key === 'Enter' || event.key === ' ') selectParent(parent); }}>
            <Typography.Text strong>{parent.payload.title}</Typography.Text>
            <Typography.Text type="secondary" className="block">{parent.ownerId === person?.supervisorId ? '直属上级指定' : '可承接动作'}</Typography.Text>
            <Tag color="blue">{parent.payload.parentActionId ? '动作拆解' : '上级 A'}</Tag>
          </Card>)}</Flex> : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无指定给你的动作" />}
        </Card>
        <Card title={<Flex justify="space-between" align="center"><span>新增关键动作</span><Button type="text" icon={<PlusIcon />} onClick={() => form.getFieldValue('actions').length < 20 && form.setFieldsValue({actions: [...form.getFieldValue('actions'), {weight: 0}]})}>继续添加</Button></Flex>}>
          <Alert className="mb-4" type="info" showIcon title="每个动作请选择一个左侧上级动作，可选指定承接人员" />
          <Form.List name="actions">
            {(fields, {remove}) => <Flex vertical gap="middle">{fields.map((field, index) => <Card key={field.key} size="small" title={`关键动作 ${index + 1}`} extra={<Button type="text" onClick={() => setCollapsed(current => { const next = new Set(current); next.has(field.key) ? next.delete(field.key) : next.add(field.key); return next; })}>{collapsed.has(field.key) ? '展开' : '收起'}</Button>}>
              {!collapsed.has(field.key) && <>
              <Form.Item name={[field.name, 'parentActionId']} label="上级动作" rules={[{required: true, message: '请选择上级动作'}]}>
                <Select showSearch optionFilterProp="label" placeholder="请选择左侧上级动作" options={parents.map(parent => ({value: parent.id, label: parent.payload.title}))} onChange={id => form.setFieldValue(['actions', field.name, 'parentObjectiveId'], parents.find(parent => parent.id === id)?.payload.parentObjectiveId || '')} />
              </Form.Item>
              <Form.Item name={[field.name, 'parentObjectiveId']} hidden><Input /></Form.Item>
              <Form.Item name={[field.name, 'title']} label="输入动作" rules={[{required: true, whitespace: true, message: '请输入动作'}]}><Input.TextArea autoSize={{minRows: 2, maxRows: 4}} maxLength={2000} /></Form.Item>
              <Form.Item name={[field.name, 'businessObject']} label={structureLabel} rules={[{required: true, whitespace: true, message: `请输入${structureLabel}`}]}><Input placeholder={`请输入${structureLabel}`} maxLength={500} /></Form.Item>
              {type !== 'support' && <Form.Item name={[field.name, 'milestone']} label="关键节点" rules={[{required: true, whitespace: true, message: '请输入关键节点'}]}><Input maxLength={500} /></Form.Item>}
              <Flex gap="middle" wrap><Form.Item className="flex-1" name={[field.name, 'deadline']} label="完成时间" rules={[{required: true, message: '请选择完成时间'}]}><DatePicker className="w-full" /></Form.Item><Form.Item name={[field.name, 'weight']} label="权重" rules={[{required: true, type: 'number', min: 1, max: 100}]}><InputNumber min={1} max={100} precision={0} suffix="%" /></Form.Item></Flex>
              <Form.Item name={[field.name, 'assigneeId']} label="承接人员（可选）"><Select allowClear showSearch optionFilterProp="label" placeholder="可不指定" options={people.map(item => ({value: item.id, label: `${item.name} · ${item.department}`}))} /></Form.Item>
              <Button danger type="text" icon={<TrashIcon />} disabled={fields.length <= 1} onClick={() => remove(field.name)}>删除动作</Button>
              </>}
            </Card>)}</Flex>}
          </Form.List>
          <Flex justify="end" gap="small" className="mt-4"><Button onClick={onClose}>取消</Button><Button type="primary" htmlType="submit" loading={busy}>保存拆解动作</Button></Flex>
        </Card>
      </div>
    </Form>
  </Modal>;
}
