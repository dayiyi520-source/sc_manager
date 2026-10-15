import { useRef, useState } from 'react';
import { Button, Input, InputNumber, Space, Switch, Tag } from 'antd';
import { HolderOutlined, LockOutlined } from '@ant-design/icons';
import { FIXED_REVIEW_BLOCKS, moveReviewBlock, type ReviewTemplateBlock } from '../../../services/reviewTemplateConfiguration';

type Props = { blocks: ReviewTemplateBlock[]; disabled?: boolean; onChange: (blocks: ReviewTemplateBlock[]) => void };
export function ReviewTemplateBlockCards({ blocks, disabled, onChange }: Props) {
  const dragging = useRef<string | null>(null);
  const [drop, setDrop] = useState<{ id: string; after: boolean } | null>(null);
  const patch = (id: string, changes: Partial<ReviewTemplateBlock>) => onChange(blocks.map(block => block.id === id ? { ...block, ...changes } : block));
  const reset = () => { dragging.current = null; setDrop(null); };
  return <div className="grid gap-4">
    {blocks.map((block, index) => {
      const fixed = FIXED_REVIEW_BLOCKS.find(item => item.id === block.id);
      const field = block.fields[0];
      return <div key={block.id} data-testid={`template-block-${block.id}`} className="rounded-lg border border-[var(--border-main)] bg-[var(--bg-surface)] p-4 grid gap-4"
        style={{ borderTopColor: drop?.id === block.id && !drop.after ? 'var(--primary)' : undefined, borderBottomColor: drop?.id === block.id && drop.after ? 'var(--primary)' : undefined, borderTopWidth: drop?.id === block.id && !drop.after ? 4 : undefined, borderBottomWidth: drop?.id === block.id && drop.after ? 4 : undefined }}
        onDragOver={event => { if (disabled || !dragging.current || block.id === 'goals' || dragging.current === block.id) return; event.preventDefault(); const rect = event.currentTarget.getBoundingClientRect(); setDrop({ id: block.id, after: event.clientY > rect.top + rect.height / 2 }); }}
        onDrop={event => { event.preventDefault(); if (!disabled && dragging.current && drop?.id === block.id) onChange(moveReviewBlock(blocks, dragging.current, block.id, drop.after)); reset(); }}>
        <div className="flex items-center justify-between gap-4"><Space>
          <Button type="text" aria-label={block.id === 'goals' ? '目标固定第一' : `拖动${block.title}`} disabled={disabled || block.id === 'goals'} draggable={!disabled && block.id !== 'goals'} style={{ cursor: disabled || block.id === 'goals' ? undefined : 'grab' }} icon={block.id === 'goals' ? <LockOutlined/> : <HolderOutlined/>}
            onDragStart={event => { if (disabled || block.id === 'goals') { event.preventDefault(); return; } dragging.current = block.id; event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('text/plain', block.id); }} onDragEnd={reset}/>
          <span className="text-sm font-semibold">{index + 1}. {block.title || '未命名板块'}</span><Tag>{fixed ? `${fixed.title} · 固定板块` : '多行文本'}</Tag>
        </Space>{!fixed && <Button type="text" danger disabled={disabled} onClick={() => onChange(blocks.filter(item => item.id !== block.id))}>删除板块</Button>}</div>
        <label className="grid gap-2 text-sm">标题<Input aria-label={fixed ? `${fixed.title}标题` : '扩展板块名称'} disabled={disabled} maxLength={100} value={block.title} onChange={event => patch(block.id, { title: event.target.value, fields: fixed ? block.fields : block.fields.map(item => ({ ...item, label: event.target.value })) })}/></label>
        <label className="grid gap-2 text-sm">标题说明<Input.TextArea aria-label={`${block.title}填写说明`} placeholder="展示在标题下方，帮助填写人理解内容（选填）" disabled={disabled} rows={2} maxLength={1000} value={block.guidance} onChange={event => patch(block.id, { guidance: event.target.value })}/></label>
        {!fixed && field && <>
          <div className="flex gap-4 items-center"><label className="flex gap-2 items-center text-sm">是否必填<Switch aria-label={`${block.title}是否必填`} disabled={disabled} checked={field.required} onChange={required => patch(block.id, { fields: block.fields.map(item => item.id === field.id ? { ...item, required } : item) })}/></label><label className="flex gap-2 items-center text-sm">最大字数<InputNumber aria-label={`${block.title}最大字数`} disabled={disabled} min={1} max={10000} precision={0} value={field.maxLength || 10000} onChange={value => value !== null && patch(block.id, { fields: block.fields.map(item => item.id === field.id ? { ...item, maxLength: value } : item) })}/></label></div>
          <label className="grid gap-2 text-sm">输入框提示<Input aria-label={`${block.title}输入框提示`} disabled={disabled} maxLength={500} value={field.placeholder || ''} onChange={event => patch(block.id, { fields: block.fields.map(item => item.id === field.id ? { ...item, placeholder: event.target.value } : item) })}/></label>
          <Input.TextArea aria-label={`${block.title}效果预览`} disabled placeholder={field.placeholder || '多行文本输入'} rows={3} maxLength={field.maxLength || 10000} showCount/>
        </>}
      </div>;
    })}
    <Button disabled={disabled || blocks.length >= 20} onClick={() => onChange([...blocks, { id: crypto.randomUUID(), title: '新板块', guidance: '', fields: [{ id: crypto.randomUUID(), label: '新板块', type: 'textarea', required: false, maxLength: 10000, placeholder: '' }] }])}>增加扩展板块</Button>
  </div>;
}
