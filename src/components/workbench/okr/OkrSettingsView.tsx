import { Alert, Button, Input, InputNumber, Select, Space, Tag, Switch, message } from 'antd';
import Card from 'antd/es/card/Card';
import { useState } from 'react';
import { ArrowLeft } from '@/components/common/octicons-compat';
import type { OkrSettings, OkrTemplate, OkrTimeRule } from '../../../services/okrRepository';

type Props = { settings: OkrSettings; busy?: boolean; onSave: (settings: OkrSettings) => Promise<boolean>; onClose: () => void };
const labels: Record<string, string> = { templates: '拆解模板', dictionaries: '业务字段', timeRules: '开放时间', validation: '权重与必填校验', defaultView: '默认视图' };
const listValue = (value: string[]) => value.join('、');
const listParse = (value: string) => value.split(/[、,，\n]/).map(item => item.trim()).filter(Boolean);
const TEMPLATE_DEFAULTS: OkrTemplate[] = [
  { department: '产研部门', type: 'product', fields: ['目标内容', '关联产品', '关键节点', '动作', '截止日期', '权重'] },
  { department: '项目交付部门', type: 'delivery', fields: ['目标内容', '关联项目', '关键节点', '动作', '截止日期', '权重'] },
  { department: '售前支持部门', type: 'presales', fields: ['目标内容', '关联线索/商机/投标', '关键节点', '动作', '截止日期', '权重'] },
  { department: '其他支撑部门', type: 'support', fields: ['目标内容', '类型', '动作', '预期结果', '截止日期', '权重'] },
];
const TIME_RULE_DEFAULTS: OkrTimeRule[] = [
  { key: 'addObjective', label: '添加目标', startDay: 1, endDay: 31, shortMonthRule: 'clamp', allowBackfill: false },
  { key: 'breakdown', label: '拆解目标', startDay: 1, endDay: 31, shortMonthRule: 'clamp', allowBackfill: true },
  { key: 'weeklyReview', label: '周总结', startDay: 1, endDay: 31, shortMonthRule: 'clamp', allowBackfill: true },
  { key: 'monthlyReview', label: '月总结', startDay: 1, endDay: 31, shortMonthRule: 'clamp', allowBackfill: true },
];
const normalizeSettings = (settings: OkrSettings): OkrSettings => ({
  ...settings,
  templates: TEMPLATE_DEFAULTS.map(defaultTemplate => settings.templates?.find(item => item.type === defaultTemplate.type || item.department === defaultTemplate.department) || defaultTemplate),
  timeRules: TIME_RULE_DEFAULTS.map(defaultRule => settings.timeRules?.find(item => item.key === defaultRule.key) ? { ...defaultRule, ...settings.timeRules.find(item => item.key === defaultRule.key) } : defaultRule),
  validation: { actionWeightTotal: 100, maxActions: 8, assigneeMultiple: true, keyNodeMultiple: true, resultRequired: true, ...settings.validation },
});
const validateSettings = (settings: OkrSettings): string | undefined => {
  if (!settings.templates.length) return '至少配置一个部门模板';
  const seenDepartments = new Set<string>();
  const seenTypes = new Set<string>();
  for (const template of settings.templates) {
    if (!template.department.trim() || !template.type.trim()) return '部门模板的部门和业务类型不能为空';
    if (seenDepartments.has(template.department.trim()) || seenTypes.has(template.type.trim())) return '部门模板的部门和业务类型不能重复';
    seenDepartments.add(template.department.trim()); seenTypes.add(template.type.trim());
    const fields = template.fields.map(field => field.trim());
    if (!fields.length || fields.some(field => !field)) return `${template.department}的字段不能为空`;
    if (new Set(fields).size !== fields.length) return `${template.department}的字段不能重复，请检查字段顺序`;
  }
  if (settings.timeRules.length !== 4) return '开放时间必须包含添加目标、拆解目标、周总结和月总结';
  for (const rule of settings.timeRules) {
    if (!Number.isInteger(rule.startDay) || !Number.isInteger(rule.endDay) || rule.startDay < 1 || rule.endDay > 31 || rule.startDay > rule.endDay) return `${rule.label}的开放日期范围无效`;
  }
  const validation = settings.validation;
  if (validation.actionWeightTotal !== 100) return '权重合计必须固定为100%';
  if (!Number.isInteger(validation.maxActions) || validation.maxActions < 1 || validation.maxActions > 20) return '动作上限必须是1到20的整数';
  return undefined;
};

