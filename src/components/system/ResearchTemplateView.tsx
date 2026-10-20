import React, { useState } from 'react';
import { Alert, Button, Empty, Popconfirm, Spin } from 'antd';
import { DeleteOutlined, UndoOutlined } from '@ant-design/icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { WorkItemModuleView } from './WorkItemModuleView';
import { NotificationSettingsPanel } from '../product/NotificationSettingsPanel';
import { WorkItemCategoryPanel } from './WorkItemCategoryPanel';
import { productRepository, type ArchivedProductLine, type ArchivedTask } from '../../services/productRepository';
import { useApp } from '../../context/AppContext';

type Section = 'dictionary' | 'work-items' | 'notifications' | 'archive' | 'archived-tasks';
const SECTIONS: Array<{ id: Section; label: string }> = [
  { id: 'dictionary', label: '工作项分类' }, { id: 'work-items', label: '工作项模版' },
  { id: 'notifications', label: '通知与提醒' },
  { id: 'archive', label: '归档产品' }, { id: 'archived-tasks', label: '归档任务' }
];

const ArchivedTasksPanel = () => {
  const { addToast } = useApp();
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ['archived-tasks'], queryFn: productRepository.archivedTasks, retry: false });
  const [operatingId, setOperatingId] = useState('');
  const operate = async (item: ArchivedTask, action: 'restore' | 'purge') => {
    setOperatingId(`${item.category}:${item.id}`);
    try {
      if (action === 'restore') await productRepository.restoreArchivedTask(item.category, item.id, item.revision);
      else await productRepository.purgeArchivedTask(item.category, item.id, item.revision);
      await query.refetch();
      if (action === 'restore') await Promise.all(['unified-task-page', 'requirements', 'design-tasks', 'product-dev-tasks', 'product-bugs', 'presales-tasks', 'delivery-tasks', 'ops-tasks'].map((key) => queryClient.invalidateQueries({ queryKey: [key] })));
      addToast('success', action === 'restore' ? '任务已恢复' : '任务已彻底删除');
    } catch (error) {
      addToast('error', action === 'restore' ? '恢复失败' : '彻底删除失败', error instanceof Error ? error.message : '请稍后重试');
    } finally { setOperatingId(''); }
  };
  return <div className="space-y-4 text-xs">
    <h3 className="text-sm font-bold text-[var(--text-primary)]">归档任务</h3>
    {query.isError && <Alert type="error" showIcon message="归档任务加载失败" action={<Button onClick={() => void query.refetch()}>重试</Button>} />}
    {query.isPending ? <div className="flex min-h-40 items-center justify-center"><Spin /></div> : !query.isError && <div className="overflow-x-auto border border-[var(--border-main)]"><div className="min-w-[900px]">
      <div className="grid grid-cols-[minmax(220px,2fr)_110px_minmax(140px,1fr)_110px_170px_150px] gap-3 border-b border-[var(--border-main)] bg-[var(--bg-surface-soft)] px-4 py-3 text-[var(--text-muted)]"><span>标题</span><span>任务类型</span><span>来源归属</span><span>操作人</span><span>操作时间</span><span className="text-right">操作</span></div>
      {query.data?.length ? query.data.map((item) => <div key={`${item.category}:${item.id}`} className="grid grid-cols-[minmax(220px,2fr)_110px_minmax(140px,1fr)_110px_170px_150px] items-center gap-3 border-b border-[var(--border-main)] px-4 py-3 text-[var(--text-body)] last:border-0"><span className="min-w-0 truncate font-medium text-[var(--text-primary)]" title={item.title}>{item.title}</span><span>{item.taskType}</span><span className="truncate" title={item.sourceName}>{item.sourceName}</span><span className="truncate" title={item.operatorName}>{item.operatorName}</span><span>{archiveDate(item.operatedAt)}</span><span className="flex justify-end gap-1"><Popconfirm title="恢复任务" description={`确定恢复“${item.title}”吗？`} okText="恢复" cancelText="取消" onConfirm={() => operate(item, 'restore')}><Button type="link" size="small" loading={operatingId === `${item.category}:${item.id}`} icon={<UndoOutlined />}>恢复</Button></Popconfirm><Popconfirm title="彻底删除" description={`确定彻底删除“${item.title}”吗？此操作不可恢复。`} okText="删除" cancelText="取消" okButtonProps={{ danger: true }} onConfirm={() => operate(item, 'purge')}><Button type="link" danger size="small" loading={operatingId === `${item.category}:${item.id}`} icon={<DeleteOutlined />}>删除</Button></Popconfirm></span></div>) : <div className="py-8"><Empty description="暂无归档任务" /></div>}
    </div></div>}
  </div>;
};

