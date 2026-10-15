import { ReviewTemplateSettings } from './ReviewTemplateSettings';
import { OkrRoleSettings } from './OkrRoleSettings';
import { WeeklyCycleSettings } from './WeeklyCycleSettings';
import { ObjectiveTitleConfiguration } from './ObjectiveTitleConfiguration';
import { normalizeObjectiveTitleTemplates, validateObjectiveTitleTemplates } from '../../../services/okrObjectiveTitleTemplates';
import { OkrPolicySettings } from './OkrPolicySettings';
import { normalizedPolicy, validatePolicy } from '../../../services/okrSettingsPolicy';
import { migrateTemplateDepartments } from '../../../services/okrTemplates';
import { Button, InputNumber, Select, Space, Tag, Switch, message } from 'antd';
import Card from 'antd/es/card/Card';
import { useEffect, useRef, useState, type Key } from 'react';
import { ArrowLeft } from '@/components/common/octicons-compat';
import { normalizeWeeklyReviewRule, REVIEW_WEEKDAYS } from '../../../services/okrReviewRules';
import type { OkrSettings, OkrTemplate, OkrTimeRule, OkrPerson, OkrObjectiveTitleTemplate } from '../../../services/okrRepository';

type Props = { key?: Key; settings: OkrSettings; busy?: boolean; readOnly?: boolean; onSave: (settings: OkrSettings) => Promise<boolean>; onClose?: () => void; departments?: string[]; people?: OkrPerson[] };
const labels: Record<string, string> = { templates: 'OKR模板', reviewTemplates: '复盘总结模板', administrators:'角色设置', weeklyCycles: '周报周期配置', confirmation:'目标确认配置', timeRules: '开放时间', validation: '权重与必填校验', defaultView: '默认视图' };
const TEMPLATE_DEFAULTS: OkrTemplate[] = [
  { department: '产研部门', type: 'product', fields: ['目标内容', '关联产品', '关键节点', '动作', '截止日期', '权重'] },
  { department: '项目交付部门', type: 'delivery', fields: ['目标内容', '关联项目', '关键节点', '动作', '截止日期', '权重'] },
  { department: '其他支撑部门', type: 'support', fields: ['KR内容', '期望达成的结果', '截止日期', '权重'] },
];
const TIME_RULE_DEFAULTS: OkrTimeRule[] = [
  { key: 'addObjective', label: '添加目标', startDay: 1, endDay: 31, shortMonthRule: 'clamp', allowBackfill: false },
  { key: 'breakdown', label: '拆解目标', startDay: 1, endDay: 31, shortMonthRule: 'clamp', allowBackfill: true },
  { key: 'weeklyReview', label: '周总结', startDay: 1, endDay: 7, allowBackfill: true },
  { key: 'monthlyReview', label: '月总结', startDay: 1, endDay: 31, shortMonthRule: 'clamp', allowBackfill: true },
];
const normalizeSettings = (settings: OkrSettings): OkrSettings => ({
  ...settings,
  objectiveTitleTemplates: normalizeObjectiveTitleTemplates(settings),
  templates: settings.templates?.length ? settings.templates.map(template => ({ ...template, type: template.type === 'presales' ? 'support' : template.type })) : TEMPLATE_DEFAULTS.map(template => ({...template, stages: template.type === 'product' ? settings.dictionaries.productNodes.length ? settings.dictionaries.productNodes : ['产品设计','UI设计','产品开发','测试验收','上线运维'] : template.type === 'delivery' ? settings.dictionaries.deliveryNodes.length ? settings.dictionaries.deliveryNodes : ['项目立项','上线交付'] : undefined})),
  timeRules: TIME_RULE_DEFAULTS.map(defaultRule => normalizeWeeklyReviewRule({ ...defaultRule, ...settings.timeRules?.find(item => item.key === defaultRule.key) })),
  validation: { actionWeightTotal: 100, maxActions: 8, assigneeMultiple: true, keyNodeMultiple: true, resultRequired: true, ...settings.validation },
});
const validateSettings = (settings: OkrSettings): string | undefined => {
  const titleError = validateObjectiveTitleTemplates(settings.objectiveTitleTemplates || []);
  if (titleError) return titleError;
  if (settings.timeRules.length !== 4) return '开放时间必须包含添加目标、拆解目标、周总结和月总结';
  for (const rule of settings.timeRules) {
    if (!Number.isInteger(rule.startDay) || !Number.isInteger(rule.endDay) || rule.startDay < 1 || rule.endDay > (rule.key === 'weeklyReview' ? 7 : 31) || rule.startDay > rule.endDay) return `${rule.label}的${rule.key === 'weeklyReview' ? '开放星期' : '开放日期'}范围无效`;
  }
  const validation = settings.validation;
  if (validation.actionWeightTotal !== 100) return '权重合计必须固定为100%';
  if (!Number.isInteger(validation.maxActions) || validation.maxActions < 1 || validation.maxActions > 20) return '动作上限必须是1到20的整数';
  return undefined;
};