export function OkrSettingsView({ settings, busy = false, onSave, onClose }: Props) {
  const [active, setActive] = useState<keyof typeof labels>('templates');
  const [draft, setDraft] = useState(() => normalizeSettings(settings));
  const updateDictionary = (key: keyof OkrSettings['dictionaries'], value: string) => setDraft(current => ({ ...current, dictionaries: { ...current.dictionaries, [key]: listParse(value) } }));
  const save = async () => { const error = validateSettings(draft); if (error) { message.warning(error); return; } if (await onSave(draft)) onClose(); };
  const updateTemplate = (index: number, patch: Partial<OkrTemplate>) => setDraft(current => ({ ...current, templates: current.templates.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item) }));
  const updateTimeRule = (index: number, patch: Partial<OkrTimeRule>) => setDraft(current => ({ ...current, timeRules: current.timeRules.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item) }));
  return <section className="okr-settings-page" aria-label="OKR 设置">
    <aside className="okr-settings-sidebar">
      <div className="okr-settings-sidebar-title"><h2>设置</h2><span>OKR</span></div>
      <nav className="okr-settings-nav" aria-label="设置导航">{(Object.keys(labels) as Array<keyof typeof labels>).map(key => <button type="button" className={active === key ? 'is-active' : ''} key={key} onClick={() => setActive(key)}>{labels[key]}</button>)}</nav>
      <div className="okr-settings-sidebar-footer"><Button type="text" block icon={<ArrowLeft />} onClick={onClose}>返回目标页</Button></div>
    </aside>
    <main className="okr-settings-content">
      <header className="okr-settings-page-head"><div><h2>{labels[active]}</h2><p>配置拆解模板、业务字段、开放时间与校验规则。</p></div><Space><Button type="primary" loading={busy} onClick={() => void save()}>保存配置</Button></Space></header>
      {active === 'templates' && <Card title="拆解模板"><Space orientation="vertical" size="middle" style={{width:'100%'}}>{draft.templates.length === 0 && <Alert type="warning" showIcon message="尚未配置部门模板" description="请至少保留一个部门模板，并按业务表单实际顺序填写字段。" />}{draft.templates.map((template, index) => <div className="okr-settings-template" key={`${template.type}-${index}`}><div className="flex flex-wrap gap-2"><Input value={template.department} aria-label={`部门模板${index + 1}部门`} onChange={event => updateTemplate(index, { department: event.target.value })} placeholder="部门名称"/><Select value={template.type} aria-label={`部门模板${index + 1}业务类型`} onChange={value => updateTemplate(index, { type: value })} options={[{ value: 'product', label: '产研' }, { value: 'delivery', label: '项目交付' }, { value: 'presales', label: '售前支持' }, { value: 'support', label: '其他支撑' }]} /><Tag color="blue">字段顺序</Tag></div><Input value={template.fields.join('、')} onChange={event => updateTemplate(index, { fields: listParse(event.target.value) })} addonBefore="字段顺序" placeholder="目标内容、动作、截止日期"/><small>字段按输入顺序渲染；空字段和重复字段禁止保存。</small></div>)}</Space></Card>}
      {active === 'dictionaries' && <Card title="业务字段"><Space orientation="vertical" size="middle" style={{width:'100%'}}><label>产研关键节点<Input value={listValue(draft.dictionaries.productNodes)} onChange={event => updateDictionary('productNodes', event.target.value)}/></label><label>交付关键节点<Input value={listValue(draft.dictionaries.deliveryNodes)} onChange={event => updateDictionary('deliveryNodes', event.target.value)}/></label><label>售前关键节点<Input value={listValue(draft.dictionaries.presalesNodes)} onChange={event => updateDictionary('presalesNodes', event.target.value)}/></label><label>其他部门类型<Input value={listValue(draft.dictionaries.supportTypes)} onChange={event => updateDictionary('supportTypes', event.target.value)}/></label></Space></Card>}
      {active === 'timeRules' && <Card title="开放时间"><Space orientation="vertical" size="middle" style={{width:'100%'}}>{draft.timeRules.map((rule, index) => <div className="okr-settings-time-rule" key={rule.key}><strong>{rule.label}</strong><InputNumber min={1} max={31} value={rule.startDay} addonBefore="开始日" onChange={value => updateTimeRule(index, { startDay: value ?? 1 })}/><InputNumber min={1} max={31} value={rule.endDay} addonBefore="结束日" onChange={value => updateTimeRule(index, { endDay: value ?? 31 })}/><Select value={rule.shortMonthRule || 'clamp'} options={[{ value: 'clamp', label: '短月份顺延到月末' }, { value: 'reject', label: '短月份禁止超出' }]} onChange={value => updateTimeRule(index, { shortMonthRule: value })}/><label className="flex items-center gap-2"><Switch size="small" checked={rule.allowBackfill !== false} onChange={value => updateTimeRule(index, { allowBackfill: value })} />允许补录</label></div>)}</Space></Card>}
      {active === 'validation' && <Card title="权重与必填校验"><Space direction="vertical" size="middle"><div className="rounded border border-[var(--border-main)] bg-[var(--bg-surface-soft)] p-3 text-xs text-[var(--text-body)]">固定必填：目标内容、动作、截止日期。可选规则：预期结果、承接人数和关键节点选择方式。</div><label>A 权重合计<InputNumber min={100} max={100} value={100} disabled addonAfter="%"/></label><label>单个 O 最多动作<InputNumber min={1} max={20} value={draft.validation.maxActions} onChange={value => setDraft(current => ({ ...current, validation: { ...current.validation, maxActions: value ?? 8 } }))}/></label><label>预期结果必填<Select value={draft.validation.resultRequired ? 'required' : 'optional'} options={[{value:'required',label:'必填'},{value:'optional',label:'选填'}]} onChange={value => setDraft(current => ({ ...current, validation: { ...current.validation, resultRequired: value === 'required' } }))}/></label><label>承接人员<Select value={draft.validation.assigneeMultiple ? 'multiple' : 'single'} options={[{value:'multiple',label:'允许多人'},{value:'single',label:'仅允许一人'}]} onChange={value => setDraft(current => ({ ...current, validation: { ...current.validation, assigneeMultiple: value === 'multiple' } }))}/></label><label>关键节点<Select value={draft.validation.keyNodeMultiple ? 'multiple' : 'single'} options={[{value:'single',label:'单选'},{value:'multiple',label:'多选'}]} onChange={value => setDraft(current => ({ ...current, validation: { ...current.validation, keyNodeMultiple: value === 'multiple' } }))}/></label></Space></Card>}
      {active === 'defaultView' && <Card title="默认视图"><Select value={draft.defaultView} options={[{value:'list',label:'列表视图'},{value:'card',label:'卡片视图'}]} onChange={value => setDraft(current => ({ ...current, defaultView: value }))}/></Card>}
    </main>
  </section>;
}