const archiveDate = (value?: string) => value ? new Date(value).toLocaleString('zh-CN', { hour12: false }) : '—';
const ArchivePanel = () => {
  const { addToast } = useApp();
  const queryClient = useQueryClient();
  const archivedQuery = useQuery({ queryKey: ['archived-product-lines'], queryFn: productRepository.archivedProductLines, retry: false });
  const [operatingId, setOperatingId] = useState('');
  const restore = async (item: ArchivedProductLine) => {
    setOperatingId(item.id);
    try {
      await productRepository.restoreProductLine(item.id);
      await Promise.all([archivedQuery.refetch(), queryClient.invalidateQueries({ queryKey: ['product-lines'] })]);
      addToast('success', '产品已取消归档');
    } catch (error) {
      addToast('error', '取消归档失败', error instanceof Error ? error.message : '请稍后重试');
    } finally {
      setOperatingId('');
    }
  };
  const remove = async (item: ArchivedProductLine) => {
    setOperatingId(item.id);
    try {
      await productRepository.deleteProductLine(item.id);
      await archivedQuery.refetch();
      addToast('success', '归档产品已删除');
    } catch (error) {
      addToast('error', '产品删除失败', error instanceof Error ? error.message : '请稍后重试');
    } finally {
      setOperatingId('');
    }
  };
  const items = archivedQuery.data || [];
  return <div className="w-full space-y-4 text-xs"><div><h3 className="text-sm font-bold text-[var(--text-primary)]">归档产品</h3><p className="mt-1 text-[var(--text-muted)]">统一查看已归档产品，并支持取消归档或删除。</p></div>{archivedQuery.isError && <Alert type="error" showIcon message="归档产品加载失败" description={archivedQuery.error instanceof Error ? archivedQuery.error.message : '请稍后重试。'} action={<Button onClick={() => archivedQuery.refetch()}>重试</Button>} />}{archivedQuery.isLoading ? <div className="flex min-h-40 items-center justify-center"><Spin /></div> : !archivedQuery.isError && <div className="overflow-x-auto rounded-md border border-[var(--border-main)]"><div className="min-w-[860px]"><div className="grid grid-cols-[minmax(160px,1.5fr)_140px_140px_180px_140px_150px] gap-3 border-b border-[var(--border-main)] bg-[var(--bg-surface-soft)] px-4 py-3 text-[var(--text-muted)]"><span>产品名称</span><span>编号</span><span>负责人</span><span>归档时间</span><span>操作人</span><span className="text-right">操作</span></div>{items.map((item) => <div key={item.id} className="grid grid-cols-[minmax(160px,1.5fr)_140px_140px_180px_140px_150px] items-center gap-3 border-b border-[var(--border-main)] px-4 py-3 last:border-0"><span className="truncate font-medium text-[var(--text-primary)]" title={item.name}>{item.name}</span><span className="truncate font-mono text-[var(--text-body)]" title={item.code}>{item.code}</span><span className="truncate text-[var(--text-body)]" title={item.ownerName || '未设置'}>{item.ownerName || '未设置'}</span><span className="text-[var(--text-muted)]">{archiveDate(item.archivedAt)}</span><span className="truncate text-[var(--text-body)]" title={item.archivedByName || '未记录'}>{item.archivedByName || '未记录'}</span><span className="flex justify-end gap-1"><Popconfirm title="取消归档" description={`确定恢复“${item.name}”吗？`} okText="取消归档" cancelText="返回" onConfirm={() => restore(item)}><Button type="link" size="small" loading={operatingId === item.id} icon={<UndoOutlined />}>取消归档</Button></Popconfirm><Popconfirm title="删除归档产品" description={`确定删除“${item.name}”吗？删除后无法从界面恢复。`} okText="删除" cancelText="取消" okButtonProps={{ danger: true }} onConfirm={() => remove(item)}><Button type="link" danger size="small" loading={operatingId === item.id} icon={<DeleteOutlined />}>删除</Button></Popconfirm></span></div>)}{items.length === 0 && <div className="px-4 py-10 text-center text-[var(--text-muted)]">暂无已归档产品</div>}</div></div>}</div>;
};
const DictionaryPanel = () => <div className="w-full space-y-5 text-xs">
  <WorkItemCategoryPanel />
</div>;
export const ResearchTemplateView: React.FC = () => {
  const [section, setSection] = useState<Section>('work-items');
  return <div className="research-template-view space-y-5 animate-in fade-in duration-200">
    <header className="border-b border-[var(--border-main)] pb-3"><h1 className="text-lg font-bold text-[var(--text-primary)]">工作项设置</h1><p className="mt-1 text-xs text-[var(--text-muted)]">统一管理工作项类型、状态、通知和归档。</p></header>
    <div className="grid min-h-[520px] grid-cols-1 border border-[var(--border-main)] bg-[var(--bg-surface)] md:grid-cols-[190px_minmax(0,1fr)]">
      <nav aria-label="工作项设置菜单" className="flex gap-1 overflow-x-auto border-b border-[var(--border-main)] bg-[var(--bg-surface-soft)] p-3 md:block md:overflow-visible md:border-b-0 md:border-r">
        <div className="mb-4 hidden border-b border-[var(--border-main)] px-3 pb-4 select-none md:block"><h2 className="text-base font-bold text-[var(--text-primary)]">工作项设置</h2><p className="mt-2 text-xs text-[var(--text-muted)]">统一配置</p></div>
        {SECTIONS.map((item) => <button key={item.id} type="button" onClick={() => setSection(item.id)} aria-current={section === item.id ? 'page' : undefined} className={`mb-1 flex h-9 shrink-0 items-center rounded-md px-3 text-left text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] md:w-full ${section === item.id ? 'bg-[var(--primary)]/12 text-[var(--active-text)]' : 'text-[var(--text-body)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]'}`}>{item.label}</button>)}
      </nav>
      <section className="min-w-0 p-4 md:p-6" aria-label={SECTIONS.find((item) => item.id === section)?.label}>
        {section === 'dictionary' && <DictionaryPanel />}
        {section === 'work-items' && <WorkItemModuleView />}
        {section === 'notifications' && <NotificationSettingsPanel scope="template" />}
        {section === 'archive' && <ArchivePanel />}
        {section === 'archived-tasks' && <ArchivedTasksPanel />}
      </section>
    </div>
  </div>;
};
