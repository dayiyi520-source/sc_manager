import React, { useEffect, useMemo, useState } from 'react';
import { Button, Drawer, Input, Popconfirm, Select, Switch } from 'antd';
import { DeleteOutlined, EditOutlined, HistoryOutlined, PlusOutlined, SearchOutlined, ThunderboltOutlined } from '@ant-design/icons';
import { ProductLine, ProductLineWorkItemType } from '../../types';
import { AutomationLog, AutomationRule, productRepository } from '../../services/productRepository';
import { useApp } from '../../context/AppContext';

type RuleDraft = Omit<AutomationRule, 'id' | 'revision' | 'updatedAt'>;
type RuleStatusFilter = 'ALL' | 'ENABLED' | 'DISABLED';
type StateOption = { key: string; name: string };
type RuleCondition = { type: 'TASK_TYPE' | 'PRIORITY'; operator: 'EQUALS' | 'NOT_EQUALS' | 'CONTAINS'; value: string };
type RuleAction = { type: 'CREATE_SUBTASK' | 'DERIVE_PARENT_STATUS'; result: string };

const emptyRule = (): RuleDraft => ({ name: '', enabled: true, triggerType: 'STATUS_CHANGED', triggerTypeId: '', triggerStateKey: '', conditionType: 'NONE', conditionValue: '', actionType: 'CREATE_SUBTASK', actionConfig: {} });
const defaultCondition = (): RuleCondition => ({ type: 'PRIORITY', operator: 'EQUALS', value: '' });
const defaultAction = (): RuleAction => ({ type: 'CREATE_SUBTASK', result: '' });
const actionConfig = (value: AutomationRule['actionConfig']) => {
  if (typeof value !== 'string') return value || {};
  try { return JSON.parse(value); } catch { return {}; }
};
const relativeTime = (value?: string) => {
  if (!value) return '尚未执行';
  const minutes = Math.floor((Date.now() - new Date(value).getTime()) / 60000);
  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes}分钟前`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)}小时前`;
  return new Date(value).toLocaleString('zh-CN', { hour12: false });
};

