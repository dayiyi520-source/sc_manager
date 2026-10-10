import { useState } from 'react';
import { App, Breadcrumb, Button, Empty, Form, Input, InputNumber, Modal, Popconfirm, Space, Switch, Table, Tag, Tooltip, Tree, Upload } from 'antd';
import { ArrowLeftOutlined, PlusOutlined, UploadOutlined } from '@ant-design/icons';
import { stageLessons, trainingStages, type TrainingCourse, type TrainingLesson, type TrainingStage, type TrainingState, type TrainingVideo } from '../../services/trainingRepository';
import { deleteTrainingFile, downloadTrainingFile, storeTrainingFile } from '../../services/trainingFiles';
import { pagination } from './TrainingRecords';

type Props = { state: TrainingState; systemId: string; commit: (state: TrainingState) => boolean; onBack: () => void };
export function TrainingStageConfig({ state, systemId, commit, onBack }: Props) {
  const { message, modal } = App.useApp();
  const [stageId, setStageId] = useState<string>();
  const [editor, setEditor] = useState<{ kind: 'stage' | 'lesson'; id?: string }>();
  const [asset, setAsset] = useState<{ id: string; kind: 'videos' | 'files' }>();
  const [busy, setBusy] = useState(false);
  const [form] = Form.useForm();
  const system = state.courses.find(course => course.id === systemId);
  if (!system) return <Empty description="业务系统已不存在"><Button onClick={onBack}>返回系统列表</Button></Empty>;
  const stages = trainingStages(system).sort((a, b) => a.sort - b.sort);
  const stage = stages.find(item => item.id === stageId);
  const lessons = stage ? stageLessons(system, stage) : [];
  const assetLesson = system.lessons.find(item => item.id === asset?.id);
  const persist = (updated: TrainingCourse) => commit({ ...state, courses: state.courses.map(course => course.id === systemId ? updated : course) });
  const editLesson = (lesson: TrainingLesson) => persist({ ...system, lessons: system.lessons.map(item => item.id === lesson.id ? lesson : item) });
  const used = (id: string) => state.records.some(item => item.courseId === systemId && item.lessonId === id) || state.warnings.some(item => item.courseId === systemId && item.lessonId === id);
  const openEditor = (kind: 'stage' | 'lesson', value?: TrainingStage | TrainingLesson) => {
    form.resetFields(); form.setFieldsValue(value ?? (kind === 'stage' ? { title: '', description: '', sort: 0, sequential: true, enabled: true } : { title: '', content: '', requirements: '', sort: 0, enabled: true }));
    setEditor({ kind, id: value?.id });
  };
  const save = async () => {
    try {
      const values = await form.validateFields(); if (!editor) return;
      values.title = values.title.trim();
      const peers = editor.kind === 'stage' ? stages : lessons;
      if (peers.some(item => item.id !== editor.id && item.title === values.title)) { message.error('名称已存在'); return; }
      const id = editor.id ?? crypto.randomUUID();
      let updated: TrainingCourse;
      if (editor.kind === 'stage') {
        const old = stages.find(item => item.id === id);
        const next = { ...values, id } as TrainingStage;
        updated = { ...system, stages: editor.id ? stages.map(item => item.id === id ? next : item) : [...stages, next], lessons: system.lessons.map(lesson => old && (lesson.stageId === old.id || (!lesson.stageId && lesson.stage === old.title)) ? { ...lesson, stageId: id, stage: next.title } : lesson) };
      } else {
        if (!stage) return;
        const next = { ...system.lessons.find(item => item.id === id), ...values, id, stageId: stage.id, stage: stage.title } as TrainingLesson;
        updated = { ...system, lessons: editor.id ? system.lessons.map(item => item.id === id ? next : item) : [...system.lessons, next] };
      }
      if (persist(updated)) { setEditor(undefined); message.success('已保存'); }
    } catch { /* Form displays validation errors. */ }
  };
  const validate = () => {
    const issues = stages.flatMap(item => {
      const courses = stageLessons(system, item);
      return !courses.length ? [`${item.title}：尚未配置课程`] : courses.filter(lesson => lesson.enabled !== false && !lesson.videos?.some(video => video.active)).map(lesson => `${item.title} / ${lesson.title}：缺少生效视频`);
    });
    modal.info({ title: '完整性校验', content: issues.length ? <ul>{issues.map(issue => <li key={issue}>{issue}</li>)}</ul> : stages.length ? '阶段与课程配置完整' : '尚未配置阶段' });
  };
  const upload = async (file: File) => {
    if (!assetLesson || !asset || busy) return false;
    if (file.size > (asset.kind === 'videos' ? 500 : 50) * 1024 * 1024) { message.error(asset.kind === 'videos' ? '视频不能超过500MB' : '资料不能超过50MB'); return Upload.LIST_IGNORE; }
    if (asset.kind === 'videos' && !['video/mp4', 'video/webm'].includes(file.type)) { message.error('请选择MP4或WebM视频'); return Upload.LIST_IGNORE; }
    setBusy(true); const id = crypto.randomUUID();
    try {
      let duration = 0;
      if (asset.kind === 'videos') duration = await new Promise<number>((resolve, reject) => {
        const video = document.createElement('video'); const url = URL.createObjectURL(file);
        const finish = (value?: number) => { clearTimeout(timer); URL.revokeObjectURL(url); video.removeAttribute('src'); value === undefined ? reject(new Error('视频无法读取时长')) : resolve(value); };
        const timer = setTimeout(() => finish(), 10000);
        video.onloadedmetadata = () => Number.isFinite(video.duration) ? finish(Math.round(video.duration)) : finish(); video.onerror = () => finish(); video.src = url;
      });
      await storeTrainingFile(id, file);
      const metadata = { id, name: file.name, size: file.size, uploadedAt: new Date().toISOString() };
      const videos = assetLesson.videos ?? [];
      const next = asset.kind === 'videos' ? { ...assetLesson, videos: [...videos.map(video => ({ ...video, active: false })), { ...metadata, version: Math.max(0, ...videos.map(video => video.version)) + 1, duration, note: '', active: true }] } : { ...assetLesson, files: [...(assetLesson.files ?? []), metadata] };
      if (editLesson(next)) message.success('上传成功'); else await deleteTrainingFile(id);
    } catch (error) { message.error(error instanceof Error ? error.message : '上传失败'); } finally { setBusy(false); }
    return false;
  };
  const uploadButton = <Upload showUploadList={false} disabled={busy} accept={asset?.kind === 'videos' ? 'video/mp4,video/webm' : undefined} beforeUpload={upload}><Button type="primary" icon={<UploadOutlined />} loading={busy}>{asset?.kind === 'videos' ? '上传新版本' : '上传资料'}</Button></Upload>;
  const removeAsset = async (id: string) => {
    if (!assetLesson || !asset) return;
    const updated = { ...assetLesson, [asset.kind]: (assetLesson[asset.kind] ?? []).filter(item => item.id !== id) };
    if (editLesson(updated)) { try { await deleteTrainingFile(id); } catch { message.warning('配置已删除，文件清理失败'); } }
  };
  return <section className="training-stage-workspace">
    <header className="training-stage-header"><div><h2>{stage ? '课程配置' : '阶段配置'} · {stage?.title ?? system.title}</h2><Breadcrumb items={[{ title: <a onClick={onBack}>培训配置</a> }, { title: <a onClick={() => setStageId(undefined)}>{system.title}</a> }, ...(stage ? [{ title: stage.title }] : [])]} /></div><Space wrap><Button icon={<ArrowLeftOutlined />} onClick={stage ? () => setStageId(undefined) : onBack}>{stage ? '返回阶段列表' : '返回系统列表'}</Button><Button onClick={validate}>完整性校验</Button><Button type="primary" icon={<PlusOutlined />} onClick={() => openEditor(stage ? 'lesson' : 'stage')}>{stage ? '新建课程' : '新建阶段'}</Button></Space></header>
    <div className="training-stage-body"><aside><h3>目录</h3><Tree key={stages.map(item => item.id).join('|')} blockNode defaultExpandAll selectedKeys={[stage?.id ?? 'system']} onSelect={(_, info) => { const key = String(info.node.key); const selected = stages.find(item => item.id === key || stageLessons(system, item).some(lesson => `lesson:${lesson.id}` === key)); setStageId(selected?.id); }} treeData={[{ key: 'system', title: system.title, children: stages.map(item => ({ key: item.id, title: `${item.title} (${stageLessons(system, item).length})`, children: stageLessons(system, item).map(lesson => ({ key: `lesson:${lesson.id}`, title: lesson.title })) })) }]} /></aside><main>
      {stage ? <Table rowKey="id" dataSource={lessons} pagination={pagination} scroll={{ x: 900 }} columns={[
        { title: '课程名称', dataIndex: 'title', render: (title, lesson) => <Button type="link" onClick={() => openEditor('lesson', lesson)}>{title}</Button> },
        { title: '生效版本', render: (_, lesson) => { const video = lesson.videos?.find(item => item.active); return video ? `V${video.version}` : '未配置'; } },
        { title: '排序', render: (_, lesson) => lesson.sort ?? 0 },
        { title: '状态', render: (_, lesson) => <Tag color={lesson.enabled !== false ? 'success' : 'default'}>{lesson.enabled !== false ? '启用' : '禁用'}</Tag> },
        { title: '操作', width: 340, render: (_, lesson) => <Space size={0}><Button type="link" onClick={() => openEditor('lesson', lesson)}>编辑</Button><Button type="link" onClick={() => setAsset({ id: lesson.id, kind: 'videos' })}>视频版本</Button><Button type="link" onClick={() => setAsset({ id: lesson.id, kind: 'files' })}>课程资料</Button><Popconfirm title="删除该课程？" onConfirm={() => { if (used(lesson.id)) { message.error('已有学习或告警记录，请改为禁用'); return; } if (lesson.videos?.length || lesson.files?.length) { message.error('请先删除课程视频与资料'); return; } persist({ ...system, lessons: system.lessons.filter(item => item.id !== lesson.id) }); }}><Button type="link" danger>删除</Button></Popconfirm></Space> }
      ]} /> : <Table rowKey="id" dataSource={stages} pagination={pagination} scroll={{ x: 850 }} columns={[
        { title: '阶段名称', dataIndex: 'title', render: (title, item) => <Button type="link" onClick={() => setStageId(item.id)}>{title}</Button> },
        { title: '课程数', render: (_, item) => <Button type="link" onClick={() => setStageId(item.id)}>{stageLessons(system, item).length}</Button> },
        { title: '排序', dataIndex: 'sort' }, { title: '顺序学习', render: (_, item) => item.sequential ? '强制顺序' : '自由学习' },
        { title: '状态', render: (_, item) => <Tag color={item.enabled ? 'success' : 'default'}>{item.enabled ? '启用' : '禁用'}</Tag> },
        { title: '操作', width: 260, render: (_, item) => <Space size={0}><Button type="link" onClick={() => setStageId(item.id)}>配置课程</Button><Button type="link" onClick={() => openEditor('stage', item)}>编辑</Button><Popconfirm title="删除该阶段？" onConfirm={() => { if (stageLessons(system, item).length) { message.error('请先移除阶段下的课程'); return; } persist({ ...system, stages: stages.filter(value => value.id !== item.id) }); }}><Button type="link" danger>删除</Button></Popconfirm></Space> }
      ]} />}
    </main></div>
    <Modal title={`${editor?.id ? '编辑' : '新建'}${editor?.kind === 'stage' ? '阶段' : '课程'}`} open={Boolean(editor)} width={editor?.kind === 'stage' ? 600 : 800} className="training-system-modal" onCancel={() => setEditor(undefined)} onOk={save} okText={editor?.kind === 'stage' ? '确定' : '保存'} cancelText="取消">
      <Form form={form} layout="vertical">
        {editor?.kind === 'stage' ? <Form.Item label="所属系统"><Input disabled value={system.title} /></Form.Item> : <div className="training-course-path"><span>所属路径</span><strong>{system.title} / {stage?.title}</strong></div>}
        <Form.Item name="title" label={editor?.kind === 'stage' ? '阶段名称' : '课程名称'} rules={[{ required: true, whitespace: true, message: '请填写名称' }]}><Input maxLength={80} placeholder={editor?.kind === 'lesson' ? '请输入课程名称' : undefined} /></Form.Item>
        {editor?.kind === 'stage' && <Form.Item name="description" label="阶段说明"><Input.TextArea rows={3} maxLength={1000} /></Form.Item>}
        <div className={editor?.kind === 'lesson' ? 'training-form-columns' : undefined}><Form.Item name="sort" label="排序" rules={[{ required: true }]}><InputNumber min={0} max={99999} precision={0} style={{ width: '100%' }} /></Form.Item>{editor?.kind === 'lesson' && <Form.Item name="enabled" label="启用状态" valuePropName="checked"><Switch checkedChildren="启用" unCheckedChildren="禁用" /></Form.Item>}</div>
        {editor?.kind === 'stage' ? <><Form.Item name="sequential" label="强制顺序学习" valuePropName="checked"><Switch /></Form.Item><Form.Item name="enabled" label="状态" valuePropName="checked"><Switch /></Form.Item></> : <><Form.Item label="学习说明"><Tooltip title="AI服务尚未接入"><Button disabled>AI生成说明</Button></Tooltip><Form.Item name="content" noStyle><Input.TextArea rows={4} maxLength={3000} placeholder="本课学什么、适用对象等" /></Form.Item></Form.Item><Form.Item name="requirements" label="学习达成要求"><Input.TextArea rows={4} maxLength={3000} placeholder="学完后应掌握的能力或操作要求" /></Form.Item></>}
      </Form>
    </Modal>
    <Modal title={`${asset?.kind === 'videos' ? '视频版本' : '课程资料'} · ${assetLesson?.title ?? ''}`} open={Boolean(assetLesson)} width="90%" className="training-assets-modal" footer={null} maskClosable={!busy} closable={!busy} onCancel={() => { if (!busy) setAsset(undefined); }}>
      <div className="training-toolbar-row"><span>课程：{assetLesson?.title} <span className="training-muted">共 {assetLesson?.[asset?.kind ?? 'files']?.length ?? 0} {asset?.kind === 'videos' ? '个版本' : '份资料'}</span></span><Space>{asset?.kind === 'files' && <Tooltip title="知识索引服务尚未接入"><Button disabled>重建知识索引</Button></Tooltip>}{uploadButton}</Space></div>
      {asset?.kind === 'videos' ? <Table<TrainingVideo> rowKey="id" dataSource={assetLesson?.videos ?? []} pagination={false} scroll={{ x: 1000 }} columns={[
        { title: '版本', render: (_, video) => `V${video.version}` }, { title: '文件名', dataIndex: 'name' }, { title: '时长(秒)', dataIndex: 'duration' }, { title: '备注', dataIndex: 'note', render: (note, video) => <Input aria-label={`V${video.version}备注`} defaultValue={note} maxLength={300} onBlur={event => { if (assetLesson && event.target.value !== note) editLesson({ ...assetLesson, videos: assetLesson.videos?.map(item => item.id === video.id ? { ...item, note: event.target.value } : item) }); }} /> },
        { title: '状态', render: (_, video) => <Tag color={video.active ? 'success' : 'default'}>{video.active ? '生效中' : '未生效'}</Tag> }, { title: '上传时间', render: (_, video) => new Date(video.uploadedAt).toLocaleString() },
        { title: '操作', render: (_, video) => <Space size={0}><Button type="link" disabled={video.active || busy} onClick={() => assetLesson && editLesson({ ...assetLesson, videos: assetLesson.videos?.map(item => ({ ...item, active: item.id === video.id })) })}>{video.active ? '当前生效' : '设为生效'}</Button><Button type="link" onClick={() => downloadTrainingFile(video.id, video.name).catch(error => message.error(error.message))}>下载</Button><Popconfirm title="删除该视频版本？" description={video.active ? '删除后课程将没有生效视频。' : undefined} onConfirm={() => removeAsset(video.id)}><Button type="link" danger disabled={busy}>删除</Button></Popconfirm></Space> }
      ]} /> : assetLesson?.files?.length ? <Table rowKey="id" dataSource={assetLesson.files} pagination={false} columns={[{ title: '文件名', dataIndex: 'name' }, { title: '大小', render: (_, file) => `${(file.size / 1024).toFixed(1)} KB` }, { title: '上传时间', render: (_, file) => new Date(file.uploadedAt).toLocaleString() }, { title: '操作', render: (_, file) => <Space><Button type="link" onClick={() => downloadTrainingFile(file.id, file.name).catch(error => message.error(error.message))}>下载</Button><Popconfirm title="删除该资料？" onConfirm={() => removeAsset(file.id)}><Button type="link" danger disabled={busy}>删除</Button></Popconfirm></Space> }]} /> : <div className="training-assets-empty"><Empty description="暂无课程资料">{uploadButton}</Empty></div>}
    </Modal>
  </section>;
}
