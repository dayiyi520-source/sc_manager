import React, { useEffect, useRef, useState } from 'react';
import { Alert, Button, Form, Input, Modal, Spin, Upload, message } from 'antd';
import { PaperClipOutlined } from '@ant-design/icons';
import { productRepository, type WorkItemReview } from '../../services/productRepository';
import type { RequirementMedia } from '../../types';
import { sanitizeHtml } from '../../utils/sanitizeHtml';
import { LazyRichTextEditor } from './LazyRichTextEditor';

export type TaskReviewTarget = { id: string; productLineId: string; title: string };

export const TaskReviewDialog: React.FC<{ task: TaskReviewTarget; onClose: () => void; onSaved?: () => void }> = ({ task, onClose, onSaved }) => {
  const [review, setReview] = useState<WorkItemReview>({ title: `${task.title}复盘总结`, content: '', contentHtml: '', media: [], revision: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [saving, setSaving] = useState(false);
  const [reading, setReading] = useState(0);
  const pending = useRef(0);
  const savingRef = useRef(false);
  const mounted = useRef(true);
  const editor = useRef<HTMLDivElement>(null);
  const [messageApi, contextHolder] = message.useMessage();
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    productRepository.workItemReview(task.productLineId, task.id).then((saved) => {
      if (active) setReview(saved || { title: `${task.title}复盘总结`, content: '', contentHtml: '', media: [], revision: 0 });
    }).catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : '复盘总结加载失败'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [task.id, task.productLineId, task.title, attempt]);

  const save = async () => {
    if (loading || error || pending.current || savingRef.current) return;
    if (!review.title.trim()) { messageApi.warning('请输入标题'); return; }
    savingRef.current = true;
    setSaving(true);
    try {
      const saved = await productRepository.saveWorkItemReview(task.productLineId, task.id, { ...review, title: review.title.trim(), contentHtml: sanitizeHtml(review.contentHtml) });
      setReview(saved);
      messageApi.success('复盘总结已保存');
      onSaved?.();
      onClose();
    } catch (cause) { messageApi.error(cause instanceof Error ? cause.message : '保存失败，请重试'); }
    finally { savingRef.current = false; if (mounted.current) setSaving(false); }
  };
  const readAttachment = (file: File) => {
    pending.current += 1;
    setReading(pending.current);
    const reader = new FileReader();
    reader.onload = () => {
      if (!mounted.current) return;
      const media: RequirementMedia = { id: crypto.randomUUID(), name: file.name, type: file.type.startsWith('image/') ? 'image' : 'file', dataUrl: String(reader.result), size: file.size, mimeType: file.type };
      setReview((current) => ({ ...current, media: [...current.media, media] }));
    };
    reader.onerror = () => { if (mounted.current) messageApi.error(`附件“${file.name}”读取失败，请重新选择`); };
    reader.onloadend = () => { pending.current -= 1; if (mounted.current) setReading(pending.current); };
    reader.readAsDataURL(file);
    return false;
  };
  return <Modal title="复盘总结" open width={800} onCancel={() => { if (!savingRef.current && !pending.current) onClose(); }} onOk={() => void save()} okText="保存" cancelText="取消" confirmLoading={saving} okButtonProps={{ disabled: loading || Boolean(error) || reading > 0 }} cancelButtonProps={{ disabled: saving || reading > 0 }} closable={!saving && !reading} mask={{ closable: false }} destroyOnHidden>
    {contextHolder}
    {loading ? <div className="flex min-h-40 items-center justify-center"><Spin /></div> : error ? <Alert type="error" showIcon title="复盘总结加载失败" description={error} action={<Button onClick={() => setAttempt((value) => value + 1)}>重试</Button>} /> : <Form layout="vertical" className="pt-3">
      <Form.Item label="标题" required><Input aria-label="复盘总结标题" value={review.title} disabled={saving} onChange={(event) => setReview((current) => ({ ...current, title: event.target.value }))} /></Form.Item>
      <Form.Item label="复盘内容"><LazyRichTextEditor key={`${task.id}-${attempt}`} editor={editor} size="work-order" value={review.content} htmlValue={review.contentHtml} readOnly={saving} onInput={(content, contentHtml) => setReview((current) => ({ ...current, content, contentHtml }))} placeholder="填写复盘总结，支持图片和文字排版" /></Form.Item>
      <Form.Item label="附件"><Upload multiple disabled={saving} beforeUpload={readAttachment} fileList={review.media.map((item) => ({ uid: item.id, name: item.name, status: 'done', url: item.dataUrl }))} onRemove={(file) => { if (saving) return false; setReview((current) => ({ ...current, media: current.media.filter((item) => item.id !== file.uid) })); }}><Button disabled={saving} loading={reading > 0} icon={<PaperClipOutlined />}>添加附件</Button></Upload></Form.Item>
    </Form>}
  </Modal>;
};
