import { useFeedReading } from './useFeedReading';
import { FeedDetail } from './FeedDetail';
import { WorkbenchFeedEditor, type WorkbenchFeedEditorHandle } from './WorkbenchFeedEditor';
import { FeedSummary } from './FeedSummary';
import { FEED_TAB_KEY, readWorkbenchTab, rememberWorkbenchTab } from '../../services/workbenchPreferences';
import { useEffect, useRef, useState } from 'react';
import { Alert, Button, Empty, Input, Modal, Pagination, Select, Space, Tabs } from 'antd';
import { ArrowLeftIcon, PlusIcon } from '@primer/octicons-react';
import dayjs from 'dayjs';
import { useApp } from '../../context/AppContext';
import { feedTypes, feedCategory, feedScopeLabel, type FeedType, type WorkbenchFeed } from '../../services/workbenchFeeds';
import { useWorkbenchFeeds } from './useWorkbenchFeeds';
import { feedModalStyles } from './feedModalStyles';

export function WorkbenchFeedsView({ onBack, editFeedId, backLabel }: { onBack: () => void; editFeedId?: string; backLabel?: string }) { return <FeedsPage onBack={onBack} editFeedId={editFeedId} backLabel={backLabel}/>; }
function FeedsPage({ onBack, editFeedId, backLabel = '返回我的待办' }: { onBack: () => void; editFeedId?: string; backLabel?: string }) {
  const { productLines, currentUser } = useApp();
  const { feeds, error, reload } = useWorkbenchFeeds();
  const reading = useFeedReading(currentUser.id, feeds);
  const [tab, setTab] = useState<FeedType>(() => { const saved = readWorkbenchTab(FEED_TAB_KEY); return saved === 'dynamic' ? 'dynamic' : saved ? 'square' : 'dynamic'; });
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<WorkbenchFeed>();
  const [productFilter, setProductFilter] = useState<string>();
  const editorRef = useRef<WorkbenchFeedEditorHandle>(null);
  const openedEditId = useRef<string>();
  const filtered = feeds.filter(row => feedCategory(row) === tab && (!productFilter || row.productId === productFilter) && [row.title, row.content, row.productName, row.versionName, row.projectName, row.type !== 'competitor' ? row.customer : undefined, row.activityName, row.newsType].some(value => value?.toLowerCase().includes(query.trim().toLowerCase())));
  useEffect(() => {
    const feed = feeds.find(row => row.id === editFeedId);
    if (!feed || !editFeedId || openedEditId.current === editFeedId || feed.source || feed.authorId !== currentUser.id) return;
    openedEditId.current = editFeedId;
    setTab(feedCategory(feed)); setSelected(feed);
  }, [feeds, editFeedId, currentUser.id]);
  const startCreate = () => setOpen(true);
  return <div className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-4"><Button type="text" icon={<ArrowLeftIcon/>} onClick={onBack}>{backLabel}</Button>{tab === 'square' && <Button type="primary" icon={<PlusIcon/>} disabled={Boolean(error)} onClick={startCreate}>新建</Button>}</div>
    {error && <Alert type="error" showIcon title={error} action={<Button onClick={reload}>重试</Button>}/>}
    <section className="rounded-xl border border-[var(--border-main)] bg-[var(--bg-surface)] p-4">
      <Tabs activeKey={tab} onTabClick={key => reading.browse(key as FeedType)} onChange={key => { setTab(key as FeedType); reading.browse(key as FeedType); rememberWorkbenchTab(FEED_TAB_KEY, key); setPage(1); }} items={feedTypes.map(type => ({ key: type.key, label: <span>{`${type.label} (${feeds.filter(row => feedCategory(row) === type.key).length})`}{reading.hasUpdates(type.key) && <i aria-hidden="true" title={`${type.label}有更新`} className="ml-1 inline-block h-1.5 w-1.5 rounded-full bg-[var(--danger)]"/>}</span> }))}/>
      <div className="mb-4 flex flex-wrap gap-4"><div className="w-[var(--workbench-query-width)] max-w-full"><Input.Search className="workbench-search" aria-label="搜索动态与评价" placeholder="搜索标题、信息简介或关联信息" allowClear value={query} onChange={event => { setQuery(event.target.value); setPage(1); }}/></div><Select aria-label="筛选关联产品" placeholder="全部产品" allowClear showSearch optionFilterProp="label" className="min-w-40" value={productFilter} onChange={value => { setProductFilter(value); setPage(1); }} options={productLines.map(row => ({ value: row.id, label: row.name }))}/></div>
      <div className="divide-y divide-[var(--border-main)]">
        {!error && !filtered.length && <Empty className="py-8" description="暂无动态与评价"/>}
        {filtered.slice((page - 1) * 10, page * 10).map(feed => <article key={feed.id} className="space-y-3 px-3 py-4">
          <h2 aria-label={feed.title} className="break-words text-base font-semibold"><button type="button" className="text-left text-[var(--primary)] hover:underline focus-visible:outline focus-visible:outline-[var(--primary)] active:opacity-70" onClick={() => setSelected(feed)}>{feed.title}</button>{reading.isNew(feed.id) && <span aria-label="新消息" className="ml-2 text-xs text-[var(--danger)]">新</span>}</h2>
          <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-[var(--text-muted)]"><span>{dayjs(feed.time).isValid() ? dayjs(feed.time).format('YYYY-MM-DD HH:mm') : feed.time}</span><span>{feed.author || '未记录发布人'}</span><span>来源：{feed.source?.module || '手动发布'}</span><span>范围：{feedScopeLabel(feed)}</span></div>
          <Space wrap className="text-sm text-[var(--text-muted)]">{feed.productName && <span>产品：{feed.productName}</span>}{feed.versionName && <span>版本：{feed.versionName}</span>}{feed.projectName && <span>项目：{feed.projectName}</span>}{feed.customer && <span>客户：{feed.customer}</span>}{feed.tags?.length ? <span>信息标签：{feed.tags.join('、')}</span> : null}{feed.activityName && <span>活动：{feed.activityName}</span>}</Space>
          <FeedSummary content={feed.content}/>
        </article>)}
      </div>
      <div className="flex justify-end pt-4"><Pagination current={page} pageSize={10} total={filtered.length} showSizeChanger={false} onChange={setPage} hideOnSinglePage/></div>
    </section>
    <FeedDetail key={selected?.id || 'closed'} feed={selected ? feeds.find(feed => feed.id === selected.id) : undefined} onClose={() => setSelected(undefined)} initiallyEditing={Boolean(editFeedId && selected?.id === editFeedId)}/>
    <Modal className="workbench-feed-modal" aria-label="新建" width="min(1040px, calc(100vw - 32px))" centered styles={feedModalStyles} open={open} title="新建" footer={null} onCancel={() => editorRef.current?.cancel(() => setOpen(false))} destroyOnHidden>
      {open && <WorkbenchFeedEditor ref={editorRef} initialType={tab} onCancel={() => setOpen(false)} onSaved={feed => { setTab('square'); rememberWorkbenchTab(FEED_TAB_KEY, 'square'); setQuery(''); setProductFilter(undefined); setPage(1); setOpen(false); }}/>}
    </Modal>
  </div>;
}
