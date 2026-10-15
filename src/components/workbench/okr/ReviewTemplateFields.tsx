import { Children, cloneElement, isValidElement, useState, type ReactNode } from 'react';
import { Button, DatePicker, Input, InputNumber, Select, Space, Table, Tag } from 'antd';
import dayjs from 'dayjs';
import type { OkrPayload, OkrPerson, OkrSettings } from '../../../services/okrRepository';
import { matchReviewTemplate, reviewTemplateErrors, type ReviewReportTemplate, type ReviewTemplateBlock, type ReviewTemplateValues } from '../../../services/reviewTemplateConfiguration';

export function useReviewTemplateFields(settings: OkrSettings | undefined, initial: OkrPayload | undefined, department: string, audience: 'employee' | 'supervisor', type: 'week' | 'month', start: string) {
  // A saved legacy report has a start date but no snapshot; keep its original form.
  const [snapshot] = useState<ReviewReportTemplate | null>(() => initial?.startDate ? initial.reviewTemplateSnapshot || null : structuredClone(matchReviewTemplate(settings, department, audience, type, start) || null));
  const [values, setValues] = useState<ReviewTemplateValues>(() => initial?.reviewTemplateValues || {});
  const hasBlock = (id: string) => !!snapshot?.blocks.some(block => block.id === id);
  const textValue = (id: string, fallback: string) => {
    const field = snapshot?.blocks.find(block => block.id === id)?.fields[0];
    return field ? String(values[field.id] ?? '') : fallback;
  };
  return { snapshot, values, setValues, hasBlock, textValue, payload: { reviewTemplateSnapshot: snapshot, reviewTemplateValues: values }, errors: () => reviewTemplateErrors(snapshot, values) };
}

