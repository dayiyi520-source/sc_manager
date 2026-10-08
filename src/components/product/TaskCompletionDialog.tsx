import React, { useState } from 'react';
import { Alert, Button, Form, Input, InputNumber, Modal } from 'antd';

export const validCompletionHours = (value: number | null): value is number =>
  value !== null && Number.isFinite(value) && value >= 0 && value <= 99999999.99 && Math.abs(value * 100 - Math.round(value * 100)) < 1e-6;

const CompletionFields: React.FC<{ save: (hours: number, reason: string) => Promise<unknown>; close: () => void; reasonRequired: boolean }> = ({ save, close, reasonRequired }) => {
  const [hours, setHours] = useState<number | null>(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const submit = async () => {
    if (!validCompletionHours(hours)) { setError('请填写非负且最多两位小数的完成工时'); return; }
    if (reasonRequired && !reason.trim()) { setError('请填写状态变更原因'); return; }
    setBusy(true); setError('');
    try { await save(hours, reason.trim()); close(); }
    catch (failure) { setError(failure instanceof Error ? failure.message : '保存失败，请重试'); }
    finally { setBusy(false); }
  };
  return <Form layout="vertical">
    <Form.Item label="完成工时（小时）" required>
      <InputNumber autoFocus disabled={busy} className="w-full" min={0} value={hours} placeholder="请输入完成工时，最多两位小数" onChange={setHours} />
    </Form.Item>
    {reasonRequired && <Form.Item label="状态变更原因" required><Input.TextArea disabled={busy} rows={4} maxLength={2000} value={reason} placeholder="请输入状态变更原因" onChange={(event) => setReason(event.target.value)} /></Form.Item>}
    <Alert type="info" showIcon title="确认后保存实际工时并将任务标记为已完成。取消不会修改任务。" />
    {error && <Alert className="mt-3" type="error" showIcon title={error} />}
    <div className="mt-4 flex justify-end gap-2"><Button disabled={busy} onClick={close}>取消</Button><Button type="primary" loading={busy} onClick={() => void submit()}>确认完成</Button></div>
  </Form>;
};

export function openTaskCompletionDialog(save: (hours: number, reason: string) => Promise<unknown>, reasonRequired = false) {
  const dialog = Modal.confirm({
    title: '完成任务', footer: null, mask: { closable: false }, closable: false, keyboard: false,
    content: <CompletionFields reasonRequired={reasonRequired} save={save} close={() => dialog.destroy()} />
  });
  return dialog;
}
