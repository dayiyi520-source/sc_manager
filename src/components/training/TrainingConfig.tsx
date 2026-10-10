import { useState } from 'react';
import { App, Button, Checkbox, Form, Input, InputNumber, Modal, Popconfirm, Space, Switch, Table, Tag, Upload } from 'antd';
import { BookOutlined, PlusOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import { type TrainingCourse, type TrainingState } from '../../services/trainingRepository';
import { pagination } from './TrainingRecords';
import { TrainingStageConfig } from './TrainingStageConfig';
import { TrainingSystemMaterials } from './TrainingSystemMaterials';

type Props = { state: TrainingState; commit: (state: TrainingState) => boolean };
const roles = ['平台管理员', '学员', '合作伙伴'];
export function TrainingConfig({ state, commit }: Props) {
  const { message } = App.useApp();
  const [query, setQuery] = useState('');
  const [applied, setApplied] = useState('');
  const [editing, setEditing] = useState<TrainingCourse>();
  const [systemId, setSystemId] = useState<string>();
  const [materialsId, setMaterialsId] = useState<string>();
  const [detail, setDetail] = useState<{ course: TrainingCourse; mode: 'roles' | 'materials' }>();
  const [uploading, setUploading] = useState(false);
  const [form] = Form.useForm();
  const [detailForm] = Form.useForm();
  const cover = Form.useWatch('cover', form);
  const openSystem = (course?: TrainingCourse) => {
    const value = course || { id: crypto.randomUUID(), title: '', description: '', cover: '', version: 'V1.0.0', sort: 0, published: true, roles: [], lessons: [] };
    form.resetFields(); form.setFieldsValue({ ...value, sort: value.sort ?? 0 }); setEditing(value);
  };
  const openDetail = (course: TrainingCourse, mode: 'lessons' | 'roles' | 'materials') => {
    if (mode === 'lessons') { setSystemId(course.id); return; }
    if (mode === 'materials') { setMaterialsId(course.id); return; }
    detailForm.resetFields(); detailForm.setFieldsValue({ lessons: course.lessons, roles: course.roles || [], materials: course.materials || '' }); setDetail({ course, mode });
  };
  const saveSystem = async () => {
    try {
      const values = await form.validateFields(); if (!editing || uploading) return;
      const title = values.title.trim();
      if (state.courses.some(course => course.id !== editing.id && course.title === title)) { message.error('系统名称已存在'); return; }
      const course = { ...editing, ...values, title, description: (values.description || '').trim() };
      const exists = state.courses.some(item => item.id === course.id);
      const versionChanged = exists && course.version !== editing.version;
      if (commit({ ...state, courses: exists ? state.courses.map(item => item.id === course.id ? course : item) : [...state.courses, course], records: state.records.map(record => versionChanged && record.courseId === course.id && record.status === '已完成' ? { ...record, status: '需重学', updatedAt: new Date().toISOString() } : record) })) { setEditing(undefined); message.success(exists ? '业务系统已保存' : '业务系统已新建'); }
    } catch { /* Form validation keeps the entered values. */ }
  };
  const saveDetail = async () => {
    try {
      const values = await detailForm.validateFields(); if (!detail) return;
      const existing = state.courses.find(course => course.id === detail.course.id); if (!existing) { message.error('业务系统已不存在'); return; }
      const updated = { ...existing, ...(detail.mode === 'roles' ? { roles: values.roles || [] } : { materials: values.materials || '' }) };
      if (commit({ ...state, courses: state.courses.map(course => course.id === existing.id ? updated : course) })) { setDetail(undefined); message.success('配置已保存'); }
    } catch { /* Keep invalid input visible for correction. */ }
  };
  const rows = state.courses.filter(course => course.title.includes(applied.trim())).sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0));
  const materialCourse = state.courses.find(course => course.id === materialsId);
  if (materialCourse) return <TrainingSystemMaterials state={state} course={materialCourse} commit={commit} onBack={() => setMaterialsId(undefined)} />;
  if (systemId) return <TrainingStageConfig state={state} systemId={systemId} commit={commit} onBack={() => setSystemId(undefined)} />;
  return <section className="training-list-section training-config">
    <div className="training-toolbar-row"><div className="training-toolbar"><Input placeholder="搜索系统名称" allowClear value={query} onChange={event => setQuery(event.target.value)} onPressEnter={() => setApplied(query)} style={{ width: 280 }} /><Button type="primary" icon={<SearchOutlined />} onClick={() => setApplied(query)}>查询</Button><Button icon={<ReloadOutlined />} onClick={() => { setQuery(''); setApplied(''); }}>重置</Button></div><Button type="primary" icon={<PlusOutlined />} onClick={() => openSystem()}>新建系统</Button></div>
    <Table rowKey="id" pagination={pagination} dataSource={rows} scroll={{ x: 1440 }} columns={[
      { title: '封面', width: 100, render: (_, course) => course.cover ? <img className="training-config-cover" src={course.cover} alt={course.title} /> : <div className="training-config-cover training-cover-placeholder"><BookOutlined /></div> },
      { title: '系统名称', dataIndex: 'title', width: 240, render: (title, course) => <Button type="link" className="training-system-name" onClick={() => openDetail(course, 'lessons')}>{title}</Button> },
      { title: '简介', dataIndex: 'description', width: 180, ellipsis: true },
      { title: '授权角色', width: 270, render: (_, course) => course.roles?.length ? <Space size={[4, 4]} wrap>{course.roles.map(role => <Tag color="processing" key={role}>{role}</Tag>)}</Space> : <span className="training-muted">未授权</span> },
      { title: '排序', width: 80, render: (_, course) => course.sort ?? 0 },
      { title: '状态', width: 100, render: (_, course) => <Tag color={course.published ? 'success' : 'default'}>{course.published ? '启用' : '禁用'}</Tag> },
      { title: '操作', width: 470, render: (_, course) => <Space size={0} wrap><Button type="link" onClick={() => openDetail(course, 'lessons')}>配置阶段</Button><Button type="link" onClick={() => openDetail(course, 'roles')}>角色授权</Button><Button type="link" onClick={() => openDetail(course, 'materials')}>系统资料</Button><Button type="link" onClick={() => openSystem(course)}>编辑</Button><Button type="link" onClick={() => { const copy = { ...course, id: crypto.randomUUID(), title: `${course.title}（副本）`, published: false, files: [], lessons: course.lessons.map(lesson => ({ ...lesson, id: crypto.randomUUID(), videos: [], files: [] })) }; if (commit({ ...state, courses: [...state.courses, copy] })) message.success('已复制系统，副本默认禁用'); }}>复制</Button><Button type="link" onClick={() => commit({ ...state, courses: state.courses.map(item => item.id === course.id ? { ...item, published: !item.published } : item) })}>{course.published ? '禁用' : '启用'}</Button><Popconfirm title="删除该业务系统？" description="已有学习或告警记录的系统不能删除，可改为禁用。" onConfirm={() => { if (state.records.some(record => record.courseId === course.id) || state.warnings.some(warning => warning.courseId === course.id)) { message.error('该系统已有学习或告警记录，请使用禁用'); return; } commit({ ...state, courses: state.courses.filter(item => item.id !== course.id) }); }}><Button type="link" danger>删除</Button></Popconfirm></Space> }
    ]} />
    <Modal title={state.courses.some(course => course.id === editing?.id) ? '编辑业务系统' : '新建业务系统'} open={Boolean(editing)} width={640} className="training-system-modal" okText="确定" cancelText="取消" okButtonProps={{ disabled: uploading }} onCancel={() => setEditing(undefined)} onOk={saveSystem}>
      <Form name="training-system" form={form} layout="vertical"><Form.Item label="系统名称" name="title" rules={[{ required: true, whitespace: true, message: '请填写系统名称' }]}><Input maxLength={80} /></Form.Item><Form.Item label="简介" name="description"><Input.TextArea rows={3} maxLength={300} /></Form.Item><Form.Item label="课程封面"><div className="training-cover-editor"><div className="training-cover-preview">{cover ? <img src={cover} alt="课程封面预览" /> : <span>上传后显示在培训首页课程卡片</span>}</div><div><Upload accept="image/jpeg,image/png" showUploadList={false} beforeUpload={async file => {
        if (!['image/jpeg', 'image/png'].includes(file.type) || file.size > 8 * 1024 * 1024) { message.error('请选择不超过 8MB 的 JPG 或 PNG 图片'); return Upload.LIST_IGNORE; }
        setUploading(true);
        try { const data = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = reject; reader.readAsDataURL(file); }); await new Promise<void>((resolve, reject) => { const image = new Image(); image.onload = () => resolve(); image.onerror = reject; image.src = data; }); form.setFieldValue('cover', data); } catch { message.error('图片无法读取，请重新选择'); } finally { setUploading(false); }
        return false;
      }}><Button loading={uploading}>上传封面</Button></Upload><p className="training-muted">建议 16:9，jpg/png，不超过 8MB</p></div></div></Form.Item><Form.Item name="cover" hidden><Input /></Form.Item><Form.Item label="排序" name="sort" rules={[{ required: true, message: '请填写排序' }]}><InputNumber min={0} max={99999} precision={0} style={{ width: '100%' }} /></Form.Item><Form.Item label="状态" name="published" valuePropName="checked"><Switch /></Form.Item>{state.courses.some(course => course.id === editing?.id) && <Form.Item label="课程版本" name="version" rules={[{ required: true, whitespace: true }]}><Input maxLength={32} /></Form.Item>}</Form>
    </Modal>
    <Modal title={detail?.mode === 'roles' ? '角色授权' : '系统资料'} width={720} open={Boolean(detail)} okText="保存" cancelText="取消" onCancel={() => setDetail(undefined)} onOk={saveDetail}>
      <Form name="training-system-detail" form={detailForm} layout="vertical">{detail?.mode === 'roles' ? <><p className="training-muted">仅保存本地演示角色配置，正式访问权限待接入。</p><Form.Item name="roles"><Checkbox.Group options={roles} /></Form.Item></> : <Form.Item label="系统资料" name="materials"><Input.TextArea rows={8} maxLength={10000} placeholder="填写系统学习资料" /></Form.Item>}</Form>
    </Modal>
  </section>;
}