export function OkrSettingsView({ settings, busy = false, readOnly = false, onSave, onClose, departments = [], people = [] }: Props) {
  const departmentOptions = [...new Set([...departments, ...people.map(person=>person.department)].map(value=>value.trim()).filter(Boolean))];
  const [active, setActive] = useState<keyof typeof labels>('templates');
  const [draft, setDraft] = useState(() => normalizedPolicy(normalizeSettings({...settings,templates:departmentOptions.length ? migrateTemplateDepartments(settings.templates || TEMPLATE_DEFAULTS,departmentOptions) : settings.templates}), people));
  useEffect(() => {
    const next = normalizedPolicy(normalizeSettings({...settings, templates: departmentOptions.length ? migrateTemplateDepartments(settings.templates || TEMPLATE_DEFAULTS, departmentOptions) : settings.templates}), people);
    setDraft(next);
  }, [settings]);
  const [editingReviewTemplate, setEditingReviewTemplate] = useState(false);
  const [savingDirect, setSavingDirect] = useState(false);
  const directLock = useRef(false);
  const savedSettings = useRef(settings);
  useEffect(() => { savedSettings.current = settings; }, [settings]);
  const saveDirect = async (patch: Partial<OkrSettings>) => {
    if (busy || readOnly || directLock.current) return false;
    const previous = normalizedPolicy(normalizeSettings(savedSettings.current), people);
    const next = { ...previous, ...patch };
    const error = people.length ? validatePolicy(next, people, previous) : undefined;
    if (error) { message.warning(error); return false; }
    directLock.current = true; setSavingDirect(true);
    try {
      const saved = await onSave(next);
      if (saved) {
        savedSettings.current = { ...savedSettings.current, ...patch };
        setDraft(current => ({ ...current, ...patch }));
      }
      return saved;
    } catch { message.error('配置保存失败，请稍后重试，已保留当前修改'); return false; }
    finally { directLock.current = false; setSavingDirect(false); }
  };
  const save = async () => {
    const next = { ...draft, objectiveTitleTemplates: (draft.objectiveTitleTemplates || []).map(row => ({ ...row, department: row.department.trim(), title: row.title.trim(), guidance: row.guidance.trim() })) };
    const error = validateSettings(next) || (people.length ? validatePolicy(next, people, settings) : undefined);
    if (error) { message.warning(error); return; }
    try { if (await onSave(next)) onClose?.(); }
    catch { message.error('配置保存失败，请稍后重试，已保留当前修改'); }
  };

  const saveTemplates = async (objectiveTitleTemplates: OkrObjectiveTitleTemplate[]) => {
    if (busy || readOnly) return false;
    const error = validateObjectiveTitleTemplates(objectiveTitleTemplates);
    if (error) { message.warning(error); return false; }
    // Persist templates with saved settings, without submitting unsaved changes in other tabs.
    const saved = await onSave({ ...settings, objectiveTitleTemplates });
    if (saved) setDraft(current => ({ ...current, objectiveTitleTemplates }));
    return saved;
  };

  const updateTimeRule = (index: number, patch: Partial<OkrTimeRule>) => setDraft(current => ({ ...current, timeRules: current.timeRules.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item) }));
  return <section className="okr-settings-page" aria-label="OKR 设置">
    <aside className="okr-settings-sidebar">
      <div className="okr-settings-sidebar-title"><h2>设置</h2><span>OKR</span></div>
      <nav className="okr-settings-nav" aria-label="设置导航">{(Object.keys(labels) as Array<keyof typeof labels>).map(key => <button type="button" className={active === key ? 'is-active' : ''} key={key} disabled={busy || savingDirect} onClick={() => setActive(key)}>{labels[key]}</button>)}</nav>
      {onClose && <div className="okr-settings-sidebar-footer"><Button type="text" block icon={<ArrowLeft />} disabled={busy || savingDirect} onClick={onClose}>返回目标页</Button></div>}
    </aside>
    <main className="okr-settings-content">
      {!(active === 'reviewTemplates' && editingReviewTemplate) && <header className="okr-settings-page-head"><div><h2>{labels[active]}</h2></div>{!['templates', 'weeklyCycles', 'administrators', 'reviewTemplates'].includes(active) && <Space><Button type="primary" loading={busy} disabled={readOnly} onClick={() => void save()}>保存配置</Button></Space>}</header>}
      <fieldset inert={readOnly} disabled={readOnly} style={{border:0,padding:0,margin:0}} aria-label="配置内容">
      {active === 'reviewTemplates' && <ReviewTemplateSettings onEditingChange={setEditingReviewTemplate} rows={draft.reviewReportTemplates || []} departments={departmentOptions} people={people} disabled={busy || readOnly || savingDirect} onSave={reviewReportTemplates => saveDirect({ reviewReportTemplates })}/>}
      {active === 'weeklyCycles' && <WeeklyCycleSettings rows={draft.weeklyReviewCycles || []} disabled={busy || readOnly || savingDirect} onChange={weeklyReviewCycles => saveDirect({ weeklyReviewCycles })}/>}
      {active === 'administrators' && <OkrRoleSettings draft={draft} people={people} disabled={busy || readOnly || savingDirect} onChange={next => saveDirect({ administratorIds: next.administratorIds, supervisorIds: next.supervisorIds })}/>}
      {active === 'confirmation' && <OkrPolicySettings active={active} draft={draft} people={people} busy={busy || readOnly} onChange={setDraft}/>}
      {active === 'templates' && <div className="okr-template-settings"><ObjectiveTitleConfiguration rows={draft.objectiveTitleTemplates || []} departments={departmentOptions} disabled={busy || readOnly} onSave={saveTemplates}/></div>}
      {active === 'timeRules' && <Card title="开放时间"><Space orientation="vertical" size="middle" style={{width:'100%'}}>{draft.timeRules.map((rule, index) => <div className="okr-settings-time-rule" key={rule.key}><strong>{rule.label}</strong>{rule.key === 'weeklyReview' ? <><Select aria-label="周报开放开始星期" placeholder="开始星期" disabled={busy} value={rule.startDay >= 1 && rule.startDay <= 7 ? rule.startDay : undefined} options={REVIEW_WEEKDAYS.map((label, day) => ({ label, value: day + 1 }))} onChange={value => updateTimeRule(index, { startDay: value })}/><span>至</span><Select aria-label="周报开放结束星期" placeholder="结束星期" disabled={busy} value={rule.endDay >= 1 && rule.endDay <= 7 ? rule.endDay : undefined} options={REVIEW_WEEKDAYS.map((label, day) => ({ label, value: day + 1 }))} onChange={value => updateTimeRule(index, { endDay: value })}/>{(rule.startDay < 1 || rule.startDay > 7 || rule.endDay < 1 || rule.endDay > 7 || rule.startDay > rule.endDay) && <Tag color="error">请重新设置周报开放星期</Tag>}</> : <><InputNumber min={1} max={31} value={rule.startDay} addonBefore="开始日" onChange={value => updateTimeRule(index, { startDay: value ?? 1 })}/><InputNumber min={1} max={31} value={rule.endDay} addonBefore="结束日" onChange={value => updateTimeRule(index, { endDay: value ?? 31 })}/><Select value={rule.shortMonthRule || 'clamp'} options={[{ value: 'clamp', label: '短月份顺延到月末' }, { value: 'reject', label: '短月份禁止超出' }]} onChange={value => updateTimeRule(index, { shortMonthRule: value })}/></>}<label className="flex items-center gap-2"><Switch size="small" checked={rule.allowBackfill !== false} onChange={value => updateTimeRule(index, { allowBackfill: value })} />允许补录</label></div>)}</Space></Card>}
      {active === 'validation' && <Card title="权重与必填校验"><Space direction="vertical" size="middle"><div className="rounded border border-[var(--border-main)] bg-[var(--bg-surface-soft)] p-3 text-xs text-[var(--text-body)]">固定必填：目标内容、动作、截止日期。可选规则：预期结果、承接人数和关键节点选择方式。</div><label>A 权重合计<InputNumber min={100} max={100} value={100} disabled addonAfter="%"/></label><label>单个 O 最多动作<InputNumber min={1} max={20} value={draft.validation.maxActions} onChange={value => setDraft(current => ({ ...current, validation: { ...current.validation, maxActions: value ?? 8 } }))}/></label><label>预期结果必填<Select value={draft.validation.resultRequired ? 'required' : 'optional'} options={[{value:'required',label:'必填'},{value:'optional',label:'选填'}]} onChange={value => setDraft(current => ({ ...current, validation: { ...current.validation, resultRequired: value === 'required' } }))}/></label><label>承接人员<Select value={draft.validation.assigneeMultiple ? 'multiple' : 'single'} options={[{value:'multiple',label:'允许多人'},{value:'single',label:'仅允许一人'}]} onChange={value => setDraft(current => ({ ...current, validation: { ...current.validation, assigneeMultiple: value === 'multiple' } }))}/></label><label>关键节点<Select value={draft.validation.keyNodeMultiple ? 'multiple' : 'single'} options={[{value:'single',label:'单选'},{value:'multiple',label:'多选'}]} onChange={value => setDraft(current => ({ ...current, validation: { ...current.validation, keyNodeMultiple: value === 'multiple' } }))}/></label></Space></Card>}
      {active === 'defaultView' && <Card title="默认视图"><Select value={draft.defaultView} options={[{value:'list',label:'列表视图'},{value:'card',label:'卡片视图'}]} onChange={value => setDraft(current => ({ ...current, defaultView: value }))}/></Card>}
      </fieldset>
    </main>
  </section>;
}
