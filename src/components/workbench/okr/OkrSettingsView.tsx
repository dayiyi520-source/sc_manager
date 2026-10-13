import { KrTemplateConfiguration } from './KrTemplateConfiguration';
import { DepartmentGoalTemplateDemo } from './DepartmentGoalTemplateDemo';
import { OkrPolicySettings } from './OkrPolicySettings';
import { normalizedPolicy, validatePolicy } from '../../../services/okrSettingsPolicy';
import { templateDepartments, templateValues, migrateTemplateDepartments } from '../../../services/okrTemplates';
import { Alert, Button, Input, InputNumber, Select, Space, Tag, Switch, message } from 'antd';
import Card from 'antd/es/card/Card';
import { useEffect, useState, type Key } from 'react';
import { ArrowLeft } from '@/components/common/octicons-compat';
import { normalizeWeeklyReviewRule, REVIEW_WEEKDAYS } from '../../../services/okrReviewRules';
import type { OkrSettings, OkrTemplate, OkrTimeRule, OkrPerson } from '../../../services/okrRepository';

type Props = { key?: Key; settings: OkrSettings; busy?: boolean; readOnly?: boolean; onSave: (settings: OkrSettings) => Promise<boolean>; onClose?: () => void; departments?: string[]; people?: OkrPerson[] };
const labels: Record<string, string> = { templates: 'KR模板', departmentGoals: '部门目标模板', administrators:'管理员设置', confirmation:'目标确认配置', timeRules: '开放时间', validation: '权重与必填校验', defaultView: '默认视图' };
const listValue = (value: string[]) => value.join(',');
const listParse = (value: string) => value.split(/[、,，\n]/).map(item => item.trim()).filter(Boolean);
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
  templates: settings.templates?.length ? settings.templates.map(template => ({ ...template, type: template.type === 'presales' ? 'support' : template.type })) : TEMPLATE_DEFAULTS.map(template => ({...template, stages: template.type === 'product' ? settings.dictionaries.productNodes.length ? settings.dictionaries.productNodes : ['产品设计','UI设计','产品开发','测试验收','上线运维'] : template.type === 'delivery' ? settings.dictionaries.deliveryNodes.length ? settings.dictionaries.deliveryNodes : ['项目立项','上线交付'] : undefined})),
  timeRules: TIME_RULE_DEFAULTS.map(defaultRule => normalizeWeeklyReviewRule({ ...defaultRule, ...settings.timeRules?.find(item => item.key === defaultRule.key) })),
  validation: { actionWeightTotal: 100, maxActions: 8, assigneeMultiple: true, keyNodeMultiple: true, resultRequired: true, ...settings.validation },
});
const validateSettings = (settings: OkrSettings, checkTemplates = true): string | undefined => {
  if (checkTemplates && !settings.templates.length) return '至少配置一个部门模板';
  const seenTemplates = new Set<string>();
  for (const template of checkTemplates ? settings.templates : []) {
    const departments = templateDepartments(template);
    if (!departments.length || !['product', 'delivery', 'support'].includes(template.type)) return '请选择部门和 KR 模板';
    for (const department of departments) {
      const key = department.trim() + ':' + template.type;
      if (seenTemplates.has(key)) return '同一部门不能重复配置同类型 KR 模板';
      seenTemplates.add(key);
    }
    const values = templateValues(template, settings);
    if (template.type !== 'support' && !values.length) return '请配置产研KR的完成阶段或交付KR的推进阶段';
    if (new Set(values).size !== values.length) return '阶段不能重复';
  }
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
  const [initialTemplates, setInitialTemplates] = useState(() => JSON.stringify(draft.templates));
  useEffect(() => {
    const next = normalizedPolicy(normalizeSettings({...settings, templates: departmentOptions.length ? migrateTemplateDepartments(settings.templates || TEMPLATE_DEFAULTS, departmentOptions) : settings.templates}), people);
    setDraft(next); setInitialTemplates(JSON.stringify(next.templates));
  }, [settings]);
  const save = async () => {
    const next = { ...draft, templates: draft.templates.map((template, index) => {
      const values = templateValues(template, draft).map(value=>value.trim()).filter(Boolean);
      return { ...template, departments: templateDepartments(template), ...(template.type === 'support' ? { types: values } : { stages: values }) };
    }) };
    const templatesChanged = JSON.stringify(draft.templates) !== initialTemplates || JSON.stringify(draft.dictionaries) !== JSON.stringify(settings.dictionaries);
    const error = validateSettings(next, active === 'templates' || templatesChanged) || (people.length ? validatePolicy(next, people) : undefined); if (error) { message.warning(error); return; } if (await onSave(next)) onClose?.();
  };

  const updateTimeRule = (index: number, patch: Partial<OkrTimeRule>) => setDraft(current => ({ ...current, timeRules: current.timeRules.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item) }));
  return <section className="okr-settings-page" aria-label="OKR 设置">
    <aside className="okr-settings-sidebar">
      <div className="okr-settings-sidebar-title"><h2>设置</h2><span>OKR</span></div>
      <nav className="okr-settings-nav" aria-label="设置导航">{(Object.keys(labels) as Array<keyof typeof labels>).map(key => <button type="button" className={active === key ? 'is-active' : ''} key={key} onClick={() => setActive(key)}>{labels[key]}</button>)}</nav>
      {onClose && <div className="okr-settings-sidebar-footer"><Button type="text" block icon={<ArrowLeft />} onClick={onClose}>返回目标页</Button></div>}
    </aside>
    <main className="okr-settings-content">
      <header className="okr-settings-page-head"><div><h2>{labels[active]}</h2></div>{active !== 'departmentGoals' && <Space><Button type="primary" loading={busy} disabled={readOnly} onClick={() => void save()}>保存配置</Button></Space>}</header>
      <fieldset inert={readOnly} disabled={readOnly} style={{border:0,padding:0,margin:0}} aria-label="配置内容">
      {['administrators','confirmation'].includes(active) && <OkrPolicySettings active={active} draft={draft} people={people} busy={busy || readOnly} onChange={setDraft}/>}
      {active === 'templates' && <Card title="KR模板"><KrTemplateConfiguration settings={draft} departments={departmentOptions} busy={busy || readOnly} onChange={templates=>setDraft(current=>({...current,templates}))}/></Card>}
      <div hidden={active !== 'departmentGoals'}><DepartmentGoalTemplateDemo departments={departmentOptions} templates={draft.templates} readOnly={readOnly}/></div>
      {active === 'timeRules' && <Card title="开放时间"><Space orientation="vertical" size="middle" style={{width:'100%'}}>{draft.timeRules.map((rule, index) => <div className="okr-settings-time-rule" key={rule.key}><strong>{rule.label}</strong>{rule.key === 'weeklyReview' ? <><Select aria-label="周报开放开始星期" placeholder="开始星期" disabled={busy} value={rule.startDay >= 1 && rule.startDay <= 7 ? rule.startDay : undefined} options={REVIEW_WEEKDAYS.map((label, day) => ({ label, value: day + 1 }))} onChange={value => updateTimeRule(index, { startDay: value })}/><span>至</span><Select aria-label="周报开放结束星期" placeholder="结束星期" disabled={busy} value={rule.endDay >= 1 && rule.endDay <= 7 ? rule.endDay : undefined} options={REVIEW_WEEKDAYS.map((label, day) => ({ label, value: day + 1 }))} onChange={value => updateTimeRule(index, { endDay: value })}/>{(rule.startDay < 1 || rule.startDay > 7 || rule.endDay < 1 || rule.endDay > 7 || rule.startDay > rule.endDay) && <Tag color="error">请重新设置周报开放星期</Tag>}</> : <><InputNumber min={1} max={31} value={rule.startDay} addonBefore="开始日" onChange={value => updateTimeRule(index, { startDay: value ?? 1 })}/><InputNumber min={1} max={31} value={rule.endDay} addonBefore="结束日" onChange={value => updateTimeRule(index, { endDay: value ?? 31 })}/><Select value={rule.shortMonthRule || 'clamp'} options={[{ value: 'clamp', label: '短月份顺延到月末' }, { value: 'reject', label: '短月份禁止超出' }]} onChange={value => updateTimeRule(index, { shortMonthRule: value })}/></>}<label className="flex items-center gap-2"><Switch size="small" checked={rule.allowBackfill !== false} onChange={value => updateTimeRule(index, { allowBackfill: value })} />允许补录</label></div>)}</Space></Card>}
      {active === 'validation' && <Card title="权重与必填校验"><Space direction="vertical" size="middle"><div className="rounded border border-[var(--border-main)] bg-[var(--bg-surface-soft)] p-3 text-xs text-[var(--text-body)]">固定必填：目标内容、动作、截止日期。可选规则：预期结果、承接人数和关键节点选择方式。</div><label>A 权重合计<InputNumber min={100} max={100} value={100} disabled addonAfter="%"/></label><label>单个 O 最多动作<InputNumber min={1} max={20} value={draft.validation.maxActions} onChange={value => setDraft(current => ({ ...current, validation: { ...current.validation, maxActions: value ?? 8 } }))}/></label><label>预期结果必填<Select value={draft.validation.resultRequired ? 'required' : 'optional'} options={[{value:'required',label:'必填'},{value:'optional',label:'选填'}]} onChange={value => setDraft(current => ({ ...current, validation: { ...current.validation, resultRequired: value === 'required' } }))}/></label><label>承接人员<Select value={draft.validation.assigneeMultiple ? 'multiple' : 'single'} options={[{value:'multiple',label:'允许多人'},{value:'single',label:'仅允许一人'}]} onChange={value => setDraft(current => ({ ...current, validation: { ...current.validation, assigneeMultiple: value === 'multiple' } }))}/></label><label>关键节点<Select value={draft.validation.keyNodeMultiple ? 'multiple' : 'single'} options={[{value:'single',label:'单选'},{value:'multiple',label:'多选'}]} onChange={value => setDraft(current => ({ ...current, validation: { ...current.validation, keyNodeMultiple: value === 'multiple' } }))}/></label></Space></Card>}
      {active === 'defaultView' && <Card title="默认视图"><Select value={draft.defaultView} options={[{value:'list',label:'列表视图'},{value:'card',label:'卡片视图'}]} onChange={value => setDraft(current => ({ ...current, defaultView: value }))}/></Card>}
      </fieldset>
    </main>
  </section>;
}
