import { useState } from 'react';
import { Input, Select, Switch } from 'antd';
import { parseJudgmentOptions, reviewTemplateEnabled, type ReviewReportTemplate, type ReviewTemplateBlock } from '../../../services/reviewTemplateConfiguration';

type Props = { block: ReviewTemplateBlock; template: ReviewReportTemplate; templates: ReviewReportTemplate[]; disabled?: boolean; onChange: (changes: Partial<ReviewTemplateBlock>) => void };
export function ReviewTemplateLinkControls({ block, template, templates, disabled, onChange }: Props) {
  const [optionsText, setOptionsText] = useState(() => block.aggregation?.judgmentOptions.join('，') || '');
  const config = block.aggregation;
  const patch = (changes: Partial<NonNullable<ReviewTemplateBlock['aggregation']>>) => config && onChange({ aggregation: { ...config, ...changes } });
  if (template.audience === 'employee') return <label className="flex items-center gap-2 text-sm">联动到部门{template.reportType === 'month' ? '月报' : '周报'}<Switch aria-label={`${block.title}联动到部门报告`} disabled={disabled} checked={!!block.departmentLink} onChange={checked => onChange({ departmentLink: checked ? { reportType: template.reportType } : undefined })}/></label>;
  const sources = new Map<string, { value: string; label: string }>(templates.filter(source => source.audience === 'employee' && source.reportType === template.reportType && (source.department === template.department || source.department === '*') && reviewTemplateEnabled(source) && source.effectiveFrom <= template.effectiveFrom).flatMap(source => source.blocks.filter(item => item.visible !== false && item.departmentLink?.reportType === template.reportType).map(item => [item.id, { value: item.id, label: `${item.title} · ${source.name}` }] as const)));
  if (config?.sourceBlockId && !sources.has(config.sourceBlockId)) sources.set(config.sourceBlockId, { value: config.sourceBlockId, label: '原来源当前不可用，请重新选择' });
  return <div className="grid gap-4">
    <label className="grid gap-2 text-sm">板块类型<Select aria-label={`${block.title}板块类型`} disabled={disabled} value={config ? 'aggregation' : 'text'} options={[{ value: 'text', label: '多行文本' }, { value: 'aggregation', label: '员工内容汇总' }]} onChange={value => { setOptionsText(''); onChange({ aggregation: value === 'aggregation' ? { sourceBlockId: '', sourceReportType: template.reportType, needsJudgment: false, judgmentLabel: '主管判断', judgmentOptions: [] } : undefined }); }}/></label>
    {config && <>
      <label className="grid gap-2 text-sm">员工来源板块<Select aria-label={`${block.title}员工来源板块`} disabled={disabled} placeholder="请选择已发布并开启联动的员工板块" value={config.sourceBlockId || undefined} options={[...sources.values()]} onChange={sourceBlockId => patch({ sourceBlockId, sourceReportType: template.reportType })}/></label>
      <label className="flex items-center gap-2 text-sm">需要判断<Switch aria-label={`${block.title}需要判断`} disabled={disabled} checked={config.needsJudgment} onChange={needsJudgment => patch({ needsJudgment })}/></label>
      {config.needsJudgment && <>
        <label className="grid gap-2 text-sm">判断名称<Input aria-label={`${block.title}判断名称`} disabled={disabled} maxLength={100} value={config.judgmentLabel} onChange={event => patch({ judgmentLabel: event.target.value })}/></label>
        <label className="grid gap-2 text-sm">判断选项<Input.TextArea aria-label={`${block.title}判断选项`} disabled={disabled} rows={2} placeholder="用中文或英文逗号分隔，例如：已采纳，待评估，无需处理" value={optionsText} onChange={event => { setOptionsText(event.target.value); patch({ judgmentOptions: parseJudgmentOptions(event.target.value) }); }}/></label>
      </>}
    </>}
  </div>;
}
