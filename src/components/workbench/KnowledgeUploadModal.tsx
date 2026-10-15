import React, { useRef, useState } from 'react';
import { Alert, Button, Form, Input, Modal, Upload } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import type { KnowledgeDoc } from '../../types';
import { readKnowledgeAttachment, type KnowledgeAttachment } from '../../services/knowledgeAttachments';

interface KnowledgeUploadModalProps {
  mode?: 'library' | 'review';
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (doc: Partial<KnowledgeDoc>) => void | boolean | Promise<void | boolean>;
}

export const KnowledgeUploadModal: React.FC<KnowledgeUploadModalProps> = ({ mode = 'library', isOpen, onClose, onSubmit }) => {
  const [form] = Form.useForm();
  const [attachments, setAttachments] = useState<KnowledgeAttachment[]>([]);
  const [saving, setBusy] = useState(false);
  const [pending, setPending] = useState(0);
  const attachmentRef = useRef<KnowledgeAttachment[]>([]);
  const busy = saving || pending > 0;
  const updateAttachments = (rows: KnowledgeAttachment[]) => { attachmentRef.current = rows; setAttachments(rows); };
  const [error, setError] = useState('');
  const submit = async () => {
    const values = await form.validateFields().catch(() => null);
    if (!values) return;
    setBusy(true); setError('');
    try {
      const saved = await onSubmit({ title: values.title.trim(), summary: values.summary.trim(), linkUrl: values.linkUrl?.trim() || undefined, attachments, isMine: true, isFollowed: true });
      if (saved !== false) { form.resetFields(); updateAttachments([]); onClose(); }
    } catch (cause) { setError(cause instanceof Error ? cause.message : '保存失败，请重试'); }
    finally { setBusy(false); }
  };
  return <Modal open={isOpen} onCancel={() => { if (!busy) onClose(); }} title="新建知识沉淀" width={720} closable={!busy} maskClosable={!busy}
    footer={<><Button disabled={busy} onClick={onClose}>取消</Button><Button type="primary" loading={busy} onClick={() => void submit()}>{mode === 'review' ? '确认添加' : '确认发布沉淀'}</Button></>}>
    <Form form={form} layout="vertical" disabled={busy}>
      <Form.Item name="title" label="标题" rules={[{ required: true, whitespace: true, message: '请输入标题' }]}><Input maxLength={255}/></Form.Item>
      <Form.Item name="summary" label="内容摘要" rules={[{ required: true, whitespace: true, message: '请输入内容摘要' }]}><Input.TextArea rows={3} maxLength={10000}/></Form.Item>
      <Form.Item name="linkUrl" label="链接地址" rules={[{ validator: (_, value) => !value?.trim() || /^https?:\/\/[^\s]+$/i.test(value.trim()) ? Promise.resolve() : Promise.reject(new Error('请输入 http 或 https 链接')) }]}><Input placeholder="选填"/></Form.Item>
      <Form.Item label="附件" extra="支持多个附件，总大小不超过 1MB">
        <Upload multiple disabled={busy} fileList={attachments.map(file => ({ uid: file.id, name: file.name, status: 'done' }))}
          onRemove={file => { updateAttachments(attachmentRef.current.filter(row => row.id !== file.uid)); }}
          beforeUpload={async file => {
            setPending(count => count + 1); setError('');
            try {
              const attachment = await readKnowledgeAttachment(file);
              const rows = attachmentRef.current;
              if (rows.reduce((sum, row) => sum + row.size, 0) + attachment.size > 1024 * 1024) setError('附件总大小不能超过 1MB');
              else updateAttachments([...rows, attachment]);
            } catch (cause) { setError(cause instanceof Error ? cause.message : '读取附件失败'); }
            finally { setPending(count => count - 1); }
            return Upload.LIST_IGNORE;
          }}><Button icon={<UploadOutlined/>}>添加附件</Button></Upload>
      </Form.Item>
      {error && <Alert type="error" showIcon title={error}/>}
    </Form>
  </Modal>;
};
