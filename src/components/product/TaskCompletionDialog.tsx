import React, { useRef, useState } from 'react';
import { Alert, Button, Form, Input, InputNumber, Modal, Upload } from 'antd';

import { PaperClipOutlined } from '@ant-design/icons';
import type { TaskCompletionReview } from '../../types';

type SaveCompletion = (hours: number, reason: string, review: TaskCompletionReview) => Promise<unknown>;

export const validCompletionHours = (value: number | null): value is number =>
  value !== null && Number.isFinite(value) && value >= 0 && value <= 99999999.99 && Math.abs(value * 100 - Math.round(value * 100)) < 1e-6;

const CompletionFields: React.FC<{ save: SaveCompletion; close: () => void; reasonRequired: boolean }> = ({ save, close, reasonRequired }) => {
  const [hours, setHours] = useState<number | null>(null);
  const [review, setReview] = useState<TaskCompletionReview>({ content: '', media: [] });
  const pending = useRef(0);
  const saving = useRef(false);
  const [reading, setReading] = useState(0);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const submit = async () => {
    if (saving.current || pending.current) return;
    if (!validCompletionHours(hours)) { setError('请填写非负且最多两位小数的完成工时'); return; }
    if (reasonRequired && !reason.trim()) { setError('请填写状态变更原因'); return; }
    saving.current = true; setBusy(true); setError('');
    try { await save(hours, reason.trim(), { ...review, content: review.content.trim() }); close(); }
    catch (failure) { setError(failure instanceof Error ? failure.message : '保存失败，请重试'); }
    finally { saving.current = false; setBusy(false); }
  };
  const readAttachment = (file: File) => {
    pending.current += 1; setReading(pending.current);
    const reader = new FileReader();
    reader.onload = () => setReview((current) => ({ ...current, media: [...current.media, { id: crypto.randomUUID(), name: file.name, type: file.type.startsWith('image/') ? 'image' : 'file', dataUrl: String(reader.result).replace(/^data:;base64,/, 'data:application/octet-stream;base64,'), size: file.size, mimeType: file.type || 'application/octet-stream' }] }));
    reader.onerror = () => setError(`附件“${file.name}”读取失败，请重新选择`);
    reader.onloadend = () => { pending.current -= 1; setReading(pending.current); };
    reader.readAsDataURL(file);
    return false;
  };
  return <Form layout="vertical" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
    <Form.Item label="完成工时（小时）" required>
      <InputNumber autoFocus disabled={busy} className="w-full" min={0} value={hours} placeholder="请输入完成工时，最多两位小数" onChange={setHours} />
    </Form.Item>
    <Form.Item label="复盘总结">
      <Input.TextArea aria-label="复盘总结" disabled={busy} autoSize={{ minRows: 4, maxRows: 10 }} maxLength={10000} showCount value={review.content} placeholder="选填，记录完成情况、问题与改进建议" onChange={(event) => setReview((current) => ({ ...current, content: event.target.value }))} />
    </Form.Item>
    <Form.Item label="复盘附件"><Upload multiple disabled={busy} beforeUpload={readAttachment} fileList={review.media.map((item) => ({ uid: item.id, name: item.name, status: 'done' }))} onRemove={(file) => { if (saving.current) return false; setReview((current) => ({ ...current, media: current.media.filter((item) => item.id !== file.uid) })); }}><Button disabled={busy} loading={reading > 0} icon={<PaperClipOutlined />}>添加附件</Button></Upload></Form.Item>
    {reasonRequired && <Form.Item label="状态变更原因" required><Input.TextArea disabled={busy} rows={4} maxLength={2000} value={reason} placeholder="请输入状态变更原因" onChange={(event) => setReason(event.target.value)} /></Form.Item>}
    <Alert type="info" showIcon title="确认后一起保存实际工时、复盘总结及附件，并将任务标记为已完成。取消不会修改任务。" />
    {error && <Alert className="mt-3" type="error" showIcon title={error} />}
    <div className="mt-4 flex justify-end gap-2"><Button disabled={busy || reading > 0} onClick={close}>取消</Button><Button type="primary" loading={busy} disabled={reading > 0} onClick={() => void submit()}>确认完成</Button></div>
  </Form>;
};

export function openTaskCompletionDialog(save: SaveCompletion, reasonRequired = false) {
  const dialog = Modal.confirm({
    title: '完成任务', width: 'min(720px, calc(100vw - 32px))', centered: true, footer: null, mask: { closable: false }, closable: false, keyboard: false,
    content: <CompletionFields reasonRequired={reasonRequired} save={save} close={() => dialog.destroy()} />
  });
  return dialog;
}
