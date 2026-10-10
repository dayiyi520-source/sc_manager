import { useEffect, useState } from 'react';
import { App, Button, Empty, Form, Input, Modal, Popconfirm, Popover, Space, Tag, Tooltip, Upload } from 'antd';
import { DownloadOutlined, DownOutlined, FilePdfOutlined, FileTextOutlined } from '@ant-design/icons';
import type { TrainingCourse, TrainingState, TrainingSystemFile } from '../../services/trainingRepository';
import { deleteTrainingFile, downloadTrainingFile, readTrainingFile, storeTrainingFile } from '../../services/trainingFiles';
import { dateLabel } from './TrainingRecords';

export function TrainingFilePreview({ file, onClose }: { file?: TrainingSystemFile; onClose: () => void }) {
  const [url, setUrl] = useState(''); const [error, setError] = useState(''); const [text, setText] = useState(''); const [kind, setKind] = useState('');
  useEffect(() => {
    let cancelled = false; let objectUrl = '';
    setUrl(''); setError(''); setText(''); setKind('');
    if (file) readTrainingFile(file.id).then(async blob => {
      const type = blob.type === 'application/pdf' || /\.pdf$/i.test(file.name) ? 'pdf' : /^image\/(png|jpeg|gif|webp)$/.test(blob.type) ? 'image' : /\.(txt|md|csv)$/i.test(file.name) ? 'text' : 'other';
      const content = type === 'text' ? (await blob.text()).slice(0, 100000) : '';
      if (!cancelled) { objectUrl = URL.createObjectURL(type === 'pdf' && blob.type !== 'application/pdf' ? new Blob([blob], { type: 'application/pdf' }) : blob); setUrl(objectUrl); setText(content); setKind(type); }
    }).catch(cause => { if (!cancelled) setError(cause.message); });
    return () => { cancelled = true; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [file?.id]);
  return <Modal title={file?.title} open={Boolean(file)} onCancel={onClose} footer={null} width={1000}>{error ? <Empty description={error} /> : !url ? <Empty description="正在读取资料" /> : kind === 'pdf' ? <iframe className="training-file-preview" src={url} title={file?.title} /> : kind === 'image' ? <img className="training-image-preview" src={url} alt={file?.title} /> : kind === 'text' ? <pre className="training-text-preview">{text}</pre> : <Empty description="此格式暂不支持在线预览，请下载查看" />}</Modal>;
}

export function SystemMaterialActions({ course }: { course: TrainingCourse }) {
  const { message } = App.useApp(); const [preview, setPreview] = useState<TrainingSystemFile>();
  const files = course.files?.filter(file => file.enabled) ?? [];
  const download = (file: TrainingSystemFile) => downloadTrainingFile(file.id, file.name).catch(cause => message.error(cause.message));
  return <><Button icon={<DownloadOutlined />} disabled={!files.length} onClick={async () => { for (const file of files) await download(file); }}>全部下载</Button><Popover trigger="click" placement="bottomRight" content={<div className="training-system-popover"><p className="training-muted">系统配套资料</p>{files.length ? files.map(file => <div className="training-file-row" key={file.id}><FilePdfOutlined /><strong title={file.title}>{file.title}</strong><Button type="link" onClick={() => setPreview(file)}>预览</Button><Button type="link" onClick={() => download(file)}>下载</Button></div>) : <Empty description="暂无系统资料" />}{course.materials && <p className="training-material">{course.materials}</p>}</div>}><Button>系统资料 · {files.length} <DownOutlined /></Button></Popover><TrainingFilePreview file={preview} onClose={() => setPreview(undefined)} /></>;
}

export function TrainingSystemMaterials({ state, course, commit, onBack }: { state: TrainingState; course: TrainingCourse; commit: (state: TrainingState) => boolean; onBack: () => void }) {
  const { message } = App.useApp(); const [busy, setBusy] = useState(false); const [preview, setPreview] = useState<TrainingSystemFile>(); const [editing, setEditing] = useState<TrainingSystemFile>(); const [form] = Form.useForm();
  const files = course.files ?? [];
  const save = (next: TrainingSystemFile[]) => commit({ ...state, courses: state.courses.map(item => item.id === course.id ? { ...item, files: next } : item) });
  const upload = async (file: File) => {
    if (file.size > 100 * 1024 * 1024 || !file.size) { message.error('请选择非空且不超过100MB的文件'); return Upload.LIST_IGNORE; }
    const id = crypto.randomUUID(); setBusy(true);
    try {
      await storeTrainingFile(id, file);
      if (save([...files, { id, name: file.name, title: file.name.replace(/\.[^.]+$/, ''), description: '', size: file.size, uploadedAt: new Date().toISOString(), enabled: true }])) message.success('资料已上传');
      else await deleteTrainingFile(id);
    } catch (cause) { message.error(cause instanceof Error ? cause.message : '上传失败'); } finally { setBusy(false); }
    return false;
  };
  const indexHint = '知识索引服务尚未接入';
  return <section className="training-system-materials"><header className="training-stage-header"><div><h2>培训资料</h2><p className="training-muted">{course.title} · 系统级课件手册，供学员查看与下载</p><p className="training-index-hint">知识索引尚未接入 · 共 {files.length} 份资料</p></div><Space><Button disabled={busy} onClick={onBack}>返回</Button><Tooltip title={indexHint}><Button disabled>重建知识索引</Button></Tooltip><Upload beforeUpload={upload} showUploadList={false} disabled={busy}><Button type="primary" loading={busy}>上传资料</Button></Upload></Space></header><div className="training-system-file-list">{course.materials && <div className="training-material"><strong>原有文本资料</strong><p>{course.materials}</p></div>}{files.length ? files.map(file => <article className="training-file-row training-system-file" key={file.id}><FileTextOutlined /><div className="training-file-description"><strong>{file.title}</strong><p>{(file.size / 1024 / 1024).toFixed(1)} MB · {file.description || file.name} · <Tag color={file.enabled ? 'success' : 'default'}>{file.enabled ? '启用' : '禁用'}</Tag>未建立索引</p></div><span className="training-muted">{dateLabel(file.uploadedAt)}</span><Space size={0} wrap><Button type="link" onClick={() => setPreview(file)}>预览</Button><Button type="link" onClick={() => downloadTrainingFile(file.id, file.name).catch(cause => message.error(cause.message))}>下载</Button><Button type="link" disabled={busy} onClick={() => { setEditing(file); form.setFieldsValue(file); }}>编辑</Button><Tooltip title={indexHint}><Button type="link" disabled>重建索引</Button></Tooltip><Button type="link" disabled={busy} onClick={() => save(files.map(item => item.id === file.id ? { ...item, enabled: !item.enabled } : item))}>{file.enabled ? '禁用' : '启用'}</Button><Popconfirm title="删除该资料？" onConfirm={async () => { if (save(files.filter(item => item.id !== file.id))) { try { await deleteTrainingFile(file.id); } catch (cause) { message.warning(cause instanceof Error ? cause.message : '文件清理失败'); } } }}><Button type="link" danger disabled={busy}>删除</Button></Popconfirm></Space></article>) : <Empty description="暂无系统资料，请上传资料" />}</div><TrainingFilePreview file={preview} onClose={() => setPreview(undefined)} /><Modal title="编辑资料" open={Boolean(editing)} onCancel={() => setEditing(undefined)} okText="保存" cancelText="取消" onOk={async () => { const values = await form.validateFields(); if (save(files.map(file => file.id === editing?.id ? { ...file, title: values.title.trim(), description: values.description || '' } : file))) setEditing(undefined); }}><Form form={form} layout="vertical"><Form.Item label="资料名称" name="title" rules={[{ required: true, whitespace: true }]}><Input maxLength={120} /></Form.Item><Form.Item label="资料说明" name="description"><Input.TextArea rows={3} maxLength={300} /></Form.Item></Form></Modal></section>;
}
