import { useRef, useState } from 'react';
import { Alert, Button, Form, Input, Modal, Upload } from 'antd';
import { UploadIcon } from '@primer/octicons-react';
import { readKnowledgeAttachment, REVIEW_KNOWLEDGE_ATTACHMENT_LIMIT, saveKnowledgeValidation, type KnowledgeAttachment } from '../../../services/knowledgeAttachments';
import { reviewKnowledgeLink, validateReviewKnowledge, type ReviewKnowledgeDraft } from '../../../services/reviewKnowledge';

export function ReviewKnowledgeModal({ onClose, onSubmit }: {
  onClose: () => void;
  onSubmit: (entry: ReviewKnowledgeDraft) => void | boolean | Promise<void | boolean>;
}) {
  const [form] = Form.useForm<ReviewKnowledgeDraft>();
  const [attachments, setAttachments] = useState<KnowledgeAttachment[]>([]);
  const attachmentRef = useRef<KnowledgeAttachment[]>([]);
  const pendingRef = useRef(0);
  const locked = useRef(false);
  const [pending, setPending] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const busy = saving || pending > 0;
  const updateAttachments = (rows: KnowledgeAttachment[]) => { attachmentRef.current = rows; setAttachments(rows); };
  const submit = async () => {
    if (locked.current || pendingRef.current) return;
    locked.current = true;
    try {
      const values = await form.validateFields().catch(() => undefined);
      if (!values) return;
      const entry: ReviewKnowledgeDraft = { formatVersion: 2, title: values.title.trim(), scenarioAndPain: values.scenarioAndPain!.trim(), actionsAndConclusion: values.actionsAndConclusion!.trim(), reusePlan: values.reusePlan?.trim() || undefined, linkUrl: values.linkUrl?.trim() || undefined, attachments: [...attachmentRef.current] };
      validateReviewKnowledge(entry);
      setSaving(true); setError('');
      if (await onSubmit(entry) === false) setError('添加失败，请重试，已填写内容已保留');
      else onClose();
    } catch (cause) { setError(cause instanceof Error ? cause.message : '添加失败，请重试'); }
    finally { locked.current = false; setSaving(false); }
  };
  const close = () => { if (!locked.current && !pendingRef.current) onClose(); };
  return <Modal open title="新建知识沉淀" onCancel={close} closable={!busy} mask={{ closable: !busy }} keyboard={!busy}
    footer={<><Button disabled={busy} onClick={close}>取消</Button><Button type="primary" loading={busy} disabled={busy} onClick={() => void submit()}>确认添加</Button></>}>
    <Form form={form} layout="vertical" disabled={busy}>
      <Form.Item name="title" label="标题" rules={[{ required: true, whitespace: true, message: '请输入标题' }, { max: 50, message: '标题不能超过50字' }]}><Input placeholder="一句话概括业务场景，用于知识库检索" maxLength={50} showCount/></Form.Item>
      <Form.Item name="scenarioAndPain" label="场景与痛点" rules={[{ required: true, whitespace: true, message: '请输入场景与痛点' }, { max: 500, message: '场景与痛点不能超过500字' }]}><Input.TextArea placeholder="简述工作背景、目标，以及遇到的问题 / 卡点" maxLength={500} showCount autoSize={{ minRows: 3, maxRows: 5 }}/></Form.Item>
      <Form.Item name="actionsAndConclusion" label="执行动作与复盘结论" rules={[{ required: true, whitespace: true, message: '请输入执行动作与复盘结论' }, { max: 500, message: '执行动作与复盘结论不能超过500字' }]}><Input.TextArea placeholder="描述本次处理方式，复盘提炼可复用的优化做法" maxLength={500} showCount autoSize={{ minRows: 3, maxRows: 5 }}/></Form.Item>
      <Form.Item name="reusePlan" label="复用范围与推广计划" rules={[{ max: 500, message: '复用范围与推广计划不能超过500字' }]}><Input.TextArea placeholder="写明适用场景，以及经验如何内部传播落地" maxLength={500} showCount autoSize={{ minRows: 3, maxRows: 5 }}/></Form.Item>
      <Form.Item name="linkUrl" label="关联资料链接" rules={[{ validator: (_, value) => !value?.trim() || reviewKnowledgeLink(value) ? Promise.resolve() : Promise.reject(new Error('请输入有效的 http 或 https 链接')) }]}><Input placeholder="https://example.com"/></Form.Item>
      <Form.Item label="附件" extra="支持多个附件，总大小不超过5MB。">
        <Upload multiple disabled={busy} fileList={attachments.map(file => ({ uid: file.id, name: file.name, status: 'done' as const }))}
          onRemove={file => { if (locked.current || pendingRef.current) return false; updateAttachments(attachmentRef.current.filter(row => row.id !== file.uid)); }}
          beforeUpload={async file => {
            pendingRef.current += 1; setPending(pendingRef.current); setError('');
            try {
              const attachment = await readKnowledgeAttachment(file, REVIEW_KNOWLEDGE_ATTACHMENT_LIMIT);
              const next = [...attachmentRef.current, attachment];
              saveKnowledgeValidation(next, REVIEW_KNOWLEDGE_ATTACHMENT_LIMIT);
              updateAttachments(next);
            } catch (cause) { setError(cause instanceof Error ? cause.message : '读取附件失败，请重新选择'); }
            finally { pendingRef.current -= 1; setPending(pendingRef.current); }
            return Upload.LIST_IGNORE;
          }}><Button disabled={busy} icon={<UploadIcon/>}>添加附件</Button></Upload>
      </Form.Item>
      {error && <Alert type="error" showIcon title={error}/>}
    </Form>
  </Modal>;
}
