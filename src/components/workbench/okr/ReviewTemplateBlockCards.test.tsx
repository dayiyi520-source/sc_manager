// @vitest-environment jsdom
import { useState } from 'react';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { ReviewTemplateBlockCards } from './ReviewTemplateBlockCards';
import { newReviewTemplate } from '../../../services/reviewTemplateConfiguration';
afterEach(cleanup);
it('drags cards before or after another card, rejects moving ahead of goals and keeps saved order', () => {
  let saved = newReviewTemplate().blocks;
  function Editor() { const [blocks, setBlocks] = useState(saved); return <ReviewTemplateBlockCards blocks={blocks} onChange={next => { saved = next; setBlocks(next); }}/>; }
  render(<Editor/>);
  const dataTransfer = { setData() {}, effectAllowed: '' };
  fireEvent.dragStart(screen.getByRole('button', { name: '拖动知识沉淀' }), { dataTransfer });
  fireEvent.dragOver(screen.getByTestId('template-block-extra'), { clientY: 0 });
  fireEvent.drop(screen.getByTestId('template-block-extra'));
  expect(saved.map(block => block.id)).toEqual(['goals', 'knowledge', 'extra', 'assistance']);
  expect(screen.getByRole('button', { name: '目标固定第一' })).toBeDisabled();
  fireEvent.dragStart(screen.getByRole('button', { name: '拖动插播任务' }), { dataTransfer });
  fireEvent.dragOver(screen.getByTestId('template-block-goals'), { clientY: 0 });
  fireEvent.drop(screen.getByTestId('template-block-goals'));
  expect(saved.map(block => block.id)).toEqual(['goals', 'knowledge', 'extra', 'assistance']);
  fireEvent.click(screen.getByRole('button', { name: '增加扩展板块' }));
  const custom = screen.getByTestId(`template-block-${saved[4].id}`);
  fireEvent.change(within(custom).getByRole('textbox', { name: '扩展板块名称' }), { target: { value: '质量分析' } });
  expect(saved[4].fields[0]).toMatchObject({ type: 'textarea', label: '质量分析', required: false });
  expect(within(screen.getByTestId('template-block-goals')).queryByRole('switch')).not.toBeInTheDocument();
});
it('preserves existing additional fields when editing a legacy block', () => {
  let saved = [...newReviewTemplate().blocks, { id: 'legacy', title: '旧板块', guidance: '', fields: [
    { id: 'first', label: '说明', type: 'textarea' as const, required: false },
    { id: 'second', label: '旧日期', type: 'date' as const, required: false },
  ] }];
  function Editor() { const [blocks, setBlocks] = useState(saved); return <ReviewTemplateBlockCards blocks={blocks} onChange={next => { saved = next; setBlocks(next); }}/>; }
  render(<Editor/>);
  fireEvent.change(screen.getByRole('textbox', { name: '旧板块输入框提示' }), { target: { value: '请填写说明' } });
  fireEvent.click(screen.getByRole('switch', { name: '旧板块是否必填' }));
  expect(saved[4].fields).toEqual([
    expect.objectContaining({ id: 'first', placeholder: '请填写说明', required: true }),
    { id: 'second', label: '旧日期', type: 'date', required: false },
  ]);
});
