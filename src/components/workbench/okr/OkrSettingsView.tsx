import { ReviewTemplateSettings } from './ReviewTemplateSettings';
import { OkrRoleSettings } from './OkrRoleSettings';
import { WeeklyCycleSettings } from './WeeklyCycleSettings';
import { ObjectiveTitleConfiguration } from './ObjectiveTitleConfiguration';
import { normalizeObjectiveTitleTemplates, validateObjectiveTitleTemplates } from '../../../services/okrObjectiveTitleTemplates';
import { OkrPolicySettings } from './OkrPolicySettings';
import { hasOkrPermission, normalizedPolicy, validatePolicy } from '../../../services/okrSettingsPolicy';
import { migrateTemplateDepartments } from '../../../services/okrTemplates';
import { Button, Select, Space, message } from 'antd';
import Card from 'antd/es/card/Card';
import { useEffect, useRef, useState, type Key } from 'react';
import { ArrowLeft } from '@/components/common/octicons-compat';
import { normalizeWeeklyReviewRule } from '../../../services/okrReviewRules';
import type { OkrSettings, OkrTemplate, OkrTimeRule, OkrPerson, OkrObjectiveTitleTemplate } from '../../../services/okrRepository';

type Props = { key?: Key; viewerId?: string; settings: OkrSettings; busy?: boolean; readOnly?: boolean; onSave: (settings: OkrSettings) => Promise<boolean>; onClose?: () => void; departments?: string[]; people?: OkrPerson[] };
const labels = { templates: 'OKR模板', reviewTemplates: '复盘总结模板', administrators:'角色设置', weeklyCycles: '周报周期配置', confirmation:'目标确认配置', defaultView: '默认视图' };
const activeSectionKey = 'okr.settings.activeSection';
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
  return undefined;
};

export function OkrSettingsView({ settings, viewerId, busy = false, readOnly = false, onSave, onClose, departments = [], people = [] }: Props) {
  const departmentOptions = [...new Set([...departments, ...people.map(person=>person.department)].map(value=>value.trim()).filter(Boolean))];
  const [active, setActive] = useState<keyof typeof labels>(() => {
    const stored = window.sessionStorage.getItem(activeSectionKey);
    return stored && Object.hasOwn(labels, stored) ? stored as keyof typeof labels : 'templates';
  });
  const sectionPermission = { templates:'okrTemplates', reviewTemplates:'reviewTemplates', administrators:'roleSettings', weeklyCycles:'weeklyCycles', confirmation:'confirmationSettings', defaultView:'okrTemplates' } as const;
  const sectionReadOnly = readOnly || !!viewerId && !hasOkrPermission(viewerId, sectionPermission[active], settings, people);
  const selectSection = (section: keyof typeof labels) => { window.sessionStorage.setItem(activeSectionKey, section); setActive(section); };
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
    if (busy || sectionReadOnly || directLock.current) return false;
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
    if (busy || sectionReadOnly) return;
    const next = { ...draft, objectiveTitleTemplates: (draft.objectiveTitleTemplates || []).map(row => ({ ...row, department: row.department.trim(), title: row.title.trim(), guidance: row.guidance.trim() })) };
    const error = validateSettings(next) || (people.length ? validatePolicy(next, people, settings) : undefined);
    if (error) { message.warning(error); return; }
    try { if (await onSave(next)) onClose?.(); }
    catch { message.error('配置保存失败，请稍后重试，已保留当前修改'); }
  };

  const saveTemplates = async (objectiveTitleTemplates: OkrObjectiveTitleTemplate[]) => {
    if (busy || sectionReadOnly) return false;
    const error = validateObjectiveTitleTemplates(objectiveTitleTemplates);
    if (error) { message.warning(error); return false; }
    // Persist templates with saved settings, without submitting unsaved changes in other tabs.
    const saved = await onSave({ ...settings, objectiveTitleTemplates });
    if (saved) setDraft(current => ({ ...current, objectiveTitleTemplates }));
    return saved;
  };

  return <section className="okr-settings-page" aria-label="OKR 设置">
    <aside className="okr-settings-sidebar">
      <div className="okr-settings-sidebar-title"><h2>设置</h2><span>OKR</span></div>
      <nav className="okr-settings-nav" aria-label="设置导航">{(Object.keys(labels) as Array<keyof typeof labels>).map(key => <button type="button" className={active === key ? 'is-active' : ''} key={key} disabled={busy || savingDirect} onClick={() => selectSection(key)}>{labels[key]}</button>)}</nav>
      {onClose && <div className="okr-settings-sidebar-footer"><Button type="text" block icon={<ArrowLeft />} disabled={busy || savingDirect} onClick={onClose}>返回目标页</Button></div>}
    </aside>
    <main className="okr-settings-content">
      {!(active === 'reviewTemplates' && editingReviewTemplate) && <header className="okr-settings-page-head"><div><h2>{labels[active]}</h2></div>{!['templates', 'weeklyCycles', 'administrators', 'reviewTemplates'].includes(active) && <Space><Button type="primary" loading={busy} disabled={sectionReadOnly} onClick={() => void save()}>保存配置</Button></Space>}</header>}
      <fieldset style={{border:0,padding:0,margin:0}} aria-label="配置内容">
      {active === 'reviewTemplates' && <ReviewTemplateSettings onEditingChange={setEditingReviewTemplate} rows={draft.reviewReportTemplates || []} departments={departmentOptions} people={people} disabled={busy || sectionReadOnly || savingDirect} onSave={reviewReportTemplates => saveDirect({ reviewReportTemplates })}/>}
      {active === 'weeklyCycles' && <WeeklyCycleSettings rows={draft.weeklyReviewCycles || []} disabled={busy || sectionReadOnly || savingDirect} onChange={weeklyReviewCycles => saveDirect({ weeklyReviewCycles })}/>}
      {active === 'administrators' && <OkrRoleSettings draft={draft} people={people} disabled={busy || sectionReadOnly || savingDirect} onChange={next => saveDirect({ administratorIds: next.administratorIds, subAdministratorIds: next.subAdministratorIds, supervisorIds: next.supervisorIds, permissionGrants: next.permissionGrants })}/>}
      {active === 'confirmation' && <OkrPolicySettings active={active} draft={draft} people={people} busy={busy || sectionReadOnly} onChange={setDraft}/>}
      {active === 'templates' && <div className="okr-template-settings"><ObjectiveTitleConfiguration rows={draft.objectiveTitleTemplates || []} departments={departmentOptions} disabled={busy || sectionReadOnly} onSave={saveTemplates}/></div>}
      {active === 'defaultView' && <Card title="默认视图"><Select disabled={busy || sectionReadOnly} value={draft.defaultView} options={[{value:'list',label:'列表视图'},{value:'card',label:'卡片视图'}]} onChange={value => setDraft(current => ({ ...current, defaultView: value }))}/></Card>}
      </fieldset>
    </main>
  </section>;
}