type Props = { block: ReviewTemplateBlock; values: ReviewTemplateValues; onChange: (values: ReviewTemplateValues) => void; people?: OkrPerson[]; departments?: string[]; disabled?: boolean };
export function ReviewTemplateFields({ block, values, onChange, people = [], departments = [], disabled }: Props) {
  const update = (id: string, value: unknown) => onChange({ ...values, [id]: value });
  return <div className="grid gap-4 p-4">
    {block.guidance && <p className="text-sm text-[var(--text-secondary)] whitespace-pre-wrap">{block.guidance}</p>}
    {block.fields.map(field => {
      const value = values[field.id];
      const common = { 'aria-label': field.label, disabled, style: { width: '100%' } };
      let control;
      switch (field.type) {
        case 'number': case 'percentage': control = <InputNumber {...common} min={field.type === 'percentage' ? 0 : undefined} max={field.type === 'percentage' ? 100 : undefined} value={value as number | undefined} onChange={next => update(field.id, next)}/>; break;
        case 'date': control = <DatePicker {...common} value={typeof value === 'string' && value ? dayjs(value) : null} onChange={next => update(field.id, next?.format('YYYY-MM-DD'))}/>; break;
        case 'select': case 'multiselect': control = <Select {...common} allowClear mode={field.type === 'multiselect' ? 'multiple' : undefined} value={value as string | string[] | undefined} options={field.options?.map(option => ({ value: option, label: option }))} onChange={next => update(field.id, next)}/>; break;
        case 'boolean': control = <Select {...common} allowClear value={value as boolean | undefined} options={[{ value: true, label: '是' }, { value: false, label: '否' }]} onChange={next => update(field.id, next)}/>; break;
        case 'person': case 'department': {
          const options = field.type === 'person' ? people.map(person => ({ value: person.id, label: `${person.name} · ${person.department}` })) : [...new Set([...departments, ...people.map(person => person.department)])].filter(Boolean).map(name => ({ value: name, label: name }));
          if (value && !options.some(option => option.value === value)) options.push({ value: String(value), label: String(value) });
          control = <Select {...common} allowClear showSearch optionFilterProp="label" value={value as string | undefined} options={options} onChange={next => update(field.id, next)}/>; break;
        }
        case 'table': {
          const rows = (Array.isArray(value) ? value : []) as Record<string, string>[];
          control = <Space orientation="vertical" style={{ width: '100%' }}><Table size="small" pagination={false} rowKey={(_, index) => String(index)} dataSource={rows} columns={[...(field.columns || []).map(column => ({ title: column, key: column, render: (_: unknown, row: Record<string, string>, index: number) => <Input aria-label={`${field.label}-${column}-${index + 1}`} disabled={disabled} value={row[column]} onChange={event => update(field.id, rows.map((item, i) => i === index ? { ...item, [column]: event.target.value } : item))}/> })), ...(!disabled ? [{ title: '操作', key: 'action', render: (_: unknown, _row: unknown, index: number) => <Button type="text" danger onClick={() => update(field.id, rows.filter((_, i) => i !== index))}>删除行</Button> }] : [])]}/>{!disabled && <Button disabled={rows.length >= 100} onClick={() => update(field.id, [...rows, Object.fromEntries((field.columns || []).map(column => [column, '']))])}>添加行</Button>}</Space>; break;
        }
        case 'textarea': control = <Input.TextArea {...common} rows={4} showCount placeholder={field.placeholder} maxLength={field.maxLength || 10000} value={value as string || ''} onChange={event => update(field.id, event.target.value)}/>; break;
        default: control = <Input {...common} maxLength={10000} placeholder={field.type === 'link' ? 'https://' : undefined} value={value as string || ''} onChange={event => update(field.id, event.target.value)}/>;
      }
      return <label key={field.id} className="grid gap-2 text-sm"><span>{field.required && <Tag color="red">必填</Tag>}{field.label}</span>{control}</label>;
    })}
  </div>;
}
export function ReviewTemplateSection({ template, blockId, ...props }: Omit<Props, 'block'> & { template?: ReviewReportTemplate | null; blockId: string }) {
  const blocks = template?.blocks.filter(block => blockId === 'extensions' ? !['goals', 'extra', 'assistance', 'knowledge'].includes(block.id) : block.id === blockId) || [];
  return <>{blocks.map(block => blockId === 'extensions' ? <section className="okr-weekly-section" aria-label={block.title} key={block.id}><div className="okr-weekly-section-header"><h3>{block.title}</h3></div><ReviewTemplateFields {...props} block={block}/></section> : <div key={block.id}><ReviewTemplateFields {...props} block={block}/></div>)}</>;
}

export function reviewBlockTitle(template: ReviewReportTemplate | null, id: string, fallback: string) {
  const index = template?.blocks.findIndex(block => block.id === id) ?? -1;
  return index >= 0 ? `${index + 1}. ${template!.blocks[index].title}` : fallback;
}
/** Render the business sections in saved template order; legacy reports retain their original layout. */
export function ReviewTemplateLayout({ template, children, ...props }: Omit<Props, 'block'> & { template: ReviewReportTemplate | null; children: ReactNode }) {
  if (!template) return <>{children}</>;
  const nodes = Children.toArray(children);
  const sections = new Map<string, ReactNode>(nodes.flatMap(node => isValidElement<{ 'data-review-block'?: string }>(node) && node.props['data-review-block'] ? [[node.props['data-review-block']!, node] as const] : []));
  return <>{template.blocks.map((block, index) => {
    const section = sections.get(block.id);
    if (section && isValidElement<{ children: ReactNode; 'aria-label'?: string }>(section)) {
      const content = Children.toArray(section.props.children);
      const supplement = content.find(node => isValidElement(node) && node.type === ReviewTemplateSection);
      return cloneElement(section, { key: block.id, 'aria-label': block.title, children: [content[0], supplement, ...content.slice(1).filter(node => node !== supplement)] });
    }
    return <section key={block.id} className="okr-weekly-section" aria-label={block.title}><div className="okr-weekly-section-header"><h3>{index + 1}. {block.title}</h3></div><ReviewTemplateFields {...props} block={block}/></section>;
  })}{nodes.filter(node => !isValidElement<{ 'data-review-block'?: string }>(node) || !node.props['data-review-block'])}</>;
}
