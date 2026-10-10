import React, { useEffect, useRef, useState } from 'react';
import { Button, Input } from 'antd';
import { Modal } from '../common/UIComponents';
import type { RequirementEvent } from '../../types';

export const discussionComments = (events: RequirementEvent[]) => events
  .filter((event) => event.eventType === '发表评论' && typeof event.metadata?.commentContent === 'string')
  .map((event) => ({ id: event.id, author: event.operatorName, content: String(event.metadata!.commentContent), createdAt: event.createdAt }))
  .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

type Props = {
  events: RequirementEvent[];
  formatTime: (value: string) => string;
  open: boolean;
  targetId: string;
  onOpen: () => void;
  onClose: () => void;
  onSubmit: (content: string, requestId: string) => Promise<void>;
};

export const WorkOrderDiscussion: React.FC<Props> = ({ events, formatTime, open, targetId, onOpen, onClose, onSubmit }) => {
  const [draft, setDraft] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const requestId = useRef('');
  const focusedComment = useRef<HTMLElement>(null);
  const comments = discussionComments(events);
  useEffect(() => {
    if (!open || !targetId) return;
    const frame = requestAnimationFrame(() => {
      focusedComment.current?.scrollIntoView({ block: 'nearest' });
      focusedComment.current?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [open, targetId]);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (submitting || !draft.trim()) return;
    setSubmitting(true);
    requestId.current ||= crypto.randomUUID();
    try {
      await onSubmit(draft.trim(), requestId.current);
      setDraft('');
      requestId.current = '';
    } catch {
      // 失败提示由事项详情统一处理，保留草稿供重试。
    } finally {
      setSubmitting(false);
    }
  };
  const composer = (label: string) => <form onSubmit={submit} className="space-y-3">
    <Input.TextArea aria-label={label} rows={3} maxLength={1000} showCount value={draft} disabled={submitting} placeholder="围绕本事项补充信息、提出问题或交流处理建议" onChange={(event) => { setDraft(event.target.value); requestId.current = ''; }} />
    <div className="flex justify-end"><Button aria-label="发表评论" type="primary" htmlType="submit" loading={submitting} disabled={submitting || !draft.trim()}>发表评论</Button></div>
  </form>;
  const card = (comment: typeof comments[number], full: boolean) => <article key={comment.id} ref={full && comment.id === targetId ? focusedComment : undefined} tabIndex={full && comment.id === targetId ? -1 : undefined} aria-label={`评论：${comment.author}`} className={`rounded-lg border bg-[var(--bg-card)] p-3 ${full && comment.id === targetId ? 'border-[var(--primary)]' : 'border-[var(--border-main)]'}`}>
    <div className="mb-2 flex items-center justify-between gap-3"><span className="text-sm font-medium text-[var(--text-primary)]">{comment.author}</span><time className="text-xs text-[var(--text-muted)]">{formatTime(comment.createdAt)}</time></div>
    <p className={`whitespace-pre-wrap break-words text-sm text-[var(--text-body)] ${full ? '' : 'line-clamp-4'}`}>{comment.content}</p>
  </article>;
  return <>
    <section aria-label="事项讨论" className="space-y-4 border-t border-[var(--border-main)] pt-4">
      <div className="flex items-center justify-between gap-3"><h3 className="text-sm font-semibold text-[var(--text-primary)]">讨论（{comments.length}）</h3>{comments.length > 0 && <Button type="link" onClick={onOpen}>查看全部评论</Button>}</div>
      {composer('评论内容')}
      <div aria-label="最近评论" className="space-y-3">{comments.length ? comments.slice(0, 3).map((comment) => card(comment, false)) : <p className="text-xs text-[var(--text-muted)]">暂无评论，欢迎补充信息或交流建议。</p>}</div>
    </section>
    <Modal isOpen={open} onClose={onClose} title={`全部评论（${comments.length}）`} maxWidth="2xl">
      <div className="space-y-4">
        {composer('全部评论中的评论内容')}
        <div aria-label="全部评论列表" className="max-h-[50vh] space-y-3 overflow-y-auto overscroll-contain">{comments.length ? comments.map((comment) => card(comment, true)) : <p className="text-xs text-[var(--text-muted)]">暂无评论</p>}</div>
      </div>
    </Modal>
  </>;
};