export const AutomationRulesPanel: React.FC<{ productLine: ProductLine }> = ({ productLine }) => {
  const { addToast } = useApp();
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [types, setTypes] = useState<ProductLineWorkItemType[]>([]);
  const [typeStates, setTypeStates] = useState<Record<string, StateOption[]>>({});
  const [states, setStates] = useState<StateOption[]>([]);
  const [logs, setLogs] = useState<AutomationLog[]>([]);
  const [globalEnabled, setGlobalEnabled] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<RuleStatusFilter>('ALL');
  const [view, setView] = useState<'rules' | 'logs'>('rules');
  const [editing, setEditing] = useState<AutomationRule | null>(null);
  const [draft, setDraft] = useState<RuleDraft>(emptyRule());
  const [conditions, setConditions] = useState<RuleCondition[]>([]);
  const [actions, setActions] = useState<RuleAction[]>([defaultAction()]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [overview, allTypes, nextLogs] = await Promise.all([
        productRepository.automationRules(productLine.id), productRepository.workItemTypes(productLine.id), productRepository.automationLogs(productLine.id)
      ]);
      const workflowEntries = await Promise.all(allTypes.map(async (type) => {
        try {
          const workflows = await productRepository.typeWorkflows(productLine.id, type.id);
          const current = workflows.find((workflow) => workflow.status === 'PUBLISHED');
          return [type.id, (current?.definition.states || []).map((state) => ({ key: String(state.key), name: String(state.name) }))] as const;
        } catch { return [type.id, []] as const; }
      }));
      setRules(overview.rules.map((rule) => ({ ...rule, enabled: Boolean(rule.enabled) })));
      setGlobalEnabled(overview.enabled);
      setTypes(allTypes);
      setTypeStates(Object.fromEntries(workflowEntries));
      setLogs(nextLogs);
    } catch (error) {
      addToast('error', '自动化规则读取失败', error instanceof Error ? error.message : '请稍后重试');
    } finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, [productLine.id]);

  const openCreate = () => { setEditing(null); setDraft(emptyRule()); setStates([]); setConditions([]); setActions([defaultAction()]); setOpen(true); };
  const openEdit = (rule: AutomationRule) => {
    setEditing(rule);
    const rawConfig = actionConfig(rule.actionConfig) as Record<string, unknown>;
    let parsedConditions: RuleCondition[] = [];
    if (rule.conditionType === 'MULTI') { try { parsedConditions = JSON.parse(String(rule.conditionValue || '[]')) as RuleCondition[]; } catch { parsedConditions = []; } }
    else if (rule.conditionType !== 'NONE') parsedConditions = [{ type: rule.conditionType, operator: 'EQUALS', value: rule.conditionValue || '' }];
    const parsedActions = Array.isArray(rawConfig.actions) ? rawConfig.actions as RuleAction[] : [{ type: rule.actionType, result: String(rawConfig.childTypeId || '') }];
    setDraft({ name: rule.name, enabled: rule.enabled, triggerType: rule.triggerType, triggerTypeId: rule.triggerTypeId, triggerStateKey: rule.triggerStateKey, conditionType: parsedConditions.length ? 'MULTI' : 'NONE', conditionValue: '', actionType: parsedActions.length > 1 ? 'MULTI' : parsedActions[0].type, actionConfig: rawConfig });
    setConditions(parsedConditions); setActions(parsedActions.length ? parsedActions : [defaultAction()]);
    setStates(typeStates[rule.triggerTypeId] || []);
    setOpen(true);
  };
  const selectTriggerType = (triggerTypeId: string) => {
    setStates(typeStates[triggerTypeId] || []);
    setDraft((previous) => ({ ...previous, triggerTypeId, triggerStateKey: '' }));
  };
  const childTypeId = String(actionConfig(draft.actionConfig).childTypeId || '');
  const save = async () => {
    if (!draft.name.trim() || !draft.triggerTypeId || !draft.triggerStateKey) { addToast('warning', '请填写规则名称、工作项类型和触发状态'); return; }
    if (conditions.some((condition) => !condition.value)) { addToast('warning', '请完整配置过滤条件'); return; }
    if (actions.some((action) => !action.result)) { addToast('warning', '请完整配置执行动作'); return; }
    setLoading(true);
    try {
      const body = { ...draft, name: draft.name.trim(), conditionType: conditions.length ? 'MULTI' as const : 'NONE' as const, conditionValue: '', conditions, actionType: actions.length > 1 ? 'MULTI' as const : actions[0].type, actions, actionConfig: actions.length === 1 && actions[0].type === 'CREATE_SUBTASK' ? { childTypeId: actions[0].result } : { actions } };
      if (editing) await productRepository.updateAutomationRule(productLine.id, editing.id, { ...body, revision: editing.revision });
      else await productRepository.createAutomationRule(productLine.id, body);
      addToast('success', editing ? '自动化规则已更新' : '自动化规则已创建');
      setOpen(false);
      await load();
    } catch (error) { addToast('error', '自动化规则保存失败', error instanceof Error ? error.message : '请稍后重试'); }
    finally { setLoading(false); }
  };
  const toggleRule = async (rule: AutomationRule, enabled: boolean) => {
    try { await productRepository.updateAutomationRule(productLine.id, rule.id, { ...rule, enabled, actionConfig: actionConfig(rule.actionConfig) }); await load(); }
    catch (error) { addToast('error', '规则状态更新失败', error instanceof Error ? error.message : '请稍后重试'); }
  };

  const typeName = (id: string) => types.find((type) => type.id === id)?.name || '未知类型';
  const stateName = (typeId: string, key: string) => typeStates[typeId]?.find((state) => state.key === key)?.name || key;
  const typeOptions = useMemo(() => types.filter((type) => type.enabled).map((type) => ({ value: type.id, label: `${type.category} · ${type.name}` })), [types]);
  const filteredRules = useMemo(() => rules.filter((rule) => {
    const matchesKeyword = !keyword.trim() || rule.name.toLowerCase().includes(keyword.trim().toLowerCase());
    return matchesKeyword && (statusFilter === 'ALL' || (statusFilter === 'ENABLED' ? rule.enabled : !rule.enabled));
  }), [keyword, rules, statusFilter]);
  const latestLogByRule = useMemo(() => logs.reduce<Record<string, AutomationLog>>((result, log) => {
    if (!result[log.ruleId] || new Date(log.createdAt) > new Date(result[log.ruleId].createdAt)) result[log.ruleId] = log;
    return result;
  }, {}), [logs]);

  return <div className="mx-auto w-full max-w-5xl space-y-4 text-xs">
    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--border-main)] pb-4">
      <div className="flex min-w-0 items-center gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-[var(--border-main)] bg-[var(--bg-surface-soft)] text-[var(--active-text)]"><ThunderboltOutlined /></span><div className="min-w-0"><h3 className="text-sm font-bold text-[var(--text-primary)]">跨工种自动联动引擎</h3><p className="mt-1 truncate text-[var(--text-muted)]">统一控制当前产品线的状态触发和后续动作。</p></div><Switch checked={globalEnabled} checkedChildren="已开启" unCheckedChildren="已暂停" onChange={async (enabled) => { try { await productRepository.updateAutomationSetting(productLine.id, enabled); setGlobalEnabled(enabled); } catch (error) { addToast('error', '全局开关更新失败', error instanceof Error ? error.message : '请稍后重试'); } }} /></div>
      <div className="flex items-center gap-2"><Button icon={<HistoryOutlined />} onClick={() => setView('logs')}>执行日志</Button><Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>新建规则</Button></div>
    </div>
    <div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center border-b border-[var(--border-main)]"><button type="button" onClick={() => setView('rules')} className={`h-10 border-b-2 px-4 text-sm ${view === 'rules' ? 'border-[var(--primary)] text-[var(--text-primary)]' : 'border-transparent text-[var(--text-muted)]'}`}>规则大盘</button><button type="button" onClick={() => setView('logs')} className={`h-10 border-b-2 px-4 text-sm ${view === 'logs' ? 'border-[var(--primary)] text-[var(--text-primary)]' : 'border-transparent text-[var(--text-muted)]'}`}>执行日志</button></div>{view === 'rules' && <div className="flex items-center gap-2"><Input className="w-64" prefix={<SearchOutlined />} value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="搜索规则名称" allowClear /><Select className="w-32" value={statusFilter} onChange={setStatusFilter} options={[{ value: 'ALL', label: '全部状态' }, { value: 'ENABLED', label: '已启用' }, { value: 'DISABLED', label: '已停用' }]} /></div>}</div>

    {view === 'rules' ? <><div className="overflow-x-auto rounded-md border border-[var(--border-main)]"><div className="min-w-[900px]"><div className="grid grid-cols-[minmax(170px,1.3fr)_minmax(190px,1.4fr)_minmax(190px,1.4fr)_110px_80px_88px] gap-3 border-b border-[var(--border-main)] bg-[var(--bg-surface-soft)] px-3 py-3 text-[11px] text-[var(--text-muted)]"><span>规则名称</span><span>触发条件（When）</span><span>执行动作（Then）</span><span>最近执行</span><span>状态</span><span className="text-right">操作</span></div>{filteredRules.length ? filteredRules.map((rule) => {
      const targetId = String(actionConfig(rule.actionConfig).childTypeId || '');
      return <div key={rule.id} className="grid grid-cols-[minmax(170px,1.3fr)_minmax(190px,1.4fr)_minmax(190px,1.4fr)_110px_80px_88px] items-center gap-3 border-b border-[var(--border-main)] px-3 py-3 last:border-b-0"><span className="truncate font-medium text-[var(--text-primary)]" title={rule.name}>{rule.name}</span><span className="truncate text-[var(--text-body)]" title={`${typeName(rule.triggerTypeId)} 进入 ${stateName(rule.triggerTypeId, rule.triggerStateKey)}`}>{typeName(rule.triggerTypeId)} 进入「{stateName(rule.triggerTypeId, rule.triggerStateKey)}」</span><span className="truncate text-[var(--text-body)]">{rule.actionType === 'CREATE_SUBTASK' ? `创建「${typeName(targetId)}」子任务` : '向上推导父工作项状态'}</span><span className="text-[var(--text-muted)]">{relativeTime(latestLogByRule[rule.id]?.createdAt)}</span><Switch checked={rule.enabled} disabled={!globalEnabled} onChange={(enabled) => void toggleRule(rule, enabled)} /><span className="flex justify-end gap-1"><Button type="text" icon={<EditOutlined />} title="编辑规则" aria-label={`编辑规则：${rule.name}`} onClick={() => openEdit(rule)} /><Popconfirm title="删除自动化规则" description="删除后不会再触发该规则。" okText="删除" cancelText="取消" onConfirm={async () => { try { await productRepository.deleteAutomationRule(productLine.id, rule.id); addToast('success', '自动化规则已删除'); await load(); } catch (error) { addToast('error', '自动化规则删除失败', error instanceof Error ? error.message : '请稍后重试'); } }}><Button type="text" danger icon={<DeleteOutlined />} title="删除规则" aria-label={`删除规则：${rule.name}`} /></Popconfirm></span></div>;
    }) : <div className="px-4 py-12 text-center text-[var(--text-muted)]">{loading ? '正在读取规则...' : '暂无匹配的自动化规则'}</div>}</div></div><div className="text-right text-[11px] text-[var(--text-muted)]">共 {filteredRules.length} 条规则</div></> : <div className="overflow-hidden rounded-md border border-[var(--border-main)]"><div className="grid grid-cols-[180px_160px_100px_minmax(180px,1fr)] gap-3 border-b border-[var(--border-main)] bg-[var(--bg-surface-soft)] px-3 py-3 text-[11px] text-[var(--text-muted)]"><span>执行时间</span><span>工作项</span><span>结果</span><span>说明</span></div>{logs.length ? logs.map((log) => <div key={log.id} className="grid grid-cols-[180px_160px_100px_minmax(180px,1fr)] gap-3 border-b border-[var(--border-main)] px-3 py-3 last:border-b-0"><span>{new Date(log.createdAt).toLocaleString('zh-CN', { hour12: false })}</span><span className="truncate">{log.workItemId}</span><span>{log.result === 'SUCCESS' ? '成功' : '失败'}</span><span className="truncate" title={log.detail}>{log.detail || '暂无说明'}</span></div>) : <div className="px-4 py-12 text-center text-[var(--text-muted)]">暂无执行日志</div>}</div>}

    <Drawer width={680} open={open} onClose={() => setOpen(false)} destroyOnClose={false} title={editing ? `编辑规则 · ${editing.name}` : '新建自动化规则'} footer={<div className="flex justify-end gap-2"><Button onClick={() => setOpen(false)}>取消</Button><Button type="primary" loading={loading} onClick={() => void save()}>保存规则</Button></div>}>
      <div className="space-y-5 text-xs"><section className="space-y-3"><div><h4 className="text-sm font-bold text-[var(--text-primary)]">规则基本信息</h4><p className="mt-1 text-[var(--text-muted)]">用清晰的动作结果命名，便于后续排查和维护。</p></div><label className="flex flex-col gap-[5px] font-medium text-[var(--text-body)]"><span>规则名称 *</span><Input maxLength={128} value={draft.name} onChange={(event) => setDraft((previous) => ({ ...previous, name: event.target.value }))} placeholder="例如：需求评审通过后创建研发任务" /></label></section><div className="space-y-0">
        <section className="rounded-md border border-[var(--border-main)] bg-[var(--bg-surface-soft)] p-4"><NodeHeading index="1" title="When · 当发生以下事件" primary /><div className="space-y-3"><FieldRow label="工作项类型"><Select value={draft.triggerTypeId || undefined} options={typeOptions} placeholder="选择工作项类型" showSearch optionFilterProp="label" onChange={selectTriggerType} /></FieldRow><FieldRow label="事件类型"><Select value="STATUS_CHANGED" options={[{ value: 'STATUS_CHANGED', label: '状态发生变化' }]} /></FieldRow><FieldRow label="变更为"><Select value={draft.triggerStateKey || undefined} options={states.map((state) => ({ value: state.key, label: state.name }))} placeholder="选择进入的状态" disabled={!draft.triggerTypeId} onChange={(triggerStateKey) => setDraft((previous) => ({ ...previous, triggerStateKey }))} /></FieldRow></div></section><Connector />
        <section className="rounded-md border border-[var(--border-main)] bg-[var(--bg-surface-soft)] p-4"><NodeHeading index="2" title="If · 过滤条件" optional /><div className="space-y-2">{conditions.map((condition, index) => <div key={`condition-${index}`} className="grid grid-cols-[minmax(120px,1fr)_110px_minmax(120px,1fr)_32px] items-center gap-2"><Select value={condition.type} options={[{ value: 'TASK_TYPE', label: '工作项类型' }, { value: 'PRIORITY', label: '优先级' }]} onChange={(type: RuleCondition['type']) => setConditions((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, type, value: '' } : row))} /><Select value={condition.operator} options={[{ value: 'EQUALS', label: '等于' }, { value: 'NOT_EQUALS', label: '不等于' }, { value: 'CONTAINS', label: '包含' }]} onChange={(operator: RuleCondition['operator']) => setConditions((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, operator } : row))} />{condition.type === 'TASK_TYPE' ? <Select value={condition.value || undefined} options={typeOptions} placeholder="选择值" onChange={(value) => setConditions((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, value } : row))} /> : <Select value={condition.value || undefined} options={['P0', 'P1', 'P2', 'P3'].map((value) => ({ value, label: value }))} placeholder="选择值" onChange={(value) => setConditions((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, value } : row))} />}<Button type="text" danger icon={<DeleteOutlined />} aria-label={`删除过滤条件 ${index + 1}`} onClick={() => setConditions((current) => current.filter((_, rowIndex) => rowIndex !== index))} /></div>)}<Button type="dashed" block icon={<PlusOutlined />} onClick={() => setConditions((current) => [...current, defaultCondition()])}>添加过滤条件</Button></div></section><Connector />
        <section className="rounded-md border border-[var(--border-main)] bg-[var(--bg-surface-soft)] p-4"><NodeHeading index="3" title="Then · 执行以下动作" /><div className="space-y-2">{actions.map((action, index) => <div key={`action-${index}`} className="grid grid-cols-[minmax(170px,1fr)_minmax(170px,1fr)_32px] items-center gap-2"><Select value={action.type} options={[{ value: 'CREATE_SUBTASK', label: '创建关联子任务' }, { value: 'DERIVE_PARENT_STATUS', label: '向上推导父工作项状态' }]} onChange={(type: RuleAction['type']) => setActions((current) => current.map((row, rowIndex) => rowIndex === index ? { type, result: '' } : row))} />{action.type === 'CREATE_SUBTASK' ? <Select value={action.result || undefined} options={typeOptions} placeholder="选择动作结果" showSearch optionFilterProp="label" onChange={(result) => setActions((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, result } : row))} /> : <Select value={action.result || undefined} options={states.map((state) => ({ value: state.key, label: `推导为「${state.name}」` }))} placeholder="选择动作结果" onChange={(result) => setActions((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, result } : row))} />}<Button type="text" danger icon={<DeleteOutlined />} aria-label={`删除执行动作 ${index + 1}`} onClick={() => setActions((current) => current.filter((_, rowIndex) => rowIndex !== index))} /></div>)}<Button type="dashed" block icon={<PlusOutlined />} onClick={() => setActions((current) => [...current, defaultAction()])}>添加执行动作</Button></div></section>
      </div><div className="flex items-center justify-between border-t border-[var(--border-main)] pt-4"><div><div className="font-medium text-[var(--text-body)]">启用规则</div><p className="mt-1 text-[11px] text-[var(--text-muted)]">关闭后保留配置，但不参与后续触发。</p></div><Switch checked={draft.enabled} onChange={(enabled) => setDraft((previous) => ({ ...previous, enabled }))} /></div></div>
    </Drawer>
  </div>;
};

const NodeHeading: React.FC<{ index: string; title: string; primary?: boolean; optional?: boolean }> = ({ index, title, primary, optional }) => <div className="mb-3 flex items-center gap-2"><span className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold ${primary ? 'bg-[var(--primary)] text-white' : 'border border-[var(--border-strong)] text-[var(--text-body)]'}`}>{index}</span><h4 className="text-sm font-bold text-[var(--text-primary)]">{title}</h4>{optional && <span className="text-[11px] text-[var(--text-muted)]">可选</span>}</div>;
const Connector = () => <div className="mx-7 h-6 border-l border-[var(--border-strong)]" aria-hidden="true" />;
const FieldRow: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => <label className="grid grid-cols-[88px_minmax(0,1fr)] items-center gap-3"><span className="text-[var(--text-muted)]">{label}</span>{children}</label>;
