import React, { useEffect, useState } from 'react';
import { ArrowLeft, ClipboardCheck, Plus, Ticket } from '@/components/common/octicons-compat';
import { useApp } from '../../context/AppContext';
import { requirementRepository } from '../../services/requirementRepository';
import { Drawer, StatCard, StatusTag } from './UIComponents';
import type { RequirementTask, RequirementTaskType, RequirementWorkItem } from '../../types';
import { CRMJourneyTimeline } from '../crm/CRMJourneyTimeline';
import { Pagination } from './Pagination';

export const RequirementWorkItemsView: React.FC<{ type: 'presales' | 'delivery' }> = ({ type }) => {
  const { requirementTasks, addRequirementTask, addToast } = useApp();
  const workType: RequirementTaskType = type === 'presales' ? '售前任务' : '交付任务';
  const pageTitle = type === 'presales' ? '售前工单' : '交付工单';
  const Icon = type === 'presales' ? Ticket : ClipboardCheck;
  const sourceRequirements = requirementTasks.filter((item) => !['已搁置', '已驳回'].includes(item.status));
  const [items, setItems] = useState<RequirementWorkItem[]>([]);
  const [creating, setCreating] = useState(false);
  const [sourceId, setSourceId] = useState('');
  const [title, setTitle] = useState('');
  const [assignee, setAssignee] = useState('');
  const [note, setNote] = useState('');
  const [syncFilter, setSyncFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [sourceRequirement, setSourceRequirement] = useState<RequirementTask | null>(null);
  const [sourceLoading, setSourceLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const fieldClass = 'mt-1 w-full h-10 px-3 rounded-lg border border-[var(--border-main)] bg-[var(--bg-card)] text-[var(--text-primary)]';

  useEffect(() => {
    let active = true;
    const fallbackList = requirementTasks.filter((item) =>
      item.workOrderType === workType ||
      item.taskType === workType ||
      (type === 'delivery' && (item.taskType === '项目交付' || item.requirementType === '项目交付'))
    ).map((item) => ({
      id: item.taskId || item.id,
      requirementId: item.id,
      requirementCode: item.code || `REQ-${item.id.slice(-4)}`,
      requirementTitle: item.title,
      taskType: workType,
      title: item.title,
      assigneeName: item.assignedOwnerName || item.ownerName,
      note: item.assignedNote || item.description,
      status: item.status,
      createdAt: item.createdAt
    }));
    if (fallbackList.length > 0) {
      setItems(fallbackList);
      setLoading(false);
    } else {
      setLoading(true);
    }
    requirementRepository.syncStatus({ taskType: workType, syncStatus: syncFilter, page: 1, pageSize: 100 }).then((result) => {
      if (!active) return;
      const remote = result?.items || [];
      const remoteIds = new Set(remote.map((r) => r.id));
      const remoteTitles = new Set(remote.map((r) => r.title));
      const localOnly = fallbackList.filter((item) => !remoteIds.has(item.id) && !remoteTitles.has(item.title));
      setItems([...localOnly, ...remote]);
    }).catch(() => {
      if (!active) return;
      setItems(fallbackList);
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [workType, requirementTasks, syncFilter, type]);

  const openCreate = () => { setSourceId(sourceRequirements[0]?.id || ''); setTitle(sourceRequirements[0]?.title || ''); setAssignee(''); setNote(''); setCreating(true); };
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!sourceId || !title.trim() || !assignee.trim()) { addToast('warning', '请选择来源需求并填写工单标题、负责人'); return; }
    try {
      await requirementRepository.createWorkItem(sourceId, { title: title.trim(), taskType: workType, assigneeName: assignee.trim(), note });
      await addRequirementTask({
        title: title.trim(),
        workOrderType: workType as any,
        taskType: workType as any,
        ownerName: assignee.trim(),
        assignedOwnerName: assignee.trim(),
        assignedNote: note,
        status: '待处理'
      });
      setCreating(false);
      addToast('success', '工单已创建');
    } catch (error) {
      addToast('error', '工单创建失败', error instanceof Error ? error.message : '请稍后重试');
    }
  };
  const complete = async (id: string) => { try { await requirementRepository.updateWorkItemStatus(id, '已完成'); setItems((list) => list.map((item) => item.id === id ? { ...item, status: '已完成' } : item)); addToast('success', '工单已完成', '来源需求状态已同步为已完成'); } catch (error) { addToast('error', '状态更新失败', error instanceof Error ? error.message : '请稍后重试'); } };
  const retry = async (id: string) => {
    setRetryingId(id);
    try {
      const result = await requirementRepository.retryWorkItem(id);
      const refreshed = await requirementRepository.syncStatus({ taskType: workType, syncStatus: syncFilter, page: 1, pageSize: 100 });
      setItems(refreshed?.items || []);
      if (result.syncStatus === 'SUCCESS') addToast('success', '同步已恢复', '下游工作项已幂等写入');
      else addToast('warning', '同步仍未成功', result.syncError || '系统将在下次重试窗口继续处理');
    } catch (error) { addToast('error', '重试请求失败', error instanceof Error ? error.message : '请稍后重试'); }
    finally { setRetryingId(null); }
  };
  const syncLabel = (status?: string) => status === 'FAILED' ? '同步失败' : status === 'PENDING' ? '待同步' : '已同步';
  const syncType = (status?: string): 'success' | 'warning' | 'danger' => status === 'FAILED' ? 'danger' : status === 'PENDING' ? 'warning' : 'success';
  const pagedItems = items.slice((page - 1) * pageSize, page * pageSize);
  useEffect(() => setPage(1), [syncFilter, pageSize, items.length]);
  const formatTime = (value?: string) => value ? new Date(value).toLocaleString('zh-CN', { hour12: false }) : '—';
  const openSourceRequirement = async (item: RequirementWorkItem) => {
    setSourceLoading(true);
    try { setSourceRequirement(await requirementRepository.detail(item.requirementId)); }
    catch (error) { addToast('error', '来源需求加载失败', error instanceof Error ? error.message : '请稍后重试'); }
    finally { setSourceLoading(false); }
  };

  if (creating) return <div className="space-y-6"><button type="button" onClick={() => setCreating(false)} className="inline-flex items-center gap-1 text-sm text-[var(--active-text)]"><ArrowLeft className="w-4 h-4" />返回{pageTitle}</button><section className="dark-panel rounded-xl p-6 max-w-3xl"><div className="flex items-center gap-3 mb-6"><Icon className="w-5 h-5 text-[var(--active-text)]" /><div><h2 className="text-lg font-semibold text-[var(--text-primary)]">新增{pageTitle}</h2><p className="text-xs text-[var(--text-muted)]">工单将关联到需求池来源需求并进入待处理状态。</p></div></div><form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-2 gap-4"><label className="text-xs text-[var(--text-muted)]">来源需求 *<select value={sourceId} onChange={(e) => { setSourceId(e.target.value); setTitle(sourceRequirements.find((item) => item.id === e.target.value)?.title || ''); }} className={fieldClass}><option value="">请选择来源需求</option>{sourceRequirements.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label><label className="text-xs text-[var(--text-muted)]">负责人 *<input value={assignee} onChange={(e) => setAssignee(e.target.value)} className={fieldClass} placeholder="请输入负责人" required /></label><label className="md:col-span-2 text-xs text-[var(--text-muted)]">工单标题 *<input value={title} onChange={(e) => setTitle(e.target.value)} className={fieldClass} placeholder="请输入工单标题" required /></label><label className="md:col-span-2 text-xs text-[var(--text-muted)]">备注<textarea value={note} onChange={(e) => setNote(e.target.value)} rows={4} className="mt-1 w-full px-3 py-2 rounded-lg border border-[var(--border-main)] bg-[var(--bg-card)] text-[var(--text-primary)]" /></label><div className="md:col-span-2 flex justify-end gap-2 border-t border-[var(--border-main)] pt-4"><button type="button" onClick={() => setCreating(false)} className="h-10 px-4 rounded-lg border border-[var(--border-main)] text-sm text-[var(--text-body)]">取消</button><button type="submit" className="h-10 px-4 rounded-lg bg-[var(--primary)] text-sm font-semibold text-white">创建工单</button></div></form></section></div>;
  return <div className="space-y-6"><div className="flex items-center justify-between"><div className="flex items-center gap-3"><Icon className="w-5 h-5 text-[var(--active-text)]" /><div><h2 className="text-lg font-semibold text-[var(--text-primary)]">{pageTitle}</h2><p className="text-xs text-[var(--text-muted)]">由需求池转任务自动生成，可追踪处理状态与同步补偿进度。</p></div></div><div className="flex items-center gap-3"><label className="text-xs text-[var(--text-muted)]">同步筛选<select value={syncFilter} onChange={(event) => setSyncFilter(event.target.value)} className="ml-2 h-10 rounded-lg border border-[var(--border-main)] bg-[var(--bg-card)] px-3 text-[var(--text-primary)] transition-colors hover:border-[var(--active-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"><option value="">全部</option><option value="FAILED">同步失败</option><option value="PENDING">待同步</option><option value="SUCCESS">已同步</option></select></label><button type="button" onClick={openCreate} className="h-10 px-4 rounded-lg bg-[var(--primary)] text-sm font-semibold text-white transition-colors hover:bg-[var(--primary-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"><Plus className="mr-1 inline w-4 h-4" />新增工单</button></div></div><div className="grid grid-cols-1 sm:grid-cols-3 gap-4"><StatCard title="工单总数" value={items.length} unit="个" icon={<Icon className="w-5 h-5" />} /><StatCard title="处理中" value={items.filter((item) => item.status === '处理中' || item.status === '待处理').length} unit="个" icon={<Icon className="w-5 h-5" />} /><StatCard title="同步异常" value={items.filter((item) => item.syncStatus === 'FAILED').length} unit="个" icon={<Icon className="w-5 h-5" />} /></div><div className="dark-panel rounded-xl overflow-hidden"><div className="overflow-x-auto"><table className="w-full min-w-[980px] text-left text-xs"><thead><tr className="border-b border-[var(--border-main)] text-[var(--text-muted)]"><th className="px-4 py-3">工单标题</th><th className="px-4 py-3">来源需求</th><th className="px-4 py-3">负责人</th><th className="px-4 py-3">备注</th><th className="px-4 py-3">处理状态</th><th className="px-4 py-3">同步状态</th><th className="px-4 py-3">重试信息</th><th className="px-4 py-3 text-right">操作</th></tr></thead><tbody>{loading ? <tr><td colSpan={8} className="px-4 py-12 text-center text-[var(--text-muted)]">正在加载同步状态…</td></tr> : pagedItems.map((item) => { const retryable = ['FAILED', 'PENDING'].includes(item.syncStatus || '') && (item.retryCount || 0) < 5; return <tr key={item.id} className="border-b border-[var(--border-main)] align-top"><td className="px-4 py-3 text-[var(--text-primary)]">{item.title}</td><td className="px-4 py-3 text-[var(--text-body)]"><button type="button" onClick={() => openSourceRequirement(item)} className="max-w-[240px] text-left text-[var(--active-text)] transition-colors hover:text-[var(--primary-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"><span className="block truncate">{item.requirementTitle || item.requirementId}</span>{item.requirementCode && <span className="mt-1 block text-[var(--text-muted)]">{item.requirementCode}</span>}</button></td><td className="px-4 py-3 text-[var(--text-body)]">{item.assigneeName}</td><td className="px-4 py-3 text-[var(--text-muted)]">{item.note || '—'}</td><td className="px-4 py-3"><StatusTag status={item.status} /></td><td className="px-4 py-3"><StatusTag status={syncLabel(item.syncStatus)} type={syncType(item.syncStatus)} />{item.lastError && <p className="mt-2 max-w-[220px] break-words text-[var(--text-muted)]" title={item.lastError}>{item.lastError}</p>}</td><td className="px-4 py-3 text-[var(--text-muted)]"><div>已重试 {item.retryCount || 0}/5 次</div><div className="mt-1">下次：{formatTime(item.nextRetryAt)}</div></td><td className="px-4 py-3 text-right"><div className="flex justify-end gap-3">{item.status !== '已完成' && <button type="button" onClick={() => complete(item.id)} className="text-[var(--active-text)] transition-colors hover:text-[var(--primary-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]">标记完成</button>}{retryable && <button type="button" onClick={() => retry(item.id)} disabled={retryingId === item.id} aria-busy={retryingId === item.id} className="text-[var(--active-text)] transition-colors hover:text-[var(--primary-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] disabled:cursor-not-allowed disabled:opacity-50">{retryingId === item.id ? '重试中…' : '立即重试'}</button>}</div></td></tr>; })}</tbody></table></div>{!loading && items.length === 0 && <div className="py-16 text-center text-sm text-[var(--text-muted)]">暂无匹配的{pageTitle}记录</div>}<Pagination total={items.length} page={page} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={setPageSize} /></div><Drawer isOpen={Boolean(sourceRequirement)} onClose={() => setSourceRequirement(null)} title={sourceRequirement?.title || '来源需求'} subtitle={sourceRequirement ? `${sourceRequirement.code || sourceRequirement.id} · ${sourceRequirement.department || '未分配部门'}` : ''}>{sourceLoading ? <div className="py-12 text-center text-sm text-[var(--text-muted)]">正在加载来源需求…</div> : sourceRequirement && <div className="space-y-5 text-sm"><div className="grid grid-cols-2 gap-4"><div><span className="text-xs text-[var(--text-muted)]">需求状态</span><div className="mt-1"><StatusTag status={sourceRequirement.status} /></div></div><div><span className="text-xs text-[var(--text-muted)]">优先级</span><div className="mt-1"><StatusTag status={sourceRequirement.priority} /></div></div><div><span className="text-xs text-[var(--text-muted)]">关联客户</span><p className="mt-1 text-[var(--text-primary)]">{sourceRequirement.customerName || '未关联'}</p></div><div><span className="text-xs text-[var(--text-muted)]">负责人</span><p className="mt-1 text-[var(--text-primary)]">{sourceRequirement.ownerName}</p></div></div><div><h3 className="mb-2 text-sm font-semibold text-[var(--text-primary)]">需求说明</h3><p className="whitespace-pre-wrap rounded-lg border border-[var(--border-main)] bg-[var(--bg-card)] p-3 text-[var(--text-body)]">{sourceRequirement.description || '暂无描述'}</p></div>{sourceRequirement.events?.length ? <div><h3 className="mb-2 text-sm font-semibold text-[var(--text-primary)]">流转记录</h3>{sourceRequirement.events.map((event) => <div key={event.id} className="border-b border-[var(--border-main)] py-2 text-xs"><span className="text-[var(--text-muted)]">{event.createdAt}</span><span className="mx-2 text-[var(--active-text)]">{event.eventType}</span>{event.operatorName}</div>)}</div> : null}<CRMJourneyTimeline filters={{ requirementId: sourceRequirement.id }} title={`${pageTitle}关联业务历程`} /></div>}</Drawer></div>;
};
