import React, { useRef, useState } from 'react';
import { Button, Descriptions, Modal, Space, Tag, message } from 'antd';
import { useApp } from '../../context/AppContext';
import { showDeleteConfirm } from '../common/Feedback';
import { WorkbenchFeedEditor, type WorkbenchFeedEditorHandle } from './WorkbenchFeedEditor';
import { DeleteOutlined, EditOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { deleteWorkbenchFeed, feedTypes, type WorkbenchFeed } from '../../services/workbenchFeeds';
import { sanitizeHtml } from '../../utils/sanitizeHtml';
import { feedModalStyles } from './feedModalStyles';

export const FeedDetail: React.FC<{ feed?: WorkbenchFeed; onClose: () => void; initiallyEditing?: boolean }> = ({ feed, onClose, initiallyEditing = false }) => {
  const { currentUser } = useApp();
  const canEdit = Boolean(feed && !feed.source && feed.authorId === currentUser.id);
  const [editing, setEditing] = useState(initiallyEditing);
  const editorRef = useRef<WorkbenchFeedEditorHandle>(null);
  const close = () => { if (editing) editorRef.current?.cancel(onClose); else onClose(); };
  const confirmDelete = () => {
    if (!feed || !canEdit) return;
    showDeleteConfirm({ title: `删除“${feed.title}”？`, content: '删除后无法恢复。', onOk: () => {
      try { deleteWorkbenchFeed(feed.id, currentUser.id); onClose(); message.success('已删除'); }
      catch (reason) { message.error(reason instanceof Error ? reason.message : '删除失败'); throw reason; }
    } });
  };
  const sourceUrl = (() => {
    if (!feed?.source?.detailUrl) return undefined;
    try { const url = new URL(feed.source.detailUrl, window.location.origin); return url.origin === window.location.origin && url.pathname.startsWith(import.meta.env.BASE_URL + 'app/') ? url.href : undefined; } catch { return undefined; }
  })();
  return <Modal className="workbench-feed-modal" aria-label={editing ? '编辑' : '信息详情'} width="min(1040px, calc(100vw - 32px))" centered styles={feedModalStyles} open={Boolean(feed)} onCancel={close} title={editing ? '编辑' : '信息详情'} destroyOnHidden footer={editing ? null : <Space><Button onClick={close}>关闭</Button>{canEdit && <><Button aria-label="编辑" icon={<EditOutlined/>} onClick={() => setEditing(true)}>编辑</Button><Button aria-label="删除" danger icon={<DeleteOutlined/>} onClick={confirmDelete}>删除</Button></>}</Space>}>
    {feed && (editing && canEdit ? <WorkbenchFeedEditor key={feed.id} ref={editorRef} feed={feed} onCancel={() => setEditing(false)} onSaved={() => setEditing(false)}/> : <div className="grid h-full min-h-0 grid-cols-1 gap-4 overflow-y-auto p-4 lg:grid-cols-[minmax(0,1fr)_280px] lg:gap-4 lg:p-6">
      <div className="min-w-0 space-y-6">
        <h2 className="break-words text-lg font-semibold text-[var(--text-primary)]">{feed.title}</h2>
        <p className="text-xs text-[var(--text-muted)]">{dayjs(feed.time).isValid() ? dayjs(feed.time).format('YYYY-MM-DD HH:mm') : feed.time}</p>
        <section><h3 className="mb-3 text-sm font-semibold">信息简介</h3>{feed.contentHtml ? <div className="workbench-feed-body break-words text-sm leading-6" dangerouslySetInnerHTML={{ __html: sanitizeHtml(feed.contentHtml, { richText: true }) }}/> : <p className="whitespace-pre-wrap break-words text-sm leading-6">{feed.content}</p>}</section>
        {sourceUrl && <Button href={sourceUrl} target="_blank" rel="noopener noreferrer">前往来源板块</Button>}
      </div>
      <aside className="min-w-0 lg:border-l lg:border-[var(--border-main)] lg:pl-4">
      <Descriptions column={1} size="small" items={[
        { key: 'type', label: '类型', children: feedTypes.find(type => type.key === feed.type)?.label },
        ...(feed.type === 'competitor' ? [{ key: 'news', label: '资讯类别', children: feed.newsType || '未分类' }] : []),
        { key: 'scope', label: '可见范围', children: feed.visibility === 'specified' ? '指定人员' : '全员' },
        { key: 'source', label: '来源', children: feed.source?.module || '工作台' },
        { key: 'author', label: '发布人', children: feed.author || '未记录发布人' },
        { key: 'time', label: '发布时间', children: dayjs(feed.time).isValid() ? dayjs(feed.time).format('YYYY-MM-DD HH:mm') : feed.time },
        ...[['product', '关联产品', feed.productName], ['version', '关联版本', feed.versionName], ['project', '关联项目', feed.projectName], ['customer', '客户', feed.type !== 'competitor' ? feed.customer : undefined], ['activity', '关联活动', feed.type !== 'competitor' ? feed.activityName : undefined]].filter(([, , value]) => value).map(([key, label, value]) => ({ key: key!, label, children: <Tag>{value}</Tag> })),
      ]}/>
      </aside>
    </div>)}
  </Modal>;
};
